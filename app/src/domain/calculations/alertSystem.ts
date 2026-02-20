/**
 * Phase 4.2: アラート・閾値システム
 *
 * カスタマイズ可能なアラートルールを定義し、
 * StoreResult から閾値超過を自動検出する。
 */
import { safeDivide } from './utils'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { DailyRecord } from '@/domain/models/DailyRecord'

// ─── Types ────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertRuleType =
  | 'gp_rate_below_target'
  | 'daily_sales_below_prev_year'
  | 'consumable_ratio_above'
  | 'budget_achievement_below'
  | 'discount_rate_above'
  | 'daily_sales_anomaly'
  | 'custom'

/** アラートルール定義 */
export interface AlertRule {
  readonly id: string
  readonly type: AlertRuleType
  readonly label: string
  readonly description: string
  readonly severity: AlertSeverity
  readonly enabled: boolean
  /** 閾値パラメータ (ルールタイプごとに意味が異なる) */
  readonly threshold: number
}

/** 発火したアラート */
export interface Alert {
  readonly ruleId: string
  readonly ruleLabel: string
  readonly severity: AlertSeverity
  readonly message: string
  readonly value: number
  readonly threshold: number
  readonly storeId?: string
  readonly storeName?: string
  readonly day?: number
}

// ─── Default Rules ────────────────────────────────────

export const DEFAULT_ALERT_RULES: readonly AlertRule[] = [
  {
    id: 'gp-rate-target',
    type: 'gp_rate_below_target',
    label: '粗利率が目標以下',
    description: '粗利率が目標値を -2pt 以上下回った場合',
    severity: 'critical',
    enabled: true,
    threshold: 0.02, // 目標から -2pt
  },
  {
    id: 'daily-sales-prev-year',
    type: 'daily_sales_below_prev_year',
    label: '日次売上が前年比80%未満',
    description: '日次売上が前年同曜日の80%未満の場合',
    severity: 'warning',
    enabled: true,
    threshold: 0.80, // 前年比 80%
  },
  {
    id: 'consumable-ratio',
    type: 'consumable_ratio_above',
    label: '消耗品比率超過',
    description: '消耗品コストの対売上比率が閾値を超過',
    severity: 'warning',
    enabled: true,
    threshold: 0.03, // 3%
  },
  {
    id: 'budget-achievement',
    type: 'budget_achievement_below',
    label: '予算達成率不足',
    description: '予算進捗率が時間経過率を下回る場合',
    severity: 'warning',
    enabled: true,
    threshold: 0.90, // 90%
  },
  {
    id: 'discount-rate',
    type: 'discount_rate_above',
    label: '売変率超過',
    description: '売変率が閾値を超過した場合',
    severity: 'info',
    enabled: true,
    threshold: 0.05, // 5%
  },
]

// ─── Alert Evaluation ─────────────────────────────────

/**
 * StoreResult に対してアラートルールを評価し、
 * 発火したアラートのリストを返す。
 */
export function evaluateAlerts(
  storeId: string,
  storeName: string,
  result: StoreResult,
  rules: readonly AlertRule[],
  options: {
    targetGrossProfitRate: number
    prevYearDailySales?: ReadonlyMap<number, number>
  },
): readonly Alert[] {
  const alerts: Alert[] = []

  for (const rule of rules) {
    if (!rule.enabled) continue

    switch (rule.type) {
      case 'gp_rate_below_target': {
        const gpRate = result.invMethodGrossProfitRate ?? result.estMethodMarginRate ?? 0
        const diff = options.targetGrossProfitRate - gpRate
        if (diff > rule.threshold) {
          alerts.push({
            ruleId: rule.id,
            ruleLabel: rule.label,
            severity: rule.severity,
            message: `${storeName}: 粗利率 ${(gpRate * 100).toFixed(1)}% (目標 ${(options.targetGrossProfitRate * 100).toFixed(1)}%, 乖離 -${(diff * 100).toFixed(1)}pt)`,
            value: gpRate,
            threshold: options.targetGrossProfitRate - rule.threshold,
            storeId,
            storeName,
          })
        }
        break
      }

      case 'daily_sales_below_prev_year': {
        if (!options.prevYearDailySales) break
        for (const [day, record] of result.daily) {
          const prevYearSales = options.prevYearDailySales.get(day)
          if (!prevYearSales || prevYearSales === 0) continue
          const ratio = safeDivide(record.sales, prevYearSales, 1)
          if (ratio < rule.threshold) {
            alerts.push({
              ruleId: rule.id,
              ruleLabel: rule.label,
              severity: rule.severity,
              message: `${storeName} ${day}日: 前年比 ${(ratio * 100).toFixed(0)}% (${record.sales.toLocaleString()} / 前年 ${prevYearSales.toLocaleString()})`,
              value: ratio,
              threshold: rule.threshold,
              storeId,
              storeName,
              day,
            })
          }
        }
        break
      }

      case 'consumable_ratio_above': {
        if (result.totalSales === 0) break
        let totalConsumable = 0
        for (const [, record] of result.daily) {
          totalConsumable += record.consumable.cost
        }
        const ratio = safeDivide(totalConsumable, result.totalSales, 0)
        if (ratio > rule.threshold) {
          alerts.push({
            ruleId: rule.id,
            ruleLabel: rule.label,
            severity: rule.severity,
            message: `${storeName}: 消耗品比率 ${(ratio * 100).toFixed(1)}% (閾値 ${(rule.threshold * 100).toFixed(1)}%)`,
            value: ratio,
            threshold: rule.threshold,
            storeId,
            storeName,
          })
        }
        break
      }

      case 'budget_achievement_below': {
        if (!result.budgetProgressRate) break
        if (result.budgetProgressRate < rule.threshold) {
          alerts.push({
            ruleId: rule.id,
            ruleLabel: rule.label,
            severity: rule.severity,
            message: `${storeName}: 予算進捗率 ${(result.budgetProgressRate * 100).toFixed(1)}% (閾値 ${(rule.threshold * 100).toFixed(0)}%)`,
            value: result.budgetProgressRate,
            threshold: rule.threshold,
            storeId,
            storeName,
          })
        }
        break
      }

      case 'discount_rate_above': {
        if (result.totalSales === 0) break
        let totalDiscount = 0
        for (const [, record] of result.daily) {
          totalDiscount += record.discountAmount
        }
        const discRate = safeDivide(totalDiscount, result.totalSales, 0)
        if (discRate > rule.threshold) {
          alerts.push({
            ruleId: rule.id,
            ruleLabel: rule.label,
            severity: rule.severity,
            message: `${storeName}: 売変率 ${(discRate * 100).toFixed(1)}% (閾値 ${(rule.threshold * 100).toFixed(1)}%)`,
            value: discRate,
            threshold: rule.threshold,
            storeId,
            storeName,
          })
        }
        break
      }
    }
  }

  return alerts
}

/**
 * 全店舗のアラートを一括評価する。
 */
export function evaluateAllStoreAlerts(
  storeResults: ReadonlyMap<string, StoreResult>,
  storeNames: ReadonlyMap<string, string>,
  rules: readonly AlertRule[],
  options: {
    targetGrossProfitRate: number
    prevYearDailySales?: ReadonlyMap<string, ReadonlyMap<number, number>>
  },
): readonly Alert[] {
  const allAlerts: Alert[] = []

  for (const [storeId, result] of storeResults) {
    const storeName = storeNames.get(storeId) ?? storeId
    const prevYearSales = options.prevYearDailySales?.get(storeId)
    const storeAlerts = evaluateAlerts(storeId, storeName, result, rules, {
      targetGrossProfitRate: options.targetGrossProfitRate,
      prevYearDailySales: prevYearSales,
    })
    allAlerts.push(...storeAlerts)
  }

  // severity 順にソート: critical > warning > info
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
  allAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return allAlerts
}
