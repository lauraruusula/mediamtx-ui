import { describe, it, expect } from 'vitest'
import { escapeCsv } from '@/composables/useCsvExport'

describe('escapeCsv', () => {
  it('prefixes formula-starting cells with a single quote', () => {
    expect(escapeCsv('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(escapeCsv('+cmd')).toBe("'+cmd")
    expect(escapeCsv('-2+3')).toBe("'-2+3")
    expect(escapeCsv('@cell')).toBe("'@cell")
    expect(escapeCsv('\tleading-tab')).toBe("'\tleading-tab")
  })

  it('keeps plain values intact when not formula-like', () => {
    expect(escapeCsv('plain')).toBe('plain')
    expect(escapeCsv(0)).toBe('0')
    expect(escapeCsv('2026-08-25')).toBe('2026-08-25')
  })

  it('neutralizes negative numbers too (exports only carry non-negative values)', () => {
    expect(escapeCsv(-5)).toBe("'-5")
  })

  it('quotes and escapes values containing commas, quotes or newlines', () => {
    expect(escapeCsv('a,b')).toBe('"a,b"')
    expect(escapeCsv('a"b')).toBe('"a""b"')
    expect(escapeCsv('a\nb')).toBe('"a\nb"')
    expect(escapeCsv('=1+1, more')).toBe('"\'=1+1, more"')
  })
})
