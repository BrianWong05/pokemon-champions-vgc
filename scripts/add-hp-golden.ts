import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  convertedPngName,
  isSupportedScreenshotFile,
  resolveScreenshotInput,
} from './image-inputs';

export type HpGoldenValue = string | null;
export interface HpGoldenEntry {
  opponent: HpGoldenValue[];
  player: HpGoldenValue[];
}
export type HpGoldenFile = Record<string, HpGoldenEntry>;

export interface AddHpGoldenOptions {
  screenshotsDir: string;
  goldenPath: string;
  convertedDir: string;
  noOpen: boolean;
  overwrite: boolean;
  screenshotName: string | null;
}

export interface ResolvedGoldenScreenshot {
  sourcePath: string;
  pngPath: string;
  goldenName: string;
  extractDir: string;
  converted: boolean;
}

const DEFAULT_OPTIONS: AddHpGoldenOptions = {
  screenshotsDir: 'training/screenshots',
  goldenPath: 'training/hp-golden.json',
  convertedDir: 'training/.converted-screenshots',
  noOpen: process.env.HP_GOLDEN_NO_OPEN === '1',
  overwrite: false,
  screenshotName: null,
};

function goldenKeyForScreenshotName(name: string): string {
  return path.extname(name).toLowerCase() === '.png' ? name : convertedPngName(name);
}

export function parseArgs(argv: string[]): AddHpGoldenOptions {
  const parsed: AddHpGoldenOptions = { ...DEFAULT_OPTIONS };
  let screenshotsDirExplicit = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--screenshots') {
      const value = argv[++i];
      if (!value) throw new Error('--screenshots requires a directory');
      parsed.screenshotsDir = value;
      screenshotsDirExplicit = true;
    } else if (arg === '--golden') {
      const value = argv[++i];
      if (!value) throw new Error('--golden requires a JSON path');
      parsed.goldenPath = value;
    } else if (arg === '--converted') {
      const value = argv[++i];
      if (!value) throw new Error('--converted requires a directory');
      parsed.convertedDir = value;
    } else if (arg === '--no-open') {
      parsed.noOpen = true;
    } else if (arg === '--overwrite') {
      parsed.overwrite = true;
    } else if (parsed.screenshotName == null) {
      parsed.screenshotName = arg;
    } else {
      throw new Error(`unexpected argument "${arg}"`);
    }
  }

  if (parsed.screenshotName && path.dirname(parsed.screenshotName) !== '.' && !screenshotsDirExplicit) {
    parsed.screenshotsDir = path.dirname(parsed.screenshotName);
    parsed.screenshotName = path.basename(parsed.screenshotName);
  } else if (parsed.screenshotName) {
    parsed.screenshotName = path.basename(parsed.screenshotName);
  }

  return parsed;
}

export function normalizeOpponentHp(input: string): string | null {
  const value = input.trim();
  if (value === '') return null;
  const match = /^(\d{1,3})%?$/.exec(value);
  if (!match) throw new Error(`Invalid opponent HP "${input}". Use a percentage like 38% or 100%.`);
  const percent = Number(match[1]);
  if (percent < 0 || percent > 100) {
    throw new Error(`Invalid opponent HP "${input}". Percent must be 0-100.`);
  }
  return `${percent}%`;
}

export function normalizePlayerHp(input: string): string | null {
  const value = input.trim();
  if (value === '') return null;
  const match = /^(\d{1,3})\s*\/\s*(\d{1,3})$/.exec(value);
  if (!match) throw new Error(`Invalid player HP "${input}". Use a fraction like 177/177.`);
  const current = Number(match[1]);
  const max = Number(match[2]);
  if (max <= 0 || current < 0 || current > max) {
    throw new Error(`Invalid player HP "${input}". Current HP must be between 0 and max HP.`);
  }
  return `${current}/${max}`;
}

function trimTrailingNulls(values: HpGoldenValue[]): HpGoldenValue[] {
  const trimmed = [...values];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] == null) trimmed.pop();
  return trimmed;
}

export function buildGoldenEntry(opponentInputs: string[], playerInputs: string[]): HpGoldenEntry {
  return {
    opponent: trimTrailingNulls(opponentInputs.map(normalizeOpponentHp)),
    player: trimTrailingNulls(playerInputs.map(normalizePlayerHp)),
  };
}

function readGolden(goldenPath: string): HpGoldenFile {
  if (!fs.existsSync(goldenPath)) return {};
  return JSON.parse(fs.readFileSync(goldenPath, 'utf8')) as HpGoldenFile;
}

function writeGolden(goldenPath: string, golden: HpGoldenFile): void {
  fs.mkdirSync(path.dirname(goldenPath), { recursive: true });
  fs.writeFileSync(goldenPath, `${JSON.stringify(golden, null, 1)}\n`);
}

export function listCandidateScreenshots(
  screenshotsDir: string,
  golden: HpGoldenFile,
  includeExisting = false,
): string[] {
  if (!fs.existsSync(screenshotsDir)) return [];
  return fs
    .readdirSync(screenshotsDir)
    .filter(isSupportedScreenshotFile)
    .filter((name) => includeExisting || golden[goldenKeyForScreenshotName(name)] == null)
    .sort();
}

export function resolveGoldenScreenshot(
  options: AddHpGoldenOptions,
  screenshotName: string,
): ResolvedGoldenScreenshot {
  const sourcePath = path.join(options.screenshotsDir, screenshotName);
  if (!fs.existsSync(sourcePath)) throw new Error(`${sourcePath} not found.`);
  const input = resolveScreenshotInput(options.screenshotsDir, screenshotName, options.convertedDir);
  return {
    sourcePath: input.sourcePath,
    pngPath: input.pngPath,
    goldenName: path.basename(input.pngPath),
    extractDir: input.converted ? options.convertedDir : options.screenshotsDir,
    converted: input.converted,
  };
}

export function upsertGoldenEntry(
  goldenPath: string,
  screenshotName: string,
  entry: HpGoldenEntry,
  overwrite = false,
): HpGoldenFile {
  const golden = readGolden(goldenPath);
  if (golden[screenshotName] != null && !overwrite) {
    throw new Error(`${screenshotName} already exists in ${goldenPath}; pass --overwrite to replace it.`);
  }
  golden[screenshotName] = entry;
  writeGolden(goldenPath, golden);
  return golden;
}

async function chooseScreenshot(
  options: AddHpGoldenOptions,
  golden: HpGoldenFile,
  ask: (question: string) => Promise<string>,
): Promise<string> {
  if (options.screenshotName) return options.screenshotName;

  const candidates = listCandidateScreenshots(options.screenshotsDir, golden, options.overwrite);
  if (candidates.length === 0) {
    throw new Error(`No new screenshots found in ${options.screenshotsDir}.`);
  }

  console.log(`Screenshots in ${options.screenshotsDir}:`);
  candidates.forEach((name, index) => console.log(`  ${index + 1}. ${name}`));

  while (true) {
    const answer = (await ask('Choose screenshot number or filename: ')).trim();
    const index = Number(answer);
    if (Number.isInteger(index) && index >= 1 && index <= candidates.length) return candidates[index - 1];
    if (candidates.includes(answer)) return answer;
    console.log('  Unknown screenshot. Pick a listed number or filename.');
  }
}

async function askHp(
  ask: (question: string) => Promise<string>,
  question: string,
  normalize: (input: string) => string | null,
): Promise<string> {
  while (true) {
    const answer = await ask(question);
    try {
      return normalize(answer) ?? '';
    } catch (err) {
      console.log(`  ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

async function promptForEntry(ask: (question: string) => Promise<string>): Promise<HpGoldenEntry> {
  const opponent = [
    await askHp(ask, 'Opponent 1 HP percent (blank to skip): ', normalizeOpponentHp),
    await askHp(ask, 'Opponent 2 HP percent (blank to skip): ', normalizeOpponentHp),
  ];
  const player = [
    await askHp(ask, 'Player 1 HP fraction (blank to skip): ', normalizePlayerHp),
    await askHp(ask, 'Player 2 HP fraction (blank to skip): ', normalizePlayerHp),
  ];
  return buildGoldenEntry(opponent, player);
}

function openPreview(file: string): void {
  try {
    execFileSync('open', [file]);
  } catch {
    console.log(`Open ${file} to inspect the screenshot.`);
  }
}

async function main(options: AddHpGoldenOptions): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

  try {
    const golden = readGolden(options.goldenPath);
    const screenshotName = await chooseScreenshot(options, golden, ask);
    const screenshot = resolveGoldenScreenshot(options, screenshotName);

    if (!options.overwrite && golden[screenshot.goldenName] != null) {
      throw new Error(`${screenshot.goldenName} already exists in ${options.goldenPath}; pass --overwrite to replace it.`);
    }

    console.log(`\nScreenshot: ${screenshot.sourcePath}`);
    if (screenshot.converted) console.log(`Converted PNG: ${screenshot.pngPath}`);
    if (!options.noOpen) openPreview(screenshot.sourcePath);

    const entry = await promptForEntry(ask);
    upsertGoldenEntry(options.goldenPath, screenshot.goldenName, entry, options.overwrite);

    console.log(`\nSaved ${screenshot.goldenName} to ${options.goldenPath}.`);
    console.log(`Build candidates from this folder: ${screenshot.extractDir}`);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main(parseArgs(process.argv.slice(2))).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
