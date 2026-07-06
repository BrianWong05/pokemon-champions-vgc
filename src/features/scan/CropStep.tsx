import React, { useEffect, useRef, useState } from 'react';
import { mapCropToSource } from './cropMath';
import type { TileBox } from './types';

interface CropStepProps {
  blob: Blob;
  onCropped: (blob: Blob) => void;
  onCancel: () => void;
}

type DragMode =
  | { kind: 'move'; startX: number; startY: number; box: TileBox }
  | { kind: 'resize'; corner: 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; box: TileBox };

const HANDLE_SIZE = 40;
const MIN_BOX = 20;

/** Hand-rolled draggable/resizable crop rectangle over the picked image. */
const CropStep: React.FC<CropStepProps> = ({ blob, onCropped, onCancel }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<TileBox | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragMode | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  const handleImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    setDisplaySize({ w, h });
    // Default crop box: right ~40% of the image (opponent column).
    setBox({ x: w * 0.6, y: 0, w: w * 0.4, h });
  };

  const clampBox = (b: TileBox): TileBox => {
    if (!displaySize) return b;
    const w = Math.min(Math.max(b.w, MIN_BOX), displaySize.w);
    const h = Math.min(Math.max(b.h, MIN_BOX), displaySize.h);
    const x = Math.min(Math.max(b.x, 0), displaySize.w - w);
    const y = Math.min(Math.max(b.y, 0), displaySize.h - h);
    return { x, y, w, h };
  };

  const onMovePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!box) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { kind: 'move', startX: e.clientX, startY: e.clientY, box };
  };

  const onHandlePointerDown = (corner: 'nw' | 'ne' | 'sw' | 'se') => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!box) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { kind: 'resize', corner, startX: e.clientX, startY: e.clientY, box };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (drag.kind === 'move') {
      setBox(clampBox({ ...drag.box, x: drag.box.x + dx, y: drag.box.y + dy }));
      return;
    }

    const { corner, box: startBox } = drag;
    let { x, y, w, h } = startBox;
    if (corner === 'nw') { x = startBox.x + dx; y = startBox.y + dy; w = startBox.w - dx; h = startBox.h - dy; }
    else if (corner === 'ne') { y = startBox.y + dy; w = startBox.w + dx; h = startBox.h - dy; }
    else if (corner === 'sw') { x = startBox.x + dx; w = startBox.w - dx; h = startBox.h + dy; }
    else { w = startBox.w + dx; h = startBox.h + dy; }
    setBox(clampBox({ x, y, w, h }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) e.currentTarget.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const useCrop = () => {
    const img = imgRef.current;
    if (!img || !box || !displaySize) return;
    const natural = { w: img.naturalWidth, h: img.naturalHeight };
    const source = mapCropToSource(box, displaySize, natural);
    if (source.w <= 0 || source.h <= 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = source.w;
    canvas.height = source.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, source.x, source.y, source.w, source.h, 0, 0, source.w, source.h);
    canvas.toBlob((b) => { if (b) onCropped(b); }, 'image/png');
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    touchAction: 'none',
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-2">Drag to frame the opponent's column, then confirm.</p>
      <div
        className="relative select-none touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {url && (
          <img
            ref={imgRef}
            src={url}
            onLoad={handleImgLoad}
            alt="Picked screenshot"
            className="max-w-full block"
            draggable={false}
          />
        )}
        {box && (
          <div
            className="absolute border-2 border-accent bg-accent-soft cursor-move touch-none"
            style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
            onPointerDown={onMovePointerDown}
          >
            <div
              style={{ ...handleStyle, left: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, cursor: 'nwse-resize' }}
              onPointerDown={onHandlePointerDown('nw')}
            />
            <div
              style={{ ...handleStyle, right: -HANDLE_SIZE / 2, top: -HANDLE_SIZE / 2, cursor: 'nesw-resize' }}
              onPointerDown={onHandlePointerDown('ne')}
            />
            <div
              style={{ ...handleStyle, left: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2, cursor: 'nesw-resize' }}
              onPointerDown={onHandlePointerDown('sw')}
            />
            <div
              style={{ ...handleStyle, right: -HANDLE_SIZE / 2, bottom: -HANDLE_SIZE / 2, cursor: 'nwse-resize' }}
              onPointerDown={onHandlePointerDown('se')}
            />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <button className="px-4 py-2 rounded border border-line-2 text-ink-2 hover:bg-raise" onClick={onCancel}>Cancel</button>
        <button className="px-4 py-2 rounded bg-accent text-accent-ink hover:bg-accent-hover transition-colors" onClick={useCrop} disabled={!box}>
          Use crop
        </button>
      </div>
    </div>
  );
};

export default CropStep;
