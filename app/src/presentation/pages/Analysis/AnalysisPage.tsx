import { useState } from 'react'
import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid, Chip, ChipGroup } from '@/presentation/components/common'
import { BudgetVsActualChart } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency, formatPercent, safeDivide } from '@/domain/calculations/utils'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import type { StoreResult } from '@/domain/models/StoreResult'
import styled from 'styled-components'

const ChartSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-top: ${({ theme }) => theme.spacing[6]};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const Th = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;

  &:first-child { text-align: center; }
`

const Td = styled.td<{ $positive?: boolean; $negative?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $positive, $negative, theme }) =>
    $positive ? theme.colors.palette.success : $negative ? theme.colors.palette.danger : theme.colors.text};

  &:first-child { text-align: center; color: ${({ theme }) => theme.colors.text2}; }
`

const Tr = styled.tr`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

const ToggleSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

type ViewMode = 'total' | 'comparison'

function buildAnalysis(r: StoreResult, daysInMonth: number) {
  const salesDaily = new Map<number, number>()
  for (const [d, rec] of r.daily) {
    salesDaily.set(d, rec.sales)
  }
  const analysis = calculateBudgetAnalysis({
    totalSales: r.totalSales,
    budget: r.budget,
    budgetDaily: r.budgetDaily,
    salesDaily,
    elapsedDays: r.elapsedDays,
    salesDays: r.salesDays,
    daysInMonth,
  })
  return { salesDaily, analysis }
}

export function AnalysisPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, selectedResults, storeName } = useStoreSelection()
  const [viewMode, setViewMode] = useState<ViewMode>('total')

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
  for (let d = 1; d <= daysInMonth; d++) {
    cumActual += salesDaily.get(d) ?? 0
    cumBudget += r.budgetDaily.get(d) ?? 0
    chartData.push({ day: d, actualCum: cumActual, budgetCum: cumBudget })
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
          </KpiGrid>

          {/* チャート */}
          <ChartSection>
            <BudgetVsActualChart data={chartData} budget={r.budget} />
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
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cumDiscount = 0
                    let cumGrossSales = 0
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

/** 比較モード: 店舗別予算メトリクスを横並び表示 */
function ComparisonView({ results, daysInMonth }: { results: StoreResult[]; daysInMonth: number }) {
  const storeAnalyses = results.map((r) => {
    const { analysis } = buildAnalysis(r, daysInMonth)
    const actualGrossProfit = r.invMethodGrossProfit ?? r.estMethodMargin
    const actualGrossProfitRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
    return { r, analysis, actualGrossProfit, actualGrossProfitRate }
  })

  return (
    <Card>
      <CardTitle>店舗別予算比較</CardTitle>
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th style={{ textAlign: 'left' }}>指標</Th>
              {storeAnalyses.map(({ r }) => (
                <Th key={r.storeId}>{r.storeId}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>予算</Td>
              {storeAnalyses.map(({ r }) => (
                <Td key={r.storeId}>{formatCurrency(r.budget)}</Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>実績売上</Td>
              {storeAnalyses.map(({ r }) => (
                <Td key={r.storeId}>{formatCurrency(r.totalSales)}</Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>予算達成率</Td>
              {storeAnalyses.map(({ r, analysis }) => (
                <Td
                  key={r.storeId}
                  $positive={analysis.budgetProgressRate >= 1}
                  $negative={analysis.budgetProgressRate < 0.9}
                >
                  {formatPercent(analysis.budgetProgressRate)}
                </Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>予算消化率</Td>
              {storeAnalyses.map(({ r, analysis }) => (
                <Td key={r.storeId}>{formatPercent(analysis.budgetAchievementRate)}</Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>月末予測売上</Td>
              {storeAnalyses.map(({ r, analysis }) => (
                <Td key={r.storeId}>{formatCurrency(analysis.projectedSales)}</Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>達成率予測</Td>
              {storeAnalyses.map(({ r, analysis }) => (
                <Td
                  key={r.storeId}
                  $positive={analysis.projectedAchievement >= 1}
                  $negative={analysis.projectedAchievement < 0.9}
                >
                  {formatPercent(analysis.projectedAchievement)}
                </Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>残余予算</Td>
              {storeAnalyses.map(({ r, analysis }) => (
                <Td
                  key={r.storeId}
                  $positive={analysis.remainingBudget < 0}
                  $negative={analysis.remainingBudget > 0}
                >
                  {formatCurrency(analysis.remainingBudget)}
                </Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>粗利額予算</Td>
              {storeAnalyses.map(({ r }) => (
                <Td key={r.storeId}>{formatCurrency(r.grossProfitBudget)}</Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>粗利額実績</Td>
              {storeAnalyses.map(({ r, actualGrossProfit }) => (
                <Td key={r.storeId}>{formatCurrency(actualGrossProfit)}</Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>粗利率予算</Td>
              {storeAnalyses.map(({ r }) => (
                <Td key={r.storeId}>{formatPercent(r.grossProfitRateBudget)}</Td>
              ))}
            </Tr>
            <Tr>
              <Td style={{ textAlign: 'left', fontWeight: 600 }}>粗利率実績</Td>
              {storeAnalyses.map(({ r, actualGrossProfitRate }) => (
                <Td key={r.storeId}>{formatPercent(actualGrossProfitRate)}</Td>
              ))}
            </Tr>
          </tbody>
        </Table>
      </TableWrapper>
    </Card>
  )
}
