// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readMyTeamId, saveMyTeamId, clearMyTeamId } from './myTeam';

describe('my-team store', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a team id and clears it', () => {
    saveMyTeamId('team-abc-123');
    expect(readMyTeamId()).toBe('team-abc-123');
    clearMyTeamId();
    expect(readMyTeamId()).toBeNull();
  });

  it('rejects empty saves and treats non-string storage as no selection', () => {
    saveMyTeamId('');
    expect(readMyTeamId()).toBeNull();
    localStorage.setItem('calc.myTeamId', '  ');
    expect(readMyTeamId()).toBeNull();
  });
});
