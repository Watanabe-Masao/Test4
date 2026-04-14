/**
 * DashboardPage.tsx — top-level branch test
 *
 * 検証対象 branch (4 つの early-return + 通常 render):
 * 1. isComputing && storeResults.size === 0 → PageSkeleton
 * 2. !isCalculated && storeResults.size === 0 → EmptyState (データ未読込)
 * 3. !ctx → 全店舗概要 (店舗数のみ表示)
 * 4. 通常 render → Toolbar + (kpiWidgets ? KPI : EmptyState)
 *
 * 設計: useDataStore / useStoreSelection / useUnifiedWidgetContext /
 * useDashboardLayout / useWidgetDragDrop / useNavigate を vi.mock で stub。
 * 子 component (DashboardChartGrid / Provider 群) は最小化。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { darkTheme } from '@/presentation/theme/theme'

// ── Mutable fixtures ──
let storeResultsFixture: Map<string, unknown>
let storesFixture: Map<string, { name: string }>
let widgetCtxFixture: {
  ctx: {
    prevYear?: { hasPrevYear: boolean }
    queryExecutor?: unknown
    result?: { hasDiscountData: boolean }
  } | null
  isComputing: boolean
  isCalculated: boolean
  storeName: string
  explainMetric: null
  setExplainMetric: ReturnType<typeof vi.fn>
  prevYearDetailType: null
  setPrevYearDetailType: ReturnType<typeof vi.fn>
}
type WidgetStub = { id: string; render?: () => ReactElement }
let dashboardLayoutFixture: {
  widgetIds: string[]
  setWidgetIds: ReturnType<typeof vi.fn>
  activeWidgets: WidgetStub[]
  kpiWidgets: WidgetStub[]
  chartWidgets: WidgetStub[]
  handleApplyLayout: ReturnType<typeof vi.fn>
  handleRemoveWidget: ReturnType<typeof vi.fn>
}

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/application/stores/dataStore', () => ({
  useDataStore: <T,>(
    selector: (s: {
      storeResults: Map<string, unknown>
      currentMonthData: { stores: Map<string, { name: string }> } | null
    }) => T,
  ) =>
    selector({
      storeResults: storeResultsFixture,
      currentMonthData: { stores: storesFixture },
    }),
}))

vi.mock('@/application/hooks/ui', () => ({
  useStoreSelection: () => ({ stores: storesFixture }),
}))

vi.mock('@/presentation/hooks/useUnifiedWidgetContext', () => ({
  useUnifiedWidgetContext: () => widgetCtxFixture,
}))

vi.mock('../useDashboardLayout', () => ({
  useDashboardLayout: () => dashboardLayoutFixture,
}))

vi.mock('../useWidgetDragDrop', () => ({
  useWidgetDragDrop: () => ({
    dragIndex: null,
    overIndex: null,
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDrop: vi.fn(),
    handleDragEnd: vi.fn(),
  }),
}))

// 子 component を最小スタブに
vi.mock('@/presentation/components/Layout', () => ({
  MainContent: ({ title, children }: { title: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}))
vi.mock('@/presentation/components/common/feedback', () => ({
  PageSkeleton: () => <div data-testid="page-skeleton">Loading...</div>,
}))
vi.mock('@/presentation/components/common/forms', () => ({
  Chip: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  ChipGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/presentation/components/common/tables', async () => {
  const actual = await vi.importActual<typeof import('@/presentation/components/common/tables')>(
    '@/presentation/components/common/tables',
  )
  return {
    ...actual,
    KpiCard: ({ label, value }: { label: string; value: string }) => (
      <div>
        {label}: {value}
      </div>
    ),
    KpiGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    MetricBreakdownPanel: () => null,
  }
})
vi.mock('@/presentation/components/charts', () => ({
  CategoryHierarchyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  CurrencyUnitToggle: () => <div data-testid="currency-toggle">Toggle</div>,
  CrossChartSelectionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock('../widgets/PrevYearBudgetDetailPanel', () => ({
  PrevYearBudgetDetailPanel: () => null,
}))
vi.mock('../WidgetSettingsPanel', () => ({
  WidgetSettingsPanel: () => null,
}))
vi.mock('../DrillThroughScrollHandler', () => ({
  DrillThroughScrollHandler: () => null,
}))
vi.mock('../DashboardChartGrid', () => ({
  DashboardChartGrid: () => <div data-testid="dashboard-chart-grid">ChartGrid</div>,
}))
vi.mock('@/application/navigation/viewMapping', () => ({
  VIEW_TO_PATH: {} as Record<string, string>,
}))

// imports は mock 設定後
// (intentional): vi.mock must be hoisted before import
import { DashboardPage } from '../DashboardPage'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

beforeEach(() => {
  storeResultsFixture = new Map([['s1', { sales: 1000 }]])
  storesFixture = new Map([['s1', { name: 'Store 1' }]])
  widgetCtxFixture = {
    ctx: {
      prevYear: { hasPrevYear: true },
      queryExecutor: { isReady: true },
      result: { hasDiscountData: true },
    },
    isComputing: false,
    isCalculated: true,
    storeName: '全店舗',
    explainMetric: null,
    setExplainMetric: vi.fn(),
    prevYearDetailType: null,
    setPrevYearDetailType: vi.fn(),
  }
  dashboardLayoutFixture = {
    widgetIds: [],
    setWidgetIds: vi.fn(),
    activeWidgets: [],
    kpiWidgets: [],
    chartWidgets: [],
    handleApplyLayout: vi.fn(),
    handleRemoveWidget: vi.fn(),
  }
})

// ─── Branch 1: isComputing + 空 storeResults → PageSkeleton ──────

describe('DashboardPage - PageSkeleton (computing)', () => {
  it('isComputing=true + storeResults 空 → PageSkeleton が表示される', () => {
    storeResultsFixture = new Map()
    widgetCtxFixture.isComputing = true
    renderWithTheme(<DashboardPage />)
    expect(screen.getByTestId('page-skeleton')).toBeInTheDocument()
  })
})

// ─── Branch 2: !isCalculated + 空 → EmptyState (データ未読込) ──────

describe('DashboardPage - データ未読込 EmptyState', () => {
  it('!isCalculated + storeResults 空 → 「データを読み込んでください」', () => {
    storeResultsFixture = new Map()
    widgetCtxFixture.isCalculated = false
    renderWithTheme(<DashboardPage />)
    expect(screen.getByText('データを読み込んでください')).toBeInTheDocument()
  })

  it('!isCalculated + 空 → PageSkeleton は表示されない', () => {
    storeResultsFixture = new Map()
    widgetCtxFixture.isCalculated = false
    renderWithTheme(<DashboardPage />)
    expect(screen.queryByTestId('page-skeleton')).not.toBeInTheDocument()
  })
})

// ─── Branch 3: ctx=null → 全店舗概要 (店舗数のみ) ──────

describe('DashboardPage - ctx=null branch', () => {
  it('ctx=null → 全店舗概要 セクションが表示される', () => {
    widgetCtxFixture.ctx = null
    renderWithTheme(<DashboardPage />)
    expect(screen.getByText('全店舗概要')).toBeInTheDocument()
  })

  it('ctx=null → 店舗数 KpiCard に stores.size が表示される', () => {
    widgetCtxFixture.ctx = null
    storesFixture = new Map([
      ['s1', { name: 'A' }],
      ['s2', { name: 'B' }],
      ['s3', { name: 'C' }],
    ])
    renderWithTheme(<DashboardPage />)
    expect(screen.getByText(/3店舗/)).toBeInTheDocument()
  })

  it('ctx=null → Toolbar (Chip) は表示されない', () => {
    widgetCtxFixture.ctx = null
    renderWithTheme(<DashboardPage />)
    expect(screen.queryByText('並べ替え')).not.toBeInTheDocument()
  })
})

// ─── Branch 4: 通常 render → Toolbar + activeWidgets 空 → EmptyState ──

describe('DashboardPage - 通常 render', () => {
  it('ctx 有 → Toolbar の「並べ替え」chip が表示される', () => {
    renderWithTheme(<DashboardPage />)
    expect(screen.getByText('並べ替え')).toBeInTheDocument()
    expect(screen.getByText('ウィジェット設定')).toBeInTheDocument()
  })

  it('activeWidgets 空 → 「ウィジェットが選択されていません」EmptyState', () => {
    renderWithTheme(<DashboardPage />)
    expect(screen.getByText('ウィジェットが選択されていません')).toBeInTheDocument()
  })

  it('activeWidgets 有 → ウィジェット選択 EmptyState は表示されない', () => {
    const stubWidget = {
      id: 'kpi-1',
      render: () => <div data-testid="widget-stub">Widget</div>,
    } as unknown as { id: string }
    dashboardLayoutFixture.activeWidgets = [stubWidget]
    dashboardLayoutFixture.kpiWidgets = [stubWidget]
    renderWithTheme(<DashboardPage />)
    expect(screen.queryByText('ウィジェットが選択されていません')).not.toBeInTheDocument()
    expect(screen.getByTestId('widget-stub')).toBeInTheDocument()
  })
})
