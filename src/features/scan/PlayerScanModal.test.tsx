// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import PlayerScanModal from './PlayerScanModal';
import { buildPlayerScanVocab } from '@/db/repositories/scan.repo';

const pokemonList = [
  { id: 7, nameEn: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65,
    baseSpAtk: 50, baseSpDef: 64, baseSpeed: 43, type1: 'Water', type2: null, identifier: 'squirtle', nameZh: null },
] as any;

// Moves frame: no stats, all fields empty (species only).
const movesFrame = {
  kind: 'moves',
  panels: Array.from({ length: 6 }, (_, slot) => ({
    slot, species: [{ id: 7, score: 0.9 }], ability: null, item: null, moves: [null, null, null, null],
  })),
} as any;

// Stats frame carrying nonzero sp per row (canonical order [hp,atk,def,spa,spd,spe]).
const SP_VALUES = [32, 0, 20, 0, 14, 0];
const statsFrame = {
  kind: 'stats',
  panels: Array.from({ length: 6 }, (_, slot) => ({
    slot, species: [{ id: 7, score: 0.9 }],
    rows: SP_VALUES.map((sp) => ({ stat: null, sp, arrow: null })),
  })),
} as any;

// blob sentinel: size 1 -> moves frame, size 2 -> stats frame
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

afterEach(cleanup);

describe('PlayerScanModal', () => {
  it('re-seeds review edits when the second image lands, so its data is not masked by stale defaults', async () => {
    const deps = mkDeps({ 1: movesFrame, 2: statsFrame });
    render(
      <PlayerScanModal
        isOpen
        onClose={() => {}}
        pokemonList={pokemonList}
        moveList={[]}
        onSave={() => {}}
        deps={deps as any}
      />,
    );

    const debug = () => (window as any).__playerScanDebug;

    // Moves image first: seeds all 6 slots with SP defaulted to 0 (stats not scanned yet).
    await act(async () => { await debug().addFrame(blobOf(1)); });

    // Stats image lands second: merged data for all slots now carries real SP reads.
    await act(async () => { await debug().addFrame(blobOf(2)); });

    const spInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    // First slot's 6 SP inputs are the first 6 spinbuttons in the review grid.
    const slot1Sp = spInputs.slice(0, 6).map((el) => Number(el.value));
    expect(slot1Sp).toEqual(SP_VALUES);
  });

  it('moves-only scan: typed SP edits reach onSave configs even though stats were never scanned', async () => {
    const deps = mkDeps({ 1: movesFrame });
    let savedConfigs: any[] | null = null;
    render(
      <PlayerScanModal
        isOpen
        onClose={() => {}}
        pokemonList={pokemonList}
        moveList={[]}
        onSave={(configs) => { savedConfigs = configs; }}
        deps={deps as any}
      />,
    );

    const debug = () => (window as any).__playerScanDebug;
    await act(async () => { await debug().addFrame(blobOf(1)); });

    const spInputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
    const slot1Sp = spInputs.slice(0, 6);
    act(() => { fireEvent.change(slot1Sp[0], { target: { value: '32' } }); });
    act(() => { fireEvent.change(slot1Sp[2], { target: { value: '20' } }); });
    act(() => { fireEvent.change(slot1Sp[4], { target: { value: '14' } }); });

    const saveButton = screen.getByRole('button', { name: /save team/i });
    act(() => { saveButton.click(); });

    expect(savedConfigs).not.toBeNull();
    const cfg = savedConfigs![0];
    expect([cfg.spHp, cfg.spAtk, cfg.spDef, cfg.spSpa, cfg.spSpd, cfg.spSpe]).toEqual([32, 0, 20, 0, 14, 0]);
  });
});
