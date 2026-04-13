/**
 * ChartHeader.tsx — ChartHelpButton / ChartGuidePanel の contract test
 *
 * 検証対象:
 * - ChartHelpButton: クリックで GuidePanel を開閉
 * - ChartGuidePanel: purpose / howToRead を描画
 * - keyPoints が存在する場合のみ「注目ポイント」セクションを描画
 * - relatedMetrics + metricSummaries で関連指標セクションを描画
 * - relatedMetrics があっても metricSummaries が無ければ非表示
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'
import { ChartHelpButton, ChartGuidePanel } from '../ChartHeader'
import type { ChartGuide } from '../chartGuides'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

const baseGuide: ChartGuide = {
  purpose: '売上の前年比を確認する',
  howToRead: ['上向き → プラス要因', '下向き → マイナス要因'],
  keyPoints: ['注意すべき外れ値に着目'],
  relatedMetrics: ['salesTotal'],
}

describe('ChartHelpButton', () => {
  it('初期状態ではガイドパネルは閉じている', () => {
    renderWithTheme(<ChartHelpButton guide={baseGuide} />)
    expect(screen.queryByRole('note', { name: 'グラフの読み方' })).not.toBeInTheDocument()
  })

  it('クリックでガイドパネルが開く', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ChartHelpButton guide={baseGuide} />)
    const btn = screen.getByRole('button', { name: 'このグラフの読み方' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    await user.click(btn)
    expect(screen.getByRole('note', { name: 'グラフの読み方' })).toBeInTheDocument()
    expect(screen.getByText('売上の前年比を確認する')).toBeInTheDocument()
  })

  it('再クリックでガイドパネルが閉じる', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ChartHelpButton guide={baseGuide} />)
    const btn = screen.getByRole('button', { name: 'このグラフの読み方' })
    await user.click(btn)
    await user.click(btn)
    expect(screen.queryByRole('note', { name: 'グラフの読み方' })).not.toBeInTheDocument()
  })
})

describe('ChartGuidePanel', () => {
  it('purpose と howToRead を描画する', () => {
    renderWithTheme(<ChartGuidePanel guide={baseGuide} />)
    expect(screen.getByText('売上の前年比を確認する')).toBeInTheDocument()
    expect(screen.getByText('読み方:')).toBeInTheDocument()
    expect(screen.getByText('上向き → プラス要因')).toBeInTheDocument()
    expect(screen.getByText('下向き → マイナス要因')).toBeInTheDocument()
  })

  it('keyPoints がある場合のみ「注目ポイント」セクションを描画する', () => {
    renderWithTheme(<ChartGuidePanel guide={baseGuide} />)
    expect(screen.getByText('注目ポイント:')).toBeInTheDocument()
    expect(screen.getByText('注意すべき外れ値に着目')).toBeInTheDocument()
  })

  it('keyPoints が未指定の場合「注目ポイント」セクションは描画しない', () => {
    const guide: ChartGuide = {
      purpose: '粗利率の推移',
      howToRead: ['緑 = 実績法', 'オレンジ = 推定法'],
    }
    renderWithTheme(<ChartGuidePanel guide={guide} />)
    expect(screen.queryByText('注目ポイント:')).not.toBeInTheDocument()
    expect(screen.getByText('粗利率の推移')).toBeInTheDocument()
  })

  it('relatedMetrics + metricSummaries があれば関連指標セクションを描画', () => {
    const summaries = new Map([
      ['salesTotal', { title: '売上合計', summary: '全店全部門の合計' }],
    ])
    renderWithTheme(<ChartGuidePanel guide={baseGuide} metricSummaries={summaries} />)
    expect(screen.getByText('関連指標:')).toBeInTheDocument()
    expect(screen.getByText('売上合計')).toBeInTheDocument()
    expect(screen.getByText(/全店全部門の合計/)).toBeInTheDocument()
  })

  it('metricSummaries が空なら関連指標セクションを描画しない', () => {
    renderWithTheme(<ChartGuidePanel guide={baseGuide} />)
    expect(screen.queryByText('関連指標:')).not.toBeInTheDocument()
  })

  it('relatedMetrics がヒットしない MetricId はスキップされる', () => {
    const guide: ChartGuide = {
      purpose: 'テスト',
      howToRead: ['a'],
      relatedMetrics: ['unknownMetric'],
    }
    const summaries = new Map([['otherMetric', { title: '別指標' }]])
    renderWithTheme(<ChartGuidePanel guide={guide} metricSummaries={summaries} />)
    // summaries は空のキーでヒットしないので関連指標セクション自体は描画されるが、
    // 中のタグは出ない
    expect(screen.queryByText('別指標')).not.toBeInTheDocument()
  })
})
