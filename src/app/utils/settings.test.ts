import { describe, it, expect } from 'vitest';
import { ratingBlend, mapDataConfidence } from './settings';

describe('rating weight', () => {
  it('rating matters more when map data is scarce', () => {
    const scarce = ratingBlend(50, mapDataConfidence(1, 2));
    const rich = ratingBlend(50, mapDataConfidence(20, 20));
    expect(scarce.overallScale).toBeGreaterThan(rich.overallScale);
  });
  it('higher slider value increases rating importance', () => {
    expect(ratingBlend(100, 0.3).overallScale).toBeGreaterThan(ratingBlend(20, 0.3).overallScale);
  });
  it('slider at 0 disables VRS points influence', () => {
    expect(ratingBlend(0, 0).pointsScale).toBe(0);
  });
});
