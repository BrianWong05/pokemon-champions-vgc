import React from 'react';
import type { CalcState, CalcAction } from '@/features/damage-calculator/hooks/useCalculatorState';
import type { Spread } from '@/features/damage-calculator/utils/common-spreads';
import { COMMON_SPREADS } from '@/features/damage-calculator/utils/common-spreads';
import { TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';
import { AEGISLASH_ID } from '@/features/pokemon/hooks/usePokemonEditor';
import { Sheet, Toggle } from '@/design-system/arena';

const SIDE_EFFECTS: { key: 'isReflect' | 'isLightScreen' | 'isAuroraVeil' | 'isHelpingHand' | 'isFriendGuard' | 'isTailwind'; label: string }[] = [
  { key: 'isReflect', label: 'Reflect' },
  { key: 'isLightScreen', label: 'Light screen' },
  { key: 'isAuroraVeil', label: 'Aurora veil' },
  { key: 'isHelpingHand', label: 'Helping hand' },
  { key: 'isFriendGuard', label: 'Friend guard' },
  { key: 'isTailwind', label: 'Tailwind' },
];
const STAGE_STATS: { key: string; label: string }[] = [
  { key: 'atk', label: 'Atk' }, { key: 'def', label: 'Def' }, { key: 'spa', label: 'SpA' },
  { key: 'spd', label: 'SpD' }, { key: 'spe', label: 'Spe' },
];

const stepBtn: React.CSSProperties = {
  width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 'var(--r-sm)',
  background: 'var(--surface-inset)', border: '1px solid var(--line-2)', color: 'var(--ink-1)',
  fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)',
};
const darkSelect: React.CSSProperties = {
  flex: 1, height: 40, background: 'var(--surface-inset)', border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-sm)', color: 'var(--ink-1)', padding: '0 10px', fontFamily: 'var(--font-ui)',
  fontSize: 'var(--fs-sm)', fontWeight: 600, colorScheme: 'dark',
};
const actionBtn: React.CSSProperties = {
  minHeight: 44, padding: '0 14px', borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)',
  border: '1px solid var(--line-2)', color: 'var(--ink-1)', fontFamily: 'var(--font-ui)',
  fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer',
};

function Stepper({ value, min, max, step = 1, onChange, suffix = '' }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button style={stepBtn} onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span style={{ minWidth: 48, textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink-1)' }}>{value}{suffix}</span>
      <button style={stepBtn} onClick={() => onChange(Math.min(max, value + step))}>＋</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '1px solid var(--line-1)' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 }}>
      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
}

/**
 * ArenaAdvancedSheet — all overflow controls for one side, in the DS bottom Sheet:
 * build presets + Showdown import, HP%, stat stages, screens/support, per-move crit
 * & multi-hit, Beast Boost count, type override, Aegislash form.
 */
export function ArenaAdvancedSheet({ open, onClose, side, state, dispatch, onApplySpread, onResetBuild, onImportShowdown }: {
  open: boolean;
  onClose: () => void;
  side: 'p1' | 'p2';
  state: CalcState;
  dispatch: React.Dispatch<CalcAction>;
  onApplySpread: (side: 'p1' | 'p2', spread: Spread) => void;
  onResetBuild: (side: 'p1' | 'p2') => void;
  onImportShowdown: () => void;
}) {
  const s = state[side];
  const types = Object.keys(TYPE_IDS);

  return (
    <Sheet open={open} onClose={onClose} title="Advanced">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Build */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {COMMON_SPREADS.map((sp) => (
            <button key={sp.id} style={actionBtn} onClick={() => onApplySpread(side, sp)}>{sp.label}</button>
          ))}
          <button style={actionBtn} onClick={() => onResetBuild(side)}>Reset build</button>
          <button style={actionBtn} onClick={onImportShowdown}>Import from Showdown</button>
        </div>

        <Section title="Current HP">
          <Row label={`${s.hpPercent}%`}>
            <Stepper value={s.hpPercent} min={0} max={100} step={5} suffix="%" onChange={(v) => dispatch({ type: 'SET_HP_PERCENT', payload: { side, val: v } })} />
          </Row>
        </Section>

        <Section title="Stat stages">
          {STAGE_STATS.map(({ key, label }) => (
            <Row key={key} label={label}>
              <Stepper value={s.stages[key] ?? 0} min={-6} max={6} onChange={(v) => dispatch({ type: 'SET_STAT_STAGE', payload: { side, stat: key, val: v } })} />
            </Row>
          ))}
        </Section>

        <Section title="Screens & support">
          {SIDE_EFFECTS.map(({ key, label }) => (
            <Row key={key} label={label}>
              <Toggle on={s[key]} onChange={() => dispatch({ type: 'TOGGLE_SIDE_EFFECT', payload: { side, effect: key } })} />
            </Row>
          ))}
        </Section>

        <Section title="Field auras">
          <Row label="Fairy aura">
            <Toggle on={state.isFairyAura} onChange={() => dispatch({ type: 'TOGGLE_FIELD_AURA', payload: 'isFairyAura' })} />
          </Row>
          <Row label="Dark aura">
            <Toggle on={state.isDarkAura} onChange={() => dispatch({ type: 'TOGGLE_FIELD_AURA', payload: 'isDarkAura' })} />
          </Row>
          <Row label="Aura break">
            <Toggle on={state.isAuraBreak} onChange={() => dispatch({ type: 'TOGGLE_FIELD_AURA', payload: 'isAuraBreak' })} />
          </Row>
        </Section>

        <Section title="Moves — crit & hits">
          {[0, 1, 2, 3].map((i) => {
            const m = s.moves[i];
            if (!m) return null;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-1)', fontWeight: 700 }}>{m.nameEn}</div>
                <Row label="Always crit">
                  <Toggle on={s.movesForceCrit[i]} onChange={() => dispatch({ type: 'TOGGLE_MOVE_CRIT', payload: { side, index: i } })} />
                </Row>
                <Row label="Hits">
                  <Stepper value={s.movesHits[i]} min={1} max={5} onChange={(v) => dispatch({ type: 'SET_MOVE_HITS', payload: { side, index: i, val: v } })} />
                </Row>
              </div>
            );
          })}
        </Section>

        <Section title="Beast Boost">
          <Row label="Pokémon fainted">
            <Stepper value={s.faintedCount} min={0} max={5} onChange={(v) => dispatch({ type: 'SET_FAINTED_COUNT', payload: { side, val: v } })} />
          </Row>
        </Section>

        <Section title="Type override">
          <Row label="Override types">
            <Toggle on={s.isTypeOverridden} onChange={() => dispatch({ type: 'TOGGLE_TYPE_OVERRIDE', payload: { side } })} />
          </Row>
          {s.isTypeOverridden && (
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={darkSelect} value={s.type1 ?? ''} onChange={(e) => dispatch({ type: 'SET_TYPE', payload: { side, slot: 1, type: e.target.value } })}>
                {types.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <select style={darkSelect} value={s.type2 ?? 'none'} onChange={(e) => dispatch({ type: 'SET_TYPE', payload: { side, slot: 2, type: e.target.value === 'none' ? null : e.target.value } })}>
                <option value="none">None</option>
                {types.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          )}
        </Section>

        {s.selectedId === AEGISLASH_ID && (
          <Section title="Aegislash">
            <Row label={`Stance: ${s.form ?? 'Shield'}`}>
              <button style={actionBtn} onClick={() => dispatch({ type: 'TOGGLE_AEGISLASH_FORM', payload: { side } })}>
                Switch to {s.form === 'Blade' ? 'Shield' : 'Blade'}
              </button>
            </Row>
          </Section>
        )}
      </div>
    </Sheet>
  );
}
