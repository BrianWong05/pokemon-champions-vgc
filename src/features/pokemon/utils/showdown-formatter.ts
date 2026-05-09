import { PokemonConfig } from '@/features/pokemon/hooks/usePokemonEditor';

export const formatShowdownSet = (config: PokemonConfig, speciesName: string): string => {
  const lines: string[] = [];

  // Line 1: Species + Item
  let header = speciesName;
  if (config.item) {
    header += ` @ ${config.item}`;
  }
  lines.push(header);

  // Ability
  if (config.activeAbility) {
    lines.push(`Ability: ${config.activeAbility}`);
  }

  // EVs
  const evs = [
    config.spHp > 0 ? `${config.spHp} HP` : null,
    config.spAtk > 0 ? `${config.spAtk} Atk` : null,
    config.spDef > 0 ? `${config.spDef} Def` : null,
    config.spSpa > 0 ? `${config.spSpa} SpA` : null,
    config.spSpd > 0 ? `${config.spSpd} SpD` : null,
    config.spSpe > 0 ? `${config.spSpe} Spe` : null,
  ].filter(Boolean);

  if (evs.length > 0) {
    lines.push(`EVs: ${evs.join(' / ')}`);
  }

  // Nature
  lines.push(`${config.nature} Nature`);

  // Moves
  for (const move of config.moves) {
    if (move) {
      lines.push(`- ${move.nameEn}`);
    }
  }

  return lines.join('\n');
};

export const formatShowdownTeam = (teamMembers: { configuration: PokemonConfig; speciesName: string }[]): string => {
  return teamMembers
    .map(member => formatShowdownSet(member.configuration, member.speciesName))
    .join('\n\n');
};
