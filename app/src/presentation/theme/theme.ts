import {
  palette,
  categoryGradients,
  typography,
  spacing,
  radii,
  transitions,
  layout,
  breakpoints,
} from './tokens'

// ─── テーマカラー型 ──────────────────────────────────────
export interface ThemeColors {
  bg: string
  bg2: string
  bg3: string
  bg4: string
  text: string
  text2: string
  text3: string
  text4: string
  border: string
  palette: typeof palette
}

// ─── ダークテーマ色定義 ──────────────────────────────────
const darkColors: Omit<ThemeColors, 'palette'> = {
  bg: '#09090b',
  bg2: '#0f1117',
  bg3: '#16181f',
  bg4: '#1c1f28',
  text: '#f4f4f5',
  text2: '#a1a1aa',
  text3: '#71717a',
  text4: '#52525b',
  border: 'rgba(255,255,255,0.06)',
}

// ─── ライトテーマ色定義 ──────────────────────────────────
const lightColors: Omit<ThemeColors, 'palette'> = {
  bg: '#f8fafc',
  bg2: '#ffffff',
  bg3: '#f1f5f9',
  bg4: '#e2e8f0',
  text: '#0f172a',
  text2: '#475569',
  text3: '#64748b',
  text4: '#94a3b8',
  border: 'rgba(0,0,0,0.08)',
}

// ─── テーマ型定義 ────────────────────────────────────────
export type ThemeMode = 'dark' | 'light'

export interface AppTheme {
  mode: ThemeMode
  colors: ThemeColors
  categoryGradients: typeof categoryGradients
  typography: typeof typography
  spacing: typeof spacing
  radii: typeof radii
  transitions: typeof transitions
  layout: typeof layout
  breakpoints: typeof breakpoints
}

// ─── テーマ生成 ──────────────────────────────────────────
function createTheme(mode: ThemeMode): AppTheme {
  const modeColors = mode === 'dark' ? darkColors : lightColors
  return {
    mode,
    colors: {
      ...modeColors,
      palette,
    },
    categoryGradients,
    typography,
    spacing,
    radii,
    transitions,
    layout,
    breakpoints,
  }
}

export const darkTheme = createTheme('dark')
export const lightTheme = createTheme('light')
