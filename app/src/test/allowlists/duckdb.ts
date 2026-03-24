/**
 * ガードテスト許可リスト — DuckDB hook 直接使用（移行カウントダウン）
 *
 * 移行完了履歴（2026-03-23）:
 * - QueryHandler 移行完了: 22チャート
 * - facade hook 移行完了: PurchaseAnalysisPage, StorageManagementTab
 * - bridge 卒業完了: useUnifiedWidgetContext → useWidgetQueryContext 抽出
 *
 * 追加整理（2026-03-24）:
 * - 後方互換バレル削除: useDuckDBQuery.ts, useDuckDBTimeSlotData.ts, useDuckDBTimeSlotDataLogic.ts
 * - エイリアス削除: useDuckDBTimeSlotData → useTimeSlotData に正規化
 * - 全消費者を正本パス（@/application/hooks/duckdb, @/application/hooks/useTimeSlotData）に移行
 */
import type { AllowlistEntry } from './types'

/** presentation/ での DuckDB hook 直接使用（移行カウントダウン）— 全件卒業済み */
export const presentationDuckdbHook: readonly AllowlistEntry[] = [] as const
