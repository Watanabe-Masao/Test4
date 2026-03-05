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

/** 空のインポートデータ */
export function createEmptyImportedData(): ImportedData {
  return {
    stores: new Map(),
    suppliers: new Map(),
    purchase: {},
    classifiedSales: { records: [] },
    prevYearClassifiedSales: { records: [] },
    interStoreIn: {},
    interStoreOut: {},
    flowers: {},
    directProduce: {},
    consumables: {},
    categoryTimeSales: { records: [] },
    prevYearCategoryTimeSales: { records: [] },
    prevYearFlowers: {},
    departmentKpi: { records: [] },
    settings: new Map(),
    budget: new Map(),
  }
}
