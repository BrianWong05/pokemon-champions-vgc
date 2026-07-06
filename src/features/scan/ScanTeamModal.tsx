import React, { useMemo, useState } from 'react';
import Modal from '@/components/atoms/Modal';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import type { Candidate, ScanSide } from './types';
import PokemonImagePicker from './PokemonImagePicker';
import { useTeamScan, type ScanEngine } from './useTeamScan';
import { loadClassifier } from './classifier';
import { filePickerSource, cameraSource } from './captureSource';
import { toParsedSets } from './toParsedSets';
import CropStep from './CropStep';

interface ScanTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport?: (sets: ParsedShowdownSet[]) => void;
  pokemonList: PokemonBaseStats[];
  /** Calc mode: when provided, opponent entries show a "Set as defender" action. */
  onLoadPokemon?: (pokemonId: number, opts?: { hpPercent?: number | null }) => void;
  /** Calc mode: when provided, player-side entries (battle scans) show a "Set as attacker" action. */
  onLoadAttacker?: (pokemonId: number, opts?: { hpPercent?: number | null }) => void;
  /** Calc mode: when provided, shows an optional button to save the scanned roster as a Team. */
  onSaveTeam?: (sets: ParsedShowdownSet[]) => void;
  /** A screenshot captured externally (e.g. one-tap Android capture) to scan when the modal opens. */
  externalBlob?: Blob | null;
}

interface RosterEntry {
  id: number | null;
  candidates: Candidate[];
  side?: ScanSide;
  hpPercent?: number | null;
}

const ScanTeamModal: React.FC<ScanTeamModalProps> = ({ isOpen, onClose, onImport, pokemonList, onLoadPokemon, onLoadAttacker, onSaveTeam, externalBlob }) => {
  const legalIds = useMemo(() => new Set(pokemonList.map((p) => p.id)), [pokemonList]);
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const { status, slots, mode, error, scan, reset } = useTeamScan(legalIds);
  // Editable roster, decoupled from the raw scan slots so the user can add/remove entries.
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [pickerOpenFor, setPickerOpenFor] = useState<number | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [cropping, setCropping] = useState(false);
  const [engine, setEngine] = useState<ScanEngine>(
    () => (localStorage.getItem('scan.engine') as ScanEngine | null) ?? 'auto',
  );

  // Warm up the classifier as soon as the modal opens so load success/failure logs
  // land in the console before the first scan runs.
  React.useEffect(() => {
    if (isOpen) void loadClassifier();
  }, [isOpen]);

  const changeEngine = (value: ScanEngine) => {
    setEngine(value);
    localStorage.setItem('scan.engine', value);
  };

  const startPick = async () => {
    const frame = await filePickerSource.capture();
    if (frame) {
      setPendingBlob(frame.blob);
      await scan(frame.blob);
    }
  };

  const startCamera = async () => {
    const frame = await cameraSource.capture();
    if (frame) {
      setPendingBlob(frame.blob);
      await scan(frame.blob);
    }
  };

  // Scan an externally-captured screenshot (one-tap Android capture) when it arrives.
  React.useEffect(() => {
    if (isOpen && externalBlob) {
      setPendingBlob(externalBlob);
      void scan(externalBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, externalBlob]);

  // Seed the editable roster from the scan results once a scan completes.
  React.useEffect(() => {
    if (status === 'done') {
      setRoster(slots.map((s) => ({ id: s.candidates[0]?.id ?? null, candidates: s.candidates, side: s.side, hpPercent: s.hpPercent })));
      setPickerOpenFor(null);
    }
  }, [status, slots]);

  const setEntryId = (i: number, id: number | null) =>
    setRoster((r) => r.map((e, idx) => (idx === i ? { ...e, id } : e)));
  const removeEntry = (i: number) => {
    setRoster((r) => r.filter((_, idx) => idx !== i));
    setPickerOpenFor(null);
  };
  const addEntry = () => {
    setRoster((r) => [...r, { id: null, candidates: [] }]);
    setPickerOpenFor(roster.length); // open the image picker for the new row
  };

  // Import/save build the OPPONENT's roster — player-side entries from battle
  // scans must not leak into it (entries added by hand have no side).
  const rosterNames = () =>
    roster
      .filter((e) => e.side !== 'player')
      .map((e) => (e.id != null ? byId.get(e.id)?.nameEn : undefined))
      .filter((n): n is string => !!n);

  const confirm = () => {
    const names = rosterNames();
    if (names.length === 0 || !onImport) return;
    onImport(toParsedSets(names));
    handleClose();
  };

  const saveTeam = () => {
    const names = rosterNames();
    if (names.length === 0 || !onSaveTeam) return;
    onSaveTeam(toParsedSets(names));
  };

  const handleClose = () => {
    reset();
    setRoster([]);
    setPickerOpenFor(null);
    setPendingBlob(null);
    setCropping(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={mode === 'battle' ? 'Scan battle' : 'Scan opponent team'}>
      <div className="space-y-4">
        {status === 'idle' && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded bg-accent text-accent-ink hover:bg-accent-hover transition-colors" onClick={startPick}>
                Choose screenshot
              </button>
              <button className="px-4 py-2 rounded bg-accent text-accent-ink hover:bg-accent-hover transition-colors" onClick={startCamera}>
                Take photo
              </button>
            </div>
            <p className="text-sm text-ink-3">Tip: hold the phone parallel to the screen and avoid glare.</p>
          </div>
        )}

        {status === 'scanning' && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-accent" />
            <p className="text-sm text-ink-2">Recognizing team… this can take a few seconds.</p>
          </div>
        )}

        {status === 'error' && <p className="text-danger">Scan failed: {error}</p>}

        {status === 'done' && cropping && pendingBlob && (
          <CropStep
            blob={pendingBlob}
            onCropped={(b) => { setCropping(false); setPendingBlob(b); scan(b); }}
            onCancel={() => setCropping(false)}
          />
        )}

        {status === 'done' && !cropping && (
          <>
            {slots.length === 0 && (
              <p className="text-field text-sm">
                Couldn't auto-detect any Pokémon. Add them manually below, or
                <button className="ml-1 underline" onClick={startPick}>try another image</button>.
                {pendingBlob && (
                  <button className="ml-1 underline font-semibold" onClick={() => setCropping(true)}>
                    Crop around the game area
                  </button>
                )}
              </p>
            )}
            {/* A battle screen has at most 4 nameplates (and hidden player plates are
                normal), so the too-few warning only applies to team scans — and it
                counts the OPPONENT's entries, since player slots also fill the list. */}
            {mode !== 'battle' && slots.length > 0 && slots.filter((s) => s.side !== 'player').length < 6 && pendingBlob && (
              <p className="text-field text-sm">
                Couldn't find all 6 —
                <button className="ml-1 underline font-semibold" onClick={() => setCropping(true)}>
                  crop around the opponent's red column
                </button>.
              </p>
            )}

            {roster.map((entry, i) => {
              const selectedName = entry.id != null ? byId.get(entry.id)?.nameEn : undefined;
              const isPicking = pickerOpenFor === i;
              return (
                <div key={i} className="flex items-start gap-3 p-2 rounded border border-line-2">
                  <span className="w-5 pt-2 text-sm text-ink-3">{i + 1}</span>
                  {(entry.side || entry.hpPercent != null) && (
                    <div className="flex flex-col items-center gap-0.5 pt-2">
                      {entry.side && (
                        <span
                          className={`text-[10px] px-1 rounded font-semibold ${
                            entry.side === 'player' ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-danger'
                          }`}
                        >
                          {entry.side === 'player' ? 'You' : 'Opp'}
                        </span>
                      )}
                      {entry.hpPercent != null && (
                        <span className="text-[10px] text-ink-3 whitespace-nowrap">{entry.hpPercent}% HP</span>
                      )}
                    </div>
                  )}
                  {entry.id != null ? (
                    <PokemonImage id={entry.id} name={selectedName ?? 'pokemon'} className="w-12 h-12" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-inset" />
                  )}
                  <div className="flex-1 min-w-0">
                    {/* Recognized candidates as clickable images */}
                    {entry.candidates.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {entry.candidates.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setEntryId(i, c.id)}
                            className={`flex flex-col items-center rounded p-1 ${
                              entry.id === c.id ? 'ring-2 ring-accent' : 'hover:bg-raise'
                            }`}
                          >
                            <PokemonImage id={c.id} name={byId.get(c.id)?.nameEn ?? 'pokemon'} className="w-10 h-10" />
                            <span className="text-[10px] text-ink-3 max-w-[4rem] truncate">
                              {byId.get(c.id)?.nameEn} {Math.round(c.score * 100)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="text-xs text-accent underline mt-1"
                      onClick={() => setPickerOpenFor(isPicking ? null : i)}
                    >
                      {isPicking
                        ? 'Close image picker'
                        : entry.candidates.length > 0
                          ? 'Not these? Pick by image'
                          : 'Choose by image'}
                    </button>
                    {isPicking && (
                      <div className="mt-1">
                        <PokemonImagePicker
                          pokemonList={pokemonList}
                          selectedId={entry.id}
                          onSelect={(id) => { setEntryId(i, id); setPickerOpenFor(null); }}
                        />
                      </div>
                    )}
                  </div>
                  {onLoadPokemon && entry.side !== 'player' && (
                    <button
                      type="button"
                      className="px-2 py-1 text-xs font-semibold text-accent border border-accent-soft-line rounded hover:bg-accent-soft disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
                      onClick={() => entry.id != null && onLoadPokemon(entry.id, { hpPercent: entry.hpPercent })}
                      disabled={entry.id == null}
                    >
                      Set as defender
                    </button>
                  )}
                  {onLoadAttacker && entry.side === 'player' && (
                    <button
                      type="button"
                      className="px-2 py-1 text-xs font-semibold text-safe border border-safe-line rounded hover:bg-safe-soft disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
                      onClick={() => entry.id != null && onLoadAttacker(entry.id, { hpPercent: entry.hpPercent })}
                      disabled={entry.id == null}
                    >
                      Set as attacker
                    </button>
                  )}
                  <button
                    className="px-2 py-1 text-danger hover:bg-danger-soft rounded"
                    onClick={() => removeEntry(i)}
                    aria-label={`Remove slot ${i + 1}`}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <button
              className="w-full px-3 py-2 rounded border border-dashed border-line-2 text-ink-2 hover:bg-raise"
              onClick={addEntry}
            >
              + Add Pokémon
            </button>

            <div className="flex items-center justify-end gap-2">
              <label className="mr-auto flex items-center gap-1 text-xs text-ink-3">
                Engine
                <select
                  className="rounded border border-line-2 bg-card px-1 py-0.5 text-xs text-ink-2"
                  value={engine}
                  onChange={(e) => changeEngine(e.target.value as ScanEngine)}
                >
                  <option value="auto">auto</option>
                  <option value="classifier">classifier</option>
                  <option value="descriptor">descriptor</option>
                </select>
              </label>
              {pendingBlob && (
                <button className="px-4 py-2 rounded border border-line-2 text-ink-2 hover:bg-raise" onClick={() => setCropping(true)}>
                  Crop image &amp; retry
                </button>
              )}
              <button className="px-4 py-2 rounded border border-line-2 text-ink-2 hover:bg-raise" onClick={handleClose}>Cancel</button>
              {onSaveTeam && (
                <button
                  className="px-4 py-2 rounded border border-safe-line text-safe disabled:opacity-45"
                  onClick={saveTeam}
                  disabled={roster.every((e) => e.id == null)}
                >
                  Save opp team to Teams
                </button>
              )}
              {onImport && (
                <button
                  className="px-4 py-2 rounded bg-safe-soft text-safe disabled:opacity-45"
                  onClick={confirm}
                  disabled={roster.every((e) => e.id == null)}
                >
                  Create team
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ScanTeamModal;
