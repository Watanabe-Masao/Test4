/**
 * MonthlyData: ImportedData の後継型
 *
 * prevYear* フィールドを持たず、当年と前年は同じ MonthlyData 型で
 * origin.year / origin.month により区別する。
 * 「前年」は特別な概念ではなく、単に「別の月の MonthlyData」。
 *
 * ImportedData とは段階的に共存し、全参照が移行完了した後に
 * ImportedData を @deprecated → 削除する。
 */
import type { Store } from './Store'
import type { InventoryConfig, BudgetData } from './BudgetData'
import type {
  PurchaseData,
  TransferData,
  SpecialSalesData,
  CostInclusionData,
  CategoryTimeSalesData,
  DepartmentKpiData,
} from './DataTypes'
import type { DataOrigin } from './DataOrigin'

/** 当月データ集約（年月は origin が持つ） */
export interface MonthlyData {
  readonly origin: DataOrigin
  readonly stores: ReadonlyMap<string, Store>
  readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  readonly purchase: PurchaseData
  readonly interStoreIn: TransferData
  readonly interStoreOut: TransferData
  readonly flowers: SpecialSalesData
  readonly directProduce: SpecialSalesData
  readonly consumables: CostInclusionData
  readonly categoryTimeSales: CategoryTimeSalesData
  readonly departmentKpi: DepartmentKpiData
  readonly settings: ReadonlyMap<string, InventoryConfig>
  readonly budget: ReadonlyMap<string, BudgetData>
}

/**
 * アプリケーションが保持するデータ全体
 *
 * 当年と前年は同じ MonthlyData 型。
 * 「前年」は特別な概念ではなく、単に「別の月の MonthlyData」。
 */
export interface AppData {
  /** 当月データ（null = 未ロード） */
  readonly current: MonthlyData | null
  /** 前年データ（null = 未ロード） */
  readonly prevYear: MonthlyData | null
}

/** 空の MonthlyData を生成する */
export function createEmptyMonthlyData(origin: DataOrigin): MonthlyData {
  return {
    origin,
    stores: new Map(),
    suppliers: new Map(),
    purchase: { records: [] },
    interStoreIn: { records: [] },
    interStoreOut: { records: [] },
    flowers: { records: [] },
    directProduce: { records: [] },
    consumables: { records: [] },
    categoryTimeSales: { records: [] },
    departmentKpi: { records: [] },
    settings: new Map(),
    budget: new Map(),
  }
}
