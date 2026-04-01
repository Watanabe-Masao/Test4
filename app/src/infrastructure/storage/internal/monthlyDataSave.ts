/**
 * IndexedDB 月次データ保存
 *
 * MonthlyData 形式で保存する。
 * public API は DataRepository (MonthlyData) → IndexedDBRepository 経由。
 */
import type { PersistedMeta } from '@/domain/models/analysis'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { DataType } from '@/domain/models/storeTypes'
import { dbBatchPutWithReadModify, STORE_MONTHLY, STORE_META } from './dbHelpers'
import { monthKey, STORE_DAY_FIELDS } from './keys'
import { wrapEnvelope, mapToObj, budgetToSerializable } from './serialization'
import { sessionsReadModifyOp } from './metaOperations'

/**
 * MonthlyData を年月単位で IndexedDB に保存する。
 * 単一トランザクションで原子的に全データ + メタデータを書き込む。
 */
export async function saveMonthlyDataInternal(
  data: MonthlyData,
  year: number,
  month: number,
): Promise<void> {
  const entries: { storeName: string; key: string; value: unknown }[] = []

  // StoreDayIndex 系 — envelope 形式で保存
  for (const { field, type } of STORE_DAY_FIELDS) {
    entries.push({
      storeName: STORE_MONTHLY,
      key: monthKey(year, month, type),
      value: wrapEnvelope(data[field], year, month),
    })
  }

  // Map 系 → plain object に変換して envelope で保存
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'stores'),
    value: wrapEnvelope(mapToObj(data.stores), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'suppliers'),
    value: wrapEnvelope(mapToObj(data.suppliers), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'settings'),
    value: wrapEnvelope(mapToObj(data.settings), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'budget'),
    value: wrapEnvelope(
      Object.fromEntries(
        Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
      ),
      year,
      month,
    ),
  })

  // classifiedSales — envelope 形式で保存
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'classifiedSales'),
    value: wrapEnvelope(data.classifiedSales, year, month),
  })

  // prevYearClassifiedSales は DB に保存しない（実際の年月に classifiedSales として保存）

  // categoryTimeSales — envelope 形式で保存
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'categoryTimeSales'),
    value: wrapEnvelope(data.categoryTimeSales, year, month),
  })

  // prevYearCategoryTimeSales は DB に保存しない（実際の年月に categoryTimeSales として保存）

  // departmentKpi — envelope 形式で保存
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'departmentKpi'),
    value: wrapEnvelope(data.departmentKpi, year, month),
  })

  // メタデータ
  const savedAt = new Date().toISOString()
  entries.push({
    storeName: STORE_META,
    key: 'lastSession',
    value: { year, month, savedAt } satisfies PersistedMeta,
  })

  // sessions 一覧を原子的に read-modify-write で更新
  await dbBatchPutWithReadModify(entries, [sessionsReadModifyOp(year, month, savedAt)])
}

/**
 * 指定データ種別のみを保存する（全置換）。
 * インポート後に差分承認されたデータを反映するために使用。
 * 単一トランザクションで原子的に書き込む。
 */
export async function saveDataSlice(
  data: MonthlyData,
  year: number,
  month: number,
  dataTypes: readonly DataType[],
): Promise<void> {
  const entries: { storeName: string; key: string; value: unknown }[] = []

  for (const dt of dataTypes) {
    if (dt === 'classifiedSales') {
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, 'classifiedSales'),
        value: wrapEnvelope(data.classifiedSales, year, month),
      })
      continue
    }
    if (dt === 'categoryTimeSales') {
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, 'categoryTimeSales'),
        value: wrapEnvelope(data.categoryTimeSales, year, month),
      })
      continue
    }
    if (dt === 'departmentKpi') {
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, 'departmentKpi'),
        value: wrapEnvelope(data.departmentKpi, year, month),
      })
      continue
    }
    // initialSettings / budget は
    // DataType として存在するがストレージでは個別フィールドとして保存しない（composite type）
    // → STORE_DAY_FIELDS で一致するもののみ保存
    const fieldDef = STORE_DAY_FIELDS.find((f) => f.type === dt)
    if (fieldDef) {
      entries.push({
        storeName: STORE_MONTHLY,
        key: monthKey(year, month, fieldDef.type),
        value: wrapEnvelope(data[fieldDef.field], year, month),
      })
    }
  }

  // 常に stores / suppliers / settings / budget を更新 — envelope 形式
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'stores'),
    value: wrapEnvelope(mapToObj(data.stores), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'suppliers'),
    value: wrapEnvelope(mapToObj(data.suppliers), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'settings'),
    value: wrapEnvelope(mapToObj(data.settings), year, month),
  })
  entries.push({
    storeName: STORE_MONTHLY,
    key: monthKey(year, month, 'budget'),
    value: wrapEnvelope(
      Object.fromEntries(
        Array.from(data.budget.entries()).map(([k, v]) => [k, budgetToSerializable(v)]),
      ),
      year,
      month,
    ),
  })

  // メタ更新
  const savedAt = new Date().toISOString()
  entries.push({
    storeName: STORE_META,
    key: 'lastSession',
    value: { year, month, savedAt } satisfies PersistedMeta,
  })

  // sessions 一覧を原子的に read-modify-write で更新
  await dbBatchPutWithReadModify(entries, [sessionsReadModifyOp(year, month, savedAt)])
}
