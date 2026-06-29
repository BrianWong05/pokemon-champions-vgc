import { describe, it, expect } from 'vitest'
import { resolveInitialFormat, DEFAULT_FORMAT } from '@/features/formats/format-utils'

describe('resolveInitialFormat', () => {
  const available = ['Regulation M-A', 'Regulation M-B']

  it('returns the stored value when it is in the available list', () => {
    expect(resolveInitialFormat('Regulation M-A', available)).toBe('Regulation M-A')
  })

  it('returns the latest format when nothing is stored', () => {
    expect(resolveInitialFormat(null, available)).toBe('Regulation M-B')
  })

  it('returns the latest format when the stored value is no longer available', () => {
    expect(resolveInitialFormat('Regulation L-Z', available)).toBe('Regulation M-B')
  })

  it('picks the latest by lexical order regardless of input order', () => {
    expect(resolveInitialFormat(null, ['Regulation M-B', 'Regulation M-A'])).toBe('Regulation M-B')
  })

  it('falls back to the default format when the available list is empty', () => {
    expect(resolveInitialFormat(null, [])).toBe(DEFAULT_FORMAT)
  })
})
