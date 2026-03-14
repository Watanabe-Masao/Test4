/**
 * budgetAnalysis 観測フィクスチャ
 *
 * 4 カテゴリ: normal / nullZeroMissing / extreme / boundary
 * 2 関数: calculateBudgetAnalysis, calculateGrossProfitBudget
 */
import type {
  BudgetAnalysisInput,
  GrossProfitBudgetInput,
} from '@/domain/calculations/budgetAnalysis'

export interface BudgetAnalysisFixture {
  readonly name: string
  readonly budgetAnalysis: BudgetAnalysisInput
  readonly grossProfitBudget: GrossProfitBudgetInput
}

export const NORMAL: BudgetAnalysisFixture = {
  name: 'normal',
  budgetAnalysis: {
    totalSales: 3_000_000,
    budget: 10_000_000,
    budgetDaily: { 1: 300_000, 2: 350_000, 3: 320_000, 4: 280_000, 5: 310_000 },
    salesDaily: { 1: 500_000, 2: 600_000, 3: 550_000, 4: 480_000, 5: 870_000 },
    elapsedDays: 5,
    salesDays: 5,
    daysInMonth: 30,
  },
  grossProfitBudget: {
    grossProfit: 900_000,
    grossProfitBudget: 3_000_000,
    budgetElapsedRate: 0.167,
    elapsedDays: 5,
    salesDays: 5,
    daysInMonth: 30,
  },
}

export const NULL_ZERO_MISSING: BudgetAnalysisFixture = {
  name: 'null-zero-missing',
  budgetAnalysis: {
    totalSales: 0,
    budget: 0,
    budgetDaily: {},
    salesDaily: {},
    elapsedDays: 0,
    salesDays: 0,
    daysInMonth: 30,
  },
  grossProfitBudget: {
    grossProfit: 0,
    grossProfitBudget: 0,
    budgetElapsedRate: 0,
    elapsedDays: 0,
    salesDays: 0,
    daysInMonth: 30,
  },
}

export const EXTREME: BudgetAnalysisFixture = {
  name: 'extreme',
  budgetAnalysis: {
    totalSales: 5e11,
    budget: 1e12,
    budgetDaily: { 1: 3e10, 2: 3.5e10, 3: 3.2e10 },
    salesDaily: { 1: 5e10, 2: 6e10, 3: 5.5e10 },
    elapsedDays: 3,
    salesDays: 3,
    daysInMonth: 31,
  },
  grossProfitBudget: {
    grossProfit: 1.5e11,
    grossProfitBudget: 3e11,
    budgetElapsedRate: 0.097,
    elapsedDays: 3,
    salesDays: 3,
    daysInMonth: 31,
  },
}

export const BOUNDARY: BudgetAnalysisFixture = {
  name: 'boundary',
  budgetAnalysis: {
    totalSales: 10_000_000,
    budget: 10_000_000,
    budgetDaily: {
      1: 333_333,
      2: 333_333,
      3: 333_333,
      4: 333_333,
      5: 333_333,
      6: 333_333,
      7: 333_333,
      8: 333_333,
      9: 333_333,
      10: 333_333,
      11: 333_333,
      12: 333_333,
      13: 333_333,
      14: 333_333,
      15: 333_333,
      16: 333_333,
      17: 333_333,
      18: 333_333,
      19: 333_333,
      20: 333_333,
      21: 333_333,
      22: 333_333,
      23: 333_333,
      24: 333_333,
      25: 333_333,
      26: 333_333,
      27: 333_333,
      28: 333_333,
      29: 333_333,
      30: 333_340,
    },
    salesDaily: {
      1: 333_333,
      2: 333_333,
      3: 333_333,
      4: 333_333,
      5: 333_333,
      6: 333_333,
      7: 333_333,
      8: 333_333,
      9: 333_333,
      10: 333_333,
      11: 333_333,
      12: 333_333,
      13: 333_333,
      14: 333_333,
      15: 333_333,
      16: 333_333,
      17: 333_333,
      18: 333_333,
      19: 333_333,
      20: 333_333,
      21: 333_333,
      22: 333_333,
      23: 333_333,
      24: 333_333,
      25: 333_333,
      26: 333_333,
      27: 333_333,
      28: 333_333,
      29: 333_333,
      30: 333_340,
    },
    elapsedDays: 30,
    salesDays: 30,
    daysInMonth: 30,
  },
  grossProfitBudget: {
    grossProfit: 3_000_000,
    grossProfitBudget: 3_000_000,
    budgetElapsedRate: 1.0,
    elapsedDays: 30,
    salesDays: 30,
    daysInMonth: 30,
  },
}

export const ALL_FIXTURES: readonly BudgetAnalysisFixture[] = [
  NORMAL,
  NULL_ZERO_MISSING,
  EXTREME,
  BOUNDARY,
]
