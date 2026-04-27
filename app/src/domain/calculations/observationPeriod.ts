/**
 * 観測期間の評価ロジック（pure function）
 *
 * observation-period-spec.md の仕様を domain 層に実装する。
 *
 * ## 責務
 * - daily Map から lastRecordedSalesDay を導出する
 * - 営業日数（salesDays）を導出する
 * - 閾値に基づいて ObservationStatus を判定する
 * - staleness（販売データ停滞）を検出する
 *
 * ## 設計原則
 * - pure function（副作用なし）
 * - 整数演算のみ（率なし — @guard B3 率は domain/calculations で算出）
 * - 仕様軸は「観測品質」の1つのみ（層内設計: pure function の原則）
 * - lastRecordedSalesDay は daily Map から導出（フィールドとして保持しない）
 *
 * @responsibility R:unclassified
 */

import { z } from 'zod'
import type { ObservationPeriod, ObservationStatus } from '../models/ObservationPeriod'
import {
  DEFAULT_MIN_DAYS_FOR_VALID,
  DEFAULT_MIN_DAYS_FOR_OK,
  DEFAULT_STALE_DAYS_THRESHOLD,
  DEFAULT_MIN_SALES_DAYS,
} from '../constants/calculationConstants'

// ── 閾値設定 ──

/** 観測期間の閾値設定（AppSettings から注入可能） */
export interface ObservationThresholds {
  /** 最低必要日数: これ未満は invalid（デフォルト: 5） */
  readonly minDaysForValid: number
  /** partial 判定日数: これ未満は partial（デフォルト: 10） */
  readonly minDaysForOk: number
  /** 販売停滞閾値: lastRecordedSalesDay からこの日数以上経過で停滞警告（デフォルト: 7） */
  readonly staleDaysThreshold: number
  /** 最低営業日数: これ未満は invalid（デフォルト: 3） */
  readonly minSalesDays: number
}

export const ObservationThresholdsSchema = z.object({
  minDaysForValid: z.number(),
  minDaysForOk: z.number(),
  staleDaysThreshold: z.number(),
  minSalesDays: z.number(),
})

/** デフォルト閾値 */
export const DEFAULT_OBSERVATION_THRESHOLDS: Readonly<ObservationThresholds> = {
  minDaysForValid: DEFAULT_MIN_DAYS_FOR_VALID,
  minDaysForOk: DEFAULT_MIN_DAYS_FOR_OK,
  staleDaysThreshold: DEFAULT_STALE_DAYS_THRESHOLD,
  minSalesDays: DEFAULT_MIN_SALES_DAYS,
} as const

// ── 評価関数 ──

/**
 * 観測期間を評価する（pure function）
 *
 * @param daily - 日別データ（day → { sales }）。day は 1-based。
 * @param daysInMonth - 対象月の日数（28-31）
 * @param currentElapsedDays - 既存の elapsedDays（Phase 2 移行期: staleness 判定に使用）
 * @param thresholds - 閾値設定（省略時はデフォルト）
 * @returns ObservationPeriod
 */
export function evaluateObservationPeriod(
  daily: ReadonlyMap<number, { readonly sales: number }>,
  daysInMonth: number,
  currentElapsedDays: number,
  thresholds: ObservationThresholds = DEFAULT_OBSERVATION_THRESHOLDS,
): ObservationPeriod {
  // 1. daily Map から lastRecordedSalesDay と salesDays を導出
  const { lastRecordedSalesDay, salesDays } = deriveSalesMetrics(daily)

  // 2. elapsedDays = lastRecordedSalesDay（仕様準拠）
  const elapsedDays = lastRecordedSalesDay

  // 3. remainingDays = daysInMonth - elapsedDays
  const remainingDays = daysInMonth - elapsedDays

  // 4. status 判定
  const status = determineObservationStatus(
    lastRecordedSalesDay,
    elapsedDays,
    salesDays,
    thresholds,
  )

  // 5. warnings 生成
  const warnings = collectWarnings(
    status,
    lastRecordedSalesDay,
    salesDays,
    currentElapsedDays,
    thresholds,
  )

  return {
    lastRecordedSalesDay,
    elapsedDays,
    salesDays,
    daysInMonth,
    remainingDays,
    status,
    warnings,
  }
}

// ── ステータス比較 ──

/** ObservationStatus の重篤度順序（大きいほど悪い） */
const STATUS_SEVERITY: Record<ObservationStatus, number> = {
  ok: 0,
  partial: 1,
  invalid: 2,
  undefined: 3,
}

/**
 * 2つの ObservationStatus のうちより悪い方を返す
 *
 * 集約時に個別店舗の最悪ステータスを求めるために使用。
 */
export function worseObservationStatus(
  a: ObservationStatus,
  b: ObservationStatus,
): ObservationStatus {
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b
}

// ── 内部関数 ──

/**
 * daily Map から lastRecordedSalesDay と salesDays を導出する
 */
function deriveSalesMetrics(daily: ReadonlyMap<number, { readonly sales: number }>): {
  lastRecordedSalesDay: number
  salesDays: number
} {
  let lastRecordedSalesDay = 0
  let salesDays = 0

  for (const [day, data] of daily) {
    if (data.sales > 0) {
      if (day > lastRecordedSalesDay) {
        lastRecordedSalesDay = day
      }
      salesDays++
    }
  }

  return { lastRecordedSalesDay, salesDays }
}

/**
 * ObservationStatus を判定する
 *
 * observation-period-spec.md Section 6 準拠:
 * - salesDays === 0 → 'undefined'（販売実績なし）
 * - elapsedDays < minDaysForValid → 'invalid'
 * - salesDays < minSalesDays → 'invalid'
 * - elapsedDays < minDaysForOk → 'partial'
 * - それ以外 → 'ok'
 */
function determineObservationStatus(
  lastRecordedSalesDay: number,
  elapsedDays: number,
  salesDays: number,
  thresholds: ObservationThresholds,
): ObservationStatus {
  // 販売実績なし
  if (lastRecordedSalesDay === 0 || salesDays === 0) {
    return 'undefined'
  }

  // 最低必要日数未満
  if (elapsedDays < thresholds.minDaysForValid) {
    return 'invalid'
  }

  // 最低営業日数未満
  if (salesDays < thresholds.minSalesDays) {
    return 'invalid'
  }

  // partial 判定日数未満
  if (elapsedDays < thresholds.minDaysForOk) {
    return 'partial'
  }

  return 'ok'
}

/**
 * 警告コードを生成する
 *
 * status に応じた基本警告 + staleness 判定
 */
function collectWarnings(
  status: ObservationStatus,
  lastRecordedSalesDay: number,
  salesDays: number,
  currentElapsedDays: number,
  thresholds: ObservationThresholds,
): readonly string[] {
  const warnings: string[] = []

  // status に応じた警告
  switch (status) {
    case 'undefined':
      warnings.push('obs_no_sales_data')
      break
    case 'invalid':
      if (salesDays > 0 && salesDays < thresholds.minSalesDays) {
        warnings.push('obs_insufficient_sales_days')
      }
      warnings.push('obs_window_incomplete')
      break
    case 'partial':
      warnings.push('obs_window_incomplete')
      break
    case 'ok':
      break
  }

  // staleness 判定: currentElapsedDays - lastRecordedSalesDay >= staleDaysThreshold
  if (
    lastRecordedSalesDay > 0 &&
    currentElapsedDays - lastRecordedSalesDay >= thresholds.staleDaysThreshold
  ) {
    warnings.push('obs_stale_sales_data')
  }

  return warnings
}
