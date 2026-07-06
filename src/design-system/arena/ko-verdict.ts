export type KoTone = 'safe' | 'danger' | 'field';
export interface KoVerdictResult { verdict: string; confidence: string | null; tone: KoTone }

/**
 * koVerdictFromText — maps @smogon/calc's KO-chance text to an Arena KOVerdict.
 * Mirrors the tone rules in ResultsPanel.getKoStatus:
 *   empty / "--"     -> survives (safe)
 *   guaranteed OHKO  -> danger
 *   possible/% OHKO  -> field (roll-dependent)
 *   2HKO / 3HKO / …  -> safe (survives the single hit)
 */
export function koVerdictFromText(koChanceText?: string): KoVerdictResult {
  const text = (koChanceText ?? '').trim();
  if (!text || text === '--') return { verdict: 'Survives', confidence: null, tone: 'safe' };
  const lower = text.toLowerCase();
  const ohko = lower.includes('ohko');
  const guaranteed = lower.includes('guaranteed');
  let tone: KoTone;
  if (guaranteed && ohko) tone = 'danger';
  else if (ohko) tone = 'field';
  else tone = 'safe';
  return { verdict: text, confidence: null, tone };
}
