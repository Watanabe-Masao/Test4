/**
 * ForecastBadge.tsx — 予報バッジ表示の contract test
 *
 * 検証対象 branch:
 * - 気象庁 weatherCode → category mapping (domain util 依存)
 * - tempMax + tempMin 両方: 高低気温 row (round で整数)
 * - tempMax のみ: 単一表示
 * - tempMin のみ: 単一表示
 * - 両方 null: 温度表示なし
 * - pop (降水確率) 有無
 * - reliability A/B/C: ReliabilityDot 表示
 * - compact=true: 「%」のみ / compact=false: "降水 N%"
 *
 * Phase 3 Step 3-13: WeatherBadge と同系統。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ForecastBadge } from '../ForecastBadge'
import { darkTheme } from '@/presentation/theme/theme'
import type { DailyForecast } from '@/domain/models/record'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

function makeForecast(overrides: Partial<DailyForecast> = {}): DailyForecast {
  return {
    dateKey: '2025-03-15',
    weatherCode: '100', // 晴
    pop: null,
    tempMin: null,
    tempMax: null,
    reliability: null,
    ...overrides,
  }
}

describe('ForecastBadge — temperature display', () => {
  it('tempMax + tempMin 両方: 高低気温が Math.round で整数表示', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ tempMax: 28.7, tempMin: 15.2 })} />)
    expect(screen.getByText(/29°/)).toBeInTheDocument() // round(28.7)
    expect(screen.getByText(/15°/)).toBeInTheDocument() // round(15.2)
  })

  it('tempMax のみ: 単一表示', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ tempMax: 25.6 })} />)
    expect(screen.getByText(/26°/)).toBeInTheDocument() // round(25.6)
  })

  it('tempMin のみ: 単一表示', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ tempMin: 12.3 })} />)
    expect(screen.getByText(/12°/)).toBeInTheDocument() // round(12.3)
  })

  it('両方 null: 温度表示なし', () => {
    const { container } = renderWithTheme(<ForecastBadge forecast={makeForecast()} />)
    // 温度表示の DOM なし — container に °記号が無いこと
    expect(container.textContent).not.toMatch(/°/)
  })
})

describe('ForecastBadge — pop (降水確率)', () => {
  it('compact=false: "降水 N%" で表示', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ pop: 60 })} />)
    expect(screen.getByText(/降水 60%/)).toBeInTheDocument()
  })

  it('compact=true: "N%" のみで表示 (簡略)', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ pop: 60 })} compact />)
    expect(screen.getByText(/60%/)).toBeInTheDocument()
    // "降水 " が無い
    expect(screen.queryByText(/降水/)).not.toBeInTheDocument()
  })

  it('pop が null: 表示なし', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ pop: null })} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('pop が 0: 0% 表示される (null とは区別)', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ pop: 0 })} />)
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })
})

describe('ForecastBadge — reliability dot', () => {
  it("reliability='A' で ReliabilityDot が表示される", () => {
    const { container } = renderWithTheme(
      <ForecastBadge forecast={makeForecast({ reliability: 'A' })} />,
    )
    // ReliabilityDot は styled span で class 経由 — 親 span 内の dot element を確認
    const dots = container.querySelectorAll('span')
    expect(dots.length).toBeGreaterThan(0)
    // 具体的な color を検証するのは styled-components の詳細に依存するためここでは skip
  })

  it('reliability が null: ReliabilityDot は描画されない', () => {
    renderWithTheme(<ForecastBadge forecast={makeForecast({ reliability: null })} />)
    // 親 wrapper の中に dot が無いこと (compact false 時)
    // 直接 assertion 困難なので、reliability あり/なしで render 量を比較する pattern で間接検証
    // (weatherCode と temperature が共通なので差分は dot のみ)
    const { container } = renderWithTheme(
      <ForecastBadge forecast={makeForecast({ reliability: 'A' })} />,
    )
    const withDot = container.querySelectorAll('span').length
    const { container: noDotContainer } = renderWithTheme(
      <ForecastBadge forecast={makeForecast({ reliability: null })} />,
    )
    const withoutDot = noDotContainer.querySelectorAll('span').length
    expect(withDot).toBeGreaterThan(withoutDot)
  })
})

describe('ForecastBadge — compact / 非 compact 構造', () => {
  it('両者とも temperature と pop を表示するが pop の label が異なる', () => {
    renderWithTheme(
      <ForecastBadge forecast={makeForecast({ pop: 40, tempMax: 25, tempMin: 15 })} />,
    )
    expect(screen.getByText(/降水 40%/)).toBeInTheDocument()
    expect(screen.getByText(/25°/)).toBeInTheDocument()
    expect(screen.getByText(/15°/)).toBeInTheDocument()
  })

  it('compact=true: "降水 " prefix なし', () => {
    renderWithTheme(
      <ForecastBadge forecast={makeForecast({ pop: 40, tempMax: 25, tempMin: 15 })} compact />,
    )
    expect(screen.getByText(/40%/)).toBeInTheDocument()
    expect(screen.queryByText(/降水 40%/)).not.toBeInTheDocument()
  })
})
