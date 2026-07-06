// src/features/scan/gameRect.ts
// Locates the 16:9 game frame inside a larger image (browser chrome, video
// frames, phone-photo margins) from color anchors whose internal geometry is
// distinctive: the opponent card stack (team select) or the battle plate pair.
// The game layout is fixed, so one anchor's x-span pins the whole frame; the
// 16:9 ratio is imposed rather than derived (blob heights under-measure when
// plates fragment).
import { connectedComponents } from './segmentation';
import { isOpponentPlatePixel } from './battleDetection';
import type { RgbaImage, TileBox } from './types';

// Anchor bounds inside a full game frame, as fractions of frame size.
// Measured from clean full-frame screenshots (03-24-56 team, 19-38-20 +
// 03-26-01 battle averaged).
const OPP_COLUMN = { x0: 0.784, x1: 0.977, y0: 0.139 };
const PLATE_PAIR = { x0: 0.575, x1: 0.945, y0: 0.037 };

// Per-plate slot priors for SINGLE-plate battle frames (one Pokemon left /
// singles). Values measured by scripts/measure-plate-slots.ts over the
// native 2v2 goldens; singletons occupy EITHER slot (spec: both mandatory).
export const PLATE_SLOTS = {
  left: { x0: 0.581, x1: 0.746, y0: 0.036 },
  right: { x0: 0.79, x1: 0.952, y0: 0.036 },
};

function magentaBlobs(img: RgbaImage): TileBox[] {
  const mask = new Uint8Array(img.width * img.height);
  for (let p = 0; p < mask.length; p++) {
    const i = p * 4;
    if (isOpponentPlatePixel(img.data[i], img.data[i + 1], img.data[i + 2])) mask[p] = 1;
  }
  const minArea = Math.max(40, Math.floor(img.width * img.height * 0.00005));
  return connectedComponents(mask, img.width, img.height, minArea);
}

function boundsOf(group: TileBox[]): TileBox {
  const x0 = Math.min(...group.map((b) => b.x));
  const y0 = Math.min(...group.map((b) => b.y));
  const x1 = Math.max(...group.map((b) => b.x + b.w));
  const y1 = Math.max(...group.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// >=4 same-width, left-aligned, vertically stacked blobs = the card column.
function findCardStack(blobs: TileBox[]): TileBox | null {
  let best: TileBox[] | null = null;
  for (const seed of blobs) {
    if (seed.w / seed.h < 1.1 || seed.w / seed.h > 8) continue;
    const group = blobs.filter((o) =>
      Math.abs(o.x - seed.x) < seed.w * 0.2 &&
      Math.abs(o.w - seed.w) < seed.w * 0.25 &&
      o.h > seed.h * 0.5 && o.h < seed.h * 2,
    );
    if (group.length >= 4 && (!best || group.length > best.length)) best = group;
  }
  return best ? boundsOf(best) : null;
}

// 2 similar wide blobs side by side = the opponent nameplate pair.
function findPlatePair(blobs: TileBox[]): TileBox | null {
  let best: TileBox | null = null;
  for (const a of blobs) {
    if (a.w / a.h < 2 || a.w / a.h > 12) continue;
    for (const b of blobs) {
      if (b === a || b.x <= a.x + a.w) continue;
      const similar = Math.abs(b.w - a.w) < a.w * 0.3 && Math.abs(b.h - a.h) < a.h;
      const sameRow = Math.abs(b.y - a.y) < Math.max(a.h, b.h);
      const nearby = b.x - (a.x + a.w) < a.w * 1.5;
      if (!similar || !sameRow || !nearby) continue;
      const bounds = boundsOf([a, b]);
      if (!best || bounds.w * bounds.h > best.w * best.h) best = bounds;
    }
  }
  return best;
}

function solveRect(
  anchor: TileBox,
  frac: { x0: number; x1: number; y0: number },
  img: RgbaImage,
): TileBox | null {
  const gw = anchor.w / (frac.x1 - frac.x0);
  const gh = (gw * 9) / 16;
  const x = Math.max(0, Math.round(anchor.x - frac.x0 * gw));
  const y = Math.max(0, Math.round(anchor.y - frac.y0 * gh));
  const rect = {
    x,
    y,
    w: Math.min(Math.round(gw), img.width - x),
    h: Math.min(Math.round(gh), img.height - y),
  };
  if (rect.w < img.width * 0.2 || rect.h < img.height * 0.2) return null;
  return rect;
}

export function inferGameRect(img: RgbaImage): TileBox | null {
  const blobs = magentaBlobs(img);
  const stack = findCardStack(blobs);
  if (stack) {
    const rect = solveRect(stack, OPP_COLUMN, img);
    if (rect) return rect;
  }
  const pair = findPlatePair(blobs);
  return pair ? solveRect(pair, PLATE_PAIR, img) : null;
}

// Ordered candidate rects for detectScanTargets' rescue loop: strongest
// anchors first, then single-plate slot hypotheses (right before left —
// most observed singletons sit right). Validation is the CALLER's job:
// magentaBlobs sweeps the whole image, so shiny plate-colored Pokemon
// bodies produce junk candidates that only re-detection can reject.
// Note: for an ISOLATED plate the two slot hypotheses are mutually valid
// (near-identical solved widths; the plate lands in the opponent region
// either way), so left-slot frames accept the right hypothesis's rect,
// shifted left by the slot offset. Downstream behavior is unaffected —
// targets are detected on real pixels and shifted back to source coords —
// and the leftward bias never crops out the bottom-left player plates.
export function inferGameRectCandidates(img: RgbaImage): TileBox[] {
  const blobs = magentaBlobs(img);
  const out: TileBox[] = [];
  const push = (r: TileBox | null) => {
    if (r && !out.some((o) => Math.abs(o.x - r.x) < 4 && Math.abs(o.w - r.w) < 4)) out.push(r);
  };
  const stack = findCardStack(blobs);
  if (stack) push(solveRect(stack, OPP_COLUMN, img));
  const pair = findPlatePair(blobs);
  if (pair) push(solveRect(pair, PLATE_PAIR, img));
  const singles = blobs
    .filter((b) => b.w / b.h >= 2 && b.w / b.h <= 12)
    .sort((a, b) => b.w * b.h - a.w * a.h)
    .slice(0, 3);
  for (const s of singles) {
    push(solveRect(s, PLATE_SLOTS.right, img));
    push(solveRect(s, PLATE_SLOTS.left, img));
  }
  return out;
}
