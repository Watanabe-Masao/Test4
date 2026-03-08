import type { StorageDataType } from '@/domain/models'

export interface MonthEntry {
  year: number
  month: number
  summary: { dataType: StorageDataType; label: string; recordCount: number }[]
  totalRecords: number
  dataTypeCount: number
}

// StoreDayIndex 型のデータ種別
export const STORE_DAY_TYPES = [
  'purchase',
  'sales',
  'discount',
  'interStoreIn',
  'interStoreOut',
  'flowers',
  'directProduce',
  'consumables',
]

export type LoadSliceFn = <T>(
  year: number,
  month: number,
  dataType: StorageDataType,
) => Promise<T | null>
