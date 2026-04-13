import { describe, it, expect } from 'vitest'
import { toCsvString } from '@/domain/utilities/csv'

describe('toCsvString', () => {
  it('returns empty string for empty input', () => {
    expect(toCsvString([])).toBe('')
  })

  it('joins simple rows with comma and CRLF', () => {
    const rows = [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]
    expect(toCsvString(rows)).toBe('a,b,c\r\n1,2,3')
  })

  it('converts numbers to strings', () => {
    expect(toCsvString([[1, 2, 3]])).toBe('1,2,3')
  })

  it('renders null and undefined as empty cells', () => {
    expect(toCsvString([[null, undefined, 'x']])).toBe(',,x')
  })

  it('quotes cells containing commas', () => {
    expect(toCsvString([['a,b', 'c']])).toBe('"a,b",c')
  })

  it('quotes cells containing newlines', () => {
    expect(toCsvString([['line1\nline2', 'x']])).toBe('"line1\nline2",x')
  })

  it('escapes double quotes by doubling them', () => {
    expect(toCsvString([['say "hi"', 'ok']])).toBe('"say ""hi""",ok')
  })

  it('supports custom delimiter', () => {
    const rows = [
      ['a', 'b'],
      ['c', 'd'],
    ]
    expect(toCsvString(rows, '\t')).toBe('a\tb\r\nc\td')
  })

  it('quotes when cell contains the custom delimiter', () => {
    expect(toCsvString([['a;b', 'c']], ';')).toBe('"a;b";c')
  })

  it('leaves plain values unquoted', () => {
    expect(toCsvString([['plain', 'text']])).toBe('plain,text')
  })

  it('handles single row single cell', () => {
    expect(toCsvString([['only']])).toBe('only')
  })
})
