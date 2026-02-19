import { useEffect, useCallback } from 'react'
import type { ViewType } from '@/domain/models'

/** ビューの順序（数字キー 1-9 対応） */
const VIEW_ORDER: ViewType[] = [
  'dashboard',
  'category',
  'forecast',
  'analysis',
  'daily',
  'transfer',
  'consumable',
  'summary',
  'reports',
]

interface KeyboardShortcutHandlers {
  onViewChange: (view: ViewType) => void
  onCalculate: () => void
  onOpenSettings: () => void
  onUndo?: () => void
  onRedo?: () => void
}

/**
 * グローバルキーボードショートカット
 *
 * - 1-9: ビュー切替（ダッシュボード〜レポート）
 * - Ctrl+Enter: 計算実行
 * - Ctrl+,: 設定モーダル
 * - Ctrl+Z: Undo
 * - Ctrl+Shift+Z / Ctrl+Y: Redo
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // テキスト入力中は無視
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Ctrl+Z / Ctrl+Shift+Z はテキスト入力中でもブラウザ標準のundo/redoに委任
        return
      }

      // モーダル表示中はビュー切替を無効化（ESCはModal自体で処理）
      const hasModal = document.querySelector('[data-modal-backdrop]')

      const ctrl = e.ctrlKey || e.metaKey

      // ── Ctrl+Enter: 計算実行 ──
      if (ctrl && e.key === 'Enter') {
        e.preventDefault()
        handlers.onCalculate()
        return
      }

      // ── Ctrl+,: 設定モーダル ──
      if (ctrl && e.key === ',') {
        e.preventDefault()
        handlers.onOpenSettings()
        return
      }

      // ── Ctrl+Z: Undo ──
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault()
        handlers.onUndo?.()
        return
      }

      // ── Ctrl+Shift+Z / Ctrl+Y: Redo ──
      if ((ctrl && e.shiftKey && e.key === 'Z') || (ctrl && e.key === 'y')) {
        e.preventDefault()
        handlers.onRedo?.()
        return
      }

      // ── 数字キー 1-9: ビュー切替（モーダル非表示時のみ） ──
      if (!ctrl && !e.altKey && !e.shiftKey && !hasModal) {
        const num = parseInt(e.key)
        if (num >= 1 && num <= 9 && num <= VIEW_ORDER.length) {
          e.preventDefault()
          handlers.onViewChange(VIEW_ORDER[num - 1])
          return
        }
      }
    },
    [handlers],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
