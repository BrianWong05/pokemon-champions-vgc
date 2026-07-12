// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

const mon = (id: number, nameEn: string) => ({ id, nameEn, identifier: nameEn.toLowerCase() } as PokemonBaseStats);

const bridgeMock = vi.hoisted(() => ({
  isAvailable: () => true,
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
  default: ({ overlayDefender }: any) => <div data-testid="calc">{overlayDefender ? `${overlayDefender.id}:${String(overlayDefender.hpPercent)}` : 'no-defender'}</div>,
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

  it('bubble tap with the roster locked opens the calc instantly — no capture, no scan', async () => {
    localStorage.setItem('scan.battleRoster', JSON.stringify([445, 823]));
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect(await screen.findByTestId('calc')).toBeTruthy();
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('panel');
    expect(bridgeMock.blinkAndCapture).not.toHaveBeenCalled();
    expect(scanFrameMock).not.toHaveBeenCalled();
  });

  it('battle frames are no longer scan-routed: no roster + battle frame -> error card', async () => {
    scanFrameMock.mockResolvedValue({
      mode: 'battle',
      slots: [{ box: { x: 100, y: 0, w: 1, h: 1 }, side: 'opponent', candidates: [{ id: 445, score: 0.9 }], hpPercent: 56 }],
    });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect(await screen.findByText(/That looks like a battle/)).toBeTruthy();
    expect(localStorage.getItem('scan.lastScanHp')).toBeNull();
  });

  it('strip pick opens the calc with the picked defender (no HP memory)', async () => {
    localStorage.setItem('scan.battleRoster', JSON.stringify([445, 823]));
    render(<OverlayApp />);
    fireEvent.click(screen.getByRole('button', { name: /Corviknight/ }));
    expect((await screen.findByTestId('calc')).textContent).toBe('823:null');
    expect(bridgeMock.setWindowState).toHaveBeenCalledWith('panel');
  });

  it('unreadable frame shows the error card', async () => {
    scanFrameMock.mockResolvedValue({ mode: null, slots: [] });
    render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    expect(await screen.findByText(/Couldn't read the screen/)).toBeTruthy();
  });

  it('hold-to-peek hides the calc panel while pressed and restores it on release', async () => {
    localStorage.setItem('scan.battleRoster', JSON.stringify([445, 823]));
    const { container } = render(<OverlayApp />);
    await act(async () => { (globalThis as any).__tap(); });
    const peek = await screen.findByRole('button', { name: /Hold to peek/ });
    const panel = container.querySelector('.rounded-2xl') as HTMLElement;
    fireEvent.pointerDown(peek);
    expect(panel.style.opacity).toBe('0');
    fireEvent.pointerUp(peek);
    expect(panel.style.opacity).toBe('1');
  });
});
