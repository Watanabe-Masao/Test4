import { describe, it, expect } from 'vitest'
import { darkTheme, lightTheme } from './theme'

describe('Theme', () => {
  it('dark theme has correct mode', () => {
    expect(darkTheme.mode).toBe('dark')
  })

  it('light theme has correct mode', () => {
    expect(lightTheme.mode).toBe('light')
  })

  it('dark theme has dark background', () => {
    expect(darkTheme.colors.bg).toBe('#09090b')
  })

  it('light theme has light background', () => {
    expect(lightTheme.colors.bg).toBe('#f8fafc')
  })

  it('both themes share the same palette', () => {
    expect(darkTheme.colors.palette.primary).toBe(lightTheme.colors.palette.primary)
    expect(darkTheme.colors.palette.primary).toBe('#6366f1')
  })

  it('both themes share typography settings', () => {
    expect(darkTheme.typography).toEqual(lightTheme.typography)
  })
})
