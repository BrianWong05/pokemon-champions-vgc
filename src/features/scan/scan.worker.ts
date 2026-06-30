import { scanTeamImage } from './scanImage';
import type { RgbaImage, ReferenceEntry } from './types';

export interface ScanRequest { image: RgbaImage; refs: ReferenceEntry[]; topN: number }

self.onmessage = (e: MessageEvent<ScanRequest>) => {
  const { image, refs, topN } = e.data;
  try {
    (self as unknown as Worker).postMessage({ ok: true, slots: scanTeamImage(image, refs, topN) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ ok: false, error: (err as Error).message });
  }
};
