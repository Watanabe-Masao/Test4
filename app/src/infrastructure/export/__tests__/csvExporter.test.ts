import { describe, it, expect } from 'vitest'
import { toCsvString } from '../csvExporter'

describe('toCsvString', () => {
  it('converts simple rows to CSV', () => {
    const rows = [
      ['Name', 'Age', 'City'],
      ['Alice', 30, 'Tokyo'],
    ]
    expect(toCsvString(rows)).toBe('Name,Age,City\r\nAlice,30,Tokyo')
  })

  it('handles null and undefined cells', () => {
    const rows = [['a', null, undefined, 'b']]
    expect(toCsvString(rows)).toBe('a,,,b')
  })

  it('escapes cells containing commas', () => {
    const rows = [['hello, world', 'normal']]
    expect(toCsvString(rows)).toBe('"hello, world",normal')
  })

  it('escapes cells containing newlines', () => {
    const rows = [['line1\nline2', 'ok']]
    expect(toCsvString(rows)).toBe('"line1\nline2",ok')
  })

  it('escapes cells containing double quotes', () => {
    const rows = [['say "hello"', 'ok']]
    expect(toCsvString(rows)).toBe('"say ""hello""",ok')
  })

  it('uses custom delimiter', () => {
    const rows = [['a', 'b', 'c']]
    expect(toCsvString(rows, '\t')).toBe('a\tb\tc')
  })

  it('escapes cells containing custom delimiter', () => {
    const rows = [['a\tb', 'c']]
    expect(toCsvString(rows, '\t')).toBe('"a\tb"\tc')
  })

  it('handles empty rows', () => {
    const rows: string[][] = [[]]
    expect(toCsvString(rows)).toBe('')
  })

  it('handles multiple rows', () => {
    const rows = [
      ['h1', 'h2'],
      ['r1', 'r2'],
      ['r3', 'r4'],
    ]
    expect(toCsvString(rows)).toBe('h1,h2\r\nr1,r2\r\nr3,r4')
  })

  it('handles numeric values correctly', () => {
    const rows = [[0, 1.5, -100, 999999]]
    expect(toCsvString(rows)).toBe('0,1.5,-100,999999')
  })
})
