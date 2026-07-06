import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./capture', () => ({ pickImage: vi.fn(), takePhoto: vi.fn() }));
import { pickImage, takePhoto } from './capture';
import { filePickerSource, cameraSource } from './captureSource';

const mockPick = pickImage as unknown as ReturnType<typeof vi.fn>;
const mockTake = takePhoto as unknown as ReturnType<typeof vi.fn>;

describe('filePickerSource', () => {
  beforeEach(() => mockPick.mockReset());

  it('reports its kind and availability', async () => {
    expect(filePickerSource.kind).toBe('file');
    expect(await filePickerSource.isAvailable()).toBe(true);
  });

  it('wraps a picked blob into a CapturedFrame', async () => {
    const blob = new Blob(['x']);
    mockPick.mockResolvedValue(blob);
    const frame = await filePickerSource.capture();
    expect(frame).not.toBeNull();
    expect(frame!.blob).toBe(blob);
    expect(frame!.sourceKind).toBe('file');
    expect(typeof frame!.capturedAt).toBe('number');
  });

  it('returns null when the pick is cancelled', async () => {
    mockPick.mockResolvedValue(null);
    expect(await filePickerSource.capture()).toBeNull();
  });
});

describe('cameraSource', () => {
  beforeEach(() => mockTake.mockReset());

  it('reports its kind and availability', async () => {
    expect(cameraSource.kind).toBe('camera');
    expect(await cameraSource.isAvailable()).toBe(true);
  });

  it('wraps a photo blob into a CapturedFrame', async () => {
    const blob = new Blob(['x']);
    mockTake.mockResolvedValue(blob);
    const frame = await cameraSource.capture();
    expect(frame).not.toBeNull();
    expect(frame!.blob).toBe(blob);
    expect(frame!.sourceKind).toBe('camera');
    expect(typeof frame!.capturedAt).toBe('number');
  });

  it('returns null when the camera is cancelled', async () => {
    mockTake.mockResolvedValue(null);
    expect(await cameraSource.capture()).toBeNull();
  });
});
