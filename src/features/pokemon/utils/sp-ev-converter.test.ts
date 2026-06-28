import { describe, it, expect } from 'vitest'
import { convertSpToEv, convertEvToSp } from '@/features/pokemon/utils/sp-ev-converter'

describe('convertSpToEv (official Pokémon HOME mapping)', () => {
  it('maps 0 SP to 0 EV', () => {
    expect(convertSpToEv(0)).toBe(0)
  })
  it('maps the first SP to 4 EV, then +8 each', () => {
    expect(convertSpToEv(1)).toBe(4)
    expect(convertSpToEv(2)).toBe(12)
    expect(convertSpToEv(31)).toBe(244)
  })
  it('caps 32 SP at 252 EV', () => {
    expect(convertSpToEv(32)).toBe(252)
  })
})

describe('convertEvToSp', () => {
  it('maps boundary EV values back to SP', () => {
    expect(convertEvToSp(0)).toBe(0)
    expect(convertEvToSp(4)).toBe(1)
    expect(convertEvToSp(12)).toBe(2)
    expect(convertEvToSp(252)).toBe(32)
  })
})

describe('SP↔EV round-trip', () => {
  it('round-trips at boundaries', () => {
    for (const sp of [0, 1, 2, 31, 32]) {
      expect(convertEvToSp(convertSpToEv(sp))).toBe(sp)
    }
  })
})
