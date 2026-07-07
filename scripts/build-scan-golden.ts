// scripts/build-scan-golden.ts
// Regenerates training/scan-golden.json: the reviewed draft's 16 single-plate
// frames (truth fields only), 4 native 2v2 frames from the HP golden, and 5
// team-select frames as mode-regression guards.
// Run: npx tsx scripts/build-scan-golden.ts
import * as fs from 'fs';

interface DraftEntry { file: string; mode: 'battle' | 'team'; opponentPlates: number; playerPlates: number }

const draft = JSON.parse(fs.readFileSync('training/scan-golden.draft.json', 'utf8')) as { entries: DraftEntry[] };
const hp = JSON.parse(fs.readFileSync('training/hp-golden.json', 'utf8')) as Record<string, { opponent: string[]; player: string[] }>;

const PAIR_FRAMES = [
  'Xnip2026-07-01_03-26-01.png',
  'Xnip2026-07-01_19-38-20.png',
  'Xnip2026-07-01_05-34-16.png',
  'Xnip2026-07-01_18-08-40.png',
];
// 5 frames: 04-17-17, 00-32-20, and 00-28-40 are 2026-07-07 regression guards for
// the crimson-clipped-card + sprite-spread-outlier bug (04-17-17 = cropped stream
// capture with facecam and off-column sprite; 00-32-20 = mid-selection, 0 player
// cards; 00-28-40 = portrait sibling). 00-27-35 and 00-32-38 are untracked local-only
// (not force-added; same as pair frames). The 3 force-added pngs are under
// training/screenshots/ via git add -f; total added size ~3.7MB, well under budget.
const TEAM_FRAMES = [
  'Xnip2026-04-23_00-27-35.png',
  'Xnip2026-04-23_00-32-38.png',
  'Xnip2026-04-23_04-17-17.png',
  'Xnip2026-04-23_00-32-20.png',
  'Xnip2026-04-23_00-28-40.png',
];

// Frames excluded from the zero-wrong-modes floor (still reported by the CLI).
// Keyed by golden key (jpg sources use the `_jpg.png` form). Keep the reason
// one line — a knownMiss on a human-readable frame is a last resort.
const KNOWN_MISS: Record<string, string> = {
};

const entries = [
  ...draft.entries.map((e) => {
    // jpg sources are keyed by their converted name, per resolveGoldenPng
    const file = e.file.replace(/\.jpe?g$/i, '_jpg.png');
    return {
      file,
      mode: e.mode,
      opponentPlates: e.opponentPlates,
      playerPlates: e.playerPlates,
      ...(KNOWN_MISS[file] ? { knownMiss: KNOWN_MISS[file] } : {}),
    };
  }),
  ...PAIR_FRAMES.map((f) => ({
    file: f, mode: 'battle' as const,
    opponentPlates: hp[f].opponent.length, playerPlates: hp[f].player.length,
  })),
  ...TEAM_FRAMES.map((f) => ({ file: f, mode: 'team' as const, opponentPlates: 0, playerPlates: 0 })),
];
fs.writeFileSync('training/scan-golden.json', JSON.stringify({ entries }, null, 2) + '\n');
console.log(`wrote ${entries.length} entries`);
