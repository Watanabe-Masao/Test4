/**
 * 予算達成シミュレーター — what-if 計算 + 基盤 KPI
 *
 * 月内の任意の基準日から「経過予算 / 経過実績 / 残期間必要売上 / 月末着地見込」を
 * リアルタイムに算出する。残期間売上は 3 モード (yoy / achievement / dow) で試算する。
 *
 * ## 責務
 * - 基盤 KPI 集計（computeKpis）— 既存 pure 関数の orchestration 層
 * - 残期間売上の 3 モード what-if 計算（computeRemainingSales）
 * - 日別予測配分・曜日出現カウント（ドリルダウン用）
 *
 * ## 設計原則
 * - pure function（副作用なし、React 非依存）
 * - 既存 domain 関数を再利用（projectLinear / calculateYoYRatio /
 *   calculateAchievementRate / prorateBudget）。既存関数は改変しない
 * - scenario は配列ベース（プロトタイプ準拠、0-indexed で index i = day i+1）
 * - 率は % 整数値で返す（100 = 100%。プロトタイプ計算式を踏襲）
 *
 * @see projects/budget-achievement-simulator/plan.md
 */

import { z } from 'zod'
import { safeDivide, calculateYoYRatio, calculateAchievementRate } from './utils'
import { prorateBudget, projectLinear } from './budgetAnalysis'

// ── 型契約 ──

/** シナリオ入力。配列は 0-indexed で index i = day i+1 */
export interface SimulatorScenario {
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
  readonly monthlyBudget: number
  readonly lyMonthly: number
  readonly dailyBudget: readonly number[]
  readonly lyDaily: readonly number[]
  readonly actualDaily: readonly number[]
}

export const SimulatorScenarioSchema = z
  .object({
    year: z.number().int(),
    month: z.number().int().min(1).max(12),
    daysInMonth: z.number().int().min(28).max(31),
    monthlyBudget: z.number().nonnegative(),
    lyMonthly: z.number().nonnegative(),
    dailyBudget: z.array(z.number()),
    lyDaily: z.array(z.number()),
    actualDaily: z.array(z.number()),
  })
  .refine(
    (s) =>
      s.dailyBudget.length === s.daysInMonth &&
      s.lyDaily.length === s.daysInMonth &&
      s.actualDaily.length === s.daysInMonth,
    { message: 'daily arrays length must equal daysInMonth' },
  )

export type SimulatorMode = 'yoy' | 'ach' | 'dow'
export type DowBase = 'yoy' | 'ach'

/** 曜日係数 7 要素 tuple: [日, 月, 火, 水, 木, 金, 土] */
export type DowFactors = readonly [number, number, number, number, number, number, number]

/** 残期間曜日カウント 7 要素 tuple: [日, 月, 火, 水, 木, 金, 土] */
export type DowCounts = readonly [number, number, number, number, number, number, number]

/** KPI 出力（プロトタイプ calc.js の computeKpis 準拠） */
export interface SimulatorKpis {
  readonly currentDay: number
  readonly daysInMonth: number
  readonly remainingDays: number
  readonly monthlyBudget: number
  readonly monthlyYoY: number | null
  readonly elapsedBudget: number
  readonly elapsedActual: number
  readonly elapsedYoY: number | null
  readonly elapsedAchievement: number | null
  readonly remBudget: number
  readonly remLY: number
  readonly remBudgetYoY: number | null
  readonly requiredRemaining: number
  readonly requiredAchievement: number | null
  readonly requiredYoY: number | null
  readonly projectedMonth: number | null
}

/** 残期間売上計算の入力 */
export interface RemainingSalesInput {
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly mode: SimulatorMode
  readonly yoyInput: number
  readonly achInput: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
}

// ── 内部ユーティリティ ──

function clampDay(currentDay: number, daysInMonth: number): number {
  return Math.max(1, Math.min(currentDay, daysInMonth))
}

function sumRange(values: readonly number[], start: number, end: number): number {
  let s = 0
  for (let i = start; i < end; i++) s += values[i] ?? 0
  return s
}

function arrayToDayRecord(arr: readonly number[]): Record<number, number> {
  const r: Record<number, number> = {}
  for (let i = 0; i < arr.length; i++) r[i + 1] = arr[i]
  return r
}

// ── helper (exported) ──

/**
 * 曜日計算。calc.js の dowOf と等価。
 * @returns 0=日曜, 1=月曜, ..., 6=土曜
 */
export function dowOf(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay()
}

/**
 * 日別適用%: dayOverrides があればそれ、なければ曜日別係数。
 */
export function pctForDay(
  dayNum: number,
  dayOverrides: Readonly<Record<number, number>>,
  dowInputs: DowFactors,
  year: number,
  month: number,
): number {
  if (dayOverrides[dayNum] != null) return dayOverrides[dayNum]
  const dw = dowOf(year, month, dayNum)
  return dowInputs[dw]
}

// ── 主要関数 ──

/**
 * KPI 基盤計算。既存 domain 関数の orchestration。
 *
 * @param scenario シナリオ（日別予算・前年実績・当年実績）
 * @param currentDay 基準日（1-based）
 * @returns SimulatorKpis
 */
export function computeKpis(scenario: SimulatorScenario, currentDay: number): SimulatorKpis {
  const { monthlyBudget, lyMonthly, dailyBudget, lyDaily, actualDaily, daysInMonth } = scenario
  const d = clampDay(currentDay, daysInMonth)

  // 経過区間の合計
  const elapsedBudget = prorateBudget(
    monthlyBudget,
    monthlyBudget,
    arrayToDayRecord(dailyBudget),
    d,
  )
  const elapsedLY = sumRange(lyDaily, 0, d)
  const elapsedActual = sumRange(actualDaily, 0, d)

  // 残期間
  const remBudget = monthlyBudget - elapsedBudget
  const remLY = sumRange(lyDaily, d, daysInMonth)
  const remainingDays = daysInMonth - d

  // 必要な残期間売上 = max(0, 月間予算 - 経過実績)
  const requiredRemaining = Math.max(0, monthlyBudget - elapsedActual)

  // 率は % 整数で返す（プロトタイプ命名規約）
  const pct = (ratio: number | null): number | null => (ratio == null ? null : ratio * 100)

  const monthlyYoY = lyMonthly > 0 ? pct(calculateYoYRatio(monthlyBudget, lyMonthly)) : null
  const elapsedYoY = elapsedLY > 0 ? pct(calculateYoYRatio(elapsedActual, elapsedLY)) : null
  const elapsedAchievement =
    elapsedBudget > 0 ? pct(calculateAchievementRate(elapsedActual, elapsedBudget)) : null
  const remBudgetYoY = remLY > 0 ? pct(calculateYoYRatio(remBudget, remLY)) : null
  const requiredAchievement =
    remBudget > 0 ? pct(calculateAchievementRate(requiredRemaining, remBudget)) : null
  const requiredYoY = remLY > 0 ? pct(calculateYoYRatio(requiredRemaining, remLY)) : null

  // 月末着地予測（現ペース延長）— 既存 projectLinear と計算式一致
  const projectedMonth = d > 0 ? projectLinear(elapsedActual, d, daysInMonth) : null

  return {
    currentDay: d,
    daysInMonth,
    remainingDays,
    monthlyBudget,
    monthlyYoY,
    elapsedBudget,
    elapsedActual,
    elapsedYoY,
    elapsedAchievement,
    remBudget,
    remLY,
    remBudgetYoY,
    requiredRemaining,
    requiredAchievement,
    requiredYoY,
    projectedMonth,
  }
}

/**
 * 残期間売上の what-if 計算。
 *
 * - yoy: remLY × (yoyInput/100)
 * - ach: remBudget × (achInput/100)
 * - dow: Σ base[d] × pctForDay(d+1)/100 for d in [currentDay, daysInMonth)
 *
 * dow モードでは dayOverrides が dowInputs を上書きする。
 */
export function computeRemainingSales(input: RemainingSalesInput): number {
  const { scenario, currentDay, mode, yoyInput, achInput, dowInputs, dowBase, dayOverrides } = input
  const { year, month, daysInMonth, dailyBudget, lyDaily } = scenario
  const d = clampDay(currentDay, daysInMonth)

  if (mode === 'yoy') {
    const remLY = sumRange(lyDaily, d, daysInMonth)
    return remLY * (yoyInput / 100)
  }

  if (mode === 'ach') {
    const elapsedBudget = sumRange(dailyBudget, 0, d)
    const remBudget = scenario.monthlyBudget - elapsedBudget
    return remBudget * (achInput / 100)
  }

  // dow: 各日 base[d] に日別適用% を掛けて合算
  const base = dowBase === 'yoy' ? lyDaily : dailyBudget
  let sum = 0
  for (let i = d; i < daysInMonth; i++) {
    const dayNum = i + 1
    const pct = pctForDay(dayNum, dayOverrides, dowInputs, year, month)
    sum += (base[i] ?? 0) * (pct / 100)
  }
  return sum
}

/**
 * 日別予測配分（残期間日数分の配列）。
 *
 * - dow モード: 各日 base[i] × pctForDay(dayNum)/100
 * - yoy/ach モード: 残期間 dailyBudget 比で remainingSales を按分
 *
 * @returns length === daysInMonth - clamp(currentDay) の配列
 */
export function computeDailyProjection(
  input: RemainingSalesInput & { readonly remainingSales: number },
): readonly number[] {
  const { scenario, currentDay, mode, dowInputs, dowBase, dayOverrides, remainingSales } = input
  const { year, month, daysInMonth, dailyBudget, lyDaily } = scenario
  const d = clampDay(currentDay, daysInMonth)

  if (mode === 'dow') {
    const base = dowBase === 'yoy' ? lyDaily : dailyBudget
    const out: number[] = []
    for (let i = d; i < daysInMonth; i++) {
      const dayNum = i + 1
      const pct = pctForDay(dayNum, dayOverrides, dowInputs, year, month)
      out.push((base[i] ?? 0) * (pct / 100))
    }
    return out
  }

  // yoy/ach: 残期間 dailyBudget 比で按分
  const remBudgetDays = dailyBudget.slice(d, daysInMonth)
  const sumRemBudget = remBudgetDays.reduce((a, b) => a + b, 0)
  return remBudgetDays.map((b) => safeDivide(b, sumRemBudget, 0) * remainingSales)
}

/**
 * 残期間の曜日出現カウント。[日, 月, 火, 水, 木, 金, 土]
 */
export function computeDowCounts(scenario: SimulatorScenario, currentDay: number): DowCounts {
  const { year, month, daysInMonth } = scenario
  const d = clampDay(currentDay, daysInMonth)
  const counts: [number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0]
  for (let i = d; i < daysInMonth; i++) {
    counts[dowOf(year, month, i + 1)]++
  }
  return counts
}
