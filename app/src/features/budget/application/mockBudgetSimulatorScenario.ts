/**
 * mockBudgetSimulatorScenario — UI 開発用の固定 fixture
 *
 * reboot plan Phase B の成果物。widget を実データなしで描画できるようにするための
 * 決定論的な `SimulatorScenario` を提供する。
 *
 * - 2026 年 4 月（30 日）の実業務に近い値感で構築
 * - 曜日別の変動を埋め込み、chart / calendar の視覚確認に適する
 * - Zod schema (`SimulatorScenarioSchema`) で parse 済みの値を返す
 *
 * **UI 開発 / Storybook / テスト用。production 経路では使わない。**
 *
 * @responsibility R:unclassified
 */
import {
  SimulatorScenarioSchema,
  dowOf,
  type SimulatorScenario,
} from '@/domain/calculations/budgetSimulator'

/** 曜日係数 (1.0 基準、週末強め)。index 0=日曜, 6=土曜 */
const DOW_WEIGHTS = [1.1, 0.85, 0.85, 0.9, 0.95, 1.05, 1.25] as const

function buildDailyArray(
  year: number,
  month: number,
  daysInMonth: number,
  baseAmount: number,
  actualDayFactor: (day: number) => number,
): readonly number[] {
  const arr: number[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = dowOf(year, month, day)
    const weight = DOW_WEIGHTS[dow] ?? 1
    arr.push(Math.round(baseAmount * weight * actualDayFactor(day)))
  }
  return arr
}

export interface MockScenarioOptions {
  readonly year?: number
  readonly month?: number
  /** 月間売上予算 (円) */
  readonly monthlyBudget?: number
  /** 前年月合計 (円) */
  readonly lyMonthly?: number
  /** 予算対比の前年実績変動幅 (0.95〜1.05 のような) */
  readonly lyJitter?: number
  /** 当期 actual の達成感 (1.0=予算通り、0.95=若干未達など)。null で actual をすべて 0 */
  readonly actualAchievement?: number | null
  /** actual を埋める末日 (1-based)。指定日以降は 0 埋め */
  readonly actualCoverageDay?: number
}

const DEFAULTS = {
  year: 2026,
  month: 4,
  monthlyBudget: 43_850_000,
  lyMonthly: 42_136_043,
  lyJitter: 0.05,
  actualAchievement: 0.97,
  actualCoverageDay: 16,
} as const

/**
 * 固定条件での mock scenario を構築する。
 *
 * options 未指定なら 2026-04 / 予算 43.85M / 前年 42.14M / 達成 97% / 16 日経過。
 */
export function buildMockSimulatorScenario(options: MockScenarioOptions = {}): SimulatorScenario {
  const year = options.year ?? DEFAULTS.year
  const month = options.month ?? DEFAULTS.month
  const monthlyBudget = options.monthlyBudget ?? DEFAULTS.monthlyBudget
  const lyMonthly = options.lyMonthly ?? DEFAULTS.lyMonthly
  const jitter = options.lyJitter ?? DEFAULTS.lyJitter
  const actualAchievement = options.actualAchievement ?? DEFAULTS.actualAchievement
  const actualCoverageDay = options.actualCoverageDay ?? DEFAULTS.actualCoverageDay

  const daysInMonth = new Date(year, month, 0).getDate()

  // 日平均予算を曜日係数で分散。総和が月間予算と一致するよう最終日で補正する。
  const dailyBudgetRaw = buildDailyArray(
    year,
    month,
    daysInMonth,
    monthlyBudget / daysInMonth,
    () => 1,
  )
  const dailyBudgetSum = dailyBudgetRaw.reduce((s, v) => s + v, 0)
  const dailyBudget = dailyBudgetRaw.map((v, i) =>
    i === dailyBudgetRaw.length - 1 ? v + (monthlyBudget - dailyBudgetSum) : v,
  )

  // 前年: 予算ベースから ±jitter で日別変動。総和を lyMonthly に補正。
  // lyMonthly === 0 (前年データなし) なら全日 0。
  let lyDaily: readonly number[]
  if (lyMonthly === 0) {
    lyDaily = new Array<number>(daysInMonth).fill(0)
  } else {
    const lyRaw = buildDailyArray(year, month, daysInMonth, lyMonthly / daysInMonth, (day) => {
      // 疑似乱数 (day-based) — 決定論を保ちつつ見た目の変動を作る
      const h = Math.sin(day * 12.9898) * 43758.5453
      const frac = h - Math.floor(h)
      return 1 + (frac * 2 - 1) * jitter
    })
    const lyRawSum = lyRaw.reduce((s, v) => s + v, 0)
    lyDaily = lyRaw.map((v) => Math.round((v * lyMonthly) / lyRawSum))
  }

  // actual: coverageDay までは budget × achievement、それ以降は 0
  const actualDaily: number[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    if (day > actualCoverageDay || actualAchievement == null) {
      actualDaily.push(0)
    } else {
      const dow = dowOf(year, month, day)
      const weight = DOW_WEIGHTS[dow] ?? 1
      actualDaily.push(Math.round((monthlyBudget / daysInMonth) * weight * actualAchievement))
    }
  }

  return SimulatorScenarioSchema.parse({
    year,
    month,
    daysInMonth,
    monthlyBudget,
    lyMonthly,
    dailyBudget,
    lyDaily,
    actualDaily,
    // mock は前年 full-month を埋めている前提 (null = full coverage)
    lyCoverageDay: null,
  })
}

/** 既定の mock scenario (再生成を避けるためのシングルトン) */
export const DEFAULT_MOCK_SCENARIO: SimulatorScenario = buildMockSimulatorScenario()

/** 月初 (currentDay=1) 用 */
export const MONTH_START_MOCK_SCENARIO: SimulatorScenario = buildMockSimulatorScenario({
  actualCoverageDay: 0,
  actualAchievement: null,
})

/** 月末 (全日経過済み) 用 */
export const MONTH_END_MOCK_SCENARIO: SimulatorScenario = buildMockSimulatorScenario({
  actualCoverageDay: 30,
  actualAchievement: 1.02,
})

/** 前年データなし用 */
export const NO_PREV_YEAR_MOCK_SCENARIO: SimulatorScenario = buildMockSimulatorScenario({
  lyMonthly: 0,
})
