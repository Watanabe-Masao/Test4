/**
 * WeatherBadge.tsx — 天気バッジ表示の contract test
 *
 * 検証対象 branch:
 * - WMO コード → icon / label mapping (categorizeWeatherCode 経由)
 * - temperature / temperatureMax / temperatureMin の有無
 * - compact=false (default): label + temperature(.toFixed(1)) + 高低温
 * - compact=true: icon + temperature(.round) + 高低温 (フォント小さい)
 * - weatherText override が tooltip に反映 (compact 時)
 *
 * Phase 3 Step 3-10: 自己完結 component (domain util 依存のみ) を選択。
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { WeatherBadge } from '../WeatherBadge'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

// WMO codes (公式): 0=晴れ / 1-3=晴れから曇り / 61-65=雨 / 71-77=雪
// 実際のマッピングは categorizeWeatherCode に依存

describe('WeatherBadge — 非 compact (default) 表示', () => {
  it('label "晴れ" が表示される (WMO code=0)', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} />)
    // icon + space + label が同一 text node になるため substring 一致で検証
    expect(screen.getByText(/晴れ/)).toBeInTheDocument()
  })

  it('label "雨" が表示される (WMO code=61)', () => {
    renderWithTheme(<WeatherBadge weatherCode={61} />)
    expect(screen.getByText(/雨/)).toBeInTheDocument()
  })

  it('label "雪" が表示される (WMO code=71)', () => {
    renderWithTheme(<WeatherBadge weatherCode={71} />)
    expect(screen.getByText(/雪/)).toBeInTheDocument()
  })

  it('unknown WMO code は "—" として表示される', () => {
    renderWithTheme(<WeatherBadge weatherCode={999} />)
    expect(screen.getByText(/—/)).toBeInTheDocument()
  })

  it('temperature を渡すと small decimal (°C) で表示される', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} temperature={23.456} />)
    // toFixed(1) で "23.5°C" になるはず
    expect(screen.getByText(/23\.5°C/)).toBeInTheDocument()
  })

  it('temperature 未指定時は °C 表示なし', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} />)
    expect(screen.queryByText(/°C/)).not.toBeInTheDocument()
  })

  it('temperatureMax + temperatureMin の両方を渡すと高低気温が表示される', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} temperatureMax={28.7} temperatureMin={15.2} />)
    expect(screen.getByText(/28\.7°/)).toBeInTheDocument()
    expect(screen.getByText(/15\.2°/)).toBeInTheDocument()
  })

  it('temperatureMax のみ渡しても高低気温 row は表示されない (両方必須)', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} temperatureMax={30} />)
    // 28.7°/ 15.2° のような表記がない
    expect(screen.queryByText(/30\.0°/)).not.toBeInTheDocument()
  })

  it('temperatureMin のみ渡しても高低気温 row は表示されない (両方必須)', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} temperatureMin={10} />)
    expect(screen.queryByText(/10\.0°/)).not.toBeInTheDocument()
  })
})

describe('WeatherBadge — compact=true 表示', () => {
  it('compact 表示ではラベル文字列なし、temperature は Math.round で整数', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} temperature={23.456} compact />)
    // "晴れ" ラベルは非表示 (compact では icon のみ)
    expect(screen.queryByText('晴れ')).not.toBeInTheDocument()
    // temperature は round(23.456) = 23°
    expect(screen.getByText(/23°/)).toBeInTheDocument()
  })

  it('compact + 高低気温 → Math.round で整数表示', () => {
    renderWithTheme(
      <WeatherBadge weatherCode={0} temperatureMax={28.7} temperatureMin={15.2} compact />,
    )
    expect(screen.getByText(/29°/)).toBeInTheDocument() // round(28.7) = 29
    expect(screen.getByText(/15°/)).toBeInTheDocument() // round(15.2) = 15
  })

  it('compact 時に weatherText override を渡すと tooltip に表示される', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} compact weatherText="曇り時々雨" />)
    // title 属性で tooltip を確認
    const badge = document.querySelector('[title="曇り時々雨"]')
    expect(badge).not.toBeNull()
  })

  it('compact 時に weatherText 未指定なら WEATHER_LABELS の値を tooltip に使う', () => {
    renderWithTheme(<WeatherBadge weatherCode={0} compact />)
    // 晴れ (WEATHER_LABELS.sunny) が title になる
    const badge = document.querySelector('[title="晴れ"]')
    expect(badge).not.toBeNull()
  })
})
