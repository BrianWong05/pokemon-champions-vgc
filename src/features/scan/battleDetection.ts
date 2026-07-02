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

/**
 * The mini-sprite sits in a hexagonal badge at the plate's LEFT tip, part of
 * the same colored blob as the plate — its columns are noticeably TALLER than
 * the plate strip. Locate that leftmost tall-column run and center the crop on
 * it; fall back to the fixed offset when no badge stands out (detached badge).
 */
function badgeBoxFromPanel(mask: Uint8Array, imgW: number, panel: TileBox): TileBox | null {
  const ext: number[] = [];
  for (let x = panel.x; x < panel.x + panel.w; x++) {
    let top = -1;
    let bot = -1;
    for (let y = panel.y; y < panel.y + panel.h; y++) {
      if (mask[y * imgW + x]) { if (top < 0) top = y; bot = y; }
    }
    ext.push(top < 0 ? 0 : bot - top + 1);
  }
  const nonZero = ext.filter((e) => e > 0).sort((a, b) => a - b);
  if (nonZero.length === 0) return null;
  const med = nonZero[Math.floor(nonZero.length / 2)];

  let start = -1;
  for (let i = 0; i <= ext.length; i++) {
    const tall = i < ext.length && ext[i] > med * 1.2;
    if (tall && start < 0) start = i;
    if (!tall && start >= 0) {
      const w = i - start;
      if (w >= panel.h * 0.5) {
        let top = panel.y + panel.h;
        let bot = panel.y;
        for (let x = panel.x + start; x < panel.x + i; x++) {
          for (let y = panel.y; y < panel.y + panel.h; y++) {
            if (mask[y * imgW + x]) { top = Math.min(top, y); bot = Math.max(bot, y); }
          }
        }
        return { x: panel.x + start, y: top, w, h: bot - top + 1 };
      }
      start = -1;
    }
  }
  return null;
}

function iconBoxFromBadge(badge: TileBox, img: RgbaImage): TileBox {
  // Sprites overflow the badge hexagon, mostly to its upper-left.
  const side = Math.round(Math.max(badge.w, badge.h) * 1.5);
  return clampBox({
    x: Math.round(badge.x + badge.w / 2 - side * 0.55),
    y: Math.round(badge.y + badge.h / 2 - side * 0.55),
    w: side,
    h: side,
  }, img);
}

// The badge can also be a DETACHED blob (the plate blob fragments on angled /
// gradient-heavy frames): a square-ish plate-colored blob at/left of the
// panel's left end.
function detachedBadgeNearPanel(blobs: TileBox[], panel: TileBox): TileBox | null {
  return blobs
    .filter((b) =>
      b.w / b.h > 0.5 && b.w / b.h < 2 && // square-ish, also excludes the panel itself
      b.h > panel.h * 0.7 && b.h < panel.h * 3.5 &&
      b.x + b.w > panel.x - panel.h * 2.5 &&
      b.x < panel.x + panel.w * 0.2 &&
      b.y < panel.y + panel.h * 2 &&
      b.y + b.h > panel.y - panel.h,
    )
    .sort((a, b) => b.w * b.h - a.w * a.h)[0] ?? null;
}

export function detectBattleIcons(img: RgbaImage, side: BattleSide): TileBox[] {
  const mask = panelMask(img, SIDES[side]);
  const minArea = Math.max(40, Math.floor(img.width * img.height * 0.0001));
  const blobs = connectedComponents(mask, img.width, img.height, minArea);
  return detectBattlePanels(img, side).map((panel) => {
    const inBlob = badgeBoxFromPanel(mask, img.width, panel);
    if (inBlob && inBlob.x - panel.x < panel.w * 0.35) return iconBoxFromBadge(inBlob, img);
    const detached = detachedBadgeNearPanel(blobs, panel);
    if (detached) return iconBoxFromBadge(detached, img);
    return battleIconFromPanel(panel, img);
  });
}
