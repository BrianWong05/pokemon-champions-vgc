import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  buildGoldenEntry,
  listCandidateScreenshots,
  normalizeOpponentHp,
  normalizePlayerHp,
  parseArgs,
  resolveGoldenScreenshot,
  upsertGoldenEntry,
} from './add-hp-golden';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hp-golden-test-'));
}

describe('add HP golden helpers', () => {
  it('parses custom screenshot and golden paths', () => {
    expect(
      parseArgs([
        '--screenshots',
        'tmp/shots',
        '--golden',
        'tmp/golden.json',
        '--no-open',
        '--overwrite',
        'battle.png',
      ]),
    ).toMatchObject({
      screenshotsDir: 'tmp/shots',
      goldenPath: 'tmp/golden.json',
      noOpen: true,
      overwrite: true,
      screenshotName: 'battle.png',
    });
  });

  it('normalizes valid HP labels and rejects impossible values', () => {
    expect(normalizeOpponentHp('38%')).toBe('38%');
    expect(normalizeOpponentHp('100')).toBe('100%');
    expect(normalizeOpponentHp('')).toBeNull();
    expect(() => normalizeOpponentHp('101%')).toThrow(/opponent/i);

    expect(normalizePlayerHp('177/177')).toBe('177/177');
    expect(normalizePlayerHp('')).toBeNull();
    expect(() => normalizePlayerHp('200/177')).toThrow(/player/i);
  });

  it('builds entries while trimming trailing blank slots', () => {
    expect(buildGoldenEntry(['38%', ''], ['177/177', ''])).toEqual({
      opponent: ['38%'],
      player: ['177/177'],
    });
    expect(buildGoldenEntry(['', '100%'], ['', '1/250'])).toEqual({
      opponent: [null, '100%'],
      player: [null, '1/250'],
    });
  });

  it('lists screenshots that are not already in the golden file', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'a.png'), '');
    fs.writeFileSync(path.join(dir, 'b.jpg'), '');
    fs.writeFileSync(path.join(dir, 'notes.txt'), '');

    expect(listCandidateScreenshots(dir, { 'a.png': { opponent: [], player: [] } })).toEqual(['b.jpg']);
    expect(listCandidateScreenshots(dir, { 'a.png': { opponent: [], player: [] } }, true)).toEqual([
      'a.png',
      'b.jpg',
    ]);
  });

  it('resolves selected screenshots and rejects missing files', () => {
    const dir = tmpDir();
    fs.writeFileSync(path.join(dir, 'battle.png'), '');
    const options = parseArgs(['--screenshots', dir, '--converted', path.join(dir, 'converted')]);

    expect(resolveGoldenScreenshot(options, 'battle.png')).toMatchObject({
      sourcePath: path.join(dir, 'battle.png'),
      pngPath: path.join(dir, 'battle.png'),
      goldenName: 'battle.png',
      extractDir: dir,
      converted: false,
    });
    expect(() => resolveGoldenScreenshot(options, 'missing.png')).toThrow(/not found/);
  });

  it('adds entries without overwriting unless requested', () => {
    const dir = tmpDir();
    const goldenPath = path.join(dir, 'hp-golden.json');
    fs.writeFileSync(goldenPath, JSON.stringify({ existing: { opponent: ['100%'], player: [] } }, null, 1));

    upsertGoldenEntry(goldenPath, 'new.png', { opponent: ['38%'], player: ['177/177'] });
    expect(JSON.parse(fs.readFileSync(goldenPath, 'utf8'))).toEqual({
      existing: { opponent: ['100%'], player: [] },
      'new.png': { opponent: ['38%'], player: ['177/177'] },
    });
    expect(() => upsertGoldenEntry(goldenPath, 'new.png', { opponent: [], player: [] })).toThrow(/already exists/);
  });
});
