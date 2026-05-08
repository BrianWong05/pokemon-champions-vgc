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
  },
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

export const NATURES = [
  "Hardy",
  "Lonely (+ATK, -DEF)",
  "Adamant (+ATK, -SPA)",
  "Naughty (+ATK, -SPD)",
  "Brave (+ATK, -SPE)",
  "Bold (+DEF, -ATK)",
  "Docile",
  "Impish (+DEF, -SPA)",
  "Lax (+DEF, -SPD)",
  "Relaxed (+DEF, -SPE)",
  "Modest (+SPA, -ATK)",
  "Mild (+SPA, -DEF)",
  "Bashful",
  "Rash (+SPA, -SPD)",
  "Quiet (+SPA, -SPE)",
  "Calm (+SPD, -ATK)",
  "Gentle (+SPD, -DEF)",
  "Careful (+SPD, -SPA)",
  "Quirky",
  "Sassy (+SPD, -SPE)",
  "Timid (+SPE, -ATK)",
  "Hasty (+SPE, -DEF)",
  "Jolly (+SPE, -SPA)",
  "Naive (+SPE, -SPD)",
  "Serious"
];

const NATURE_STATS_MAP: Record<string, { boosted: string; hindered: string }> = {
  Lonely: { boosted: "ATK", hindered: "DEF" },
  Adamant: { boosted: "ATK", hindered: "SPA" },
  Naughty: { boosted: "ATK", hindered: "SPD" },
  Brave: { boosted: "ATK", hindered: "SPE" },
  Bold: { boosted: "DEF", hindered: "ATK" },
  Impish: { boosted: "DEF", hindered: "SPA" },
  Lax: { boosted: "DEF", hindered: "SPD" },
  Relaxed: { boosted: "DEF", hindered: "SPE" },
  Modest: { boosted: "SPA", hindered: "ATK" },
  Mild: { boosted: "SPA", hindered: "DEF" },
  Rash: { boosted: "SPA", hindered: "SPD" },
  Quiet: { boosted: "SPA", hindered: "SPE" },
  Calm: { boosted: "SPD", hindered: "ATK" },
  Gentle: { boosted: "SPD", hindered: "DEF" },
  Careful: { boosted: "SPD", hindered: "SPA" },
  Sassy: { boosted: "SPD", hindered: "SPE" },
  Timid: { boosted: "SPE", hindered: "ATK" },
  Hasty: { boosted: "SPE", hindered: "DEF" },
  Jolly: { boosted: "SPE", hindered: "SPA" },
  Naive: { boosted: "SPE", hindered: "SPD" },
};

export const getNatureStats = (nature: string): { boostedStat: string | null; hinderedStat: string | null } => {
  const realNature = nature.split(' (')[0].trim();
  const stats = NATURE_STATS_MAP[realNature];
  if (stats) {
    return { boostedStat: stats.boosted.toLowerCase(), hinderedStat: stats.hindered.toLowerCase() };
  }
  return { boostedStat: null, hinderedStat: null };
};

export const getNatureFromStats = (boostedStat: string | null, hinderedStat: string | null): string => {
  if (!boostedStat || !hinderedStat || boostedStat === hinderedStat) return "Hardy";
  
  const b = boostedStat.toUpperCase();
  const h = hinderedStat.toUpperCase();

  for (const [nature, stats] of Object.entries(NATURE_STATS_MAP)) {
    if (stats.boosted === b && stats.hindered === h) {
      return NATURES.find(n => n.startsWith(nature)) || nature;
    }
  }
  
  return "Hardy";
};

export const getNatureDisplay = (nature: string): string => {
  // Now redundant because modifiers are hardcoded, but kept for compatibility
  return nature;
};
