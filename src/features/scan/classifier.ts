// src/features/scan/classifier.ts
import * as ort from 'onnxruntime-web';
import type { Candidate, RgbaImage } from './types';

export function softmax(logits: Float32Array | number[]): number[] {
  const max = Math.max(...Array.from(logits));
  const exps = Array.from(logits, (v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

// Resizes (bilinear) and converts to CHW float32 0..1 RGB, alpha-composited over
// an opaque background (transparent pixels contribute their raw RGB values).
export function resizeBilinearRgb(img: RgbaImage, size: number): Float32Array {
  const out = new Float32Array(3 * size * size);
  const plane = size * size;
  const scaleX = img.width / size;
  const scaleY = img.height / size;

  for (let y = 0; y < size; y++) {
    const sy = (y + 0.5) * scaleY - 0.5;
    const y0 = Math.max(0, Math.min(img.height - 1, Math.floor(sy)));
    const y1 = Math.max(0, Math.min(img.height - 1, y0 + 1));
    const fy = Math.max(0, Math.min(1, sy - y0));

    for (let x = 0; x < size; x++) {
      const sx = (x + 0.5) * scaleX - 0.5;
      const x0 = Math.max(0, Math.min(img.width - 1, Math.floor(sx)));
      const x1 = Math.max(0, Math.min(img.width - 1, x0 + 1));
      const fx = Math.max(0, Math.min(1, sx - x0));

      const i00 = (y0 * img.width + x0) * 4;
      const i10 = (y0 * img.width + x1) * 4;
      const i01 = (y1 * img.width + x0) * 4;
      const i11 = (y1 * img.width + x1) * 4;

      const outIdx = y * size + x;
      for (let c = 0; c < 3; c++) {
        const v00 = img.data[i00 + c];
        const v10 = img.data[i10 + c];
        const v01 = img.data[i01 + c];
        const v11 = img.data[i11 + c];
        const top = v00 + (v10 - v00) * fx;
        const bottom = v01 + (v11 - v01) * fx;
        const v = top + (bottom - top) * fy;
        out[c * plane + outIdx] = v / 255;
      }
    }
  }
  return out;
}

export function topCandidates(
  probs: number[],
  classes: number[],
  legalIds: Set<number>,
  topN: number,
): Candidate[] {
  const masked = probs.map((p, i) => ({ id: classes[i], score: legalIds.has(classes[i]) ? p : 0 }));
  masked.sort((a, b) => b.score - a.score);
  return masked.slice(0, topN);
}

export interface Classifier {
  classes: number[];
  classify(img: RgbaImage, legalIds: Set<number>, topN?: number): Promise<Candidate[]>;
}

const INPUT_SIZE = 224;
let cached: Promise<Classifier | null> | null = null;

async function loadClassifierUncached(baseUrl: string): Promise<Classifier | null> {
  const classesRes = await fetch(`${baseUrl}models/pokemon-sprite-net/classes.json`);
  if (!classesRes.ok) throw new Error(`classes.json not found (HTTP ${classesRes.status})`);
  const classes: number[] = await classesRes.json();

  // Fully-qualified URL: Vite's dev-server import analysis injects "?import" into
  // root-relative dynamic imports (breaking ORT's runtime .mjs load), but leaves
  // absolute http(s) URLs untouched. Also correct in production and in the
  // Capacitor WebView (both serve from their own origin).
  ort.env.wasm.wasmPaths = new URL(`${baseUrl}ort/`, window.location.origin).href;
  ort.env.wasm.numThreads = 1;

  const session = await ort.InferenceSession.create(`${baseUrl}models/pokemon-sprite-net/model.onnx`);

  console.log('[scan] classifier ready (' + classes.length + ' classes)');

  return {
    classes,
    async classify(img: RgbaImage, legalIds: Set<number>, topN = 3): Promise<Candidate[]> {
      const chw = resizeBilinearRgb(img, INPUT_SIZE);
      const tensor = new ort.Tensor('float32', chw, [1, 3, INPUT_SIZE, INPUT_SIZE]);
      const outputs = await session.run({ input: tensor });
      const logits = outputs.logits.data as Float32Array;
      const probs = softmax(logits);
      return topCandidates(probs, classes, legalIds, topN);
    },
  };
}

export function loadClassifier(baseUrl: string = import.meta.env.BASE_URL): Promise<Classifier | null> {
  if (!cached) {
    cached = loadClassifierUncached(baseUrl).catch((err) => {
      console.warn('[scan] classifier unavailable, using descriptors', err);
      cached = null;
      return null;
    });
  }
  return cached;
}
