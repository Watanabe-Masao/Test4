import type { CostPricePair, CategoryType, SupplierTotal, DailyRecord } from '@/domain/models'

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
  totalConsumable: number
  salesDays: number
  elapsedDays: number
  transferTotals: {
    interStoreIn: CostPricePair
    interStoreOut: CostPricePair
    interDepartmentIn: CostPricePair
    interDepartmentOut: CostPricePair
  }
}
