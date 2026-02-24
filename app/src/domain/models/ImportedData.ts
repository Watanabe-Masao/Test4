import type { Store } from './Store'
import type { InventoryConfig, BudgetData } from './BudgetData'
import type {
  PurchaseData,
  SalesData,
  DiscountData,
  TransferData,
  SpecialSalesData,
  ConsumableData,
  CategoryTimeSalesData,
  DepartmentKpiData,
} from './DataTypes'
import type { ClassifiedSalesData } from './ClassifiedSales'

/** インポートされた全データの集約 */
export interface ImportedData {
  readonly stores: ReadonlyMap<string, Store>
  readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  readonly purchase: PurchaseData
  /** @deprecated classifiedSales から導出される。直接使用しないこと。 */
  readonly sales: SalesData
  /** @deprecated classifiedSales から導出される。直接使用しないこと。 */
  readonly discount: DiscountData
  readonly prevYearSales: SalesData
  readonly prevYearDiscount: DiscountData
  readonly interStoreIn: TransferData
  readonly interStoreOut: TransferData
  readonly flowers: SpecialSalesData
  readonly directProduce: SpecialSalesData
  readonly consumables: ConsumableData
  readonly categoryTimeSales: CategoryTimeSalesData
  readonly prevYearCategoryTimeSales: CategoryTimeSalesData
  readonly departmentKpi: DepartmentKpiData
  readonly settings: ReadonlyMap<string, InventoryConfig>
  readonly budget: ReadonlyMap<string, BudgetData>
  /** 分類別売上（新主要データソース） */
  readonly classifiedSales: ClassifiedSalesData
  /** 前年分類別売上 */
  readonly prevYearClassifiedSales: ClassifiedSalesData
}

/** 空のインポートデータ */
export function createEmptyImportedData(): ImportedData {
  return {
    stores: new Map(),
    suppliers: new Map(),
    purchase: {},
    sales: {},
    discount: {},
    prevYearSales: {},
    prevYearDiscount: {},
    interStoreIn: {},
    interStoreOut: {},
    flowers: {},
    directProduce: {},
    consumables: {},
    categoryTimeSales: { records: [] },
    prevYearCategoryTimeSales: { records: [] },
    departmentKpi: { records: [] },
    settings: new Map(),
    budget: new Map(),
    classifiedSales: { records: [] },
    prevYearClassifiedSales: { records: [] },
  }
}
