/**
 * App Lifecycle 統合フック
 *
 * 複数の状態ソース（Persistence復元、DuckDBエンジン、SW更新）を束ねて
 * 単一の AppLifecycleStatus を導出する。
 *
 * 状態導出の優先順位（上が高い）:
 * 1. error（復元エラー or エンジンエラー）
 * 2. applying_update（SW更新中 — リロード確定）
 * 3. restoring（IndexedDB からデータ復元中）
 * 4. initializing_engine（DuckDB WASM 初期化中）
 * 5. booting（復元もエンジン初期化もまだ完了していない初期状態）
 * 6. ready
 *
 * @responsibility R:unclassified
 */
import { useSyncExternalStore } from 'react'
import type {
  AppLifecycleStatus,
  AppLifecyclePhase,
} from '@/application/lifecycle/appLifecycleContract'
import { isBlockingPhase } from '@/application/lifecycle/appLifecycleContract'
import type { PersistenceStatusInfo } from '@/application/hooks/usePersistence'
import { getDuckDBEngine } from '@/infrastructure/duckdb/engine'
import type { DuckDBEngineState } from '@/infrastructure/duckdb/engine'
import { subscribeSwUpdate, getSwUpdateSnapshot } from '@/application/lifecycle/swUpdateSignal'

// ─── DuckDB エンジン状態の購読 ────────────────────────────

function subscribeDuckDBEngine(onStoreChange: () => void): () => void {
  return getDuckDBEngine().onStateChange(onStoreChange)
}

function getDuckDBEngineSnapshot(): DuckDBEngineState {
  return getDuckDBEngine().state
}

function useDuckDBEngineState(): DuckDBEngineState {
  return useSyncExternalStore(subscribeDuckDBEngine, getDuckDBEngineSnapshot, () => 'idle' as const)
}

// ─── SW 更新状態の購読 ────────────────────────────────────

function useSwUpdateApplying(): boolean {
  return useSyncExternalStore(subscribeSwUpdate, getSwUpdateSnapshot, () => false)
}

// ─── フェーズ導出 ─────────────────────────────────────────

function derivePhase(
  persistence: PersistenceStatusInfo,
  engineState: DuckDBEngineState,
  swUpdateApplying: boolean,
): AppLifecyclePhase {
  // 1. エラー（最優先）
  if (persistence.restoreError) return 'error'
  if (engineState === 'error') return 'error'

  // 2. SW 更新適用中（リロード確定）
  if (swUpdateApplying) return 'applying_update'

  // 3. 復元中
  if (persistence.isRestoring) return 'restoring'

  // 4. エンジン初期化中
  if (engineState === 'idle' || engineState === 'initializing') return 'initializing_engine'

  // 5. 復元完了前の初期状態
  if (!persistence.autoRestored) return 'booting'

  // 6. 準備完了
  return 'ready'
}

// ─── エラーメッセージ導出 ─────────────────────────────────

function deriveError(
  persistence: PersistenceStatusInfo,
  engineState: DuckDBEngineState,
): string | null {
  if (persistence.restoreError) return persistence.restoreError
  if (engineState === 'error') {
    const engine = getDuckDBEngine()
    return engine.error?.message ?? 'DuckDB engine error'
  }
  return null
}

// ─── 公開フック ──────────────────────────────────────────

export interface UseAppLifecycleInput {
  readonly persistence: PersistenceStatusInfo
}

export function useAppLifecycle(input: UseAppLifecycleInput): AppLifecycleStatus {
  const engineState = useDuckDBEngineState()
  const swUpdateApplying = useSwUpdateApplying()

  const phase = derivePhase(input.persistence, engineState, swUpdateApplying)

  return {
    phase,
    blocking: isBlockingPhase(phase),
    error: deriveError(input.persistence, engineState),
  }
}
