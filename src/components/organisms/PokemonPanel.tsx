import React from 'react';
import Typography from '@/components/atoms/Typography';
import { PokemonBaseStats } from '@/components/molecules/PokemonSearchSelect';
import { MoveData } from '@/components/molecules/MoveSearchSelect';
import { isMultiHitMove } from '@/utils/damage';
import { PokemonPreset } from '@/utils/pokemon-presets';
import PokemonConfigForm from './PokemonConfigForm';
import { calculateHP } from '@/utils/damage';

interface PokemonPanelProps {
  title: string;
  sideColor: string;
  side: 'p1' | 'p2';
  pokemonList: PokemonBaseStats[];
  selectedId: number | null;
  onSelectPokemon: (p: PokemonBaseStats) => void;
  onSelectPreset?: (preset: PokemonPreset) => void;
  stats: any;
  onSpChange: (key: string, val: number) => void;
  onNatureChange: (nature: string) => void;
  boostedStat: string | null;
  hinderedStat: string | null;
  onToggleNature: (stat: string, mod: '+' | '-') => void;
  stages: Record<string, number>;
  onStageChange: (stat: string, val: number) => void;
  moveList: MoveData[];
  moves: (MoveData | null)[];
  onSelectMove: (index: number, m: MoveData) => void;
  onClearMove: (index: number) => void;
  abilities: string[];
  activeAbility: string | null;
  onAbilityChange: (ability: string) => void;
  item: string | null;
  onItemChange: (item: string | null) => void;
  activeWeather: 'None' | 'Sun' | 'Rain' | 'Sandstorm' | 'Snow';
  hpPercent: number;
  onHpPercentChange: (val: number) => void;
  type1: string | null;
  type2: string | null;
  onTypeChange: (slot: 1 | 2, type: string | null) => void;
  isTypeOverridden: boolean;
  onToggleTypeOverride: () => void;
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isHelpingHand: boolean;
  isFriendGuard: boolean;
  isTailwind: boolean;
  onToggleSideEffect: (effect: 'isReflect' | 'isLightScreen' | 'isAuroraVeil' | 'isHelpingHand' | 'isFriendGuard' | 'isTailwind') => void;
  movesForceCrit: boolean[];
  onToggleMoveCrit: (index: number) => void;
  movesHits: number[];
  onUpdateMoveHits: (index: number, val: number) => void;
}

const PokemonPanel: React.FC<PokemonPanelProps> = (props) => {
  const {
    title, sideColor, side, hpPercent, onHpPercentChange, stats,
    isReflect, isLightScreen, isAuroraVeil, isHelpingHand, isFriendGuard, isTailwind,
    onToggleSideEffect, movesForceCrit, onToggleMoveCrit, movesHits, onUpdateMoveHits,
    stages, onStageChange
  } = props;

  const maxHp = calculateHP(stats.baseHp, stats.spHp);
  const currentHp = Math.floor(maxHp * (hpPercent / 100));

  const renderMoveActions = (move: MoveData | null, idx: number) => (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMoveCrit(idx);
        }}
        className={`
          px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-all border
          ${movesForceCrit[idx] 
            ? 'bg-red-500 border-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.4)]' 
            : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'}
        `}
        title="Force Critical Hit"
      >
        Crit
      </button>

      {move && isMultiHitMove(move.nameEn) && (
        <div className="flex items-center gap-1 bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 shadow-sm">
          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">Hits</span>
          <input 
            type="number"
            min="1"
            max="10"
            value={movesHits[idx]}
            onChange={(e) => onUpdateMoveHits(idx, parseInt(e.target.value, 10) || 1)}
            className="w-7 bg-transparent text-[10px] font-black text-indigo-700 text-center outline-none border-none"
          />
        </div>
      )}
    </>
  );

  return (
    <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 space-y-4 h-full">
      <PokemonConfigForm
        config={{
          selectedId: props.selectedId,
          type1: props.type1,
          type2: props.type2,
          baseHp: stats.baseHp,
          baseAtk: stats.baseAtk,
          baseDef: stats.baseDef,
          baseSpa: stats.baseSpa,
          baseSpd: stats.baseSpd,
          baseSpe: stats.baseSpe,
          spHp: stats.spHp,
          spAtk: stats.spAtk,
          spDef: stats.spDef,
          spSpa: stats.spSpa,
          spSpd: stats.spSpd,
          spSpe: stats.spSpe,
          boostedStat: props.boostedStat,
          hinderedStat: props.hinderedStat,
          nature: props.stats.nature || 'Hardy',
          moves: props.moves,
          activeMoveIndex: 0, 
          abilities: props.abilities,
          activeAbility: props.activeAbility,
          item: props.item,
          hpPercent: props.hpPercent,
          isTypeOverridden: props.isTypeOverridden,
        }}
        pokemonList={props.pokemonList}
        moveList={props.moveList}
        onSelectPokemon={props.onSelectPokemon}
        onSelectPreset={props.onSelectPreset}
        onSpChange={props.onSpChange}
        onNatureChange={props.onNatureChange}
        onToggleNature={props.onToggleNature}
        onStageChange={props.onStageChange}
        onSelectMove={props.onSelectMove}
        onClearMove={props.onClearMove}
        onAbilityChange={props.onAbilityChange}
        onItemChange={props.onItemChange}
        onTypeChange={props.onTypeChange}
        onToggleTypeOverride={props.onToggleTypeOverride}
        title={title}
        sideColor={sideColor}
        renderMoveActions={renderMoveActions}
      />

      <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100 flex items-center gap-3">
        <div className="flex flex-col min-w-[70px]">
          <Typography variant="label" className="text-gray-400 uppercase tracking-widest text-[8px] font-black leading-tight mb-0.5">Current HP</Typography>
          <span className="text-[9px] font-black text-indigo-600">
            {currentHp} / {maxHp} HP
          </span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={Math.round(hpPercent)} 
          onChange={(e) => onHpPercentChange(parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex items-center gap-1">
          <input 
            type="number" 
            min="0" 
            max={maxHp} 
            value={currentHp} 
            onChange={(e) => {
              const targetHp = Math.min(maxHp, Math.max(0, parseInt(e.target.value, 10) || 0));
              onHpPercentChange((targetHp / maxHp) * 100);
            }}
            className="w-10 bg-white border border-gray-200 text-center text-[10px] font-black text-indigo-600 rounded py-0.5 px-0.5 outline-none focus:border-indigo-400 transition-colors"
          />
          <span className="text-[9px] font-black text-gray-400 mr-1">/ {maxHp}</span>
          
          <input 
            type="number" 
            min="0" 
            max="100" 
            value={Math.round(hpPercent)} 
            onChange={(e) => onHpPercentChange(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="w-9 bg-white border border-gray-200 text-center text-[10px] font-black text-indigo-600 rounded py-0.5 px-0.5 outline-none focus:border-indigo-400 transition-colors"
          />
          <span className="text-[9px] font-black text-gray-400">%</span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-50">
        <Typography variant="label" className="text-gray-400 block mb-1 uppercase tracking-widest text-[10px] font-black">Support & Field Effects</Typography>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {[
            { id: 'isReflect', label: 'Reflect', value: isReflect },
            { id: 'isLightScreen', label: 'Light Screen', value: isLightScreen },
            { id: 'isAuroraVeil', label: 'Aurora Veil', value: isAuroraVeil },
            { id: 'isHelpingHand', label: 'Helping Hand', value: isHelpingHand },
            { id: 'isFriendGuard', label: 'Friend Guard', value: isFriendGuard },
            { id: 'isTailwind', label: 'Tailwind', value: isTailwind },
          ].map((effect) => (
            <label key={effect.id} className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={effect.value} 
                onChange={() => onToggleSideEffect(effect.id as any)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                {effect.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PokemonPanel;
