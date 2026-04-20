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
  ability: string | null
): string => {
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

export const getBasePowerModifier = (
  ability: string | null,
  moveType: string,
  basePower: number,
  category: 'physical' | 'special' | 'status',
  moveName: string = '',
  originalType: string = ''
): number => {
  if (!ability) return 1.0;
  const name = ability.toLowerCase();
  const mName = moveName.toLowerCase();
  const mType = moveType.toLowerCase();
  const oType = originalType.toLowerCase();

  let modifier = 1.0;

  // 1. -ate Ability Power Boost (1.2x)
  // Only applies if the move was originally Normal and changed to something else
  if (oType === 'normal' && mType !== 'normal') {
    const ateAbilities = ['pixilate', 'refrigerate', 'aerilate', 'galvanize'];
    if (ateAbilities.includes(name)) {
      modifier *= 1.2;
    }
  }

  // 2. Existing BP Modifiers
  switch (name) {
    case 'technician':
      if (basePower <= 60) modifier *= 1.5;
      break;
    case 'fairy aura':
      if (mType === 'fairy') modifier *= 1.33;
      break;
    case 'dark aura':
      if (mType === 'dark') modifier *= 1.33;
      break;
    case 'strong jaw':
      const bitingMoves = ['bite', 'crunch', 'fire fang', 'ice fang', 'thunder fang', 'poison fang', 'psychic fangs', 'hyper fang', 'jaw lock', 'fishious rendition'];
      if (bitingMoves.includes(mName)) modifier *= 1.5;
      break;
    case 'sharpness':
      const slicingMoves = ['air cutter', 'air slash', 'aqua cutter', 'aerial ace', 'behemoth blade', 'ceaseless edge', 'cross poison', 'cut', 'fury cutter', 'kowtow cleave', 'leaf blade', 'night slash', 'psyblade', 'psychic cut', 'razor leaf', 'razor shell', 'sacred sword', 'slash', 'solar blade', 'stone axe', 'x-scissor'];
      if (slicingMoves.includes(mName)) modifier *= 1.5;
      break;
    case 'tough claws':
      if (category === 'physical') modifier *= 1.3;
      break;
  }

  return modifier;
};

export const getStatModifier = (
  ability: string | null,
  statKey: 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe',
  role: 'attacker' | 'defender'
): number => {
  if (!ability) return 1.0;
  const name = ability.toLowerCase();

  switch (name) {
    case 'huge power':
    case 'pure power':
      return (role === 'attacker' && statKey === 'atk') ? 2.0 : 1.0;
    case 'fur coat':
      return (role === 'defender' && statKey === 'def') ? 2.0 : 1.0;
    case 'guts':
      return (role === 'attacker' && statKey === 'atk') ? 1.5 : 1.0;
    default:
      return 1.0;
  }
};

export const getFinalDamageModifier = (
  defenderAbility: string | null,
  attackerAbility: string | null,
  moveType: string,
  effectiveness: number
): number => {
  let modifier = 1.0;

  if (defenderAbility) {
    const defName = defenderAbility.toLowerCase();
    switch (defName) {
      case 'thick fat':
        if (moveType.toLowerCase() === 'fire' || moveType.toLowerCase() === 'ice') {
          modifier *= 0.5;
        }
        break;
      case 'solid rock':
      case 'filter':
      case 'prism armor':
        if (effectiveness > 1) {
          modifier *= 0.75;
        }
        break;
      case 'fluffy':
        // Simplified: assuming physical moves make contact
        // modifier *= 0.5; // for contact moves
        // modifier *= 2.0; // for fire moves
        break;
      case 'water bubble':
        if (moveType.toLowerCase() === 'fire') {
          modifier *= 0.5;
        }
        break;
    }
  }

  if (attackerAbility) {
    const atkName = attackerAbility.toLowerCase();
    if (atkName === 'water bubble' && moveType.toLowerCase() === 'water') {
      modifier *= 2.0;
    }
  }

  return modifier;
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
}

export const calculateDamage = (
  attackerStat: number,
  defenderStat: number,
  movePower: number,
  stabMultiplier: number,
  effectiveness: number,
  finalModifier: number,
  maxHP: number
): DamageResult => {
  // BaseDamage = Math.floor(Math.floor((22 * MovePower * Attack / Defense) / 50) + 2)
  const baseDamage = Math.floor(Math.floor((22 * movePower * attackerStat / defenderStat) / 50) + 2);
  
  const minDamage = Math.floor(baseDamage * stabMultiplier * effectiveness * finalModifier * 0.85);
  const maxDamage = Math.floor(baseDamage * stabMultiplier * effectiveness * finalModifier * 1.00);

  return {
    minDamage,
    maxDamage,
    minPercent: Number(((minDamage / maxHP) * 100).toFixed(1)),
    maxPercent: Number(((maxDamage / maxHP) * 100).toFixed(1)),
  };
};
