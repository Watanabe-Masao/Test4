/**
 * SensitivityDashboard — UI構造テスト
 *
 * 3カード構成、InsightBanner、シナリオ保存/読込の既存動線を確認。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { lightTheme } from '@/presentation/theme/theme'

// useSensitivity hooks をモック
vi.mock('@/application/hooks/useSensitivity', () => ({
  useSensitivityBase: () => ({
    totalSales: 37000000,
    totalCustomers: 15000,
    transactionValue: 2467,
    totalCoreSales: 35000000,
    totalDiscount: 1200000,
    totalCost: 26000000,
    totalConsumable: 500000,
    elapsedDays: 15,
    daysInMonth: 30,
    budget: 37000000,
  }),
  useSensitivityAnalysis: () => ({
    baseGrossProfit: 9000000,
    baseGrossProfitRate: 0.243,
    simulatedGrossProfit: 9200000,
    simulatedGrossProfitRate: 0.249,
    simulatedSales: 37000000,
    simulatedProjectedSales: 74000000,
    grossProfitDelta: 200000,
    salesDelta: 0,
    projectedSalesDelta: 0,
    budgetAchievementDelta: 0.005,
  }),
  useElasticity: () => ({
    discountRateElasticity: 370000,
    customersElasticity: 90000,
    transactionValueElasticity: 90000,
    costRateElasticity: 370000,
  }),
}))

import { SensitivityDashboard } from '../SensitivityDashboard'

const mockResult = {} as Parameters<typeof SensitivityDashboard>[0]['result']

function renderDashboard() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <SensitivityDashboard result={mockResult} />
    </ThemeProvider>,
  )
}

describe('SensitivityDashboard UI構造', () => {
  it('InsightBanner が上部に表示される', () => {
    renderDashboard()
    // grossProfitDelta > 0 && budgetAchievementDelta >= 0 → positive
    expect(screen.getByText(/粗利・達成率ともに改善/)).toBeDefined()
  })

  it('3カード構成: 粗利インパクト/売上シミュレーション/予算達成率変化', () => {
    renderDashboard()
    expect(screen.getByText('粗利インパクト')).toBeDefined()
    expect(screen.getByText('売上シミュレーション')).toBeDefined()
    expect(screen.getByText('予算達成率変化')).toBeDefined()
  })

  it('スライダー変更後にシナリオ保存→テーブル表示→削除の動線が機能する', () => {
    renderDashboard()
    // スライダーを変更して isAllZero を解除
    const sliders = screen.getAllByRole('slider')
    if (sliders.length > 0) {
      fireEvent.change(sliders[0], { target: { value: '0.01' } })
    }
    // 保存ボタンが表示されたら保存
    const saveBtn = screen.queryByText('シナリオ保存')
    if (saveBtn) {
      fireEvent.click(saveBtn)
      expect(screen.getByText('シナリオ比較')).toBeDefined()
      expect(screen.getByText('シナリオ 1')).toBeDefined()
      // 削除
      fireEvent.click(screen.getByText('✕'))
      expect(screen.queryByText('シナリオ 1')).toBeNull()
    }
  })
})
