import {
  clusterGlyphBoxes,
  extractGlyphs,
  filterSpecks,
  GLYPH_PIPELINE_CONFIGS,
  hpTextRegion,
  MASK_THRESHOLDS,
  plausibleGlyphShape,
  whiteMask,
  type BinMask,
  type GlyphPipelineConfig,
} from '../src/features/scan/hpText';
import type { RgbaImage, TileBox } from '../src/features/scan/types';

export const SAMPLE_WIDTH = 24;
export const SAMPLE_HEIGHT = 32;

export const HP_DATASET_CLASSES: Array<{ char: string; className: string }> = [
  { char: '0', className: '0' },
  { char: '1', className: '1' },
  { char: '2', className: '2' },
  { char: '3', className: '3' },
  { char: '4', className: '4' },
  { char: '5', className: '5' },
  { char: '6', className: '6' },
  { char: '7', className: '7' },
  { char: '8', className: '8' },
  { char: '9', className: '9' },
  { char: '/', className: 'slash' },
  { char: '%', className: 'percent' },
];

const CLASS_BY_CHAR = new Map(HP_DATASET_CLASSES.map((entry) => [entry.char, entry.className]));

export interface ExtractedHpCharacterSample {
  char: string;
  className: string;
  charIndex: number;
  box: TileBox;
  thresholdFactor: number;
  configIndex: number;
  image: RgbaImage;
}

export interface PanelSampleResult {
  skipped: boolean;
  reason: string | null;
  samples: ExtractedHpCharacterSample[];
}

export interface SamplesFromPanelOptions {
  thresholdFactors?: number[];
  configs?: GlyphPipelineConfig[];
}

export function classNameForChar(char: string): string {
  const className = CLASS_BY_CHAR.get(char);
  if (!className) throw new Error(`unsupported HP character "${char}"`);
  return className;
}

export function charsForExpectedText(text: string): string[] {
  return [...text].map((char) => {
    classNameForChar(char);
    return char;
  });
}

function unionBoxes(boxes: TileBox[]): TileBox {
  const x = Math.min(...boxes.map((box) => box.x));
  const y = Math.min(...boxes.map((box) => box.y));
  const x2 = Math.max(...boxes.map((box) => box.x + box.w));
  const y2 = Math.max(...boxes.map((box) => box.y + box.h));
  return { x, y, w: x2 - x, h: y2 - y };
}

function totalWidth(boxes: TileBox[]): number {
  return boxes.reduce((sum, box) => sum + box.w, 0);
}

export function glyphInkDensity(mask: BinMask, box: TileBox): number {
  let filled = 0;
  let total = 0;
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      total++;
      if (x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.bits[y * mask.w + x]) filled++;
    }
  }
  return total > 0 ? filled / total : 0;
}

export function hasEnoughGlyphInk(mask: BinMask, boxes: TileBox[], minDensity = 0.12): boolean {
  return boxes.every((box) => glyphInkDensity(mask, box) >= minDensity);
}

function isLikelySplitPercent(boxes: TileBox[]): boolean {
  if (boxes.length !== 2) return false;
  const [left, right] = [...boxes].sort((a, b) => a.x - b.x || a.y - b.y);
  const lineHeight = Math.max(left.h, right.h);
  const merged = unionBoxes([left, right]);
  const gap = Math.max(0, right.x - (left.x + left.w));
  const smallPiece =
    left.w <= lineHeight * 0.45 &&
    left.h <= lineHeight * 0.45 &&
    left.x <= merged.x + lineHeight * 0.35;
  const tallPiece =
    right.w <= lineHeight * 0.8 &&
    right.h >= lineHeight * 0.7 &&
    right.x + right.w >= merged.x + merged.w - Math.max(1, Math.round(lineHeight * 0.15));
  const compactPair =
    left.w <= lineHeight * 0.9 &&
    right.w <= lineHeight * 0.9 &&
    left.h >= lineHeight * 0.6 &&
    right.h >= lineHeight * 0.6 &&
    Math.abs(left.y + left.h / 2 - (right.y + right.h / 2)) <= lineHeight * 0.3;
  const diagonalPair =
    left.w <= merged.h * 0.6 &&
    right.w <= merged.h * 0.8 &&
    left.h <= merged.h * 0.7 &&
    right.h <= merged.h * 0.7 &&
    right.x > left.x &&
    right.y > left.y &&
    right.y - left.y <= merged.h * 0.65;

  return (
    plausibleGlyphShape('%', merged) &&
    gap <= Math.max(1, Math.round(lineHeight * 0.2)) &&
    ((smallPiece && tallPiece) || compactPair || diagonalPair)
  );
}

function forceSplitToCount(mask: BinMask, boxes: TileBox[], count: number): TileBox[] | null {
  const out = [...boxes];
  while (out.length < count) {
    let idx = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i].w >= 6 && (idx < 0 || out[i].w > out[idx].w)) idx = i;
    }
    if (idx < 0) return null;

    const box = out[idx];
    let best = Math.round(box.w / 2);
    let bestCount = Infinity;
    for (let dx = Math.round(box.w * 0.25); dx <= Math.round(box.w * 0.75); dx++) {
      let filled = 0;
      for (let y = box.y; y < box.y + box.h; y++) {
        const x = box.x + dx;
        if (x >= 0 && x < mask.w && y >= 0 && y < mask.h && mask.bits[y * mask.w + x]) filled++;
      }
      if (filled < bestCount) {
        bestCount = filled;
        best = dx;
      }
    }

    out.splice(
      idx,
      1,
      { x: box.x, y: box.y, w: best, h: box.h },
      { x: box.x + best, y: box.y, w: box.w - best, h: box.h },
    );
  }
  return out;
}

// Column projection sets a box's height to the y-extent of ANY pixel in its
// columns, so one noise pixel (timer, subtitle, plate glow) bleeding into a
// digit's columns inflates the box far beyond the glyph — wrecking the crop and
// tanking ink density. Trim each box to the contiguous vertical band around its
// densest row; a clean box (no stray rows) is returned unchanged.
export function trimBoxVertically(mask: BinMask, box: TileBox): TileBox {
  const rowInk: number[] = [];
  let peak = 0;
  let peakRow = 0;
  for (let y = box.y; y < box.y + box.h; y++) {
    let c = 0;
    for (let x = box.x; x < box.x + box.w; x++) {
      if (x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.bits[y * mask.w + x]) c++;
    }
    if (c > peak) {
      peak = c;
      peakRow = rowInk.length;
    }
    rowInk.push(c);
  }
  if (peak === 0) return box;
  // Keep every non-empty row contiguous with the densest row (the whole glyph
  // body, thin extremities included) and shed only rows DISCONNECTED from it by
  // an empty gap — the stray noise pixels that inflated the box. A higher
  // threshold clips thin digit rows and skips otherwise-clean plates.
  let first = peakRow;
  let last = peakRow;
  while (first > 0 && rowInk[first - 1] >= 1) first--;
  while (last < rowInk.length - 1 && rowInk[last + 1] >= 1) last++;
  return { x: box.x, y: box.y + first, w: box.w, h: last - first + 1 };
}

export function selectGlyphBoxes(mask: BinMask, clusters: TileBox[][], expectedText: string): TileBox[] | null {
  const chars = charsForExpectedText(expectedText);
  const candidates = clusters.filter((cluster) => cluster.length >= 2).map((candidate) =>
    [...candidate].sort((a, b) => a.x - b.x),
  );

  if (expectedText.endsWith('%')) {
    for (const candidate of candidates) {
      if (candidate.length !== chars.length + 1) continue;
      const percentTail = candidate.slice(chars.length - 1);
      if (!isLikelySplitPercent(percentTail)) continue;
      const selected = [...candidate.slice(0, chars.length - 1), unionBoxes(percentTail)];
      if (!hasEnoughGlyphInk(mask, selected)) continue;
      return selected;
    }
  }

  const exact = candidates.find((candidate) => candidate.length === chars.length && hasEnoughGlyphInk(mask, candidate));
  if (exact) return exact;

  // HP text is right-aligned in the plate — extra boxes are the Pokemon icon /
  // plate-edge blob on the LEFT. When a run over-segments, shed the leftmost
  // extras and take the rightmost N, but ONLY when that dropped group sits
  // further from the digits than any gap between the kept ones (so we peel off
  // an isolated blob, never split a real digit run).
  const ordered = clusters.flat().sort((a, b) => a.x - b.x);
  if (ordered.length > chars.length) {
    const kept = ordered.slice(ordered.length - chars.length);
    const lastDropped = ordered[ordered.length - chars.length - 1];
    const dropGap = kept[0].x - (lastDropped.x + lastDropped.w);
    const internalGap = Math.max(0, ...kept.slice(1).map((b, i) => b.x - (kept[i].x + kept[i].w)));
    if (dropGap > internalGap && hasEnoughGlyphInk(mask, kept)) return kept;
  }

  if (expectedText.endsWith('%')) return null;

  for (const candidate of clusters) {
    if (candidate.length >= chars.length) continue;
    const split = forceSplitToCount(mask, candidate, chars.length);
    if (split && !hasEnoughGlyphInk(mask, split)) continue;
    if (split) return split;
  }

  return null;
}

export function normalizeBoxToImage(
  mask: BinMask,
  box: TileBox,
  width = SAMPLE_WIDTH,
  height = SAMPLE_HEIGHT,
  pad = 2,
): RgbaImage {
  const source = {
    x: box.x - pad,
    y: box.y - pad,
    w: box.w + pad * 2,
    h: box.h + pad * 2,
  };
  const scale = Math.min(width / source.w, height / source.h);
  const drawW = Math.max(1, Math.round(source.w * scale));
  const drawH = Math.max(1, Math.round(source.h * scale));
  const left = Math.floor((width - drawW) / 2);
  const top = Math.floor((height - drawH) / 2);
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[(y * width + x) * 4 + 3] = 255;
    }
  }

  for (let y = 0; y < drawH; y++) {
    for (let x = 0; x < drawW; x++) {
      const sx = Math.floor(source.x + (x + 0.5) / scale);
      const sy = Math.floor(source.y + (y + 0.5) / scale);
      const on = sx >= 0 && sy >= 0 && sx < mask.w && sy < mask.h && mask.bits[sy * mask.w + sx] > 0;
      if (!on) continue;
      const dx = left + x;
      const dy = top + y;
      const i = (dy * width + dx) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  return { data, width, height };
}

export function samplesFromPanel(
  img: RgbaImage,
  panel: TileBox,
  expectedText: string,
  options: SamplesFromPanelOptions = {},
): PanelSampleResult {
  const chars = charsForExpectedText(expectedText);
  const thresholdFactors = options.thresholdFactors ?? MASK_THRESHOLDS;
  const configs = options.configs ?? GLYPH_PIPELINE_CONFIGS;
  const reasons: string[] = [];

  for (const thresholdFactor of thresholdFactors) {
    const raw = whiteMask(img, hpTextRegion(panel, img), thresholdFactor);
    for (let configIndex = 0; configIndex < configs.length; configIndex++) {
      const { mask, boxes } = extractGlyphs(raw, configs[configIndex]);
      const trimmed = boxes.map((box) => trimBoxVertically(mask, box));
      const clusters = clusterGlyphBoxes(filterSpecks(trimmed, mask.h)).sort(
        (a, b) => b.length - a.length || totalWidth(b) - totalWidth(a),
      );
      const selected = selectGlyphBoxes(mask, clusters, expectedText);
      if (!selected) {
        reasons.push(`threshold ${thresholdFactor} config ${configIndex}: no ${chars.length}-glyph cluster`);
        continue;
      }

      const kept = selected
        .map((box, charIndex) => ({ box, char: chars[charIndex], charIndex }))
        .filter(({ box, char }) => plausibleGlyphShape(char, box));
      if (kept.length !== chars.length) {
        reasons.push(`threshold ${thresholdFactor} config ${configIndex}: implausible glyph shape`);
        continue;
      }

      return {
        skipped: false,
        reason: null,
        samples: kept.map(({ box, char, charIndex }) => ({
          char,
          className: classNameForChar(char),
          charIndex,
          box,
          thresholdFactor,
          configIndex,
          image: normalizeBoxToImage(mask, box),
        })),
      };
    }
  }

  return {
    skipped: true,
    reason: reasons.slice(0, 5).join('; '),
    samples: [],
  };
}
