// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import PlayerScanPanel from './PlayerScanPanel';
import { buildPlayerScanVocab } from '@/db/repositories/scan.repo';

const pokemonList = [
  { id: 7, nameEn: 'Squirtle', baseHp: 44, baseAttack: 48, baseDefense: 65,
    baseSpAtk: 50, baseSpDef: 64, baseSpeed: 43, type1: 'Water', type2: null, identifier: 'squirtle', nameZh: null },
] as any;

const movesFrame = {
  kind: 'moves',
  panels: Array.from({ length: 6 }, (_, slot) => ({
    slot, species: [{ id: 7, score: 0.9 }], ability: null, item: null, moves: [null, null, null, null],
  })),
} as any;

// Fake usePlayerTeamScan deps (pattern from PlayerScanModal.test.tsx) that
// count how many frames reached the scanner.
const mkDeps = () => {
  const scanCalls: unknown[] = [];
  const deps = {
    blobToRgbaImage: async () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    loadVocab: async () => buildPlayerScanVocab({ moves: [], learnset: [], abilities: [], items: [] }),
    scanDeps: {} as any,
    detect: () => null as any,
    scan: async () => { scanCalls.push(1); return movesFrame; },
  } as any;
  return { deps, scanCalls };
};

afterEach(cleanup);

describe('PlayerScanPanel hosting seams', () => {
  it('renders the default file + camera capture buttons when sources is omitted', () => {
    const { deps } = mkDeps();
    render(<PlayerScanPanel pokemonList={pokemonList} moveList={[]} onSave={() => {}} deps={deps} />);
    // one per screen chip (moves + stats)
    expect(screen.getAllByRole('button', { name: 'Add screenshot' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Take photo' })).toHaveLength(2);
  });

  it('sources=[] hides the capture buttons (overlay hosting)', () => {
    const { deps } = mkDeps();
    render(<PlayerScanPanel pokemonList={pokemonList} moveList={[]} onSave={() => {}} deps={deps} sources={[]} />);
    expect(screen.queryByRole('button', { name: 'Add screenshot' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Take photo' })).toBeNull();
  });

  it('hint replaces the default intro copy', () => {
    const { deps } = mkDeps();
    render(<PlayerScanPanel pokemonList={pokemonList} moveList={[]} onSave={() => {}} deps={deps} hint={<p>bubble-hint</p>} />);
    expect(screen.getByText('bubble-hint')).toBeTruthy();
    expect(screen.queryByText(/Add both screens of your team/)).toBeNull();
  });

  it('scans an externally captured frame whenever seq advances, never twice per seq', async () => {
    const { deps, scanCalls } = mkDeps();
    const blob = new Blob(['x']);
    const props = { pokemonList, moveList: [], onSave: () => {}, deps, sources: [] as any[] };
    const view = render(<PlayerScanPanel {...(props as any)} frame={{ blob, seq: 1 }} />);
    await act(async () => {});
    expect(scanCalls).toHaveLength(1);

    view.rerender(<PlayerScanPanel {...(props as any)} frame={{ blob, seq: 1 }} />);
    await act(async () => {});
    expect(scanCalls).toHaveLength(1); // same seq -> no rescan

    view.rerender(<PlayerScanPanel {...(props as any)} frame={{ blob, seq: 2 }} />);
    await act(async () => {});
    expect(scanCalls).toHaveLength(2);
  });
});
