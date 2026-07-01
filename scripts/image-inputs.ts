import { execFileSync } from 'child_process';
import * as fs from 'fs';
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

export function defaultImageConverter(sourcePath: string, pngPath: string): void {
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
