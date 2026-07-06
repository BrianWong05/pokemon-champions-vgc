import React, { useState } from 'react';
import type { CalcState, CalcAction, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import type { Spread } from '@/features/damage-calculator/utils/common-spreads';
import { useCalculatorActions } from '@/features/damage-calculator/hooks/useCalculatorActions';
import { useDamageScenarios, ScenarioRange } from '@/features/damage-calculator/hooks/useDamageScenarios';
import { buildSpeedCompare } from '@/features/damage-calculator/utils/speed';
import { TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { Sprite, TypeBadge, SelectRow, ItemIcon, KOVerdict, koVerdictFromText, Icon, Badge, StatChip } from '@/design-system/arena';
import { ArenaPickerSheet, CorePickerField } from './ArenaPickerSheet';
import { ArenaFieldConditions } from './ArenaFieldConditions';
import { ArenaMovePickerSheet } from './ArenaMovePickerSheet';
import { ArenaAdvancedSheet } from './ArenaAdvancedSheet';
import ShowdownImportModal from '@/components/organisms/ShowdownImportModal';

type Side = 'p1' | 'p2';
type Actions = ReturnType<typeof useCalculatorActions>;

const PANEL_W = 240;
const TYPE_BY_ID: Record<number, string> = Object.fromEntries(
  Object.entries(TYPE_IDS).map(([name, id]) => [id as number, name]),
);

/* ---------- small presentational helpers ---------- */

function Micro({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)', ...style }}>
      {children}
    </div>
  );
}

function TuneBox({ label, value, active, onClick }: { label: string; value: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 0, padding: '6px 8px', borderRadius: 'var(--r-sm)', textAlign: 'left', cursor: 'pointer',
        background: active ? 'var(--accent-soft)' : 'var(--surface-inset)',
        border: `1px solid ${active ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
      }}
    >
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--ink-1)', marginTop: 1 }}>{value}</div>
    </button>
  );
}

function Panel({ side, badge, children }: { side: 'left' | 'right'; badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      width: PANEL_W, flex: '0 0 auto', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none',
      background: 'var(--surface-sticky)',
      borderRight: side === 'left' ? '1px solid var(--line-1)' : 'none',
      borderLeft: side === 'right' ? '1px solid var(--line-1)' : 'none',
      padding: '10px 12px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <Micro style={{ letterSpacing: '0.07em' }}>{side === 'left' ? 'Attacker' : 'Defender'}</Micro>
        <span style={{ flex: 1 }} />
        {badge}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function Identity({ s, name, tone, onClick }: { s: SideState; name: string; tone: 'accent' | 'danger'; onClick: () => void }) {
  const types = [s.type1, s.type2].filter(Boolean) as string[];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Sprite dex={s.selectedId} name={name} size={44} ring tone={tone} />
      <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14.5, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name || 'Select Pokémon'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>{types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
      </button>
    </div>
  );
}

function MoveList({ s, results, onSelect, onEdit }: {
  s: SideState; results: (DamageResult | null)[]; onSelect: (index: number) => void; onEdit: () => void;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <Micro>Moves</Micro>
        <span style={{ flex: 1 }} />
        <button onClick={onEdit} aria-label="Edit moves" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', color: 'var(--ink-3)' }}>
          <Icon name="pencil" size={14} color="var(--ink-3)" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {s.moves.map((m, i) => {
          if (!m) {
            return (
              <button key={i} onClick={onEdit} style={{
                display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '7px 8px',
                borderRadius: 'var(--r-sm)', cursor: 'pointer', background: 'transparent',
                border: '1px dashed var(--line-2)', color: 'var(--ink-4)', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 600,
              }}>
                Add move
              </button>
            );
          }
          const on = i === s.activeMoveIndex;
          const r = results[i];
          const typeName = TYPE_BY_ID[r?.moveType ?? (m as MoveData).typeId];
          return (
            <button key={i} onClick={() => onSelect(i)} style={{
              display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '7px 8px',
              borderRadius: 'var(--r-sm)', cursor: 'pointer',
              background: on ? 'var(--accent-soft)' : 'transparent',
              border: `1px solid ${on ? 'var(--accent-soft-line)' : 'var(--line-1)'}`,
            }}>
              {typeName && <TypeBadge type={typeName} size="sm" />}
              <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700, color: on ? 'var(--ink-1)' : 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(m as MoveData).nameEn}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink-3)' }}>
                {r ? `${r.minPercent}–${r.maxPercent}%` : '—'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioRow({ label, range }: { label: string; range: ScenarioRange | null }) {
  if (!range) return null;
  const danger = range.maxPercent >= 100;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)' }}>
          {range.minPercent}–{range.maxPercent}%
        </span>
      </div>
      <div style={{ marginTop: 4, height: 5, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, range.maxPercent)}%`, height: '100%', background: danger ? 'var(--danger)' : 'var(--safe)', opacity: 0.85 }} />
      </div>
    </div>
  );
}

function RankStepper({ label, value, onChange, ariaPrefix }: { label: string; value: number; onChange: (val: number) => void; ariaPrefix: string }) {
  const btn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)',
    border: '1px solid var(--line-2)', color: 'var(--ink-2)',
    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <Micro>{label}</Micro>
      <span style={{ flex: 1 }} />
      <button aria-label={`Lower ${ariaPrefix} rank`} style={btn} onClick={() => onChange(Math.max(-6, value - 1))}>−</button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)', width: 22, textAlign: 'center' }}>
        {value > 0 ? `+${value}` : value}
      </span>
      <button aria-label={`Raise ${ariaPrefix} rank`} style={btn} onClick={() => onChange(Math.min(6, value + 1))}>+</button>
    </div>
  );
}

/* ---------- the screen ---------- */

export function ArenaCalculatorLandscape({
  state, dispatch, pokemonList, moveList, p1Results, p2Results, actions, onApplySpread, onResetBuild, onOpenScan, defenderExtra, attackerExtra,
}: {
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  p1Results: (DamageResult | null)[];
  p2Results: (DamageResult | null)[];
  p1MaxHp: number;
  p2MaxHp: number;
  actions: Actions;
  onApplySpread: (side: Side, spread: Spread) => void;
  onResetBuild: (side: Side) => void;
  onOpenScan: () => void;
  defenderExtra?: React.ReactNode;
  attackerExtra?: React.ReactNode;
}) {
  const [dir, setDir] = useState<Side>('p1');
  const [view, setView] = useState<'damage' | 'speed'>('damage');
  const [picker, setPicker] = useState<{ side: Side; field: CorePickerField } | null>(null);
  const [movePickerSide, setMovePickerSide] = useState<Side | null>(null);
  const [advancedSide, setAdvancedSide] = useState<Side | null>(null);
  const [showdownSide, setShowdownSide] = useState<Side | null>(null);

  const defDir: Side = dir === 'p1' ? 'p2' : 'p1';
  const nameOf = (id: number | null) => pokemonList.find((p) => p.id === id)?.nameEn ?? '—';
  const scenarios = useDamageScenarios(state, pokemonList, dir);
  const results = dir === 'p1' ? p1Results : p2Results;
  const atk = state[dir];
  const r = results[atk.activeMoveIndex] ?? null;
  const ko = koVerdictFromText(r?.koChanceText);
  const pct = r ? `${isNaN(r.minPercent) ? '0.0' : r.minPercent}–${isNaN(r.maxPercent) ? '0.0' : r.maxPercent}%` : '—';
  const dmg = r ? `${r.minDamage}–${r.maxDamage} dmg` : 'Pick a move';

  const speed = buildSpeedCompare(
    {
      baseSpe: state[dir].baseSpe, spSpe: state[dir].spSpe,
      boostedStat: state[dir].boostedStat, hinderedStat: state[dir].hinderedStat,
      speStage: state[dir].stages.spe || 0, item: state[dir].item, isTailwind: state[dir].isTailwind,
    },
    { baseSpe: state[defDir].baseSpe, speStage: state[defDir].stages.spe || 0, isTailwind: state[defDir].isTailwind },
  );

  const natureShort = (s: SideState) =>
    s.boostedStat ? `+${s.boostedStat.charAt(0).toUpperCase()}${s.boostedStat.slice(1)}` : '—';

  return (
    <div style={{ display: 'flex', height: '100%', minWidth: 0, fontFamily: 'var(--font-ui)', color: 'var(--text-body)' }}>
      {/* -------- attacker (p1) -------- */}
      <Panel side="left" badge={<Badge tone="accent">You</Badge>}>
        {attackerExtra}
        <Identity s={state.p1} name={nameOf(state.p1.selectedId)} tone="accent" onClick={() => setPicker({ side: 'p1', field: 'species' })} />
        <MoveList
          s={state.p1}
          results={p1Results}
          onSelect={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index } })}
          onEdit={() => setMovePickerSide('p1')}
        />
        <SelectRow label="Ability" value={state.p1.activeAbility ?? 'None'} onClick={() => setPicker({ side: 'p1', field: 'ability' })} />
        <SelectRow label="Item" value={state.p1.item ?? 'None'} leading={<ItemIcon item={state.p1.item} size={18} />} onClick={() => setPicker({ side: 'p1', field: 'item' })} />
        <div style={{ display: 'flex', gap: 6 }}>
          <TuneBox label="Nature" value={natureShort(state.p1)} onClick={() => setPicker({ side: 'p1', field: 'nature' })} />
          <TuneBox label="Atk SP" value={state.p1.spAtk} active={state.p1.spAtk > 0} onClick={() => setAdvancedSide('p1')} />
          <TuneBox label="SpA SP" value={state.p1.spSpa} active={state.p1.spSpa > 0} onClick={() => setAdvancedSide('p1')} />
        </div>
      </Panel>

      {/* -------- center: result column -------- */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', gap: 3, padding: 3, background: 'var(--surface-inset)', borderRadius: 'var(--r-pill)', border: '1px solid var(--line-1)' }}>
            {(['damage', 'speed'] as const).map((v) => {
              const on = view === v;
              return (
                <button key={v} onClick={() => setView(v)} style={{
                  flex: 1, padding: '5px 0', borderRadius: 'var(--r-pill)', cursor: 'pointer',
                  background: on ? 'var(--accent-soft)' : 'transparent',
                  border: `1px solid ${on ? 'var(--accent-soft-line)' : 'transparent'}`,
                  fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 700,
                  color: on ? 'var(--accent)' : 'var(--ink-3)',
                  transition: 'background var(--dur) var(--ease), color var(--dur) var(--ease)',
                }}>
                  {v === 'damage' ? 'Damage' : 'Speed'}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setDir((d) => (d === 'p1' ? 'p2' : 'p1'))}
            aria-label="Swap direction"
            style={{ width: 32, height: 32, flex: '0 0 auto', borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', cursor: 'pointer' }}
          >
            <Icon name="arrow-left-right" size={15} color="var(--ink-2)" />
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>
          {r?.moveName ?? 'No move'} · <span style={{ color: 'var(--ink-1)' }}>{nameOf(state[dir].selectedId)}</span> vs{' '}
          <span style={{ color: 'var(--ink-1)' }}>{nameOf(state[defDir].selectedId)}</span>
        </div>

        {view === 'damage' ? (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-readout)', lineHeight: 1 }}>{pct}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>{dmg}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <KOVerdict verdict={ko.verdict} confidence={ko.confidence} tone={ko.tone} />
            </div>
            {r && (
              <div style={{ height: 7, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${Math.min(100, r.minPercent)}%`, background: 'var(--danger)' }} />
                <div style={{ width: `${Math.min(100, r.maxPercent) - Math.min(100, r.minPercent)}%`, background: 'var(--danger-soft)', borderLeft: '1px solid var(--danger-line)' }} />
              </div>
            )}
            {(scenarios.crit || scenarios.maxBulk || scenarios.noSp) && (
              <div>
                <Micro style={{ marginBottom: 8 }}>Scenarios</Micro>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <ScenarioRow label="Crit" range={scenarios.crit} />
                  <ScenarioRow label="Opp. max bulk" range={scenarios.maxBulk} />
                  <ScenarioRow label="Opp. no SP" range={scenarios.noSp} />
                </div>
              </div>
            )}
            <ArenaFieldConditions state={state} dispatch={dispatch} />
            <button
              onClick={() => setAdvancedSide(dir)}
              style={{ minHeight: 40, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', color: 'var(--text-body)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer' }}
            >
              Advanced
            </button>
          </>
        ) : (
          <>
            <div>
              <Micro style={{ marginBottom: 6 }}>{`You — ${nameOf(state[dir].selectedId)}`}</Micro>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--ink-1)', lineHeight: 1 }}>{speed.yours.actual}</div>
                <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                  <StatChip label="Scarf" value={speed.yours.scarf} tone="accent" />
                  <StatChip label="Tailwind" value={speed.yours.tailwind} />
                </div>
              </div>
              <RankStepper
                label="Spe rank"
                ariaPrefix="speed"
                value={state[dir].stages.spe || 0}
                onChange={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: dir, stat: 'spe', val } })}
              />
            </div>
            <div>
              <Micro style={{ marginBottom: 4 }}>{`Opponent — ${nameOf(state[defDir].selectedId)}`}</Micro>
              {speed.tiers.map((t) => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line-1)' }}>
                  <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{t.label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{t.value}</span>
                  <Badge tone={t.outcome === 'faster' ? 'safe' : t.outcome === 'tie' ? 'field' : 'danger'}>
                    {t.outcome === 'faster' ? 'Faster' : t.outcome === 'tie' ? 'Tie' : 'Outsped'}
                  </Badge>
                </div>
              ))}
              <RankStepper
                label="Opp. spe rank"
                ariaPrefix="opponent speed"
                value={state[defDir].stages.spe || 0}
                onChange={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: defDir, stat: 'spe', val } })}
              />
            </div>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)' }}>
              Stat = floor((base + 20 + SP) × nature)
            </code>
          </>
        )}
      </div>

      {/* -------- defender (p2) -------- */}
      <Panel side="right" badge={<Badge tone="danger">Opponent</Badge>}>
        {defenderExtra}
        <Identity s={state.p2} name={nameOf(state.p2.selectedId)} tone="danger" onClick={() => setPicker({ side: 'p2', field: 'species' })} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Micro>HP</Micro>
          <div style={{ flex: 1, height: 7, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${state.p2.hpPercent}%`, height: '100%', background: 'var(--safe)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)' }}>{state.p2.hpPercent}%</span>
        </div>
        <SelectRow label="Move" value={state.p2.moves[state.p2.activeMoveIndex]?.nameEn ?? 'None'} onClick={() => setMovePickerSide('p2')} />
        <SelectRow label="Ability" value={state.p2.activeAbility ?? 'None'} onClick={() => setPicker({ side: 'p2', field: 'ability' })} />
        <SelectRow label="Item" value={state.p2.item ?? 'None'} leading={<ItemIcon item={state.p2.item} size={18} />} onClick={() => setPicker({ side: 'p2', field: 'item' })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <TuneBox label="Nature" value={natureShort(state.p2)} onClick={() => setPicker({ side: 'p2', field: 'nature' })} />
          <TuneBox label="HP SP" value={state.p2.spHp} active={state.p2.spHp > 0} onClick={() => setAdvancedSide('p2')} />
          <TuneBox label="Def SP" value={state.p2.spDef} active={state.p2.spDef > 0} onClick={() => setAdvancedSide('p2')} />
          <TuneBox label="SpD SP" value={state.p2.spSpd} active={state.p2.spSpd > 0} onClick={() => setAdvancedSide('p2')} />
        </div>
        <button
          onClick={onOpenScan}
          style={{ minHeight: 40, borderRadius: 'var(--r-sm)', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)', color: 'var(--accent-hover)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 700, cursor: 'pointer' }}
        >
          Scan opponent
        </button>
      </Panel>

      {/* -------- sheets (same wiring as portrait) -------- */}
      <ArenaAdvancedSheet
        open={!!advancedSide}
        side={advancedSide ?? 'p1'}
        onClose={() => setAdvancedSide(null)}
        state={state}
        dispatch={dispatch}
        onApplySpread={onApplySpread}
        onResetBuild={onResetBuild}
        onImportShowdown={() => { const s = advancedSide; setAdvancedSide(null); setShowdownSide(s); }}
      />
      <ArenaMovePickerSheet
        open={!!movePickerSide}
        side={movePickerSide ?? 'p1'}
        onClose={() => setMovePickerSide(null)}
        state={state}
        dispatch={dispatch}
        moveList={moveList}
        results={movePickerSide === 'p2' ? p2Results : p1Results}
      />
      <ArenaPickerSheet
        picker={picker}
        onClose={() => setPicker(null)}
        state={state}
        dispatch={dispatch}
        pokemonList={pokemonList}
        actions={actions}
        autoFocus={false}
      />
      <ShowdownImportModal
        isOpen={!!showdownSide}
        onClose={() => setShowdownSide(null)}
        onImport={(set) => { if (showdownSide) actions.handleImportShowdown(showdownSide, set); setShowdownSide(null); }}
      />
    </div>
  );
}
