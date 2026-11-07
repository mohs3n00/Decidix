/**
 * Batch 3 — analytical normalization helpers.
 *
 * Sector composites must never average raw values with different units
 * (percent, pupils/teacher, USD). Each indicator is first normalised to a
 * 0..100 score against the observed regional range for the reference year,
 * with the direction applied, and only then averaged with equal weights.
 *
 * These functions are pure so the rule is testable without a database.
 */

export interface NormalizationInput {
  value: number;
  min: number;
  max: number;
  higherIsBetter: boolean;
}

export interface CompositeComponent {
  normalized: number | null;
}

export interface CompositeResult {
  score: number | null;
  used: number;
  missing: number;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Min-max normalisation against an observed range.
 * - `higherIsBetter` keeps the direction; otherwise the score is inverted.
 * - A degenerate range (all regions equal) yields the neutral 50, not a guess.
 * - Non-finite inputs return null so callers must handle a missing observation.
 */
export function normalizeToScore(input: NormalizationInput): number | null {
  const { value, min, max, higherIsBetter } = input;
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (max === min) return 50;
  const rawRatio = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, rawRatio));
  return round((higherIsBetter ? clamped : 1 - clamped) * 100, 1);
}

/**
 * Equal-weight mean of already-normalised components. Missing components are
 * excluded and counted; an empty set yields null rather than 0.
 */
export function compositeScore(components: CompositeComponent[]): CompositeResult {
  const usable = components.filter(
    (component): component is { normalized: number } => component.normalized !== null
  );
  if (usable.length === 0) {
    return { score: null, used: 0, missing: components.length };
  }
  const score = usable.reduce((sum, component) => sum + component.normalized, 0) / usable.length;
  return { score: round(score, 1), used: usable.length, missing: components.length - usable.length };
}

/** Arithmetic mean that ignores non-finite entries; null when none remain. */
export function finiteMean(values: number[]): number | null {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length === 0) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}
