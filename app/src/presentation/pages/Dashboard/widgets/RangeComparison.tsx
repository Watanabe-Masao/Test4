import { sc } from '@/presentation/theme/semanticColors'
import { formatCurrency, formatPercent, formatPointDiff } from '@/domain/calculations/utils'
import type { PrevYearData } from '@/application/hooks'
import {
  RangeSummaryPanel, RangeSummaryTitle, RangeSummaryGrid,
  RangeSummaryItem, RangeSummaryItemLabel, RangeSummaryItemValue,
  RangeCompareContainer, RangeColumn, RangeColumnHeader, RangeColumnDot, RangeColumnTitle,
  RangeMetricRow, RangeMetricLabel, RangeMetricValue,
  RangeCenterCol, RangeCenterHeader,
  CompareBarRow, CompareBarLabel, CompareBarDiff, CompareBarTrack, CompareBarSegment,
  CompareIndicator, CompareIndicatorValue, CompareIndicatorLabel,
} from '../DashboardPage.styles'

export interface RangeData {
  start: number
  end: number
  budget: number
  sales: number
  diff: number
  ach: number
  pySales: number
  pyRatio: number
  salesDaysCount: number
  avgDaily: number
}

/** 千円表記 (コンパクト) */
function fmtSen(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen.toLocaleString()}千`
}

interface RangeComparisonPanelProps {
  rangeAData: RangeData | null
  rangeBData: RangeData | null
  prevYear: PrevYearData
}

export function RangeComparisonPanel({ rangeAData, rangeBData, prevYear }: RangeComparisonPanelProps) {
  // Single range summary
  const singleRange = rangeAData && !rangeBData ? rangeAData : !rangeAData && rangeBData ? rangeBData : null
  if (singleRange) {
    return (
      <RangeSummaryPanel>
        <RangeSummaryTitle>期間集計: {singleRange.start}～{singleRange.end}日（{singleRange.salesDaysCount}営業日）</RangeSummaryTitle>
        <div style={{ padding: '16px' }}>
          <RangeSummaryGrid>
            <RangeSummaryItem>
              <RangeSummaryItemLabel>売上予算</RangeSummaryItemLabel>
              <RangeSummaryItemValue>{formatCurrency(singleRange.budget)}</RangeSummaryItemValue>
            </RangeSummaryItem>
            <RangeSummaryItem>
              <RangeSummaryItemLabel>売上実績</RangeSummaryItemLabel>
              <RangeSummaryItemValue>{formatCurrency(singleRange.sales)}</RangeSummaryItemValue>
            </RangeSummaryItem>
            <RangeSummaryItem>
              <RangeSummaryItemLabel>予算差異</RangeSummaryItemLabel>
              <RangeSummaryItemValue $color={sc.cond(singleRange.diff >= 0)}>{formatCurrency(singleRange.diff)}</RangeSummaryItemValue>
            </RangeSummaryItem>
            <RangeSummaryItem>
              <RangeSummaryItemLabel>予算達成率</RangeSummaryItemLabel>
              <RangeSummaryItemValue $color={sc.cond(singleRange.ach >= 1)}>{formatPercent(singleRange.ach)}</RangeSummaryItemValue>
            </RangeSummaryItem>
            {prevYear.hasPrevYear && singleRange.pySales > 0 && (
              <>
                <RangeSummaryItem>
                  <RangeSummaryItemLabel>前年同期売上</RangeSummaryItemLabel>
                  <RangeSummaryItemValue>{formatCurrency(singleRange.pySales)}</RangeSummaryItemValue>
                </RangeSummaryItem>
                <RangeSummaryItem>
                  <RangeSummaryItemLabel>前年比</RangeSummaryItemLabel>
                  <RangeSummaryItemValue $color={sc.cond(singleRange.pyRatio >= 1)}>{formatPercent(singleRange.pyRatio)}</RangeSummaryItemValue>
                </RangeSummaryItem>
              </>
            )}
            <RangeSummaryItem>
              <RangeSummaryItemLabel>日平均売上</RangeSummaryItemLabel>
              <RangeSummaryItemValue>{formatCurrency(singleRange.avgDaily)}</RangeSummaryItemValue>
            </RangeSummaryItem>
          </RangeSummaryGrid>
        </div>
      </RangeSummaryPanel>
    )
  }

  if (!rangeAData || !rangeBData) return null

  // 3-column compare
  const cmpColor = (a: number, b: number) => a > b ? sc.positive : a < b ? sc.negative : sc.neutral
  const barPct = (a: number, b: number) => {
    const total = a + b
    if (total === 0) return { a: 50, b: 50 }
    return { a: Math.round(a / total * 100), b: 100 - Math.round(a / total * 100) }
  }
  const salesBar = barPct(rangeAData.sales, rangeBData.sales)
  const budgetBar = barPct(rangeAData.budget, rangeBData.budget)
  const avgBar = barPct(rangeAData.avgDaily, rangeBData.avgDaily)
  const salesDiff = rangeAData.sales - rangeBData.sales
  const avgDiff = rangeAData.avgDaily - rangeBData.avgDaily
  const achDiff = rangeAData.ach - rangeBData.ach
  const pyA = rangeAData.pySales, pyB = rangeBData.pySales
  const pyBar = barPct(pyA, pyB)

  const renderMetricCol = (d: RangeData) => (
    <>
      <RangeMetricRow>
        <RangeMetricLabel>売上予算</RangeMetricLabel>
        <RangeMetricValue>{formatCurrency(d.budget)}</RangeMetricValue>
      </RangeMetricRow>
      <RangeMetricRow>
        <RangeMetricLabel>売上実績</RangeMetricLabel>
        <RangeMetricValue>{formatCurrency(d.sales)}</RangeMetricValue>
      </RangeMetricRow>
      <RangeMetricRow>
        <RangeMetricLabel>予算差異</RangeMetricLabel>
        <RangeMetricValue $color={sc.cond(d.diff >= 0)}>{formatCurrency(d.diff)}</RangeMetricValue>
      </RangeMetricRow>
      <RangeMetricRow>
        <RangeMetricLabel>予算達成率</RangeMetricLabel>
        <RangeMetricValue $color={sc.cond(d.ach >= 1)}>{formatPercent(d.ach)}</RangeMetricValue>
      </RangeMetricRow>
      {prevYear.hasPrevYear && d.pySales > 0 && (
        <>
          <RangeMetricRow>
            <RangeMetricLabel>前年同期</RangeMetricLabel>
            <RangeMetricValue>{formatCurrency(d.pySales)}</RangeMetricValue>
          </RangeMetricRow>
          <RangeMetricRow>
            <RangeMetricLabel>前年比</RangeMetricLabel>
            <RangeMetricValue $color={sc.cond(d.pyRatio >= 1)}>{formatPercent(d.pyRatio)}</RangeMetricValue>
          </RangeMetricRow>
        </>
      )}
      <RangeMetricRow>
        <RangeMetricLabel>日平均売上</RangeMetricLabel>
        <RangeMetricValue>{formatCurrency(d.avgDaily)}</RangeMetricValue>
      </RangeMetricRow>
    </>
  )

  return (
    <RangeSummaryPanel>
      <RangeSummaryTitle>
        期間比較分析: {rangeAData.start}～{rangeAData.end}日 vs {rangeBData.start}～{rangeBData.end}日
      </RangeSummaryTitle>
      <RangeCompareContainer>
        {/* Left: Period A */}
        <RangeColumn>
          <RangeColumnHeader $color="#f59e0b">
            <RangeColumnDot $color="#f59e0b" />
            <RangeColumnTitle>期間A: {rangeAData.start}～{rangeAData.end}日（{rangeAData.salesDaysCount}営業日）</RangeColumnTitle>
          </RangeColumnHeader>
          {renderMetricCol(rangeAData)}
        </RangeColumn>

        {/* Center: Visual Comparison */}
        <RangeCenterCol>
          <RangeCenterHeader>
            <RangeColumnTitle>A vs B 比較</RangeColumnTitle>
          </RangeCenterHeader>

          <CompareBarRow>
            <CompareBarLabel>
              <span>売上実績</span>
              <CompareBarDiff $color={cmpColor(rangeAData.sales, rangeBData.sales)}>
                {salesDiff >= 0 ? '+' : ''}{formatCurrency(salesDiff)}
              </CompareBarDiff>
            </CompareBarLabel>
            <CompareBarTrack>
              <CompareBarSegment $width={`${salesBar.a}%`} $color="#f59e0b">
                A {fmtSen(rangeAData.sales)}
              </CompareBarSegment>
              <CompareBarSegment $width={`${salesBar.b}%`} $color="#6366f1">
                B {fmtSen(rangeBData.sales)}
              </CompareBarSegment>
            </CompareBarTrack>
            <CompareIndicator $color={cmpColor(rangeAData.sales, rangeBData.sales)}>
              <CompareIndicatorValue $color={cmpColor(rangeAData.sales, rangeBData.sales)}>
                {rangeBData.sales > 0 ? formatPercent(rangeAData.sales / rangeBData.sales) : '-'}
              </CompareIndicatorValue>
              <CompareIndicatorLabel>A/B 売上比率</CompareIndicatorLabel>
            </CompareIndicator>
          </CompareBarRow>

          <CompareBarRow>
            <CompareBarLabel>
              <span>売上予算</span>
              <CompareBarDiff $color={cmpColor(rangeAData.budget, rangeBData.budget)}>
                {rangeAData.budget - rangeBData.budget >= 0 ? '+' : ''}{formatCurrency(rangeAData.budget - rangeBData.budget)}
              </CompareBarDiff>
            </CompareBarLabel>
            <CompareBarTrack>
              <CompareBarSegment $width={`${budgetBar.a}%`} $color="rgba(245,158,11,0.6)">
                A {fmtSen(rangeAData.budget)}
              </CompareBarSegment>
              <CompareBarSegment $width={`${budgetBar.b}%`} $color="rgba(99,102,241,0.6)">
                B {fmtSen(rangeBData.budget)}
              </CompareBarSegment>
            </CompareBarTrack>
          </CompareBarRow>

          <CompareBarRow>
            <CompareBarLabel>
              <span>日平均売上</span>
              <CompareBarDiff $color={cmpColor(rangeAData.avgDaily, rangeBData.avgDaily)}>
                {avgDiff >= 0 ? '+' : ''}{formatCurrency(avgDiff)}
              </CompareBarDiff>
            </CompareBarLabel>
            <CompareBarTrack>
              <CompareBarSegment $width={`${avgBar.a}%`} $color="#f59e0b">
                A {fmtSen(rangeAData.avgDaily)}
              </CompareBarSegment>
              <CompareBarSegment $width={`${avgBar.b}%`} $color="#6366f1">
                B {fmtSen(rangeBData.avgDaily)}
              </CompareBarSegment>
            </CompareBarTrack>
          </CompareBarRow>

          <CompareBarRow>
            <CompareBarLabel>
              <span>予算達成率</span>
              <CompareBarDiff $color={cmpColor(rangeAData.ach, rangeBData.ach)}>
                {formatPointDiff(achDiff)}
              </CompareBarDiff>
            </CompareBarLabel>
            <CompareBarTrack>
              <CompareBarSegment
                $width={`${Math.min(rangeAData.ach * 50, 100)}%`}
                $color={rangeAData.ach >= 1 ? sc.positive : '#f59e0b'}
              >
                A {formatPercent(rangeAData.ach, 0)}
              </CompareBarSegment>
              <CompareBarSegment
                $width={`${Math.min(rangeBData.ach * 50, 100)}%`}
                $color={rangeBData.ach >= 1 ? sc.positive : '#6366f1'}
              >
                B {formatPercent(rangeBData.ach, 0)}
              </CompareBarSegment>
            </CompareBarTrack>
          </CompareBarRow>

          {prevYear.hasPrevYear && (pyA > 0 || pyB > 0) && (
            <CompareBarRow>
              <CompareBarLabel>
                <span>前年同期売上</span>
                <CompareBarDiff $color={cmpColor(pyA, pyB)}>
                  {pyA - pyB >= 0 ? '+' : ''}{formatCurrency(pyA - pyB)}
                </CompareBarDiff>
              </CompareBarLabel>
              <CompareBarTrack>
                <CompareBarSegment $width={`${pyBar.a}%`} $color="rgba(245,158,11,0.5)">
                  A {fmtSen(pyA)}
                </CompareBarSegment>
                <CompareBarSegment $width={`${pyBar.b}%`} $color="rgba(99,102,241,0.5)">
                  B {fmtSen(pyB)}
                </CompareBarSegment>
              </CompareBarTrack>
              <div style={{ display: 'flex', gap: '8px' }}>
                <CompareIndicator $color={cmpColor(rangeAData.pyRatio, 1)}>
                  <CompareIndicatorValue $color={cmpColor(rangeAData.pyRatio, 1)}>
                    A前年比 {formatPercent(rangeAData.pyRatio, 0)}
                  </CompareIndicatorValue>
                </CompareIndicator>
                <CompareIndicator $color={cmpColor(rangeBData.pyRatio, 1)}>
                  <CompareIndicatorValue $color={cmpColor(rangeBData.pyRatio, 1)}>
                    B前年比 {formatPercent(rangeBData.pyRatio, 0)}
                  </CompareIndicatorValue>
                </CompareIndicator>
              </div>
            </CompareBarRow>
          )}
        </RangeCenterCol>

        {/* Right: Period B */}
        <RangeColumn>
          <RangeColumnHeader $color="#6366f1">
            <RangeColumnDot $color="#6366f1" />
            <RangeColumnTitle>期間B: {rangeBData.start}～{rangeBData.end}日（{rangeBData.salesDaysCount}営業日）</RangeColumnTitle>
          </RangeColumnHeader>
          {renderMetricCol(rangeBData)}
        </RangeColumn>
      </RangeCompareContainer>
    </RangeSummaryPanel>
  )
}
