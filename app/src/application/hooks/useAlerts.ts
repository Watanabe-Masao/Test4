/**
 * アラート評価フック
 *
 * presentation 層が domain/calculations/alertSystem を直接呼ぶことを避け、
 * application 層でアラート評価結果を提供する。
 */
import { useMemo } from 'react'
import { evaluateAlerts, DEFAULT_ALERT_RULES } from '@/domain/calculations/rules/alertSystem'
import type { Alert, AlertSeverity, AlertRule } from '@/domain/calculations/rules/alertSystem'
import type { StoreResult } from '@/domain/models/storeTypes'

export type { Alert, AlertSeverity, AlertRule }

interface AlertOptions {
  readonly targetGrossProfitRate: number
  readonly prevYearDailySales?: ReadonlyMap<number, number>
}

/** 店舗のアラートを評価しメモ化する */
export function useAlerts(
  storeId: string,
  storeName: string,
  result: StoreResult,
  options: AlertOptions,
  rules: readonly AlertRule[] = DEFAULT_ALERT_RULES,
): readonly Alert[] {
  return useMemo(
    () => evaluateAlerts(storeId, storeName, result, rules, options),
    [storeId, storeName, result, rules, options],
  )
}
