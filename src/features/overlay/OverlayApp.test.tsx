// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const mon = (id: number, nameEn: string) => ({ id, nameEn, identifier: nameEn.toLowerCase() } as PokemonBaseStats);

const bridgeMock = vi.hoisted(() => ({
  isAvailable: () => true,
  captureFrame: vi.fn((): Blob | null => new Blob(['x'], { type: 'image/png' })),
  blinkAndCapture: vi.fn((): Blob | null => new Blob(['x'], { type: 'image/png' })),
  setWindowState: vi.fn(),
  setBubbleTag: vi.fn(),
  onBubbleTap: vi.fn((cb: () => void) => { (globalThis as any).__tap = cb; return () => {}; }),
  onBack: vi.fn(() => () => {}),
}));
const scanFrameMock = vi.hoisted(() => vi.fn());

vi.mock('./overlayBridge', () => ({ overlayBridge: bridgeMock }));
vi.mock('./usePokemonList', () => ({ usePokemonList: () => [mon(445, 'Garchomp'), mon(823, 'Corviknight')] }));
vi.mock('../formats/FormatContext', () => ({ useFormat: () => ({ format: 'reg-h' }) }));
vi.mock('../scan/scanFrame', async (importOriginal) => {
  const orig = await importOriginal<any>();
  return {
    ...orig,
    scanFrame: scanFrameMock,
    // jsdom has no canvas/createImageBitmap — stub the decode step.
    DEFAULT_DEPS: { ...orig.DEFAULT_DEPS, blobToRgbaImage: async () => ({ width: 1, height: 1, data: new Uint8ClampedArray(4) }) },
  };
});
vi.mock('@/pages/DamageCalculator', () => ({
  default: ({ overlayDefender }: any) => <div data-testid="calc">{overlayDefender?.id}:{String(overlayDefender?.hpPercent)}</div>,
}));

import OverlayApp from './OverlayApp';

describe('OverlayApp', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('reflects a locked roster to native on mount (strip + calc tag)', () => {
    localStorage.setItem('scan.battleRoster', JSON.stringify([445, 823]));
    render(<OverlayApp />);
    expect(bridgeMock.setBubbleTag).toHaveBeenCalledWith('calc');
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('strip');
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0); // strip tiles
  });

  it('bubble tap on a team-preview frame opens the confirm view', async () => {
    scanFrameMock.mockResolvedValue({ mode: 'team', slots: [{ box: { x: 0, y: 0, w: 1, h: 1 }, candidates: [{ id: 445, score: 0.9 }] }] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('panel');
    expect(await screen.findByText(/Confirm opponent roster/)).toBeTruthy();
  });

  it('bubble tap on a battle frame opens the calc with defender + hp and stores hp', async () => {
    localStorage.setItem('scan.battleRoster', JSON.stringify([445, 823]));
    scanFrameMock.mockResolvedValue({
      mode: 'battle',
      slots: [
        { box: { x: 100, y: 0, w: 1, h: 1 }, side: 'opponent', candidates: [{ id: 445, score: 0.9 }], hpPercent: 56 },
        { box: { x: 500, y: 0, w: 1, h: 1 }, side: 'opponent', candidates: [{ id: 823, score: 0.8 }], hpPercent: 100 },
      ],
    });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect((await screen.findByTestId('calc')).textContent).toBe('445:56');
    expect(JSON.parse(localStorage.getItem('scan.lastScanHp')!)).toEqual({ 445: 56, 823: 100 });
  });

  it('unreadable frame shows the error card', async () => {
    scanFrameMock.mockResolvedValue({ mode: null, slots: [] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect(await screen.findByText(/Couldn't read the screen/)).toBeTruthy();
  });
});
