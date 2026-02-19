import { useCallback, useRef, useState } from 'react'
import { useAppState, useAppDispatch } from '../context/AppStateContext'
import type { AppSettings, InventoryConfig } from '@/domain/models'

/**
 * Undo/Redo 対象のスナップショット
 * 設定変更とインベントリ変更のみを追跡（データインポートはundoしない）
 */
interface UndoSnapshot {
  readonly settings: AppSettings
  readonly inventorySettings: ReadonlyMap<string, InventoryConfig>
  readonly label: string
}

const MAX_HISTORY = 50

/**
 * Undo/Redo フック
 *
 * 設定変更・在庫設定変更を追跡し、取り消し・やり直しを可能にする。
 * データインポートはスコープ外（破壊的操作のため）。
 */
export function useUndoRedo() {
  const state = useAppState()
  const dispatch = useAppDispatch()

  const undoStack = useRef<UndoSnapshot[]>([])
  const redoStack = useRef<UndoSnapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  /** 現在の状態のスナップショットを取得 */
  const snapshot = useCallback(
    (label: string): UndoSnapshot => ({
      settings: state.settings,
      inventorySettings: state.data.settings,
      label,
    }),
    [state.settings, state.data.settings],
  )

  /** 変更前にスナップショットを保存 */
  const saveSnapshot = useCallback(
    (label: string) => {
      undoStack.current = [...undoStack.current.slice(-MAX_HISTORY + 1), snapshot(label)]
      redoStack.current = [] // Redo履歴をクリア
      setCanUndo(true)
      setCanRedo(false)
    },
    [snapshot],
  )

  /** Undo: 直前の状態に戻す */
  const undo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev) return

    // 現在の状態をRedo用に保存
    redoStack.current.push({
      settings: state.settings,
      inventorySettings: state.data.settings,
      label: prev.label,
    })

    // 状態を復元
    dispatch({ type: 'UPDATE_SETTINGS', payload: prev.settings })

    // インベントリ設定を復元（個別にdispatch）
    const currentIds = new Set(state.data.settings.keys())
    const prevIds = new Set(prev.inventorySettings.keys())

    for (const [storeId, config] of prev.inventorySettings) {
      dispatch({ type: 'UPDATE_INVENTORY', payload: { storeId, config } })
    }
    // 削除された設定（prev に存在しない）は null にリセット
    for (const storeId of currentIds) {
      if (!prevIds.has(storeId)) {
        dispatch({
          type: 'UPDATE_INVENTORY',
          payload: {
            storeId,
            config: { openingInventory: null, closingInventory: null, grossProfitBudget: null },
          },
        })
      }
    }

    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [state.settings, state.data.settings, dispatch])

  /** Redo: Undoした操作をやり直す */
  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return

    // 現在の状態をUndo用に保存
    undoStack.current.push({
      settings: state.settings,
      inventorySettings: state.data.settings,
      label: next.label,
    })

    // 状態を復元
    dispatch({ type: 'UPDATE_SETTINGS', payload: next.settings })

    for (const [storeId, config] of next.inventorySettings) {
      dispatch({ type: 'UPDATE_INVENTORY', payload: { storeId, config } })
    }

    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [state.settings, state.data.settings, dispatch])

  return {
    undo,
    redo,
    saveSnapshot,
    canUndo,
    canRedo,
  }
}
