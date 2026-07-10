import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
  '.bmp',
  '.gif',
  '.webp',
];

export interface ScreenshotInput {
  name: string;
  sourcePath: string;
  pngPath: string;
  converted: boolean;
}

export type ImageConverter = (sourcePath: string, pngPath: string) => void;

export function isSupportedScreenshotFile(name: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.includes(path.extname(name).toLowerCase());
}

export function listSupportedScreenshotNames(names: string[], fileFilters: string[]): string[] {
  const supported = names.filter(isSupportedScreenshotFile);
  if (fileFilters.length === 0) return supported;
  return supported.filter((name) => fileFilters.some((filter) => name.includes(filter)));
}

export function convertedPngName(name: string): string {
  const parsed = path.parse(name);
  const ext = parsed.ext.replace(/^\./, '').toLowerCase();
  return `${parsed.name}_${ext}.png`;
}

// Renders src through Quick Look (the Finder-faithful renderer: HEIC irot /
// EXIF Orientation applied) at the given max size. Returns the produced png
// path inside a temp dir the CALLER must clean up, or null if Quick Look
// produced nothing (it exits 0 even then).
function quickLookRender(sourcePath: string, maxSize: number, outDir: string): string | null {
  try {
    execFileSync('qlmanage', ['-t', '-s', String(maxSize), '-o', outDir, sourcePath], { stdio: 'pipe' });
  } catch {
    return null;
  }
  const produced = path.join(outDir, `${path.basename(sourcePath)}.png`);
  return fs.existsSync(produced) ? produced : null;
}

function pngDims(file: string): { w: number; h: number } {
  // IHDR width/height live at fixed offsets (16/20) — no decoder needed.
  const buf = fs.readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// True when the file's DISPLAYED orientation is transposed vs its stored
// pixels (portrait iPhone HEIC/jpg): probe with a tiny Quick Look render and
// compare aspect against the stored dimensions. 180-degree rotations don't
// transpose and slip through — acceptable: nobody photographs a screen
// upside down, and sips output stays byte-identical for every existing golden.
function rendersTransposed(sourcePath: string): boolean {
  let stored: { w: number; h: number };
  try {
    const out = execFileSync(
      'sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', sourcePath], { stdio: 'pipe' },
    ).toString();
    const w = /pixelWidth: (\d+)/.exec(out);
    const h = /pixelHeight: (\d+)/.exec(out);
    if (!w || !h) return false;
    stored = { w: Number(w[1]), h: Number(h[1]) };
  } catch {
    return false;
  }
  if (stored.w === stored.h) return false;
  const probeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-probe-'));
  try {
    const probe = quickLookRender(sourcePath, 48, probeDir);
    if (!probe) return false;
    const rendered = pngDims(probe);
    return (rendered.w > rendered.h) !== (stored.w > stored.h);
  } catch {
    return false;
  } finally {
    fs.rmSync(probeDir, { recursive: true, force: true });
  }
}

export function defaultImageConverter(sourcePath: string, pngPath: string): void {
  // sips does a container-only conversion that DROPS rotation metadata (HEIC
  // irot / EXIF Orientation) — portrait iPhone photos then reach detection
  // lying on their side. But sips is the renderer every template/golden floor
  // was calibrated against (Quick Look's decode differs by ~0.2/px — enough
  // to move the HP-glyph floors). So: Quick Look ONLY for files that actually
  // render transposed, byte-identical sips for everything else.
  if (rendersTransposed(sourcePath)) {
    const qlDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-convert-'));
    try {
      // -s never upscales; 8192 covers any phone capture at full resolution.
      const produced = quickLookRender(sourcePath, 8192, qlDir);
      if (produced) {
        fs.copyFileSync(produced, pngPath);
        return;
      }
    } finally {
      fs.rmSync(qlDir, { recursive: true, force: true });
    }
  }
  try {
    execFileSync('sips', ['-s', 'format', 'png', sourcePath, '--out', pngPath], { stdio: 'pipe' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not convert ${sourcePath} to PNG with macOS sips: ${message}`);
  }
}

function shouldConvert(sourcePath: string, pngPath: string): boolean {
  try {
    const sourceStat = fs.statSync(sourcePath);
    const pngStat = fs.statSync(pngPath);
    return pngStat.size === 0 || pngStat.mtimeMs < sourceStat.mtimeMs;
  } catch {
    return true;
  }
}

export function resolveScreenshotInput(
  shotsDir: string,
  name: string,
  convertedDir = path.resolve('training/.converted-screenshots'),
  convert: ImageConverter = defaultImageConverter,
): ScreenshotInput {
  const sourcePath = path.join(shotsDir, name);
  if (path.extname(name).toLowerCase() === '.png') {
    return { name, sourcePath, pngPath: sourcePath, converted: false };
  }

  const pngPath = path.join(convertedDir, convertedPngName(name));
  if (shouldConvert(sourcePath, pngPath)) {
    fs.mkdirSync(convertedDir, { recursive: true });
    convert(sourcePath, pngPath);
  }

  return { name, sourcePath, pngPath, converted: true };
}
