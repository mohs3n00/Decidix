import { prisma, testPrismaConnection } from '../database/prisma.js';
import { SEED_REGIONS } from '../database/seed_data.js';
import { toNumber } from '../utils/decimal.js';
import { env, syntheticDataAllowed } from '../config/env.js';
import { AppError } from '../utils/response.js';
import { DatasetService } from './dataset.service.js';

export type SectorDomain = 'education' | 'healthcare' | 'infrastructure' | 'economy';

export interface SectorSimulationConfig {
  domain: SectorDomain;
  alpha: number; // Base responsiveness coefficient per USD (illustrative)
  saturationConstantK: number; // K(d) in USD (illustrative)
  arabicName: string;
  englishName: string;
}

export interface SimulationLeverResult {
  domain: SectorDomain;
  amount: number;
  gain: number;
  yield_per_million: number;
}

export interface SimulationResult {
  region_id: string;
  horizon_months: number;
  today_score: number;
  projected_score: number;
  gain: number;
  total_package: {
    amount: number;
    currency: string;
  };
  levers: SimulationLeverResult[];
  best_lever: {
    domain: SectorDomain;
    yield_per_million: number;
  };
  note: {
    text: string;
    arabic_text: string;
  };
  metadata: {
    model_id: string;
    model_version: string;
    simulation_type: 'illustrative';
    is_empirical: boolean;
    saturation_constant_usd: number;
    regional_deficit_factor: number;
    unconstrained_gain: number;
    ceiling_hit: boolean;
    coefficients: Record<SectorDomain, { alpha: number; K: number }>;
    disclaimer: string;
  };
  provenance?: {
    dataset_version: string;
    source: string;
    source_file: string;
    license: string;
    geographic_coverage: string;
    observation_period: string | null;
    data_classification: 'simulated_scenario';
    baseline_classification: 'official_observed';
  };
}

/**
 * Centralized Simulation Configuration:
 * NOTE: These coefficients are illustrative parameterizations for academic scenario analysis.
 * No historical capital investment panel dataset exists in Decidix to support econometric estimation.
 */
export const SIMULATION_CONFIG = {
  MODEL_ID: 'decidix-concave-diminishing-v1',
  MODEL_VERSION: '1.0.0',
  SIMULATION_TYPE: 'illustrative' as const,
  IS_EMPIRICAL: false,
  DEFAULT_SATURATION_CONSTANT_USD: 60_000_000, // K = $60M
  HORIZON_MONTHS: 24,
  MAX_SCORE_CEILING: 100.0,
  DISCLAIMER: 'Illustrative academic policy simulation model. Not an empirically validated macroeconomic forecast.',
  SECTORS: {
    healthcare: {
      domain: 'healthcare' as const,
      alpha: 0.07235 / 1_000_000, // 0.07235 points per $1M at K=$60M
      saturationConstantK: 60_000_000,
      arabicName: 'الرعاية الصحية',
      englishName: 'healthcare',
    },
    infrastructure: {
      domain: 'infrastructure' as const,
      alpha: 0.05250 / 1_000_000, // 0.05250 points per $1M at K=$60M
      saturationConstantK: 60_000_000,
      arabicName: 'البنية التحتية',
      englishName: 'infrastructure',
    },
    education: {
      domain: 'education' as const,
      alpha: 0.04820 / 1_000_000, // 0.04820 points per $1M at K=$60M
      saturationConstantK: 60_000_000,
      arabicName: 'التعليم',
      englishName: 'education',
    },
    economy: {
      domain: 'economy' as const,
      alpha: 0.04600 / 1_000_000, // 0.04600 points per $1M at K=$60M
      saturationConstantK: 60_000_000,
      arabicName: 'الاقتصاد',
      englishName: 'economy',
    },
  },
};

/**
 * Evaluates the regional deficit adjustment factor:
 * beta(r) = 1 + 0.5 * ((100 - baselineScore) / 100)
 * Validates and clamps baselineScore within [0, 100] range.
 */
export function calculateRegionalDeficitFactor(baselineScore: number): number {
  const safeScore = Number.isFinite(baselineScore) ? baselineScore : 50;
  const clampedScore = Math.max(0, Math.min(SIMULATION_CONFIG.MAX_SCORE_CEILING, safeScore));
  return 1.0 + 0.5 * ((SIMULATION_CONFIG.MAX_SCORE_CEILING - clampedScore) / 100.0);
}

/**
 * Evaluates the non-linear concave gain for a sector:
 * Gain(d, A, r) = beta(r) * alpha(d) * K(d) * ln(1 + A / K(d))
 * Strictly satisfies:
 * - Gain(0) = 0
 * - Gain(A) >= 0 for A >= 0
 * - Strictly diminishing marginal returns (concave)
 */
export function calculateSectorGain(
  domain: SectorDomain,
  amount: number,
  beta: number,
  customAlpha?: number,
  customK?: number
): number {
  if (amount <= 0 || !Number.isFinite(amount)) return 0;
  const cfg = SIMULATION_CONFIG.SECTORS[domain];
  const alpha = customAlpha !== undefined ? customAlpha : cfg.alpha;
  const k = customK !== undefined ? customK : cfg.saturationConstantK;
  if (k <= 0) return 0;
  return beta * alpha * k * Math.log(1.0 + amount / k);
}

/**
 * Evaluates the analytical marginal yield per $1,000,000 at allocation A:
 * dGain/dA * 1,000,000 = (beta * alpha(d) * 1,000,000) / (1 + A / K(d))
 * Strictly decreases as allocation A increases.
 */
export function calculateMarginalYield(
  domain: SectorDomain,
  amount: number,
  beta: number,
  customAlpha?: number,
  customK?: number
): number {
  const cfg = SIMULATION_CONFIG.SECTORS[domain];
  const alpha = customAlpha !== undefined ? customAlpha : cfg.alpha;
  const k = customK !== undefined ? customK : cfg.saturationConstantK;
  if (k <= 0) return 0;
  const safeAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
  return (beta * alpha * 1_000_000) / (1.0 + safeAmount / k);
}

export class SimulatorService {
  /**
   * Executes transparent What-If simulation with non-linear concave yield curves,
   * regional deficit adjustment, dynamic marginal best-lever ranking, and score ceiling enforcement.
   */
  static async simulate(
    regionId: string,
    allocations: Record<SectorDomain, number>
  ): Promise<SimulationResult> {
    if (!regionId || typeof regionId !== 'string' || regionId.trim().length === 0) {
      throw AppError.badRequest('region_id is required', 'INVALID_REGION');
    }

    if (!allocations || typeof allocations !== 'object') {
      throw AppError.badRequest('allocations object is required', 'INVALID_ALLOCATION');
    }

    const normalizedRegionId = regionId.trim().toLowerCase();
    const activeDataset = syntheticDataAllowed() ? null : await DatasetService.active();
    if (!syntheticDataAllowed() && !activeDataset) {
      throw AppError.unavailable(
        'Simulation is unavailable until a verified dataset is active.',
        'DATASET_NOT_CONNECTED'
      );
    }

    // 1. Resolve Region & Baseline Score
    const isDbReady = await testPrismaConnection();
    let region = SEED_REGIONS.find((r) => r.id === normalizedRegionId);
    let regionScore: number | null = region?.score ?? null;

    if (isDbReady) {
      try {
        const dbRegion = await prisma.region.findUnique({
          where: { id: normalizedRegionId },
        });
        const verifiedRegion = !syntheticDataAllowed() && activeDataset
          ? await prisma.region.findFirst({
              where: { id: normalizedRegionId, datasetVersionId: activeDataset.id },
            })
          : dbRegion;
        if (verifiedRegion) {
          regionScore = toNumber(verifiedRegion.score);
        }
      } catch (err) {
        if (env.NODE_ENV === 'production') throw err;
      }
    }
    if (!syntheticDataAllowed() && !isDbReady) {
      throw AppError.unavailable(
        'Simulation is unavailable until verified regional data is connected.',
        'DATABASE_NOT_CONNECTED'
      );
    }
    if (!syntheticDataAllowed() && isDbReady) {
      const dbRegion = await prisma.region.findFirst({
        where: { id: normalizedRegionId, datasetVersionId: activeDataset!.id },
      });
      if (!dbRegion) {
        throw AppError.notFound(`Region '${regionId}' not found`, 'REGION_NOT_FOUND');
      }
      regionScore = toNumber(dbRegion.score);
    }

    if (regionScore === null) {
      throw AppError.notFound(`Region '${regionId}' not found`, 'REGION_NOT_FOUND');
    }

    // 2. Validate Allocations (Must be finite, non-negative numbers)
    const domains: SectorDomain[] = ['education', 'healthcare', 'infrastructure', 'economy'];
    for (const d of domains) {
      const amt = allocations[d];
      if (typeof amt !== 'number' || !Number.isFinite(amt) || amt < 0) {
        throw AppError.badRequest(`Allocation for ${d} must be a finite non-negative number`, 'INVALID_ALLOCATION');
      }
    }

    const todayScore = Math.max(0, Math.min(SIMULATION_CONFIG.MAX_SCORE_CEILING, regionScore));
    const beta = calculateRegionalDeficitFactor(todayScore);

    // 3. Compute Concave Non-Linear Sector Gains & Current Marginal Yields
    let totalAmount = 0;
    let totalGain = 0;

    const levers: SimulationLeverResult[] = domains.map((domain) => {
      const amount = allocations[domain] || 0;
      const rawGain = calculateSectorGain(domain, amount, beta);
      const roundedGain = Number(rawGain.toFixed(2));
      const marginalYield = calculateMarginalYield(domain, amount, beta);
      const roundedYield = Number(marginalYield.toFixed(3));

      totalAmount += amount;
      totalGain += rawGain;

      return {
        domain,
        amount,
        gain: roundedGain,
        yield_per_million: roundedYield,
      };
    });

    // 4. Determine Dynamic Best Lever (highest marginal yield at current allocation)
    // Deterministic tie-breaking priority: healthcare > infrastructure > education > economy
    const priorityOrder: Record<SectorDomain, number> = {
      healthcare: 4,
      infrastructure: 3,
      education: 2,
      economy: 1,
    };

    let bestLever = levers[0];
    for (const l of levers) {
      if (
        l.yield_per_million > bestLever.yield_per_million ||
        (l.yield_per_million === bestLever.yield_per_million && priorityOrder[l.domain] > priorityOrder[bestLever.domain])
      ) {
        bestLever = l;
      }
    }

    // 5. Score Ceiling Enforcement (100.0) & Invariant Consistency
    const rawGainTotal = Number(totalGain.toFixed(1));
    const maxPossibleGain = Number((SIMULATION_CONFIG.MAX_SCORE_CEILING - todayScore).toFixed(1));
    const isCeilingHit = todayScore + rawGainTotal >= SIMULATION_CONFIG.MAX_SCORE_CEILING;

    // Effective gain is constrained by the distance to 100.0
    const effectiveGain = isCeilingHit ? maxPossibleGain : rawGainTotal;
    const projectedScore = Number(Math.min(SIMULATION_CONFIG.MAX_SCORE_CEILING, todayScore + effectiveGain).toFixed(1));

    // When the ceiling is reached, scale lever gains proportionally so sum(levers.gain) === effectiveGain
    if (isCeilingHit && rawGainTotal > 0 && effectiveGain < rawGainTotal) {
      const scale = effectiveGain / rawGainTotal;
      for (const lever of levers) {
        lever.gain = Number((lever.gain * scale).toFixed(2));
      }
    }

    // 6. Generate Contextual Bilingual Explanation Note
    const bestSector = SIMULATION_CONFIG.SECTORS[bestLever.domain];
    const note = {
      text: `Each additional $1M in ${bestSector.englishName} returns ${bestLever.yield_per_million.toFixed(3)} index points at current allocation, the highest marginal yield of the four levers.`,
      arabic_text: `كل مليون دولار إضافي في ${bestSector.arabicName} يحقق ${bestLever.yield_per_million.toFixed(3)} نقطة في المؤشر عند مستوى التخصيص الحالي، وهو أعلى عائد حدي بين الروافع الأربع.`,
    };

    return {
      region_id: normalizedRegionId,
      horizon_months: SIMULATION_CONFIG.HORIZON_MONTHS,
      today_score: todayScore,
      projected_score: projectedScore,
      gain: effectiveGain,
      total_package: {
        amount: totalAmount,
        currency: 'USD',
      },
      levers,
      best_lever: {
        domain: bestLever.domain,
        yield_per_million: bestLever.yield_per_million,
      },
      note,
      metadata: {
        model_id: SIMULATION_CONFIG.MODEL_ID,
        model_version: SIMULATION_CONFIG.MODEL_VERSION,
        simulation_type: SIMULATION_CONFIG.SIMULATION_TYPE,
        is_empirical: SIMULATION_CONFIG.IS_EMPIRICAL,
        saturation_constant_usd: SIMULATION_CONFIG.DEFAULT_SATURATION_CONSTANT_USD,
        regional_deficit_factor: Number(beta.toFixed(3)),
        unconstrained_gain: rawGainTotal,
        ceiling_hit: isCeilingHit,
        coefficients: {
          healthcare: { alpha: SIMULATION_CONFIG.SECTORS.healthcare.alpha, K: SIMULATION_CONFIG.SECTORS.healthcare.saturationConstantK },
          infrastructure: { alpha: SIMULATION_CONFIG.SECTORS.infrastructure.alpha, K: SIMULATION_CONFIG.SECTORS.infrastructure.saturationConstantK },
          education: { alpha: SIMULATION_CONFIG.SECTORS.education.alpha, K: SIMULATION_CONFIG.SECTORS.education.saturationConstantK },
          economy: { alpha: SIMULATION_CONFIG.SECTORS.economy.alpha, K: SIMULATION_CONFIG.SECTORS.economy.saturationConstantK },
        },
        disclaimer: SIMULATION_CONFIG.DISCLAIMER,
      },
      ...(activeDataset
        ? {
            provenance: {
              dataset_version: activeDataset.id,
              source: activeDataset.source,
              source_file: activeDataset.filename,
              license: activeDataset.license,
              geographic_coverage: activeDataset.coverage,
              observation_period: null,
              data_classification: 'simulated_scenario' as const,
              baseline_classification: 'official_observed' as const,
            },
          }
        : {}),
    };
  }
}
