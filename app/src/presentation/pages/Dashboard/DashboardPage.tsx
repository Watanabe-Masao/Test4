import { useState, useCallback, useRef, type ReactNode } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid, Chip, ChipGroup, Button } from '@/presentation/components/common'
import { DailySalesChart, BudgetVsActualChart, GrossProfitRateChart, CategoryPieChart } from '@/presentation/components/charts'
import { useCalculation } from '@/application/hooks'
import { useStoreSelection } from '@/application/hooks'
import { useAppState } from '@/application/context'
import { formatCurrency, formatPercent, formatPointDiff, safeDivide } from '@/domain/calculations/utils'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import { calculateWeeklySummaries, calculateDayOfWeekAverages } from '@/domain/calculations/forecast'
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
  year: number
  month: number
  budgetChartData: { day: number; actualCum: number; budgetCum: number }[]
}

// ─── Executive Dashboard Styled Components ──────────────

const ExecSummaryBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

const ExecSummaryItem = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 2px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
`

const ExecSummaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const ExecSummaryValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const ExecGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

const ExecColumn = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`

const ExecColHeader = styled.div<{ $color: string }>`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ $color }) => $color};
`

const ExecColTag = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.colors.text3};
`

const ExecColTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const ExecColSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

const ExecBody = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const ExecRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[4]};
`

const ExecLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  flex-shrink: 0;
`

const ExecVal = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
`

const ExecSub = styled.div<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
  text-align: right;
`

const ExecDividerLine = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: 0;
`

const InventoryBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

// ─── Calendar Styled Components ─────────────────────────

const CalWrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  overflow-x: auto;
`

const CalSectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const CalTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  table-layout: fixed;
`

const CalTh = styled.th<{ $weekend?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]};
  text-align: center;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $weekend, theme }) => $weekend ? theme.colors.palette.danger : theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  width: calc(100% / 7);
`

const CalTd = styled.td<{ $empty?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  vertical-align: top;
  height: 80px;
  ${({ $empty, theme }) => $empty ? `background: ${theme.colors.bg2};` : ''}
`

const CalDayNum = styled.div<{ $weekend?: boolean }>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ $weekend, theme }) => $weekend ? theme.colors.palette.danger : theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const CalLine = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.5rem;
  color: ${({ $color, theme }) => $color ?? theme.colors.text2};
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

// ─── Pin & Interval Styled Components ───────────────────

const CalDayCell = styled.div<{ $pinned?: boolean; $inInterval?: boolean }>`
  cursor: pointer;
  position: relative;
  height: 100%;
  ${({ $pinned }) => $pinned ? `
    &::after {
      content: '';
      position: absolute;
      top: 2px;
      right: 2px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6366f1;
    }
  ` : ''}
  ${({ $inInterval, theme }) => $inInterval ? `
    background: ${theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)'};
  ` : ''}
  &:hover { opacity: 0.8; }
`

const PinIndicator = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.45rem;
  color: ${({ theme }) => theme.colors.palette.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-top: ${({ theme }) => theme.spacing[1]};
  border-top: 1px dashed ${({ theme }) => theme.colors.palette.primary};
  padding-top: 1px;
`

const IntervalSummary = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const IntervalCard = styled.div<{ $color?: string }>`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $color }) => $color ?? '#6366f1'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

const IntervalMetricLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const IntervalMetricValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const PinModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
`

const PinModalContent = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[8]};
  min-width: 320px;
  max-width: 90vw;
`

const PinModalTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const PinInputField = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.palette.primary}; }
`

const PinButtonRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[6]};
`

const PinInputLabel = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

// ─── Forecast Tools Styled Components ───────────────────

const ForecastToolsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`

const ToolCard = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 3px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const ToolCardTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const ToolInputGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const ToolInputField = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  &:focus { border-color: ${({ theme }) => theme.colors.palette.primary}; }
`

const ToolResultSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const ToolResultValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const ToolResultLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

// ─── Summary Table Styled Components ────────────────────

const STableWrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const STableTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const STable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

const STh = styled.th`
  padding: ${({ theme }) => theme.spacing[3]};
  text-align: right;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  &:first-child { text-align: left; }
`

const STd = styled.td`
  padding: ${({ theme }) => theme.spacing[3]};
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  &:first-child {
    text-align: left;
    font-family: inherit;
    color: ${({ theme }) => theme.colors.text};
  }
`

// ─── Executive Helper Components ────────────────────────

function ExecMetric({ label, value, sub, subColor }: {
  label: string
  value: string
  sub?: string
  subColor?: string
}) {
  return (
    <div>
      <ExecRow>
        <ExecLabel>{label}</ExecLabel>
        <ExecVal>{value}</ExecVal>
      </ExecRow>
      {sub && <ExecSub $color={subColor}>{sub}</ExecSub>}
    </div>
  )
}

function renderPlanActualForecast(ctx: WidgetContext): ReactNode {
  const r = ctx.result
  const { daysInMonth } = ctx

  // 期中予算
  let elapsedBudget = 0
  for (let d = 1; d <= r.elapsedDays; d++) {
    elapsedBudget += r.budgetDaily.get(d) ?? 0
  }

  // 粗利実績
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  // 期中粗利予算（按分）
  const elapsedGPBudget = r.grossProfitBudget > 0
    ? r.grossProfitBudget * safeDivide(r.elapsedDays, daysInMonth)
    : 0

  // 粗利着地予測
  const remainingDays = daysInMonth - r.elapsedDays
  const dailyAvgGP = r.salesDays > 0 ? actualGP / r.salesDays : 0
  const projectedGP = actualGP + dailyAvgGP * remainingDays

  // 達成率
  const salesAchievement = safeDivide(r.totalSales, elapsedBudget)
  const progressRatio = safeDivide(
    safeDivide(r.totalSales, r.budget),
    safeDivide(r.elapsedDays, daysInMonth),
  )
  const projectedGPAchievement = safeDivide(projectedGP, r.grossProfitBudget)

  return (
    <ExecGrid>
      {/* PLAN */}
      <ExecColumn>
        <ExecColHeader $color="#6366f1">
          <ExecColTag>PLAN</ExecColTag>
          <ExecColTitle>前提</ExecColTitle>
          <ExecColSub>予算・在庫</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="月間売上予算" value={formatCurrency(r.budget)} />
          <ExecMetric label="月間粗利額予算" value={formatCurrency(r.grossProfitBudget)} />
          <ExecMetric label="月間粗利率予算" value={formatPercent(r.grossProfitRateBudget)} />
          <ExecDividerLine />
          <ExecMetric label="期首在庫" value={formatCurrency(r.openingInventory)} />
          <ExecMetric label="期末在庫目標" value={formatCurrency(r.closingInventory)} />
        </ExecBody>
      </ExecColumn>

      {/* ACTUAL */}
      <ExecColumn>
        <ExecColHeader $color="#22c55e">
          <ExecColTag>ACTUAL</ExecColTag>
          <ExecColTitle>現在地</ExecColTitle>
          <ExecColSub>期中実績（{r.elapsedDays}日経過 / {r.salesDays}営業日）</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric label="期中売上予算" value={formatCurrency(elapsedBudget)} />
          <ExecMetric
            label="期中売上実績"
            value={formatCurrency(r.totalSales)}
            sub={`差異: ${formatCurrency(r.totalSales - elapsedBudget)}`}
            subColor={r.totalSales >= elapsedBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="売上達成率"
            value={formatPercent(salesAchievement)}
            sub={`進捗比: ${formatPercent(progressRatio)}`}
          />
          <ExecDividerLine />
          <ExecMetric
            label="期中粗利額実績"
            value={formatCurrency(actualGP)}
            sub={`差異: ${formatCurrency(actualGP - elapsedGPBudget)}`}
            subColor={actualGP >= elapsedGPBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="期中粗利率実績"
            value={formatPercent(actualGPRate)}
            sub={`予算比: ${formatPointDiff(actualGPRate - r.grossProfitRateBudget)}`}
            subColor={actualGPRate >= r.grossProfitRateBudget ? '#22c55e' : '#ef4444'}
          />
        </ExecBody>
      </ExecColumn>

      {/* FORECAST */}
      <ExecColumn>
        <ExecColHeader $color="#f59e0b">
          <ExecColTag>FORECAST</ExecColTag>
          <ExecColTitle>着地</ExecColTitle>
          <ExecColSub>営業日ベース予測</ExecColSub>
        </ExecColHeader>
        <ExecBody>
          <ExecMetric
            label="月末売上着地"
            value={formatCurrency(r.projectedSales)}
            sub={`予算差: ${formatCurrency(r.projectedSales - r.budget)}`}
            subColor={r.projectedSales >= r.budget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="着地売上達成率"
            value={formatPercent(r.projectedAchievement)}
          />
          <ExecDividerLine />
          <ExecMetric
            label="月末粗利着地"
            value={formatCurrency(projectedGP)}
            sub={`予算差: ${formatCurrency(projectedGP - r.grossProfitBudget)}`}
            subColor={projectedGP >= r.grossProfitBudget ? '#22c55e' : '#ef4444'}
          />
          <ExecMetric
            label="着地粗利達成率"
            value={formatPercent(projectedGPAchievement)}
          />
        </ExecBody>
      </ExecColumn>
    </ExecGrid>
  )
}

interface PinInterval {
  startDay: number
  endDay: number
  openingInventory: number
  closingInventory: number
  totalSales: number
  totalPurchaseCost: number
  cogs: number
  grossProfit: number
  grossProfitRate: number
}

function calculatePinIntervals(result: StoreResult, pins: [number, number][]): PinInterval[] {
  if (pins.length === 0) return []
  const intervals: PinInterval[] = []
  let prevDay = 0
  let prevInventory = result.openingInventory ?? 0

  for (const [day, closingInv] of pins) {
    let totalSales = 0
    let totalPurchaseCost = 0
    for (let d = prevDay + 1; d <= day; d++) {
      const rec = result.daily.get(d)
      if (rec) {
        totalSales += rec.sales
        totalPurchaseCost += rec.purchase.cost
      }
    }
    const cogs = prevInventory + totalPurchaseCost - closingInv
    const grossProfit = totalSales - cogs
    const grossProfitRate = totalSales > 0 ? grossProfit / totalSales : 0
    intervals.push({
      startDay: prevDay + 1, endDay: day,
      openingInventory: prevInventory, closingInventory: closingInv,
      totalSales, totalPurchaseCost, cogs, grossProfit, grossProfitRate,
    })
    prevDay = day
    prevInventory = closingInv
  }
  return intervals
}

function MonthlyCalendarWidget({ ctx }: { ctx: WidgetContext }) {
  const { result: r, daysInMonth, year, month } = ctx
  const [pins, setPins] = useState<Map<number, number>>(new Map())
  const [editDay, setEditDay] = useState<number | null>(null)
  const [inputVal, setInputVal] = useState('')
  const DOW_LABELS = ['月', '火', '水', '木', '金', '土', '日']

  // Build weeks (Monday start)
  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7
  for (let i = 0; i < firstDow; i++) currentWeek.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    weeks.push(currentWeek)
  }

  // Calculate pin intervals
  const sortedPins = [...pins.entries()].sort((a, b) => a[0] - b[0])
  const intervals = calculatePinIntervals(r, sortedPins)
  const getIntervalForDay = (day: number) =>
    intervals.find(iv => day >= iv.startDay && day <= iv.endDay)

  const handleDayClick = (day: number) => {
    setEditDay(day)
    setInputVal(pins.has(day) ? String(pins.get(day)) : '')
  }

  const handlePinConfirm = () => {
    if (editDay == null) return
    const val = Number(inputVal.replace(/,/g, ''))
    if (isNaN(val) || val < 0) return
    setPins(prev => { const next = new Map(prev); next.set(editDay, val); return next })
    setEditDay(null)
  }

  const handlePinRemove = () => {
    if (editDay == null) return
    setPins(prev => { const next = new Map(prev); next.delete(editDay); return next })
    setEditDay(null)
  }

  return (
    <CalWrapper>
      <CalSectionTitle>月間カレンダー（{year}年{month}月）- 日付クリックで期末在庫を入力・粗利率ピン止め</CalSectionTitle>
      <CalTable>
        <thead>
          <tr>
            {DOW_LABELS.map((label, i) => (
              <CalTh key={label} $weekend={i >= 5}>{label}</CalTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                if (day == null) return <CalTd key={di} $empty />
                const rec = r.daily.get(day)
                const budget = r.budgetDaily.get(day) ?? 0
                const actual = rec?.sales ?? 0
                const diff = actual - budget
                const achievement = budget > 0 ? actual / budget : 0
                const isWeekend = di >= 5
                const diffColor = diff >= 0 ? '#22c55e' : '#ef4444'
                const achColor = achievement >= 1 ? '#22c55e' : achievement >= 0.9 ? '#f59e0b' : '#ef4444'
                const isPinned = pins.has(day)
                const interval = isPinned ? getIntervalForDay(day) : undefined
                return (
                  <CalTd key={di}>
                    <CalDayCell
                      $pinned={isPinned}
                      $inInterval={!!getIntervalForDay(day)}
                      onClick={() => handleDayClick(day)}
                    >
                      <CalDayNum $weekend={isWeekend}>{day}</CalDayNum>
                      {(budget > 0 || actual > 0) && (
                        <>
                          <CalLine>予 {formatCurrency(budget)}</CalLine>
                          <CalLine>実 {formatCurrency(actual)}</CalLine>
                          <CalLine $color={diffColor}>差 {formatCurrency(diff)}</CalLine>
                          <CalLine $color={achColor}>達 {budget > 0 ? formatPercent(achievement, 0) : '-'}</CalLine>
                        </>
                      )}
                      {isPinned && interval && (
                        <PinIndicator>GP {formatPercent(interval.grossProfitRate, 1)}</PinIndicator>
                      )}
                    </CalDayCell>
                  </CalTd>
                )
              })}
            </tr>
          ))}
        </tbody>
      </CalTable>

      {/* Interval Summary */}
      {intervals.length > 0 && (
        <IntervalSummary>
          <CalSectionTitle>区間別粗利率（ピン止め計算）</CalSectionTitle>
          {intervals.map((iv, i) => (
            <IntervalCard
              key={i}
              $color={iv.grossProfitRate >= ctx.targetRate ? '#22c55e' : iv.grossProfitRate >= ctx.warningRate ? '#f59e0b' : '#ef4444'}
            >
              <div>
                <IntervalMetricLabel>{iv.startDay}日 ～ {iv.endDay}日</IntervalMetricLabel>
                <IntervalMetricValue>{formatPercent(iv.grossProfitRate)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>売上</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.totalSales)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>粗利</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.grossProfit)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>売上原価</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.cogs)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期首在庫</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.openingInventory)}</IntervalMetricValue>
              </div>
              <div>
                <IntervalMetricLabel>期末在庫</IntervalMetricLabel>
                <IntervalMetricValue>{formatCurrency(iv.closingInventory)}</IntervalMetricValue>
              </div>
            </IntervalCard>
          ))}
        </IntervalSummary>
      )}

      {/* Pin Input Modal */}
      {editDay != null && (
        <PinModalOverlay onClick={() => setEditDay(null)}>
          <PinModalContent onClick={(e) => e.stopPropagation()}>
            <PinModalTitle>{month}月{editDay}日 - 期末在庫入力</PinModalTitle>
            <ToolInputGroup>
              <PinInputLabel>期末在庫（原価）</PinInputLabel>
              <PinInputField
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePinConfirm() }}
                placeholder="例: 2000000"
                autoFocus
              />
            </ToolInputGroup>
            <PinButtonRow>
              <Button $variant="primary" onClick={handlePinConfirm}>確定（ピン止め）</Button>
              {pins.has(editDay) && (
                <Button $variant="outline" onClick={handlePinRemove}>ピン解除</Button>
              )}
              <Button $variant="outline" onClick={() => setEditDay(null)}>キャンセル</Button>
            </PinButtonRow>
          </PinModalContent>
        </PinModalOverlay>
      )}
    </CalWrapper>
  )
}

function ForecastToolsWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result
  const [salesLandingInput, setSalesLandingInput] = useState('')
  const [remainGPRateInput, setRemainGPRateInput] = useState('')
  const [targetGPRateInput, setTargetGPRateInput] = useState('')

  // Current actuals
  const actualSales = r.totalSales
  const actualGP = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGPRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  // Tool 1: Sales Landing + Remaining GP Rate → Final projections
  const salesLanding = Number(salesLandingInput.replace(/,/g, '')) || 0
  const remainGPRate = Number(remainGPRateInput) / 100 || 0
  const tool1Valid = salesLanding > 0 && remainGPRate > 0
  const remainingSales1 = salesLanding - actualSales
  const remainingGP1 = remainingSales1 * remainGPRate
  const totalGP1 = actualGP + remainingGP1
  const landingGPRate1 = salesLanding > 0 ? totalGP1 / salesLanding : 0

  // Tool 2: Goal Seek - Target GP Rate → Required remaining GP rate
  const targetGPRate = Number(targetGPRateInput) / 100 || 0
  const tool2Valid = targetGPRate > 0
  const projectedTotalSales2 = r.projectedSales
  const targetTotalGP2 = targetGPRate * projectedTotalSales2
  const requiredRemainingGP2 = targetTotalGP2 - actualGP
  const remainingSales2 = projectedTotalSales2 - actualSales
  const requiredRemainingGPRate2 = remainingSales2 > 0 ? requiredRemainingGP2 / remainingSales2 : 0

  return (
    <ForecastToolsGrid>
      {/* Tool 1: Projection Calculator */}
      <ToolCard $accent="#6366f1">
        <ToolCardTitle>着地見込み計算</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>売上着地見込み（円）</PinInputLabel>
          <ToolInputField
            type="text"
            value={salesLandingInput}
            onChange={(e) => setSalesLandingInput(e.target.value)}
            placeholder={`例: ${Math.round(r.projectedSales)}`}
          />
        </ToolInputGroup>
        <ToolInputGroup>
          <PinInputLabel>残期間の粗利率予測（%）</PinInputLabel>
          <ToolInputField
            type="text"
            value={remainGPRateInput}
            onChange={(e) => setRemainGPRateInput(e.target.value)}
            placeholder={`例: ${(actualGPRate * 100).toFixed(1)}`}
          />
        </ToolInputGroup>
        {tool1Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>現在売上実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualSales)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間売上</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間粗利見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingGP1)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>最終売上着地</ToolResultLabel>
              <ToolResultValue $color="#6366f1">{formatCurrency(salesLanding)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利額着地</ToolResultLabel>
              <ToolResultValue $color="#22c55e">{formatCurrency(totalGP1)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>最終粗利率着地</ToolResultLabel>
              <ToolResultValue $color={landingGPRate1 >= ctx.targetRate ? '#22c55e' : '#ef4444'}>
                {formatPercent(landingGPRate1)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>

      {/* Tool 2: Goal Seek */}
      <ToolCard $accent="#f59e0b">
        <ToolCardTitle>ゴールシーク（必要粗利率逆算）</ToolCardTitle>
        <ToolInputGroup>
          <PinInputLabel>目標着地粗利率（%）</PinInputLabel>
          <ToolInputField
            type="text"
            value={targetGPRateInput}
            onChange={(e) => setTargetGPRateInput(e.target.value)}
            placeholder={`例: ${(r.grossProfitRateBudget * 100).toFixed(1)}`}
          />
        </ToolInputGroup>
        {tool2Valid && (
          <ToolResultSection>
            <ExecRow>
              <ToolResultLabel>予測月末売上</ToolResultLabel>
              <ToolResultValue>{formatCurrency(projectedTotalSales2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>目標粗利総額</ToolResultLabel>
              <ToolResultValue>{formatCurrency(targetTotalGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利実績</ToolResultLabel>
              <ToolResultValue>{formatCurrency(actualGP)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間必要粗利</ToolResultLabel>
              <ToolResultValue>{formatCurrency(requiredRemainingGP2)}</ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>残期間売上見込み</ToolResultLabel>
              <ToolResultValue>{formatCurrency(remainingSales2)}</ToolResultValue>
            </ExecRow>
            <ExecDividerLine />
            <ExecRow>
              <ToolResultLabel>残期間必要粗利率</ToolResultLabel>
              <ToolResultValue $color={requiredRemainingGPRate2 <= actualGPRate ? '#22c55e' : '#ef4444'}>
                {formatPercent(requiredRemainingGPRate2)}
              </ToolResultValue>
            </ExecRow>
            <ExecRow>
              <ToolResultLabel>現在粗利率との差</ToolResultLabel>
              <ToolResultValue $color={requiredRemainingGPRate2 <= actualGPRate ? '#22c55e' : '#ef4444'}>
                {formatPointDiff(requiredRemainingGPRate2 - actualGPRate)}
              </ToolResultValue>
            </ExecRow>
          </ToolResultSection>
        )}
      </ToolCard>
    </ForecastToolsGrid>
  )
}

function renderDowAverage(ctx: WidgetContext): ReactNode {
  const { result: r, year, month } = ctx
  const dailySales = new Map<number, number>()
  const dailyGP = new Map<number, number>()
  for (const [d, rec] of r.daily) {
    dailySales.set(d, rec.sales)
    dailyGP.set(d, rec.sales - rec.purchase.cost)
  }
  const averages = calculateDayOfWeekAverages({ year, month, dailySales, dailyGrossProfit: dailyGP })
  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']
  const ordered = [1, 2, 3, 4, 5, 6, 0].map(i => ({ ...averages[i], label: DOW_LABELS[i] }))

  return (
    <STableWrapper>
      <STableTitle>曜日平均</STableTitle>
      <STable>
        <thead>
          <tr>
            <STh>曜日</STh>
            <STh>平均売上</STh>
            <STh>日数</STh>
          </tr>
        </thead>
        <tbody>
          {ordered.map(a => (
            <tr key={a.label}>
              <STd>{a.label}</STd>
              <STd>{formatCurrency(a.averageSales)}</STd>
              <STd>{a.count}日</STd>
            </tr>
          ))}
        </tbody>
      </STable>
    </STableWrapper>
  )
}

function renderWeeklySummary(ctx: WidgetContext): ReactNode {
  const { result: r, year, month } = ctx
  const dailySales = new Map<number, number>()
  const dailyGP = new Map<number, number>()
  for (const [d, rec] of r.daily) {
    dailySales.set(d, rec.sales)
    dailyGP.set(d, rec.sales - rec.purchase.cost)
  }

  const summaries = calculateWeeklySummaries({ year, month, dailySales, dailyGrossProfit: dailyGP })

  return (
    <STableWrapper>
      <STableTitle>週別サマリー</STableTitle>
      <STable>
        <thead>
          <tr>
            <STh>週</STh>
            <STh>期間</STh>
            <STh>売上</STh>
            <STh>粗利</STh>
            <STh>粗利率</STh>
            <STh>日数</STh>
          </tr>
        </thead>
        <tbody>
          {summaries.map(w => (
            <tr key={w.weekNumber}>
              <STd>第{w.weekNumber}週</STd>
              <STd>{month}/{w.startDay}～{month}/{w.endDay}</STd>
              <STd>{formatCurrency(w.totalSales)}</STd>
              <STd>{formatCurrency(w.totalGrossProfit)}</STd>
              <STd>{formatPercent(w.grossProfitRate)}</STd>
              <STd>{w.days}日</STd>
            </tr>
          ))}
        </tbody>
      </STable>
    </STableWrapper>
  )
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
  // ── 本部・経営者向け ──
  {
    id: 'exec-summary-bar',
    label: 'サマリーバー',
    group: '本部・経営者向け',
    size: 'full',
    render: ({ result: r }) => (
      <ExecSummaryBar>
        <ExecSummaryItem $accent="#6366f1">
          <ExecSummaryLabel>売上実績</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.totalSales)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#f59e0b">
          <ExecSummaryLabel>総仕入高</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.totalCost)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#3b82f6">
          <ExecSummaryLabel>値入率</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.averageMarkupRate)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#22c55e">
          <ExecSummaryLabel>粗利率（在庫法）</ExecSummaryLabel>
          <ExecSummaryValue>{r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#0ea5e9">
          <ExecSummaryLabel>粗利率（推定法）</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.estMethodMarginRate)}</ExecSummaryValue>
        </ExecSummaryItem>
      </ExecSummaryBar>
    ),
  },
  {
    id: 'exec-plan-actual-forecast',
    label: 'PLAN / ACTUAL / FORECAST',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => renderPlanActualForecast(ctx),
  },
  {
    id: 'exec-inventory-metrics',
    label: '在庫・値入・売変',
    group: '本部・経営者向け',
    size: 'full',
    render: ({ result: r }) => (
      <InventoryBar>
        <ExecSummaryItem $accent="#8b5cf6">
          <ExecSummaryLabel>期首在庫</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.openingInventory)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#6366f1">
          <ExecSummaryLabel>期末在庫</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.closingInventory)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#0ea5e9">
          <ExecSummaryLabel>推定在庫</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.estMethodClosingInventory)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#3b82f6">
          <ExecSummaryLabel>値入率</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.averageMarkupRate)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#f43f5e">
          <ExecSummaryLabel>売変額</ExecSummaryLabel>
          <ExecSummaryValue>{formatCurrency(r.totalDiscount)}</ExecSummaryValue>
        </ExecSummaryItem>
        <ExecSummaryItem $accent="#ef4444">
          <ExecSummaryLabel>売変率</ExecSummaryLabel>
          <ExecSummaryValue>{formatPercent(r.discountRate)}</ExecSummaryValue>
        </ExecSummaryItem>
      </InventoryBar>
    ),
  },
  {
    id: 'exec-monthly-calendar',
    label: '月間カレンダー',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => <MonthlyCalendarWidget ctx={ctx} />,
  },
  {
    id: 'exec-dow-average',
    label: '曜日平均',
    group: '本部・経営者向け',
    size: 'half',
    render: (ctx) => renderDowAverage(ctx),
  },
  {
    id: 'exec-weekly-summary',
    label: '週別サマリー',
    group: '本部・経営者向け',
    size: 'half',
    render: (ctx) => renderWeeklySummary(ctx),
  },
  {
    id: 'exec-forecast-tools',
    label: '着地予測・ゴールシーク',
    group: '本部・経営者向け',
    size: 'full',
    render: (ctx) => <ForecastToolsWidget ctx={ctx} />,
  },
]

const WIDGET_MAP = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]))

const DEFAULT_WIDGET_IDS: string[] = [
  'exec-summary-bar',
  'exec-plan-actual-forecast',
  'exec-inventory-metrics',
  'exec-monthly-calendar',
  'exec-dow-average', 'exec-weekly-summary',
  'exec-forecast-tools',
  'chart-daily-sales',
  'chart-budget-vs-actual',
]

const STORAGE_KEY = 'dashboard_layout_v2'

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
    year: appState.settings.targetYear,
    month: appState.settings.targetMonth,
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
