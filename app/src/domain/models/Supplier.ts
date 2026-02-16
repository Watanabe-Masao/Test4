import type { CategoryType } from './CategoryType'

/** 取引先 */
export interface Supplier {
  readonly code: string
  readonly name: string
  readonly category: CategoryType
  readonly markupRate?: number
}

/** 取引先別合計 */
export interface SupplierTotal {
  readonly supplierCode: string
  readonly supplierName: string
  readonly category: CategoryType
  readonly cost: number
  readonly price: number
  readonly markupRate: number
}
