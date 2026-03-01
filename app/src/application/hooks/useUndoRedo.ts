import { useCallback, useRef, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { calculationCache } from '@/application/services/calculationCache'
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
  const settings = useSettingsStore((s) => s.settings)
  const dataSettings = useDataStore((s) => s.data.settings)

  const undoStack = useRef<UndoSnapshot[]>([])
  const redoStack = useRef<UndoSnapshot[]>([])
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  /** 現在の状態のスナップショットを取得（Map は浅コピーで参照共有を防ぐ） */
  const snapshot = useCallback(
    (label: string): UndoSnapshot => ({
      settings,
      inventorySettings: new Map(dataSettings),
      label,
    }),
    [settings, dataSettings],
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

    // 現在の状態をRedo用に保存（Map を浅コピー）
    redoStack.current.push({
      settings,
      inventorySettings: new Map(dataSettings),
      label: prev.label,
    })

    // 状態を復元（まとめて更新し、最後に1回だけ invalidate）
    useSettingsStore.getState().updateSettings(prev.settings)

    // インベントリ設定を復元
    const currentIds = new Set(dataSettings.keys())
    const prevIds = new Set(prev.inventorySettings.keys())

    for (const [storeId, config] of prev.inventorySettings) {
      useDataStore.getState().updateInventory(storeId, config)
    }
    // 削除された設定（prev に存在しない）は null にリセット
    for (const storeId of currentIds) {
      if (!prevIds.has(storeId)) {
        useDataStore.getState().updateInventory(storeId, {
          openingInventory: null,
          closingInventory: null,
          grossProfitBudget: null,
        })
      }
    }

    // 全更新完了後に1回だけ cache clear + invalidate
    calculationCache.clear()
    useUiStore.getState().invalidateCalculation()

    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [settings, dataSettings])

  /** Redo: Undoした操作をやり直す */
  const redo = useCallback(() => {
    const next = redoStack.current.pop()
    if (!next) return

    // 現在の状態をUndo用に保存（Map を浅コピー）
    undoStack.current.push({
      settings,
      inventorySettings: new Map(dataSettings),
      label: next.label,
    })

    // 状態を復元（まとめて更新し、最後に1回だけ invalidate）
    useSettingsStore.getState().updateSettings(next.settings)

    for (const [storeId, config] of next.inventorySettings) {
      useDataStore.getState().updateInventory(storeId, config)
    }

    // 全更新完了後に1回だけ cache clear + invalidate
    calculationCache.clear()
    useUiStore.getState().invalidateCalculation()

    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [settings, dataSettings])

  return {
    undo,
    redo,
    saveSnapshot,
    canUndo,
    canRedo,
  }
}
