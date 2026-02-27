/**
 * Phase 4.3: レポートデータエクスポート
 *
 * StoreResult から定型レポート形式のデータを構築し、
 * CSV エクスポート可能な2次元配列として返す。
 */
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import type { Explanation } from '@/domain/models/Explanation'
import { exportToCsv } from './csvExporter'

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
      record.customers && record.customers > 0 ? Math.round(record.sales / record.customers) : null
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
    '在庫差分(推定法)',
    '推定在庫差分率(%)',
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
        ? Math.round(result.totalSales / result.totalCustomers)
        : null

    rows.push([
      storeId,
      store?.name ?? storeId,
      result.totalSales,
      result.budget ?? null,
      result.budgetAchievementRate ? Math.round(result.budgetAchievementRate * 1000) / 10 : null,
      result.invMethodGrossProfit ?? null,
      result.invMethodGrossProfitRate
        ? Math.round(result.invMethodGrossProfitRate * 1000) / 10
        : null,
      result.estMethodMargin ?? null,
      result.estMethodMarginRate ? Math.round(result.estMethodMarginRate * 1000) / 10 : null,
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
      result.invMethodGrossProfitRate
        ? `${(result.invMethodGrossProfitRate * 100).toFixed(1)}%`
        : null,
      '',
    ],
    [''],
    ['推定売上原価', result.estMethodCogs ?? null, '推定法'],
    ['推定在庫差分', result.estMethodMargin ?? null, '※損益ではありません'],
    [
      '推定在庫差分率',
      result.estMethodMarginRate ? `${(result.estMethodMarginRate * 100).toFixed(1)}%` : null,
      '',
    ],
    ['推定期末棚卸', result.estMethodClosingInventory ?? null, ''],
    [''],
    ['予算', result.budget ?? null, ''],
    [
      '予算達成率',
      result.budgetAchievementRate ? `${(result.budgetAchievementRate * 100).toFixed(1)}%` : null,
      '',
    ],
    [
      '予算進捗率',
      result.budgetProgressRate ? `${(result.budgetProgressRate * 100).toFixed(1)}%` : null,
      '',
    ],
    ['着地予測', result.projectedSales ? Math.round(result.projectedSales) : null, ''],
    [
      '予測達成率',
      result.projectedAchievement ? `${(result.projectedAchievement * 100).toFixed(1)}%` : null,
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
          ? Math.round(inp.value).toLocaleString('ja-JP')
          : inp.unit === 'rate'
            ? (inp.value * 100).toFixed(1) + '%'
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
