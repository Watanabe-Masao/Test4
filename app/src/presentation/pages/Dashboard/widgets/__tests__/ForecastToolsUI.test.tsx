/**
 * ForecastToolsWidget — UI構造テスト
 *
 * InsightBanner と SummaryCard による判断UIが正しく構成されることを検証。
 * useForecastToolsState をモックしてレイアウト意味だけ確認する。
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { lightTheme } from '@/presentation/theme/theme'

// useForecastToolsState をモック
vi.mock('../useForecastToolsState', () => ({
  useForecastToolsState: () => ({
    base: {
      actualSales: 25000000,
      actualGP: 6000000,
      actualGPRate: 0.24,
      budget: 37000000,
      remainingBudget: 12000000,
      hasBudget: true,
      hasRemainingBudget: true,
      hasPrevYear: true,
      prevYearTotalSales: 36000000,
      defaultSalesLanding: 37500000,
      defaultRemainGPRate: 24.0,
      defaultTargetGPRate: 25.0,
    },
    tool1: {
      tool1Valid: true,
      remainingSales1: 12500000,
      remainingGP1: 3000000,
      totalGP1: 9000000,
      landingGPRate1: 0.24,
      salesDiff: 0,
      gpRateDiff: 0,
      tool1RemainingBudgetRate: 1.04,
      tool1BudgetAchievement: 1.01,
      tool1YoyRate: 1.04,
    },
    tool2: {
      tool2Valid: true,
      targetTotalSales2: 37000000,
      targetTotalGP2: 9250000,
      requiredRemainingGP2: 3250000,
      remainingSales2: 12000000,
      requiredRemainingGPRate2: 0.27,
      goalDiff: 0,
      goalSalesDiff: 0,
      salesBudget: 37000000,
      projectedTotalSales2: 37500000,
      projectedSalesAchievement: 1.01,
      targetSalesAchievement: 1.0,
      gpBudget: 9000000,
      projectedTotalGP2: 9000000,
      projectedGPAchievement: 1.0,
      targetGPAchievement: 1.03,
      tool2RemainingBudgetRate: 1.0,
      tool2YoyRate: 1.03,
    },
    salesLanding: 37500000,
    remainGPRate: 24.0,
    targetMonthlySales: 37000000,
    targetGPRate: 25.0,
    obsWarning: null,
    salesRange: { min: 30000000, max: 45000000, step: 100000 },
    goalSalesRange: { min: 30000000, max: 45000000, step: 100000 },
    setSalesLanding: vi.fn(),
    setRemainGPRate: vi.fn(),
    setTargetMonthlySales: vi.fn(),
    setTargetGPRate: vi.fn(),
    stepSalesLanding: vi.fn(),
    stepRemainGPRate: vi.fn(),
    stepTargetMonthlySales: vi.fn(),
    stepTargetGPRate: vi.fn(),
    resetSalesLanding: vi.fn(),
    resetRemainGPRate: vi.fn(),
    resetTargetMonthlySales: vi.fn(),
    resetTargetGPRate: vi.fn(),
  }),
}))

import { ForecastToolsWidget } from '../ForecastTools'

// 最小限の WidgetContext モック
const mockCtx = {
  fmtCurrency: (v: number) => `${Math.round(v / 10000).toLocaleString()}万円`,
  targetRate: 0.25,
  result: {
    grossProfitRateBudget: 0.25,
  },
} as Parameters<typeof ForecastToolsWidget>[0]['ctx']

function renderWidget() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <ForecastToolsWidget ctx={mockCtx} />
    </ThemeProvider>,
  )
}

describe('ForecastToolsWidget UI構造', () => {
  it('Tool1: InsightBanner が表示される', () => {
    renderWidget()
    // positive level: 達成圏内メッセージ
    expect(screen.getByText(/達成圏内/)).toBeDefined()
  })

  it('Tool1: 売上着地カードと粗利見込みカードが表示される', () => {
    renderWidget()
    expect(screen.getByText('売上着地')).toBeDefined()
    expect(screen.getByText('粗利見込み')).toBeDefined()
  })

  it('Tool2: InsightBanner が表示される', () => {
    renderWidget()
    // requiredRemainingGPRate2 (0.27) > actualGPRate (0.24) * 1.05 = 0.252 → negative
    expect(screen.getByText(/粗利率の大幅改善が必要/)).toBeDefined()
  })

  it('Tool2: 必要アクションカードが表示される', () => {
    renderWidget()
    expect(screen.getByText('必要アクション')).toBeDefined()
    expect(screen.getByText('残期間必要粗利率')).toBeDefined()
  })
})
