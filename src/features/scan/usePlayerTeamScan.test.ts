// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlayerTeamScan } from './usePlayerTeamScan';
import { buildPlayerScanVocab } from '@/db/repositories/scan.repo';

const pokemonList = [{ id: 7, nameEn: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65,
  baseSpAtk: 50, baseSpDef: 64, baseSpeed: 43, type1: 'Water', type2: null, identifier: 'squirtle', nameZh: null }] as any;

const movesFrame = { kind: 'moves', panels: Array.from({ length: 6 }, (_, slot) => ({
  slot, species: [{ id: 7, score: 0.9 }], ability: null, item: null, moves: [null, null, null, null] })) } as any;
const statsFrame = { kind: 'stats', panels: Array.from({ length: 6 }, (_, slot) => ({
  slot, species: [{ id: 7, score: 0.9 }],
  rows: [{ stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null },
         { stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null }, { stat: null, sp: null, arrow: null }] })) } as any;

// blob sentinel: size 1 -> moves frame, size 2 -> stats frame, size 3 -> null (detection failure)
let currentSize = 1;
const blobOf = (size: number) => { currentSize = size; return new Blob([new Uint8Array(size)]); };

const baseDeps = {
  blobToRgbaImage: async () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
  loadVocab: async () => buildPlayerScanVocab({ moves: [], learnset: [], abilities: [], items: [] }),
  scanDeps: {} as any,
  detect: () => null as any,
};
const mkDeps = (frames: Record<number, any>) => ({
  ...baseDeps,
  scan: async () => frames[currentSize] ?? null,
});

describe('usePlayerTeamScan', () => {
  it('routes frames by kind, replaces same-kind rescans, surfaces failures, resets', async () => {
    const d = mkDeps({ 1: movesFrame, 2: statsFrame });
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    await act(() => result.current.addFrame(blobOf(1)));
    expect(result.current.movesImage.status).toBe('done');
    expect(result.current.statsImage.status).toBe('idle');
    expect(result.current.merged?.slots).toHaveLength(6);

    await act(() => result.current.addFrame(blobOf(2)));
    expect(result.current.statsImage.status).toBe('done');
    expect(result.current.merged?.slots[0].statReads).toHaveLength(6);

    await act(() => result.current.addFrame(blobOf(1)));   // re-add moves: replace, no error
    expect(result.current.movesImage.status).toBe('done');
    expect(result.current.movesImage.error).toBeNull();

    await act(() => result.current.addFrame(blobOf(3)));   // detection failure, both slots already done
    // failure surfaces on the transient hook-level lastError without clobbering either done slot
    expect(result.current.lastError).toBe('No team panels found — try cropping around the six panels.');
    expect(result.current.movesImage.status).toBe('done');
    expect(result.current.statsImage.status).toBe('done');

    act(() => result.current.reset());
    expect(result.current.movesImage.status).toBe('idle');
    expect(result.current.statsImage.status).toBe('idle');
    expect(result.current.merged).toBeNull();
    expect(result.current.lastError).toBeNull();
  });

  it('routes a detection failure to the empty slot (moves first) when nothing is done yet', async () => {
    const d = mkDeps({});
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    await act(() => result.current.addFrame(blobOf(3)));
    expect(result.current.movesImage.status).toBe('error');
    expect(result.current.movesImage.error).toBe('No team panels found — try cropping around the six panels.');
    expect(result.current.movesImage.blob).not.toBeNull();
    expect(result.current.statsImage.status).toBe('idle');
    expect(result.current.lastError).toBeNull();
  });

  it('setSlotSpecies re-scans ability/moves for the pinned slot on the kept moves image and updates merged', async () => {
    const d = {
      ...baseDeps,
      scan: async () => movesFrame,
      detect: () => ({
        kind: 'moves',
        panels: Array.from({ length: 6 }, () => ({
          panel: { x: 0, y: 0, w: 1, h: 1 }, sprite: { x: 0, y: 0, w: 1, h: 1 },
          abilityText: { x: 0, y: 0, w: 1, h: 1 }, itemText: { x: 0, y: 0, w: 1, h: 1 },
          moveTexts: [{ x: 0, y: 0, w: 1, h: 1 }],
        })),
      }),
      scanDeps: { render: () => null } as any,
      loadVocab: async () => buildPlayerScanVocab({
        moves: [{ id: 99, nameEn: 'Tackle', nameJa: null, nameZh: null, nameZhHans: null }],
        learnset: [{ pokemonId: 8, moveId: 99 }],
        abilities: [],
        items: [],
      }),
    };
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    await act(() => result.current.addFrame(blobOf(1)));
    expect(result.current.movesImage.status).toBe('done');

    act(() => result.current.setSlotSpecies(0, 8));

    expect(result.current.merged?.slots[0].species).toEqual([{ id: 8, score: 1 }]);
  });

  it('busy is true while addFrame is in flight and false once it resolves', async () => {
    let resolveScan!: (v: any) => void;
    const d = {
      ...baseDeps,
      scan: () => new Promise(resolve => { resolveScan = resolve; }),
    };
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    expect(result.current.busy).toBe(false);

    let addFramePromise!: Promise<void>;
    act(() => { addFramePromise = result.current.addFrame(blobOf(1)); });

    expect(result.current.busy).toBe(true);

    // let the loadVocab/blobToRgbaImage microtasks ahead of deps.scan() settle so resolveScan is assigned
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    await act(async () => { resolveScan(movesFrame); await addFramePromise; });

    expect(result.current.busy).toBe(false);
  });

  it('lastError: failure sets it, a subsequent failing attempt keeps it set, success clears it', async () => {
    // Get both slots to 'done' first so a null scan routes to lastError instead of a slot.
    const d = mkDeps({ 1: movesFrame, 2: statsFrame });
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    await act(() => result.current.addFrame(blobOf(1)));
    await act(() => result.current.addFrame(blobOf(2)));

    await act(() => result.current.addFrame(blobOf(3))); // detection failure
    expect(result.current.lastError).toBe('No team panels found — try cropping around the six panels.');

    await act(() => result.current.addFrame(blobOf(3))); // another failing attempt: still set after it resolves
    expect(result.current.lastError).toBe('No team panels found — try cropping around the six panels.');

    await act(() => result.current.addFrame(blobOf(1))); // success: cleared
    expect(result.current.lastError).toBeNull();
  });

  it('removeImage clears only the given slot to idle; the other and merged are unaffected', async () => {
    const d = mkDeps({ 1: movesFrame, 2: statsFrame });
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    await act(() => result.current.addFrame(blobOf(1)));
    await act(() => result.current.addFrame(blobOf(2)));
    expect(result.current.merged?.slots[0].statReads).toHaveLength(6);

    act(() => result.current.removeImage('moves'));

    expect(result.current.movesImage).toEqual({ status: 'idle', error: null, blob: null });
    expect(result.current.statsImage.status).toBe('done');
    expect(result.current.merged).not.toBeNull();
    expect(result.current.merged?.slots[0].statReads).toHaveLength(6);
  });

  it('setSlotSpecies with only a stats image overrides that slot species to a pinned candidate', async () => {
    const d = mkDeps({ 2: statsFrame });
    const { result } = renderHook(() => usePlayerTeamScan(pokemonList, d as any));

    await act(() => result.current.addFrame(blobOf(2)));
    expect(result.current.statsImage.status).toBe('done');

    act(() => result.current.setSlotSpecies(0, 8));

    expect(result.current.merged?.slots[0].species).toEqual([{ id: 8, score: 1 }]);
  });
});
