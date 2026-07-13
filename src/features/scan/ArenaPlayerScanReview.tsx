import React, { useMemo, useState } from 'react';
import { Sprite, Icon, ItemIcon, TypeBadge } from '@/design-system/arena';
import { usePlayerTeamScan } from './usePlayerTeamScan';
import { buildConfigs } from './mergePlayerScan';
import { toEditable, applyEditsToSlots, deriveSlotFlags, isSlotFlagged, type EditableSlot } from './playerScanFlags';
import { filePickerSource, cameraSource } from './captureSource';
import CropStep from './CropStep';
import PokemonImagePicker from './PokemonImagePicker';
import { loadClassifier } from './classifier';
import { getFormattedNature, getNatureStats } from '@/features/pokemon/utils/pokemon-natures';
import { REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { ArenaReviewMon } from '@/features/teams/components/mobile/ArenaReviewMon';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import type { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import type { TeamWithMembers } from '@/db/repositories/team.repo';
import type { PlayerScanPanelProps } from './PlayerScanPanel';
import type { PlayerScreenKind } from './playerTypes';

const SP_SHORT = ['H', 'A', 'B', 'C', 'D', 'S'];
const STAT_SHORT: Record<string, string> = { hp: 'H', atk: 'A', def: 'B', spa: 'C', spd: 'D', spe: 'S' };

/**
 * ArenaPlayerScanReview — the 9a "fix in place" landscape review: capture chips
 * → six-mon glance (confidence badges) → per-mon detail (species candidate band
 * + editable fields). Drop-in for `PlayerScanPanel` in the landscape scan slot;
 * same recognition pipeline, Arena-styled render only.
 */
export const ArenaPlayerScanReview: React.FC<PlayerScanPanelProps> = ({ pokemonList, moveList, onSave, onCancel, active = true, deps }) => {
  const { movesImage, statsImage, merged, vocab, lastError, busy, addFrame, setSlotSpecies, reset } =
    usePlayerTeamScan(pokemonList, deps);

  // ponytail: dev-only harness for golden verification in-browser (mirrors PlayerScanPanel)
  if (import.meta.env.DEV) (window as any).__playerScanDebug = { addFrame };

  React.useEffect(() => { if (active) void loadClassifier(); }, [active]);

  const basesById = useMemo(() => new Map(pokemonList.map((p) => [p.id, p])), [pokemonList]);
  const movesById = useMemo(() => new Map(moveList.map((m) => [m.id, m])), [moveList]);
  // Move's type name (for the type-colored chip); null when unknown/empty.
  const moveType = (mv: number | null): string | null => {
    if (mv == null) return null;
    const typeId = (movesById.get(mv) as MoveData | undefined)?.typeId;
    return typeId != null ? REVERSE_TYPE_IDS[typeId] ?? null : null;
  };

  const [edits, setEdits] = useState<Record<number, EditableSlot>>({});
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [croppingKind, setCroppingKind] = useState<PlayerScreenKind | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resolvedSlots, setResolvedSlots] = useState<Record<number, boolean>>({});
  const [reopenSlots, setReopenSlots] = useState<Record<number, boolean>>({});

  // Reset on hide (host closed).
  React.useEffect(() => {
    if (!active) { reset(); setEdits({}); setOpenSlot(null); setCroppingKind(null); setPickerOpen(false); setResolvedSlots({}); setReopenSlots({}); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Seed/refresh edits when a screenshot finishes (same rule as PlayerScanPanel).
  const prevStatusesRef = React.useRef({ moves: movesImage.status, stats: statsImage.status });
  React.useEffect(() => {
    if (!merged) return;
    const prev = prevStatusesRef.current;
    const justFinished = (movesImage.status === 'done' && prev.moves !== 'done') || (statsImage.status === 'done' && prev.stats !== 'done');
    prevStatusesRef.current = { moves: movesImage.status, stats: statsImage.status };
    setEdits((prevEdits) => {
      const next: Record<number, EditableSlot> = {};
      for (const s of merged.slots) next[s.slot] = justFinished ? toEditable(s) : prevEdits[s.slot] ?? toEditable(s);
      return next;
    });
  }, [merged, movesImage.status, statsImage.status]);

  const updateEdit = (slot: number, patch: Partial<EditableSlot>) =>
    setEdits((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));

  const pickSpecies = (slot: number, id: number) => {
    setSlotSpecies(slot, id);                                   // re-scans + re-derives the slot
    setEdits((prev) => { const next = { ...prev }; delete next[slot]; return next; }); // drop stale local edits
    setResolvedSlots((prev) => ({ ...prev, [slot]: true }));    // show the green "re-derived" banner
    setReopenSlots((prev) => { const next = { ...prev }; delete next[slot]; return next; }); // a fresh pick closes any reopened band
    setPickerOpen(false);
  };

  const captureFor = async (source: typeof filePickerSource | typeof cameraSource) => {
    const frame = await source.capture();
    if (frame) await addFrame(frame.blob);
  };

  const handleSave = () => {
    if (!merged || !vocab) return;
    onSave(buildConfigs(applyEditsToSlots(merged, edits), basesById, movesById, vocab));
  };

  const hasSpecies = Object.values(edits).some((e) => e.speciesId != null);

  // Which screen (if any) is still unscanned — drives the "add the missing screen" bar in the glance.
  const missingKind: PlayerScreenKind | null =
    movesImage.status === 'done' && statsImage.status !== 'done' ? 'stats'
      : statsImage.status === 'done' && movesImage.status !== 'done' ? 'moves'
        : null;

  const box: React.CSSProperties = { display: 'flex', width: '100%', height: '100%', flexDirection: 'column', background: 'var(--bg-page)', color: 'var(--text-body)', fontFamily: 'var(--font-ui)', overflow: 'hidden' };

  // --- capture chips (before a full scan) ---
  const renderChip = (kind: PlayerScreenKind) => {
    const state = kind === 'moves' ? movesImage : statsImage;
    const label = kind === 'moves' ? 'Moves & item' : 'Stats & nature';
    return (
      <div key={kind} style={{ flex: 1, padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--line-2)', background: 'var(--surface-inset)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-1)' }}>{label}</span>
          {state.status === 'done' && <Icon name="check" size={14} color="var(--safe)" />}
          {state.status === 'error' && <span style={{ fontSize: 11, color: 'var(--danger)' }}>Error</span>}
        </div>
        {croppingKind === kind && state.blob ? (
          <CropStep blob={state.blob} onCropped={(b) => { setCroppingKind(null); void addFrame(b); }} onCancel={() => setCroppingKind(null)} />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" style={btnAccent} onClick={() => captureFor(filePickerSource)}>Add screenshot</button>
            <button type="button" style={btnAccent} onClick={() => captureFor(cameraSource)}>Take photo</button>
            {state.blob && <button type="button" style={btnGhost} onClick={() => setCroppingKind(kind)}>Crop &amp; retry</button>}
          </div>
        )}
      </div>
    );
  };

  if (!merged || merged.slots.length === 0) {
    return (
      <div style={box}>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px' }}>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '0 0 10px' }}>Add both screens of your team — moves/item and stats. Order doesn't matter.</p>
          <div style={{ display: 'flex', gap: 12 }}>{renderChip('moves')}{renderChip('stats')}</div>
          {lastError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 10 }}>{lastError}</p>}
          {busy && <p style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 10 }}>Scanning…</p>}
        </div>
      </div>
    );
  }

  // --- team glance (3x2) ---
  if (openSlot == null) {
    return (
      <div style={box}>
        {missingKind && (
          <div style={missingBar}>
            <Icon name="alert-triangle" size={13} color="var(--field)" />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--ink-2)' }}>
              Only the {missingKind === 'stats' ? 'moves & item' : 'stats & nature'} screen was scanned — add {missingKind === 'stats' ? 'stats & nature' : 'moves & item'}.
            </span>
            <button type="button" style={btnAccent} onClick={() => captureFor(filePickerSource)}>Add screenshot</button>
            <button type="button" style={btnGhost} onClick={() => captureFor(cameraSource)}>Take photo</button>
          </div>
        )}
        {busy && <div style={{ flex: 'none', padding: '6px 16px', fontSize: 11, color: 'var(--ink-2)' }}>Scanning…</div>}
        {lastError && <div style={{ flex: 'none', padding: '6px 16px', fontSize: 11, color: 'var(--danger)' }}>{lastError}</div>}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '11px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
            {merged.slots.map((s) => {
              const e = edits[s.slot] ?? toEditable(s);
              const flags = deriveSlotFlags(s, vocab);
              const flagged = isSlotFlagged(flags);
              const base = e.speciesId != null ? basesById.get(e.speciesId) : undefined;
              const name = e.speciesId != null ? base?.nameEn ?? 'Unknown' : '—';
              const spStr = e.sp.map((v, i) => (v > 0 ? `${SP_SHORT[i]} ${v}` : null)).filter(Boolean).join(' · ');
              const hasStats = s.statReads.length > 0;
              const nat = getNatureStats(e.nature);
              const natureStr = nat.boostedStat && nat.hinderedStat && nat.boostedStat !== nat.hinderedStat
                ? `↑${STAT_SHORT[nat.boostedStat] ?? nat.boostedStat} ↓${STAT_SHORT[nat.hinderedStat] ?? nat.hinderedStat}`
                : getFormattedNature(e.nature);
              return (
                <button key={s.slot} onClick={() => setOpenSlot(s.slot)} style={glanceCard(flagged)}>
                  {/* sprite + name + types + confidence badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
                    <div style={{ width: 34, height: 34, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--surface-inset)', borderRadius: 8, overflow: 'hidden' }}>
                      <Sprite dex={e.speciesId} size={30} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      {(base?.type1 || base?.type2) && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          {base?.type1 && <TypeBadge type={base.type1} size="sm" />}
                          {base?.type2 && <TypeBadge type={base.type2} size="sm" />}
                        </div>
                      )}
                    </div>
                    <span style={confBadge(flagged)}>
                      <Icon name={flagged ? 'alert-triangle' : 'check'} size={9} color={flagged ? 'var(--field)' : 'var(--safe)'} />
                    </span>
                  </div>
                  {/* item */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {e.item && <ItemIcon item={e.item} size={15} framed={false} />}
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: e.item ? 'var(--ink-2)' : 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.item ?? 'No item'}</span>
                  </div>
                  {/* nature + ability */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={natureBadge}>{natureStr}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: e.ability ? 'var(--ink-2)' : 'var(--ink-4)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.ability ?? 'No ability'}</span>
                  </div>
                  {/* SP spread */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: hasStats ? 'var(--ink-3)' : 'var(--ink-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {hasStats ? `SP ${spStr || '0'}` : 'SP · scan stats screen'}
                  </div>
                  {/* moves — 2×2 type-colored chips */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, width: '100%' }}>
                    {e.moves.map((mv, mi) => {
                      const illegal = flags.illegalMoves.includes(mi);
                      return (
                        <span key={mi} style={{ ...moveChip(moveType(mv)), ...(illegal ? { borderColor: 'var(--field)', color: 'var(--field)' } : {}) }}>
                          {illegal && <Icon name="alert-triangle" size={8} color="var(--field)" />}
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{mv != null ? movesById.get(mv)?.nameEn ?? '—' : '—'}</span>
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <ArenaSaveBar hasSpecies={hasSpecies} vocab={vocab} onCancel={onCancel} onSave={handleSave} />
      </div>
    );
  }

  // --- per-mon detail ---
  const s = merged.slots[openSlot];
  const e = edits[openSlot] ?? toEditable(s);
  const flags = deriveSlotFlags(s, vocab);
  const speciesConflict = flags.speciesUncertain || flags.speciesDisagreement || flags.illegalMoves.length > 0 || flags.badAbility;
  const openName = e.speciesId != null ? basesById.get(e.speciesId)?.nameEn ?? 'Unknown' : '—';
  const resolved = !!resolvedSlots[openSlot];
  const reopened = !!reopenSlots[openSlot];
  const showSpeciesBand = (speciesConflict && !resolved) || reopened;

  // Evidence sentences from flags (English, derivable).
  const evidence: string[] = [];
  flags.illegalMoves.forEach((mi) => { const nm = e.moves[mi] != null ? movesById.get(e.moves[mi]!)?.nameEn : null; if (nm) evidence.push(`${nm} isn't in ${openName}'s learnset.`); });
  if (flags.badAbility && s.ability.value) evidence.push(`${s.ability.value} isn't a ${openName} ability.`);
  if (flags.speciesDisagreement) evidence.push('The two screenshots read different species.');
  if (evidence.length === 0) evidence.push('Not sure this is the right Pokémon.');

  // Species-correction band (conflict) or resolved banner — rendered inside the
  // shared editor via its `banner` slot.
  const speciesBanner = showSpeciesBand ? (
    <div style={{ flex: 'none', padding: '8px 16px 9px', background: 'var(--field-soft)', borderBottom: '1px solid var(--field-line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
        <Icon name="alert-triangle" size={13} color="var(--field)" />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-1)' }}>Is this right?</span>
        <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{resolved ? 'Pick a different Pokémon.' : speciesConflict ? evidence[0] : 'Pick the correct Pokémon.'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {s.species.slice(0, 3).map((c) => (
          <button key={c.id} onClick={() => pickSpecies(openSlot, c.id)} style={candTile(e.speciesId === c.id)}>
            <Sprite dex={c.id} size={30} />
            <span style={{ minWidth: 0, textAlign: 'left' }}>
              <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>{basesById.get(c.id)?.nameEn}</span>
              <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: 'var(--ink-4)' }}>{Math.round(c.score * 100)}%</span>
            </span>
          </button>
        ))}
        <button onClick={() => setPickerOpen((v) => !v)} style={btnGhost}>{pickerOpen ? 'Close' : 'Choose Pokémon'}</button>
      </div>
      {pickerOpen && <div style={{ marginTop: 8 }}><PokemonImagePicker pokemonList={pokemonList} selectedId={e.speciesId} onSelect={(id) => pickSpecies(openSlot, id)} /></div>}
    </div>
  ) : resolved ? (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 7, padding: '6px 16px', background: 'var(--safe-soft)', borderBottom: '1px solid var(--safe-line)' }}>
      <Icon name="check" size={13} color="var(--safe)" />
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--safe)' }}>{openName} · re-derived</span>
      <button onClick={() => setReopenSlots((prev) => ({ ...prev, [openSlot]: true }))} style={changeLink}>Change</button>
    </div>
  ) : (
    // Confident detection — still let the user override the species.
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'var(--surface-inset)', borderBottom: '1px solid var(--line-1)' }}>
      <Icon name="scan-line" size={12} color="var(--ink-4)" />
      <span style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>Detected <span style={{ fontWeight: 700, color: 'var(--ink-1)' }}>{openName}</span></span>
      <span style={{ flex: 1 }} />
      <button onClick={() => setReopenSlots((prev) => ({ ...prev, [openSlot]: true }))} style={changeSpeciesBtn}>
        <Icon name="replace" size={11} color="var(--accent)" />Change Pokémon
      </button>
    </div>
  );

  // Build this slot's config for the shared ArenaReviewMon editor.
  const openConfig: PokemonConfig | null = (e.speciesId != null && vocab)
    ? buildConfigs({ ...merged, slots: [applyEditsToSlots(merged, edits).slots[openSlot]] }, basesById, movesById, vocab)[0] ?? null
    : null;

  const saveDetail = (config: PokemonConfig) => {
    updateEdit(openSlot, {
      speciesId: config.selectedId,
      item: config.item,
      ability: config.activeAbility,
      moves: config.moves.map((m) => m?.id ?? null),
      sp: [config.spHp, config.spAtk, config.spDef, config.spSpa, config.spSpd, config.spSpe],
      nature: config.nature,
    });
    setOpenSlot(null);
  };

  // No identified species yet — show the picker band alone.
  if (!openConfig) {
    return (
      <div style={box}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--line-1)' }}>
          <button onClick={() => setOpenSlot(null)} aria-label="Back to team" style={backBtn}><Icon name="chevron-right" size={16} color="var(--ink-2)" style={{ transform: 'scaleX(-1)' }} /></button>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink-1)' }}>Pick a Pokémon</div>
        </div>
        {speciesBanner}
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-3)', fontSize: 12, padding: 16, textAlign: 'center' }}>Choose a Pokémon above to review its details.</div>
        <ArenaSaveBar hasSpecies={hasSpecies} vocab={vocab} onCancel={onCancel} onSave={handleSave} />
      </div>
    );
  }

  // Reuse the polished per-Pokémon editor; remount on species change so it re-seeds from the re-derived config.
  const member = { id: `slot-${openSlot}`, order: openSlot, configuration: openConfig } as unknown as TeamWithMembers['members'][number];
  return (
    <ArenaReviewMon
      key={e.speciesId ?? 'none'}
      member={member}
      teamName="Scanned team"
      pokemonList={pokemonList}
      moveList={moveList}
      saveLabel="Done"
      banner={speciesBanner}
      onBack={() => setOpenSlot(null)}
      onSave={saveDetail}
    />
  );
};

export default ArenaPlayerScanReview;

const btnAccent: React.CSSProperties = { padding: '6px 12px', fontSize: 12, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '6px 12px', fontSize: 12, borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--ink-2)', border: '1px solid var(--line-2)', cursor: 'pointer' };
const backBtn: React.CSSProperties = { width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 'var(--r-sm)', background: 'transparent', border: '1px solid var(--line-2)', color: 'var(--ink-2)', cursor: 'pointer' };
const glanceCard = (flagged: boolean): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 'var(--r-md)', textAlign: 'left', cursor: 'pointer', background: 'var(--surface-card)', border: `1px solid ${flagged ? 'var(--field-line)' : 'var(--line-1)'}`, minWidth: 0, overflow: 'hidden' });
const natureBadge: React.CSSProperties = { flex: 'none', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)', borderRadius: 6, padding: '1px 6px', letterSpacing: '0.04em' };
// Filled type-colored move chip, matching the ArenaAddTeam paste-preview cards (3b).
// ponytail: duplicated from ArenaAddTeam's typeChip rather than shared — extract if a third caller appears.
const moveChip = (type: string | null): React.CSSProperties => {
  const c = type ? `var(--type-${type})` : null;
  return {
    display: 'flex', alignItems: 'center', gap: 3, minWidth: 0, height: 18, padding: '0 7px',
    borderRadius: 'var(--r-xs)', fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
    color: c ?? 'var(--ink-4)',
    background: c ? `color-mix(in srgb, ${c} 15%, transparent)` : 'var(--surface-inset)',
    border: `1px solid ${c ? `color-mix(in srgb, ${c} 38%, transparent)` : 'var(--line-2)'}`,
  };
};
const confBadge = (flagged: boolean): React.CSSProperties => ({ display: 'inline-grid', placeItems: 'center', width: 18, height: 18, flex: 'none', borderRadius: 999, background: flagged ? 'var(--field-soft)' : 'var(--safe-soft)', border: `1px solid ${flagged ? 'var(--field-line)' : 'var(--safe-line)'}` });
const candTile = (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, padding: 7, borderRadius: 'var(--r-md)', background: 'var(--bg-page)', border: `1px solid ${active ? 'var(--accent)' : 'var(--line-2)'}`, cursor: 'pointer' });
const changeLink: React.CSSProperties = { marginLeft: 'auto', padding: '2px 8px', fontSize: 10, fontWeight: 700, borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--safe)', border: '1px solid var(--safe-line)', cursor: 'pointer' };
const changeSpeciesBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, flex: 'none', padding: '3px 9px', fontSize: 10.5, fontWeight: 700, borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent-soft-line)', cursor: 'pointer' };
const missingBar: React.CSSProperties = { flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--field-soft)', borderBottom: '1px solid var(--field-line)' };

const ArenaSaveBar: React.FC<{ hasSpecies: boolean; vocab: unknown; onCancel?: () => void; onSave: () => void }> = ({ hasSpecies, vocab, onCancel, onSave }) => (
  <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line-1)', background: 'var(--surface-sticky)' }}>
    {onCancel && <button onClick={onCancel} style={btnGhost}>Cancel</button>}
    <button onClick={onSave} disabled={!hasSpecies || !vocab} style={{ padding: '8px 16px', borderRadius: 'var(--r-sm)', background: 'var(--safe-soft)', color: 'var(--safe)', border: '1px solid var(--safe-line)', fontWeight: 700, cursor: 'pointer', opacity: !hasSpecies || !vocab ? 0.45 : 1 }}>Save team</button>
  </div>
);
