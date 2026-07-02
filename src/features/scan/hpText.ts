// src/features/scan/hpText.ts
// Reads the fixed-font HP text under battle nameplates without a general OCR engine.
import { rgbToHsv } from './segmentation';
import { HP_GLYPH_TEMPLATES } from './hpGlyphTemplates';
import type { RgbaImage, TileBox } from './types';

export const GLYPH_SIZE = 16;

const MAX_HAMMING = 64;
const BAR_DISAGREE_PCT = 12;

export interface GlyphTemplate {
  char: string;
  bits: string;
}

export interface HpReading {
  percent: number;
  current?: number;
  max?: number;
}

export interface BinMask {
  bits: Uint8Array;
  w: number;
  h: number;
}

export function hpTextRegion(panel: TileBox, img: { width: number; height: number }): TileBox {
  // The HP text straddles the plate's bottom edge (the panel blob is the
  // magenta/purple plate only) — start mid-plate so the glyphs are whole. The
  // name text at the plate's top stays outside the region.
  const y = Math.min(img.height - 1, panel.y + Math.round(panel.h * 0.45));
  return {
    x: panel.x,
    y,
    w: Math.max(0, Math.min(panel.w, img.width - panel.x)),
    // Tight height: the timer / "MOVE TIME" white text sits further below and
    // must stay out of the region (a "20" cluster reads as a valid percent).
    h: Math.max(0, Math.min(Math.round(panel.h * 1.3), img.height - y)),
  };
}

export function whiteMask(img: RgbaImage, box: TileBox): BinMask {
  const bits = new Uint8Array(box.w * box.h);
  let peak = 0;
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * img.width + (box.x + x)) * 4;
      const m = Math.min(img.data[i], img.data[i + 1], img.data[i + 2]);
      if (m > peak) peak = m;
    }
  }

  const threshold = Math.max(120, Math.round(peak * 0.8));
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * img.width + (box.x + x)) * 4;
      if (Math.min(img.data[i], img.data[i + 1], img.data[i + 2]) >= threshold) bits[y * box.w + x] = 1;
    }
  }
  return { bits, w: box.w, h: box.h };
}

// The plate's slanted white border/outline crosses the region and would
// bridge every glyph column into one run — remove connected components wider
// than any glyph can be (pixel-accurate: bbox-zeroing would erase glyphs the
// diagonal's bbox overlaps).
function cleanMask(mask: BinMask): BinMask {
  const limit = Math.max(4, Math.round(mask.h * 1.4));
  const seen = new Uint8Array(mask.bits.length);
  const bits = Uint8Array.from(mask.bits);
  const stack: number[] = [];
  for (let p = 0; p < bits.length; p++) {
    if (!bits[p] || seen[p]) continue;
    const pixels: number[] = [];
    let minX = mask.w;
    let maxX = 0;
    stack.push(p);
    seen[p] = 1;
    while (stack.length) {
      const q = stack.pop()!;
      pixels.push(q);
      const x = q % mask.w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (x > 0 && bits[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; stack.push(q - 1); }
      if (x < mask.w - 1 && bits[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; stack.push(q + 1); }
      if (q - mask.w >= 0 && bits[q - mask.w] && !seen[q - mask.w]) { seen[q - mask.w] = 1; stack.push(q - mask.w); }
      if (q + mask.w < bits.length && bits[q + mask.w] && !seen[q + mask.w]) { seen[q + mask.w] = 1; stack.push(q + mask.w); }
    }
    if (maxX - minX + 1 > limit) for (const q of pixels) bits[q] = 0;
  }
  return { bits, w: mask.w, h: mask.h };
}

export function segmentGlyphs(rawMask: BinMask): TileBox[] {
  const mask = cleanMask(rawMask);
  const colHas = new Array<boolean>(mask.w).fill(false);
  for (let x = 0; x < mask.w; x++) {
    for (let y = 0; y < mask.h; y++) {
      if (mask.bits[y * mask.w + x]) {
        colHas[x] = true;
        break;
      }
    }
  }

  const boxes: TileBox[] = [];
  let start = -1;
  for (let x = 0; x <= mask.w; x++) {
    const has = x < mask.w && colHas[x];
    if (has && start < 0) start = x;
    if (!has && start >= 0) {
      let y0 = mask.h;
      let y1 = -1;
      for (let y = 0; y < mask.h; y++) {
        for (let gx = start; gx < x; gx++) {
          if (mask.bits[y * mask.w + gx]) {
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
            break;
          }
        }
      }
      const box = { x: start, y: y0, w: x - start, h: y1 - y0 + 1 };
      if (box.h >= 5 && box.w >= 1) boxes.push(box);
      start = -1;
    }
  }
  return boxes;
}

export function clusterGlyphBoxes(boxes: TileBox[]): TileBox[][] {
  if (boxes.length === 0) return [];
  const widths = boxes.map((b) => b.w).sort((a, b) => a - b);
  const medW = widths[Math.floor(widths.length / 2)];
  const clusters: TileBox[][] = [[boxes[0]]];
  for (let i = 1; i < boxes.length; i++) {
    const prev = boxes[i - 1];
    if (boxes[i].x - (prev.x + prev.w) > medW * 2) clusters.push([]);
    clusters[clusters.length - 1].push(boxes[i]);
  }
  return clusters;
}

export function normalizeGlyph(mask: BinMask, box: TileBox): Uint8Array {
  const out = new Uint8Array(GLYPH_SIZE * GLYPH_SIZE);
  for (let gy = 0; gy < GLYPH_SIZE; gy++) {
    for (let gx = 0; gx < GLYPH_SIZE; gx++) {
      const sx = box.x + Math.min(box.w - 1, Math.floor(((gx + 0.5) * box.w) / GLYPH_SIZE));
      const sy = box.y + Math.min(box.h - 1, Math.floor(((gy + 0.5) * box.h) / GLYPH_SIZE));
      out[gy * GLYPH_SIZE + gx] = mask.bits[sy * mask.w + sx];
    }
  }
  return out;
}

export function matchGlyph(
  bits: Uint8Array,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
): string | null {
  let bestChar: string | null = null;
  let bestDist = Infinity;
  for (const template of templates) {
    if (template.bits.length !== bits.length) continue;
    let dist = 0;
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] !== template.bits.charCodeAt(i) - 48) dist++;
    }
    if (dist < bestDist) {
      bestDist = dist;
      bestChar = template.char;
    }
  }
  return bestDist <= MAX_HAMMING ? bestChar : null;
}

export function parseHpText(text: string): HpReading | null {
  const pct = /^(\d{1,3})%$/.exec(text);
  if (pct) {
    const percent = Number(pct[1]);
    return percent <= 100 ? { percent } : null;
  }

  const frac = /^(\d{1,4})\/(\d{1,4})$/.exec(text);
  if (frac) {
    const current = Number(frac[1]);
    const max = Number(frac[2]);
    if (max === 0 || current > max) return null;
    return { percent: Math.round((current / max) * 100), current, max };
  }

  return null;
}

export function measureHpBarFill(img: RgbaImage, panel: TileBox): number | null {
  const region = hpTextRegion(panel, img);
  let bestRun = 0;
  let trackW = 1;

  for (let y = region.y; y < region.y + region.h; y++) {
    let run = 0;
    let maxRun = 0;
    let first = -1;
    let last = -1;
    for (let x = region.x; x < region.x + region.w; x++) {
      const i = (y * img.width + x) * 4;
      const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
      const filled = s > 0.45 && v > 0.35 && (h < 140 || h > 330);
      if (filled) {
        run++;
        maxRun = Math.max(maxRun, run);
      } else {
        run = 0;
      }
      if (filled || v < 0.3) {
        if (first < 0) first = x;
        last = x;
      }
    }
    if (maxRun > bestRun) {
      bestRun = maxRun;
      trackW = Math.max(1, last - first + 1);
    }
  }

  if (bestRun < panel.w * 0.1) return null;
  return Math.max(0, Math.min(1, bestRun / trackW));
}

export function readHpFromPanel(
  img: RgbaImage,
  panel: TileBox,
  templates: GlyphTemplate[] = HP_GLYPH_TEMPLATES,
): HpReading | null {
  if (templates.length === 0) return null;
  const region = hpTextRegion(panel, img);
  if (region.h < 4 || region.w < 4) return null;

  const mask = whiteMask(img, region);
  const clusters = clusterGlyphBoxes(segmentGlyphs(mask)).sort((a, b) => b.length - a.length);
  for (const cluster of clusters) {
    const chars = cluster.map((box) => matchGlyph(normalizeGlyph(mask, box), templates));
    if (chars.some((char) => char === null)) continue;
    const reading = parseHpText(chars.join(''));
    if (!reading) continue;

    const bar = measureHpBarFill(img, panel);
    if (bar != null && Math.abs(reading.percent - bar * 100) > BAR_DISAGREE_PCT) return null;
    return reading;
  }

  return null;
}
