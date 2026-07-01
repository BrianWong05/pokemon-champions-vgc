import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  convertedPngName,
  isSupportedScreenshotFile,
  listSupportedScreenshotNames,
  resolveScreenshotInput,
} from './image-inputs';

describe('image input helpers', () => {
  it('includes png and common screenshot formats', () => {
    expect(isSupportedScreenshotFile('battle.PNG')).toBe(true);
    expect(isSupportedScreenshotFile('battle.jpg')).toBe(true);
    expect(isSupportedScreenshotFile('battle.JPEG')).toBe(true);
    expect(isSupportedScreenshotFile('battle.heic')).toBe(true);
    expect(isSupportedScreenshotFile('battle.webp')).toBe(true);
    expect(isSupportedScreenshotFile('notes.txt')).toBe(false);
  });

  it('filters supported screenshots by filename substring', () => {
    const names = ['A.png', 'B.jpg', 'B.txt', 'C.heic'];

    expect(listSupportedScreenshotNames(names, ['B'])).toEqual(['B.jpg']);
    expect(listSupportedScreenshotNames(names, [])).toEqual(['A.png', 'B.jpg', 'C.heic']);
  });

  it('uses the original path for png screenshots', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'label-inputs-'));
    fs.writeFileSync(path.join(dir, 'screen.png'), 'not-real-png');

    const input = resolveScreenshotInput(dir, 'screen.png', path.join(dir, '.converted'), () => {
      throw new Error('png should not be converted');
    });

    expect(input).toEqual({
      name: 'screen.png',
      sourcePath: path.join(dir, 'screen.png'),
      pngPath: path.join(dir, 'screen.png'),
      converted: false,
    });
  });

  it('converts non-png screenshots to a cached png path', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'label-inputs-'));
    const convertedDir = path.join(dir, '.converted');
    fs.writeFileSync(path.join(dir, 'screen.jpeg'), 'not-real-jpeg');
    const converted: Array<[string, string]> = [];

    const input = resolveScreenshotInput(dir, 'screen.jpeg', convertedDir, (source, dest) => {
      converted.push([source, dest]);
      fs.writeFileSync(dest, 'not-real-png');
    });

    expect(input).toEqual({
      name: 'screen.jpeg',
      sourcePath: path.join(dir, 'screen.jpeg'),
      pngPath: path.join(convertedDir, 'screen_jpeg.png'),
      converted: true,
    });
    expect(converted).toEqual([[path.join(dir, 'screen.jpeg'), path.join(convertedDir, 'screen_jpeg.png')]]);
    expect(convertedPngName('screen.jpeg')).toBe('screen_jpeg.png');
  });
});
