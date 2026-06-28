import { describe, it, expect } from 'vitest';
import { parseShowdownSet } from '@/features/pokemon/utils/showdown-parser';

describe('parseShowdownSet', () => {
  it('parses a standard Showdown export with EVs (values > 32)', () => {
    const text = `Amoonguss @ Sitrus Berry
Ability: Regenerator
Level: 50
EVs: 252 HP / 156 Def / 100 SpD
Quiet Nature
IVs: 0 Atk / 0 Spe
- Spore
- Rage Powder
- Pollen Puff
- Protect`;

    const parsed = parseShowdownSet(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.species).toBe('Amoonguss');
    expect(parsed!.item).toBe('Sitrus Berry');
    expect(parsed!.ability).toBe('Regenerator');
    expect(parsed!.nature).toBe('Quiet');
    // EVs: 252 -> convertEvToSp(252) = 32
    // 156 -> convertEvToSp(156) = 20
    // 100 -> convertEvToSp(100) = 13
    expect(parsed!.evs.hp).toBe(32);
    expect(parsed!.evs.def).toBe(20);
    expect(parsed!.evs.spd).toBe(13);
    expect(parsed!.evs.atk).toBe(0);
    
    expect(parsed!.ivs.atk).toBe(31);
    expect(parsed!.ivs.spe).toBe(31);
    expect(parsed!.ivs.hp).toBe(31); // Default
    
    expect(parsed!.moves).toEqual(['Spore', 'Rage Powder', 'Pollen Puff', 'Protect']);
  });

  it('parses a set with SPs (values <= 32)', () => {
    // Showdown labels the line "EVs:" even for Champions SP numbers, so the
    // heuristic decides. Total is 66 (the legal SP cap) with max 32, so the
    // values are kept as SP rather than converted.
    const text = `Urshifu-Rapid-Strike (Urshifu-Rapid-Strike) (M) @ Mystic Water
Ability: Unseen Fist
Level: 50
EVs: 32 HP / 32 Atk / 2 Spe
Jolly Nature
- Surging Strikes
- Close Combat
- Aqua Jet
- Detect`;

    const parsed = parseShowdownSet(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.species).toBe('Urshifu-Rapid-Strike');
    expect(parsed!.item).toBe('Mystic Water');
    expect(parsed!.evs.hp).toBe(32);
    expect(parsed!.evs.atk).toBe(32);
    expect(parsed!.evs.spe).toBe(2);
    expect(parsed!.moves.length).toBe(4);
  });

  it('treats stats as EVs if max is <= 32 but total > 66', () => {
    const text = `Garchomp @ Choice Band
Ability: Rough Skin
Level: 50
EVs: 32 HP / 32 Atk / 32 Def / 32 SpD / 32 Spe
Jolly Nature
- Earthquake
- Dragon Claw
- Protect
- Rock Slide`;

    const parsed = parseShowdownSet(text);
    expect(parsed).not.toBeNull();
    // Total is 160. So it should be treated as EVs: convertEvToSp(32) = 4
    expect(parsed!.evs.hp).toBe(4);
    expect(parsed!.evs.atk).toBe(4);
    expect(parsed!.evs.def).toBe(4);
    expect(parsed!.evs.spd).toBe(4);
    expect(parsed!.evs.spe).toBe(4);
  });

  it('handles SPs: prefix directly', () => {
    const text = `Incineroar @ Focus Sash
Ability: Intimidate
SPs: 32 HP / 32 Atk / 4 Spe
Adamant Nature
- Flare Blitz
- Knock Off
- Parting Shot
- Fake Out`;

    const parsed = parseShowdownSet(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.species).toBe('Incineroar');
    expect(parsed!.item).toBe('Focus Sash');
    expect(parsed!.evs.hp).toBe(32);
    expect(parsed!.evs.atk).toBe(32);
    expect(parsed!.evs.spe).toBe(4);
  });

  it('returns null for empty string', () => {
    expect(parseShowdownSet('')).toBeNull();
    expect(parseShowdownSet('   \n  ')).toBeNull();
  });

  it('ignores leading empty lines and multiple sets', () => {
    const text = `
    
Amoonguss @ Sitrus Berry
Ability: Regenerator
- Spore

Incineroar @ Focus Sash
Ability: Intimidate
- Knock Off`;
    const parsed = parseShowdownSet(text);
    expect(parsed).not.toBeNull();
    expect(parsed!.species).toBe('Amoonguss');
    expect(parsed!.ability).toBe('Regenerator');
    expect(parsed!.moves).toEqual(['Spore']);
  });
});
