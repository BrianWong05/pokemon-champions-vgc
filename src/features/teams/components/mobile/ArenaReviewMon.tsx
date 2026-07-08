import React, { useState } from 'react';
import { Icon, Sprite, TypeBadge } from '@/design-system/arena';
import type { TeamWithMembers } from '@/db/repositories/team.repo';
import type { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';
import type { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import type { MoveData } from '@/components/molecules/MoveSearchSelect';
import { championsHP, championsStat } from '@/features/pokemon/utils/champions-stats';
import { convertSpToEv } from '@/features/pokemon/utils/sp-ev-converter';
import { getNatureFromStats } from '@/features/pokemon/utils/pokemon-natures';
import { formatShowdownSet } from '@/features/pokemon/utils/showdown-formatter';
import { REVERSE_TYPE_IDS } from '@/features/pokemon/utils/pokemon-types';

export interface ArenaReviewMonProps {
  member: TeamWithMembers['members'][number];
  teamName: string;
  pokemonList: PokemonBaseStats[];
  moveList: MoveData[];
  onBack: () => void;
  onSave: (config: PokemonConfig) => void;
  onSendToCalc?: () => void;
  saveLabel?: string;
}

const STATS: { key: string; label: string; short: string; ev: string; baseKey: keyof PokemonConfig; spKey: keyof PokemonConfig }[] = [
  { key: 'hp', label: 'HP', short: 'H', ev: 'HP', baseKey: 'baseHp', spKey: 'spHp' },
  { key: 'atk', label: 'Atk', short: 'A', ev: 'Atk', baseKey: 'baseAtk', spKey: 'spAtk' },
  { key: 'def', label: 'Def', short: 'B', ev: 'Def', baseKey: 'baseDef', spKey: 'spDef' },
  { key: 'spa', label: 'SpA', short: 'C', ev: 'SpA', baseKey: 'baseSpa', spKey: 'spSpa' },
  { key: 'spd', label: 'SpD', short: 'D', ev: 'SpD', baseKey: 'baseSpd', spKey: 'spSpd' },
  { key: 'spe', label: 'Spe', short: 'S', ev: 'Spe', baseKey: 'baseSpe', spKey: 'spSpe' },
];
const SP_MAX = 32;

const micro: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' };
const textInput: React.CSSProperties = {
  flex: 1, minWidth: 0, padding: '7px 10px', background: 'var(--surface-inset)', border: '1px solid var(--line-2)',
  borderRadius: 'var(--r-sm)', color: 'var(--ink-1)', fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: 600, outline: 'none',
};
const footerBtn = (primary: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7, height: 40, padding: primary ? '0 17px' : '0 13px', flex: 'none',
  borderRadius: 'var(--r-sm)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: primary ? 13 : 12, fontWeight: 700, whiteSpace: 'nowrap',
  background: primary ? 'var(--accent)' : 'var(--surface-inset)', border: primary ? 'none' : '1px solid var(--line-2)',
  color: primary ? '#0a0f1a' : 'var(--ink-2)',
});

/**
 * ArenaReviewMon — the per-Pokémon "Review & save" screen (Turn 3c of the Arena
 * design). Stats and moves merge into one editable profile: moves / ability /
 * item on the left, derived stats with editable SP on the right. Tap a stat to
 * cycle its nature (boost / lower). EVs are auto-derived for Showdown export.
 *
 * Note: the app uses Champions SP (0–32) via championsStat — the same numbers
 * the calculator shows — rather than the mock's raw 0–252 EVs.
 */
export const ArenaReviewMon: React.FC<ArenaReviewMonProps> = ({ member, teamName, pokemonList, moveList, onBack, onSave, onSendToCalc, saveLabel }) => {
  const c = member.configuration;
  const species = pokemonList.find((p) => p.id === c.selectedId);
  const [sp, setSp] = useState<Record<string, number>>({
    spHp: c.spHp, spAtk: c.spAtk, spDef: c.spDef, spSpa: c.spSpa, spSpd: c.spSpd, spSpe: c.spSpe,
  });
  const [up, setUp] = useState<string | null>(c.boostedStat);
  const [down, setDown] = useState<string | null>(c.hinderedStat);
  const [item, setItem] = useState(c.item ?? '');
  const [ability, setAbility] = useState(c.activeAbility ?? '');
  const [moves, setMoves] = useState<(MoveData | null)[]>([0, 1, 2, 3].map((i) => c.moves[i] ?? null));

  const setSpVal = (spKey: string, v: number) => {
    const targetVal = Math.max(0, Math.min(SP_MAX, v || 0));
    const currentTotalWithoutThis = STATS.reduce((sum, s) => {
      if (s.spKey === spKey) return sum;
      return sum + sp[s.spKey as string];
    }, 0);
    const maxAllowed = Math.max(0, 66 - currentTotalWithoutThis);
    const cappedVal = Math.min(targetVal, maxAllowed);
    setSp((prev) => ({ ...prev, [spKey]: cappedVal }));
  };
  const natMult = (key: string) => (up === key ? 1.1 : down === key ? 0.9 : 1.0);
  const valueFor = (key: string, baseKey: keyof PokemonConfig, spKey: keyof PokemonConfig) => {
    const base = c[baseKey] as number;
    return key === 'hp' ? championsHP(base, sp[spKey as string]) : championsStat(base, sp[spKey as string], natMult(key));
  };
  const cycleNature = (key: string) => {
    if (key === 'hp') return;
    const role = up === key ? 'up' : down === key ? 'down' : 'none';
    if (role === 'none') { setUp(key); setDown((d) => (d === key ? null : d)); }
    else if (role === 'up') { setUp(null); setDown(key); }
    else { setDown(null); }
  };

  const setMove = (i: number, name: string) => {
    const m = moveList.find((mv) => mv.nameEn.toLowerCase() === name.trim().toLowerCase()) ?? null;
    setMoves((prev) => prev.map((v, idx) => (idx === i ? m : v)));
  };

  const buildConfig = (): PokemonConfig => ({
    ...c,
    spHp: sp.spHp, spAtk: sp.spAtk, spDef: sp.spDef, spSpa: sp.spSpa, spSpd: sp.spSpd, spSpe: sp.spSpe,
    boostedStat: up, hinderedStat: down, nature: getNatureFromStats(up, down),
    item: item.trim() || null, activeAbility: ability.trim() || null, moves,
  });

  const evParts = STATS.filter((s) => convertSpToEv(sp[s.spKey as string]) > 0).map((s) => `${convertSpToEv(sp[s.spKey as string])} ${s.ev}`);
  const evTotal = STATS.reduce((a, s) => a + convertSpToEv(sp[s.spKey as string]), 0);
  const spTotal = STATS.reduce((a, s) => a + sp[s.spKey as string], 0);

  const exportShowdown = () => {
    const text = formatShowdownSet(buildConfig(), species?.nameEn ?? 'Pokemon');
    void navigator.clipboard?.writeText(text).catch(() => {});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, background: 'var(--bg-page)', color: 'var(--text-body)', fontFamily: 'var(--font-ui)' }}>
      {/* header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderBottom: '1px solid var(--line-1)' }}>
        <button onClick={onBack} aria-label="Back to team" style={{ width: 30, height: 30, flex: 'none', borderRadius: 'var(--r-sm)', display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid var(--line-1)', color: 'var(--ink-2)', cursor: 'pointer' }}>
          <Icon name="chevron-right" size={16} color="var(--ink-2)" style={{ transform: 'scaleX(-1)' }} />
        </button>
        <div style={{ width: 40, height: 40, flex: 'none', display: 'grid', placeItems: 'center', background: 'var(--surface-inset)', borderRadius: 'var(--r-md)', border: '2px solid var(--accent)', boxShadow: '0 0 0 3px var(--accent-soft)', overflow: 'hidden' }}>
          <Sprite dex={c.selectedId} size={36} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{species?.nameEn ?? 'Unknown'}</div>
          {species && (
            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
              <TypeBadge type={(species.type1 as string) || 'normal'} size="sm" />
              {species.type2 && <TypeBadge type={species.type2 as string} size="sm" />}
            </div>
          )}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 11px', borderRadius: 'var(--r-pill)', background: 'var(--safe-soft)', border: '1px solid var(--safe-line)' }}>
          <Icon name="scan-line" size={12} color="var(--safe)" />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--safe)' }}>Stats + Moves merged</span>
        </span>
      </div>

      {/* body: moves | stats */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* LEFT: moves · ability · item */}
        <div style={{ width: '48%', flex: 'none', overflowY: 'auto', scrollbarWidth: 'none', borderRight: '1px solid var(--line-1)', padding: '13px 15px' }}>
          <div style={{ ...micro, marginBottom: 11 }}>Moves · ability · item</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 58, flex: 'none', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)' }}>Held item</span>
              <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Held item" style={textInput} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 58, flex: 'none', fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)' }}>Ability</span>
              <select
                value={ability}
                onChange={(e) => setAbility(e.target.value)}
                style={{
                  ...textInput,
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='var%28--ink-3%29' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  backgroundSize: '12px',
                  paddingRight: '30px',
                }}
              >
                {(c.abilities && c.abilities.length > 0 ? c.abilities : [ability]).map((a) => (
                  <option key={a} value={a} style={{ background: 'var(--surface-inset)', color: 'var(--ink-1)' }}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ height: 1, background: 'var(--line-1)', margin: '3px 0' }} />
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>Moves</div>
            {[0, 1, 2, 3].map((i) => {
              const type = moves[i] ? (REVERSE_TYPE_IDS[moves[i]!.typeId] ?? 'normal') : null;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 16, height: 16, flex: 'none', borderRadius: 5, background: type ? `var(--type-${type})` : 'var(--line-2)' }} />
                  <input list="review-moves-dl" defaultValue={moves[i]?.nameEn ?? ''} onChange={(e) => setMove(i, e.target.value)} placeholder={`Move ${i + 1}`} style={textInput} />
                </div>
              );
            })}
            <datalist id="review-moves-dl">{moveList.map((m) => <option key={m.id} value={m.nameEn} />)}</datalist>
          </div>
        </div>

        {/* RIGHT: stats + SP + auto EV */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '13px 16px' }}>
          <div style={micro}>Stats</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-4)', margin: '5px 0 10px', lineHeight: 1.35 }}>Final stats are derived — edit the SP investment (type or slide).</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11, padding: '8px 10px', borderRadius: 'var(--r-sm)', background: 'var(--surface-inset)', border: '1px solid var(--line-1)' }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>Nature</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 700, color: 'var(--ink-1)' }}>{getNatureFromStats(up, down)}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'var(--ink-4)' }}>Tap a stat: ↑ boost / ↓ lower</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {STATS.map((s) => {
              const role = s.key === 'hp' ? 'none' : up === s.key ? 'up' : down === s.key ? 'down' : 'none';
              const arrow = role === 'up' ? ' ↑' : role === 'down' ? ' ↓' : '';
              const isH = s.key === 'hp';
              return (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <button
                    onClick={() => cycleNature(s.key)}
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 26, flex: 'none', borderRadius: 6, cursor: isH ? 'default' : 'pointer', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                      background: role === 'up' ? 'var(--safe-soft)' : role === 'down' ? 'var(--danger-soft)' : 'var(--surface-inset)',
                      border: `1px solid ${role === 'up' ? 'var(--safe-line)' : role === 'down' ? 'var(--danger-line)' : 'var(--line-2)'}`,
                      color: role === 'up' ? 'var(--safe)' : role === 'down' ? 'var(--danger)' : (isH ? 'var(--ink-4)' : 'var(--ink-2)') }}
                  >{s.short}{arrow}</button>
                  <span style={{ width: 30, flex: 'none', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--ink-1)' }}>{valueFor(s.key, s.baseKey, s.spKey)}</span>
                  <input type="range" min={0} max={SP_MAX} value={sp[s.spKey as string]} onChange={(e) => setSpVal(s.spKey as string, Number(e.target.value))} style={{ flex: 1, minWidth: 0, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                  <input value={sp[s.spKey as string]} onChange={(e) => setSpVal(s.spKey as string, Number(e.target.value))} inputMode="numeric" style={{ width: 46, flex: 'none', padding: '4px 6px', background: 'var(--surface-inset)', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)', color: 'var(--ink-1)', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11, paddingTop: 9, borderTop: '1px solid var(--line-1)' }}>
            <span style={{ ...micro, letterSpacing: '0.04em' }}>SPs</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 12.5, fontWeight: 700, color: spTotal > 66 ? 'var(--danger)' : 'var(--ink-1)' }}>{spTotal} / 66</span>
          </div>
          <div style={{ marginTop: 11, padding: '10px 12px', borderRadius: 'var(--r-md)', background: 'var(--accent-soft)', border: '1px solid var(--accent-soft-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <Icon name="scan-line" size={12} color="var(--accent)" />
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)' }}>Auto-calculated EVs</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink-1)', lineHeight: 1.4 }}>{evParts.length ? evParts.join(' / ') : '0 EVs'}</div>
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 16px', borderTop: '1px solid var(--line-1)', background: 'var(--surface-sticky)' }}>
        <span style={{ fontSize: 10.5, color: 'var(--ink-3)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamName} · ready to save.</span>
        <button onClick={exportShowdown} style={footerBtn(false)}><Icon name="clipboard-paste" size={15} color="var(--ink-2)" />Export Showdown</button>
        {onSendToCalc && <button onClick={onSendToCalc} style={footerBtn(false)}><Icon name="calculator" size={15} color="var(--ink-2)" />Send to calc</button>}
        <button onClick={() => onSave(buildConfig())} style={footerBtn(true)}><Icon name="check" size={16} color="#0a0f1a" />{saveLabel ?? 'Save to team'}</button>
      </div>
    </div>
  );
};
