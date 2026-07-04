// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { scanFrame, ingestFrame } from './scanFrame';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

const fakeImage: RgbaImage = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
const box = { x: 0, y: 0, w: 1, h: 1 };

function battleDeps() {
  return {
    loadRefs: async (): Promise<ReferenceEntry[]> => [],
    blobToRgbaImage: async (): Promise<RgbaImage> => fakeImage,
    scanTeamImage: (): SlotResult[] => [],
    detectScanTargets: () => ({
      mode: 'battle' as const,
      gameRect: null,
      targets: [
        { box, side: 'opponent' as const, hpPercent: 62 },
        { box, side: 'player' as const, hpPercent: 100 },
      ],
    }),
    cropImage: (): RgbaImage => fakeImage,
    matchTile: () => [{ id: 25, score: 0.9 }],
    loadClassifier: async () => null,
  };
}

describe('scanFrame', () => {
  it('returns mode + one slot per target, carrying side and hpPercent', async () => {
    const { mode, slots } = await scanFrame(fakeImage, new Set([25]), battleDeps());
    expect(mode).toBe('battle');
    expect(slots.map((s) => s.side)).toEqual(['opponent', 'player']);
    expect(slots.map((s) => s.hpPercent)).toEqual([62, 100]);
    expect(slots[0].candidates[0]).toEqual({ id: 25, score: 0.9 });
  });

  it('uses the legacy descriptor path when only the 3-dep shape is injected', async () => {
    const legacy = {
      loadRefs: async (): Promise<ReferenceEntry[]> => [],
      blobToRgbaImage: async (): Promise<RgbaImage> => fakeImage,
      scanTeamImage: (): SlotResult[] => [{ box, candidates: [{ id: 7, score: 0.5 }] }],
    };
    const { mode, slots } = await scanFrame(fakeImage, new Set([7]), legacy);
    expect(mode).toBeNull();
    expect(slots).toEqual([{ box, candidates: [{ id: 7, score: 0.5 }] }]);
  });
});

describe('ingestFrame', () => {
  it('decodes the frame blob then scans', async () => {
    const frame = { blob: new Blob(['x']), sourceKind: 'file' as const, capturedAt: 0 };
    const { mode, slots } = await ingestFrame(frame, new Set([25]), battleDeps());
    expect(mode).toBe('battle');
    expect(slots.length).toBe(2);
  });
});
