/**
 * 差分計算ロジック
 *
 * 既存データと新規データを比較し、以下の3種類の変更を検出する:
 * 1. 新規挿入: 既存に値がなく、新規に値がある → 自動承認
 * 2. 値変更:   既存に値があり、新規に異なる値がある → ユーザー確認
 * 3. 値削除:   既存に値があり、新規に値がない → ユーザー確認
 */
import type { ImportedData, StoreDayRecord, CategoryTimeSalesData, FieldChange, DataTypeDiff, DiffResult } from '@/domain/models'
import { categoryTimeSalesRecordKey } from '@/domain/models'

// ドメイン層で定義された型を再エクスポート
export type { FieldChange, DataTypeDiff, DiffResult } from '@/domain/models'

/** 変更種別 */
export type ChangeType = 'insert' | 'modify' | 'remove'

// ─── データ種別名マッピング ──────────────────────────────

const DATA_TYPE_NAMES: Record<string, string> = {
  purchase: '仕入',
  sales: '売上',
  discount: '売変',
  prevYearSales: '前年売上',
  prevYearDiscount: '前年売変',
  interStoreIn: '店間入',
  interStoreOut: '店間出',
  flowers: '花',
  directProduce: '産直',
  consumables: '消耗品',
  categoryTimeSales: '分類別時間帯売上',
  prevYearCategoryTimeSales: '前年分類別時間帯売上',
  settings: '在庫設定',
  budget: '予算',
}

// ─── 値の比較ヘルパー ────────────────────────────────────

/** オブジェクトが空か判定 */
function isEmptyRecord(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0
}

/** 2つの値を数値として比較（浮動小数点対応） */
function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 0.001
  }
  return JSON.stringify(a) === JSON.stringify(b)
}

/** day エントリの全フィールドを flat に展開して比較する */
function flattenDayEntry(entry: Record<string, unknown>, prefix = ''): Map<string, unknown> {
  const result = new Map<string, unknown>()
  for (const [key, val] of Object.entries(entry)) {
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
  existing: ImportedData,
  incoming: ImportedData,
): string {
  return existing.stores.get(storeId)?.name
    ?? incoming.stores.get(storeId)?.name
    ?? storeId
}

// ─── StoreDayRecord の差分計算 ───────────────────────────

function diffStoreDayRecord(
  existing: StoreDayRecord<Record<string, unknown>>,
  incoming: StoreDayRecord<Record<string, unknown>>,
  dataType: string,
  existingData: ImportedData,
  incomingData: ImportedData,
): DataTypeDiff {
  const inserts: FieldChange[] = []
  const modifications: FieldChange[] = []
  const removals: FieldChange[] = []

  // 新規データのキーを走査
  for (const [storeId, incomingDays] of Object.entries(incoming)) {
    const existingDays = existing[storeId]
    const storeName = getStoreName(storeId, existingData, incomingData)

    for (const [dayStr, incomingEntry] of Object.entries(incomingDays)) {
      const day = Number(dayStr)
      const existingEntry = existingDays?.[day]

      if (!existingEntry) {
        // 既存に当日データなし → 全て新規挿入
        const fields = flattenDayEntry(incomingEntry as Record<string, unknown>)
        for (const [fieldPath, newVal] of fields) {
          if (newVal !== 0 && newVal !== null && newVal !== undefined) {
            inserts.push({ storeId, storeName, day, fieldPath, oldValue: null, newValue: formatValue(newVal) })
          }
        }
      } else {
        // 既存に当日データあり → フィールド単位で比較
        const oldFields = flattenDayEntry(existingEntry as Record<string, unknown>)
        const newFields = flattenDayEntry(incomingEntry as Record<string, unknown>)

        // 新規側のフィールドを走査
        for (const [fieldPath, newVal] of newFields) {
          const oldVal = oldFields.get(fieldPath)
          if (oldVal === undefined || oldVal === null || oldVal === 0) {
            // 既存に値がない → 挿入
            if (newVal !== 0 && newVal !== null && newVal !== undefined) {
              inserts.push({ storeId, storeName, day, fieldPath, oldValue: null, newValue: formatValue(newVal) })
            }
          } else if (!valuesEqual(oldVal, newVal)) {
            // 値が異なる → 変更
            modifications.push({ storeId, storeName, day, fieldPath, oldValue: formatValue(oldVal), newValue: formatValue(newVal) })
          }
        }

        // 既存側にあって新規にないフィールド → 削除
        for (const [fieldPath, oldVal] of oldFields) {
          if (oldVal !== 0 && oldVal !== null && oldVal !== undefined) {
            const newVal = newFields.get(fieldPath)
            if (newVal === undefined || newVal === null || newVal === 0) {
              removals.push({ storeId, storeName, day, fieldPath, oldValue: formatValue(oldVal), newValue: null })
            }
          }
        }
      }
    }

    // 既存にあって新規にない日 → 削除
    if (existingDays) {
      for (const [dayStr, existingEntry] of Object.entries(existingDays)) {
        const day = Number(dayStr)
        if (!incomingDays[day]) {
          const fields = flattenDayEntry(existingEntry as Record<string, unknown>)
          for (const [fieldPath, oldVal] of fields) {
            if (oldVal !== 0 && oldVal !== null && oldVal !== undefined) {
              const storeName = getStoreName(storeId, existingData, incomingData)
              removals.push({ storeId, storeName, day, fieldPath, oldValue: formatValue(oldVal), newValue: null })
            }
          }
        }
      }
    }
  }

  // 既存にあって新規データに店舗ごと存在しない → 削除
  for (const [storeId, existingDays] of Object.entries(existing)) {
    if (!incoming[storeId]) {
      const storeName = getStoreName(storeId, existingData, incomingData)
      for (const [dayStr, existingEntry] of Object.entries(existingDays)) {
        const day = Number(dayStr)
        const fields = flattenDayEntry(existingEntry as Record<string, unknown>)
        for (const [fieldPath, oldVal] of fields) {
          if (oldVal !== 0 && oldVal !== null && oldVal !== undefined) {
            removals.push({ storeId, storeName, day, fieldPath, oldValue: formatValue(oldVal), newValue: null })
          }
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
    } else if (exRec.totalAmount !== incRec.totalAmount || exRec.totalQuantity !== incRec.totalQuantity) {
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

// ─── メイン差分計算 ──────────────────────────────────────

/** StoreDayRecord 系フィールド一覧 */
const DIFFABLE_FIELDS: readonly { field: keyof ImportedData; type: string }[] = [
  { field: 'purchase', type: 'purchase' },
  { field: 'sales', type: 'sales' },
  { field: 'discount', type: 'discount' },
  { field: 'prevYearSales', type: 'prevYearSales' },
  { field: 'prevYearDiscount', type: 'prevYearDiscount' },
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
  existing: ImportedData,
  incoming: ImportedData,
  importedTypes: ReadonlySet<string>,
): DiffResult {
  const diffs: DataTypeDiff[] = []
  const autoApproved: string[] = []

  for (const { field, type } of DIFFABLE_FIELDS) {
    // 今回インポートされなかった種別はスキップ
    if (!importedTypes.has(type)) continue

    const existingRecord = existing[field] as unknown as StoreDayRecord<Record<string, unknown>>
    const incomingRecord = incoming[field] as unknown as StoreDayRecord<Record<string, unknown>>

    // 既存が空 → 全て新規挿入なので差分チェック不要
    if (isEmptyRecord(existingRecord as Record<string, unknown>)) {
      autoApproved.push(type)
      continue
    }

    // 新規が空 → 今回そのデータ種別はインポートされていない
    if (isEmptyRecord(incomingRecord as Record<string, unknown>)) {
      continue
    }

    const diff = diffStoreDayRecord(existingRecord, incomingRecord, type, existing, incoming)
    if (diff.inserts.length > 0 || diff.modifications.length > 0 || diff.removals.length > 0) {
      diffs.push(diff)
    }

    // 挿入のみで変更・削除なし → 自動承認
    if (diff.modifications.length === 0 && diff.removals.length === 0) {
      autoApproved.push(type)
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

  // prevYearCategoryTimeSales: 前年分類別時間帯売上
  if (importedTypes.has('prevYearCategoryTimeSales')) {
    const existingPCTS = existing.prevYearCategoryTimeSales
    const incomingPCTS = incoming.prevYearCategoryTimeSales

    if (existingPCTS.records.length === 0) {
      autoApproved.push('prevYearCategoryTimeSales')
    } else if (incomingPCTS.records.length > 0) {
      const diff = diffCategoryTimeSales(existingPCTS, incomingPCTS)
      // dataType を上書き
      const prevDiff: DataTypeDiff = {
        ...diff,
        dataType: 'prevYearCategoryTimeSales',
        dataTypeName: DATA_TYPE_NAMES.prevYearCategoryTimeSales ?? '前年分類別時間帯売上',
      }
      if (prevDiff.inserts.length > 0 || prevDiff.modifications.length > 0 || prevDiff.removals.length > 0) {
        diffs.push(prevDiff)
      }
      if (prevDiff.modifications.length === 0 && prevDiff.removals.length === 0) {
        autoApproved.push('prevYearCategoryTimeSales')
      }
    }
  }

  const needsConfirmation = diffs.some(
    (d) => d.modifications.length > 0 || d.removals.length > 0,
  )

  return { diffs, needsConfirmation, autoApproved }
}

/**
 * 差分結果の概要テキストを生成する
 */
export function summarizeDiff(diff: DiffResult): string {
  const parts: string[] = []
  let totalInserts = 0
  let totalModifications = 0
  let totalRemovals = 0

  for (const d of diff.diffs) {
    totalInserts += d.inserts.length
    totalModifications += d.modifications.length
    totalRemovals += d.removals.length
  }

  if (totalInserts > 0) parts.push(`新規 ${totalInserts}件`)
  if (totalModifications > 0) parts.push(`変更 ${totalModifications}件`)
  if (totalRemovals > 0) parts.push(`削除 ${totalRemovals}件`)

  return parts.join('、') || '変更なし'
}
