export interface Spread {
  id: 'maxHB' | 'maxHD';
  label: string;
  sp: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
  nature: string;
}

// Generic bulk spreads (Champions SP: 66 total, cap 32/stat). Nature strings match NATURES.
export const COMMON_SPREADS: Spread[] = [
  { id: 'maxHB', label: 'Max HB', sp: { hp: 32, atk: 0, def: 32, spa: 0, spd: 0, spe: 0 }, nature: 'Bold (+DEF, -ATK)' },
  { id: 'maxHD', label: 'Max HD', sp: { hp: 32, atk: 0, def: 0, spa: 0, spd: 32, spe: 0 }, nature: 'Calm (+SPD, -ATK)' },
];
