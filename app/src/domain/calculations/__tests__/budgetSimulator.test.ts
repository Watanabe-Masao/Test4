/**
 * budgetSimulator テスト — 予算達成シミュレーター pure 計算
 *
 * 主に invariant 中心。既存関数の invariant は既存テストが保証するため
 * ここでは新規ロジック（3 モード + 日別配分 + 曜日カウント）と
 * 既存関数との一貫性を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  computeKpis,
  computeRemainingSales,
  computeDailyProjection,
  computeDowCounts,
  pctForDay,
  dowOf,
  SimulatorScenarioSchema,
  type SimulatorScenario,
  type DowFactors,
} from '../budgetSimulator'
import { projectLinear } from '../budgetAnalysis'
import { calculateYoYRatio } from '../utils'

// ── fixtures ──

const uniform = (n: number, v: number): number[] => Array.from({ length: n }, () => v)

const makeScenario = (overrides: Partial<SimulatorScenario> = {}): SimulatorScenario => ({
  year: 2026,
  month: 4, // 2026-04-01 = 水曜日、30 日
  daysInMonth: 30,
  monthlyBudget: 3000,
  lyMonthly: 2400,
  dailyBudget: uniform(30, 100),
  lyDaily: uniform(30, 80),
  actualDaily: uniform(30, 90),
  ...overrides,
})

const DOW_ALL_100: DowFactors = [100, 100, 100, 100, 100, 100, 100]

// ── computeKpis ──

describe('computeKpis', () => {
  it('端: currentDay === 1', () => {
    const s = makeScenario()
    const k = computeKpis(s, 1)
    expect(k.currentDay).toBe(1)
    expect(k.remainingDays).toBe(29)
    expect(k.elapsedBudget).toBeCloseTo(100, 5)
    expect(k.elapsedActual).toBeCloseTo(90, 5)
    expect(k.remBudget).toBeCloseTo(2900, 5)
  })

  it('端: currentDay === daysInMonth', () => {
    const s = makeScenario()
    const k = computeKpis(s, 30)
    expect(k.remainingDays).toBe(0)
    expect(k.elapsedBudget).toBeCloseTo(3000, 5)
    expect(k.remBudget).toBeCloseTo(0, 5)
    expect(k.remLY).toBeCloseTo(0, 5)
    expect(k.requiredAchievement).toBeNull() // remBudget === 0
  })

  it('currentDay を範囲外に指定すると clamp される', () => {
    const s = makeScenario()
    expect(computeKpis(s, 0).currentDay).toBe(1)
    expect(computeKpis(s, 999).currentDay).toBe(30)
  })

  it('actualDaily が全 0 → elapsedYoY は null ではなく 0', () => {
    const s = makeScenario({ actualDaily: uniform(30, 0) })
    const k = computeKpis(s, 10)
    expect(k.elapsedActual).toBe(0)
    // elapsedLY > 0 なので YoY は計算される（0/elapsedLY = 0）
    expect(k.elapsedYoY).toBe(0)
  })

  it('lyMonthly === 0 → monthlyYoY は null', () => {
    const s = makeScenario({ lyMonthly: 0, lyDaily: uniform(30, 0) })
    const k = computeKpis(s, 10)
    expect(k.monthlyYoY).toBeNull()
    expect(k.elapsedYoY).toBeNull()
    expect(k.remBudgetYoY).toBeNull()
    expect(k.requiredYoY).toBeNull()
  })

  it('既存 projectLinear と projectedMonth が一致', () => {
    const s = makeScenario()
    const currentDay = 10
    const k = computeKpis(s, currentDay)
    expect(k.projectedMonth).toBeCloseTo(
      projectLinear(k.elapsedActual, currentDay, s.daysInMonth),
      5,
    )
  })

  it('既存 calculateYoYRatio と monthlyYoY / 100 が一致', () => {
    const s = makeScenario()
    const k = computeKpis(s, 10)
    expect(k.monthlyYoY! / 100).toBeCloseTo(calculateYoYRatio(s.monthlyBudget, s.lyMonthly), 5)
  })

  it('requiredRemaining は max(0, monthlyBudget - elapsedActual)', () => {
    // 予算超過ケース: actualDaily 合計 > monthlyBudget
    const s = makeScenario({
      monthlyBudget: 1000,
      actualDaily: uniform(30, 100), // 合計 3000
    })
    const k = computeKpis(s, 30)
    expect(k.requiredRemaining).toBe(0) // Math.max で下限 0
  })
})

// ── computeRemainingSales ──

describe('computeRemainingSales', () => {
  const scenario = makeScenario()

  it('mode=yoy + yoyInput=100 → remLY と一致', () => {
    const remSales = computeRemainingSales({
      scenario,
      currentDay: 10,
      mode: 'yoy',
      yoyInput: 100,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: {},
    })
    const expected = 80 * 20 // lyDaily[10..30) = 20 日分 × 80
    expect(remSales).toBeCloseTo(expected, 5)
  })

  it('mode=ach + achInput=100 → remBudget と一致', () => {
    const remSales = computeRemainingSales({
      scenario,
      currentDay: 10,
      mode: 'ach',
      yoyInput: 0,
      achInput: 100,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: {},
    })
    const expected = 100 * 20 // remBudget = 3000 - 1000 = 2000
    expect(remSales).toBeCloseTo(expected, 5)
  })

  it('mode=dow + dowInputs=[100]*7 + dowBase=yoy → remLY と一致', () => {
    const remSales = computeRemainingSales({
      scenario,
      currentDay: 10,
      mode: 'dow',
      yoyInput: 0,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: {},
    })
    expect(remSales).toBeCloseTo(80 * 20, 5)
  })

  it('mode=dow + dowInputs=[100]*7 + dowBase=ach → 残期間 dailyBudget 合計と一致', () => {
    const remSales = computeRemainingSales({
      scenario,
      currentDay: 10,
      mode: 'dow',
      yoyInput: 0,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'ach',
      dayOverrides: {},
    })
    expect(remSales).toBeCloseTo(100 * 20, 5)
  })

  it('dayOverrides が dowInputs を上書きする', () => {
    const base = computeRemainingSales({
      scenario,
      currentDay: 10,
      mode: 'dow',
      yoyInput: 0,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: {},
    })
    // day 15 を 200% に override → lyDaily[14] × 1.0 追加（元は 1.0 相当）
    const withOverride = computeRemainingSales({
      scenario,
      currentDay: 10,
      mode: 'dow',
      yoyInput: 0,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: { 15: 200 },
    })
    // 差分は lyDaily[14] = 80 (override 200% は 100% 比 +100% = +1.0 倍)
    expect(withOverride - base).toBeCloseTo(80, 5)
  })

  it('yoyInput=50 → remLY の半分', () => {
    const remSales = computeRemainingSales({
      scenario,
      currentDay: 10,
      mode: 'yoy',
      yoyInput: 50,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: {},
    })
    expect(remSales).toBeCloseTo(80 * 20 * 0.5, 5)
  })
})

// ── computeDailyProjection ──

describe('computeDailyProjection', () => {
  const scenario = makeScenario()

  it('yoy/ach モード: 配列合計 === remainingSales', () => {
    const remainingSales = 1500
    const proj = computeDailyProjection({
      scenario,
      currentDay: 10,
      mode: 'yoy',
      yoyInput: 0,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: {},
      remainingSales,
    })
    const sum = proj.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(remainingSales, 5)
    expect(proj.length).toBe(20) // daysInMonth - currentDay
  })

  it('dow モード: 配列長 = daysInMonth - currentDay', () => {
    const proj = computeDailyProjection({
      scenario,
      currentDay: 10,
      mode: 'dow',
      yoyInput: 0,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: {},
      remainingSales: 0, // dow モードは入力の remainingSales を使わない
    })
    expect(proj.length).toBe(20)
    // 各要素は lyDaily[i] × 1.0 = 80
    proj.forEach((v) => expect(v).toBeCloseTo(80, 5))
  })

  it('dow モード: dayOverrides で特定日の値が変わる', () => {
    const proj = computeDailyProjection({
      scenario,
      currentDay: 10,
      mode: 'dow',
      yoyInput: 0,
      achInput: 0,
      dowInputs: DOW_ALL_100,
      dowBase: 'yoy',
      dayOverrides: { 15: 200 },
      remainingSales: 0,
    })
    // day 15 は projection の index 15 - 10 - 1 = 4
    expect(proj[4]).toBeCloseTo(80 * 2, 5)
  })
})

// ── computeDowCounts ──

describe('computeDowCounts', () => {
  it('合計 === daysInMonth - currentDay', () => {
    const s = makeScenario()
    const counts = computeDowCounts(s, 10)
    const sum = counts.reduce((a, b) => a + b, 0)
    expect(sum).toBe(20)
  })

  it('currentDay === daysInMonth → 全ゼロ', () => {
    const s = makeScenario()
    const counts = computeDowCounts(s, 30)
    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('2026年4月 (30日, 4月1日=水) 全期間 → 期待分布', () => {
    // 2026-04-01 = Wed (3), 30 日
    // W Th F Sa Su M Tu を 4 周 + W Th の 2 日余り
    // 日=4, 月=4, 火=4, 水=5, 木=5, 金=4, 土=4
    const s = makeScenario()
    const counts = computeDowCounts(s, 1) // currentDay=1 → 2..30 の 29 日
    // day 1 (水) を除くので 水=4, 木=5, 金=4, 土=4, 日=4, 月=4, 火=4
    expect(counts).toEqual([4, 4, 4, 4, 5, 4, 4])
    expect(counts.reduce((a, b) => a + b, 0)).toBe(29)
  })
})

// ── helper 関数 ──

describe('dowOf', () => {
  it('2026-04-01 は水曜 (3)', () => {
    expect(dowOf(2026, 4, 1)).toBe(3)
  })
  it('2026-04-05 は日曜 (0)', () => {
    expect(dowOf(2026, 4, 5)).toBe(0)
  })
})

describe('pctForDay', () => {
  const dowInputs: DowFactors = [50, 60, 70, 80, 90, 100, 110]

  it('dayOverrides があればそれを返す', () => {
    expect(pctForDay(15, { 15: 200 }, dowInputs, 2026, 4)).toBe(200)
  })

  it('dayOverrides がなければ曜日係数を返す', () => {
    // 2026-04-15 = 水曜 (3) → dowInputs[3] = 80
    expect(pctForDay(15, {}, dowInputs, 2026, 4)).toBe(80)
  })
})

// ── Zod スキーマ ──

describe('SimulatorScenarioSchema', () => {
  it('正常なシナリオは parse 成功', () => {
    const s = makeScenario()
    expect(() => SimulatorScenarioSchema.parse(s)).not.toThrow()
  })

  it('dailyBudget.length !== daysInMonth → parse error', () => {
    const s = makeScenario({ dailyBudget: uniform(29, 100) })
    expect(() => SimulatorScenarioSchema.parse(s)).toThrow()
  })

  it('month 範囲外 → parse error', () => {
    const s = makeScenario({ month: 13 })
    expect(() => SimulatorScenarioSchema.parse(s)).toThrow()
  })

  it('monthlyBudget 負数 → parse error', () => {
    const s = makeScenario({ monthlyBudget: -100 })
    expect(() => SimulatorScenarioSchema.parse(s)).toThrow()
  })

  // daysInMonth と year/month の整合性チェック
  describe('daysInMonth は year/month のグレゴリオ暦と一致する必要がある', () => {
    it('2026年2月 (非閏年) + daysInMonth=31 → parse error', () => {
      const s = makeScenario({
        year: 2026,
        month: 2,
        daysInMonth: 31,
        dailyBudget: uniform(31, 100),
        lyDaily: uniform(31, 80),
        actualDaily: uniform(31, 90),
      })
      expect(() => SimulatorScenarioSchema.parse(s)).toThrow(/Gregorian calendar/)
    })

    it('2025年2月 (非閏年) + daysInMonth=29 → parse error', () => {
      const s = makeScenario({
        year: 2025,
        month: 2,
        daysInMonth: 29,
        dailyBudget: uniform(29, 100),
        lyDaily: uniform(29, 80),
        actualDaily: uniform(29, 90),
      })
      expect(() => SimulatorScenarioSchema.parse(s)).toThrow(/Gregorian calendar/)
    })

    it('2024年2月 (閏年) + daysInMonth=29 → parse 成功', () => {
      const s = makeScenario({
        year: 2024,
        month: 2,
        daysInMonth: 29,
        dailyBudget: uniform(29, 100),
        lyDaily: uniform(29, 80),
        actualDaily: uniform(29, 90),
      })
      expect(() => SimulatorScenarioSchema.parse(s)).not.toThrow()
    })

    it('2024年2月 (閏年) + daysInMonth=28 → parse error', () => {
      const s = makeScenario({
        year: 2024,
        month: 2,
        daysInMonth: 28,
        dailyBudget: uniform(28, 100),
        lyDaily: uniform(28, 80),
        actualDaily: uniform(28, 90),
      })
      expect(() => SimulatorScenarioSchema.parse(s)).toThrow(/Gregorian calendar/)
    })

    it('2026年4月 + daysInMonth=31 → parse error (4月は30日)', () => {
      const s = makeScenario({
        daysInMonth: 31,
        dailyBudget: uniform(31, 100),
        lyDaily: uniform(31, 80),
        actualDaily: uniform(31, 90),
      })
      expect(() => SimulatorScenarioSchema.parse(s)).toThrow(/Gregorian calendar/)
    })

    it('2026年1月 + daysInMonth=30 → parse error (1月は31日)', () => {
      const s = makeScenario({
        year: 2026,
        month: 1,
        daysInMonth: 30,
        dailyBudget: uniform(30, 100),
        lyDaily: uniform(30, 80),
        actualDaily: uniform(30, 90),
      })
      expect(() => SimulatorScenarioSchema.parse(s)).toThrow(/Gregorian calendar/)
    })
  })
})
