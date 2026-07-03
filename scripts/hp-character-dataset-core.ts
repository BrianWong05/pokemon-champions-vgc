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

export function selectGlyphBoxes(mask: BinMask, clusters: TileBox[][], expectedText: string): TileBox[] | null {
  const chars = charsForExpectedText(expectedText);
  const all = clusters.flat().sort((a, b) => a.x - b.x);
  const candidates = [...clusters.filter((cluster) => cluster.length >= 2), all].map((candidate) =>
    [...candidate].sort((a, b) => a.x - b.x),
  );

  const exact = candidates.find((candidate) => candidate.length === chars.length);
  if (exact) return exact;

  if (expectedText.endsWith('%')) {
    for (const candidate of candidates) {
      if (candidate.length <= chars.length || candidate.length > chars.length + 2) continue;
      const percentStart = chars.length - 1;
      return [...candidate.slice(0, percentStart), unionBoxes(candidate.slice(percentStart))];
    }
  }

  for (const candidate of [...clusters, all]) {
    if (candidate.length >= chars.length) continue;
    const split = forceSplitToCount(mask, candidate, chars.length);
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
      const clusters = clusterGlyphBoxes(filterSpecks(boxes, mask.h)).sort(
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
