import { describe, it, expect } from 'vitest'
import { championsHP, championsStat } from '@/features/pokemon/utils/champions-stats'

describe('championsHP', () => {
  it('is base + 75 at 0 SP', () => {
    expect(championsHP(100, 0)).toBe(175)
  })
  it('adds 1 HP per SP, max 32 SP', () => {
    expect(championsHP(100, 32)).toBe(207)
  })
})

describe('championsStat', () => {
  it('is base + 20 at 0 SP, neutral nature', () => {
    expect(championsStat(100, 0, 1.0)).toBe(120)
  })
  it('adds 1 per SP', () => {
    expect(championsStat(100, 32, 1.0)).toBe(152)
  })
  it('applies a boosting nature (x1.1) with floor', () => {
    expect(championsStat(100, 0, 1.1)).toBe(132)
  })
  it('applies a hindering nature (x0.9) with floor', () => {
    expect(championsStat(100, 0, 0.9)).toBe(108)
  })
})
