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
import type { ClassifiedSalesData } from './ClassifiedSales'

/**
 * @deprecated MonthlyData を使用してください。
 * ImportedData は infrastructure 内部（processDroppedFiles, storage）でのみ使用。
 */
export interface ImportedData {
  readonly stores: ReadonlyMap<string, Store>
  readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  readonly purchase: PurchaseData
  readonly classifiedSales: ClassifiedSalesData
  readonly prevYearClassifiedSales: ClassifiedSalesData
  readonly interStoreIn: TransferData
  readonly interStoreOut: TransferData
  readonly flowers: SpecialSalesData
  readonly directProduce: SpecialSalesData
  readonly consumables: CostInclusionData
  readonly categoryTimeSales: CategoryTimeSalesData
  readonly prevYearCategoryTimeSales: CategoryTimeSalesData
  readonly prevYearFlowers: SpecialSalesData
  /** 前年仕入データ（値入率前年比計算用） */
  readonly prevYearPurchase: PurchaseData
  /** 前年産直データ（値入率前年比計算用） */
  readonly prevYearDirectProduce: SpecialSalesData
  /** 前年店間移動入データ（値入率前年比計算用） */
  readonly prevYearInterStoreIn: TransferData
  /** 前年店間移動出データ（値入率前年比計算用） */
  readonly prevYearInterStoreOut: TransferData
  readonly departmentKpi: DepartmentKpiData
  readonly settings: ReadonlyMap<string, InventoryConfig>
  readonly budget: ReadonlyMap<string, BudgetData>
}

/** @deprecated createEmptyMonthlyData を使用してください。 */
export function createEmptyImportedData(): ImportedData {
  return {
    stores: new Map(),
    suppliers: new Map(),
    purchase: { records: [] },
    classifiedSales: { records: [] },
    prevYearClassifiedSales: { records: [] },
    interStoreIn: { records: [] },
    interStoreOut: { records: [] },
    flowers: { records: [] },
    directProduce: { records: [] },
    consumables: { records: [] },
    categoryTimeSales: { records: [] },
    prevYearCategoryTimeSales: { records: [] },
    prevYearFlowers: { records: [] },
    prevYearPurchase: { records: [] },
    prevYearDirectProduce: { records: [] },
    prevYearInterStoreIn: { records: [] },
    prevYearInterStoreOut: { records: [] },
    departmentKpi: { records: [] },
    settings: new Map(),
    budget: new Map(),
  }
}
