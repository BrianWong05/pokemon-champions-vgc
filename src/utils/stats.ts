export interface Pokemon {
  id: string | number;
  name: string;
  baseSpeed: number;
}

export interface SpeedStats {
  maxPlus: number;
  maxNeutral: number;
  uninvested: number;
  minMinus: number;
}

/**
 * Calculates Speed stats based on the custom Pokémon Champions formula:
 * floor((Base + 20 + SP) * Nature)
 * 
 * Max Speed (+Nature): 32 SP, Positive nature (1.1x)
 * Max Speed (Neutral): 32 SP, Neutral nature (1.0x)
 * Uninvested Speed: 0 SP, Neutral nature (1.0x)
 * Min Speed (-Nature): 0 SP, Negative nature (0.9x)
 */
export const calculateSpeedStats = (baseSpeed: number): SpeedStats => {
  return {
    maxPlus: Math.floor((baseSpeed + 20 + 32) * 1.1),
    maxNeutral: Math.floor((baseSpeed + 20 + 32) * 1.0),
    uninvested: Math.floor((baseSpeed + 20 + 0) * 1.0),
    minMinus: Math.floor((baseSpeed + 20 + 0) * 0.9),
  };
};
