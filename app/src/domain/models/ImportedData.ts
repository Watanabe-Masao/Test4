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

/** インポートされた全データの集約 */
export interface ImportedData {
  readonly stores: ReadonlyMap<string, Store>
  readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  readonly purchase: PurchaseData
  readonly sales: SalesData
  readonly discount: DiscountData
  readonly prevYearSales: SalesData
  readonly prevYearDiscount: DiscountData
  readonly interStoreIn: TransferData
  readonly interStoreOut: TransferData
  readonly flowers: SpecialSalesData
  readonly directProduce: SpecialSalesData
  readonly consumables: ConsumableData
  readonly categoryTimeSales: CategoryTimeSalesData
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
    departmentKpi: { records: [] },
    settings: new Map(),
    budget: new Map(),
  }
}
