/**
 * Split HP debug glyph images into per-character crops.
 *
 * Usage:
 *   npx tsx scripts/debug-hp-glyph-crops.ts training/.hp-debug/Xnip2026-07-04_00-43-26
 *   npx tsx scripts/debug-hp-glyph-crops.ts Xnip2026-07-04_00-43-26.jpg
 *
 * This consumes read-hp --debug output only. It does not update the HP dataset,
 * golden labels, or glyph templates.
 */
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as path from 'path';

type Box = { x: number; y: number; w: number; h: number };

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log([
    'Usage:',
    '  npx tsx scripts/debug-hp-glyph-crops.ts <debug-dir-or-screenshot-name> [...]',
    '',
    'Examples:',
    '  npx tsx scripts/debug-hp-glyph-crops.ts training/.hp-debug/Xnip2026-07-04_00-43-26',
    '  npx tsx scripts/debug-hp-glyph-crops.ts Xnip2026-07-04_00-43-26.jpg',
  ].join('\n'));
  process.exit(args.length === 0 ? 1 : 0);
}

function readPng(file: string): PNG {
  return PNG.sync.read(fs.readFileSync(file));
}

function writePng(png: PNG, file: string): void {
  fs.writeFileSync(file, PNG.sync.write(png));
}

function isDebugRed(data: Buffer, i: number): boolean {
  return data[i] > 200 && data[i + 1] < 110 && data[i + 2] < 110 && data[i + 3] > 0;
}

function isGlyphWhite(data: Buffer, i: number): boolean {
  return data[i] > 180 && data[i + 1] > 180 && data[i + 2] > 180 && data[i + 3] > 0;
}

function resolveDebugDir(input: string): string {
  const direct = path.resolve(input);
  if (fs.existsSync(direct) && fs.statSync(direct).isDirectory()) return direct;

  const base = path.basename(input, path.extname(input));
  const debugDir = path.resolve('training/.hp-debug', base);
  if (fs.existsSync(debugDir) && fs.statSync(debugDir).isDirectory()) return debugDir;

  return direct;
}

function findDebugBoxes(png: PNG): Box[] {
  const red = new Uint8Array(png.width * png.height);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (isDebugRed(png.data, i)) red[y * png.width + x] = 1;
    }
  }

  const seen = new Uint8Array(red.length);
  const boxes: Box[] = [];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const start = y * png.width + x;
      if (!red[start] || seen[start]) continue;

      const queue = [start];
      seen[start] = 1;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;

      for (let qi = 0; qi < queue.length; qi++) {
        const current = queue[qi];
        const cx = current % png.width;
        const cy = Math.floor(current / png.width);
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
          const next = ny * png.width + nx;
          if (red[next] && !seen[next]) {
            seen[next] = 1;
            queue.push(next);
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      if (w >= 3 && h >= 3) boxes.push({ x: minX, y: minY, w, h });
    }
  }

  return boxes.sort((a, b) => a.x - b.x || a.y - b.y);
}

function cropGlyph(png: PNG, box: Box): PNG {
  const pad = 2;
  const x0 = Math.max(0, box.x - pad);
  const y0 = Math.max(0, box.y - pad);
  const x1 = Math.min(png.width, box.x + box.w + pad);
  const y1 = Math.min(png.height, box.y + box.h + pad);
  const crop = new PNG({ width: x1 - x0, height: y1 - y0 });

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const src = (y * png.width + x) * 4;
      const dst = ((y - y0) * crop.width + (x - x0)) * 4;
      const white = isGlyphWhite(png.data, src);
      crop.data[dst] = white ? 255 : 0;
      crop.data[dst + 1] = white ? 255 : 0;
      crop.data[dst + 2] = white ? 255 : 0;
      crop.data[dst + 3] = 255;
    }
  }

  return crop;
}

function writeContactSheet(outDir: string, cropFiles: string[]): void {
  if (cropFiles.length === 0) return;

  const grouped = new Map<string, string[]>();
  for (const file of cropFiles) {
    const group = file.replace(/-\d+\.png$/, '');
    grouped.set(group, [...(grouped.get(group) ?? []), file]);
  }

  const groups = [...grouped.keys()].sort();
  const filesByGroup = groups.map((group) => (grouped.get(group) ?? []).sort());
  const cols = Math.max(...filesByGroup.map((files) => files.length));
  const cellW = 30;
  const cellH = 42;
  const gap = 4;
  const pad = 4;
  const sheet = new PNG({
    width: pad * 2 + cols * cellW + Math.max(0, cols - 1) * gap,
    height: pad * 2 + groups.length * cellH + Math.max(0, groups.length - 1) * gap,
  });

  for (let i = 0; i < sheet.data.length; i += 4) sheet.data[i + 3] = 255;

  for (let row = 0; row < filesByGroup.length; row++) {
    for (let col = 0; col < filesByGroup[row].length; col++) {
      const crop = readPng(path.join(outDir, filesByGroup[row][col]));
      const x0 = pad + col * (cellW + gap) + Math.floor((cellW - crop.width) / 2);
      const y0 = pad + row * (cellH + gap) + Math.floor((cellH - crop.height) / 2);
      for (let y = 0; y < crop.height; y++) {
        for (let x = 0; x < crop.width; x++) {
          const src = (y * crop.width + x) * 4;
          const dst = ((y0 + y) * sheet.width + (x0 + x)) * 4;
          sheet.data[dst] = crop.data[src];
          sheet.data[dst + 1] = crop.data[src + 1];
          sheet.data[dst + 2] = crop.data[src + 2];
          sheet.data[dst + 3] = 255;
        }
      }
    }
  }

  writePng(sheet, path.join(outDir, 'sheet.png'));
}

for (const input of args) {
  const dir = resolveDebugDir(input);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.log(`${input}\n  debug directory not found: ${dir}`);
    continue;
  }

  const glyphFiles = fs.readdirSync(dir).filter((file) => file.endsWith('-glyphs.png')).sort();
  if (glyphFiles.length === 0) {
    console.log(`${input}\n  no *-glyphs.png files found in ${dir}`);
    continue;
  }

  const outDir = path.join(dir, 'char-crops');
  fs.mkdirSync(outDir, { recursive: true });
  const manifest: Record<string, Box[]> = {};
  const cropFiles: string[] = [];

  for (const glyphFile of glyphFiles) {
    const sourceName = glyphFile.replace(/-glyphs\.png$/, '');
    const png = readPng(path.join(dir, glyphFile));
    const boxes = findDebugBoxes(png);
    manifest[sourceName] = boxes;

    boxes.forEach((box, index) => {
      const crop = cropGlyph(png, box);
      const outName = `${sourceName}-${String(index).padStart(2, '0')}.png`;
      writePng(crop, path.join(outDir, outName));
      cropFiles.push(outName);
    });
  }

  fs.writeFileSync(path.join(outDir, 'boxes.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeContactSheet(outDir, cropFiles);
  console.log(`${input}\n  wrote ${cropFiles.length} crop(s) -> ${path.relative(process.cwd(), outDir)}`);
  if (cropFiles.length > 0) console.log(`  sheet -> ${path.relative(process.cwd(), path.join(outDir, 'sheet.png'))}`);
}
