import type { TileBox } from './types';

export interface Size { w: number; h: number }

export type SpriteAnchor = 'left' | 'right';

/**
 * Square sprite region of a team-preview card. Measured from real screenshots:
 * the mini-sprite can be ~1.25-1.6x wider than the card is tall, sits inset at
 * the LEFT end of opponent cards, and hugs/overflows the RIGHT edge of player
 * cards — so the right anchor overshoots the tile edge by a quarter side.
 */
export function spriteBoxFromTile(tile: TileBox, bounds: Size, anchor: SpriteAnchor = 'left'): TileBox {
  const side = Math.round(tile.h * 1.6);
  let x = anchor === 'left' ? tile.x : tile.x + tile.w - side + Math.round(side * 0.25);
  let y = tile.y - Math.round((side - tile.h) / 2);
  x = Math.max(0, Math.min(x, bounds.w - 1));
  y = Math.max(0, Math.min(y, bounds.h - 1));
  return {
    x,
    y,
    w: Math.max(1, Math.min(side, bounds.w - x)),
    h: Math.max(1, Math.min(side, bounds.h - y)),
  };
}

/**
 * Scales a crop rectangle expressed in displayed-image coordinates to
 * source-pixel coordinates, then clamps it to the source image bounds.
 */
export function mapCropToSource(crop: TileBox, display: Size, natural: Size): TileBox {
  const scaleX = natural.w / display.w;
  const scaleY = natural.h / display.h;

  let x = crop.x * scaleX;
  let y = crop.y * scaleY;
  let w = crop.w * scaleX;
  let h = crop.h * scaleY;

  // Clamp top-left into bounds first.
  x = Math.max(0, Math.min(x, natural.w));
  y = Math.max(0, Math.min(y, natural.h));
  // Clamp size so the box never extends past the image.
  w = Math.max(0, Math.min(w, natural.w - x));
  h = Math.max(0, Math.min(h, natural.h - y));

  return { x, y, w, h };
}
