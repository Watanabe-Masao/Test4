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
import { useTheme } from 'styled-components'
import type { PrevYearMonthlyKpiEntry } from '@/application/comparison/comparisonTypes'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { safeDivide } from '@/domain/calculations/utils'
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
import {
  SummaryGrid,
  SummaryCard,
  SummaryLabel,
  SummaryValue,
  SummarySub,
  PeriodInfo,
  PeriodItem,
  WeekRow,
  TotalRow,
  NumTd,
  NumTh,
  DowTd,
  RatioCell,
  SectionTitle,
  DowGapGrid,
  DowGapCell,
  DowGapLabel,
  DowGapDiff,
  DowGapCount,
} from './PrevYearBudgetDetailPanel.styles'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

function getDow(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay()
}

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
  readonly prevMonth: number
  readonly prevYear: number
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
  const { format: fmtCurrency } = useCurrencyFormat()

  const title = type === 'sameDow' ? '予算成長率（同曜日）' : '予算成長率（同日）'

  // dailyMapping の先頭/末尾から実際の比較期間を算出
  const periodLabels = useMemo(() => {
    const dm = entry.dailyMapping
    if (dm.length === 0) return { prev: `${sourceYear}年${sourceMonth}月`, cur: `${targetYear}年${targetMonth}月` }
    const first = dm[0]
    const last = dm[dm.length - 1]
    // 同月内なら日だけ省略表記
    const prev = first.prevMonth === last.prevMonth && first.prevYear === last.prevYear
      ? `${first.prevYear}年${first.prevMonth}月${first.prevDay}日〜${last.prevDay}日`
      : `${first.prevYear}年${first.prevMonth}月${first.prevDay}日〜${last.prevYear}年${last.prevMonth}月${last.prevDay}日`
    const cur = `${targetYear}年${targetMonth}月${first.currentDay}日〜${last.currentDay}日`
    return { prev, cur }
  }, [entry.dailyMapping, sourceYear, sourceMonth, targetYear, targetMonth])

  // 日別データ + 週番号
  const baseRows: readonly TableRow[] = useMemo(() => {
    return entry.dailyMapping.map((row) => ({
      ...row,
      budget: budgetDaily.get(row.currentDay) ?? 0,
      week: weekNumber(targetYear, targetMonth, row.currentDay),
      dow: getDow(row.prevYear, row.prevMonth, row.prevDay),
    }))
  }, [entry.dailyMapping, budgetDaily, targetYear, targetMonth])

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
        <NumTd>{fmtCurrency(wt.sales)}</NumTd>
        <NumTd>{wt.customers.toLocaleString('ja-JP')}</NumTd>
        <NumTd>{wt.customers > 0 ? fmtCurrency(wCustUnit) : '-'}</NumTd>
        <MbpTd />
        <NumTd>{fmtCurrency(wt.budget)}</NumTd>
        <NumTd>
          {wt.budget - wt.sales >= 0 ? '+' : ''}
          {fmtCurrency(wt.budget - wt.sales)}
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
            {row.prevMonth}/{row.prevDay}
          </MbpTd>
          <NumTd>{fmtCurrency(displaySales)}</NumTd>
          <NumTd>{displayCustomers.toLocaleString('ja-JP')}</NumTd>
          <NumTd>{displayCustomers > 0 ? fmtCurrency(custUnitPrice) : '-'}</NumTd>
          <MbpTd>
            {targetMonth}/{row.currentDay}
          </MbpTd>
          <NumTd>{fmtCurrency(displayBudget)}</NumTd>
          <RatioCell $ratio={diff >= 0 ? 1.1 : 0.9}>
            {diff >= 0 ? '+' : ''}
            {fmtCurrency(diff)}
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
        <NumTd>{fmtCurrency(entry.sales)}</NumTd>
        <NumTd>{entry.customers.toLocaleString('ja-JP')}</NumTd>
        <NumTd>{entry.customers > 0 ? fmtCurrency(prevTransactionValue) : '-'}</NumTd>
        <MbpTd />
        <NumTd>{fmtCurrency(budgetTotal)}</NumTd>
        <NumTd>
          {budgetTotal - entry.sales >= 0 ? '+' : ''}
          {fmtCurrency(budgetTotal - entry.sales)}
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
          <PeriodItem>前年: {periodLabels.prev}</PeriodItem>
          <PeriodItem>当年: {periodLabels.cur}</PeriodItem>
          {type === 'sameDow' && <PeriodItem>曜日オフセット: {dowOffset}日</PeriodItem>}
          <PeriodItem>対応日数: {entry.dailyMapping.length}日</PeriodItem>
        </PeriodInfo>

        {/* サマリーカード */}
        <SummaryGrid>
          <SummaryCard>
            <SummaryLabel>前年売上</SummaryLabel>
            <SummaryValue>{fmtCurrency(entry.sales)}</SummaryValue>
            <SummarySub>客数: {entry.customers.toLocaleString('ja-JP')}人</SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>前年客単価</SummaryLabel>
            <SummaryValue>{fmtCurrency(prevTransactionValue)}</SummaryValue>
            <SummarySub>売上 ÷ 客数</SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>当年月間予算</SummaryLabel>
            <SummaryValue>{fmtCurrency(budgetTotal)}</SummaryValue>
            <SummarySub>
              対前年: {formatPercent(budgetVsPrevYear)}
              {budgetVsPrevYear !== 1 &&
                ` (${budgetTotal - entry.sales >= 0 ? '+' : ''}${fmtCurrency(budgetTotal - entry.sales)})`}
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
                  {fmtCurrency(dowGap.estimatedImpact)}
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
                  {fmtCurrency(Math.round(estimatedUnitPriceImpact))}
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
