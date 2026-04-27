/**
 * SimulationSummaryCard — 折りたたみ挙動テスト
 *
 * 主KPI・従属KPIが表示され、詳細は初期非表示、展開操作で表示される。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { lightTheme } from '@/presentation/theme/theme'
import { SimulationSummaryCard } from '../SimulationSummaryCard'

function renderCard(props: Parameters<typeof SimulationSummaryCard>[0]) {
  return render(
    <ThemeProvider theme={lightTheme}>
      <SimulationSummaryCard {...props} />
    </ThemeProvider>,
  )
}

describe('SimulationSummaryCard', () => {
  const baseProps = {
    title: '売上着地',
    primary: { label: '最終売上着地', value: '3,750万円', tone: 'primary' as const },
    secondaries: [
      { label: '予算達成率', value: '102.5%', tone: 'positive' as const },
      { label: '前年比', value: '98.3%', tone: 'negative' as const },
    ],
    details: [
      { label: '現在売上実績', value: '2,500万円' },
      { label: '残期間売上', value: '1,250万円' },
    ],
  }

  it('primary と secondaries が表示される', () => {
    renderCard(baseProps)
    expect(screen.getByText('3,750万円')).toBeDefined()
    expect(screen.getByText('予算達成率')).toBeDefined()
    expect(screen.getByText('102.5%')).toBeDefined()
    expect(screen.getByText('前年比')).toBeDefined()
  })

  it('details は初期非表示', () => {
    renderCard(baseProps)
    expect(screen.queryByText('現在売上実績')).toBeNull()
    expect(screen.queryByText('2,500万円')).toBeNull()
  })

  it('「詳細を表示」クリックで details が展開される', () => {
    renderCard(baseProps)
    fireEvent.click(screen.getByText('詳細を表示 ▼'))
    expect(screen.getByText('現在売上実績')).toBeDefined()
    expect(screen.getByText('2,500万円')).toBeDefined()
    expect(screen.getByText('残期間売上')).toBeDefined()
  })

  it('details がない場合は折りたたみボタンが表示されない', () => {
    renderCard({ ...baseProps, details: [] })
    expect(screen.queryByText('詳細を表示 ▼')).toBeNull()
  })
})
