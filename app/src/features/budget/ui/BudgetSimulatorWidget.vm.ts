/**
 * 予算達成シミュレーター — Widget ViewModel
 *
 * Phase 1 domain 関数の出力を UI 表示用の行データに変換する pure function。
 * 既存 `InsightTabBudget.vm.ts` と同方針: React 非依存、domain/ のみ依存。
 *
 * @guard F7 View は ViewModel のみ受け取る
 * @responsibility R:transform
 */
import {
  computeDailyProjection,
  computeDowCounts,
  computeKpis,
  computeRemainingSales,
  type DowCounts,
  type SimulatorKpis,
  type SimulatorScenario,
} from '@/domain/calculations/budgetSimulator'
import type { SimulatorState } from '../application/useSimulatorState'

// ── 型定義 ──

/** プロトタイプ App.jsx L127-140 の rows 構造を TS 化 */
export interface SimulatorWidgetRow {
  /** セクション見出し行 (値なし) */
  readonly group?: string
  /** KPI 行 */
  readonly lbl?: string
  /** 金額 */
  readonly val?: number
  /** 前年実績 */
  readonly ly?: number | null
  /** 前年比 (%) */
  readonly yoy?: number | null
  /** 達成率 (%) */
  readonly ach?: number | null
  /** highlight (月末着地見込 等) */
  readonly highlight?: boolean
  /** 小さめ表示 (必要売上・必要日次 等) */
  readonly small?: boolean
  /** ドリルダウンキー (行クリックで展開) */
  readonly drillKey?: DrillKey
  /** 日次推移ストリップに表示する配列 */
  readonly strip?: readonly number[]
  /** ストリップ種別 */
  readonly stripType?: 'budget' | 'actual' | 'projection'
  /** ストリップの表示範囲 [start, end) — 0-indexed */
  readonly stripRange?: readonly [number, number]
}

/** 行クリックで開くドリルダウンの識別子 */
export type DrillKey = 'monthlyBudget' | 'elapsedBudget' | 'elapsedActual' | 'remBudget'

export interface SimulatorWidgetVm {
  readonly kpis: SimulatorKpis
  readonly remainingSales: number
  readonly finalLanding: number
  /** 月末着地 vs 月間予算 (%) */
  readonly finalVsBudget: number | null
  /** 月末着地 vs 前年同月 (%) */
  readonly finalVsLY: number | null
  /** 予算との差額 (正=超過、負=不足) */
  readonly landingDiff: number
  /** 残期間の日別予測 (長さ = daysInMonth - currentDay) */
  readonly dailyProjection: readonly number[]
  /** 残期間の曜日出現カウント [日,月,火,水,木,金,土] */
  readonly dowCounts: DowCounts
  /** KPI テーブルの行データ */
  readonly rows: readonly SimulatorWidgetRow[]
  /** 現在の入力値ラベル (ヘッダー表示用) */
  readonly modeLabel: string
  /** 現在の入力値 (yoy/ach モードのみ意味あり) */
  readonly curInput: number
}

// ── 内部ヘルパー ──

function pct(ratio: number, denominator: number): number | null {
  return denominator > 0 ? (ratio / denominator) * 100 : null
}

function modeLabel(mode: SimulatorState['mode']): string {
  if (mode === 'yoy') return '前年比'
  if (mode === 'ach') return '予算達成率'
  return '曜日別'
}

// ── 主要関数 ──

/**
 * シミュレーター widget の ViewModel を構築する (pure function)。
 *
 * scenario + state から以下を一括算出:
 * 1. 基盤 KPI (computeKpis)
 * 2. 残期間売上 (computeRemainingSales) — mode 分岐を含む
 * 3. 月末着地見込 (elapsed + remaining の加算)
 * 4. 日別予測配分・曜日カウント
 * 5. テーブル行データ (① 月間 / ② 経過 / ③ 残期間 / ④ 着地見込)
 */
export function buildSimulatorWidgetVm(input: {
  readonly scenario: SimulatorScenario
  readonly state: SimulatorState
}): SimulatorWidgetVm {
  const { scenario, state } = input
  const { currentDay, mode, yoyInput, achInput, dowInputs, dowBase, dayOverrides } = state

  const kpis = computeKpis(scenario, currentDay)

  const remainingSales = computeRemainingSales({
    scenario,
    currentDay,
    mode,
    yoyInput,
    achInput,
    dowInputs,
    dowBase,
    dayOverrides,
  })

  const dailyProjection = computeDailyProjection({
    scenario,
    currentDay,
    mode,
    yoyInput,
    achInput,
    dowInputs,
    dowBase,
    dayOverrides,
    remainingSales,
  })

  const dowCounts = computeDowCounts(scenario, currentDay)

  const finalLanding = kpis.elapsedActual + remainingSales
  const finalVsBudget = pct(finalLanding, scenario.monthlyBudget)
  // 前年比は full-month 前年データがある場合のみ意味がある
  const lyIsFullMonth = scenario.lyCoverageDay === null
  const finalVsLY = lyIsFullMonth ? pct(finalLanding, scenario.lyMonthly) : null
  const landingDiff = finalLanding - scenario.monthlyBudget

  const curInput = mode === 'yoy' ? yoyInput : mode === 'ach' ? achInput : 0

  // ── 行データ構築 (プロトタイプ App.jsx L127-140 準拠) ──

  // elapsedLY は lyDaily[0..currentDay) の合計。currentDay ≤ lyCoverageDay なら信頼可能
  const elapsedLY = kpis.remLY > 0 ? scenario.lyMonthly - kpis.remLY : scenario.lyMonthly
  const elapsedLYValid =
    scenario.lyCoverageDay === null || kpis.currentDay <= scenario.lyCoverageDay
  const elapsedLYforRow = elapsedLYValid ? elapsedLY : null

  const elapsedRate = (kpis.currentDay / scenario.daysInMonth) * 100
  const requiredPerDay = kpis.remainingDays > 0 ? kpis.requiredRemaining / kpis.remainingDays : 0
  const lyPerDay = kpis.remainingDays > 0 ? kpis.remLY / kpis.remainingDays : 0

  // 月間行の前年実績 / 前年比は full-month 前年データがある場合のみ表示
  const monthlyLyForRow = lyIsFullMonth ? scenario.lyMonthly : null
  const monthlyYoYForRow = lyIsFullMonth ? kpis.monthlyYoY : null

  // 残期間行の前年実績 (remLY) は full-month 前年データがある場合のみ (elapsed 以降カバレッジ必要)
  const remLYForRow = lyIsFullMonth ? kpis.remLY : null
  const remBudgetYoYForRow = lyIsFullMonth ? kpis.remBudgetYoY : null
  const requiredYoYForRow = lyIsFullMonth ? kpis.requiredYoY : null
  const lyPerDayForRow = lyIsFullMonth ? lyPerDay : null

  const rows: readonly SimulatorWidgetRow[] = [
    { group: '① 月間' },
    {
      lbl: '月間売上予算',
      val: scenario.monthlyBudget,
      ly: monthlyLyForRow,
      yoy: monthlyYoYForRow,
      strip: scenario.dailyBudget,
      stripType: 'budget',
      drillKey: 'monthlyBudget',
    },
    {
      group: `② 経過（1〜${kpis.currentDay}日 · ${elapsedRate.toFixed(1)}%消化）`,
    },
    {
      lbl: '経過予算',
      val: kpis.elapsedBudget,
      ly: elapsedLYforRow,
      yoy: elapsedLYforRow != null ? pct(kpis.elapsedBudget, elapsedLYforRow) : null,
      strip: scenario.dailyBudget,
      stripType: 'budget',
      stripRange: [0, kpis.currentDay],
      drillKey: 'elapsedBudget',
    },
    {
      lbl: '経過実績',
      val: kpis.elapsedActual,
      ly: elapsedLYforRow,
      yoy: elapsedLYValid ? kpis.elapsedYoY : null,
      ach: kpis.elapsedAchievement,
      strip: scenario.actualDaily,
      stripType: 'actual',
      stripRange: [0, kpis.currentDay],
      drillKey: 'elapsedActual',
    },
    {
      group: `③ 残期間（${kpis.currentDay + 1}〜${scenario.daysInMonth}日 · 残${kpis.remainingDays}日）`,
    },
    {
      lbl: '残期間予算',
      val: kpis.remBudget,
      ly: remLYForRow,
      yoy: remBudgetYoYForRow,
      strip: scenario.dailyBudget,
      stripType: 'budget',
      stripRange: [kpis.currentDay, scenario.daysInMonth],
      drillKey: 'remBudget',
    },
    {
      lbl: '予算達成に必要な売上',
      val: kpis.requiredRemaining,
      ly: remLYForRow,
      yoy: requiredYoYForRow,
      ach: kpis.requiredAchievement,
      small: true,
    },
    {
      lbl: '1日あたり必要売上',
      val: requiredPerDay,
      ly: lyPerDayForRow,
      yoy: null,
      small: true,
    },
    {
      group: `④ 着地見込（入力: ${modeLabel(mode)}${mode === 'dow' ? '' : ` ${curInput.toFixed(1)}%`}）`,
    },
    {
      lbl: '残期間 予測売上',
      val: remainingSales,
      ly: remLYForRow,
      yoy: remLYForRow != null ? pct(remainingSales, remLYForRow) : null,
      small: true,
      strip: dailyProjection,
      stripType: 'projection',
    },
    {
      lbl: '月末着地見込',
      val: finalLanding,
      ly: monthlyLyForRow,
      yoy: finalVsLY,
      ach: finalVsBudget,
      highlight: true,
    },
  ]

  return {
    kpis,
    remainingSales,
    finalLanding,
    finalVsBudget,
    finalVsLY,
    landingDiff,
    dailyProjection,
    dowCounts,
    rows,
    modeLabel: modeLabel(mode),
    curInput,
  }
}
