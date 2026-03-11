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

/** インポートされた全データの集約 */
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
  readonly departmentKpi: DepartmentKpiData
  readonly settings: ReadonlyMap<string, InventoryConfig>
  readonly budget: ReadonlyMap<string, BudgetData>
}

/** 比較データアクセサ（comparison 統一名） */
export function getComparisonFields(data: ImportedData) {
  return {
    comparisonClassifiedSales: data.prevYearClassifiedSales,
    comparisonCategoryTimeSales: data.prevYearCategoryTimeSales,
    comparisonFlowers: data.prevYearFlowers,
  } as const
}

/** 空のインポートデータ */
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
    departmentKpi: { records: [] },
    settings: new Map(),
    budget: new Map(),
  }
}
