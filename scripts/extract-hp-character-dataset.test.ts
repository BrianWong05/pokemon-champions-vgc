import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PNG } from 'pngjs';
import { HP_DATASET_CLASSES, type ExtractedHpCharacterSample } from './hp-character-dataset-core';
import {
  parseArgs,
  sampleFilename,
  screenshotStemOfSample,
  writeClassesJson,
  writeRgbaPng,
} from './extract-hp-character-dataset';
import type { RgbaImage } from '../src/features/scan/types';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hp-dataset-test-'));
}

function sample(char: string, className: string): ExtractedHpCharacterSample {
  return {
    char,
    className,
    charIndex: 2,
    box: { x: 1, y: 2, w: 3, h: 4 },
    thresholdFactor: 0.8,
    configIndex: 0,
    image: { data: new Uint8ClampedArray(24 * 32 * 4), width: 24, height: 32 },
  };
}

describe('extract HP character dataset CLI helpers', () => {
  it('builds stable sample filenames without raw slash or percent characters', () => {
    expect(sampleFilename('Xnip2026-07-03_02-11-37.png', 'screenshots', 'player', 0, sample('/', 'slash')))
      .toBe('Xnip2026-07-03_02-11-37__screenshots__player1__02__slash.png');
    expect(sampleFilename('screen one.png', 'fixtures', 'opponent', 1, sample('%', 'percent')))
      .toBe('screen_one__fixtures__opponent2__02__percent.png');
  });

  it('writes an RGBA PNG with the expected dimensions', () => {
    const dir = tmpDir();
    const img: RgbaImage = { data: new Uint8ClampedArray(24 * 32 * 4), width: 24, height: 32 };
    img.data[0] = 255;
    img.data[1] = 255;
    img.data[2] = 255;
    img.data[3] = 255;

    const file = path.join(dir, 'sample.png');
    writeRgbaPng(img, file);
    const png = PNG.sync.read(fs.readFileSync(file));
    expect(png.width).toBe(24);
    expect(png.height).toBe(32);
  });

  it('writes class order as classifier characters', () => {
    const file = path.join(tmpDir(), 'classes.json');
    writeClassesJson(file);
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(HP_DATASET_CLASSES.map((entry) => entry.char));
  });

  it('parses output, clean flag, and positional source dirs', () => {
    expect(parseArgs(['--clean', '--out', 'tmp/hp', 'training/screenshots'])).toEqual({
      clean: true,
      onlyNew: false,
      outDir: 'tmp/hp',
      classesPath: 'hp-reader/models/classes.json',
      goldenPath: 'training/hp-golden.json',
      sourceDirs: ['training/screenshots'],
    });
  });

  it('parses the --new incremental flag', () => {
    expect(parseArgs(['--new']).onlyNew).toBe(true);
    expect(parseArgs([]).onlyNew).toBe(false);
  });

  it('defaults to writing unreviewed samples into candidate storage', () => {
    expect(parseArgs([]).outDir).toBe('hp-reader/dataset-candidates');
  });

  it('recovers the screenshot stem from a sample filename (the --new skip key)', () => {
    expect(screenshotStemOfSample('Xnip2026-07-03_02-11-37__screenshots__player1__02__slash.png'))
      .toBe('Xnip2026-07-03_02-11-37');
    // A screenshot that never produced samples has no filename, so nothing to recover.
    expect(screenshotStemOfSample('no-delimiter.png')).toBeNull();
  });
});
