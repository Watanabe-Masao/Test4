/**
 * MonthlyData ← → ImportedData 互換 adapter
 *
 * ImportedData → MonthlyData 構造移行の中間層。
 * 新規コードは MonthlyData / AppData を正本とし、
 * ImportedData が必要な箇所はこの adapter 経由でのみ変換する。
 *
 * @see references/01-principles/monthly-data-architecture.md
 */
import type { ImportedData } from './ImportedData'
import type { MonthlyData, AppData } from './MonthlyData'
import type { DataOrigin } from './DataOrigin'

/**
 * 旧 ImportedData を成立させるための追加 slices。
 * prevYear* 系フィールドは「別月の MonthlyData」から導出されるが、
 * ImportedData は当年と前年を同居させる比較都合モデルのため、
 * この slices で補完する必要がある。
 */
export interface LegacyComparisonSlices {
  readonly prevYearClassifiedSales: ImportedData['prevYearClassifiedSales']
  readonly prevYearCategoryTimeSales: ImportedData['prevYearCategoryTimeSales']
  readonly prevYearFlowers: ImportedData['prevYearFlowers']
  readonly prevYearPurchase: ImportedData['prevYearPurchase']
  readonly prevYearDirectProduce: ImportedData['prevYearDirectProduce']
  readonly prevYearInterStoreIn: ImportedData['prevYearInterStoreIn']
  readonly prevYearInterStoreOut: ImportedData['prevYearInterStoreOut']
}

const EMPTY_SLICES: LegacyComparisonSlices = {
  prevYearClassifiedSales: { records: [] },
  prevYearCategoryTimeSales: { records: [] },
  prevYearFlowers: { records: [] },
  prevYearPurchase: { records: [] },
  prevYearDirectProduce: { records: [] },
  prevYearInterStoreIn: { records: [] },
  prevYearInterStoreOut: { records: [] },
}

/**
 * @deprecated infrastructure 境界の変換専用。新規コードでは MonthlyData を直接使用。
 * ImportedData → MonthlyData に変換する。prevYear* フィールドは捨てる。
 * @expiresAt 2099-12-31
 * @sunsetCondition ImportedData 型自体が物理削除され infrastructure 境界が MonthlyData 直接 emit に切り替わった時
 * @reason ImportedData は infrastructure 内部でのみ使う legacy 中間表現。境界の adapter として残置するが、新規 caller は MonthlyData を直接使う
 */
export function toMonthlyData(imported: ImportedData, origin: DataOrigin): MonthlyData {
  return {
    origin,
    stores: imported.stores,
    suppliers: imported.suppliers,
    classifiedSales: imported.classifiedSales,
    purchase: imported.purchase,
    interStoreIn: imported.interStoreIn,
    interStoreOut: imported.interStoreOut,
    flowers: imported.flowers,
    directProduce: imported.directProduce,
    consumables: imported.consumables,
    categoryTimeSales: imported.categoryTimeSales,
    departmentKpi: imported.departmentKpi,
    settings: imported.settings,
    budget: imported.budget,
  }
}

/**
 * ImportedData → AppData に変換する。
 * 前年データは prevYearImported から別の MonthlyData として構築する。
 */
export function toAppData(
  currentImported: ImportedData,
  currentOrigin: DataOrigin,
  prevYearImported?: ImportedData | null,
  prevYearOrigin?: DataOrigin,
): AppData {
  return {
    current: toMonthlyData(currentImported, currentOrigin),
    prevYear:
      prevYearImported && prevYearOrigin ? toMonthlyData(prevYearImported, prevYearOrigin) : null,
  }
}

/**
 * @deprecated infrastructure 境界専用。新規コードでは使用しない。
 * AppData + LegacyComparisonSlices → ImportedData に変換する。
 *
 * @throws appData.current が null の場合
 * @expiresAt 2099-12-31
 * @sunsetCondition ImportedData 型自体が物理削除され、AppData → MonthlyData 直接変換経路に統一された時
 * @reason ImportedData は legacy slice 構造の保持目的で残るが、新規コードでは AppData → MonthlyData を直接呼ぶ
 */
export function toLegacyImportedData(
  appData: AppData,
  slices?: LegacyComparisonSlices,
): ImportedData {
  if (!appData.current) {
    throw new Error(
      'toLegacyImportedData: appData.current is null. ' +
        'Cannot construct ImportedData without current month data.',
    )
  }
  const current = appData.current
  const s = slices ?? EMPTY_SLICES

  return {
    stores: current.stores,
    suppliers: current.suppliers,
    classifiedSales: current.classifiedSales,
    purchase: current.purchase,
    interStoreIn: current.interStoreIn,
    interStoreOut: current.interStoreOut,
    flowers: current.flowers,
    directProduce: current.directProduce,
    consumables: current.consumables,
    categoryTimeSales: current.categoryTimeSales,
    departmentKpi: current.departmentKpi,
    settings: current.settings,
    budget: current.budget,
    // prevYear* は LegacyComparisonSlices から（別月の MonthlyData に由来）
    prevYearClassifiedSales: s.prevYearClassifiedSales,
    prevYearCategoryTimeSales: s.prevYearCategoryTimeSales,
    prevYearFlowers: s.prevYearFlowers,
    prevYearPurchase: s.prevYearPurchase,
    prevYearDirectProduce: s.prevYearDirectProduce,
    prevYearInterStoreIn: s.prevYearInterStoreIn,
    prevYearInterStoreOut: s.prevYearInterStoreOut,
  }
}
