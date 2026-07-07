// src/features/scan/segmentation.test.ts
import { describe, it, expect } from 'vitest';
import {
  isRedPixel,
  connectedComponents,
  detectOpponentTiles,
  detectPlayerTiles,
  detectOpponentSpriteBoxes,
  detectPlayerSpriteBoxes,
  refineSpritePanelBox,
  cropImage,
} from './segmentation';
import type { RgbaImage } from './types';

function blank(w: number, h: number): RgbaImage {
  return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
}
function fillRect(img: RgbaImage, x0: number, y0: number, w: number, h: number, r: number, g: number, b: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const i = (y * img.width + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
}

describe('isRedPixel', () => {
  it('accepts saturated red, rejects blue and gray', () => {
    expect(isRedPixel(220, 30, 40)).toBe(true);
    expect(isRedPixel(30, 40, 220)).toBe(false);
    expect(isRedPixel(120, 120, 120)).toBe(false);
  });
});

describe('connectedComponents', () => {
  it('finds two separate blobs', () => {
    const w = 20, h = 10, mask = new Uint8Array(w * h);
    mask[0] = 1; mask[1] = 1; mask[w] = 1;        // blob A near origin
    mask[15] = 1; mask[16] = 1;                    // blob B
    const boxes = connectedComponents(mask, w, h, 1);
    expect(boxes.length).toBe(2);
  });
});

describe('detectOpponentTiles', () => {
  it('detects 6 red tiles stacked on the right side', () => {
    const img = blank(400, 600);
    for (let k = 0; k < 6; k++) fillRect(img, 300, 20 + k * 95, 80, 70, 220, 30, 40);
    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    // returned top-to-bottom
    for (let k = 1; k < boxes.length; k++) expect(boxes[k].y).toBeGreaterThan(boxes[k - 1].y);
  });

  it('merges fragmented selection panels into full opponent tile crops', () => {
    const img = blank(1200, 700);
    fillRect(img, 980, 40, 180, 35, 210, 45, 120); // opponent name banner
    fillRect(img, 980, 590, 180, 45, 210, 45, 120); // waiting button
    for (let k = 0; k < 6; k++) {
      const y = 80 + k * 82;
      fillRect(img, 960, y, 200, 72, 180, 18, 85);
      fillRect(img, 1010, y + 8, 70, 56, 10, 10, 10); // sprite cuts through panel mask
      fillRect(img, 1105, y + 10, 36, 36, 40, 160, 220); // type icon cuts through panel mask
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    boxes.forEach((box, index) => {
      expect(box.x).toBeLessThanOrEqual(960);
      expect(box.x + box.w).toBeGreaterThanOrEqual(1160);
      expect(box.y).toBeGreaterThanOrEqual(78 + index * 82);
      expect(box.y).toBeLessThanOrEqual(82 + index * 82);
      expect(box.h).toBeGreaterThanOrEqual(70);
    });
  });

  it('prefers the narrower right opponent column over wider left player panels', () => {
    const img = blank(1254, 700);
    for (let k = 0; k < 6; k++) {
      const y = 110 + k * 80;
      fillRect(img, 60, y, 410, 60, 118, 62, 205); // player panels on the left
      fillRect(img, 1005, y, 190, 58, 175, 12, 82); // opponent panels on the right
      fillRect(img, 1125, y + 8, 48, 36, 60, 170, 220); // type icons
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    boxes.forEach((box) => {
      expect(box.x).toBeGreaterThan(950);
    });
  });

  it('handles screenshots cropped to just the opponent column', () => {
    const img = blank(430, 1024);
    fillRect(img, 40, 25, 360, 60, 210, 45, 120); // opponent name banner
    for (let k = 0; k < 6; k++) {
      const y = 100 + k * 152;
      fillRect(img, 40, y, 360, 140, 165, 12, 78);
      fillRect(img, 145, y + 24, 90, 90, 10, 10, 10);
      fillRect(img, 300, y + 22, 70, 70, 30, 170, 220);
      fillRect(img, 372, y + 22, 40, 70, 180, 50, 210); // right-side type icon strip
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    boxes.forEach((box) => {
      expect(box.x).toBeLessThan(80);
      expect(box.w).toBeGreaterThan(320);
    });
    expect(boxes[0].y).toBeGreaterThanOrEqual(96);
    expect(boxes[5].y).toBeGreaterThanOrEqual(855);
  });

  it('does not treat lower-right battle move buttons as opponent selection tiles', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 4; k++) {
      fillRect(img, 870, 360 + k * 80, 300, 55, 120, 24, 190);
      fillRect(img, 1080, 368 + k * 80, 72, 40, 35, 20, 55);
    }

    expect(detectOpponentTiles(img)).toEqual([]);
  });

  it('detects opponent tiles inside a larger browser screenshot', () => {
    const img = blank(3200, 2100);
    fillRect(img, 0, 0, 3200, 260, 16, 16, 16); // browser chrome
    fillRect(img, 2360, 490, 360, 70, 210, 45, 120); // opponent name banner
    for (let k = 0; k < 6; k++) {
      const y = 565 + k * 160;
      fillRect(img, 2380, y, 260, 145, 165, 12, 78);
      fillRect(img, 2455, y + 26, 95, 92, 20, 20, 20);
      fillRect(img, 2660, y + 24, 70, 70, 180, 50, 210);
    }

    const boxes = detectOpponentTiles(img);
    expect(boxes.length).toBe(6);
    expect(boxes[0].x).toBeLessThanOrEqual(2380);
    expect(boxes[0].x + boxes[0].w).toBeGreaterThanOrEqual(2635);
    expect(boxes[0].y).toBeGreaterThanOrEqual(560);
    expect(boxes[5].y).toBeGreaterThanOrEqual(1360);
  });
});

describe('detectPlayerTiles', () => {
  it('detects 6 purple tiles stacked on the left side', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 40, 60 + k * 95, 260, 72, 90, 60, 200);
    const boxes = detectPlayerTiles(img);
    expect(boxes.length).toBe(6);
    for (let k = 1; k < boxes.length; k++) expect(boxes[k].y).toBeGreaterThan(boxes[k - 1].y);
  });

  it('ignores red opponent tiles on the right', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    expect(detectPlayerTiles(img).length).toBe(0);
  });

  it('detects the lime highlighted card among purple ones', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) {
      // card 3 is under the cursor (bright lime), others purple
      if (k === 3) fillRect(img, 40, 60 + k * 95, 260, 72, 170, 220, 40);
      else fillRect(img, 40, 60 + k * 95, 260, 72, 90, 60, 200);
    }
    expect(detectPlayerTiles(img).length).toBe(6);
  });

  it('detects locked-in white cards via their lime stripe (standing-by state)', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) {
      const y = 60 + k * 95;
      if (k < 4) {
        // selected: white card with a wide lime diagonal-ish band
        fillRect(img, 40, y, 260, 72, 245, 245, 245);
        fillRect(img, 120, y, 110, 72, 170, 220, 40);
      } else {
        fillRect(img, 40, y, 260, 72, 90, 60, 200);
      }
    }
    expect(detectPlayerTiles(img).length).toBe(6);
  });
});

describe('refineSpriteBox (via sprite box helpers)', () => {
  it('centers the crop on the sprite content inside the card', () => {
    const img = blank(1200, 700);
    // 6 red cards; a blue "sprite" inset 40px from the left edge of each card
    for (let k = 0; k < 6; k++) {
      const y = 60 + k * 95;
      fillRect(img, 900, y, 260, 72, 220, 30, 40);
      fillRect(img, 940, y + 8, 80, 58, 60, 120, 220);
    }
    const boxes = detectOpponentSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    for (const b of boxes) {
      // square 1.35x tile height, centered on the sprite (center x = 980)
      expect(b.w).toBe(97);
      expect(Math.abs(b.x + b.w / 2 - 980)).toBeLessThanOrEqual(3);
    }
  });

  it('picks the sprite, not the type-icon cluster at the right end', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) {
      const y = 60 + k * 95;
      fillRect(img, 40, y, 300, 80, 90, 60, 200);        // player card
      fillRect(img, 100, y + 8, 70, 64, 200, 150, 60);   // sprite (left-of-center)
      fillRect(img, 270, y + 8, 28, 28, 230, 80, 60);    // type icon 1
      fillRect(img, 304, y + 8, 28, 28, 240, 200, 60);   // type icon 2
      fillRect(img, 285, y + 48, 24, 24, 220, 60, 90);   // gender badge below icons
    }
    const boxes = detectPlayerSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    for (const b of boxes) {
      // centered on the sprite (center x = 135), not the icons (~290)
      expect(Math.abs(b.x + b.w / 2 - 135)).toBeLessThanOrEqual(6);
    }
  });

  it('falls back to the anchor box when the card has no distinct content', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    const boxes = detectOpponentSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    for (const b of boxes) expect(b.w).toBe(Math.round(72 * 1.6)); // spriteBoxFromTile side
  });
});

describe('sprite box helpers', () => {
  it('opponent sprite boxes are square and left-anchored on the tile', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 900, 60 + k * 95, 260, 72, 220, 30, 40);
    const boxes = detectOpponentSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    for (const b of boxes) expect(Math.abs(b.w - b.h)).toBeLessThanOrEqual(1);
  });

  it('player sprite boxes are square and right-anchored on the tile', () => {
    const img = blank(1200, 700);
    for (let k = 0; k < 6; k++) fillRect(img, 40, 60 + k * 95, 260, 72, 90, 60, 200);
    const boxes = detectPlayerSpriteBoxes(img);
    expect(boxes.length).toBe(6);
    // right-anchored: box right edge near the tile right edge (x=300)
    for (const b of boxes) expect(b.x + b.w).toBeGreaterThan(280);
  });
});

describe('cropImage', () => {
  it('extracts the requested sub-rectangle', () => {
    const img = blank(10, 10);
    fillRect(img, 2, 3, 4, 4, 1, 2, 3);
    const c = cropImage(img, { x: 2, y: 3, w: 4, h: 4 });
    expect(c.width).toBe(4); expect(c.height).toBe(4);
    expect([c.data[0], c.data[1], c.data[2]]).toEqual([1, 2, 3]);
  });
});

describe('refineSpritePanelBox', () => {
  const PANEL: [number, number, number] = [169, 151, 207];
  const isBg = (r: number, g: number, b: number) => r === PANEL[0] && g === PANEL[1] && b === PANEL[2];
  const panel = { x: 0, y: 0, w: 480, h: 124 };

  // Sprite whose left flank is sparse (few content rows per column over the
  // full search window) but solid within the sprite's own row band — the
  // zh-team17-moves Annihilape shape that clipped to a 21px sliver.
  function paintSparseFlankSprite(img: RgbaImage) {
    fillRect(img, 0, 0, img.width, img.height, ...PANEL);
    // dense core: columns 34..46, rows 10..46
    fillRect(img, 34, 10, 13, 36, 240, 240, 240);
    // sparse flank: columns 14..33 carry content only inside the sprite band
    // (8 of 36 rows ≈ 22% of the band but only ~11% of the 74-row window)
    fillRect(img, 14, 20, 20, 8, 240, 240, 240);
  }

  it('rescues a sliver pick by re-measuring density over the sprite row band', () => {
    const img = blank(480, 124);
    paintSparseFlankSprite(img);
    const box = refineSpritePanelBox(img, panel, { x: 0, y: 0, w: 60, h: 60 }, isBg);
    // without the rescue pass the box starts at the dense core (x≈30 after pad)
    expect(box.x).toBeLessThan(20);       // flank recovered
    expect(box.x + box.w).toBeGreaterThan(46); // core still included
  });

  it('leaves a normal sprite-sized pick untouched by the rescue guard', () => {
    const img = blank(480, 124);
    fillRect(img, 0, 0, img.width, img.height, ...PANEL);
    fillRect(img, 14, 10, 34, 36, 240, 240, 240); // solid square-ish sprite
    // banner glyphs inside the sprite row band: narrow fragments separated by
    // gaps wider than the run-bridging (must not be grabbed)
    for (let gx = 100; gx < 140; gx += 11) fillRect(img, gx, 12, 6, 30, 250, 250, 250);
    const box = refineSpritePanelBox(img, panel, { x: 0, y: 0, w: 60, h: 60 }, isBg);
    expect(box.x + box.w).toBeLessThan(60); // never bridges into the banner
  });
});
