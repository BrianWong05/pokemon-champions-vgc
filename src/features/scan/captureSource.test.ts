import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./capture', () => ({ pickImage: vi.fn() }));
import { pickImage } from './capture';
import { filePickerSource } from './captureSource';

const mockPick = pickImage as unknown as ReturnType<typeof vi.fn>;

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
