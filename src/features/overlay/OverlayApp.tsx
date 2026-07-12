// Overlay shell (#/overlay): the only page the panel WebView renders.
// Owns the tap -> capture -> scan -> route state machine; native only
// captures frames and moves windows.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { overlayBridge } from './overlayBridge';
import { routeScan } from './overlayScan';
import { usePokemonList } from './usePokemonList';
import StripView from './StripView';
import ConfirmRosterView from './ConfirmRosterView';
import DamageCalculatorPage, { type OverlayDefender } from '@/pages/DamageCalculator';
import { useFormat } from '../formats/FormatContext';
import { useBattleRoster } from '../scan/useBattleRoster';
import { formFamilyIds, buildLegalIdsResolver, readBattleRoster } from '../scan/battleRoster';
import { readLastScanHp, saveScanHp } from '../scan/lastScanHp';
import { scanFrame, DEFAULT_DEPS } from '../scan/scanFrame';
import type { SlotResult } from '../scan/types';

type View = 'idle' | 'scanning' | 'confirm' | 'calc' | 'error';

const OverlayApp: React.FC = () => {
  const { format } = useFormat();
  const pokemonList = usePokemonList(format);
  const { roster, confirmRoster } = useBattleRoster();
  const [view, setView] = useState<View>('idle');
  const [errorReason, setErrorReason] = useState<'empty' | 'no-roster-match'>('empty');
  const [confirmSlots, setConfirmSlots] = useState<SlotResult[]>([]);
  const [scanSeq, setScanSeq] = useState(0);
  const [overlayDefender, setOverlayDefender] = useState<OverlayDefender | null>(null);
  const pendingBlob = useRef<Blob | null>(null);
  const seqRef = useRef(0); // monotonic key/remount counter; no setState inside updaters
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);

  // Mount: reflect persisted roster state to the native bubble/window.
  useEffect(() => {
    overlayBridge.setBubbleTag(roster ? 'calc' : 'scan');
    overlayBridge.setWindowState(roster ? 'strip' : 'hidden');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The native panel window is transparent; the page background must be too,
  // so the game stays visible around partial-width panels (confirm view).
  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const root = document.getElementById('root');
    if (root) root.style.background = 'transparent';
  }, []);

  const closePanel = useCallback(() => {
    setView('idle');
    // Fresh read (spec): roster changes made in the main app self-correct here.
    overlayBridge.setWindowState(readBattleRoster() ? 'strip' : 'hidden');
  }, []);

  const runScan = useCallback(async (blob: Blob | null) => {
    overlayBridge.setWindowState('panel');
    if (!blob) { setErrorReason('empty'); setView('error'); return; }
    if (pokemonList.length === 0) { pendingBlob.current = blob; setView('scanning'); return; }
    setView('scanning');
    try {
      const image = await DEFAULT_DEPS.blobToRgbaImage(blob);
      const fullLegal = new Set(pokemonList.map((p) => p.id));
      // Fresh read (spec): re-read the roster on every tap, not hook state.
      const lockedRoster = readBattleRoster();
      const maskIds = lockedRoster && lockedRoster.length > 0 ? formFamilyIds(lockedRoster, pokemonList) : null;
      const legal = buildLegalIdsResolver(fullLegal, maskIds, null);
      const { mode, slots } = await scanFrame(image, legal, DEFAULT_DEPS);
      const route = routeScan(mode, slots);
      if (route.view === 'confirm') {
        setConfirmSlots(route.slots);
        seqRef.current += 1;
        setScanSeq(seqRef.current);
        setView('confirm');
      } else if (route.view === 'calc') {
        saveScanHp(route.hpEntries);
        seqRef.current += 1;
        setOverlayDefender({ id: route.defenderId, hpPercent: route.hpPercent, seq: seqRef.current });
        setScanSeq(seqRef.current);
        setView('calc');
      } else {
        setErrorReason(route.reason);
        setView('error');
      }
    } catch (e) {
      console.error('[overlay] scan failed', e);
      setErrorReason('empty');
      setView('error');
    }
  }, [pokemonList]);

  // A tap can land before sql.js finishes loading; finish it when data is up.
  useEffect(() => {
    if (pokemonList.length > 0 && pendingBlob.current) {
      const blob = pendingBlob.current;
      pendingBlob.current = null;
      void runScan(blob);
    }
  }, [pokemonList, runScan]);

  useEffect(() => overlayBridge.onBubbleTap(() => void runScan(overlayBridge.captureFrame())), [runScan]);
  useEffect(() => overlayBridge.onBack(closePanel), [closePanel]);

  const rescan = useCallback(() => void runScan(overlayBridge.blinkAndCapture()), [runScan]);

  const handleConfirm = useCallback((ids: number[]) => {
    confirmRoster(ids);
    overlayBridge.setBubbleTag('calc');
    overlayBridge.setWindowState('strip');
    setView('idle');
  }, [confirmRoster]);

  const handleStripPick = useCallback((id: number) => {
    seqRef.current += 1;
    setOverlayDefender({ id, hpPercent: readLastScanHp()[id] ?? null, seq: seqRef.current });
    setScanSeq(seqRef.current);
    setView('calc');
    overlayBridge.setWindowState('panel');
  }, []);

  if (view === 'idle') {
    return roster ? (
      <StripView roster={roster} byId={byId} hpById={readLastScanHp()} activeId={overlayDefender?.id ?? null} onPick={handleStripPick} />
    ) : null;
  }

  if (view === 'scanning') {
    return (
      <div className="w-full h-full grid place-items-center bg-slate-950/70">
        <div className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm font-semibold animate-pulse">
          Scanning…
        </div>
      </div>
    );
  }

  if (view === 'confirm') {
    return (
      <div className="w-full h-full flex" onClick={closePanel}>
        <div className="w-2/3 h-full" onClick={(e) => e.stopPropagation()}>
          <ConfirmRosterView
            key={scanSeq}
            slots={confirmSlots}
            pokemonList={pokemonList}
            onConfirm={handleConfirm}
            onRescan={rescan}
            onClose={closePanel}
          />
        </div>
      </div>
    );
  }

  if (view === 'calc') {
    return (
      <div className="w-full h-full flex flex-col bg-slate-950">
        <div className="flex items-center gap-2 px-3 h-8 border-b border-slate-800 text-slate-100 shrink-0">
          <span className="text-xs font-bold">Damage · floating over battle</span>
          <span className="flex-1" />
          {overlayDefender?.hpPercent != null ? (
            <span className="text-[11px] px-2 py-0.5 rounded border border-emerald-500/50 text-emerald-400">
              Read · {overlayDefender.hpPercent}% HP
            </span>
          ) : null}
          <button aria-label="Scan active + HP" onClick={rescan} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
            Scan active + HP
          </button>
          <button aria-label="Minimize" onClick={closePanel} className="text-[11px] px-2 py-1 rounded border border-slate-700 hover:bg-slate-800">
            ▾
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <DamageCalculatorPage overlayDefender={overlayDefender} onOpenScanOverride={rescan} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full grid place-items-center" onClick={closePanel}>
      <div className="w-72 p-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-100" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-bold mb-1">Couldn't read the screen</div>
        <div className="text-xs text-slate-400 mb-3">
          {errorReason === 'no-roster-match'
            ? 'Nothing on screen matched the locked roster — re-scan the team preview next game.'
            : 'Point at the team-select screen or an active battle and retry.'}
        </div>
        <div className="flex gap-2">
          <button onClick={rescan} className="flex-1 h-9 rounded-lg font-bold text-sm bg-blue-500 text-slate-950">Retry</button>
          <button onClick={closePanel} className="flex-1 h-9 rounded-lg font-bold text-sm border border-slate-700">Close</button>
        </div>
      </div>
    </div>
  );
};

export default OverlayApp;
