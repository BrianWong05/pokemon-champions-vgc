import { describe, it, expect } from 'vitest';
import { koVerdictFromText } from './ko-verdict';

describe('koVerdictFromText', () => {
  it('empty or -- means survives, safe tone', () => {
    expect(koVerdictFromText('')).toEqual({ verdict: 'Survives', confidence: null, tone: 'safe' });
    expect(koVerdictFromText('--')).toEqual({ verdict: 'Survives', confidence: null, tone: 'safe' });
    expect(koVerdictFromText(undefined)).toEqual({ verdict: 'Survives', confidence: null, tone: 'safe' });
  });
  it('guaranteed OHKO is danger', () => {
    expect(koVerdictFromText('guaranteed OHKO').tone).toBe('danger');
  });
  it('possible OHKO and percentage OHKO are field', () => {
    expect(koVerdictFromText('possible OHKO').tone).toBe('field');
    expect(koVerdictFromText('51.2% chance to OHKO').tone).toBe('field');
  });
  it('multi-hit KO (survives the hit) is safe', () => {
    expect(koVerdictFromText('2HKO').tone).toBe('safe');
    expect(koVerdictFromText('guaranteed 3HKO').tone).toBe('safe');
  });
  it('passes the source text through as the verdict', () => {
    expect(koVerdictFromText('possible OHKO').verdict).toBe('possible OHKO');
  });
});
