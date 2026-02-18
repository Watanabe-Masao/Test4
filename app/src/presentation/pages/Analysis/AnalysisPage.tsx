import { useState } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { BudgetVsActualChart, PrevYearComparisonChart } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import { ChartSection, EmptyState, TableWrapper, Table, Th, Td, Tr, ToggleSection } from './AnalysisPage.styles'
import { buildAnalysis, ComparisonView } from './ComparisonView'

type ViewMode = 'total' | 'comparison'
type ChartMode = 'budget-vs-actual' | 'prev-year' | 'all-three'

export function AnalysisPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName } = useStoreSelection()
  const prevYear = usePrevYearData()
  const [viewMode, setViewMode] = useState<ViewMode>('total')
  const [chartMode, setChartMode] = useState<ChartMode>('budget-vs-actual')

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="予算分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult

  // 予算分析
  const { salesDaily, analysis } = buildAnalysis(r, daysInMonth)

  // 累計データ
  const chartData = []
  let cumActual = 0
  let cumBudget = 0
  let cumPy = 0
  for (let d = 1; d <= daysInMonth; d++) {
    cumActual += salesDaily.get(d) ?? 0
    cumBudget += r.budgetDaily.get(d) ?? 0
    cumPy += prevYear.daily.get(d)?.sales ?? 0
    chartData.push({
      day: d,
      actualCum: cumActual,
      budgetCum: cumBudget,
      prevYearCum: prevYear.hasPrevYear ? cumPy : null,
    })
  }

  // 粗利実績
  const actualGrossProfit = r.invMethodGrossProfit ?? r.estMethodMargin
  const actualGrossProfitRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate

  return (
    <MainContent title="予算分析" storeName={storeName}>
      {/* モード切替 */}
      {selectedResults.length > 1 && (
        <ToggleSection>
          <ChipGroup>
            <Chip $active={viewMode === 'total'} onClick={() => setViewMode('total')}>
              合計モード
            </Chip>
            <Chip $active={viewMode === 'comparison'} onClick={() => setViewMode('comparison')}>
              比較モード
            </Chip>
          </ChipGroup>
        </ToggleSection>
      )}

      {viewMode === 'comparison' && selectedResults.length > 1 ? (
        <ComparisonView results={selectedResults} daysInMonth={daysInMonth} />
      ) : (
        <>
          {/* KPI */}
          <KpiGrid>
            <KpiCard
              label="予算達成率"
              value={formatPercent(analysis.budgetProgressRate)}
              subText={`経過日予算累計比: ${r.elapsedDays}日分`}
              accent="#6366f1"
            />
            <KpiCard
              label="予算消化率"
              value={formatPercent(analysis.budgetAchievementRate)}
              subText={`予算: ${formatCurrency(r.budget)}`}
              accent="#22c55e"
            />
            <KpiCard
              label="月末予測売上"
              value={formatCurrency(analysis.projectedSales)}
              accent="#0ea5e9"
            />
            <KpiCard
              label="達成率予測"
              value={formatPercent(analysis.projectedAchievement)}
              subText={`残余予算: ${formatCurrency(analysis.remainingBudget)}`}
              accent="#f59e0b"
            />
            <KpiCard
              label="粗利額予算"
              value={formatCurrency(r.grossProfitBudget)}
              subText={`実績: ${formatCurrency(actualGrossProfit)}`}
              accent="#8b5cf6"
            />
            <KpiCard
              label="粗利率"
              value={formatPercent(actualGrossProfitRate)}
              subText={`予算: ${formatPercent(r.grossProfitRateBudget)}`}
              accent="#ec4899"
            />
            {prevYear.hasPrevYear && (
              <KpiCard
                label="前年同曜日売上"
                value={formatCurrency(prevYear.totalSales)}
                subText={`前年同曜日比: ${prevYear.totalSales > 0 ? formatPercent(r.totalSales / prevYear.totalSales) : '-'}`}
                accent="#9ca3af"
              />
            )}
            {prevYear.hasPrevYear && prevYear.totalSales > 0 && (
              <KpiCard
                label="前年同曜日比"
                value={formatPercent(r.totalSales / prevYear.totalSales)}
                subText={`差額: ${formatCurrency(r.totalSales - prevYear.totalSales)}`}
                accent={r.totalSales >= prevYear.totalSales ? '#22c55e' : '#ef4444'}
              />
            )}
          </KpiGrid>

          {/* チャート切替 */}
          {prevYear.hasPrevYear && (
            <ToggleSection>
              <ChipGroup>
                <Chip $active={chartMode === 'budget-vs-actual'} onClick={() => setChartMode('budget-vs-actual')}>
                  予算 vs 実績
                </Chip>
                <Chip $active={chartMode === 'prev-year'} onClick={() => setChartMode('prev-year')}>
                  当年 vs 前年同曜日
                </Chip>
                <Chip $active={chartMode === 'all-three'} onClick={() => setChartMode('all-three')}>
                  予算 vs 実績 vs 前年
                </Chip>
              </ChipGroup>
            </ToggleSection>
          )}
          <ChartSection>
            {chartMode === 'budget-vs-actual' && (
              <BudgetVsActualChart data={chartData} budget={r.budget} />
            )}
            {chartMode === 'prev-year' && prevYear.hasPrevYear && (() => {
              const currentDaily = new Map<number, { sales: number }>()
              for (const [d, s] of salesDaily) currentDaily.set(d, { sales: s })
              return (
                <PrevYearComparisonChart
                  currentDaily={currentDaily}
                  prevYearDaily={prevYear.daily}
                  daysInMonth={daysInMonth}
                />
              )
            })()}
            {chartMode === 'all-three' && (
              <BudgetVsActualChart data={chartData} budget={r.budget} showPrevYear />
            )}
            {chartMode !== 'budget-vs-actual' && !prevYear.hasPrevYear && (
              <BudgetVsActualChart data={chartData} budget={r.budget} />
            )}
          </ChartSection>

          {/* 日別テーブル */}
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
                    {prevYear.hasPrevYear && <Th>前年同曜日</Th>}
                    {prevYear.hasPrevYear && <Th>前年比</Th>}
                    {prevYear.hasPrevYear && <Th>前年同曜日累計</Th>}
                    {prevYear.hasPrevYear && <Th>累計前年比</Th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cumDiscount = 0
                    let cumGrossSales = 0
                    let cumPrevYear = 0
                    return chartData.filter((d) => d.actualCum > 0 || d.budgetCum > 0).map((d) => {
                      const dailyRec = r.daily.get(d.day)
                      const daySales = salesDaily.get(d.day) ?? 0
                      const dayBudget = r.budgetDaily.get(d.day) ?? 0
                      const variance = daySales - dayBudget
                      const achievement = d.budgetCum > 0 ? d.actualCum / d.budgetCum : 0

                      // 売変額（日別）
                      const dayDiscountAbsolute = dailyRec?.discountAbsolute ?? 0

                      // 累計売変・累計粗売上
                      cumDiscount += dayDiscountAbsolute
                      cumGrossSales += dailyRec?.grossSales ?? 0

                      // 売変率 = 累計売変額 / 累計粗売上
                      const discountRateCum = safeDivide(cumDiscount, cumGrossSales, 0)

                      // 累計売変率 = running cumulative discount rate
                      const cumDiscountRate = discountRateCum

                      // 予算差異（累計）
                      const budgetVariance = d.actualCum - d.budgetCum

                      // 前年データ
                      const pyDaySales = prevYear.daily.get(d.day)?.sales ?? 0
                      cumPrevYear += pyDaySales
                      const pyDayRatio = pyDaySales > 0 ? daySales / pyDaySales : 0
                      const pyCumRatio = cumPrevYear > 0 ? d.actualCum / cumPrevYear : 0

                      return (
                        <Tr key={d.day}>
                          <Td>{d.day}</Td>
                          <Td>{formatCurrency(dayBudget)}</Td>
                          <Td>{formatCurrency(daySales)}</Td>
                          <Td $positive={variance > 0} $negative={variance < 0}>
                            {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                          </Td>
                          <Td>{formatCurrency(dayDiscountAbsolute)}</Td>
                          <Td>{formatCurrency(d.budgetCum)}</Td>
                          <Td>{formatCurrency(d.actualCum)}</Td>
                          <Td $positive={budgetVariance > 0} $negative={budgetVariance < 0}>
                            {budgetVariance > 0 ? '+' : ''}{formatCurrency(budgetVariance)}
                          </Td>
                          <Td $positive={achievement >= 1} $negative={achievement < 0.9}>
                            {formatPercent(achievement)}
                          </Td>
                          <Td>{formatPercent(discountRateCum)}</Td>
                          <Td>{formatPercent(cumDiscountRate)}</Td>
                          {prevYear.hasPrevYear && <Td>{pyDaySales > 0 ? formatCurrency(pyDaySales) : '-'}</Td>}
                          {prevYear.hasPrevYear && <Td $positive={pyDayRatio >= 1} $negative={pyDayRatio > 0 && pyDayRatio < 1}>{pyDaySales > 0 ? formatPercent(pyDayRatio) : '-'}</Td>}
                          {prevYear.hasPrevYear && <Td>{cumPrevYear > 0 ? formatCurrency(cumPrevYear) : '-'}</Td>}
                          {prevYear.hasPrevYear && <Td $positive={pyCumRatio >= 1} $negative={pyCumRatio > 0 && pyCumRatio < 1}>{cumPrevYear > 0 ? formatPercent(pyCumRatio) : '-'}</Td>}
                        </Tr>
                      )
                    })
                  })()}
                </tbody>
              </Table>
            </TableWrapper>
          </Card>
        </>
      )}
    </MainContent>
  )
}
