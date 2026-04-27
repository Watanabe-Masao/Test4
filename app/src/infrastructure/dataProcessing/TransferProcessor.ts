/**
 * @responsibility R:unclassified
 */

import { parseDateComponents, monthKey } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { TransferRecord, TransferData, TransferDayEntry } from '@/domain/models/record'

export type { TransferRecord, TransferData } from '@/domain/models/record'

/**
 * 店間入データを処理する（年月パーティション対応）
 *
 * 行0: ヘッダー
 * 行1+: Col0: 入庫店舗コード, Col1: 日付, Col2: 出庫元店舗コード, Col3: 原価, Col4: 売価
 *
 * @returns 年月キー ("YYYY-M") をキーとする月別データ
 */
export function processInterStoreIn(rows: readonly unknown[][]): Record<string, TransferData> {
  if (rows.length < 2) return {}

  // 集約用の中間構造: monthKey → storeId → day → entry
  const partitioned: Record<
    string,
    Record<
      string,
      Record<
        number,
        {
          interStoreIn: TransferRecord[]
          interStoreOut: TransferRecord[]
          interDepartmentIn: TransferRecord[]
          interDepartmentOut: TransferRecord[]
        }
      >
    >
  > = {}

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const toStoreCode = String(r[0] ?? '').trim()
    const dc = parseDateComponents(r[1])
    const fromStoreCode = String(r[2] ?? '').trim()
    if (dc == null) continue

    const cost = Math.abs(safeNumber(r[3]))
    const price = Math.abs(safeNumber(r[4]))

    const toStoreId = String(parseInt(toStoreCode) || 0)
    const fromStoreId = String(parseInt(fromStoreCode) || 0)

    const isDepartmentTransfer = toStoreCode === fromStoreCode || toStoreId === fromStoreId

    const mk = monthKey(dc.year, dc.month)
    if (!partitioned[mk]) partitioned[mk] = {}
    if (!partitioned[mk][toStoreId]) partitioned[mk][toStoreId] = {}
    if (!partitioned[mk][toStoreId][dc.day]) {
      partitioned[mk][toStoreId][dc.day] = {
        interStoreIn: [],
        interStoreOut: [],
        interDepartmentIn: [],
        interDepartmentOut: [],
      }
    }

    const record: TransferRecord = {
      day: dc.day,
      cost,
      price,
      fromStoreId,
      toStoreId,
      isDepartmentTransfer,
    }

    if (isDepartmentTransfer) {
      ;(partitioned[mk][toStoreId][dc.day].interDepartmentIn as TransferRecord[]).push(record)
    } else {
      ;(partitioned[mk][toStoreId][dc.day].interStoreIn as TransferRecord[]).push(record)
    }
  }

  // 中間構造をフラットレコード配列に変換
  const result: Record<string, TransferData> = {}
  for (const [mk, storeMap] of Object.entries(partitioned)) {
    const [yearStr, monthStr] = mk.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const records: TransferDayEntry[] = []
    for (const [storeId, dayMap] of Object.entries(storeMap)) {
      for (const [dayStr, entry] of Object.entries(dayMap)) {
        records.push({
          year,
          month,
          day: Number(dayStr),
          storeId,
          interStoreIn: entry.interStoreIn,
          interStoreOut: entry.interStoreOut,
          interDepartmentIn: entry.interDepartmentIn,
          interDepartmentOut: entry.interDepartmentOut,
        })
      }
    }
    result[mk] = { records }
  }

  return result
}

/**
 * 店間出データを処理する（年月パーティション対応）
 *
 * 行0: ヘッダー
 * 行1+: Col0: 日付, Col1: 出庫元店舗コード, Col2: 入庫先店舗コード(IN), Col3: 部門コード(IN/無視), Col4: 原価, Col5: 売価
 *
 * @returns 年月キー ("YYYY-M") をキーとする月別データ
 */
export function processInterStoreOut(rows: readonly unknown[][]): Record<string, TransferData> {
  if (rows.length < 2) return {}

  // 集約用の中間構造: monthKey → storeId → day → entry
  const partitioned: Record<
    string,
    Record<
      string,
      Record<
        number,
        {
          interStoreIn: TransferRecord[]
          interStoreOut: TransferRecord[]
          interDepartmentIn: TransferRecord[]
          interDepartmentOut: TransferRecord[]
        }
      >
    >
  > = {}

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const dc = parseDateComponents(r[0])
    const fromStoreCode = String(r[1] ?? '').trim()
    const toStoreCode = String(r[2] ?? '').trim()
    if (dc == null) continue

    // r[3] = 部門コードIN（無視）
    const cost = -Math.abs(safeNumber(r[4]))
    const price = -Math.abs(safeNumber(r[5]))

    const fromStoreId = String(parseInt(fromStoreCode) || 0)
    const toStoreId = String(parseInt(toStoreCode) || 0)

    const isDepartmentTransfer = fromStoreCode === toStoreCode || fromStoreId === toStoreId

    const mk = monthKey(dc.year, dc.month)
    if (!partitioned[mk]) partitioned[mk] = {}
    if (!partitioned[mk][fromStoreId]) partitioned[mk][fromStoreId] = {}
    if (!partitioned[mk][fromStoreId][dc.day]) {
      partitioned[mk][fromStoreId][dc.day] = {
        interStoreIn: [],
        interStoreOut: [],
        interDepartmentIn: [],
        interDepartmentOut: [],
      }
    }

    const record: TransferRecord = {
      day: dc.day,
      cost,
      price,
      fromStoreId,
      toStoreId,
      isDepartmentTransfer,
    }

    if (isDepartmentTransfer) {
      ;(partitioned[mk][fromStoreId][dc.day].interDepartmentOut as TransferRecord[]).push(record)
    } else {
      ;(partitioned[mk][fromStoreId][dc.day].interStoreOut as TransferRecord[]).push(record)
    }
  }

  // 中間構造をフラットレコード配列に変換
  const result: Record<string, TransferData> = {}
  for (const [mk, storeMap] of Object.entries(partitioned)) {
    const [yearStr, monthStr] = mk.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    const records: TransferDayEntry[] = []
    for (const [storeId, dayMap] of Object.entries(storeMap)) {
      for (const [dayStr, entry] of Object.entries(dayMap)) {
        records.push({
          year,
          month,
          day: Number(dayStr),
          storeId,
          interStoreIn: entry.interStoreIn,
          interStoreOut: entry.interStoreOut,
          interDepartmentIn: entry.interDepartmentIn,
          interDepartmentOut: entry.interDepartmentOut,
        })
      }
    }
    result[mk] = { records }
  }

  return result
}
