const KEY = 'cs2_rating_weight';
export const DEFAULT_RATING_WEIGHT = 50;

/** Rating importance 0..100 (%). Higher = team rating matters more, especially when map data is scarce. */
export function getRatingWeight(): number {
  if (typeof window === 'undefined') return DEFAULT_RATING_WEIGHT;
  const v = Number(localStorage.getItem(KEY));
  return Number.isFinite(v) && localStorage.getItem(KEY) !== null ? Math.min(100, Math.max(0, v)) : DEFAULT_RATING_WEIGHT;
}
export function setRatingWeight(v: number) {
  localStorage.setItem(KEY, String(Math.round(Math.min(100, Math.max(0, v)))));
}

/** How much we trust map stats: 0 (no maps played) .. 1 (12+ maps). */
export function mapDataConfidence(mapsA: number, mapsB: number): number {
  return Math.min(1, Math.min(mapsA, mapsB) / 12);
}

/**
 * Returns multipliers for the overall-rating and map components.
 * Low map data -> rating gets amplified; the slider controls how strongly.
 */
export function ratingBlend(weightPct: number, confidence: number) {
  const w = weightPct / 100;
  const lack = 1 - confidence;
  return {
    overallScale: 0.5 + w + w * 3 * lack,
    mapScale: 0.4 + 0.6 * confidence,
    pointsScale: w * (0.5 + 1.5 * lack),
  };
}
