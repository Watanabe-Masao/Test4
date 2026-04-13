/**
 * WeatherPage.tsx — top-level smoke + branch test
 *
 * 検証対象 branch:
 * - 基本 render (location 有 + 天気データ有)
 * - location なし → InlineLocationSetup branch
 * - データ未取得時の loading 表示
 *
 * 設計: useWeatherTriple / useWeatherForecast / useWeatherHourlyOnDemand /
 * useWeatherDaySelection / useDataStore / useSettingsStore / useComparisonScope
 * を vi.mock で stub。子 component (チャート/モーダル) も最小化。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'

// ── Mutable fixtures ──
let dataStoreFixture: { currentMonthData: { stores?: Map<string, { name: string }> } | null }
let settingsFixture: {
  storeLocations: Record<string, { resolvedName?: string } | undefined>
  alignmentPolicy: string
}
let weatherTripleFixture: {
  combined: { dateKey: string; temperatureAvg: number }[]
  prevYearCombined: { dateKey: string }[]
  boundaries: { fromKey: string; toKey: string }
  currentMonthDaily: { dateKey: string }[]
  isLoading: boolean
  reload: () => void
}

vi.mock('@/application/stores/dataStore', () => ({
  useDataStore: <T,>(selector: (s: typeof dataStoreFixture) => T) => selector(dataStoreFixture),
}))

vi.mock('@/application/stores/settingsStore', () => ({
  useSettingsStore: <T,>(
    selector: (s: { settings: typeof settingsFixture; updateSettings: () => void }) => T,
  ) => selector({ settings: settingsFixture, updateSettings: vi.fn() }),
}))

vi.mock('@/application/hooks/useWeatherTriple', () => ({
  useWeatherTriple: () => weatherTripleFixture,
}))

vi.mock('@/application/hooks/useWeatherForecast', () => ({
  useWeatherForecast: () => ({ forecasts: [] }),
}))

vi.mock('@/application/hooks/useWeatherHourlyOnDemand', () => ({
  useWeatherHourlyOnDemand: () => ({
    hourlyCache: {},
    prevHourlyCache: {},
    fetchHourly: vi.fn(),
    fetchPrevHourly: vi.fn(),
    resolvePrevDate: vi.fn(() => null),
  }),
}))

vi.mock('@/features/comparison', () => ({
  useComparisonScope: () => ({
    dateRange: {
      from: { year: 2026, month: 4, day: 1 },
      to: { year: 2026, month: 4, day: 30 },
    },
  }),
}))

vi.mock('../useWeatherDaySelection', () => ({
  useWeatherDaySelection: () => ({
    selectedDays: new Set<string>(),
    setSelectedDays: vi.fn(),
    selectedDows: new Set<number>(),
    handleDowChange: vi.fn(),
    filteredDaily: [],
    goPrev: vi.fn(),
    goNext: vi.fn(),
    handleMonthScroll: vi.fn(),
    handleChartDayClick: vi.fn(),
    handleDayRangeSelect: vi.fn(),
    selectedDayNumbers: new Set<number>(),
  }),
}))

// 子 component を最小スタブに
vi.mock('../WeatherTemperatureChart', () => ({
  WeatherTemperatureChart: () => <div data-testid="weather-temp-chart">Temperature</div>,
}))
vi.mock('../InlineLocationSetup', () => ({
  InlineLocationSetup: () => <div data-testid="inline-location-setup">LocationSetup</div>,
}))
vi.mock('../WeatherDetailSection', () => ({
  WeatherDetailSection: () => <div data-testid="weather-detail">Detail</div>,
}))
vi.mock('../WeatherSummarySection', () => ({
  WeatherSummarySection: () => <div data-testid="weather-summary">Summary</div>,
}))
vi.mock('@/presentation/components/charts/DowPresetSelector', () => ({
  DowPresetSelector: () => <div data-testid="dow-preset">DowPreset</div>,
}))
vi.mock('@/presentation/components/common/ForecastBadge', () => ({
  ForecastBadge: () => <div data-testid="forecast-badge">Forecast</div>,
}))
vi.mock('@/presentation/pages/Dashboard/widgets/HourlyWeatherModal', () => ({
  HourlyWeatherModal: () => null,
}))

// imports は mock 設定後
// eslint-disable-next-line import/first
import { WeatherPage } from '../WeatherPage'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

beforeEach(() => {
  dataStoreFixture = {
    currentMonthData: {
      stores: new Map([['s1', { name: 'Store 1' }]]),
    },
  }
  settingsFixture = {
    storeLocations: {
      s1: { resolvedName: '東京都新宿区' },
    },
    alignmentPolicy: 'sameDate',
  }
  weatherTripleFixture = {
    combined: [{ dateKey: '2026-04-15', temperatureAvg: 18 }],
    prevYearCombined: [{ dateKey: '2025-04-15' }],
    boundaries: { fromKey: '2026-04-01', toKey: '2026-04-30' },
    currentMonthDaily: [{ dateKey: '2026-04-15' }],
    isLoading: false,
    reload: vi.fn(),
  }
})

describe('WeatherPage - 基本 render', () => {
  it('location 有 + 天気データ有 → ヘッダー + チャートが表示される', () => {
    renderWithTheme(<WeatherPage />)
    expect(screen.getByText('天気データ')).toBeInTheDocument()
    expect(screen.getByTestId('weather-temp-chart')).toBeInTheDocument()
  })

  it('location 有 → station badge に resolvedName が表示される', () => {
    renderWithTheme(<WeatherPage />)
    expect(screen.getByText(/東京都新宿区/)).toBeInTheDocument()
  })

  it('location 有 → InlineLocationSetup は表示されない', () => {
    renderWithTheme(<WeatherPage />)
    expect(screen.queryByTestId('inline-location-setup')).not.toBeInTheDocument()
  })
})

describe('WeatherPage - location なし branch', () => {
  it('storeLocations 空 → InlineLocationSetup が表示される', () => {
    settingsFixture.storeLocations = {}
    renderWithTheme(<WeatherPage />)
    expect(screen.getByTestId('inline-location-setup')).toBeInTheDocument()
  })

  it('location なし → WeatherTemperatureChart は表示されない', () => {
    settingsFixture.storeLocations = {}
    renderWithTheme(<WeatherPage />)
    expect(screen.queryByTestId('weather-temp-chart')).not.toBeInTheDocument()
  })
})

describe('WeatherPage - データ無時の状態', () => {
  it('isLoading=true でも基本ヘッダーは描画', () => {
    weatherTripleFixture.isLoading = true
    weatherTripleFixture.combined = []
    weatherTripleFixture.currentMonthDaily = []
    renderWithTheme(<WeatherPage />)
    expect(screen.getByText('天気データ')).toBeInTheDocument()
  })

  it('天気データ空 → station badge は location 有なら表示される', () => {
    weatherTripleFixture.combined = []
    weatherTripleFixture.currentMonthDaily = []
    renderWithTheme(<WeatherPage />)
    expect(screen.getByText(/東京都新宿区/)).toBeInTheDocument()
  })
})

describe('WeatherPage - currentMonthData fallback', () => {
  it('currentMonthData=null + storeLocations → location key で store を構築', () => {
    dataStoreFixture.currentMonthData = null
    renderWithTheme(<WeatherPage />)
    // storeLocations から fallback で構築されるので render は成功
    expect(screen.getByText('天気データ')).toBeInTheDocument()
  })
})
