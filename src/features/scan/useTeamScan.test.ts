// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTeamScan } from './useTeamScan';
import type { RgbaImage, ReferenceEntry, SlotResult } from './types';

const fakeImage: RgbaImage = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
const fakeSlots: SlotResult[] = [{ box: { x: 0, y: 0, w: 1, h: 1 }, candidates: [{ id: 25, score: 0.9 }] }];

describe('useTeamScan', () => {
  it('moves idle -> scanning -> done and exposes slots', async () => {
    const deps = {
      loadRefs: async (): Promise<ReferenceEntry[]> => [],
      blobToRgbaImage: async (): Promise<RgbaImage> => fakeImage,
      scanTeamImage: (): SlotResult[] => fakeSlots,
    };
    const { result } = renderHook(() => useTeamScan(new Set([25]), deps));
    expect(result.current.status).toBe('idle');
    await act(async () => { await result.current.scan(new Blob()); });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.slots).toEqual(fakeSlots);
  });

  it('passes side and hpPercent from scan targets into slots', async () => {
    const box = { x: 0, y: 0, w: 1, h: 1 };
    const deps = {
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
    const { result } = renderHook(() => useTeamScan(new Set([25]), deps));
    await act(async () => { await result.current.scan(new Blob()); });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(result.current.slots.length).toBe(2);
    expect(result.current.slots[0].side).toBe('opponent');
    expect(result.current.slots[0].hpPercent).toBe(62);
    expect(result.current.slots[1].side).toBe('player');
    expect(result.current.slots[0].candidates[0].id).toBe(25);
  });
});
