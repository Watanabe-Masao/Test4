/**
 * Phase 4.3: レポートデータエクスポート
 *
 * StoreResult から定型レポート形式のデータを構築し、
 * CSV エクスポート可能な2次元配列として返す。
 *
 * @responsibility R:unclassified
 */
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import type { Explanation } from '@/domain/models/Explanation'
import { exportToCsv } from './csvExporter'
import { formatCurrency, formatPercent } from '@/domain/formatting'
import { calculateTransactionValue } from '@/domain/calculations/utils'

type Row = (string | number | null)[]

/**
 * 日別売上レポートを CSV エクスポートする。
 */
export function exportDailySalesReport(
  result: StoreResult,
  store: Store | null,
  year: number,
  month: number,
): void {
  const storeName = store?.name ?? '全店'
  const header: Row = [
    '日',
    '売上',
    '仕入(売価)',
    '仕入(原価)',
    '粗利(推定)',
    '客数',
    '売変額',
    '客単価',
  ]
  const rows: Row[] = [header]

  for (const [day, record] of result.daily) {
    const txValue =
      record.customers && record.customers > 0
        ? calculateTransactionValue(record.sales, record.customers)
        : null
    rows.push([
      day,
      record.sales,
      record.purchase.price,
      record.purchase.cost,
      record.sales - record.purchase.cost,
      record.customers ?? null,
      record.discountAmount,
      txValue,
    ])
  }

  // 合計行
  rows.push([
    '合計',
    result.totalSales,
    null,
    result.totalCost,
    result.invMethodGrossProfit ?? null,
    result.totalCustomers ?? null,
    null,
    null,
  ])

  exportToCsv(rows, {
    filename: `日別売上_${storeName}_${year}年${month}月`,
  })
}

/**
 * 店舗別 KPI サマリーを CSV エクスポートする。
 */
export function exportStoreKpiReport(
  storeResults: ReadonlyMap<string, StoreResult>,
  stores: ReadonlyMap<string, Store>,
  year: number,
  month: number,
): void {
  const header: Row = [
    '店舗ID',
    '店舗名',
    '売上',
    '予算',
    '達成率(%)',
    '粗利(在庫法)',
    '粗利率(%)',
    '推定マージン(推定法)',
    '推定マージン率(%)',
    '客数',
    '客単価',
    '日商平均',
    '着地予測',
  ]
  const rows: Row[] = [header]

  for (const [storeId, result] of storeResults) {
    const store = stores.get(storeId)
    const txValue =
      result.totalCustomers && result.totalCustomers > 0
        ? calculateTransactionValue(result.totalSales, result.totalCustomers)
        : null

    rows.push([
      storeId,
      store?.name ?? storeId,
      result.totalSales,
      result.budget ?? null,
      result.budgetAchievementRate ? formatPercent(result.budgetAchievementRate) : null,
      result.invMethodGrossProfit ?? null,
      result.invMethodGrossProfitRate ? formatPercent(result.invMethodGrossProfitRate) : null,
      result.estMethodMargin ?? null,
      result.estMethodMarginRate ? formatPercent(result.estMethodMarginRate) : null,
      result.totalCustomers ?? null,
      txValue,
      result.averageDailySales ? Math.round(result.averageDailySales) : null,
      result.projectedSales ? Math.round(result.projectedSales) : null,
    ])
  }

  exportToCsv(rows, {
    filename: `店舗別KPI_${year}年${month}月`,
  })
}

/**
 * 月次 P&L (損益計算書) 形式のレポートを CSV エクスポートする。
 */
export function exportMonthlyPLReport(
  result: StoreResult,
  store: Store | null,
  year: number,
  month: number,
): void {
  const storeName = store?.name ?? '全店'
  const rows: Row[] = [
    ['項目', '金額', '備考'],
    ['売上高', result.totalSales, ''],
    ['期首棚卸高', result.openingInventory ?? null, '在庫法'],
    ['仕入原価', result.totalCost, ''],
    ['在庫仕入原価', result.inventoryCost, ''],
    ['期末棚卸高', result.closingInventory ?? null, '在庫法'],
    ['売上原価(在庫法)', result.invMethodCogs ?? null, '期首+仕入-期末'],
    ['粗利(在庫法)', result.invMethodGrossProfit ?? null, ''],
    [
      '粗利率(在庫法)',
      result.invMethodGrossProfitRate ? formatPercent(result.invMethodGrossProfitRate) : null,
      '',
    ],
    [''],
    ['推定売上原価', result.estMethodCogs ?? null, '推定法'],
    ['推定マージン', result.estMethodMargin ?? null, '※実績粗利ではありません（理論値）'],
    [
      '推定マージン率',
      result.estMethodMarginRate ? formatPercent(result.estMethodMarginRate) : null,
      '',
    ],
    ['推定期末棚卸', result.estMethodClosingInventory ?? null, ''],
    [''],
    ['予算', result.budget ?? null, ''],
    [
      '予算達成率',
      result.budgetAchievementRate ? formatPercent(result.budgetAchievementRate) : null,
      '',
    ],
    ['予算進捗率', result.budgetProgressRate ? formatPercent(result.budgetProgressRate) : null, ''],
    ['着地予測', result.projectedSales ? Math.round(result.projectedSales) : null, ''],
    [
      '予測達成率',
      result.projectedAchievement ? formatPercent(result.projectedAchievement) : null,
      '',
    ],
  ]

  exportToCsv(rows, {
    filename: `月次PL_${storeName}_${year}年${month}月`,
  })
}

/** 単位ラベルの変換 */
function unitLabel(unit: Explanation['unit']): string {
  switch (unit) {
    case 'yen':
      return '円'
    case 'rate':
      return '%'
    case 'count':
      return '件'
  }
}

/** 入力値一覧を文字列に変換 */
function formatInputsList(inputs: Explanation['inputs']): string {
  return inputs
    .map((inp) => {
      const val =
        inp.unit === 'yen'
          ? formatCurrency(inp.value)
          : inp.unit === 'rate'
            ? formatPercent(inp.value)
            : inp.value.toLocaleString('ja-JP')
      return `${inp.name}=${val}`
    })
    .join('; ')
}

/**
 * 指標説明データをCSVとしてエクスポートする
 */
export function exportExplanationReport(
  explanations: ReadonlyMap<string, Explanation>,
  storeName: string,
  year: number,
  month: number,
): void {
  const header: Row = ['指標名', '値', '単位', '計算式', '入力値一覧']
  const rows: Row[] = [header]

  for (const [, exp] of explanations) {
    const value =
      exp.unit === 'yen'
        ? Math.round(exp.value)
        : exp.unit === 'rate'
          ? Number((exp.value * 100).toFixed(2))
          : exp.value
    rows.push([exp.title, value, unitLabel(exp.unit), exp.formula, formatInputsList(exp.inputs)])
  }

  exportToCsv(rows, {
    filename: `指標説明_${storeName}_${year}年${month}月`,
  })
}

/**
 * テキスト要約をCSVとしてエクスポートする
 */
export function exportTextSummaryReport(
  summaryText: string,
  storeName: string,
  year: number,
  month: number,
): void {
  const header: Row = ['店舗', '年', '月', 'テキスト要約']
  const rows: Row[] = [header, [storeName, year, month, summaryText]]

  exportToCsv(rows, {
    filename: `テキスト要約_${storeName}_${year}年${month}月`,
  })
}
