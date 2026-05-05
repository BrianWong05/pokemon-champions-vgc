import { calculate, Pokemon, Move, Field, Generations, Result } from '@smogon/calc';

/**
 * Pokémon Champions Stat and Damage Formulas (Level 50 VGC)
 */

export const calculateHP = (base: number, sp: number): number => {
  return base + 75 + sp;
};

export const calculateStat = (
  base: number, 
  sp: number, 
  nature: number, 
  stage: number = 0,
  abilityMultiplier: number = 1.0
): number => {
  const raw = Math.floor((base + 20 + sp) * nature);
  const withStage = Math.floor(raw * getStageMultiplier(stage));
  return Math.floor(withStage * abilityMultiplier);
};

export const getModifiedMoveType = (
  originalType: string,
  moveName: string,
  ability: string | null,
  weather: string = 'None'
): string => {
  const mName = moveName.toLowerCase();
  
  // Weather Ball logic: Weather based type changes
  if (mName === 'weather ball') {
    switch (weather) {
      case 'Sun': return 'fire';
      case 'Rain': return 'water';
      case 'Sandstorm': return 'rock';
      case 'Snow': return 'ice';
    }
  }

  if (!ability) return originalType;
  const name = ability.toLowerCase();
  const type = originalType.toLowerCase();

  // -ate abilities: Only change Normal-type moves
  if (type === 'normal') {
    switch (name) {
      case 'pixilate': return 'fairy';
      case 'refrigerate': return 'ice';
      case 'aerilate': return 'flying';
      case 'galvanize': return 'electric';
    }
  }

  // Liquid Voice: Changes sound-based moves to Water
  if (name === 'liquid voice') {
    const soundMoves = ['hyper voice', 'snarl', 'boomburst', 'bug buzz', 'sparkling aria', 'overdrive', 'clanging scales', 'disarming voice', 'echoed voice', 'howl', 'noble roar', 'parting shot', 'perish song', 'relic song', 'roar', 'sing', 'uproar'];
    if (soundMoves.includes(moveName.toLowerCase())) {
      return 'water';
    }
  }

  return originalType;
};

export const getNatureName = (boosted: string | null, hindered: string | null): string => {
  if (!boosted || !hindered || boosted === hindered) return 'Serious';
  
  const natures: Record<string, Record<string, string>> = {
    atk: { def: 'Lonely', spa: 'Adamant', spd: 'Naughty', spe: 'Brave' },
    def: { atk: 'Bold', spa: 'Impish', spd: 'Lax', spe: 'Relaxed' },
    spa: { atk: 'Modest', def: 'Mild', spd: 'Rash', spe: 'Quiet' },
    spd: { atk: 'Calm', def: 'Gentle', spa: 'Careful', spe: 'Sassy' },
    spe: { atk: 'Timid', def: 'Hasty', spa: 'Jolly', spd: 'Naive' }
  };
  
  return natures[boosted]?.[hindered] || 'Serious';
};

export const spToEv = (sp: number): number => {
  if (sp === 0) return 0;
  return Math.min(252, sp * 8 - 4);
};


export const getStatModifier = (
  ability: string | null,
  statKey: 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe',
  role: 'attacker' | 'defender',
  pokemonTypes: string[] = [],
  weather: string = 'None',
  hpPercent: number = 100
): { modifier: number; triggered: boolean } => {
  let modifier = 1.0;
  let triggered = false;

  // Gen 9 Weather Stat Buffs
  if (role === 'defender') {
    if (weather === 'Sandstorm' && pokemonTypes.includes('rock') && statKey === 'spd') {
      modifier *= 1.5;
    }
    if (weather === 'Snow' && pokemonTypes.includes('ice') && statKey === 'def') {
      modifier *= 1.5;
    }
  }

  if (!ability) return { modifier, triggered };
  const name = ability.toLowerCase();

  // HP-based Stat Penalties
  if (role === 'attacker' && name === 'defeatist' && hpPercent <= 50) {
    if (statKey === 'atk' || statKey === 'spa') {
      modifier *= 0.5;
      triggered = true;
    }
  }

  switch (name) {
    case 'huge power':
    case 'pure power':
      if (role === 'attacker' && statKey === 'atk') modifier *= 2.0;
      break;
    case 'fur coat':
      if (role === 'defender' && statKey === 'def') modifier *= 2.0;
      break;
    case 'guts':
      if (role === 'attacker' && statKey === 'atk') modifier *= 1.5;
      break;
  }

  return { modifier, triggered };
};

export const mapToSmogonPokemon = (
  stateSide: any, 
  pokemonName: string,
  baseType1: string,
  baseType2?: string | null
): Pokemon => {
  const gen = Generations.get(9);
  
  const evs = {
    hp: stateSide.spHp || 0,
    atk: stateSide.spAtk || 0,
    def: stateSide.spDef || 0,
    spa: stateSide.spSpa || 0,
    spd: stateSide.spSpd || 0,
    spe: stateSide.spSpe || 0,
  };

  const currentHp = Math.floor(calculateHP(stateSide.baseHp, stateSide.spHp) * (stateSide.hpPercent / 100));

  const boosts = {
    atk: stateSide.stages.atk || 0,
    def: stateSide.stages.def || 0,
    spa: stateSide.stages.spa || 0,
    spd: stateSide.stages.spd || 0,
    spe: stateSide.stages.spe || 0,
  };

  const t1 = stateSide.isTypeOverridden ? stateSide.type1 : baseType1;
  const t2 = stateSide.isTypeOverridden ? stateSide.type2 : baseType2;

  const types = [t1, t2]
    .filter(Boolean)
    .filter(t => t!.toLowerCase() !== 'none')
    .map(t => t!.charAt(0).toUpperCase() + t!.slice(1).toLowerCase());

  // Use 'None' as species if overridden to prevent species-specific logic (like Garchomp's Ground immunity)
  // from interfering with our manual type selection.
  const effectiveName = stateSide.isTypeOverridden ? 'None' : pokemonName;

  const p = new Pokemon(gen, effectiveName, {
    level: 50,
    ability: stateSide.activeAbility || undefined,
    item: stateSide.item || undefined,
    nature: getNatureName(stateSide.boostedStat, stateSide.hinderedStat) as any,
    evs,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    boosts,
    curHP: currentHp,
    overrides: {
      types: types as any,
      weightkg: 100,
      baseStats: {
        hp: stateSide.baseHp,
        atk: stateSide.baseAtk,
        def: stateSide.baseDef,
        spa: stateSide.baseSpa,
        spd: stateSide.baseSpd,
        spe: stateSide.baseSpe,
      }
    }
  });

  // Deep override: ensure the instance and its species reference use the overridden types
  if (stateSide.isTypeOverridden) {
    p.types = types as unknown as typeof p.types;
    if (p.species) {
      // Nuclear option: Shadow the species object entirely and change ID to prevent cached lookups
      p.species = {
        ...p.species,
        id: 'custom' as any,
        types: types,
        name: pokemonName as any
      } as any;
    }
  }
  
  return p;
};

export const mapToSmogonField = (
  weather: string, 
  isSpreadTarget: boolean,
  isFairyAura: boolean = false,
  isDarkAura: boolean = false,
  isAuraBreak: boolean = false,
  terrain: string = 'None',
  isGravity: boolean = false
): Field => {
  const weatherMap: Record<string, string> = {
    'Sun': 'Sun',
    'Rain': 'Rain',
    'Sandstorm': 'Sand',
    'Snow': 'Snow',
    'None': ''
  };

  return new Field({
    weather: weatherMap[weather] as any,
    gameType: isSpreadTarget ? 'Doubles' : 'Singles',
    isFairyAura,
    isDarkAura,
    isAuraBreak,
    terrain: terrain === 'None' ? undefined : terrain as any,
    isGravity
  });
};

export const mapToSmogonMove = (moveName: string): Move => {
  const gen = Generations.get(9);
  return new Move(gen, moveName);
};

export const getStageMultiplier = (stage: number): number => {
  if (stage > 0) return (2 + stage) / 2;
  if (stage < 0) return 2 / (2 + Math.abs(stage));
  return 1;
};

export interface DamageResult {
  minDamage: number;
  maxDamage: number;
  minPercent: number;
  maxPercent: number;
  moveName: string;
  moveNameZh: string | null;
  moveType: number;
  originalType: number;
  isStab: boolean;
  effectiveness: number;
  triggeredAbilities?: string[];
}

export const calculateSmogonDamage = (
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
): Result => {
  const gen = Generations.get(9);
  return calculate(gen, attacker, defender, move, field);
};
