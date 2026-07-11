import React, { useState } from 'react';
import type { CalcState, CalcAction, SideState } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { DamageResult } from '@/components/organisms/ResultsPanel';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import type { Spread } from '@/features/damage-calculator/utils/common-spreads';
import { useCalculatorActions } from '@/features/damage-calculator/hooks/useCalculatorActions';
import { useDamageScenarios, ScenarioRange } from '@/features/damage-calculator/hooks/useDamageScenarios';
import { buildSpeedCompare, speedFormula, fmtStage } from '@/features/damage-calculator/utils/speed';
import { REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { Sprite, SelectRow, ItemIcon, KOVerdict, koVerdictFromText, Icon, Badge, TypeBadge } from '@/design-system/arena';
import { ArenaPickerSheet, CorePickerField } from './ArenaPickerSheet';
import { ArenaBattlefieldRow } from './ArenaBattlefieldRow';
import { ArenaMovePickerSheet } from './ArenaMovePickerSheet';
import { ArenaAdvancedSheet } from './ArenaAdvancedSheet';
import { ArenaStatCard } from './ArenaStatCard';
import { ArenaMoveList } from './ArenaMoveList';
import { ArenaSideConditions } from './ArenaSideConditions';
import { ArenaSpeedCompareView } from './ArenaSpeedCompareView';
import ShowdownImportModal from '@/components/organisms/ShowdownImportModal';

type Side = 'p1' | 'p2';
type Actions = ReturnType<typeof useCalculatorActions>;

const STAT_LABEL: Record<string, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

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

function Panel({ side, badge, onCollapse, children }: {
  side: 'left' | 'right'; badge: React.ReactNode; onCollapse: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{
      // ponytail: --safe-right is the island-aware right inset (zeroed when the island
      // sits left; see island.ts) — the surface bleeds under it, content stays clear.
      width: side === 'right'
        ? 'calc(clamp(228px, 25%, 300px) + var(--safe-right))'
        : 'clamp(228px, 25%, 300px)',
      marginRight: side === 'right' ? 'calc(-1 * var(--safe-right))' : undefined,
      flex: '0 0 auto', overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none',
      background: 'var(--surface-sticky)',
      borderRight: side === 'left' ? '1px solid var(--line-1)' : 'none',
      borderLeft: side === 'right' ? '1px solid var(--line-1)' : 'none',
      padding: side === 'right' ? '10px calc(12px + var(--safe-right)) 12px 12px' : '10px 12px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <Micro style={{ letterSpacing: '0.07em' }}>{side === 'left' ? 'Attacker' : 'Defender'}</Micro>
        <button onClick={onCollapse} aria-label={`Collapse ${side === 'left' ? 'attacker' : 'defender'}`} style={{
          width: 24, height: 24, marginLeft: 6, marginRight: 6, borderRadius: 6, background: 'transparent',
          border: '1px solid var(--line-1)', color: 'var(--ink-3)', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}>
          <Icon name="chevron-right" size={14} color="var(--ink-3)" style={{ transform: side === 'left' ? 'scaleX(-1)' : undefined }} />
        </button>
        <span style={{ flex: 1 }} />
        {badge}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function Rail({ side, name, dex, tone, item, hpPercent, subline, onExpand }: {
  side: 'left' | 'right'; name: string; dex: number | null; tone: 'accent' | 'danger';
  item?: string | null; hpPercent?: number; subline?: React.ReactNode; onExpand: () => void;
}) {
  return (
    <aside style={{
      width: side === 'right' ? 'calc(88px + var(--safe-right))' : 88,
      marginRight: side === 'right' ? 'calc(-1 * var(--safe-right))' : undefined,
      flex: 'none', background: 'var(--surface-sticky)',
      borderRight: side === 'left' ? '1px solid var(--line-1)' : 'none',
      borderLeft: side === 'right' ? '1px solid var(--line-1)' : 'none',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      padding: side === 'right' ? '12px calc(8px + var(--safe-right)) 12px 8px' : '12px 8px',
    }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', color: tone === 'accent' ? 'var(--ink-3)' : 'var(--danger)' }}>
        {side === 'left' ? 'You' : 'Opp'}
      </div>
      <Sprite dex={dex} name={name} size={46} ring tone={tone} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-1)', textAlign: 'center', lineHeight: 1.2 }}>{name || '—'}</div>
      {hpPercent != null && (
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{hpPercent}%</div>
      )}
      {item && <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.2 }}>{item}</div>}
      {subline}
      <span style={{ flex: 1 }} />
      <button onClick={onExpand} aria-label={`Expand ${side === 'left' ? 'attacker' : 'defender'}`} style={{
        width: 40, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)',
        color: 'var(--ink-2)', cursor: 'pointer', display: 'grid', placeItems: 'center',
      }}>
        <Icon name="chevron-right" size={18} color="var(--ink-2)" style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }} />
      </button>
    </aside>
  );
}

function ScenarioRow({ label, range }: { label: string; range: ScenarioRange | null }) {
  if (!range) return null;
  const danger = range.maxPercent >= 100;
  const ko = koVerdictFromText(range.koChanceText);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ flex: 1, fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap' }}>
          {range.minPercent}–{range.maxPercent}%
        </span>
        {range.koChanceText && <Badge tone={ko.tone}>{ko.verdict}</Badge>}
      </div>
      <div style={{ marginTop: 4, height: 5, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, range.maxPercent)}%`, height: '100%', background: danger ? 'var(--danger)' : 'var(--safe)', opacity: 0.85 }} />
      </div>
    </div>
  );
}

const hpStep: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)',
  border: '1px solid var(--line-2)', color: 'var(--ink-2)',
  fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
};

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
  const [collapsed, setCollapsed] = useState<{ p1: boolean; p2: boolean }>({ p1: false, p2: false });
  const toggleCollapsed = (s: Side) => setCollapsed((c) => ({ ...c, [s]: !c[s] }));

  const defDir: Side = dir === 'p1' ? 'p2' : 'p1';
  const nameOf = (id: number | null) => pokemonList.find((p) => p.id === id)?.nameEn ?? '—';
  const scenarios = useDamageScenarios(state, pokemonList, dir);
  const results = dir === 'p1' ? p1Results : p2Results;
  const atk = state[dir];
  const r = results[atk.activeMoveIndex] ?? null;
  const ko = koVerdictFromText(r?.koChanceText);
  const pct = r ? `${isNaN(r.minPercent) ? '0.0' : r.minPercent}–${isNaN(r.maxPercent) ? '0.0' : r.maxPercent}%` : '—';
  const dmg = r ? `${r.minDamage}–${r.maxDamage} dmg` : 'Pick a move';
  const activeMove = atk.moves[atk.activeMoveIndex] as MoveData | null;
  const activeMoveType = activeMove ? REVERSE_TYPE_IDS[r?.moveType ?? activeMove.typeId] : null;

  const speed = buildSpeedCompare(
    {
      baseSpe: state[dir].baseSpe, spSpe: state[dir].spSpe,
      boostedStat: state[dir].boostedStat, hinderedStat: state[dir].hinderedStat,
      speStage: state[dir].stages.spe || 0, item: state[dir].item, isTailwind: state[dir].isTailwind,
    },
    { baseSpe: state[defDir].baseSpe, speStage: state[defDir].stages.spe || 0, isTailwind: state[defDir].isTailwind },
  );

  const natureShort = (s: SideState) =>
    s.boostedStat ? `+${STAT_LABEL[s.boostedStat] ?? s.boostedStat}` : '—';

  // Rank tune boxes: offensive stage for the attacker's active move category,
  // defensive stage for the defender vs. that same category. Physical → atk/def,
  // Special (or no active move) → spa/spd.
  const p1ActiveMove = state.p1.moves[state.p1.activeMoveIndex] as MoveData | null;
  const p1MoveIsPhysical = p1ActiveMove?.damageClassId === 2;
  const p1RankStat = p1MoveIsPhysical ? 'atk' : 'spa';
  const p2RankStat = p1MoveIsPhysical ? 'def' : 'spd';

  // Collapsed attacker rail shows the active move (type + name) instead of the item.
  const p1ActiveMoveType = p1ActiveMove
    ? REVERSE_TYPE_IDS[p1Results[state.p1.activeMoveIndex]?.moveType ?? p1ActiveMove.typeId]
    : null;
  const p1ActiveMoveSubline = p1ActiveMove ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      {p1ActiveMoveType && <TypeBadge type={p1ActiveMoveType} size="sm" />}
      <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--ink-4)', textAlign: 'center', lineHeight: 1.2 }}>{p1ActiveMove.nameEn}</div>
    </div>
  ) : undefined;

  return (
    <div style={{ display: 'flex', height: '100%', minWidth: 0, fontFamily: 'var(--font-ui)', color: 'var(--text-body)' }}>
      {/* -------- attacker (p1) -------- */}
      {collapsed.p1 ? (
        <Rail
          side="left"
          name={nameOf(state.p1.selectedId)}
          dex={state.p1.selectedId}
          tone="accent"
          subline={p1ActiveMoveSubline}
          onExpand={() => toggleCollapsed('p1')}
        />
      ) : (
        <Panel side="left" badge={<Badge tone="accent">You</Badge>} onCollapse={() => toggleCollapsed('p1')}>
          {attackerExtra}
          <ArenaStatCard side={state.p1} name={nameOf(state.p1.selectedId)} tone="accent" onOpenSpecies={() => setPicker({ side: 'p1', field: 'species' })} />
          <ArenaMoveList
            side={state.p1}
            results={p1Results}
            onSelect={(index) => dispatch({ type: 'SET_ACTIVE_MOVE_SLOT', payload: { side: 'p1', index } })}
            onEdit={() => setMovePickerSide('p1')}
          />
          <SelectRow label="Ability" value={state.p1.activeAbility ?? 'None'} onClick={() => setPicker({ side: 'p1', field: 'ability' })} />
          <SelectRow label="Item" value={state.p1.item ?? 'None'} leading={<ItemIcon item={state.p1.item} size={18} />} onClick={() => setPicker({ side: 'p1', field: 'item' })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <TuneBox label="Nature" value={natureShort(state.p1)} onClick={() => setPicker({ side: 'p1', field: 'nature' })} />
            <TuneBox
              label="Rank"
              value={fmtStage(state.p1.stages[p1RankStat] || 0)}
              active={(state.p1.stages[p1RankStat] || 0) !== 0}
              onClick={() => setAdvancedSide('p1')}
            />
            <TuneBox label="Atk SP" value={state.p1.spAtk} active={state.p1.spAtk > 0} onClick={() => setAdvancedSide('p1')} />
            <TuneBox label="SpA SP" value={state.p1.spSpa} active={state.p1.spSpa > 0} onClick={() => setAdvancedSide('p1')} />
          </div>
          <ArenaSideConditions side={state.p1} which="p1" dispatch={dispatch} />
        </Panel>
      )}

      {/* -------- center: result column -------- */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520, margin: '0 auto' }}>
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

        {view === 'damage' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {activeMoveType && <TypeBadge type={activeMoveType} size="sm" />}
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--ink-1)', letterSpacing: 'var(--ls-tight)', lineHeight: 1.05, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r?.moveName ?? 'No move'}
            </span>
            <span style={{ flex: 1 }} />
            <div style={{ display: 'flex', flex: '0 0 auto', border: '1px solid var(--line-1)', borderRadius: 'var(--r-pill)', overflow: 'hidden', background: 'var(--surface-inset)' }}>
              {([['Single', false], ['Spread', true]] as const).map(([label, spread]) => {
                const on = state.isSpreadTarget === spread;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_SPREAD_TARGET', payload: spread })}
                    style={{ padding: '4px 11px', cursor: 'pointer', border: 'none', fontFamily: 'var(--font-ui)', fontSize: 10.5, fontWeight: 700, lineHeight: 1.7, whiteSpace: 'nowrap', background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent)' : 'var(--ink-3)' }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-3)' }}>
          <span style={{ color: 'var(--ink-1)' }}>{nameOf(state[dir].selectedId)}</span> vs{' '}
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
            <ArenaBattlefieldRow state={state} dispatch={dispatch} />
          </>
        ) : (
          <ArenaSpeedCompareView
            compare={speed}
            layout="columns"
            youName={nameOf(state[dir].selectedId)}
            oppName={nameOf(state[defDir].selectedId)}
            oppBaseSpe={state[defDir].baseSpe}
            youStage={state[dir].stages.spe || 0}
            oppStage={state[defDir].stages.spe || 0}
            onYouStage={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: dir, stat: 'spe', val } })}
            onOppStage={(val) => dispatch({ type: 'SET_STAT_STAGE', payload: { side: defDir, stat: 'spe', val } })}
            formula={speedFormula(state[dir])}
            trickRoom={state.isTrickRoom}
          />
        )}
        <button
          onClick={() => setAdvancedSide(dir)}
          style={{ minHeight: 40, borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', color: 'var(--text-body)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer' }}
        >
          Advanced
        </button>
      </div>

      {/* -------- defender (p2) -------- */}
      {collapsed.p2 ? (
        <Rail
          side="right"
          name={nameOf(state.p2.selectedId)}
          dex={state.p2.selectedId}
          tone="danger"
          item={state.p2.item}
          hpPercent={state.p2.hpPercent}
          onExpand={() => toggleCollapsed('p2')}
        />
      ) : (
        <Panel side="right" badge={<Badge tone="danger">Opponent</Badge>} onCollapse={() => toggleCollapsed('p2')}>
          {defenderExtra}
          <button
            onClick={onOpenScan}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 40, borderRadius: 'var(--r-sm)', background: 'var(--danger-soft)', border: '1px solid var(--danger-line)', color: 'var(--danger)', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', fontWeight: 700, cursor: 'pointer' }}
          >
            <Icon name="scan-line" size={15} color="var(--danger)" />
            Scan opponent team
          </button>
          <ArenaStatCard side={state.p2} name={nameOf(state.p2.selectedId)} tone="danger" onOpenSpecies={() => setPicker({ side: 'p2', field: 'species' })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Micro>HP</Micro>
            <div style={{ flex: 1, height: 7, background: 'var(--surface-inset)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${state.p2.hpPercent}%`, height: '100%', background: 'var(--safe)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              aria-label="Defender HP percent"
              type="number" min={0} max={100} value={state.p2.hpPercent}
              onChange={(e) => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } })}
              style={{ width: 60, padding: '5px 8px', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)', color: 'var(--ink-1)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, textAlign: 'center' }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-4)' }}>% HP</span>
            <span style={{ flex: 1 }} />
            <button aria-label="Lower defender HP" onClick={() => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: Math.max(0, state.p2.hpPercent - 1) } })} style={hpStep}>−</button>
            <button aria-label="Raise defender HP" onClick={() => dispatch({ type: 'SET_HP_PERCENT', payload: { side: 'p2', val: Math.min(100, state.p2.hpPercent + 1) } })} style={hpStep}>+</button>
          </div>
          <SelectRow label="Move" value={state.p2.moves[state.p2.activeMoveIndex]?.nameEn ?? 'None'} onClick={() => setMovePickerSide('p2')} />
          <SelectRow label="Ability" value={state.p2.activeAbility ?? 'None'} onClick={() => setPicker({ side: 'p2', field: 'ability' })} />
          <SelectRow label="Item" value={state.p2.item ?? 'None'} leading={<ItemIcon item={state.p2.item} size={18} />} onClick={() => setPicker({ side: 'p2', field: 'item' })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <TuneBox label="Nature" value={natureShort(state.p2)} onClick={() => setPicker({ side: 'p2', field: 'nature' })} />
            <TuneBox label="HP SP" value={state.p2.spHp} active={state.p2.spHp > 0} onClick={() => setAdvancedSide('p2')} />
            <TuneBox label="Def SP" value={state.p2.spDef} active={state.p2.spDef > 0} onClick={() => setAdvancedSide('p2')} />
            <TuneBox label="SpD SP" value={state.p2.spSpd} active={state.p2.spSpd > 0} onClick={() => setAdvancedSide('p2')} />
            <TuneBox
              label="Rank"
              value={fmtStage(state.p2.stages[p2RankStat] || 0)}
              active={(state.p2.stages[p2RankStat] || 0) !== 0}
              onClick={() => setAdvancedSide('p2')}
            />
          </div>
          <ArenaSideConditions side={state.p2} which="p2" dispatch={dispatch} />
        </Panel>
      )}

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
