import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import { useMemo } from 'react'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import type { MetricId } from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'
import { buildBudgetTableRows } from './InsightTabBudget.vm'
import { getPrevYearDailySales } from '@/application/comparison/comparisonAccessors'
import {
  BudgetProgressCard,
  BudgetTrendChart,
  PrevYearComparisonChart,
  DualPeriodSlider,
  useDualPeriodRange,
} from '@/presentation/components/charts'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { ComparisonView } from '@/presentation/pages/Analysis/ComparisonView'
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import {
  ChartSection,
  ToggleSection,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
} from '@/presentation/pages/Insight/InsightPage.styles'

interface BudgetTabProps {
  readonly d: InsightData
  readonly r: StoreResult
  readonly onExplain: (metricId: MetricId) => void
}

export function BudgetTabContent({ d, r, onExplain }: BudgetTabProps) {
  // ページレベルの期間選択（全チャートで共有）
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(d.daysInMonth)

  // 前年日別売上 Map を構築（VM に application 依存を漏らさない）
  const prevYearDailyMap = useMemo(() => {
    const map = new Map<number, number>()
    if (!d.prevYear.hasPrevYear) return map
    for (let day = 1; day <= d.daysInMonth; day++) {
      const sales = getPrevYearDailySales(d.prevYear, d.year, d.month, day)
      if (sales > 0) map.set(day, sales)
    }
    return map
  }, [d.prevYear, d.year, d.month, d.daysInMonth])

  return (
    <>
      {d.selectedResults.length > 1 && (
        <ToggleSection>
          <ChipGroup>
            <Chip $active={d.viewMode === 'total'} onClick={() => d.setViewMode('total')}>
              合計モード
            </Chip>
            <Chip $active={d.viewMode === 'comparison'} onClick={() => d.setViewMode('comparison')}>
              比較モード
            </Chip>
          </ChipGroup>
        </ToggleSection>
      )}

      {d.viewMode === 'comparison' && d.selectedResults.length > 1 ? (
        <ComparisonView results={d.selectedResults} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard
              label="予算達成率"
              value={d.formatPercent(r.budgetProgressRate)}
              subText={`経過日予算累計比: ${r.elapsedDays}日分`}
              accent={palette.primary}
              onClick={() => onExplain('budgetProgressRate')}
              trend={
                r.budgetAchievementRate >= 1
                  ? { direction: 'up', label: '達成' }
                  : r.budgetAchievementRate >= 0.9
                    ? { direction: 'flat', label: '進行中' }
                    : { direction: 'down', label: '要注意' }
              }
            />
            <KpiCard
              label="予算消化率"
              value={d.formatPercent(r.budgetAchievementRate)}
              subText={`予算: ${d.fmtCurrency(r.budget)}`}
              accent={sc.positive}
              onClick={() => onExplain('budgetAchievementRate')}
            />
            <KpiCard
              label="月末予測売上"
              value={d.fmtCurrency(r.projectedSales)}
              accent={palette.infoDark}
              onClick={() => onExplain('projectedSales')}
              trend={
                r.projectedAchievement >= 1
                  ? { direction: 'up', label: '達成見込' }
                  : r.projectedAchievement >= 0.95
                    ? { direction: 'flat', label: '微妙' }
                    : { direction: 'down', label: '未達見込' }
              }
            />
            <KpiCard
              label="達成率予測"
              value={d.formatPercent(r.projectedAchievement)}
              subText={`残余予算: ${d.fmtCurrency(r.remainingBudget)}`}
              accent={sc.achievement(r.projectedAchievement)}
              onClick={() => onExplain('remainingBudget')}
            />
            <KpiCard
              label="粗利額予算"
              value={d.fmtCurrency(r.grossProfitBudget)}
              subText={`実績: ${d.fmtCurrency(d.actualGrossProfit)}`}
              accent={palette.purpleDark}
              badge={r.invMethodGrossProfit != null ? 'actual' : 'estimated'}
              formulaSummary={
                r.invMethodGrossProfit != null ? '売上 − 売上原価' : 'コア売上 − 推定原価'
              }
              onClick={
                r.invMethodGrossProfit != null ? () => onExplain('invMethodGrossProfit') : undefined
              }
            />
            <KpiCard
              label="粗利率"
              value={d.formatPercent(d.actualGrossProfitRate)}
              subText={`予算: ${d.formatPercent(r.grossProfitRateBudget)}`}
              accent={palette.pinkDark}
              badge={r.invMethodGrossProfitRate != null ? 'actual' : 'estimated'}
              formulaSummary={
                r.invMethodGrossProfitRate != null ? '粗利益 ÷ 総売上' : '推定マージン ÷ コア売上'
              }
              onClick={
                r.invMethodGrossProfitRate != null
                  ? () => onExplain('invMethodGrossProfitRate')
                  : () => onExplain('estMethodMarginRate')
              }
            />
            {d.prevYear.hasPrevYear && (
              <KpiCard
                label="比較期売上"
                value={d.fmtCurrency(d.prevYear.totalSales)}
                subText={`比較期比: ${d.prevYear.totalSales > 0 ? d.formatPercent(r.totalSales / d.prevYear.totalSales) : '-'}`}
                accent={palette.slate}
              />
            )}
            {d.prevYear.hasPrevYear && d.prevYear.totalSales > 0 && (
              <KpiCard
                label="比較期比"
                value={d.formatPercent(r.totalSales / d.prevYear.totalSales)}
                subText={`差額: ${d.fmtCurrency(r.totalSales - d.prevYear.totalSales)}`}
                accent={sc.cond(r.totalSales >= d.prevYear.totalSales)}
              />
            )}
          </KpiGrid>

          {/* L1: 予算進捗カード */}
          <BudgetProgressCard data={d.chartData} budget={r.budget} daysInMonth={d.daysInMonth} />

          {d.prevYear.hasPrevYear && (
            <ToggleSection>
              <ChipGroup>
                <Chip
                  $active={d.chartMode === 'budget-vs-actual'}
                  onClick={() => d.setChartMode('budget-vs-actual')}
                >
                  予算 vs 実績
                </Chip>
                <Chip
                  $active={d.chartMode === 'prev-year'}
                  onClick={() => d.setChartMode('prev-year')}
                >
                  当期 vs 比較期
                </Chip>
                <Chip
                  $active={d.chartMode === 'all-three'}
                  onClick={() => d.setChartMode('all-three')}
                >
                  予算 vs 実績 vs 比較期
                </Chip>
              </ChipGroup>
            </ToggleSection>
          )}
          {/* ページレベル期間スライダー（全チャートで共有） */}
          <DualPeriodSlider
            min={1}
            max={d.daysInMonth}
            p1Start={rangeStart}
            p1End={rangeEnd}
            onP1Change={setRange}
            p2Start={p2Start}
            p2End={p2End}
            onP2Change={onP2Change}
            p2Enabled={p2Enabled}
          />

          <ChartSection>
            <ChartErrorBoundary>
              {d.chartMode === 'budget-vs-actual' && (
                <BudgetTrendChart
                  data={d.chartData}
                  budget={r.budget}
                  year={d.year}
                  month={d.month}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                />
              )}
              {d.chartMode === 'prev-year' &&
                d.prevYear.hasPrevYear &&
                (() => {
                  const currentDaily = new Map<number, { sales: number }>()
                  for (const [day, s] of d.salesDaily) currentDaily.set(day, { sales: s })
                  return (
                    <PrevYearComparisonChart
                      currentDaily={currentDaily}
                      prevYearDaily={d.prevYear.daily}
                      daysInMonth={d.daysInMonth}
                      year={d.year}
                      month={d.month}
                      rangeStart={rangeStart}
                      rangeEnd={rangeEnd}
                    />
                  )
                })()}
              {d.chartMode === 'all-three' && (
                <BudgetTrendChart
                  data={d.chartData}
                  budget={r.budget}
                  showPrevYear
                  year={d.year}
                  month={d.month}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                />
              )}
              {d.chartMode !== 'budget-vs-actual' && !d.prevYear.hasPrevYear && (
                <BudgetTrendChart
                  data={d.chartData}
                  budget={r.budget}
                  year={d.year}
                  month={d.month}
                />
              )}
            </ChartErrorBoundary>
          </ChartSection>

          {/* 日別予算 vs 実績テーブル */}
          <Card>
            <CardTitle>日別予算 vs 実績</CardTitle>
            <TableWrapper>
              <Table>
                <thead>
                  <tr>
                    <Th>日</Th>
                    <Th>予算</Th>
                    <Th>実績</Th>
                    <Th>差異</Th>
                    <Th>売変額</Th>
                    <Th>累計予算</Th>
                    <Th>累計実績</Th>
                    <Th>予算差異</Th>
                    <Th>達成率</Th>
                    <Th>売変率</Th>
                    <Th>累計売変率</Th>
                    {d.prevYear.hasPrevYear && <Th>比較期</Th>}
                    {d.prevYear.hasPrevYear && <Th>比較期比</Th>}
                    {d.prevYear.hasPrevYear && <Th>比較期累計</Th>}
                    {d.prevYear.hasPrevYear && <Th>累計比較期比</Th>}
                  </tr>
                </thead>
                <tbody>
                  {buildBudgetTableRows(
                    d.chartData,
                    r.daily,
                    d.salesDaily,
                    r.budgetDaily,
                    prevYearDailyMap,
                  ).map((row) => (
                    <Tr key={row.day}>
                      <Td>{row.day}</Td>
                      <Td>{d.fmtCurrency(row.dayBudget)}</Td>
                      <Td>{d.fmtCurrency(row.daySales)}</Td>
                      <Td $positive={row.variance > 0} $negative={row.variance < 0}>
                        {row.variance > 0 ? '+' : ''}
                        {d.fmtCurrency(row.variance)}
                      </Td>
                      <Td>{d.fmtCurrency(row.dayDiscountAbsolute)}</Td>
                      <Td>{d.fmtCurrency(row.budgetCum)}</Td>
                      <Td>{d.fmtCurrency(row.actualCum)}</Td>
                      <Td $positive={row.budgetVariance > 0} $negative={row.budgetVariance < 0}>
                        {row.budgetVariance > 0 ? '+' : ''}
                        {d.fmtCurrency(row.budgetVariance)}
                      </Td>
                      <Td $positive={row.achievement >= 1} $negative={row.achievement < 0.9}>
                        {d.formatPercent(row.achievement)}
                      </Td>
                      <Td>{d.formatPercent(row.discountRate)}</Td>
                      <Td>{d.formatPercent(row.discountRateCum)}</Td>
                      {d.prevYear.hasPrevYear && (
                        <Td>{row.pyDaySales > 0 ? d.fmtCurrency(row.pyDaySales) : '-'}</Td>
                      )}
                      {d.prevYear.hasPrevYear && (
                        <Td
                          $positive={row.pyDayRatio >= 1}
                          $negative={row.pyDayRatio > 0 && row.pyDayRatio < 1}
                        >
                          {row.pyDaySales > 0 ? d.formatPercent(row.pyDayRatio) : '-'}
                        </Td>
                      )}
                      {d.prevYear.hasPrevYear && (
                        <Td>{row.cumPrevYear > 0 ? d.fmtCurrency(row.cumPrevYear) : '-'}</Td>
                      )}
                      {d.prevYear.hasPrevYear && (
                        <Td
                          $positive={row.pyCumRatio >= 1}
                          $negative={row.pyCumRatio > 0 && row.pyCumRatio < 1}
                        >
                          {row.cumPrevYear > 0 ? d.formatPercent(row.pyCumRatio) : '-'}
                        </Td>
                      )}
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Card>
        </>
      )}
    </>
  )
}
