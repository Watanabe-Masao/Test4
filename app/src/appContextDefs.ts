/**
 * App レベルコンテキスト定義（型 + createContext + hooks）
 *
 * react-refresh/only-export-components 対応のため、
 * App.tsx からコンテキスト定義とフックを分離。
 */
import { createContext, useContext } from 'react'
import type { ThemeMode } from '@/presentation/theme'

// ─── テーマトグルコンテキスト ────────────────────────────────
export const ThemeToggleContext = createContext<{ mode: ThemeMode; toggle: () => void }>({
  mode: 'dark',
  toggle: () => {},
})
export const useThemeToggle = () => useContext(ThemeToggleContext)

// ─── 設定モーダル表示のコンテキスト ─────────────────────────
export const SettingsModalContext = createContext<{ open: () => void }>({ open: () => {} })
export const useOpenSettings = () => useContext(SettingsModalContext)
