/**
 * 差分計算ロジック
 *
 * 既存データと新規データを比較し、以下の3種類の変更を検出する:
 * 1. 新規挿入: 既存に値がなく、新規に値がある → 自動承認
 * 2. 値変更:   既存に値があり、新規に異なる値がある → ユーザー確認
 * 3. 値削除:   既存に値があり、新規に値がない → ユーザー確認
 */
import type { FieldChange, DataTypeDiff, DiffResult } from '@/domain/models/analysis'
import type {
  DatedRecord,
  CategoryTimeSalesData,
  ClassifiedSalesData,
} from '@/domain/models/record'
import type { DataSummaryInput } from '@/application/services/dataSummary'
import { categoryTimeSalesRecordKey, classifiedSalesRecordKey } from '@/domain/models/record'

/** フラットレコードの一意キーを生成（storeId + day） */
function flatRecordKey(rec: DatedRecord): string {
  return `${rec.storeId}\t${rec.day}`
}

// ドメイン層で定義された型を再エクスポート
export type { FieldChange, DataTypeDiff, DiffResult } from '@/domain/models/analysis'

// ─── データ種別名マッピング ──────────────────────────────

const DATA_TYPE_NAMES: Record<string, string> = {
  purchase: '仕入',
  classifiedSales: '分類別売上',
  interStoreIn: '店間入',
  interStoreOut: '店間出',
  flowers: '花',
  directProduce: '産直',
  consumables: '消耗品',
  categoryTimeSales: '分類別時間帯売上',
  settings: '在庫設定',
  budget: '予算',
}

// ─── 値の比較ヘルパー ────────────────────────────────────

/** 2つの値を数値として比較（浮動小数点対応） */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.001
  }
  return JSON.stringify(a) === JSON.stringify(b)
}

/** DatedRecord のメタフィールド（差分比較から除外） */
const DATED_RECORD_FIELDS = new Set(['year', 'month', 'day', 'storeId'])

/** day エントリの全フィールドを flat に展開して比較する */
function flattenDayEntry(entry: Record<string, unknown>, prefix = ''): Map<string, unknown> {
  const result = new Map<string, unknown>()
  for (const [key, val] of Object.entries(entry)) {
    // トップレベルの DatedRecord フィールドはキー情報なので差分対象外
    if (!prefix && DATED_RECORD_FIELDS.has(key)) continue
    const path = prefix ? `${prefix}.${key}` : key
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      for (const [k2, v2] of flattenDayEntry(val as Record<string, unknown>, path)) {
        result.set(k2, v2)
      }
    } else {
      result.set(path, val)
    }
  }
  return result
}

/** 店名をルックアップ */
function getStoreName(
  storeId: string,
  existing: DataSummaryInput,
  incoming: DataSummaryInput,
): string {
  return existing.stores.get(storeId)?.name ?? incoming.stores.get(storeId)?.name ?? storeId
}

// ─── フラットレコード配列の差分計算 ───────────────────────────

function diffFlatRecords(
  existingRecords: readonly DatedRecord[],
  incomingRecords: readonly DatedRecord[],
  dataType: string,
  existingData: DataSummaryInput,
  incomingData: DataSummaryInput,
): DataTypeDiff {
  const inserts: FieldChange[] = []
  const modifications: FieldChange[] = []
  const removals: FieldChange[] = []

  // キーでインデックス化
  const existingMap = new Map<string, DatedRecord>()
  for (const r of existingRecords) {
    existingMap.set(flatRecordKey(r), r)
  }
  const incomingMap = new Map<string, DatedRecord>()
  for (const r of incomingRecords) {
    incomingMap.set(flatRecordKey(r), r)
  }

  // 新規・変更の検出
  for (const [key, incRec] of incomingMap) {
    const exRec = existingMap.get(key)
    const storeName = getStoreName(incRec.storeId, existingData, incomingData)

    if (!exRec) {
      // 既存に当日データなし → 全て新規挿入
      const fields = flattenDayEntry(incRec as unknown as Record<string, unknown>)
      for (const [fieldPath, newVal] of fields) {
        if (newVal !== 0 && newVal !== null && newVal !== undefined) {
          inserts.push({
            storeId: incRec.storeId,
            storeName,
            day: incRec.day,
            fieldPath,
            oldValue: null,
            newValue: formatValue(newVal),
          })
        }
      }
    } else {
      // 既存に当日データあり → フィールド単位で比較
      const oldFields = flattenDayEntry(exRec as unknown as Record<string, unknown>)
      const newFields = flattenDayEntry(incRec as unknown as Record<string, unknown>)

      // 新規側のフィールドを走査
      for (const [fieldPath, newVal] of newFields) {
        const oldVal = oldFields.get(fieldPath)
        if (oldVal === undefined || oldVal === null || oldVal === 0) {
          // 既存に値がない → 挿入
          if (newVal !== 0 && newVal !== null && newVal !== undefined) {
            inserts.push({
              storeId: incRec.storeId,
              storeName,
              day: incRec.day,
              fieldPath,
              oldValue: null,
              newValue: formatValue(newVal),
            })
          }
        } else if (!valuesEqual(oldVal, newVal)) {
          // 値が異なる → 変更
          modifications.push({
            storeId: incRec.storeId,
            storeName,
            day: incRec.day,
            fieldPath,
            oldValue: formatValue(oldVal),
            newValue: formatValue(newVal),
          })
        }
      }

      // 既存側にあって新規にないフィールド → 削除
      for (const [fieldPath, oldVal] of oldFields) {
        if (oldVal !== 0 && oldVal !== null && oldVal !== undefined) {
          const newVal = newFields.get(fieldPath)
          if (newVal === undefined || newVal === null || newVal === 0) {
            removals.push({
              storeId: exRec.storeId,
              storeName,
              day: exRec.day,
              fieldPath,
              oldValue: formatValue(oldVal),
              newValue: null,
            })
          }
        }
      }
    }
  }

  // 既存にあって新規にないレコード → 削除
  for (const [key, exRec] of existingMap) {
    if (!incomingMap.has(key)) {
      const storeName = getStoreName(exRec.storeId, existingData, incomingData)
      const fields = flattenDayEntry(exRec as unknown as Record<string, unknown>)
      for (const [fieldPath, oldVal] of fields) {
        if (oldVal !== 0 && oldVal !== null && oldVal !== undefined) {
          removals.push({
            storeId: exRec.storeId,
            storeName,
            day: exRec.day,
            fieldPath,
            oldValue: formatValue(oldVal),
            newValue: null,
          })
        }
      }
    }
  }

  return {
    dataType,
    dataTypeName: DATA_TYPE_NAMES[dataType] ?? dataType,
    inserts,
    modifications,
    removals,
  }
}

function formatValue(val: unknown): number | string | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  if (typeof val === 'string') return val
  return JSON.stringify(val)
}

// ─── CategoryTimeSales の差分計算 ─────────────────────────

function diffCategoryTimeSales(
  existing: CategoryTimeSalesData,
  incoming: CategoryTimeSalesData,
): DataTypeDiff {
  const inserts: FieldChange[] = []
  const modifications: FieldChange[] = []
  const removals: FieldChange[] = []

  const existingMap = new Map(existing.records.map((r) => [categoryTimeSalesRecordKey(r), r]))
  const incomingMap = new Map(incoming.records.map((r) => [categoryTimeSalesRecordKey(r), r]))

  // 新規・変更の検出
  for (const [key, incRec] of incomingMap) {
    const exRec = existingMap.get(key)
    const storeName = incRec.storeId
    const fieldPath = `${incRec.department.name}>${incRec.line.name}>${incRec.klass.name}`

    if (!exRec) {
      // 新規レコード
      if (incRec.totalAmount !== 0) {
        inserts.push({
          storeId: incRec.storeId,
          storeName,
          day: incRec.day,
          fieldPath,
          oldValue: null,
          newValue: incRec.totalAmount,
        })
      }
    } else if (
      exRec.totalAmount !== incRec.totalAmount ||
      exRec.totalQuantity !== incRec.totalQuantity
    ) {
      // 値変更
      modifications.push({
        storeId: incRec.storeId,
        storeName,
        day: incRec.day,
        fieldPath,
        oldValue: exRec.totalAmount,
        newValue: incRec.totalAmount,
      })
    }
  }

  // 削除の検出
  for (const [key, exRec] of existingMap) {
    if (!incomingMap.has(key) && exRec.totalAmount !== 0) {
      const fieldPath = `${exRec.department.name}>${exRec.line.name}>${exRec.klass.name}`
      removals.push({
        storeId: exRec.storeId,
        storeName: exRec.storeId,
        day: exRec.day,
        fieldPath,
        oldValue: exRec.totalAmount,
        newValue: null,
      })
    }
  }

  return {
    dataType: 'categoryTimeSales',
    dataTypeName: DATA_TYPE_NAMES.categoryTimeSales ?? '分類別時間帯売上',
    inserts,
    modifications,
    removals,
  }
}

// ─── ClassifiedSales の差分計算 ──────────────────────────

function diffClassifiedSales(
  existing: ClassifiedSalesData,
  incoming: ClassifiedSalesData,
): DataTypeDiff {
  const inserts: FieldChange[] = []
  const modifications: FieldChange[] = []
  const removals: FieldChange[] = []

  const existingMap = new Map(existing.records.map((r) => [classifiedSalesRecordKey(r), r]))
  const incomingMap = new Map(incoming.records.map((r) => [classifiedSalesRecordKey(r), r]))

  for (const [key, incRec] of incomingMap) {
    const exRec = existingMap.get(key)
    const fieldPath = `${incRec.groupName}>${incRec.departmentName}>${incRec.lineName}>${incRec.className}`

    if (!exRec) {
      if (incRec.salesAmount !== 0) {
        inserts.push({
          storeId: incRec.storeId,
          storeName: incRec.storeName,
          day: incRec.day,
          fieldPath,
          oldValue: null,
          newValue: incRec.salesAmount,
        })
      }
    } else if (exRec.salesAmount !== incRec.salesAmount) {
      modifications.push({
        storeId: incRec.storeId,
        storeName: incRec.storeName,
        day: incRec.day,
        fieldPath,
        oldValue: exRec.salesAmount,
        newValue: incRec.salesAmount,
      })
    }
  }

  for (const [key, exRec] of existingMap) {
    if (!incomingMap.has(key) && exRec.salesAmount !== 0) {
      const fieldPath = `${exRec.groupName}>${exRec.departmentName}>${exRec.lineName}>${exRec.className}`
      removals.push({
        storeId: exRec.storeId,
        storeName: exRec.storeName,
        day: exRec.day,
        fieldPath,
        oldValue: exRec.salesAmount,
        newValue: null,
      })
    }
  }

  return {
    dataType: 'classifiedSales',
    dataTypeName: DATA_TYPE_NAMES.classifiedSales ?? '分類別売上',
    inserts,
    modifications,
    removals,
  }
}

// ─── メイン差分計算 ──────────────────────────────────────

/** フラットレコード系フィールド一覧 */
const DIFFABLE_FIELDS: readonly { field: keyof DataSummaryInput; type: string }[] = [
  { field: 'purchase', type: 'purchase' },
  // classifiedSales は個別処理（下記 diffClassifiedSales）
  { field: 'interStoreIn', type: 'interStoreIn' },
  { field: 'interStoreOut', type: 'interStoreOut' },
  { field: 'flowers', type: 'flowers' },
  { field: 'directProduce', type: 'directProduce' },
  { field: 'consumables', type: 'consumables' },
]

/**
 * 既存データと新規インポートデータの差分を計算する。
 *
 * @param existing  IndexedDB に保存されている既存データ
 * @param incoming  今回インポートされた新規データ
 * @param importedTypes  今回インポートで実際に処理されたデータ種別（これ以外は比較しない）
 * @returns 差分結果
 */
export function calculateDiff(
  existing: DataSummaryInput,
  incoming: DataSummaryInput,
  importedTypes: ReadonlySet<string>,
): DiffResult {
  const diffs: DataTypeDiff[] = []
  const autoApproved: string[] = []

  for (const { field, type } of DIFFABLE_FIELDS) {
    // 今回インポートされなかった種別はスキップ
    if (!importedTypes.has(type)) continue

    const existingData = existing[field] as { readonly records: readonly DatedRecord[] }
    const incomingData = incoming[field] as { readonly records: readonly DatedRecord[] }

    // 既存が空 → 全て新規挿入なので差分チェック不要
    if (existingData.records.length === 0) {
      autoApproved.push(type)
      continue
    }

    // 新規が空 → 今回そのデータ種別はインポートされていない
    if (incomingData.records.length === 0) {
      continue
    }

    const diff = diffFlatRecords(
      existingData.records,
      incomingData.records,
      type,
      existing,
      incoming,
    )
    if (diff.inserts.length > 0 || diff.modifications.length > 0 || diff.removals.length > 0) {
      diffs.push(diff)
    }

    // 挿入のみで変更・削除なし → 自動承認
    if (diff.modifications.length === 0 && diff.removals.length === 0) {
      autoApproved.push(type)
    }
  }

  // ClassifiedSales: フラット配列形式のため個別処理
  if (importedTypes.has('classifiedSales')) {
    const existingCS = existing.classifiedSales
    const incomingCS = incoming.classifiedSales

    if (existingCS.records.length === 0) {
      autoApproved.push('classifiedSales')
    } else if (incomingCS.records.length > 0) {
      const diff = diffClassifiedSales(existingCS, incomingCS)
      if (diff.inserts.length > 0 || diff.modifications.length > 0 || diff.removals.length > 0) {
        diffs.push(diff)
      }
      if (diff.modifications.length === 0 && diff.removals.length === 0) {
        autoApproved.push('classifiedSales')
      }
    }
  }

  // CategoryTimeSales: フラット配列形式のため個別処理
  if (importedTypes.has('categoryTimeSales')) {
    const existingCTS = existing.categoryTimeSales
    const incomingCTS = incoming.categoryTimeSales

    if (existingCTS.records.length === 0) {
      autoApproved.push('categoryTimeSales')
    } else if (incomingCTS.records.length > 0) {
      const diff = diffCategoryTimeSales(existingCTS, incomingCTS)
      if (diff.inserts.length > 0 || diff.modifications.length > 0 || diff.removals.length > 0) {
        diffs.push(diff)
      }
      if (diff.modifications.length === 0 && diff.removals.length === 0) {
        autoApproved.push('categoryTimeSales')
      }
    }
  }

  // prevYearCategoryTimeSales は当年保存対象外（実際の年月に保存される）

  const needsConfirmation = diffs.some((d) => d.modifications.length > 0 || d.removals.length > 0)

  return { diffs, needsConfirmation, autoApproved }
}
