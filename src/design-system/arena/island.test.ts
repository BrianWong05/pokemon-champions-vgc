import { describe, expect, it } from 'vitest';
import { islandSide } from './island';

describe('islandSide', () => {
  it('maps iOS window.orientation to the island edge', () => {
    expect(islandSide(90)).toBe('left'); // home button right → island left
    expect(islandSide(-90)).toBe('right'); // home button left → island right
    expect(islandSide(0)).toBe('none'); // portrait: island lives in the top inset
    expect(islandSide(undefined)).toBe('none'); // non-iOS: keep symmetric insets
  });
});
