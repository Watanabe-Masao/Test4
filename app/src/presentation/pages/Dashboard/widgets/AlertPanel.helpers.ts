/**
 * AlertPanel — pure helpers（アラート表示用 formatter + 固定マップ）
 *
 * component 側で inline 化されていた 4 formatter と 2 マップを切り出す。
 * 値の解釈（rate vs 金額）と severity → アイコン変換は純粋関数なので
 * 単独テスト可能。
 */
import { formatPercent } from '@/domain/formatting'
import type { Alert, AlertSeverity } from '@/application/hooks/analytics'
import type { MetricId } from '@/domain/models/analysis'

/** アラートルール ID → 対応する MetricId */
export const ALERT_METRIC_MAP: Record<string, MetricId> = {
  'gp-rate-target': 'invMethodGrossProfitRate',
  'daily-sales-prev-year': 'salesTotal',
  'cost-inclusion-ratio': 'totalCostInclusion',
  'budget-achievement': 'budgetAchievementRate',
  'discount-rate': 'discountRate',
}

/** severity → 表示アイコン */
export const SEVERITY_ICONS: Record<AlertSeverity, string> = {
  critical: '!',
  warning: '!',
  info: 'i',
}

/** アラートルールが比率ベースかどうかを判定 */
export function isRateAlert(alert: Alert): boolean {
  return ['gp-rate-target', 'cost-inclusion-ratio', 'budget-achievement', 'discount-rate'].includes(
    alert.ruleId,
  )
}

/** actual value を rate / currency 別に整形する */
export function formatAlertValue(alert: Alert, fmtCurrency: (v: number) => string): string {
  if (isRateAlert(alert)) return formatPercent(alert.value)
  return fmtCurrency(alert.value)
}

/** threshold を rate / currency 別に整形する */
export function formatAlertThreshold(alert: Alert, fmtCurrency: (v: number) => string): string {
  if (isRateAlert(alert)) return formatPercent(alert.threshold)
  return fmtCurrency(alert.threshold)
}

/**
 * actual − threshold の差を sign + 単位付きで整形する。
 * rate の場合は '%' を 'pt' に置換（絶対差の意味を強調）。
 */
export function formatAlertDelta(alert: Alert, fmtCurrency: (v: number) => string): string {
  const delta = alert.value - alert.threshold
  const sign = delta >= 0 ? '+' : ''
  if (isRateAlert(alert)) return `${sign}${formatPercent(delta).replace('%', 'pt')}`
  return `${sign}${fmtCurrency(delta)}`
}
