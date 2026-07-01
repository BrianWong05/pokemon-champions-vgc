import { describe, it, expect } from 'vitest';
import { mapCropToSource, spriteBoxFromTile } from './cropMath';

describe('mapCropToSource', () => {
  it('is identity when display size equals natural size', () => {
    const crop = { x: 10, y: 20, w: 100, h: 50 };
    const result = mapCropToSource(crop, { w: 400, h: 300 }, { w: 400, h: 300 });
    expect(result).toEqual(crop);
  });

  it('scales up correctly when the image is displayed at half size', () => {
    const crop = { x: 10, y: 20, w: 100, h: 50 };
    const result = mapCropToSource(crop, { w: 200, h: 150 }, { w: 400, h: 300 });
    expect(result).toEqual({ x: 20, y: 40, w: 200, h: 100 });
  });

  it('clamps the box when it exceeds the source bounds', () => {
    // Displayed crop box goes past the right/bottom edge of the displayed image.
    const crop = { x: 350, y: 250, w: 100, h: 100 };
    const result = mapCropToSource(crop, { w: 400, h: 300 }, { w: 400, h: 300 });
    expect(result).toEqual({ x: 350, y: 250, w: 50, h: 50 });
  });

  it('clamps an origin that is already outside the source bounds', () => {
    const crop = { x: 500, y: 500, w: 50, h: 50 };
    const result = mapCropToSource(crop, { w: 400, h: 300 }, { w: 400, h: 300 });
    expect(result).toEqual({ x: 400, y: 300, w: 0, h: 0 });
  });
});

describe('spriteBoxFromTile', () => {
  const bounds = { w: 1000, h: 800 };
  const tile = { x: 100, y: 200, w: 400, h: 80 };

  it('returns a square ~1.1x tile height', () => {
    const b = spriteBoxFromTile(tile, bounds, 'left');
    expect(b.w).toBe(88);
    expect(b.h).toBe(88);
  });

  it('anchors left with a small outward margin', () => {
    const b = spriteBoxFromTile(tile, bounds, 'left');
    expect(b.x).toBe(96); // 100 - round(80*0.05)
  });

  it('anchors right at the tile right edge', () => {
    const b = spriteBoxFromTile(tile, bounds, 'right');
    expect(b.x).toBe(100 + 400 - 88 + 4);
  });

  it('clamps to image bounds', () => {
    const b = spriteBoxFromTile({ x: 0, y: 0, w: 300, h: 100 }, { w: 320, h: 90 }, 'left');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.w).toBeLessThanOrEqual(320);
    expect(b.y + b.h).toBeLessThanOrEqual(90);
  });
});
