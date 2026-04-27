/**
 * PrevYearBudgetDetailPanel — 前年売上 vs 当年予算の詳細分析パネル
 *
 * 「今年の予算は去年に対してどう組まれているか」を可視化する。
 *
 * 機能:
 *   - サマリーカード（前年売上・予算・前年比・客数・客単価ギャップ）
 *   - 日別/累計 切り替え
 *   - 週間小計行（月曜〜日曜区切り）
 *   - 曜日ギャップ分析（手法切替: 平均/中央値/調整平均、両モード表示）
 *   - 実日法の証明テーブル（加わった日・失われた日を明示）
 *
 * @responsibility R:unclassified
 */
import { useState, useMemo, useCallback } from 'react'
import { useTheme } from 'styled-components'
import type { PrevYearMonthlyKpiEntry } from '@/application/comparison/comparisonTypes'
import type { DowGapAnalysis, DowGapMethod } from '@/domain/models/ComparisonContext'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { safeDivide, calculateTransactionValue } from '@/domain/calculations/utils'
import {
  getDow as getDowFromDate,
  weekNumber as weekNumberFromDate,
} from '@/domain/models/calendar'
import {
  aggregateWeeklyTotals,
  computeEstimatedCustomerGap,
  computeEstimatedUnitPriceImpact,
  buildPeriodLabels,
  buildBudgetDetailRows,
} from './PrevYearBudgetDetailPanel.vm'
import { toComparisonPoints } from '@/application/comparison/viewModels'
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
  MethodToggleBar,
  MethodButton,
} from './PrevYearBudgetDetailPanel.styles'
import { ActualDayProofTable } from './ActualDayProofTable'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

const METHOD_LABELS: Record<DowGapMethod, string> = {
  mean: '平均',
  median: '中央値',
  adjustedMean: '調整平均',
}

const METHOD_FORMULAS: Record<DowGapMethod, string> = {
  mean: 'Σ(曜日別売上合計÷日数 × 日数差)',
  median: 'Σ(曜日別売上中央値 × 日数差)',
  adjustedMean: 'Σ(外れ値除外平均 × 日数差)',
}

// getDow / weekNumber は domain/models/CalendarDate へ昇格済み（Phase A Step 1）。
// 本ファイルでは domain の CalendarDate-based API を使用する。

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
  const [gapMethod, setGapMethod] = useState<DowGapMethod>('median')
  const theme = useTheme()
  const { format: fmtCurrency } = useCurrencyFormat()

  const title = type === 'sameDow' ? '予算成長率（同曜日）' : '予算成長率（同日）'

  // dailyMapping → comparison ポイント変換（共通 VM 経由）
  const comparisonPoints = useMemo(
    () => toComparisonPoints(entry.dailyMapping),
    [entry.dailyMapping],
  )

  const periodLabels = useMemo(
    () => buildPeriodLabels(comparisonPoints, sourceYear, sourceMonth, targetYear, targetMonth),
    [comparisonPoints, sourceYear, sourceMonth, targetYear, targetMonth],
  )

  // 日別データ + 週番号 — ViewModel 経由（comparison ポイントベース）
  const baseRows = useMemo(
    () =>
      buildBudgetDetailRows(
        comparisonPoints,
        budgetDaily,
        targetYear,
        targetMonth,
        weekNumberFromDate,
        getDowFromDate,
      ),
    [comparisonPoints, budgetDaily, targetYear, targetMonth],
  )

  const weeklyTotals = useMemo(() => aggregateWeeklyTotals(baseRows), [baseRows])

  // サマリー指標
  const prevTransactionValue = calculateTransactionValue(entry.sales, entry.customers)
  const budgetVsPrevYear = safeDivide(budgetTotal, entry.sales, 0)

  // 手法別の影響額を取得
  const methodResult = dowGap.methodResults?.[gapMethod]

  // 曜日ギャップ影響額（選択手法、フォールバック: mean の estimatedImpact）
  const salesImpact = methodResult?.salesImpact ?? dowGap.estimatedImpact

  const estimatedCustomerGap = useMemo(
    () => computeEstimatedCustomerGap(dowGap, gapMethod),
    [dowGap, gapMethod],
  )

  const estimatedUnitPriceImpact = useMemo(
    () =>
      computeEstimatedUnitPriceImpact(
        dowGap,
        entry.sales,
        entry.customers,
        salesImpact,
        estimatedCustomerGap,
        prevTransactionValue,
      ),
    [dowGap, entry.sales, entry.customers, salesImpact, estimatedCustomerGap, prevTransactionValue],
  )

  // 実日法
  const actualDay = dowGap.actualDayImpact
  const hasActualDay = actualDay != null && actualDay.isValid

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
    const wCustUnit = calculateTransactionValue(wt.sales, wt.customers)
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
      const custUnitPrice = calculateTransactionValue(displaySales, displayCustomers)

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

    if (viewMode === 'daily' && prevWeek > 0) {
      elements.push(renderWeekSummary(prevWeek))
    }

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

  // 曜日ギャップ分析セクション（両モード共通、sameDate は平均法+実日法、sameDow は実日法のみ）
  const renderDowGapSection = () => {
    if (!dowGap.isValid) return null

    const showAverageMethod = type === 'sameDate'

    return (
      <>
        {showAverageMethod && (
          <>
            <SectionTitle>曜日構成の差異（同日比較の影響要因）</SectionTitle>

            {/* 手法切替 */}
            {dowGap.methodResults && (
              <MethodToggleBar>
                {(['mean', 'median', 'adjustedMean'] as const).map((m) => (
                  <MethodButton key={m} $active={gapMethod === m} onClick={() => setGapMethod(m)}>
                    {METHOD_LABELS[m]}
                  </MethodButton>
                ))}
              </MethodToggleBar>
            )}

            {/* 曜日別日数グリッド */}
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

            {/* 影響額サマリーカード */}
            <SummaryGrid>
              <SummaryCard>
                <SummaryLabel>曜日ギャップ影響額</SummaryLabel>
                <SummaryValue
                  style={{
                    color:
                      salesImpact >= 0 ? theme.colors.palette.success : theme.colors.palette.danger,
                  }}
                >
                  {salesImpact >= 0 ? '+' : ''}
                  {fmtCurrency(salesImpact)}
                </SummaryValue>
                <SummarySub>{METHOD_FORMULAS[gapMethod]}</SummarySub>
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
                <SummarySub>Σ(曜日別日平均客数 × 日数差)</SummarySub>
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

            {/* 曜日別統計（CV 表示） */}
            {dowGap.dowSalesStats && (
              <SummarySub style={{ marginBottom: 8 }}>
                曜日別CV:{' '}
                {dowGap.dowSalesStats
                  .map((s, i) => `${DOW_LABELS[i]}=${formatPercent(s.cv)}`)
                  .join(' ')}
              </SummarySub>
            )}
          </>
        )}

        {/* 実日法の証明テーブル — 両モード共通 */}
        {hasActualDay && <ActualDayProofTable type={type} actualDayImpact={actualDay} />}
      </>
    )
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
            <SummarySub>
              {entry.customers > 0
                ? `客数: ${entry.customers.toLocaleString('ja-JP')}人`
                : '客数: 未取込'}
            </SummarySub>
          </SummaryCard>
          <SummaryCard>
            <SummaryLabel>前年客単価</SummaryLabel>
            <SummaryValue>
              {entry.customers > 0 ? fmtCurrency(prevTransactionValue) : '-'}
            </SummaryValue>
            <SummarySub>
              {entry.customers > 0 ? '売上 ÷ 客数' : '客数未取込のため算出不可'}
            </SummarySub>
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
        </SummaryGrid>

        {/* 曜日ギャップ分析 — 両モード共通 */}
        {renderDowGapSection()}

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
