/**
 * Scope Resolution — ドメイン型定義
 *
 * v2設計のインポートパイプライン判断層で使用する型。
 * 現行の月単位 blob 保存を壊さず、判断ロジックだけを先に導入する。
 *
 * 3層パイプライン:
 *   Parse（解析）→ Scope Resolution（判断）→ Record Store（保存）
 *   ここでは中間層「Scope Resolution」の入出力型を定義する。
 */

import type { DatedRecord } from './DataTypes'
import type { Store } from './Store'
import type { BudgetData, InventoryConfig } from './BudgetData'
import type { DepartmentKpiData } from './DataTypes'
import type { DataType } from './Settings'

// ─── StorageDataType（レコード系のみ） ────────────────────────

/**
 * records store に保存されるデータ種別。
 * 月別メタ系（budget, settings, departmentKpi）とマスタ系（stores, suppliers）は含まない。
 */
export type RecordStorageDataType =
  | 'purchase'
  | 'classifiedSales'
  | 'categoryTimeSales'
  | 'flowers'
  | 'directProduce'
  | 'interStoreIn'
  | 'interStoreOut'
  | 'consumables'

// ─── ImportScope（影響範囲） ──────────────────────────────────

/** インポートの影響範囲を表す。Scope Resolution が検出する。 */
export interface ImportScope {
  readonly dataType: RecordStorageDataType
  readonly year: number
  readonly month: number
  readonly dayFrom: number
  readonly dayTo: number
  /** 対象店舗ID（incoming から収集。空配列にしない） */
  readonly storeIds: readonly string[]
  /**
   * 削除ポリシー:
   * - 'upsert-only': 追加・更新のみ。既存レコードは削除しない（デフォルト）
   * - 'replace-scope': スコープ内で incoming に含まれない既存レコードを削除する
   *
   * なぜデフォルトが upsert-only か:
   * ファイルにデータが「含まれない」ことは「削除すべき」か「対象外」か判断できない。
   * 安全側に倒す。
   */
  readonly deletePolicy: 'upsert-only' | 'replace-scope'
}

// ─── RecordChange（レコード単位の変更分類） ───────────────────

export interface RecordAdd {
  readonly kind: 'add'
  readonly naturalKey: string
  readonly record: DatedRecord
}

export interface RecordUpdate {
  readonly kind: 'update'
  readonly naturalKey: string
  readonly record: DatedRecord
  readonly previousRecord: DatedRecord
}

export interface RecordDelete {
  readonly kind: 'delete'
  readonly naturalKey: string
  readonly previousRecord: DatedRecord
}

export type RecordChange = RecordAdd | RecordUpdate | RecordDelete

// ─── ImportOperation（保存命令） ─────────────────────────────

export interface ImportOperation {
  readonly scope: ImportScope
  readonly adds: readonly RecordAdd[]
  readonly updates: readonly RecordUpdate[]
  /** deletePolicy 'upsert-only' の場合は常に空配列 */
  readonly deletes: readonly RecordDelete[]
}

// ─── MonthDataUpdate（月別メタデータ更新） ────────────────────

export interface MonthDataUpdate {
  readonly year: number
  readonly month: number
  /** null = 更新なし */
  readonly settings: ReadonlyMap<string, InventoryConfig> | null
  /** BudgetData をそのまま保持。day分解しない → total が消失しない */
  readonly budget: ReadonlyMap<string, BudgetData> | null
  readonly departmentKpi: DepartmentKpiData | null
}

// ─── SourceFileInfo ──────────────────────────────────────────

export interface SourceFileInfo {
  readonly filename: string
  readonly dataType: DataType
  readonly recordCount: number
  readonly coveredMonths: readonly { year: number; month: number }[]
}

// ─── ImportPlan（保存命令書） ─────────────────────────────────

export interface ImportPlan {
  readonly importId: string
  readonly importedAt: string
  readonly sourceFiles: readonly SourceFileInfo[]
  /** DatedRecord 系の保存命令 */
  readonly operations: readonly ImportOperation[]
  /** マスタデータの更新 */
  readonly masterUpdates: {
    readonly stores: ReadonlyMap<string, Store>
    readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  }
  /** 月別メタデータの更新（budget, settings, departmentKpi） */
  readonly monthDataUpdates: readonly MonthDataUpdate[]
}

// ─── ImportPlanSummary ───────────────────────────────────────

export interface ImportPlanSummary {
  readonly totalAdds: number
  readonly totalUpdates: number
  readonly totalDeletes: number
  readonly isEmpty: boolean
  /** 削除・更新がある場合 true */
  readonly needsConfirmation: boolean
  readonly deleteDetails: readonly {
    readonly dataType: RecordStorageDataType
    readonly year: number
    readonly month: number
    readonly count: number
    readonly reason: string
  }[]
  readonly byDataType: readonly {
    readonly dataType: RecordStorageDataType
    readonly adds: number
    readonly updates: number
    readonly deletes: number
  }[]
}

// ─── StoredRecord（DB から取得したレコード） ──────────────────

/** queryScope で返される、メタフィールド付きレコード */
export interface StoredRecord extends DatedRecord {
  readonly _naturalKey: string
  readonly _dataType: RecordStorageDataType
  readonly _importLogId?: number
}

// ─── ImportPlan → Summary 変換 ───────────────────────────────

export function summarizeImportPlan(plan: ImportPlan): ImportPlanSummary {
  let totalAdds = 0
  let totalUpdates = 0
  let totalDeletes = 0

  const byDataType: {
    dataType: RecordStorageDataType
    adds: number
    updates: number
    deletes: number
  }[] = []

  const deleteDetails: {
    dataType: RecordStorageDataType
    year: number
    month: number
    count: number
    reason: string
  }[] = []

  for (const op of plan.operations) {
    totalAdds += op.adds.length
    totalUpdates += op.updates.length
    totalDeletes += op.deletes.length

    byDataType.push({
      dataType: op.scope.dataType,
      adds: op.adds.length,
      updates: op.updates.length,
      deletes: op.deletes.length,
    })

    if (op.deletes.length > 0) {
      deleteDetails.push({
        dataType: op.scope.dataType,
        year: op.scope.year,
        month: op.scope.month,
        count: op.deletes.length,
        reason:
          op.scope.deletePolicy === 'replace-scope'
            ? 'スコープ内で新データに含まれないレコード'
            : '明示的な削除指定',
      })
    }
  }

  return {
    totalAdds,
    totalUpdates,
    totalDeletes,
    isEmpty: totalAdds === 0 && totalUpdates === 0 && totalDeletes === 0,
    needsConfirmation: totalDeletes > 0 || totalUpdates > 0,
    deleteDetails,
    byDataType,
  }
}
