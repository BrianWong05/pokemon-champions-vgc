export interface RgbaImage { data: Uint8ClampedArray; width: number; height: number }
export interface TileBox { x: number; y: number; w: number; h: number }
export interface Descriptor { dhash: string; rgb16: number[]; sil8: number[]; edge8: number[] }
export interface ReferenceEntry { id: number; desc: Descriptor }
export interface Candidate { id: number; score: number }
export interface SlotResult { box: TileBox; candidates: Candidate[] }
