/**
 * アプリケーション全体のキーボードショートカット結線
 *
 * ショートカット + undo/redo + calculate + settings を一箇所で結線する。
 * AppContent から呼び出され、各ハンドラをまとめてキーボードショートカットに渡す。
 */
import { useState, useCallback, useMemo } from 'react'
import { useKeyboardShortcuts, useUndoRedo, useCalculation } from '@/application/hooks'
import type { ViewType } from '@/domain/models'

interface UseAppShortcutsOptions {
  readonly onViewChange: (view: ViewType) => void
  /** トースト表示関数（presentation 層から注入） */
  readonly showToast: (message: string, type: 'success' | 'info' | 'error') => void
}

export function useAppShortcuts({ onViewChange, showToast }: UseAppShortcutsOptions) {
  const { calculate } = useCalculation()
  const { undo, redo } = useUndoRedo()
  const [showSettings, setShowSettings] = useState(false)

  const handleCalculate = useCallback(() => {
    calculate()
    showToast('計算を実行しました', 'success')
  }, [calculate, showToast])

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false)
  }, [])

  const handleUndo = useCallback(() => {
    undo()
    showToast('操作を取り消しました', 'info')
  }, [undo, showToast])

  const handleRedo = useCallback(() => {
    redo()
    showToast('操作をやり直しました', 'info')
  }, [redo, showToast])

  const shortcutHandlers = useMemo(
    () => ({
      onViewChange,
      onCalculate: handleCalculate,
      onOpenSettings: handleOpenSettings,
      onUndo: handleUndo,
      onRedo: handleRedo,
    }),
    [onViewChange, handleCalculate, handleOpenSettings, handleUndo, handleRedo],
  )

  useKeyboardShortcuts(shortcutHandlers)

  return { showSettings, handleOpenSettings, handleCloseSettings }
}
