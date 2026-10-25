import { describe, expect, it } from 'vitest';

import { MAX_EDGE, MIN_BYTES_TO_COMPRESS, compressionPlan } from '../lib/compress-image';

const MB = 1024 * 1024;

describe('compressionPlan', () => {
  it('leaves a small photo alone', () => {
    // Re-encoding a file that is already small costs quality and saves
    // nothing.
    const plan = compressionPlan(800, 600, 120 * 1024, 'image/jpeg');
    expect(plan.shouldCompress).toBe(false);
    expect(plan.reason).toBe('already small enough');
  });

  it('shrinks a phone photo to the maximum edge', () => {
    // A modern phone camera is around 4000px on the long edge and several
    // megabytes — the case this exists for.
    const plan = compressionPlan(4032, 3024, 4 * MB, 'image/jpeg');
    expect(plan.shouldCompress).toBe(true);
    expect(Math.max(plan.targetWidth, plan.targetHeight)).toBe(MAX_EDGE);
    // Aspect ratio preserved, to within a pixel of rounding.
    expect(plan.targetWidth / plan.targetHeight).toBeCloseTo(4032 / 3024, 2);
  });

  it('never produces a dimension above the cap', () => {
    for (const [w, h] of [
      [4032, 3024],
      [3024, 4032],
      [6000, 1000],
      [2049, 2049],
    ]) {
      const plan = compressionPlan(w!, h!, 5 * MB, 'image/jpeg');
      expect(Math.max(plan.targetWidth, plan.targetHeight), `${w}x${h}`).toBeLessThanOrEqual(
        MAX_EDGE,
      );
    }
  });

  it('re-encodes a large file even when its dimensions are modest', () => {
    // A low-compression photo can be large at ordinary dimensions.
    const plan = compressionPlan(1600, 1200, 6 * MB, 'image/png');
    expect(plan.shouldCompress).toBe(true);
    expect(plan.targetWidth).toBe(1600);
    expect(plan.reason).toBe('above the size threshold');
  });

  it('leaves a portrait orientation portrait', () => {
    const plan = compressionPlan(3024, 4032, 4 * MB, 'image/jpeg');
    expect(plan.targetHeight).toBeGreaterThan(plan.targetWidth);
  });

  it('does not touch a vector image or a non-image', () => {
    // SVG has no raster size to reduce, and a PDF would lose its text.
    expect(compressionPlan(1000, 1000, 5 * MB, 'image/svg+xml').shouldCompress).toBe(false);
    expect(compressionPlan(1000, 1000, 5 * MB, 'application/pdf').shouldCompress).toBe(false);
  });

  it('keeps quality high enough to read a meter or see a crack', () => {
    // The evidence has to remain evidence (LEASE-13, MAINT-10).
    const plan = compressionPlan(4032, 3024, 4 * MB, 'image/jpeg');
    expect(plan.quality).toBeGreaterThanOrEqual(0.8);
    expect(plan.quality).toBeLessThan(1);
  });

  it('treats the threshold boundary consistently', () => {
    expect(compressionPlan(800, 600, MIN_BYTES_TO_COMPRESS - 1, 'image/jpeg').shouldCompress).toBe(
      false,
    );
    expect(compressionPlan(800, 600, MIN_BYTES_TO_COMPRESS, 'image/jpeg').shouldCompress).toBe(
      true,
    );
  });
});
