/**
 * PrevYearBudgetDetailPanel — 前年売上 vs 当年予算の詳細分析パネル
 *
 * 「今年の予算は去年に対してどう組まれているか」を可視化する。
 *
 * 機能:
 *   - サマリーカード（前年売上・予算・前年比・客数・客単価ギャップ）
 *   - 日別/累計 切り替え
 *   - 週間小計行（月曜〜日曜区切り）
 *   - 同日カード: 曜日ギャップ分析（曜日別の日数差と想定客数・客単価影響）
 */
import { useState, useMemo, useCallback } from 'react'
import styled, { useTheme } from 'styled-components'
import type { PrevYearMonthlyKpiEntry } from '@/application/hooks/usePrevYearMonthlyKpi'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import {
  Overlay,
  Panel,
  MbpHeader,
  MbpTitle,
  CloseButton,
  MbpTabBar,
  TabButton,
  TableWrap,
  MbpTable,
  MbpTh,
  MbpTr,
  MbpTd,
} from '@/presentation/components/common/MetricBreakdownPanel.styles'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

function getDow(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay()
}

// ── Styled ──

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
`

const SummaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const SummaryValue = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const SummarySub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

const PeriodInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

const PeriodItem = styled.span`
  white-space: nowrap;
`

const WeekRow = styled.tr`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ theme }) => `${theme.colors.palette.primary}08`};
  td {
    border-top: 1px solid ${({ theme }) => `${theme.colors.palette.primary}20`};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
  }
`

const TotalRow = styled.tr`
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  background: ${({ theme }) => theme.colors.bg3};
  td {
    border-top: 2px solid ${({ theme }) => theme.colors.border};
  }
`

const NumTd = styled(MbpTd)`
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const NumTh = styled(MbpTh)`
  text-align: right;
`

const DowTd = styled(MbpTd)<{ $dow: number }>`
  color: ${({ $dow, theme }) =>
    $dow === 0
      ? theme.colors.palette.danger
      : $dow === 6
        ? theme.colors.palette.primary
        : theme.colors.text2};
  font-weight: ${({ $dow, theme }) =>
    $dow === 0 || $dow === 6 ? theme.typography.fontWeight.semibold : 'normal'};
`

const RatioCell = styled(NumTd)<{ $ratio: number }>`
  color: ${({ $ratio, theme }) =>
    $ratio > 1.05
      ? theme.colors.palette.success
      : $ratio < 0.95
        ? theme.colors.palette.danger
        : theme.colors.text2};
`

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin: ${({ theme }) => theme.spacing[4]} 0 ${({ theme }) => theme.spacing[2]};
`

const DowGapGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const DowGapCell = styled.div<{ $diff: number }>`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $diff, theme }) =>
    $diff > 0
      ? `${theme.colors.palette.success}12`
      : $diff < 0
        ? `${theme.colors.palette.danger}12`
        : theme.colors.bg3};
`

const DowGapLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

const DowGapDiff = styled.div<{ $diff: number }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $diff, theme }) =>
    $diff > 0
      ? theme.colors.palette.success
      : $diff < 0
        ? theme.colors.palette.danger
        : theme.colors.text4};
`

const DowGapCount = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
`

// ── Types ──

interface PrevYearBudgetDetailPanelProps {
  readonly type: 'sameDow' | 'sameDate'
  readonly entry: PrevYearMonthlyKpiEntry
  readonly budgetDaily: ReadonlyMap<number, number>
  readonly budgetTotal: number
  readonly targetYear: number
  readonly targetMonth: number
  readonly sourceYear: number
  readonly sourceMonth: number
  readonly dowOffset: number
  /** 曜日ギャップ分析結果（application層で算出済み） */
  readonly dowGap: DowGapAnalysis
  readonly onClose: () => void
}

type ViewMode = 'daily' | 'cumulative'

// ── Helpers ──

/** 月曜始まりの週番号 (1-based) */
function weekNumber(year: number, month: number, day: number): number {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const mondayBased = firstDow === 0 ? 6 : firstDow - 1
  return Math.floor((day - 1 + mondayBased) / 7) + 1
}

interface TableRow {
  readonly prevDay: number
  readonly currentDay: number
  readonly prevSales: number
  readonly prevCustomers: number
  readonly budget: number
  readonly week: number
  readonly dow: number
}

// ── Component ──

export function PrevYearBudgetDetailPanel({
  type,
  entry,
  budgetDaily,
  budgetTotal,
  targetYear,
  targetMonth,
  sourceYear,
  sourceMonth,
  dowOffset,
  dowGap,
  onClose,
}: PrevYearBudgetDetailPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily')
  const theme = useTheme()

  const title = type === 'sameDow' ? '前年同曜日 vs 当年予算' : '前年同日 vs 当年予算'
  const offsetLabel =
    type === 'sameDow' ? `曜日オフセット: ${dowOffset}日` : '同日（オフセットなし）'

  // 日別データ + 週番号
  const baseRows: readonly TableRow[] = useMemo(() => {
    return entry.dailyMapping.map((row) => ({
      ...row,
      budget: budgetDaily.get(row.currentDay) ?? 0,
      week: weekNumber(targetYear, targetMonth, row.currentDay),
      dow: getDow(sourceYear, sourceMonth, row.prevDay),
    }))
  }, [entry.dailyMapping, budgetDaily, targetYear, targetMonth, sourceYear, sourceMonth])

  // 週別集計
  const weeklyTotals = useMemo(() => {
    const map = new Map<
      number,
      { sales: number; customers: number; budget: number; days: number }
    >()
    for (const row of baseRows) {
      const existing = map.get(row.week)
      if (existing) {
        existing.sales += row.prevSales
        existing.customers += row.prevCustomers
        existing.budget += row.budget
        existing.days++
      } else {
        map.set(row.week, {
          sales: row.prevSales,
          customers: row.prevCustomers,
          budget: row.budget,
          days: 1,
        })
      }
    }
    return map
  }, [baseRows])

  // サマリー指標
  const prevTransactionValue = safeDivide(entry.sales, entry.customers, 0)
  const budgetRatio = safeDivide(entry.sales, budgetTotal, 0)
  const budgetVsPrevYear = safeDivide(budgetTotal, entry.sales, 0)

  // 想定客数ギャップ: 同日の場合、曜日構成差 × 日平均客数
  const dailyAvgCustomers = safeDivide(entry.customers, entry.dailyMapping.length, 0)
  const estimatedCustomerGap = useMemo(() => {
    if (type !== 'sameDate' || !dowGap.isValid) return 0
    const totalDayDiff = dowGap.dowCounts.reduce((s, d) => s + d.diff, 0)
    return Math.round(totalDayDiff * dailyAvgCustomers)
  }, [type, dowGap, dailyAvgCustomers])

  // 想定客単価影響
  const estimatedUnitPriceImpact = useMemo(() => {
    if (type !== 'sameDate' || !dowGap.isValid || entry.customers === 0) return 0
    const impactSales = dowGap.estimatedImpact
    const adjustedCustomers = entry.customers + estimatedCustomerGap
    if (adjustedCustomers <= 0) return 0
    return safeDivide(entry.sales + impactSales, adjustedCustomers, 0) - prevTransactionValue
  }, [type, dowGap, entry, estimatedCustomerGap, prevTransactionValue])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  // 週間小計行のレンダー
  const renderWeekSummary = (weekNum: number) => {
    const wt = weeklyTotals.get(weekNum)
    if (!wt) return null
    const wRatio = safeDivide(wt.budget, wt.sales, 0)
    const wCustUnit = safeDivide(wt.sales, wt.customers, 0)
    return (
      <WeekRow key={`week-${weekNum}`}>
        <MbpTd colSpan={2}>
          {weekNum}週目 ({wt.days}日間)
        </MbpTd>
        <NumTd>{formatCurrency(wt.sales)}</NumTd>
        <NumTd>{wt.customers.toLocaleString('ja-JP')}</NumTd>
        <NumTd>{wt.customers > 0 ? formatCurrency(wCustUnit) : '-'}</NumTd>
        <MbpTd />
        <NumTd>{formatCurrency(wt.budget)}</NumTd>
        <NumTd>
          {wt.budget - wt.sales >= 0 ? '+' : ''}
          {formatCurrency(wt.budget - wt.sales)}
        </NumTd>
        <NumTd>{wt.sales > 0 ? formatPercent(wRatio) : '-'}</NumTd>
      </WeekRow>
    )
  }

  // テーブル本体
  const renderTableBody = () => {
    const elements: React.ReactNode[] = []
    let cumPrevSales = 0
    let cumPrevCustomers = 0
    let cumBudget = 0
    let prevWeek = 0

    for (let i = 0; i < baseRows.length; i++) {
      const row = baseRows[i]

      // 週の切り替わりで前の週の小計行を挿入（日別モードのみ）
      if (viewMode === 'daily' && row.week !== prevWeek && prevWeek > 0) {
        elements.push(renderWeekSummary(prevWeek))
      }
      prevWeek = row.week

      cumPrevSales += row.prevSales
      cumPrevCustomers += row.prevCustomers
      cumBudget += row.budget

      const displaySales = viewMode === 'cumulative' ? cumPrevSales : row.prevSales
      const displayCustomers = viewMode === 'cumulative' ? cumPrevCustomers : row.prevCustomers
      const displayBudget = viewMode === 'cumulative' ? cumBudget : row.budget
      const diff = displayBudget - displaySales
      const ratio = safeDivide(displayBudget, displaySales, 0)
      const custUnitPrice = safeDivide(displaySales, displayCustomers, 0)

      elements.push(
        <MbpTr key={i}>
          <DowTd $dow={row.dow}>{DOW_LABELS[row.dow]}</DowTd>
          <MbpTd>
            {sourceMonth}/{row.prevDay}
          </MbpTd>
          <NumTd>{formatCurrency(displaySales)}</NumTd>
          <NumTd>{displayCustomers.toLocaleString('ja-JP')}</NumTd>
          <NumTd>{displayCustomers > 0 ? formatCurrency(custUnitPrice) : '-'}</NumTd>
          <MbpTd>
            {targetMonth}/{row.currentDay}
          </MbpTd>
          <NumTd>{formatCurrency(displayBudget)}</NumTd>
          <RatioCell $ratio={diff >= 0 ? 1.1 : 0.9}>
            {diff >= 0 ? '+' : ''}
            {formatCurrency(diff)}
          </RatioCell>
          <RatioCell $ratio={ratio}>{displaySales > 0 ? formatPercent(ratio) : '-'}</RatioCell>
        </MbpTr>,
      )
    }

    // 最後の週の小計（日別モードのみ）
    if (viewMode === 'daily' && prevWeek > 0) {
      elements.push(renderWeekSummary(prevWeek))
    }

    // 合計行
    elements.push(
      <TotalRow key="total">
        <MbpTd>合計</MbpTd>
        <MbpTd>{entry.dailyMapping.length}日</MbpTd>
        <NumTd>{formatCurrency(entry.sales)}</NumTd>
        <NumTd>{entry.customers.toLocaleString('ja-JP')}</NumTd>
        <NumTd>{entry.customers > 0 ? formatCurrency(prevTransactionValue) : '-'}</NumTd>
        <MbpTd />
        <NumTd>{formatCurrency(budgetTotal)}</NumTd>
        <NumTd>
          {budgetTotal - entry.sales >= 0 ? '+' : ''}
          {formatCurrency(budgetTotal - entry.sales)}
        </NumTd>
        <NumTd>{entry.sales > 0 ? formatPercent(budgetVsPrevYear) : '-'}</NumTd>
      </TotalRow>,
    )

    return elements
  }

  return (
    <Overlay onClick={onClose}>
      <Panel
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: 960 }}
      >
        <MbpHeader>
          <MbpTitle>{title}</MbpTitle>
          <CloseButton onClick={onClose} aria-label="閉じる">
            ×
          </CloseButton>
        </MbpHeader>

        {/* 期間情報 */}
        <PeriodInfo>
          <PeriodItem>
            前年: {sourceYear}年{sourceMonth}月
          </PeriodItem>
          <PeriodItem>
            当年: {targetYear}年{targetMonth}月
          </PeriodItem>
          <PeriodItem>{offsetLabel}</PeriodItem>
          <PeriodItem>対応日数: {entry.dailyMapping.length}日</PeriodItem>
        </PeriodInfo>

        {/* サマリーカード */}
        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel>前年売上</SummaryLabel>
            <SummaryValue>{formatCurrency(entry.sales)}</SummaryValue>
            <SummarySub>客数: {entry.customers.toLocaleString('ja-JP')}人</SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>前年客単価</SummaryLabel>
            <SummaryValue>{formatCurrency(prevTransactionValue)}</SummaryValue>
            <SummarySub>売上 ÷ 客数</SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>当年月間予算</SummaryLabel>
            <SummaryValue>{formatCurrency(budgetTotal)}</SummaryValue>
            <SummarySub>
              前年比: {formatPercent(budgetVsPrevYear)}
              {budgetVsPrevYear !== 1 &&
                ` (${budgetTotal - entry.sales >= 0 ? '+' : ''}${formatCurrency(budgetTotal - entry.sales)})`}
            </SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>前年 ÷ 予算</SummaryLabel>
            <SummaryValue
              style={{
                color:
                  budgetRatio >= 1 ? theme.colors.palette.success : theme.colors.palette.danger,
              }}
            >
              {formatPercent(budgetRatio)}
            </SummaryValue>
            <SummarySub>
              {budgetVsPrevYear > 1
                ? '前年超の予算（強気）'
                : budgetVsPrevYear < 1
                  ? '前年割れの予算（保守的）'
                  : '前年同水準'}
            </SummarySub>
          </SummaryCard>
        </SummaryGrid>

        {/* 曜日ギャップ分析（同日カードのみ） */}
        {type === 'sameDate' && dowGap.isValid && (
          <>
            <SectionTitle>曜日構成の差異（同日比較の影響要因）</SectionTitle>
            <DowGapGrid>
              {dowGap.dowCounts.map((dc) => (
                <DowGapCell key={dc.dow} $diff={dc.diff}>
                  <DowGapLabel>{dc.label}</DowGapLabel>
                  <DowGapDiff $diff={dc.diff}>
                    {dc.diff > 0 ? `+${dc.diff}` : dc.diff === 0 ? '±0' : `${dc.diff}`}
                  </DowGapDiff>
                  <DowGapCount>
                    {dc.previousCount}→{dc.currentCount}
                  </DowGapCount>
                </DowGapCell>
              ))}
            </DowGapGrid>
            <SummaryGrid>
              <SummaryCard>
                <SummaryLabel>曜日ギャップ影響額</SummaryLabel>
                <SummaryValue
                  style={{
                    color:
                      dowGap.estimatedImpact >= 0
                        ? theme.colors.palette.success
                        : theme.colors.palette.danger,
                  }}
                >
                  {dowGap.estimatedImpact >= 0 ? '+' : ''}
                  {formatCurrency(dowGap.estimatedImpact)}
                </SummaryValue>
                <SummarySub>Σ(前年曜日別日平均 × 日数差)</SummarySub>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>想定客数ギャップ</SummaryLabel>
                <SummaryValue
                  style={{
                    color:
                      estimatedCustomerGap >= 0
                        ? theme.colors.palette.success
                        : theme.colors.palette.danger,
                  }}
                >
                  {estimatedCustomerGap >= 0 ? '+' : ''}
                  {estimatedCustomerGap.toLocaleString('ja-JP')}人
                </SummaryValue>
                <SummarySub>日平均客数 × 日数差</SummarySub>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>想定客単価影響</SummaryLabel>
                <SummaryValue
                  style={{
                    color:
                      estimatedUnitPriceImpact >= 0
                        ? theme.colors.palette.success
                        : theme.colors.palette.danger,
                  }}
                >
                  {estimatedUnitPriceImpact >= 0 ? '+' : ''}
                  {formatCurrency(Math.round(estimatedUnitPriceImpact))}
                </SummaryValue>
                <SummarySub>曜日構成変化による客単価変動</SummarySub>
              </SummaryCard>
            </SummaryGrid>
          </>
        )}

        {/* タブ切替 */}
        <SectionTitle>日別対応テーブル</SectionTitle>
        <MbpTabBar>
          <TabButton $active={viewMode === 'daily'} onClick={() => setViewMode('daily')}>
            日別
          </TabButton>
          <TabButton $active={viewMode === 'cumulative'} onClick={() => setViewMode('cumulative')}>
            累計
          </TabButton>
        </MbpTabBar>

        {/* テーブル */}
        <TableWrap style={{ maxHeight: 500 }}>
          <MbpTable>
            <thead>
              <tr>
                <MbpTh style={{ width: 36 }}>曜日</MbpTh>
                <MbpTh>前年({sourceYear})</MbpTh>
                <NumTh>前年売上</NumTh>
                <NumTh>前年客数</NumTh>
                <NumTh>前年客単価</NumTh>
                <MbpTh>当年({targetYear})</MbpTh>
                <NumTh>当年予算</NumTh>
                <NumTh>差額</NumTh>
                <NumTh>予算÷前年</NumTh>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </MbpTable>
        </TableWrap>
      </Panel>
    </Overlay>
  )
}
