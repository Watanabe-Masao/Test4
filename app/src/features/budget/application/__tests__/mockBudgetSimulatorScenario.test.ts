/**
 * mockBudgetSimulatorScenario — Zod schema 準拠テスト
 *
 * reboot plan Phase B: widget が実データなしで描画できることを保証するため、
 * 各プリセット mock が `SimulatorScenarioSchema.parse()` を通ることを固定する。
 */
import { describe, it, expect } from 'vitest'
import { SimulatorScenarioSchema } from '@/domain/calculations/budgetSimulator'
import {
  DEFAULT_MOCK_SCENARIO,
  MONTH_START_MOCK_SCENARIO,
  MONTH_END_MOCK_SCENARIO,
  NO_PREV_YEAR_MOCK_SCENARIO,
  buildMockSimulatorScenario,
} from '../mockBudgetSimulatorScenario'

describe('mockBudgetSimulatorScenario', () => {
  it('DEFAULT_MOCK_SCENARIO が SimulatorScenarioSchema.parse() を通る', () => {
    expect(() => SimulatorScenarioSchema.parse(DEFAULT_MOCK_SCENARIO)).not.toThrow()
    expect(DEFAULT_MOCK_SCENARIO.daysInMonth).toBe(30)
    expect(DEFAULT_MOCK_SCENARIO.monthlyBudget).toBe(43_850_000)
    expect(DEFAULT_MOCK_SCENARIO.dailyBudget.length).toBe(30)
    expect(DEFAULT_MOCK_SCENARIO.lyDaily.length).toBe(30)
    expect(DEFAULT_MOCK_SCENARIO.actualDaily.length).toBe(30)
  })

  it('月間予算と dailyBudget の合計が一致する', () => {
    const sum = DEFAULT_MOCK_SCENARIO.dailyBudget.reduce((s, v) => s + v, 0)
    expect(sum).toBe(DEFAULT_MOCK_SCENARIO.monthlyBudget)
  })

  it('MONTH_START_MOCK_SCENARIO は actual が全日 0 (未経過)', () => {
    const sum = MONTH_START_MOCK_SCENARIO.actualDaily.reduce((s, v) => s + v, 0)
    expect(sum).toBe(0)
  })

  it('MONTH_END_MOCK_SCENARIO は actual が全日埋まっている', () => {
    const zeroCount = MONTH_END_MOCK_SCENARIO.actualDaily.filter((v) => v === 0).length
    expect(zeroCount).toBe(0)
  })

  it('NO_PREV_YEAR_MOCK_SCENARIO は lyMonthly = 0 / lyDaily 全日 0', () => {
    expect(NO_PREV_YEAR_MOCK_SCENARIO.lyMonthly).toBe(0)
    const lySum = NO_PREV_YEAR_MOCK_SCENARIO.lyDaily.reduce((s, v) => s + v, 0)
    expect(lySum).toBe(0)
  })

  it('buildMockSimulatorScenario で year/month を指定すると daysInMonth が追随する', () => {
    const feb2026 = buildMockSimulatorScenario({ year: 2026, month: 2 })
    expect(feb2026.daysInMonth).toBe(28) // 2026-02 は 28 日 (うるう年ではない)
    expect(feb2026.dailyBudget.length).toBe(28)
  })
})
