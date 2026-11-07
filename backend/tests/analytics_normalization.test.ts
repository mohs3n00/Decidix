import { describe, it, expect } from 'vitest';
import { compositeScore, finiteMean, normalizeToScore } from '../src/utils/analytics.js';

describe('analytics normalization (Batch 3)', () => {
  it('normalises different units before any averaging', () => {
    const percent = normalizeToScore({ value: 91, min: 80, max: 100, higherIsBetter: true });
    const usd = normalizeToScore({ value: 15000, min: 8000, max: 20000, higherIsBetter: true });
    const ratio = normalizeToScore({ value: 20, min: 15, max: 30, higherIsBetter: false });

    // Each raw value sits at a different scale; the normalised scores are comparable.
    expect(percent).toBe(55);
    expect(usd).toBe(58.3);
    expect(ratio).toBe(66.7);

    const rawAverage = (91 + 15000 + 20) / 3;
    const composite = compositeScore([
      { normalized: percent },
      { normalized: usd },
      { normalized: ratio },
    ]);

    expect(composite.score).toBe(60);
    // A raw average would be ~5037 — proof that units are never averaged directly.
    expect(composite.score).not.toBeCloseTo(rawAverage, 0);
  });

  it('inverts direction for lower-is-better indicators', () => {
    const best = normalizeToScore({ value: 5, min: 5, max: 40, higherIsBetter: false });
    const worst = normalizeToScore({ value: 40, min: 5, max: 40, higherIsBetter: false });
    expect(best).toBe(100);
    expect(worst).toBe(0);
  });

  it('uses a neutral score for a degenerate range', () => {
    expect(normalizeToScore({ value: 12, min: 12, max: 12, higherIsBetter: true })).toBe(50);
  });

  it('excludes missing components instead of treating them as zero', () => {
    const result = compositeScore([{ normalized: 80 }, { normalized: null }, { normalized: 60 }]);
    expect(result).toEqual({ score: 70, used: 2, missing: 1 });
    expect(compositeScore([{ normalized: null }])).toEqual({ score: null, used: 0, missing: 1 });
  });

  it('returns null for non-finite input and means', () => {
    expect(normalizeToScore({ value: Number.NaN, min: 0, max: 1, higherIsBetter: true })).toBeNull();
    expect(finiteMean([Number.NaN, 10, 20])).toBe(15);
    expect(finiteMean([])).toBeNull();
  });
});
