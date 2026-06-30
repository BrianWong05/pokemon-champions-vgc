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
});
