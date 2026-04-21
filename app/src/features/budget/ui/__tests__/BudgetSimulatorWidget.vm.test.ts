/**
 * BudgetSimulatorWidget.vm テスト — pure function VM の検証
 */
import { describe, it, expect } from 'vitest'
import { buildSimulatorWidgetVm } from '../BudgetSimulatorWidget.vm'
import type { SimulatorScenario, DowFactors } from '@/domain/calculations/budgetSimulator'
import type { SimulatorState } from '../../application/useSimulatorState'

const uniform = (n: number, v: number): number[] => Array.from({ length: n }, () => v)

const makeScenario = (overrides: Partial<SimulatorScenario> = {}): SimulatorScenario => ({
  year: 2026,
  month: 4,
  daysInMonth: 30,
  monthlyBudget: 3000,
  lyMonthly: 2400,
  dailyBudget: uniform(30, 100),
  lyDaily: uniform(30, 80),
  actualDaily: uniform(30, 90),
  lyCoverageDay: null,
  ...overrides,
})

const DOW_ALL_100: DowFactors = [100, 100, 100, 100, 100, 100, 100]

const makeState = (overrides: Partial<SimulatorState> = {}): SimulatorState => ({
  currentDay: 10,
  mode: 'yoy',
  yoyInput: 100,
  achInput: 100,
  dowInputs: DOW_ALL_100,
  dowBase: 'yoy',
  dayOverrides: {},
  weekStart: 1,
  ...overrides,
})

describe('buildSimulatorWidgetVm', () => {
  it('基本形: rows が 4 セクション (① 月間 / ② 経過 / ③ 残期間 / ④ 着地見込) を含む', () => {
    const vm = buildSimulatorWidgetVm({ scenario: makeScenario(), state: makeState() })
    const groups = vm.rows.filter((r) => r.group != null).map((r) => r.group!)
    expect(groups).toHaveLength(4)
    expect(groups[0]).toBe('① 月間')
    expect(groups[1]).toMatch(/② 経過/)
    expect(groups[2]).toMatch(/③ 残期間/)
    expect(groups[3]).toMatch(/④ 着地見込/)
  })

  it('highlight 行は月末着地見込のみ', () => {
    const vm = buildSimulatorWidgetVm({ scenario: makeScenario(), state: makeState() })
    const highlighted = vm.rows.filter((r) => r.highlight === true)
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0].lbl).toBe('月末着地見込')
  })

  it('mode=yoy + yoyInput=100 → remainingSales === remLY', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ mode: 'yoy', yoyInput: 100 }),
    })
    // remLY = 80 × 20 = 1600
    expect(vm.remainingSales).toBeCloseTo(1600, 5)
    expect(vm.remainingSales).toBeCloseTo(vm.kpis.remLY, 5)
  })

  it('finalLanding === elapsedActual + remainingSales', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ currentDay: 15, mode: 'ach', achInput: 100 }),
    })
    expect(vm.finalLanding).toBeCloseTo(vm.kpis.elapsedActual + vm.remainingSales, 5)
  })

  it('finalVsBudget: 予算 100% 達成で値 100', () => {
    // actualDaily=100 × 30日 = 3000 = monthlyBudget
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario({ actualDaily: uniform(30, 100), monthlyBudget: 3000 }),
      state: makeState({ currentDay: 30, mode: 'ach', achInput: 100 }),
    })
    expect(vm.finalVsBudget).toBeCloseTo(100, 5)
    expect(vm.landingDiff).toBeCloseTo(0, 5)
  })

  it('lyMonthly === 0 → finalVsLY は null', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario({ lyMonthly: 0, lyDaily: uniform(30, 0) }),
      state: makeState(),
    })
    expect(vm.finalVsLY).toBeNull()
  })

  it('dailyProjection の長さ === daysInMonth - currentDay', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ currentDay: 12 }),
    })
    expect(vm.dailyProjection).toHaveLength(18)
  })

  it('dowCounts の合計 === daysInMonth - currentDay', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ currentDay: 10 }),
    })
    const sum = vm.dowCounts.reduce((a, b) => a + b, 0)
    expect(sum).toBe(20)
  })

  it('modeLabel: yoy → "前年比"', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ mode: 'yoy' }),
    })
    expect(vm.modeLabel).toBe('前年比')
    expect(vm.rows.find((r) => r.group?.startsWith('④'))?.group).toMatch(/前年比 100\.0%/)
  })

  it('modeLabel: ach → "予算達成率"', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ mode: 'ach', achInput: 105 }),
    })
    expect(vm.modeLabel).toBe('予算達成率')
    expect(vm.rows.find((r) => r.group?.startsWith('④'))?.group).toMatch(/予算達成率 105\.0%/)
  })

  it('modeLabel: dow → "曜日別" (入力%は表示しない)', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ mode: 'dow' }),
    })
    expect(vm.modeLabel).toBe('曜日別')
    const groupLabel = vm.rows.find((r) => r.group?.startsWith('④'))?.group
    expect(groupLabel).toBe('④ 着地見込（入力: 曜日別）')
  })

  it('② 経過 セクションのラベルに currentDay と消化率が入る', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ currentDay: 15 }),
    })
    // 15/30 = 50.0% 消化
    const group = vm.rows.find((r) => r.group?.startsWith('②'))?.group
    expect(group).toMatch(/1〜15日/)
    expect(group).toMatch(/50\.0%消化/)
  })

  it('③ 残期間 セクションのラベルに残日数が入る', () => {
    const vm = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ currentDay: 20 }),
    })
    // 残 10 日
    const group = vm.rows.find((r) => r.group?.startsWith('③'))?.group
    expect(group).toMatch(/21〜30日/)
    expect(group).toMatch(/残10日/)
  })

  it('dayOverrides が dow 計算に反映される', () => {
    const base = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ mode: 'dow', dowBase: 'yoy' }),
    })
    const withOverride = buildSimulatorWidgetVm({
      scenario: makeScenario(),
      state: makeState({ mode: 'dow', dowBase: 'yoy', dayOverrides: { 15: 200 } }),
    })
    // day 15 を 200% override → lyDaily[14] (= 80) が +80 ぶん増える
    expect(withOverride.remainingSales - base.remainingSales).toBeCloseTo(80, 5)
  })

  it('drillKey をもつ行は 4 つ (月間予算/経過予算/経過実績/残期間予算)', () => {
    const vm = buildSimulatorWidgetVm({ scenario: makeScenario(), state: makeState() })
    const drillKeys = vm.rows.filter((r) => r.drillKey).map((r) => r.drillKey)
    expect(drillKeys).toEqual(['monthlyBudget', 'elapsedBudget', 'elapsedActual', 'remBudget'])
  })
})
