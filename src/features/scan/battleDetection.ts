// src/features/scan/battleDetection.ts
import { connectedComponents } from './segmentation';
import type { RgbaImage, TileBox } from './types';

export type BattleSide = 'opponent' | 'player';

interface SideConfig {
  isPanelPixel: (r: number, g: number, b: number) => boolean;
  inRegion: (x: number, y: number, img: RgbaImage) => boolean;
}

// Nameplate panels are stable color anchors: opponent = magenta (top-right),
// player = indigo/purple (bottom-left). Anchoring on the plate avoids relying
// on HP fill color.
const SIDES: Record<BattleSide, SideConfig> = {
  opponent: {
    isPanelPixel: (r, g, b) => r > 150 && g < 115 && b > 70 && r > g + 60 && r > b + 15,
    inRegion: (x, y, img) => x > img.width * 0.45 && y < img.height * 0.22,
  },
  player: {
    isPanelPixel: (r, g, b) => b > 120 && b > g + 50 && b > r + 40,
    inRegion: (x, y, img) => x < img.width * 0.55 && y > img.height * 0.7,
  },
};

// Exposed for game-rect inference, which sweeps the whole image for anchors.
export const isOpponentPlatePixel = SIDES.opponent.isPanelPixel;

function panelMask(img: RgbaImage, cfg: SideConfig): Uint8Array {
  const mask = new Uint8Array(img.width * img.height);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (!cfg.inRegion(x, y, img)) continue;
      const i = (y * img.width + x) * 4;
      if (cfg.isPanelPixel(img.data[i], img.data[i + 1], img.data[i + 2])) mask[y * img.width + x] = 1;
    }
  }
  return mask;
}

export function detectBattlePanels(img: RgbaImage, side: BattleSide): TileBox[] {
  const cfg = SIDES[side];
  const minArea = Math.max(150, Math.floor(img.width * img.height * 0.0008));
  return connectedComponents(panelMask(img, cfg), img.width, img.height, minArea)
    .filter((b) =>
      b.w > img.width * 0.07 &&
      b.w < img.width * 0.3 &&
      b.h > img.height * 0.02 &&
      b.h < img.height * 0.12 &&
      b.w / b.h > 2 &&
      b.w / b.h < 9
    )
    .sort((a, b) => a.x - b.x)
    .slice(0, 2);
}

function clampBox(box: TileBox, img: RgbaImage): TileBox {
  const x = Math.max(0, Math.min(img.width - 1, box.x));
  const y = Math.max(0, Math.min(img.height - 1, box.y));
  return {
    x,
    y,
    w: Math.max(1, Math.min(box.w, img.width - x)),
    h: Math.max(1, Math.min(box.h, img.height - y)),
  };
}

function battleIconCropSize(panel: TileBox): number {
  const normalPanelSize = panel.h * 1.2;
  const embeddedPanelSize = Math.min(panel.h * 4, panel.w * 0.48);
  return Math.round(Math.max(normalPanelSize, embeddedPanelSize));
}

export function battleIconFromPanel(panel: TileBox, img: RgbaImage): TileBox {
  const size = battleIconCropSize(panel);
  return clampBox({
    x: panel.x - Math.round(size * 0.55),
    y: panel.y - Math.round((size - panel.h) * 0.25),
    w: size,
    h: size,
  }, img);
}

export function detectBattleIcons(img: RgbaImage, side: BattleSide): TileBox[] {
  return detectBattlePanels(img, side).map((p) => battleIconFromPanel(p, img));
}
