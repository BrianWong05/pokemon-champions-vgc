import { pickImage } from './capture';

export type CaptureSourceKind = 'file' | 'mediaProjection' | 'camera';

export interface CapturedFrame {
  blob: Blob;
  sourceKind: CaptureSourceKind;
  capturedAt: number;
}

export interface CaptureSource {
  readonly kind: CaptureSourceKind;
  isAvailable(): Promise<boolean>;
  /** Resolves to a frame, or null if the user cancelled. */
  capture(): Promise<CapturedFrame | null>;
}

export const filePickerSource: CaptureSource = {
  kind: 'file',
  isAvailable: async () => true,
  async capture() {
    const blob = await pickImage();
    if (!blob) return null;
    return { blob, sourceKind: 'file', capturedAt: Date.now() };
  },
};
