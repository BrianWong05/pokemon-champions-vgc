import React, { useMemo, useState } from 'react';
import PokemonImage from '@/components/atoms/PokemonImage';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import type { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import { NATURES, getFormattedNature } from '@/features/pokemon/utils/pokemon-natures';
import type { PlayerScreenKind } from './playerTypes';
import PokemonImagePicker from './PokemonImagePicker';
import CropStep from './CropStep';
import { filePickerSource, cameraSource } from './captureSource';
import { usePlayerTeamScan, type PlayerTeamScanDeps } from './usePlayerTeamScan';
import { buildConfigs } from './mergePlayerScan';
import { toEditable, applyEditsToSlots, type EditableSlot } from './playerScanFlags';
import { loadClassifier } from './classifier';

export interface PlayerScanPanelProps {
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  onSave: (members: PokemonConfig[]) => void;
  /** When provided, a Cancel button shows; use to close the host (modal) and clear state. */
  onCancel?: () => void;
  /** Whether the panel is currently shown — drives classifier warmup and reset-on-hide. Default true. */
  active?: boolean;
  /** test-only affordance: inject fake usePlayerTeamScan deps instead of the real DEFAULT_PLAYER_DEPS */
  deps?: PlayerTeamScanDeps;
}

const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

const CHIP_LABEL: Record<PlayerScreenKind, string> = { moves: 'Moves & item', stats: 'Stats & nature' };

/**
 * PlayerScanPanel — the "scan my team" body: two screenshot chips (moves/item +
 * stats/nature) → per-slot review (species, ability, item, moves, SP, nature) →
 * Save. Rendered inside PlayerScanModal for the portrait Teams flow, and inline
 * (no popup) in the landscape new-team "Scan" method.
 */
export const PlayerScanPanel: React.FC<PlayerScanPanelProps> = ({ pokemonList, moveList, onSave, onCancel, active = true, deps }) => {
  const { movesImage, statsImage, merged, vocab, lastError, busy, addFrame, setSlotSpecies, reset } =
    usePlayerTeamScan(pokemonList, deps);

  // ponytail: dev-only harness for golden verification in-browser
  if (import.meta.env.DEV) (window as any).__playerScanDebug = { addFrame };

  React.useEffect(() => {
    if (active) void loadClassifier();
  }, [active]);

  const basesById = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const movesById = useMemo(() => new Map(moveList.map((m) => [m.id, m])), [moveList]);
  const itemNames = useMemo(() => [...new Set((vocab?.items ?? []).map((i) => i.key))], [vocab]);

  const [edits, setEdits] = useState<Record<number, EditableSlot>>({});
  const [pickerOpenFor, setPickerOpenFor] = useState<number | null>(null);
  const [croppingKind, setCroppingKind] = useState<PlayerScreenKind | null>(null);

  // Clear all scan state when the panel is hidden (host modal closed).
  React.useEffect(() => {
    if (!active) { reset(); setEdits({}); setPickerOpenFor(null); setCroppingKind(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const prevStatusesRef = React.useRef({ moves: movesImage.status, stats: statsImage.status });
  React.useEffect(() => {
    if (!merged) return;
    const prev = prevStatusesRef.current;
    const justFinished =
      (movesImage.status === 'done' && prev.moves !== 'done') ||
      (statsImage.status === 'done' && prev.stats !== 'done');
    prevStatusesRef.current = { moves: movesImage.status, stats: statsImage.status };

    setEdits((prevEdits) => {
      const next: Record<number, EditableSlot> = {};
      for (const slot of merged.slots) {
        next[slot.slot] = justFinished ? toEditable(slot) : prevEdits[slot.slot] ?? toEditable(slot);
      }
      return next;
    });
  }, [merged, movesImage.status, statsImage.status]);

  const updateEdit = (slot: number, patch: Partial<EditableSlot>) =>
    setEdits((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));

  const pickSpecies = (slot: number, id: number) => {
    setSlotSpecies(slot, id);
    setEdits((prev) => { const next = { ...prev }; delete next[slot]; return next; });
  };

  const captureFor = async (source: typeof filePickerSource | typeof cameraSource) => {
    const frame = await source.capture();
    if (frame) await addFrame(frame.blob);
  };

  const cropRetry = () => (b: Blob) => {
    setCroppingKind(null);
    void addFrame(b);
  };

  const cancel = () => {
    reset();
    setEdits({});
    setPickerOpenFor(null);
    setCroppingKind(null);
    onCancel?.();
  };

  const handleSave = () => {
    if (!merged || !vocab) return;
    const edited = applyEditsToSlots(merged, edits);
    const configs = buildConfigs(edited, basesById, movesById, vocab);
    onSave(configs);
  };

  const hasSpecies = Object.values(edits).some((e) => e.speciesId != null);
  const missingKind: PlayerScreenKind | null =
    movesImage.status === 'done' && statsImage.status !== 'done' ? 'stats'
      : statsImage.status === 'done' && movesImage.status !== 'done' ? 'moves'
        : null;

  const renderChip = (kind: PlayerScreenKind) => {
    const state = kind === 'moves' ? movesImage : statsImage;
    return (
      <div key={kind} className="flex-1 p-3 rounded border border-line-2 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-1">{CHIP_LABEL[kind]}</span>
          {state.status === 'done' && <span className="text-safe text-sm">&#10003; Done</span>}
          {state.status === 'error' && <span className="text-danger text-sm">Error</span>}
        </div>
        {state.status === 'error' && state.error && <p className="text-xs text-danger">{state.error}</p>}
        {croppingKind === kind && state.blob ? (
          <CropStep blob={state.blob} onCropped={cropRetry()} onCancel={() => setCroppingKind(null)} />
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded bg-accent text-accent-ink hover:bg-accent-hover transition-colors"
              onClick={() => captureFor(filePickerSource)}
            >
              Add screenshot
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-sm rounded bg-accent text-accent-ink hover:bg-accent-hover transition-colors"
              onClick={() => captureFor(cameraSource)}
            >
              Take photo
            </button>
            {state.blob && (
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded border border-line-2 text-ink-2 hover:bg-raise"
                onClick={() => setCroppingKind(kind)}
              >
                Crop &amp; retry
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-3">Add both screens of your team — moves/item and stats. Order doesn't matter.</p>
      <div className="flex gap-3">
        {renderChip('moves')}
        {renderChip('stats')}
      </div>

      {lastError && <p className="text-sm text-danger">{lastError}</p>}

      {busy && (
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-accent" />
          <p className="text-sm text-ink-2">Scanning…</p>
        </div>
      )}

      {merged && merged.slots.length > 0 && (
        <div className="space-y-3">
          {merged.slots.map((slot) => {
            const e = edits[slot.slot] ?? toEditable(slot);
            const speciesUncertain = (slot.species[0]?.score ?? 0) < 0.5;
            const selectedName = e.speciesId != null ? basesById.get(e.speciesId)?.nameEn : undefined;
            const isPicking = pickerOpenFor === slot.slot;
            const learnset = e.speciesId != null ? vocab?.movesFor(e.speciesId) ?? [] : [];
            const abilityOptions = e.speciesId != null ? vocab?.abilitiesFor(e.speciesId) ?? [] : [];

            return (
              <div key={slot.slot} className="p-3 rounded border border-line-2 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-5 pt-2 text-sm text-ink-3">{slot.slot + 1}</span>
                  {e.speciesId != null ? (
                    <PokemonImage id={e.speciesId} name={selectedName ?? 'pokemon'} className="w-12 h-12" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-inset" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className={`flex gap-2 flex-wrap rounded-lg ${speciesUncertain ? 'ring-2 ring-field p-1' : ''}`}>
                      {slot.species.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickSpecies(slot.slot, c.id)}
                          className="flex flex-col items-center gap-1 rounded-lg p-1 hover:bg-raise"
                        >
                          <span
                            className={`rounded-lg border p-1 ${
                              e.speciesId === c.id ? 'border-transparent bg-accent-soft ring-2 ring-accent' : 'border-line bg-inset'
                            }`}
                          >
                            <PokemonImage id={c.id} name={basesById.get(c.id)?.nameEn ?? 'pokemon'} className="w-14 h-14" />
                          </span>
                          <span className={`text-xs max-w-[5.5rem] truncate ${e.speciesId === c.id ? 'text-accent' : 'text-ink-2'}`}>
                            {basesById.get(c.id)?.nameEn}
                          </span>
                          <span className="text-[10px] text-ink-4">{Math.round(c.score * 100)}%</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-2 px-3 py-1.5 text-sm font-semibold rounded-lg bg-inset border border-line-2 text-ink-2 hover:bg-raise"
                      onClick={() => setPickerOpenFor(isPicking ? null : slot.slot)}
                    >
                      {isPicking ? 'Close picker' : 'Choose Pokémon'}
                    </button>
                    {isPicking && (
                      <div className="mt-2">
                        <PokemonImagePicker
                          pokemonList={pokemonList}
                          selectedId={e.speciesId}
                          onSelect={(id) => {
                            pickSpecies(slot.slot, id);
                            setPickerOpenFor(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-ink-3 space-y-1">
                    <span>Ability</span>
                    <select
                      className={`w-full h-9 bg-inset border border-line-2 rounded px-2 text-sm text-ink-1 ${
                        !slot.ability.confident ? 'ring-2 ring-field' : ''
                      }`}
                      value={e.ability ?? ''}
                      onChange={(ev) => updateEdit(slot.slot, { ability: ev.target.value || null })}
                    >
                      <option value="">—</option>
                      {abilityOptions.map((a) => (
                        <option key={a.key} value={a.key}>{a.names.en}</option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-ink-3 space-y-1">
                    <span>Item</span>
                    <input
                      className={`w-full h-9 bg-inset border border-line-2 rounded px-2 text-sm text-ink-1 ${
                        !slot.item.confident ? 'ring-2 ring-field' : ''
                      }`}
                      list={`items-${slot.slot}`}
                      value={e.item ?? ''}
                      onChange={(ev) => updateEdit(slot.slot, { item: ev.target.value || null })}
                    />
                    <datalist id={`items-${slot.slot}`}>
                      {itemNames.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((mi) => (
                    <label key={mi} className="text-xs text-ink-3 space-y-1">
                      <span>Move {mi + 1}</span>
                      <select
                        className={`w-full h-9 bg-inset border border-line-2 rounded px-2 text-sm text-ink-1 ${
                          !slot.moves[mi]?.confident ? 'ring-2 ring-field' : ''
                        }`}
                        value={e.moves[mi] ?? ''}
                        onChange={(ev) => {
                          const val = ev.target.value ? Number(ev.target.value) : null;
                          const nextMoves = [...e.moves];
                          nextMoves[mi] = val;
                          updateEdit(slot.slot, { moves: nextMoves });
                        }}
                      >
                        <option value="">—</option>
                        {learnset.map((m) => (
                          <option key={m.moveId} value={m.moveId}>{movesById.get(m.moveId)?.nameEn ?? m.names.en}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {STAT_LABELS.map((label, i) => (
                    <label key={label} className="text-xs text-ink-3 space-y-1">
                      <span>{label} SP</span>
                      <input
                        type="number"
                        min={0}
                        max={32}
                        className={`w-full h-9 bg-inset border border-line-2 rounded px-2 text-sm text-ink-1 ${
                          slot.statReads[i] && !slot.statReads[i].consistent ? 'ring-2 ring-danger' : ''
                        }`}
                        value={e.sp[i] ?? 0}
                        onChange={(ev) => {
                          const nextSp = [...e.sp];
                          nextSp[i] = Math.max(0, Math.min(32, Number(ev.target.value) || 0));
                          updateEdit(slot.slot, { sp: nextSp });
                        }}
                      />
                    </label>
                  ))}
                </div>

                <label className="text-xs text-ink-3 space-y-1 block max-w-xs">
                  <span>Nature</span>
                  <select
                    className={`w-full h-9 bg-inset border border-line-2 rounded px-2 text-sm text-ink-1 ${
                      !slot.nature.confident ? 'ring-2 ring-field' : ''
                    }`}
                    value={getFormattedNature(e.nature)}
                    onChange={(ev) => updateEdit(slot.slot, { nature: ev.target.value })}
                  >
                    {NATURES.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        {missingKind && (
          <p className="mr-auto text-sm text-field">
            Only the {CHIP_LABEL[missingKind === 'stats' ? 'moves' : 'stats']} screen was scanned — missing fields default.
          </p>
        )}
        {onCancel && (
          <button className="px-4 py-2 rounded border border-line-2 text-ink-2 hover:bg-raise" onClick={cancel}>
            Cancel
          </button>
        )}
        <button
          className="px-4 py-2 rounded bg-safe-soft text-safe disabled:opacity-45"
          onClick={handleSave}
          disabled={!hasSpecies || !vocab}
        >
          Save team
        </button>
      </div>
    </div>
  );
};

export default PlayerScanPanel;
