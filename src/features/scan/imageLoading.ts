import type { RgbaImage } from './types';

export async function blobToRgbaImage(blob: Blob): Promise<RgbaImage> {
  // Decode via an <img> element rather than createImageBitmap: Safari/WebKit
  // rejects some blobs from createImageBitmap with "The string did not match the
  // expected pattern", and the <img> path works across browsers.
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode the selected image'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { data, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}
