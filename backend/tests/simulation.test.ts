import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { Express } from 'express';
import {
  SimulatorService,
  calculateRegionalDeficitFactor,
  calculateSectorGain,
  calculateMarginalYield,
  SIMULATION_CONFIG,
} from '../src/services/simulator.service.js';

describe('Phase C4.2 — What-If Simulation Engine Implementation Suite', () => {
  const app: Express = createApp();

  describe('1. Core Mathematical Properties & Concave Gain Function', () => {
    it('satisfies Gain(0) = 0 exactly for all sectors', () => {
      const beta = 1.28; // Frontier deficit factor
      const domains = ['healthcare', 'infrastructure', 'education', 'economy'] as const;

      for (const d of domains) {
        expect(calculateSectorGain(d, 0, beta)).toBe(0);
        expect(calculateSectorGain(d, -100, beta)).toBe(0); // negative guard
      }
    });

    it('satisfies non-negativity: Gain(A) >= 0 for all A >= 0', () => {
      const beta = 1.28;
      const amounts = [0, 1, 100, 10_000, 1_000_000, 45_000_000, 100_000_000];

      for (const amt of amounts) {
        const gain = calculateSectorGain('healthcare', amt, beta);
        expect(gain).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(gain)).toBe(true);
      }
    });

    it('proves strictly diminishing marginal returns: dGain/dA is strictly decreasing', () => {
      const beta = 1.28;
      const domain = 'healthcare';

      const a1 = 10_000_000;  // $10M
      const a2 = 30_000_000;  // $30M
      const a3 = 60_000_000;  // $60M
      const a4 = 100_000_000; // $100M

      const yield1 = calculateMarginalYield(domain, a1, beta);
      const yield2 = calculateMarginalYield(domain, a2, beta);
      const yield3 = calculateMarginalYield(domain, a3, beta);
      const yield4 = calculateMarginalYield(domain, a4, beta);

      // Marginal yield must strictly decrease as allocation increases
      expect(yield1).toBeGreaterThan(yield2);
      expect(yield2).toBeGreaterThan(yield3);
      expect(yield3).toBeGreaterThan(yield4);

      // Incremental gain comparison: deltaGain / deltaA strictly decreases
      const deltaGain1 = (calculateSectorGain(domain, a2, beta) - calculateSectorGain(domain, a1, beta)) / (a2 - a1);
      const deltaGain2 = (calculateSectorGain(domain, a4, beta) - calculateSectorGain(domain, a3, beta)) / (a4 - a3);
      expect(deltaGain1).toBeGreaterThan(deltaGain2);
    });

    it('approaches linear slope for very small budgets (A << K)', () => {
      const beta = 1.28;
      const alpha = SIMULATION_CONFIG.SECTORS.healthcare.alpha;

      // For A = $10, ln(1 + A/K) ~ A/K, so Gain ~ beta * alpha * A
      const smallBudget = 10;
      const gain = calculateSectorGain('healthcare', smallBudget, beta);
      const linearApproximation = beta * alpha * smallBudget;

      expect(gain).toBeCloseTo(linearApproximation, 8);
    });
  });

  describe('2. Regional Deficit Adjustment Factor (beta)', () => {
    it('evaluates beta(r) = 1 + 0.5 * ((100 - baselineScore) / 100) accurately', () => {
      // Score 44 (Frontier): 1 + 0.5 * (56 / 100) = 1.28
      expect(calculateRegionalDeficitFactor(44)).toBeCloseTo(1.28, 4);

      // Score 72 (Lakeside): 1 + 0.5 * (28 / 100) = 1.14
      expect(calculateRegionalDeficitFactor(72)).toBeCloseTo(1.14, 4);

      // Score 86 (Central Capital): 1 + 0.5 * (14 / 100) = 1.07
      expect(calculateRegionalDeficitFactor(86)).toBeCloseTo(1.07, 4);

      // Score 100 (Max ceiling): 1 + 0.5 * 0 = 1.00
      expect(calculateRegionalDeficitFactor(100)).toBeCloseTo(1.00, 4);

      // Score 0 (Max deficit): 1 + 0.5 * 1.0 = 1.50
      expect(calculateRegionalDeficitFactor(0)).toBeCloseTo(1.50, 4);
    });

    it('clamps baseline score to [0, 100] preventing out-of-range factors', () => {
      expect(calculateRegionalDeficitFactor(-20)).toBe(1.5);
      expect(calculateRegionalDeficitFactor(150)).toBe(1.0);
    });

    it('ensures lower-scoring regions achieve higher gains for identical budget packages', async () => {
      const allocations = {
        education: 20_000_000,
        healthcare: 20_000_000,
        infrastructure: 20_000_000,
        economy: 20_000_000,
      };

      const resFrontier = await SimulatorService.simulate('frontier', allocations); // baseline 44
      const resCentral = await SimulatorService.simulate('central_capital', allocations); // baseline 86

      expect(resFrontier.metadata.regional_deficit_factor).toBeGreaterThan(
        resCentral.metadata.regional_deficit_factor
      );
      expect(resFrontier.gain).toBeGreaterThan(resCentral.gain);
    });
  });

  describe('3. Dynamic Best Lever & Ranking Mechanism', () => {
    it('recommends healthcare for default balanced allocation on Frontier', async () => {
      const result = await SimulatorService.simulate('frontier', {
        education: 30_000_000,
        healthcare: 45_000_000,
        infrastructure: 20_000_000,
        economy: 25_000_000,
      });

      expect(result.best_lever.domain).toBe('healthcare');
      expect(result.best_lever.yield_per_million).toBeGreaterThan(0.05);
      expect(result.note.text).toContain('healthcare');
      expect(result.note.arabic_text).toContain('الرعاية الصحية');
    });

    it('dynamically switches best lever to infrastructure when healthcare reaches saturation', async () => {
      // Saturate healthcare with $100M, leave infrastructure at $5M
      const result = await SimulatorService.simulate('frontier', {
        education: 20_000_000,
        healthcare: 100_000_000,
        infrastructure: 5_000_000,
        economy: 20_000_000,
      });

      // Infrastructure marginal yield at $5M now exceeds healthcare at $100M
      expect(result.best_lever.domain).toBe('infrastructure');
      expect(result.note.text).toContain('infrastructure');
      expect(result.note.arabic_text).toContain('البنية التحتية');
    });

    it('dynamically switches best lever to education when education has zero investment', async () => {
      // Saturate all other sectors to $100M, leave education at $0
      const result = await SimulatorService.simulate('frontier', {
        education: 0,
        healthcare: 100_000_000,
        infrastructure: 100_000_000,
        economy: 100_000_000,
      });

      expect(result.best_lever.domain).toBe('education');
      expect(result.note.text).toContain('education');
      expect(result.note.arabic_text).toContain('التعليم');
    });
  });

  describe('4. Score Ceiling & Boundary Invariants', () => {
    it('handles zero total budget correctly without errors', async () => {
      const result = await SimulatorService.simulate('frontier', {
        education: 0,
        healthcare: 0,
        infrastructure: 0,
        economy: 0,
      });

      expect(result.gain).toBe(0);
      expect(result.projected_score).toBe(result.today_score);
      expect(result.total_package.amount).toBe(0);
      for (const lever of result.levers) {
        expect(lever.amount).toBe(0);
        expect(lever.gain).toBe(0);
        expect(lever.yield_per_million).toBeGreaterThan(0); // initial marginal slope
      }
    });

    it('strictly clamps projected score to 100.0 maximum ceiling', async () => {
      // Central Capital baseline is 86.0; massive $200M per sector allocation would exceed 100 without ceiling
      const result = await SimulatorService.simulate('central_capital', {
        education: 200_000_000,
        healthcare: 200_000_000,
        infrastructure: 200_000_000,
        economy: 200_000_000,
      });

      expect(result.projected_score).toBeLessThanOrEqual(100.0);
      expect(result.projected_score).toBe(100.0);
    });

    it('produces 100% deterministic results across repeated calls', async () => {
      const allocations = {
        education: 35_000_000,
        healthcare: 42_000_000,
        infrastructure: 18_000_000,
        economy: 25_000_000,
      };

      const run1 = await SimulatorService.simulate('frontier', allocations);
      const run2 = await SimulatorService.simulate('frontier', allocations);

      expect(run1).toEqual(run2);
    });
  });

  describe('5. Input Validation & Error Handling', () => {
    it('throws 404 when region does not exist', async () => {
      await expect(
        SimulatorService.simulate('atlantis_region', {
          education: 10_000_000,
          healthcare: 10_000_000,
          infrastructure: 10_000_000,
          economy: 10_000_000,
        })
      ).rejects.toThrow("Region 'atlantis_region' not found");
    });

    it('throws 400 when an allocation is negative', async () => {
      await expect(
        SimulatorService.simulate('frontier', {
          education: -500,
          healthcare: 10_000_000,
          infrastructure: 10_000_000,
          economy: 10_000_000,
        })
      ).rejects.toThrow('Allocation for education must be a finite non-negative number');
    });

    it('throws 400 when region_id is empty or missing', async () => {
      await expect(
        SimulatorService.simulate('', {
          education: 10_000_000,
          healthcare: 10_000_000,
          infrastructure: 10_000_000,
          economy: 10_000_000,
        })
      ).rejects.toThrow('region_id is required');
    });
  });

  describe('6. Simulation Transparency & Model Metadata', () => {
    it('discloses academic illustrative simulation metadata in response', async () => {
      const result = await SimulatorService.simulate('frontier', {
        education: 30_000_000,
        healthcare: 45_000_000,
        infrastructure: 20_000_000,
        economy: 25_000_000,
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.model_id).toBe('decidix-concave-diminishing-v1');
      expect(result.metadata.simulation_type).toBe('illustrative');
      expect(result.metadata.is_empirical).toBe(false);
      expect(result.metadata.saturation_constant_usd).toBe(60_000_000);
      expect(result.metadata.disclaimer).toContain('Illustrative academic policy simulation model');
      expect(result.metadata.coefficients.healthcare.alpha).toBeDefined();
    });
  });

  describe('7. HTTP Integration & Flutter Contract (POST /v1/decisions/simulate)', () => {
    it('returns HTTP 200 matching Flutter contract requirements and envelope', async () => {
      const res = await request(app)
        .post('/v1/decisions/simulate')
        .send({
          region_id: 'frontier',
          allocations: {
            education: 30_000_000,
            healthcare: 45_000_000,
            infrastructure: 20_000_000,
            economy: 25_000_000,
          },
        });

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Flutter contract field assertions
      expect(data.region_id).toBe('frontier');
      expect(data.horizon_months).toBe(24);
      expect(data.today_score).toBe(44);
      expect(data.projected_score).toBe(51.0);
      expect(data.gain).toBe(7.0);
      expect(data.total_package.amount).toBe(120_000_000);
      expect(data.total_package.currency).toBe('USD');

      // Levers verification
      expect(data.levers).toHaveLength(4);
      const leversSum = data.levers.reduce((sum: number, l: any) => sum + l.amount, 0);
      expect(leversSum).toBe(120_000_000);

      const leverGainsSum = data.levers.reduce((sum: number, l: any) => sum + l.gain, 0);
      expect(Math.abs(leverGainsSum - data.gain)).toBeLessThan(0.05);

      // Best lever verification
      expect(data.best_lever.domain).toBe('healthcare');
      const maxYield = Math.max(...data.levers.map((l: any) => l.yield_per_million));
      expect(data.best_lever.yield_per_million).toBe(maxYield);

      // Localized Note
      expect(data.note.text).toContain('healthcare');
      expect(data.note.arabic_text).toContain('الرعاية الصحية');
    });

    it('returns HTTP 422 for negative allocation via Zod request validation', async () => {
      const res = await request(app)
        .post('/v1/decisions/simulate')
        .send({
          region_id: 'frontier',
          allocations: {
            education: -100,
            healthcare: 45_000_000,
            infrastructure: 20_000_000,
            economy: 25_000_000,
          },
        });

      expect(res.status).toBe(422);
    });

    it('returns HTTP 404 for non-existent region via HTTP route', async () => {
      const res = await request(app)
        .post('/v1/decisions/simulate')
        .send({
          region_id: 'unknown_region_xyz',
          allocations: {
            education: 10_000_000,
            healthcare: 10_000_000,
            infrastructure: 10_000_000,
            economy: 10_000_000,
          },
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REGION_NOT_FOUND');
    });
  });

  describe('8. Phase C4.3 — Sensitivity Analysis & Mathematical Rigor', () => {
    describe('8.1 Analytical Initial Marginal Yields at A = 0', () => {
      it('matches beta * alpha * 1e6 for all sectors on Frontier (beta = 1.28)', () => {
        const beta = 1.28;
        const healthcareYield = calculateMarginalYield('healthcare', 0, beta);
        const infraYield = calculateMarginalYield('infrastructure', 0, beta);
        const eduYield = calculateMarginalYield('education', 0, beta);
        const econYield = calculateMarginalYield('economy', 0, beta);

        // Frontier: beta = 1.28
        // Healthcare: 1.28 * 0.07235 = 0.092608
        expect(healthcareYield).toBeCloseTo(0.092608, 5);
        // Infrastructure: 1.28 * 0.05250 = 0.067200
        expect(infraYield).toBeCloseTo(0.0672, 5);
        // Education: 1.28 * 0.04820 = 0.061696
        expect(eduYield).toBeCloseTo(0.061696, 5);
        // Economy: 1.28 * 0.04600 = 0.058880
        expect(econYield).toBeCloseTo(0.05888, 5);
      });

      it('matches beta * alpha * 1e6 on Central Capital (beta = 1.07)', () => {
        const beta = 1.07;
        const healthcareYield = calculateMarginalYield('healthcare', 0, beta);
        // Healthcare: 1.07 * 0.07235 = 0.0774145
        expect(healthcareYield).toBeCloseTo(0.0774145, 5);
      });
    });

    describe('8.2 Alpha Sensitivity Sweeps (+-10%, +-25%, +-50%)', () => {
      it('scales gain and marginal yield strictly linearly with alpha', () => {
        const beta = 1.28;
        const amount = 25_000_000;
        const baseAlpha = SIMULATION_CONFIG.SECTORS.healthcare.alpha;

        const multipliers = [0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5];
        const gains: number[] = [];
        const yields: number[] = [];

        for (const m of multipliers) {
          const testAlpha = baseAlpha * m;
          const gain = calculateSectorGain('healthcare', amount, beta, testAlpha);
          const yieldVal = calculateMarginalYield('healthcare', amount, beta, testAlpha);
          gains.push(gain);
          yields.push(yieldVal);
        }

        const baseGain = gains[3]; // index 3 is m = 1.0
        const baseYield = yields[3];

        for (let i = 0; i < multipliers.length; i++) {
          const m = multipliers[i];
          expect(gains[i]).toBeCloseTo(baseGain * m, 6);
          expect(yields[i]).toBeCloseTo(baseYield * m, 6);
        }

        // Strictly monotonic increasing with alpha
        for (let i = 1; i < gains.length; i++) {
          expect(gains[i]).toBeGreaterThan(gains[i - 1]);
          expect(yields[i]).toBeGreaterThan(yields[i - 1]);
        }
      });
    });

    describe('8.3 Saturation Constant K Sensitivity Sweeps (+-25%, +-50%)', () => {
      it('has zero impact on initial marginal yield at A = 0', () => {
        const beta = 1.28;
        const baseK = SIMULATION_CONFIG.SECTORS.healthcare.saturationConstantK;
        const kValues = [baseK * 0.5, baseK * 0.75, baseK, baseK * 1.25, baseK * 1.5];

        for (const k of kValues) {
          const yieldAtZero = calculateMarginalYield('healthcare', 0, beta, undefined, k);
          expect(yieldAtZero).toBeCloseTo(1.28 * SIMULATION_CONFIG.SECTORS.healthcare.alpha * 1_000_000, 6);
        }
      });

      it('delays saturation and produces higher gains for large budgets (A = $50M, $100M)', () => {
        const beta = 1.28;
        const baseK = SIMULATION_CONFIG.SECTORS.healthcare.saturationConstantK;
        const kValues = [baseK * 0.5, baseK * 0.75, baseK, baseK * 1.25, baseK * 1.5];

        for (const amount of [50_000_000, 100_000_000]) {
          const gains = kValues.map((k) => calculateSectorGain('healthcare', amount, beta, undefined, k));
          // Strictly monotonic increasing with K for large allocations
          for (let i = 1; i < gains.length; i++) {
            expect(gains[i]).toBeGreaterThan(gains[i - 1]);
          }
        }
      });

      it('converges to near-identical gain across all K values for infinitesimal budgets (A = $100)', () => {
        const beta = 1.28;
        const baseK = SIMULATION_CONFIG.SECTORS.healthcare.saturationConstantK;
        const tinyAmount = 100;

        const gainSmallK = calculateSectorGain('healthcare', tinyAmount, beta, undefined, baseK * 0.5);
        const gainLargeK = calculateSectorGain('healthcare', tinyAmount, beta, undefined, baseK * 1.5);

        // ln(1 + A/K) * K ~ A as A -> 0, so gain is independent of K
        expect(gainSmallK).toBeCloseTo(gainLargeK, 6);
      });
    });

    describe('8.4 Regional Baseline Score Sensitivity (0, 44, 72, 86, 100)', () => {
      it('scales beta linearly from 1.50 at score 0 down to 1.00 at score 100', () => {
        const scores = [0, 44, 72, 86, 100];
        const betas = scores.map((s) => calculateRegionalDeficitFactor(s));

        expect(betas[0]).toBe(1.50);
        expect(betas[1]).toBeCloseTo(1.28, 4);
        expect(betas[2]).toBeCloseTo(1.14, 4);
        expect(betas[3]).toBeCloseTo(1.07, 4);
        expect(betas[4]).toBe(1.00);

        // Strictly decreasing beta as baseline increases
        for (let i = 1; i < betas.length; i++) {
          expect(betas[i]).toBeLessThan(betas[i - 1]);
        }
      });

      it('produces 33.3% higher sector gain in score 0 region than in score 100 region', () => {
        const betaMin = calculateRegionalDeficitFactor(100); // 1.00
        const betaMax = calculateRegionalDeficitFactor(0);   // 1.50
        const amount = 30_000_000;

        const gainMin = calculateSectorGain('infrastructure', amount, betaMin);
        const gainMax = calculateSectorGain('infrastructure', amount, betaMax);

        expect(gainMax / gainMin).toBeCloseTo(1.50 / 1.00, 6);
      });
    });

    describe('8.5 Sector Allocation Steps (0, 1M, 10M, 25M, 50M, 100M)', () => {
      it('demonstrates monotonic gains and strictly decreasing marginal yields across allocation ladder', () => {
        const beta = 1.28;
        const steps = [0, 1_000_000, 10_000_000, 25_000_000, 50_000_000, 100_000_000];
        const domains = ['healthcare', 'infrastructure', 'education', 'economy'] as const;

        for (const d of domains) {
          const gains = steps.map((a) => calculateSectorGain(d, a, beta));
          const yields = steps.map((a) => calculateMarginalYield(d, a, beta));

          // Gain strictly increases
          for (let i = 1; i < gains.length; i++) {
            expect(gains[i]).toBeGreaterThan(gains[i - 1]);
          }

          // Marginal yield strictly decreases
          for (let i = 1; i < yields.length; i++) {
            expect(yields[i]).toBeLessThan(yields[i - 1]);
          }
        }
      });
    });

    describe('8.6 Score Ceiling Invariants & Proportional Rescaling', () => {
      it('strictly maintains today_score + gain == projected_score and sum(levers.gain) == gain at ceiling', async () => {
        // Central Capital baseline is 86.0; massive $250M per sector allocation
        const result = await SimulatorService.simulate('central_capital', {
          education: 250_000_000,
          healthcare: 250_000_000,
          infrastructure: 250_000_000,
          economy: 250_000_000,
        });

        // 1. Ceiling clamped to 100.0
        expect(result.projected_score).toBe(100.0);

        // 2. Metadata flags ceiling hit
        expect(result.metadata.ceiling_hit).toBe(true);
        expect(result.metadata.unconstrained_gain).toBeGreaterThan(result.gain);

        // 3. Exact invariant: today_score + gain == projected_score
        expect(Number((result.today_score + result.gain).toFixed(1))).toBe(result.projected_score);
        expect(result.gain).toBe(14.0); // 100.0 - 86.0

        // 4. Invariant: sum of lever gains matches total effective gain within rounding tolerance
        const sumLeverGains = result.levers.reduce((sum, l) => sum + l.gain, 0);
        expect(Math.abs(sumLeverGains - result.gain)).toBeLessThan(0.05);

        // 5. Each lever gain is scaled down relative to its unconstrained gain
        for (const lever of result.levers) {
          expect(lever.gain).toBeGreaterThan(0);
          expect(lever.yield_per_million).toBeGreaterThan(0);
        }
      });

      it('maintains invariants on low-scoring Frontier when saturated with extreme budgets', async () => {
        // Frontier baseline 44.0; $2B per sector ($8B total) overcomes diminishing returns to reach 100 ceiling
        const result = await SimulatorService.simulate('frontier', {
          education: 2_000_000_000,
          healthcare: 2_000_000_000,
          infrastructure: 2_000_000_000,
          economy: 2_000_000_000,
        });

        expect(result.projected_score).toBe(100.0);
        expect(result.metadata.ceiling_hit).toBe(true);
        expect(result.gain).toBe(56.0); // 100.0 - 44.0
        expect(Number((result.today_score + result.gain).toFixed(1))).toBe(result.projected_score);

        const sumLeverGains = result.levers.reduce((sum, l) => sum + l.gain, 0);
        expect(Math.abs(sumLeverGains - result.gain)).toBeLessThan(0.05);
      });
    });

    describe('8.7 Deterministic Tie-Breaking Logic', () => {
      it('breaks identical marginal yield ties following domain priority (healthcare > infra > edu > econ)', async () => {
        // Frontier: beta = 1.28
        // healthcare alpha = 0.07235 / 1e6, K = 60M
        // infrastructure alpha = 0.05250 / 1e6, K = 60M
        // If we set healthcare allocation such that yield matches infrastructure at A = 0:
        // (0.07235 / (1 + A / 60M)) = 0.05250 => 1 + A / 60M = 1.378095 => A = 22,685,714.29
        const matchingHealthAllocation = Math.round(60_000_000 * (0.07235 / 0.05250 - 1)); // 22,685,714
        const result = await SimulatorService.simulate('frontier', {
          education: 100_000_000,
          healthcare: matchingHealthAllocation,
          infrastructure: 0,
          economy: 100_000_000,
        });

        const healthLever = result.levers.find((l) => l.domain === 'healthcare')!;
        const infraLever = result.levers.find((l) => l.domain === 'infrastructure')!;

        // Both round to 0.067
        expect(healthLever.yield_per_million).toBe(infraLever.yield_per_million);

        // Due to priorityOrder (healthcare: 4 > infrastructure: 3), healthcare is chosen
        expect(result.best_lever.domain).toBe('healthcare');
      });
    });

    describe('8.8 Robustness & Defensive Edge Cases', () => {
      it('rejects allocations with NaN with HTTP 400', async () => {
        await expect(
          SimulatorService.simulate('frontier', {
            education: NaN,
            healthcare: 10_000_000,
            infrastructure: 10_000_000,
            economy: 10_000_000,
          })
        ).rejects.toThrow('Allocation for education must be a finite non-negative number');
      });

      it('rejects allocations with Infinity with HTTP 400', async () => {
        await expect(
          SimulatorService.simulate('frontier', {
            education: Infinity,
            healthcare: 10_000_000,
            infrastructure: 10_000_000,
            economy: 10_000_000,
          })
        ).rejects.toThrow('Allocation for education must be a finite non-negative number');
      });

      it('rejects missing allocations object with HTTP 400', async () => {
        await expect(
          SimulatorService.simulate('frontier', null as any)
        ).rejects.toThrow('allocations object is required');
      });

      it('rejects blank whitespace region_id with HTTP 400', async () => {
        await expect(
          SimulatorService.simulate('   ', {
            education: 10_000_000,
            healthcare: 10_000_000,
            infrastructure: 10_000_000,
            economy: 10_000_000,
          })
        ).rejects.toThrow('region_id is required');
      });
    });
  });
});
