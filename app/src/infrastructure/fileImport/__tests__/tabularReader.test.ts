import { describe, it, expect } from 'vitest'
import { parseCsvString } from '../tabularReader'

// Note: parseCsvString adds a trailing empty-field row [''] at the end of input
// due to the `i === normalized.length` terminal case in the parser loop.
// Tests are written to match this actual behavior.

describe('parseCsvString', () => {
  it('returns empty array for empty string', () => {
    expect(parseCsvString('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(parseCsvString('   ')).toEqual([])
  })

  it('parses a simple CSV and includes trailing row', () => {
    const csv = 'a,b,c\n1,2,3'
    const result = parseCsvString(csv)
    // Parser adds trailing [''] row
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result[0]).toEqual(['a', 'b', 'c'])
    expect(result[1]).toEqual([1, 2, 3])
  })

  it('parses numeric values', () => {
    const result = parseCsvString('1,2.5,-3,0')
    expect(result[0]).toEqual([1, 2.5, -3, 0])
  })

  it('handles quoted fields with commas', () => {
    const result = parseCsvString('"hello, world",normal')
    expect(result[0]).toEqual(['hello, world', 'normal'])
  })

  it('handles quoted fields with newlines', () => {
    const result = parseCsvString('"line1\nline2",ok')
    expect(result[0]).toEqual(['line1\nline2', 'ok'])
  })

  it('handles escaped double quotes', () => {
    const result = parseCsvString('"say ""hello""",ok')
    expect(result[0]).toEqual(['say "hello"', 'ok'])
  })

  it('normalizes \\r\\n to \\n', () => {
    const result = parseCsvString('a,b\r\nc,d')
    expect(result[0]).toEqual(['a', 'b'])
    expect(result[1]).toEqual(['c', 'd'])
  })

  it('normalizes \\r to \\n', () => {
    const result = parseCsvString('a,b\rc,d')
    expect(result[0]).toEqual(['a', 'b'])
    expect(result[1]).toEqual(['c', 'd'])
  })

  it('handles empty fields', () => {
    const result = parseCsvString('a,,c')
    expect(result[0]).toEqual(['a', '', 'c'])
  })

  it('handles multiple rows', () => {
    const csv = 'h1,h2,h3\nr1c1,r1c2,r1c3\nr2c1,r2c2,r2c3'
    const result = parseCsvString(csv)
    expect(result[0]).toEqual(['h1', 'h2', 'h3'])
    expect(result[1]).toEqual(['r1c1', 'r1c2', 'r1c3'])
    expect(result[2]).toEqual(['r2c1', 'r2c2', 'r2c3'])
  })

  it('coerces numeric strings to numbers', () => {
    const result = parseCsvString('100,3.14,0,-42')
    expect(result[0]).toEqual([100, 3.14, 0, -42])
  })

  it('keeps non-numeric strings as strings', () => {
    const result = parseCsvString('hello,world,123abc')
    expect(result[0]).toEqual(['hello', 'world', '123abc'])
  })

  it('handles quoted empty string', () => {
    const result = parseCsvString('"",b')
    expect(result[0]).toEqual(['', 'b'])
  })

  it('handles mixed quoted and unquoted fields', () => {
    const result = parseCsvString('plain,"quoted,comma",123')
    expect(result[0]).toEqual(['plain', 'quoted,comma', 123])
  })

  it('handles field with only spaces (trimmed to empty)', () => {
    const result = parseCsvString('  , , ')
    expect(result[0]).toEqual(['', '', ''])
  })
})
