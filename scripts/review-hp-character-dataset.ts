import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { execFileSync } from 'child_process';
import { HP_DATASET_CLASSES } from './hp-character-dataset-core';

export interface CandidateFile {
  className: string;
  path: string;
}

export interface ReviewOptions {
  candidatesDir: string;
  outDir: string;
  classes: string[];
  previewFile: string;
  clean: boolean;
  noOpen: boolean;
}

const DEFAULT_OPTIONS: ReviewOptions = {
  candidatesDir: 'hp-reader/dataset-candidates',
  outDir: 'hp-reader/dataset',
  classes: HP_DATASET_CLASSES.map((entry) => entry.className),
  previewFile: 'training/.hp-character-preview.png',
  clean: false,
  noOpen: process.env.HP_REVIEW_NO_OPEN === '1',
};

const CLASS_BY_ANSWER = new Map<string, string>(
  HP_DATASET_CLASSES.flatMap((entry) => [
    [entry.char, entry.className],
    [entry.className, entry.className],
  ]),
);

export function normalizeReviewLabel(answer: string): string | null {
  return CLASS_BY_ANSWER.get(answer.trim().toLowerCase()) ?? null;
}

export function parseReviewArgs(argv: string[]): ReviewOptions {
  const parsed: ReviewOptions = { ...DEFAULT_OPTIONS, classes: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--clean') {
      parsed.clean = true;
    } else if (arg === '--no-open') {
      parsed.noOpen = true;
    } else if (arg === '--candidates') {
      const value = argv[++i];
      if (!value) throw new Error('--candidates requires a directory');
      parsed.candidatesDir = value;
    } else if (arg === '--out') {
      const value = argv[++i];
      if (!value) throw new Error('--out requires a directory');
      parsed.outDir = value;
    } else if (arg === '--preview') {
      const value = argv[++i];
      if (!value) throw new Error('--preview requires a PNG path');
      parsed.previewFile = value;
    } else if (arg === '--class' || arg === '--classes') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a class`);
      const className = normalizeReviewLabel(value);
      if (!className) throw new Error(`unsupported HP class "${value}"`);
      parsed.classes.push(className);
    } else {
      const className = normalizeReviewLabel(arg);
      if (!className) throw new Error(`unsupported HP class "${arg}"`);
      parsed.classes.push(className);
    }
  }
  if (parsed.classes.length === 0) parsed.classes = [...DEFAULT_OPTIONS.classes];
  parsed.classes = [...new Set(parsed.classes)];
  return parsed;
}

export function listCandidateFiles(candidatesDir: string, classes: string[]): CandidateFile[] {
  const files: CandidateFile[] = [];
  for (const className of [...classes].sort()) {
    const dir = path.join(candidatesDir, className);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter((file) => file.endsWith('.png')).sort()) {
      files.push({ className, path: path.join(dir, name) });
    }
  }
  return files;
}

export function acceptedPathForCandidate(
  candidate: CandidateFile,
  outDir: string,
  acceptedClassName = candidate.className,
): string {
  return path.join(outDir, acceptedClassName, path.basename(candidate.path));
}

export function copyAcceptedCandidate(
  candidate: CandidateFile,
  outDir: string,
  acceptedClassName = candidate.className,
): void {
  const outFile = acceptedPathForCandidate(candidate, outDir, acceptedClassName);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.copyFileSync(candidate.path, outFile);
}

function ensureClassDirs(outDir: string): void {
  for (const entry of HP_DATASET_CLASSES) {
    fs.mkdirSync(path.join(outDir, entry.className), { recursive: true });
  }
}

async function reviewCandidates(options: ReviewOptions): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));

  if (options.clean) fs.rmSync(options.outDir, { recursive: true, force: true });
  ensureClassDirs(options.outDir);
  fs.mkdirSync(path.dirname(options.previewFile), { recursive: true });

  const candidates = listCandidateFiles(options.candidatesDir, options.classes);
  if (candidates.length === 0) {
    console.log(`No candidate PNGs found in ${options.candidatesDir}.`);
    rl.close();
    return;
  }

  let accepted = 0;
  let corrected = 0;
  let skipped = 0;
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    fs.copyFileSync(candidate.path, options.previewFile);
    if (options.noOpen) {
      console.log(`\n${i + 1}/${candidates.length} ${candidate.className}: ${candidate.path}`);
      console.log(`  preview: ${options.previewFile}`);
    } else {
      try {
        execFileSync('open', [options.previewFile]);
      } catch {
        console.log(`  open ${options.previewFile} to view the crop`);
      }
      console.log(`\n${i + 1}/${candidates.length} ${candidate.className}: ${candidate.path}`);
    }

    while (true) {
      const ans = (
        await ask('  Enter=accept, s=skip, q=quit, or type correct label (0-9, /, %): ')
      ).trim();
      const lower = ans.toLowerCase();
      if (lower === 'q') {
        if (fs.existsSync(options.previewFile)) fs.rmSync(options.previewFile);
        rl.close();
        console.log(`Stopped. Accepted ${accepted}, corrected ${corrected}, skipped ${skipped}.`);
        return;
      }
      if (lower === 's') {
        skipped++;
        break;
      }
      const acceptedClassName = ans === '' ? candidate.className : normalizeReviewLabel(ans);
      if (!acceptedClassName) {
        console.log('  Unsupported label. Use 0-9, /, %, slash, or percent.');
        continue;
      }
      copyAcceptedCandidate(candidate, options.outDir, acceptedClassName);
      accepted++;
      if (acceptedClassName !== candidate.className) corrected++;
      break;
    }
  }

  if (fs.existsSync(options.previewFile)) fs.rmSync(options.previewFile);
  rl.close();
  console.log(`Done. Accepted ${accepted}, corrected ${corrected}, skipped ${skipped}.`);
  console.log(`Reviewed dataset written to ${options.outDir}.`);
}

if (require.main === module) {
  reviewCandidates(parseReviewArgs(process.argv.slice(2))).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
