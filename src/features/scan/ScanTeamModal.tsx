import React, { useMemo, useState } from 'react';
import Modal from '@/components/atoms/Modal';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { ParsedShowdownSet } from '@/features/pokemon/utils/showdown-parser';
import type { Candidate, ScanSide } from './types';
import PokemonImagePicker from './PokemonImagePicker';
import { useTeamScan, type ScanEngine } from './useTeamScan';
import { loadClassifier } from './classifier';
import { pickImage } from './capture';
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
}

interface RosterEntry {
  id: number | null;
  candidates: Candidate[];
  side?: ScanSide;
  hpPercent?: number | null;
}

const ScanTeamModal: React.FC<ScanTeamModalProps> = ({ isOpen, onClose, onImport, pokemonList, onLoadPokemon, onLoadAttacker, onSaveTeam }) => {
  const legalIds = useMemo(() => new Set(pokemonList.map((p) => p.id)), [pokemonList]);
  const byId = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const { status, slots, error, scan, reset } = useTeamScan(legalIds);
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
    const blob = await pickImage();
    if (blob) {
      setPendingBlob(blob);
      await scan(blob);
    }
  };

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
    <Modal isOpen={isOpen} onClose={handleClose} title="Scan opponent team">
      <div className="space-y-4">
        {status === 'idle' && (
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startPick}>
            Choose screenshot
          </button>
        )}

        {status === 'scanning' && (
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
            <p className="text-sm text-gray-600">Recognizing team… this can take a few seconds.</p>
          </div>
        )}

        {status === 'error' && <p className="text-red-600">Scan failed: {error}</p>}

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
              <p className="text-amber-600 text-sm">
                Couldn't auto-detect the opponent's tiles. Add the Pokémon manually below, or
                <button className="ml-1 underline" onClick={startPick}>try another image</button>.
                {pendingBlob && (
                  <button className="ml-1 underline font-semibold" onClick={() => setCropping(true)}>
                    Crop around the opponent's red column
                  </button>
                )}
              </p>
            )}
            {slots.length > 0 && slots.length < 6 && pendingBlob && (
              <p className="text-amber-600 text-sm">
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
                <div key={i} className="flex items-start gap-3 p-2 rounded border border-gray-100">
                  <span className="w-5 pt-2 text-sm text-gray-500">{i + 1}</span>
                  {(entry.side || entry.hpPercent != null) && (
                    <div className="flex flex-col items-center gap-0.5 pt-2">
                      {entry.side && (
                        <span
                          className={`text-[10px] px-1 rounded font-semibold ${
                            entry.side === 'player' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {entry.side === 'player' ? 'You' : 'Opp'}
                        </span>
                      )}
                      {entry.hpPercent != null && (
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">{entry.hpPercent}% HP</span>
                      )}
                    </div>
                  )}
                  {entry.id != null ? (
                    <PokemonImage id={entry.id} name={selectedName ?? 'pokemon'} className="w-12 h-12" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100" />
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
                              entry.id === c.id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'
                            }`}
                          >
                            <PokemonImage id={c.id} name={byId.get(c.id)?.nameEn ?? 'pokemon'} className="w-10 h-10" />
                            <span className="text-[10px] text-gray-500 max-w-[4rem] truncate">
                              {byId.get(c.id)?.nameEn} {Math.round(c.score * 100)}%
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="text-xs text-blue-600 underline mt-1"
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
                      className="px-2 py-1 text-xs font-semibold text-blue-600 border border-blue-200 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      onClick={() => entry.id != null && onLoadPokemon(entry.id, { hpPercent: entry.hpPercent })}
                      disabled={entry.id == null}
                    >
                      Set as defender
                    </button>
                  )}
                  {onLoadAttacker && entry.side === 'player' && (
                    <button
                      type="button"
                      className="px-2 py-1 text-xs font-semibold text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      onClick={() => entry.id != null && onLoadAttacker(entry.id, { hpPercent: entry.hpPercent })}
                      disabled={entry.id == null}
                    >
                      Set as attacker
                    </button>
                  )}
                  <button
                    className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
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
              className="w-full px-3 py-2 rounded border border-dashed border-gray-400 text-gray-700 hover:bg-gray-50"
              onClick={addEntry}
            >
              + Add Pokémon
            </button>

            <div className="flex items-center justify-end gap-2">
              <label className="mr-auto flex items-center gap-1 text-xs text-gray-500">
                Engine
                <select
                  className="rounded border border-gray-200 bg-white px-1 py-0.5 text-xs text-gray-600"
                  value={engine}
                  onChange={(e) => changeEngine(e.target.value as ScanEngine)}
                >
                  <option value="auto">auto</option>
                  <option value="classifier">classifier</option>
                  <option value="descriptor">descriptor</option>
                </select>
              </label>
              {pendingBlob && (
                <button className="px-4 py-2 rounded border" onClick={() => setCropping(true)}>
                  Crop image &amp; retry
                </button>
              )}
              <button className="px-4 py-2 rounded border" onClick={handleClose}>Cancel</button>
              {onSaveTeam && (
                <button
                  className="px-4 py-2 rounded border border-green-600 text-green-700 disabled:opacity-50"
                  onClick={saveTeam}
                  disabled={roster.every((e) => e.id == null)}
                >
                  Save opp team to Teams
                </button>
              )}
              {onImport && (
                <button
                  className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
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
