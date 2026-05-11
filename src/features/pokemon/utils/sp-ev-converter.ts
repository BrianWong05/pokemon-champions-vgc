export const convertSpToEv = (sp: number): number => {
  if (sp <= 0) return 0;
  // Maximum SP is 32, which corresponds to 252 EVs
  if (sp >= 32) return 252;
  return 4 + (sp - 1) * 8;
};

export const convertEvToSp = (ev: number): number => {
  if (ev <= 0) return 0;
  return Math.floor((ev + 4) / 8);
};
