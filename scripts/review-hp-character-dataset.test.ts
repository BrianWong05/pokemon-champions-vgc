import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  acceptedPathForCandidate,
  copyAcceptedCandidate,
  listCandidateFiles,
  normalizeReviewLabel,
  parseReviewArgs,
} from './review-hp-character-dataset';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hp-review-test-'));
}

describe('HP character dataset review helpers', () => {
  it('maps review answers to stable class directories', () => {
    expect(normalizeReviewLabel('7')).toBe('7');
    expect(normalizeReviewLabel('/')).toBe('slash');
    expect(normalizeReviewLabel('slash')).toBe('slash');
    expect(normalizeReviewLabel('%')).toBe('percent');
    expect(normalizeReviewLabel('percent')).toBe('percent');
    expect(normalizeReviewLabel('x')).toBeNull();
  });

  it('lists candidate files by requested class only', () => {
    const root = tmpDir();
    fs.mkdirSync(path.join(root, 'slash'), { recursive: true });
    fs.mkdirSync(path.join(root, 'percent'), { recursive: true });
    fs.mkdirSync(path.join(root, '1'), { recursive: true });
    fs.writeFileSync(path.join(root, 'slash', 'b.png'), '');
    fs.writeFileSync(path.join(root, 'slash', 'a.png'), '');
    fs.writeFileSync(path.join(root, 'percent', 'c.png'), '');
    fs.writeFileSync(path.join(root, '1', 'd.png'), '');

    expect(listCandidateFiles(root, ['slash', 'percent']).map((file) => path.relative(root, file.path))).toEqual([
      'percent/c.png',
      'slash/a.png',
      'slash/b.png',
    ]);
  });

  it('copies accepted candidates into the reviewed dataset directory', () => {
    const root = tmpDir();
    const out = tmpDir();
    const candidate = path.join(root, 'slash', 'sample.png');
    fs.mkdirSync(path.dirname(candidate), { recursive: true });
    fs.writeFileSync(candidate, 'png');

    const expected = acceptedPathForCandidate({ className: 'slash', path: candidate }, out, 'percent');
    copyAcceptedCandidate({ className: 'slash', path: candidate }, out, 'percent');

    expect(fs.readFileSync(expected, 'utf8')).toBe('png');
    expect(expected).toBe(path.join(out, 'percent', 'sample.png'));
  });

  it('parses review options with candidate defaults', () => {
    expect(parseReviewArgs(['--clean', '--class', 'slash', '--class', '%', '--out', 'tmp/accepted'])).toMatchObject({
      clean: true,
      candidatesDir: 'hp-reader/dataset-candidates',
      outDir: 'tmp/accepted',
      classes: ['slash', 'percent'],
    });
  });
});
