import type { TileBox } from './types';

export type PlayerScreenKind = 'moves' | 'stats';
export type ScanLang = 'en' | 'ja' | 'zh-Hant' | 'zh-Hans';

export interface StatCellRegions { label: TileBox; stat: TileBox; sp: TileBox }

export interface PanelRegions {
  panel: TileBox;
  sprite: TileBox;
  /** moves screen only */
  abilityText?: TileBox;
  itemText?: TileBox;
  moveTexts?: TileBox[];           // length 4, top to bottom
  /** stats screen only — canonical order [hp, atk, def, spa, spd, spe] */
  statCells?: StatCellRegions[];
}

export interface PlayerFrameDetection {
  kind: PlayerScreenKind;
  panels: PanelRegions[];          // length 6, slot order (row-major)
}
