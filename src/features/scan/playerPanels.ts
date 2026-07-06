import type { RgbaImage, TileBox } from './types';
import { rgbToHsv, connectedComponents } from './segmentation';
import type { PanelRegions, PlayerFrameDetection, PlayerScreenKind, StatCellRegions } from './playerTypes';

// CALIBRATE: purple panel body of the team-detail screens (both layouts)
export function isPanelPurplePixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return h >= 230 && h <= 280 && s >= 0.12 && s <= 0.6 && v >= 0.45;
}

// CALIBRATE: orange stat bars (stats screen only)
function isBarPixel(r: number, g: number, b: number): boolean {
  const [h, s, v] = rgbToHsv(r, g, b);
  return h >= 15 && h <= 45 && s >= 0.5 && v >= 0.55;
}

// Bar pixels are only sampled from the columns where the stats screen actually
// draws its digit+bar pairs (see STATS_FRAC.cell: stat/sp span roughly
// [0.30, 0.50] and [0.78, 1.0] of the panel width, y >= 0.28). Scanning the
// whole panel also catches orange/tan move-type and held-item icons on the
// moves screen (e.g. Ground-type icon, Sitrus Berry) and false-positives it
// as 'stats' — restricting to the bar columns avoids those icon zones entirely.
const BAR_SCAN_Y0 = 0.28;
const BAR_SCAN_X_BANDS: ReadonlyArray<readonly [number, number]> = [[0.28, 0.50], [0.76, 1.0]];

export function classifyScreenKind(img: RgbaImage, panels: TileBox[]): PlayerScreenKind {
  let statsVotes = 0;
  for (const p of panels) {
    let bar = 0;
    let scanned = 0;
    const y0 = p.y + Math.round(p.h * BAR_SCAN_Y0);
    for (let y = y0; y < p.y + p.h; y++) {
      for (const [f0, f1] of BAR_SCAN_X_BANDS) {
        const x0 = p.x + Math.round(p.w * f0);
        const x1 = p.x + Math.round(p.w * f1);
        for (let x = x0; x < x1; x++) {
          const i = (y * img.width + x) * 4;
          scanned++;
          if (isBarPixel(img.data[i], img.data[i + 1], img.data[i + 2])) bar++;
        }
      }
    }
    if (bar >= scanned * 0.005) statsVotes++; // CALIBRATE
  }
  return statsVotes >= 3 ? 'stats' : 'moves';
}

// Region tables as fractions [x, y, w, h] of the panel box. CALIBRATE with
// scripts/preview-player-crops.ts against the golden screenshots.
type Frac = readonly [number, number, number, number];

export const MOVES_FRAC = {
  sprite: [0.0, 0.0, 0.15, 0.55] as Frac,
  ability: [0.03, 0.32, 0.55, 0.14] as Frac,
  itemText: [0.03, 0.55, 0.55, 0.18] as Frac,
  moveText: (i: number) => [0.60, 0.03 + i * 0.24, 0.37, 0.21] as Frac,
};

export const STATS_FRAC = {
  sprite: [0.0, 0.0, 0.15, 0.55] as Frac,
  // per stat cell [col, row]: label (incl. arrow), stat digits, sp digits
  cell: (col: number, row: number) => ({
    label: [0.02 + col * 0.48, 0.30 + row * 0.235, 0.24, 0.19] as Frac,
    stat:  [0.30 + col * 0.48, 0.30 + row * 0.235, 0.12, 0.19] as Frac,
    sp:    [0.42 + col * 0.48, 0.30 + row * 0.235, 0.09, 0.19] as Frac,
  }),
};

function frac(panel: TileBox, f: readonly [number, number, number, number]): TileBox {
  return {
    x: Math.round(panel.x + panel.w * f[0]),
    y: Math.round(panel.y + panel.h * f[1]),
    w: Math.round(panel.w * f[2]),
    h: Math.round(panel.h * f[3]),
  };
}

export function carveRegions(panel: TileBox, kind: PlayerScreenKind): PanelRegions {
  if (kind === 'moves') {
    return {
      panel,
      sprite: frac(panel, MOVES_FRAC.sprite),
      abilityText: frac(panel, MOVES_FRAC.ability),
      itemText: frac(panel, MOVES_FRAC.itemText),
      moveTexts: [0, 1, 2, 3].map(i => frac(panel, MOVES_FRAC.moveText(i))),
    };
  }
  // canonical order [hp, atk, def, spa, spd, spe] = left column top→bottom, then right column
  const cells: StatCellRegions[] = [];
  for (const [col, rows] of [[0, [0, 1, 2]], [1, [0, 1, 2]]] as const) {
    for (const row of rows) {
      const c = STATS_FRAC.cell(col, row);
      cells.push({ label: frac(panel, c.label), stat: frac(panel, c.stat), sp: frac(panel, c.sp) });
    }
  }
  return { panel, sprite: frac(panel, STATS_FRAC.sprite), statCells: cells };
}

// CALIBRATE: real panels are near-identical in area; drop outliers before the top-6 pick
// so an oversized/undersized intruder blob can't displace a true panel.
const MEDIAN_AREA_MIN_RATIO = 0.55;
const MEDIAN_AREA_MAX_RATIO = 1.8;

function medianAreaFilter(boxes: TileBox[]): TileBox[] {
  const areas = boxes.map(b => b.w * b.h).sort((a, b) => a - b);
  const mid = areas.length / 2;
  const median = areas.length % 2 ? areas[Math.floor(mid)] : (areas[mid - 1] + areas[mid]) / 2;
  return boxes.filter(b => {
    const ratio = (b.w * b.h) / median;
    return ratio >= MEDIAN_AREA_MIN_RATIO && ratio <= MEDIAN_AREA_MAX_RATIO;
  });
}

// CALIBRATE: tolerance for row/column alignment, as a fraction of panel height/width.
const ROW_Y_TOLERANCE = 0.3;
const COL_X_TOLERANCE = 0.3;

// Validates that 6 row-major-ordered boxes (2 per row, 3 rows) actually form a
// 2x3 grid: each row's pair shares a y-center, rows are vertically distinct,
// and each column's x-center is consistent across rows.
function isValidGrid(ordered: TileBox[]): boolean {
  const avgH = ordered.reduce((s, b) => s + b.h, 0) / ordered.length;
  const avgW = ordered.reduce((s, b) => s + b.w, 0) / ordered.length;
  const rows = [0, 1, 2].map(r => ordered.slice(r * 2, r * 2 + 2));

  for (const row of rows) {
    const [a, b] = row.map(box => box.y + box.h / 2);
    if (Math.abs(a - b) > avgH * ROW_Y_TOLERANCE) return false;
  }

  const rowCy = rows.map(row => (row[0].y + row[0].h / 2 + row[1].y + row[1].h / 2) / 2);
  if (!(rowCy[1] - rowCy[0] > avgH * ROW_Y_TOLERANCE && rowCy[2] - rowCy[1] > avgH * ROW_Y_TOLERANCE)) return false;

  for (const col of [0, 1]) {
    const cxs = rows.map(row => row[col].x + row[col].w / 2);
    const spread = Math.max(...cxs) - Math.min(...cxs);
    if (spread > avgW * COL_X_TOLERANCE) return false;
  }

  return true;
}

export function detectPlayerPanels(img: RgbaImage): PlayerFrameDetection | null {
  const mask = new Uint8Array(img.width * img.height);
  for (let i = 0, px = 0; i < img.data.length; i += 4, px++) {
    if (img.data[i + 3] > 0 && isPanelPurplePixel(img.data[i], img.data[i + 1], img.data[i + 2])) mask[px] = 1;
  }
  const minArea = Math.max(2000, Math.round(img.width * img.height * 0.008)); // CALIBRATE
  let boxes = connectedComponents(mask, img.width, img.height, minArea)
    .filter(b => b.w / b.h > 2 && b.w / b.h < 6 && b.w >= img.width * 0.22);
  if (boxes.length < 6) return null;
  boxes = medianAreaFilter(boxes);
  if (boxes.length < 6) return null;
  boxes = boxes.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 6);

  const byCy = boxes
    .map(b => ({ b, cy: b.y + b.h / 2, cx: b.x + b.w / 2 }))
    .sort((p, q) => p.cy - q.cy);
  const ordered: TileBox[] = [];
  for (let r = 0; r < 3; r++) {
    ordered.push(...byCy.slice(r * 2, r * 2 + 2).sort((p, q) => p.cx - q.cx).map(p => p.b));
  }
  if (!isValidGrid(ordered)) return null;
  const kind = classifyScreenKind(img, ordered);
  return { kind, panels: ordered.map(box => carveRegions(box, kind)) };
}
