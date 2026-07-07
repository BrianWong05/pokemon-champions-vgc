import type { RgbaImage, TileBox } from './types';
import {
  whiteMask, filterSpecks, normalizeGlyph, charDistances, type GlyphCosts, type BinMask,
} from './hpText';
import { HP_GLYPH_TEMPLATES } from './hpGlyphTemplates';
import { STAT_GLYPH_TEMPLATES } from './statGlyphTemplates';
import { rgbToHsv } from './segmentation';
import type { StatCellRegions } from './playerTypes';

export type NatureArrow = 'up' | 'down' | null;
export interface StatRowRead { stat: number | null; sp: number | null; arrow: NatureArrow }

// The stats screen's digit font is upright (not the HP plate's italic font),
// so its own templates are tried first; HP digit templates remain a fallback
// for stray shapes the small golden set didn't cover.
const DIGIT_TEMPLATES = [...STAT_GLYPH_TEMPLATES, ...HP_GLYPH_TEMPLATES.filter(t => t.char >= '0' && t.char <= '9')];
const MAX_MEAN_COST = 0.1; // mirror hpText MAX_DIST: prefer blank over a guess

// Column-projection segmentation without hpText's cleanMask left-edge-component
// strip: that step exists to remove the HP plate's white frame remnant, which
// never appears in these digit crops (max horizontal run measured across every
// golden stats screenshot is 14px, well under any glyph height) — but stat/SP
// digits legitimately touch the crop's left edge (STATS_FRAC's column-1 cells
// have ~zero margin), and the frame-removal heuristic would delete them.
function segmentDigitGlyphs(mask: BinMask): TileBox[] {
  const colHas = new Array<boolean>(mask.w).fill(false);
  for (let x = 0; x < mask.w; x++) {
    for (let y = 0; y < mask.h; y++) {
      if (mask.bits[y * mask.w + x]) { colHas[x] = true; break; }
    }
  }
  const boxes: TileBox[] = [];
  let start = -1;
  for (let x = 0; x <= mask.w; x++) {
    const has = x < mask.w && colHas[x];
    if (has && start < 0) start = x;
    if (!has && start >= 0) {
      let y0 = mask.h, y1 = -1;
      for (let y = 0; y < mask.h; y++) {
        for (let gx = start; gx < x; gx++) {
          if (mask.bits[y * mask.w + gx]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); break; }
        }
      }
      boxes.push({ x: start, y: y0, w: x - start, h: y1 - y0 + 1 });
      start = -1;
    }
  }
  return boxes;
}

// normalizeGlyph pads a non-square box to a square canvas symmetrically in
// mask coordinates; a digit narrower than its own height (every digit here)
// gets side padding that, at this font's tight tracking, reaches into the
// next glyph. Blank out other columns first so the padding samples empty
// space instead of the neighbor's ink.
function isolateColumns(mask: BinMask, box: TileBox): BinMask {
  const bits = new Uint8Array(mask.bits.length);
  for (let y = 0; y < mask.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) bits[y * mask.w + x] = mask.bits[y * mask.w + x];
  }
  return { bits, w: mask.w, h: mask.h };
}

function decodeInteger(glyphs: GlyphCosts[], maxValue: number): number | null {
  const options = glyphs.map(g =>
    [...g.dists.entries()].filter(([c]) => c >= '0' && c <= '9').sort((a, b) => a[1] - b[1]).slice(0, 2));
  if (!options.length || options.some(o => o.length === 0)) return null;
  let best: { value: number; cost: number } | null = null;
  for (let pick = 0; pick < 1 << options.length; pick++) {
    let text = '', cost = 0;
    for (let i = 0; i < options.length; i++) {
      const opt = options[i][(pick >> i) & 1];
      if (!opt) { text = ''; break; }
      text += opt[0]; cost += opt[1];
    }
    if (!text || (text.length > 1 && text.startsWith('0'))) continue;
    const value = Number(text);
    if (value > maxValue) continue;
    const mean = cost / options.length;
    if (mean > MAX_MEAN_COST) continue;
    if (!best || mean < best.cost) best = { value, cost: mean };
  }
  return best ? best.value : null;
}

export function readIntegerIn(img: RgbaImage, box: TileBox, maxValue: number): number | null {
  const mask = whiteMask(img, box);
  const rawBoxes = filterSpecks(segmentDigitGlyphs(mask), mask.h);
  // Background sheen near some panel edges catches whiteMask's threshold and
  // segments as an extra short blob. Every digit in a cell renders at the
  // SAME height (unlike HP text's two-tier current/max sizes), so a per-cell
  // height filter (tighter than filterSpecks's generic 0.3 ratio) drops it
  // without risking a real digit.
  const maxH = rawBoxes.length ? Math.max(...rawBoxes.map(b => b.h)) : 0;
  const boxes = rawBoxes.filter(b => b.h >= maxH * 0.8);
  if (!boxes.length || boxes.length > String(maxValue).length) return null;
  const glyphs: GlyphCosts[] = boxes
    .sort((a, b) => a.x - b.x)
    .map(b => ({
      box: b,
      dists: charDistances(normalizeGlyph(isolateColumns(mask, b), b), b.h / mask.h, b, DIGIT_TEMPLATES),
    }));
  return decodeInteger(glyphs, maxValue);
}

export function detectArrow(img: RgbaImage, labelBox: TileBox): NatureArrow {
  // arrows sit at the right end of the label; scan the right 45% to skip the stat icon/text
  const x0 = labelBox.x + Math.floor(labelBox.w * 0.55);
  let red = 0, blue = 0;
  for (let y = labelBox.y; y < labelBox.y + labelBox.h; y++) {
    for (let x = x0; x < labelBox.x + labelBox.w; x++) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] === 0) continue;
      const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
      // The arrow icons are soft/anti-aliased (measured s~0.2-0.4) — a 0.4
      // floor rejected them outright. The panel background (h~260-261,
      // s~0.39) sits inside that same saturation range too, so the hue bands
      // below (up: h>=290; down: h in [175,245]) carry the real separation.
      if (s < 0.18 || v < 0.35) continue;
      if (h >= 290 || h <= 20) red++;
      else if (h >= 175 && h <= 245) blue++;
    }
  }
  const min = Math.max(6, Math.round(labelBox.w * labelBox.h * 0.008)); // CALIBRATE
  if (red >= min && red > blue * 2) return 'up';
  if (blue >= min && blue > red * 2) return 'down';
  return null;
}

export function readStatCell(img: RgbaImage, cell: StatCellRegions): StatRowRead {
  return {
    stat: readIntegerIn(img, cell.stat, 999),
    sp: readIntegerIn(img, cell.sp, 32),
    arrow: detectArrow(img, cell.label),
  };
}
