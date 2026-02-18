import { getDayOfMonth } from '../fileImport/dateParser'
import { safeNumber } from '@/domain/calculations/utils'
import type { TransferRecord, TransferData } from '@/domain/models'

export type { TransferRecord, TransferData } from '@/domain/models'

/**
 * 店間入データを処理する
 *
 * 行0: ヘッダー
 * 行1+: Col0: 入庫店舗コード, Col1: 日付, Col2: 出庫元店舗コード, Col3: 原価, Col4: 売価
 */
export function processInterStoreIn(rows: readonly unknown[][]): TransferData {
  if (rows.length < 2) return {}

  const result: Record<string, Record<number, {
    interStoreIn: TransferRecord[]
    interStoreOut: TransferRecord[]
    interDepartmentIn: TransferRecord[]
    interDepartmentOut: TransferRecord[]
  }>> = {}

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const toStoreCode = String(r[0] ?? '').trim()
    const day = getDayOfMonth(r[1])
    const fromStoreCode = String(r[2] ?? '').trim()
    if (day == null) continue

    const cost = Math.abs(safeNumber(r[3]))
    const price = Math.abs(safeNumber(r[4]))

    const toStoreId = String(parseInt(toStoreCode) || 0)
    const fromStoreId = String(parseInt(fromStoreCode) || 0)

    const isDepartmentTransfer = toStoreCode === fromStoreCode || toStoreId === fromStoreId

    if (!result[toStoreId]) result[toStoreId] = {}
    if (!result[toStoreId][day]) {
      result[toStoreId][day] = {
        interStoreIn: [],
        interStoreOut: [],
        interDepartmentIn: [],
        interDepartmentOut: [],
      }
    }

    const record: TransferRecord = { day, cost, price, fromStoreId, toStoreId, isDepartmentTransfer }

    if (isDepartmentTransfer) {
      ;(result[toStoreId][day].interDepartmentIn as TransferRecord[]).push(record)
    } else {
      ;(result[toStoreId][day].interStoreIn as TransferRecord[]).push(record)
    }
  }

  return result
}

/**
 * 店間出データを処理する
 *
 * 行0: ヘッダー
 * 行1+: Col0: 日付, Col1: 出庫元店舗コード, Col2: 入庫先店舗コード(IN), Col3: 部門コード(IN/無視), Col4: 原価, Col5: 売価
 */
export function processInterStoreOut(rows: readonly unknown[][]): TransferData {
  if (rows.length < 2) return {}

  const result: Record<string, Record<number, {
    interStoreIn: TransferRecord[]
    interStoreOut: TransferRecord[]
    interDepartmentIn: TransferRecord[]
    interDepartmentOut: TransferRecord[]
  }>> = {}

  for (let row = 1; row < rows.length; row++) {
    const r = rows[row] as unknown[]
    const day = getDayOfMonth(r[0])
    const fromStoreCode = String(r[1] ?? '').trim()
    const toStoreCode = String(r[2] ?? '').trim()
    if (day == null) continue

    // r[3] = 部門コードIN（無視）
    const cost = -Math.abs(safeNumber(r[4]))
    const price = -Math.abs(safeNumber(r[5]))

    const fromStoreId = String(parseInt(fromStoreCode) || 0)
    const toStoreId = String(parseInt(toStoreCode) || 0)

    const isDepartmentTransfer = fromStoreCode === toStoreCode || fromStoreId === toStoreId

    if (!result[fromStoreId]) result[fromStoreId] = {}
    if (!result[fromStoreId][day]) {
      result[fromStoreId][day] = {
        interStoreIn: [],
        interStoreOut: [],
        interDepartmentIn: [],
        interDepartmentOut: [],
      }
    }

    const record: TransferRecord = { day, cost, price, fromStoreId, toStoreId, isDepartmentTransfer }

    if (isDepartmentTransfer) {
      ;(result[fromStoreId][day].interDepartmentOut as TransferRecord[]).push(record)
    } else {
      ;(result[fromStoreId][day].interStoreOut as TransferRecord[]).push(record)
    }
  }

  return result
}
