// Verifies that a detected panel blob is a REAL battle nameplate by finding
// its HP bar: a horizontally-elongated strip in the plate's lower band whose
// pixels are FILL (green/yellow/orange/true-red) or dark TRACK, always
// anchored by fill at the LEFT end. Team-preview cards have no such strip —
// this is what lets a SINGLE plate win battle mode without re-introducing
// the team-preview false positive (see the spec's mode-vote hierarchy).
import { rgbToHsv } from './segmentation';
import { readHpFromPanel } from './hpText';
import type { RgbaImage, TileBox } from './types';

// Same fill gate as hpText's measureHpBarFill (excludes the magenta plate
// body, h~325-345); track = the dark desaturated drained remainder.
function classifyPixel(img: RgbaImage, x: number, y: number): 'fill' | 'track' | 'other' {
  const i = (y * img.width + x) * 4;
  const [h, s, v] = rgbToHsv(img.data[i], img.data[i + 1], img.data[i + 2]);
  if (s > 0.45 && v > 0.35 && (h < 140 || h >= 350)) return 'fill';
  if (s < 0.4 && v < 0.45) return 'track';
  return 'other';
}

export function hasHpBarStrip(img: RgbaImage, panel: TileBox): boolean {
  // Window mirrors measureHpBarFill's short-blob handling: the detected blob
  // is often only the plate's top band, so search below it too.
  const y0 = Math.min(img.height - 1, panel.y + Math.round(panel.h * 0.35));
  const y1 = Math.min(img.height, panel.y + Math.round(panel.h * 2.2));
  const x0 = Math.max(0, panel.x);
  const x1 = Math.min(img.width, panel.x + panel.w);
  if (x1 - x0 < 8 || y1 - y0 < 3) return false;

  // Longest run per row of (fill | track) that BEGINS with a fill pixel —
  // the fill anchor rejects track-only bands (dark arena floor, shadows).
  const rows: Array<{ run: number; start: number }> = [];
  for (let y = y0; y < y1; y++) {
    let run = 0, maxRun = 0, start = -1, curStart = -1;
    for (let x = x0; x < x1; x++) {
      const kind = classifyPixel(img, x, y);
      if (run === 0) {
        if (kind === 'fill') { run = 1; curStart = x; }
      } else if (kind === 'fill' || kind === 'track') {
        run++;
      } else {
        if (run > maxRun) { maxRun = run; start = curStart; }
        run = 0;
      }
    }
    if (run > maxRun) { maxRun = run; start = curStart; }
    rows.push({ run: maxRun, start });
  }

  // The strip is a BAND: >=3 adjacent rows with long runs, aligned in length
  // and start column. Organic sprite/effect shapes fail alignment or span.
  const minRun = (x1 - x0) * 0.5;
  const isLong = (r: { run: number; start: number }) => r.run >= minRun && r.start >= 0;
  const aligned = (a: { run: number; start: number }, b: { run: number; start: number }) =>
    b.run >= a.run * 0.75 && Math.abs(b.start - a.start) < Math.max(4, panel.w * 0.05);
  // BOUNDEDNESS: a real HP bar is a narrow band with plate body ('other', not a
  // long run) ABOVE it inside the window. A uniform plate-colored card (crimson
  // card body, h~350 passes the fill gate) makes EVERY row a long aligned run
  // right from the window top — no non-run boundary above — so accept a band
  // only once a non-long row has been seen above it. One-sided is enough: the
  // window bottom may cut a real strip, but its top is always bounded by body.
  let sawNonLong = false;
  for (let k = 1; k < rows.length - 1; k++) {
    const r = rows[k];
    if (!isLong(r)) { sawNonLong = true; continue; }
    if (!sawNonLong) continue; // band touches window top → uniform body, not a bar
    const neighbors = [rows[k - 1], rows[k + 1]];
    if (neighbors.every((n) => n.start >= 0 && aligned(r, n))) return true;
  }
  return false;
}

// Second acceptance path: a readable HP value is precision-perfect evidence
// (the reader's wrong===0 invariant), adding recall on degraded bars.
export function isBattlePlate(img: RgbaImage, panel: TileBox, kind: 'percent' | 'fraction'): boolean {
  return hasHpBarStrip(img, panel) || readHpFromPanel(img, panel, undefined, kind) != null;
}
