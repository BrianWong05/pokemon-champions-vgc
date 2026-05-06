export interface PokemonPreset {
  id: string;
  name: string;
  pokemonName: string;
  item: string;
  ability: string;
  nature: string;
  sp: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  moves: string[];
}

export const POKEMON_PRESETS: PokemonPreset[] = [
  {
    id: "incineroar-sitrus",
    name: "Incineroar (Sitrus Berry)",
    pokemonName: "Incineroar",
    item: "Sitrus Berry",
    ability: "Intimidate",
    nature: "Careful",
    sp: { hp: 32, atk: 0, def: 12, spa: 0, spd: 32, spe: 0 },
    moves: ["Knock Off", "Parting Shot", "Flare Blitz", "Fake Out"],
  },,
  {
    id: "sneasler-white-herb",
    name: "Sneasler (White Herb)",
    pokemonName: "Sneasler",
    item: "White Herb",
    ability: "Unburden",
    nature: "Adamant",
    sp: {
      hp: 2,
      atk: 32,
      def: 0,
      spa: 0,
      spd: 0,
      spe: 32
    },
    moves: [
      "Close Combat",
      "Dire Claw",
      "Fake Out",
      "Acrobatics"
    ]
  },
  {
    id: "charizard-mega-y-charizardite-y",
    name: "Charizard-Mega-Y (Charizardite Y)",
    pokemonName: "Charizard-Mega-Y",
    item: "Charizardite Y",
    ability: "Drought",
    nature: "Modest",
    sp: {
      hp: 24,
      atk: 0,
      def: 14,
      spa: 11,
      spd: 0,
      spe: 17
    },
    moves: [
      "Heat Wave",
      "Weather Ball",
      "Solar Beam",
      "Protect"
    ]
  },
  {
    id: "kingambit-chople-berry",
    name: "Kingambit (Chople Berry)",
    pokemonName: "Kingambit",
    item: "Chople Berry",
    ability: "Defiant",
    nature: "Adamant",
    sp: {
      hp: 32,
      atk: 31,
      def: 3,
      spa: 0,
      spd: 0,
      spe: 0
    },
    moves: [
      "Kowtow Cleave",
      "Sucker Punch",
      "Low Kick",
      "Iron Head"
    ]
  },
  {
    id: "basculegion-choice-scarf",
    name: "Basculegion (Choice Scarf)",
    pokemonName: "Basculegion",
    item: "Choice Scarf",
    ability: "Swift Swim",
    nature: "Jolly",
    sp: {
      hp: 0,
      atk: 32,
      def: 2,
      spa: 0,
      spd: 0,
      spe: 32
    },
    moves: [
      "Wave Crash",
      "Flip Turn",
      "Last Respects",
      "Aqua Jet"
    ]
  },
  {
    id: "garchomp-dragon-fang",
    name: "Garchomp (Dragon Fang)",
    pokemonName: "Garchomp",
    item: "Dragon Fang",
    ability: "Rough Skin",
    nature: "Adamant",
    sp: {
      hp: 20,
      atk: 20,
      def: 0,
      spa: 0,
      spd: 1,
      spe: 25
    },
    moves: [
      "Scale Shot",
      "Earthquake",
      "Stomping Tantrum",
      "Rock Slide"
    ]
  },
  {
    id: "floette-mega-floettite",
    name: "Floette-Mega (Floettite)",
    pokemonName: "Floette-Mega",
    item: "Floettite",
    ability: "Fairy Aura",
    nature: "Modest",
    sp: {
      hp: 2,
      atk: 0,
      def: 0,
      spa: 32,
      spd: 0,
      spe: 32
    },
    moves: [
      "Light of Ruin",
      "Dazzling Gleam",
      "Moonblast",
      "Draining Kiss"
    ]
  }
];

export const getNatureStats = (nature: string): { boostedStat: string | null; hinderedStat: string | null } => {
  const natureMap: Record<string, { boosted: string; hindered: string }> = {
    Lonely: { boosted: "atk", hindered: "def" },
    Adamant: { boosted: "atk", hindered: "spa" },
    Naughty: { boosted: "atk", hindered: "spd" },
    Brave: { boosted: "atk", hindered: "spe" },
    Bold: { boosted: "def", hindered: "atk" },
    Impish: { boosted: "def", hindered: "spa" },
    Lax: { boosted: "def", hindered: "spd" },
    Relaxed: { boosted: "def", hindered: "spe" },
    Modest: { boosted: "spa", hindered: "atk" },
    Mild: { boosted: "spa", hindered: "def" },
    Rash: { boosted: "spa", hindered: "spd" },
    Quiet: { boosted: "spa", hindered: "spe" },
    Calm: { boosted: "spd", hindered: "atk" },
    Gentle: { boosted: "spd", hindered: "def" },
    Careful: { boosted: "spd", hindered: "spa" },
    Sassy: { boosted: "spd", hindered: "spe" },
    Timid: { boosted: "spe", hindered: "atk" },
    Hasty: { boosted: "spe", hindered: "def" },
    Jolly: { boosted: "spe", hindered: "spa" },
    Naive: { boosted: "spe", hindered: "spd" },
  };

  if (natureMap[nature]) {
    return { boostedStat: natureMap[nature].boosted, hinderedStat: natureMap[nature].hindered };
  }
  return { boostedStat: null, hinderedStat: null };
};
