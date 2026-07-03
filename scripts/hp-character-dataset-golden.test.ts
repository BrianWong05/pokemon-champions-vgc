import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractDataset } from './extract-hp-character-dataset';

describe('HP character dataset golden extraction', () => {
  it.skipIf(!fs.existsSync('training/hp-golden.json') || !fs.existsSync('training/screenshots'))(
    'writes clean character samples from the current golden screenshots',
    () => {
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-character-dataset-'));
      const classesPath = path.join(outDir, 'classes.json');
      const summary = extractDataset({
        goldenPath: 'training/hp-golden.json',
        sourceDirs: ['training/screenshots'],
        outDir,
        classesPath,
        clean: true,
      });

      expect(summary.readablePlates).toBeGreaterThan(0);
      expect(summary.written).toBeGreaterThan(0);
      expect(fs.existsSync(classesPath)).toBe(true);
      expect(fs.readdirSync(path.join(outDir, '1')).some((name) => name.endsWith('.png'))).toBe(true);
    },
    600_000,
  );
});
