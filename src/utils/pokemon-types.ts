export const TYPE_IDS: Record<string, number> = {
  normal: 1,
  fighting: 2,
  flying: 3,
  poison: 4,
  ground: 5,
  rock: 6,
  bug: 7,
  ghost: 8,
  steel: 9,
  fire: 10,
  water: 11,
  grass: 12,
  electric: 13,
  psychic: 14,
  ice: 15,
  dragon: 16,
  dark: 17,
  fairy: 18,
};

export const REVERSE_TYPE_IDS: Record<number, string> = Object.fromEntries(
  Object.entries(TYPE_IDS).map(([name, id]) => [id, name])
);

export const TYPE_COLORS: Record<string, string> = {
  bug: '#9f9f28',
  dark: '#4f4747',
  dragon: '#576fbc',
  electric: '#dfbc28',
  fairy: '#e18ce1',
  fighting: '#e49021',
  fire: '#e4613e',
  flying: '#74aad0',
  ghost: '#6f4570',
  grass: '#439837',
  ground: '#a4733c',
  ice: '#47c8c8',
  normal: '#828282',
  poison: '#9354cb',
  psychic: '#e96c8c',
  rock: '#a9a481',
  steel: '#77b2cb',
  water: '#3a9de2',
};

export type PokemonType = keyof typeof TYPE_COLORS;

export const getTypeName = (type: string): string => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};
