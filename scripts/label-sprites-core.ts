import { connectedComponents, detectOpponentTiles } from '../src/features/scan/segmentation';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

export type LabelMode = 'team' | 'battle';
export type RequestedMode = 'auto' | LabelMode;

export function detectTiles(img: RgbaImage): TileBox[] {
  return detectOpponentTiles(img);
}

// The opponent HP-bar panel is a stable magenta/pink anchor in battle mode.
// It catches both opponents and avoids relying on HP fill color.
function battlePanelMask(img: RgbaImage): Uint8Array {
  const mask = new Uint8Array(img.width * img.height);
  const minX = Math.floor(img.width * 0.45);
  const maxY = Math.floor(img.height * 0.22);

  for (let y = 0; y < maxY; y++) {
    for (let x = minX; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const r = img.data[i];
      const g = img.data[i + 1];
      const b = img.data[i + 2];
      if (r > 150 && g < 115 && b > 70 && r > g + 60 && r > b + 15) {
        mask[y * img.width + x] = 1;
      }
    }
  }

  return mask;
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

function battleIconFromPanel(panel: TileBox, img: RgbaImage): TileBox {
  const size = battleIconCropSize(panel);
  return clampBox({
    x: panel.x - Math.round(size * 0.55),
    y: panel.y - Math.round((size - panel.h) * 0.25),
    w: size,
    h: size,
  }, img);
}

export function detectBattleIcons(img: RgbaImage): TileBox[] {
  const minArea = Math.max(150, Math.floor(img.width * img.height * 0.0008));
  const panels = connectedComponents(battlePanelMask(img), img.width, img.height, minArea)
    .filter((b) =>
      b.x > img.width * 0.45 &&
      b.y < img.height * 0.2 &&
      b.w > img.width * 0.07 &&
      b.w < img.width * 0.3 &&
      b.h > img.height * 0.02 &&
      b.h < img.height * 0.12 &&
      b.w / b.h > 2 &&
      b.w / b.h < 9
    )
    .sort((a, b) => a.x - b.x)
    .slice(0, 2);

  return panels.map((panel) => battleIconFromPanel(panel, img));
}

export function detectLabelCrops(img: RgbaImage, requestedMode: RequestedMode = 'auto'): { mode: LabelMode; boxes: TileBox[] } {
  if (requestedMode === 'team') return { mode: 'team', boxes: detectTiles(img) };
  if (requestedMode === 'battle') return { mode: 'battle', boxes: detectBattleIcons(img) };

  const battleBoxes = detectBattleIcons(img);
  if (battleBoxes.length === 2) return { mode: 'battle', boxes: battleBoxes };

  const teamBoxes = detectTiles(img);
  if (teamBoxes.length > 0) return { mode: 'team', boxes: teamBoxes };

  return { mode: 'battle', boxes: battleBoxes };
}
