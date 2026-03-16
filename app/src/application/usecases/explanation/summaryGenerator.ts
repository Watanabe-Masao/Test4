/**
 * summaryGenerator
 *
 * StoreResult / Explanation から自然言語のテキスト要約を生成する。
 *
 * - generateTextSummary: 店舗全体の主要指標サマリ
 * - generateMetricSummary: 個別指標の一行サマリ
 */
import type { StoreResult, Explanation } from '@/domain/models'
import { getEffectiveGrossProfitRate, calculateGrowthRate } from '@/domain/calculations/utils'
import { formatCurrency, formatPercent } from '@/domain/formatting'

// ─── フォーマッタ（domain/formatting に委譲）─────────────────

/** 金額を日本語ロケールのカンマ区切りで表示 */
const fmtYen = (n: number): string => formatCurrency(n)

/** 率を百分率で表示 (小数1桁) */
const fmtRate = (n: number): string => formatPercent(n, 1).replace('%', '')

// ─── 公開 API ────────────────────────────────────────────────

/**
 * StoreResult から主要指標の自然言語テキスト要約を生成する。
 * 例: "当月売上 12,345,678円（前年比 +5.2%）。粗利率 28.3%（目標比 -1.7pt）。
 *      主な要因: 客数 +3.1%、客単価 +2.0%。注意: 売変率 6.2%（前年 4.8%）。"
 */
export function generateTextSummary(
  result: StoreResult,
  options?: {
    prevYearResult?: StoreResult
    targetGrossProfitRate?: number
  },
): string {
  const prev = options?.prevYearResult
  const targetRate = options?.targetGrossProfitRate

  const lines: string[] = []

  // 1) 売上
  let salesLine = `当月売上 ${fmtYen(result.totalSales)}円`
  if (prev && prev.totalSales > 0) {
    const yoyRatio = calculateGrowthRate(result.totalSales, prev.totalSales)
    salesLine += `（前年比 ${yoyRatio >= 0 ? '+' : ''}${fmtRate(yoyRatio)}%）`
  }
  if (result.budget > 0) {
    salesLine += `。予算達成率 ${fmtRate(result.budgetAchievementRate)}` + '%'
  }
  lines.push(salesLine)

  // 2) 粗利率
  const gpRate = getEffectiveGrossProfitRate(result)
  let gpLine = `粗利率 ${fmtRate(gpRate)}%`
  if (result.invMethodGrossProfitRate !== null) {
    gpLine += '（在庫法）'
  } else {
    gpLine += '（推定法・理論値 ※実績粗利ではありません）'
  }
  if (targetRate !== undefined) {
    const diff = gpRate - targetRate
    gpLine += `（目標比 ${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}pt）`
  }
  if (prev) {
    const prevGpRate = getEffectiveGrossProfitRate(prev)
    const diff = gpRate - prevGpRate
    gpLine += `（前年比 ${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}pt）`
  }
  lines.push(gpLine)

  // 3) 客数・客単価（前年比がある場合）
  if (prev && prev.totalCustomers > 0 && result.totalCustomers > 0) {
    const custRatio = calculateGrowthRate(result.totalCustomers, prev.totalCustomers)
    const curTx = result.transactionValue
    const prevTx = prev.transactionValue
    const txRatio = calculateGrowthRate(curTx, prevTx)
    lines.push(
      `主な要因: 客数 ${custRatio >= 0 ? '+' : ''}${fmtRate(custRatio)}%` +
        `、客単価 ${txRatio >= 0 ? '+' : ''}${fmtRate(txRatio)}%`,
    )
  }

  // 4) 注意事項
  const warnings: string[] = []
  if (result.discountRate > 0.05) {
    let discountWarning = `売変率 ${fmtRate(result.discountRate)}%`
    if (prev) {
      discountWarning += `（前年 ${fmtRate(prev.discountRate)}%）`
    }
    warnings.push(discountWarning)
  }
  if (result.costInclusionRate > 0.03) {
    warnings.push(`原価算入率 ${fmtRate(result.costInclusionRate)}%`)
  }
  if (warnings.length > 0) {
    lines.push(`注意: ${warnings.join('、')}`)
  }

  return lines.join('。') + '。'
}

/**
 * 指定されたExplanationのテキスト要約を生成する（個別指標用）
 */
export function generateMetricSummary(explanation: Explanation): string {
  const { title, unit } = explanation
  let valueStr: string
  switch (unit) {
    case 'yen':
      valueStr = `${fmtYen(explanation.value)}円`
      break
    case 'rate':
      valueStr = `${fmtRate(explanation.value)}%`
      break
    case 'count':
      valueStr = explanation.value.toLocaleString('ja-JP')
      break
  }
  return `${title}: ${valueStr} (計算式: ${explanation.formula})`
}
