import { useCallback, useMemo, useRef, useState } from 'react';
import { scanPlayerImage, rescanMovesPanelText, PLAYER_SCAN_DEPS, type PlayerFrameScan, type PlayerScanDeps, type MovesPanelRead } from './scanPlayerFrame';
import { detectPlayerPanels } from './playerPanels';
import { mergePlayerScan, type MergedPlayerScan } from './mergePlayerScan';
import { blobToRgbaImage } from './imageLoading';
import { loadPlayerScanVocab, type PlayerScanVocab } from '@/db/repositories/scan.repo';
import type { PlayerScreenKind } from './playerTypes';
import type { RgbaImage } from './types';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';

export type PlayerImageStatus = 'idle' | 'scanning' | 'done' | 'error';
export interface PlayerImageState {
  status: PlayerImageStatus;
  error: string | null;
  blob: Blob | null; // kept for crop-and-retry
}
const IDLE_IMAGE: PlayerImageState = { status: 'idle', error: null, blob: null };

export interface PlayerTeamScanDeps {
  blobToRgbaImage(blob: Blob): Promise<RgbaImage>;
  loadVocab(): Promise<PlayerScanVocab>;
  scan: typeof scanPlayerImage;
  scanDeps: PlayerScanDeps;
  detect: typeof detectPlayerPanels;
}
export const DEFAULT_PLAYER_DEPS: PlayerTeamScanDeps = {
  blobToRgbaImage,
  loadVocab: loadPlayerScanVocab,
  scan: scanPlayerImage,
  scanDeps: PLAYER_SCAN_DEPS,
  detect: detectPlayerPanels,
};

const NO_PANELS_ERROR = 'No team panels found — try cropping around the six panels.';

export function usePlayerTeamScan(pokemonList: PokemonBaseStats[], deps: PlayerTeamScanDeps = DEFAULT_PLAYER_DEPS) {
  const [movesImage, setMovesImage] = useState<PlayerImageState>(IDLE_IMAGE);
  const [statsImage, setStatsImage] = useState<PlayerImageState>(IDLE_IMAGE);
  const [lastError, setLastError] = useState<string | null>(null);
  const [vocab, setVocab] = useState<PlayerScanVocab | null>(null);
  const [version, setVersion] = useState(0);

  const movesScanRef = useRef<Extract<PlayerFrameScan, { kind: 'moves' }> | null>(null);
  const statsScanRef = useRef<Extract<PlayerFrameScan, { kind: 'stats' }> | null>(null);
  const movesRgbaRef = useRef<RgbaImage | null>(null);
  const statsRgbaRef = useRef<RgbaImage | null>(null);
  const vocabRef = useRef<PlayerScanVocab | null>(null);

  const basesById = useMemo(() => new Map(pokemonList.map(p => [p.id, p])), [pokemonList]);
  const legalIds = useMemo(() => new Set(pokemonList.map(p => p.id)), [pokemonList]);

  const merged: MergedPlayerScan | null = useMemo(() => {
    if (!movesScanRef.current && !statsScanRef.current) return null;
    return mergePlayerScan(movesScanRef.current, statsScanRef.current, basesById);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basesById, version]);

  const addFrame = useCallback(async (blob: Blob) => {
    const v = vocabRef.current ?? await deps.loadVocab();
    if (!vocabRef.current) { vocabRef.current = v; setVocab(v); }
    setLastError(null);

    const img = await deps.blobToRgbaImage(blob);
    const scan = await deps.scan(img, legalIds, v, deps.scanDeps);

    if (!scan) {
      // The kind isn't known on a detection failure. Both slots already done: don't
      // clobber a good scan — surface the error on the transient banner instead.
      // Otherwise route it to whichever slot is empty (moves first) for crop-retry.
      if (movesImage.status === 'done' && statsImage.status === 'done') {
        setLastError(NO_PANELS_ERROR);
        return;
      }
      const setTarget = movesImage.status !== 'done' ? setMovesImage : setStatsImage;
      setTarget({ status: 'error', error: NO_PANELS_ERROR, blob });
      return;
    }

    if (scan.kind === 'moves') {
      movesScanRef.current = scan;
      movesRgbaRef.current = img;
      setMovesImage({ status: 'done', error: null, blob });
    } else {
      statsScanRef.current = scan;
      statsRgbaRef.current = img;
      setStatsImage({ status: 'done', error: null, blob });
    }
    setVersion(v2 => v2 + 1);
  }, [deps, legalIds, movesImage.status, statsImage.status]);

  const setSlotSpecies = useCallback((slot: number, speciesId: number) => {
    const v = vocabRef.current;
    const pinned = [{ id: speciesId, score: 1 }];

    if (movesRgbaRef.current && movesScanRef.current && v) {
      const det = deps.detect(movesRgbaRef.current);
      const panelRegions = det?.panels[slot];
      const panel = movesScanRef.current.panels[slot];
      if (panelRegions && panel) {
        const rescanned = rescanMovesPanelText(movesRgbaRef.current, panelRegions, speciesId, v, deps.scanDeps.render);
        const nextPanel: MovesPanelRead = { ...panel, species: pinned, ...rescanned };
        movesScanRef.current = {
          ...movesScanRef.current,
          panels: movesScanRef.current.panels.map((p, i) => (i === slot ? nextPanel : p)),
        };
      }
    } else if (statsScanRef.current) {
      const panel = statsScanRef.current.panels[slot];
      if (panel) {
        statsScanRef.current = {
          ...statsScanRef.current,
          panels: statsScanRef.current.panels.map((p, i) => (i === slot ? { ...p, species: pinned } : p)),
        };
      }
    }
    setVersion(v2 => v2 + 1);
  }, [deps]);

  const removeImage = useCallback((kind: PlayerScreenKind) => {
    if (kind === 'moves') {
      movesScanRef.current = null; movesRgbaRef.current = null;
      setMovesImage(IDLE_IMAGE);
    } else {
      statsScanRef.current = null; statsRgbaRef.current = null;
      setStatsImage(IDLE_IMAGE);
    }
    setVersion(v => v + 1);
  }, []);

  const reset = useCallback(() => {
    movesScanRef.current = null; statsScanRef.current = null;
    movesRgbaRef.current = null; statsRgbaRef.current = null;
    setMovesImage(IDLE_IMAGE); setStatsImage(IDLE_IMAGE);
    setLastError(null);
    setVersion(v => v + 1);
  }, []);

  return { movesImage, statsImage, merged, vocab, lastError, addFrame, setSlotSpecies, removeImage, reset };
}
