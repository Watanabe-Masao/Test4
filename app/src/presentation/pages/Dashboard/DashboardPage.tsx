import { useState, useCallback, useRef, type ReactNode } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid, Chip, ChipGroup, Button } from '@/presentation/components/common'
import { DailySalesChart, BudgetVsActualChart, GrossProfitRateChart, CategoryPieChart } from '@/presentation/components/charts'
import { useCalculation } from '@/application/hooks'
import { useStoreSelection } from '@/application/hooks'
import { useAppState } from '@/application/context'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import type { StoreResult } from '@/domain/models'
import styled from 'styled-components'

// ─── Widget Definition ────────────────────────────────────

type WidgetSize = 'kpi' | 'half' | 'full'

interface WidgetDef {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: WidgetContext) => ReactNode
}

interface WidgetContext {
  result: StoreResult
  daysInMonth: number
  targetRate: number
  warningRate: number
  budgetChartData: { day: number; actualCum: number; budgetCum: number }[]
}

const WIDGET_REGISTRY: readonly WidgetDef[] = [
  // ── KPI: 売上・利益 ──
  {
    id: 'kpi-total-sales',
    label: '総売上高',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="総売上高" value={formatCurrency(r.totalSales)} accent="#6366f1" />
    ),
  },
  {
    id: 'kpi-core-sales',
    label: 'コア売上',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="コア売上"
        value={formatCurrency(r.totalCoreSales)}
        subText={`花: ${formatCurrency(r.flowerSalesPrice)} / 産直: ${formatCurrency(r.directProduceSalesPrice)}`}
        accent="#8b5cf6"
      />
    ),
  },
  {
    id: 'kpi-inv-gross-profit',
    label: '【在庫法】粗利益',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="【在庫法】粗利益"
        value={r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
        subText={r.invMethodGrossProfitRate != null ? `粗利率: ${formatPercent(r.invMethodGrossProfitRate)}` : '在庫設定なし'}
        accent="#22c55e"
      />
    ),
  },
  {
    id: 'kpi-est-margin',
    label: '【推定法】マージン',
    group: '売上・利益',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="【推定法】マージン"
        value={formatCurrency(r.estMethodMargin)}
        subText={`マージン率: ${formatPercent(r.estMethodMarginRate)}`}
        accent="#0ea5e9"
      />
    ),
  },
  // ── KPI: 仕入・原価 ──
  {
    id: 'kpi-total-cost',
    label: '総仕入原価',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="総仕入原価" value={formatCurrency(r.totalCost)} accent="#f59e0b" />
    ),
  },
  {
    id: 'kpi-inventory-cost',
    label: '在庫仕入原価',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="在庫仕入原価" value={formatCurrency(r.inventoryCost)} accent="#ea580c" />
    ),
  },
  {
    id: 'kpi-delivery-sales',
    label: '売上納品原価',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="売上納品原価"
        value={formatCurrency(r.deliverySalesCost)}
        subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`}
        accent="#ec4899"
      />
    ),
  },
  {
    id: 'kpi-consumable',
    label: '消耗品費',
    group: '仕入・原価',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="消耗品費"
        value={formatCurrency(r.totalConsumable)}
        subText={`消耗品率: ${formatPercent(r.consumableRate)}`}
        accent="#f97316"
      />
    ),
  },
  // ── KPI: 売変・値入 ──
  {
    id: 'kpi-discount',
    label: '売変額合計',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="売変額合計"
        value={formatCurrency(r.totalDiscount)}
        subText={`売変率: ${formatPercent(r.discountRate)}`}
        accent="#f43f5e"
      />
    ),
  },
  {
    id: 'kpi-discount-loss',
    label: '売変ロス原価',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="売変ロス原価" value={formatCurrency(r.discountLossCost)} accent="#dc2626" />
    ),
  },
  {
    id: 'kpi-avg-markup',
    label: '平均値入率',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="平均値入率" value={formatPercent(r.averageMarkupRate)} accent="#3b82f6" />
    ),
  },
  {
    id: 'kpi-core-markup',
    label: 'コア値入率',
    group: '売変・値入',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="コア値入率" value={formatPercent(r.coreMarkupRate)} accent="#06b6d4" />
    ),
  },
  // ── KPI: 予算・予測 ──
  {
    id: 'kpi-budget',
    label: '月間予算',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="月間予算" value={formatCurrency(r.budget)} accent="#6366f1" />
    ),
  },
  {
    id: 'kpi-avg-daily-sales',
    label: '日平均売上',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard
        label="日平均売上"
        value={formatCurrency(r.averageDailySales)}
        subText={`営業日: ${r.salesDays}日 / 経過: ${r.elapsedDays}日`}
        accent="#8b5cf6"
      />
    ),
  },
  {
    id: 'kpi-projected-sales',
    label: '月末予測売上',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="月末予測売上" value={formatCurrency(r.projectedSales)} accent="#22c55e" />
    ),
  },
  {
    id: 'kpi-projected-achievement',
    label: '予算達成率予測',
    group: '予算・予測',
    size: 'kpi',
    render: ({ result: r }) => (
      <KpiCard label="予算達成率予測" value={formatPercent(r.projectedAchievement)} accent="#0ea5e9" />
    ),
  },
  // ── KPI: 予算分析 ──
  {
    id: 'kpi-budget-progress',
    label: '予算達成率',
    group: '予算分析',
    size: 'kpi',
    render: ({ result: r, daysInMonth }) => {
      const salesDaily = new Map<number, number>()
      for (const [d, rec] of r.daily) salesDaily.set(d, rec.sales)
      const analysis = calculateBudgetAnalysis({
        totalSales: r.totalSales, budget: r.budget, budgetDaily: r.budgetDaily,
        salesDaily, elapsedDays: r.elapsedDays, salesDays: r.salesDays, daysInMonth,
      })
      return (
        <KpiCard
          label="予算達成率"
          value={formatPercent(analysis.budgetProgressRate)}
          subText={`残余予算: ${formatCurrency(analysis.remainingBudget)}`}
          accent="#6366f1"
        />
      )
    },
  },
  {
    id: 'kpi-gross-profit-budget',
    label: '粗利額予算',
    group: '予算分析',
    size: 'kpi',
    render: ({ result: r }) => {
      const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
      return (
        <KpiCard
          label="粗利額予算"
          value={formatCurrency(r.grossProfitBudget)}
          subText={`実績: ${formatCurrency(actualGP)}`}
          accent="#8b5cf6"
        />
      )
    },
  },
  {
    id: 'kpi-gross-profit-rate',
    label: '粗利率（実績vs予算）',
    group: '予算分析',
    size: 'kpi',
    render: ({ result: r }) => {
      const actualRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
      return (
        <KpiCard
          label="粗利率"
          value={formatPercent(actualRate)}
          subText={`予算: ${formatPercent(r.grossProfitRateBudget)}`}
          accent="#ec4899"
        />
      )
    },
  },
  // ── チャート ──
  {
    id: 'chart-daily-sales',
    label: '日別売上チャート',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth }) => (
      <DailySalesChart daily={r.daily} daysInMonth={daysInMonth} />
    ),
  },
  {
    id: 'chart-budget-vs-actual',
    label: '予算vs実績チャート',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, budgetChartData }) => (
      <BudgetVsActualChart data={budgetChartData} budget={r.budget} />
    ),
  },
  {
    id: 'chart-gross-profit-rate',
    label: '粗利率推移チャート',
    group: 'チャート',
    size: 'full',
    render: ({ result: r, daysInMonth, targetRate, warningRate }) => (
      <GrossProfitRateChart
        daily={r.daily}
        daysInMonth={daysInMonth}
        targetRate={targetRate}
        warningRate={warningRate}
      />
    ),
  },
  {
    id: 'chart-category-cost-pie',
    label: 'カテゴリ別原価構成',
    group: 'チャート',
    size: 'half',
    render: ({ result: r }) => (
      <CategoryPieChart categoryTotals={r.categoryTotals} mode="cost" />
    ),
  },
  {
    id: 'chart-category-price-pie',
    label: 'カテゴリ別売価構成',
    group: 'チャート',
    size: 'half',
    render: ({ result: r }) => (
      <CategoryPieChart categoryTotals={r.categoryTotals} mode="price" />
    ),
  },
]

const WIDGET_MAP = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]))

const DEFAULT_WIDGET_IDS: string[] = [
  'kpi-total-sales', 'kpi-core-sales', 'kpi-inv-gross-profit', 'kpi-est-margin',
  'kpi-total-cost', 'kpi-inventory-cost', 'kpi-delivery-sales', 'kpi-consumable',
  'kpi-discount', 'kpi-discount-loss', 'kpi-avg-markup', 'kpi-core-markup',
  'kpi-budget', 'kpi-avg-daily-sales', 'kpi-projected-sales', 'kpi-projected-achievement',
]

const STORAGE_KEY = 'dashboard_layout_v1'

function loadLayout(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_WIDGET_IDS
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return DEFAULT_WIDGET_IDS
    const valid = parsed.filter((id) => WIDGET_MAP.has(id))
    return valid.length > 0 ? valid : DEFAULT_WIDGET_IDS
  } catch {
    return DEFAULT_WIDGET_IDS
  }
}

function saveLayout(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

// ─── Styled Components ──────────────────────────────────

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[10]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

const EmptyIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const WidgetGridStyled = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[6]};
`

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

const FullChartRow = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`

const DragItem = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  position: relative;
  opacity: ${({ $isDragging }) => $isDragging ? 0.4 : 1};
  ${({ $isOver, theme }) => $isOver ? `
    &::before {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px dashed ${theme.colors.palette.primary};
      border-radius: ${theme.radii.lg};
      pointer-events: none;
      z-index: 1;
    }
  ` : ''}
  cursor: grab;
  &:active { cursor: grabbing; }
`

const DragHandle = styled.div`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
  ${DragItem}:hover & { opacity: 1; }
`

// ─── Settings Panel ──────────────────────────────────────

const PanelOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
`

const Panel = styled.div`
  width: 340px;
  max-width: 90vw;
  height: 100%;
  background: ${({ theme }) => theme.colors.bg2};
  border-left: 1px solid ${({ theme }) => theme.colors.border};
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
`

const PanelTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const PanelGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const PanelGroupTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const WidgetItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  color: ${({ theme }) => theme.colors.text};
  transition: background 0.15s;
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.palette.primary};
  cursor: pointer;
`

const SizeBadge = styled.span<{ $size: WidgetSize }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $size, theme }) =>
    $size === 'kpi' ? `${theme.colors.palette.primary}20`
    : $size === 'half' ? `${theme.colors.palette.success}20`
    : `${theme.colors.palette.warning}20`};
  color: ${({ $size, theme }) =>
    $size === 'kpi' ? theme.colors.palette.primary
    : $size === 'half' ? theme.colors.palette.success
    : theme.colors.palette.warning};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

const PanelFooter = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

// ─── Widget Settings Panel Component ─────────────────────

function WidgetSettingsPanel({
  activeIds,
  onApply,
  onClose,
}: {
  activeIds: string[]
  onApply: (ids: string[]) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState(() => new Set(activeIds))

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleApply = () => {
    // Preserve ordering: keep existing order, then append new ones
    const ordered = activeIds.filter((id) => selected.has(id))
    const newOnes = Array.from(selected).filter((id) => !activeIds.includes(id))
    onApply([...ordered, ...newOnes])
    onClose()
  }

  const handleReset = () => {
    onApply(DEFAULT_WIDGET_IDS)
    onClose()
  }

  const handleSelectAll = () => {
    setSelected(new Set(WIDGET_REGISTRY.map((w) => w.id)))
  }

  const handleDeselectAll = () => {
    setSelected(new Set())
  }

  // Group widgets
  const groups = new Map<string, WidgetDef[]>()
  WIDGET_REGISTRY.forEach((w) => {
    const list = groups.get(w.group) ?? []
    list.push(w)
    groups.set(w.group, list)
  })

  return (
    <PanelOverlay onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <Panel onClick={(e) => e.stopPropagation()}>
        <PanelTitle>ダッシュボードのカスタマイズ</PanelTitle>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Button $variant="outline" onClick={handleSelectAll}>全選択</Button>
          <Button $variant="outline" onClick={handleDeselectAll}>全解除</Button>
        </div>

        {Array.from(groups.entries()).map(([group, widgets]) => (
          <PanelGroup key={group}>
            <PanelGroupTitle>{group}</PanelGroupTitle>
            {widgets.map((w) => (
              <WidgetItem key={w.id}>
                <Checkbox
                  type="checkbox"
                  checked={selected.has(w.id)}
                  onChange={() => toggle(w.id)}
                />
                {w.label}
                <SizeBadge $size={w.size}>
                  {w.size === 'kpi' ? 'KPI' : w.size === 'half' ? '半幅' : '全幅'}
                </SizeBadge>
              </WidgetItem>
            ))}
          </PanelGroup>
        ))}

        <PanelFooter>
          <Button $variant="primary" onClick={handleApply}>適用</Button>
          <Button $variant="outline" onClick={handleReset}>デフォルトに戻す</Button>
          <Button $variant="outline" onClick={onClose}>キャンセル</Button>
        </PanelFooter>
      </Panel>
    </PanelOverlay>
  )
}

// ─── Main Dashboard ──────────────────────────────────────

export function DashboardPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName, stores } = useStoreSelection()
  const appState = useAppState()

  const [widgetIds, setWidgetIds] = useState<string[]>(loadLayout)
  const [showSettings, setShowSettings] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // D&D state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const handleApplyLayout = useCallback((ids: string[]) => {
    setWidgetIds(ids)
    saveLayout(ids)
  }, [])

  // D&D handlers
  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setOverIndex(index)
  }, [])

  const handleDrop = useCallback((targetIndex: number) => {
    const sourceIndex = dragItemRef.current
    if (sourceIndex == null || sourceIndex === targetIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    setWidgetIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      saveLayout(next)
      return next
    })
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setOverIndex(null)
  }, [])

  // ─── Empty / Loading states ──

  if (!isCalculated) {
    return (
      <MainContent title="ダッシュボード">
        <EmptyState>
          <EmptyIcon>📊</EmptyIcon>
          <EmptyTitle>データを読み込んでください</EmptyTitle>
          <p>左のサイドバーからファイルをドラッグ＆ドロップすると自動で計算されます。</p>
        </EmptyState>
      </MainContent>
    )
  }

  if (!currentResult) {
    return (
      <MainContent title="ダッシュボード" storeName={storeName}>
        <Section>
          <SectionTitle>全店舗概要</SectionTitle>
          <KpiGrid>
            <KpiCard label="店舗数" value={`${stores.size}店舗`} accent="#6366f1" />
          </KpiGrid>
        </Section>
      </MainContent>
    )
  }

  const r = currentResult

  // Build chart data
  const salesDaily = new Map<number, number>()
  for (const [d, rec] of r.daily) salesDaily.set(d, rec.sales)
  let cumActual = 0
  let cumBudget = 0
  const budgetChartData: { day: number; actualCum: number; budgetCum: number }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    cumActual += salesDaily.get(d) ?? 0
    cumBudget += r.budgetDaily.get(d) ?? 0
    budgetChartData.push({ day: d, actualCum: cumActual, budgetCum: cumBudget })
  }

  const ctx: WidgetContext = {
    result: r,
    daysInMonth,
    targetRate: appState.settings.targetGrossProfitRate,
    warningRate: appState.settings.warningThreshold,
    budgetChartData,
  }

  // Resolve active widgets
  const activeWidgets = widgetIds
    .map((id) => WIDGET_MAP.get(id))
    .filter((w): w is WidgetDef => w != null)

  // Split by type
  const kpiWidgets = activeWidgets.filter((w) => w.size === 'kpi')
  const chartWidgets = activeWidgets.filter((w) => w.size !== 'kpi')

  // Flat index tracker for D&D
  let flatIdx = 0

  const renderDraggable = (widget: WidgetDef, index: number, content: ReactNode) => {
    if (!editMode) return <div key={widget.id}>{content}</div>
    return (
      <DragItem
        key={widget.id}
        draggable
        $isDragging={dragIndex === index}
        $isOver={overIndex === index}
        onDragStart={() => handleDragStart(index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={() => handleDrop(index)}
        onDragEnd={handleDragEnd}
      >
        <DragHandle>⠿</DragHandle>
        {content}
      </DragItem>
    )
  }

  return (
    <MainContent title="ダッシュボード" storeName={storeName}>
      <Toolbar>
        <ChipGroup>
          <Chip $active={editMode} onClick={() => setEditMode(!editMode)}>
            {editMode ? '編集完了' : '並べ替え'}
          </Chip>
          <Chip $active={false} onClick={() => setShowSettings(true)}>
            ウィジェット設定
          </Chip>
        </ChipGroup>
      </Toolbar>

      {activeWidgets.length === 0 && (
        <EmptyState>
          <EmptyTitle>ウィジェットが選択されていません</EmptyTitle>
          <p>「ウィジェット設定」からウィジェットを追加してください。</p>
        </EmptyState>
      )}

      {/* KPI Widgets */}
      {kpiWidgets.length > 0 && (
        <WidgetGridStyled>
          {kpiWidgets.map((w) => {
            const idx = flatIdx++
            return renderDraggable(w, idx, w.render(ctx))
          })}
        </WidgetGridStyled>
      )}

      {/* Chart Widgets */}
      {chartWidgets.length > 0 && (() => {
        const elements: ReactNode[] = []
        let halfBuffer: WidgetDef[] = []

        const flushHalves = () => {
          if (halfBuffer.length === 0) return
          if (halfBuffer.length === 2) {
            const idx1 = flatIdx++
            const idx2 = flatIdx++
            elements.push(
              <ChartRow key={`half-${halfBuffer[0].id}`}>
                {renderDraggable(halfBuffer[0], idx1, halfBuffer[0].render(ctx))}
                {renderDraggable(halfBuffer[1], idx2, halfBuffer[1].render(ctx))}
              </ChartRow>,
            )
          } else {
            const idx1 = flatIdx++
            elements.push(
              <ChartRow key={`half-${halfBuffer[0].id}`}>
                {renderDraggable(halfBuffer[0], idx1, halfBuffer[0].render(ctx))}
              </ChartRow>,
            )
          }
          halfBuffer = []
        }

        chartWidgets.forEach((w) => {
          if (w.size === 'full') {
            flushHalves()
            const idx = flatIdx++
            elements.push(
              <FullChartRow key={w.id}>
                {renderDraggable(w, idx, w.render(ctx))}
              </FullChartRow>,
            )
          } else {
            halfBuffer.push(w)
            if (halfBuffer.length === 2) flushHalves()
          }
        })
        flushHalves()

        return <>{elements}</>
      })()}

      {/* Settings Panel */}
      {showSettings && (
        <WidgetSettingsPanel
          activeIds={widgetIds}
          onApply={handleApplyLayout}
          onClose={() => setShowSettings(false)}
        />
      )}
    </MainContent>
  )
}
