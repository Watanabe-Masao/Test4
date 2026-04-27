/**
 * @responsibility R:unclassified
 */

import type {
  CostPricePair,
  CategoryType,
  SupplierTotal,
  DailyRecord,
  DiscountEntry,
} from '@/domain/models/record'

/** 日別ループで蓄積される月間集計 */
export interface MonthlyAccumulator {
  daily: Map<number, DailyRecord>
  categoryTotals: Map<CategoryType, CostPricePair>
  supplierTotals: Map<string, SupplierTotal>
  totalSales: number
  totalCost: number
  totalFlowerPrice: number
  totalFlowerCost: number
  totalDirectProducePrice: number
  totalDirectProduceCost: number
  totalPurchaseCost: number
  totalPurchasePrice: number
  totalDiscount: number
  /** 売変種別内訳の月間合計 */
  totalDiscountEntries: DiscountEntry[]
  totalCostInclusion: number
  totalCustomers: number
  salesDays: number
  elapsedDays: number
  purchaseMaxDay: number
  hasDiscountData: boolean
  transferTotals: {
    interStoreIn: CostPricePair
    interStoreOut: CostPricePair
    interDepartmentIn: CostPricePair
    interDepartmentOut: CostPricePair
  }
}
