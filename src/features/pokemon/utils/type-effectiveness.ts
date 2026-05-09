import { getDb } from '@/db';
import { typeEfficacy, types } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface TypeEfficacyMap {
  [attackerTypeId: number]: {
    [targetTypeId: number]: number;
  };
}

/**
 * Fetches the entire type efficacy chart from the database and returns a lookup map.
 * Multipliers are stored as integers (0, 50, 100, 200).
 */
export const fetchTypeEfficacy = async (): Promise<TypeEfficacyMap> => {
  const db = await getDb();
  const result = await db.select().from(typeEfficacy);
  
  const map: TypeEfficacyMap = {};
  
  result.forEach((row) => {
    if (!map[row.damageTypeId]) {
      map[row.damageTypeId] = {};
    }
    map[row.damageTypeId][row.targetTypeId] = row.damageFactor;
  });
  
  return map;
};

/**
 * Calculates the total effectiveness multiplier for a move against a Pokémon.
 * Multiplier = (factor1 / 100) * (factor2 / 100)
 */
export const calculateEffectiveness = (
  efficacyMap: TypeEfficacyMap,
  moveTypeId: number,
  targetType1Id: number | null,
  targetType2Id: number | null
): number => {
  let multiplier = 1.0;
  
  const moveEfficacy = efficacyMap[moveTypeId];
  if (!moveEfficacy) return 1.0;

  if (targetType1Id !== null) {
    const factor = moveEfficacy[targetType1Id] ?? 100;
    multiplier *= (factor / 100);
  }
  
  if (targetType2Id !== null) {
    const factor = moveEfficacy[targetType2Id] ?? 100;
    multiplier *= (factor / 100);
  }
  
  return multiplier;
};
