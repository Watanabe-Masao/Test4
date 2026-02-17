import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid } from '@/presentation/components/common'
import { BudgetVsActualChart } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
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

export function AnalysisPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, storeName } = useStoreSelection()

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="予算分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const today = new Date()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

  // 予算分析
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

  // 累計データ
  const chartData = []
  let cumActual = 0
  let cumBudget = 0
  for (let d = 1; d <= daysInMonth; d++) {
    cumActual += salesDaily.get(d) ?? 0
    cumBudget += r.budgetDaily.get(d) ?? 0
    chartData.push({ day: d, actualCum: cumActual, budgetCum: cumBudget })
  }

  return (
    <MainContent title="予算分析" storeName={storeName}>
      <KpiGrid>
        <KpiCard
          label="予算達成率"
          value={formatPercent(analysis.budgetAchievementRate)}
          subText={`予算: ${formatCurrency(r.budget)}`}
          accent="#6366f1"
        />
        <KpiCard
          label="予算消化率"
          value={formatPercent(analysis.budgetProgressRate)}
          subText={`経過: ${r.elapsedDays}日`}
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
      </KpiGrid>

      <ChartSection>
        <BudgetVsActualChart data={chartData} budget={r.budget} />
      </ChartSection>

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
                <Th>累計予算</Th>
                <Th>累計実績</Th>
                <Th>達成率</Th>
              </tr>
            </thead>
            <tbody>
              {chartData.filter((d) => d.actualCum > 0 || d.budgetCum > 0).map((d) => {
                const daySales = salesDaily.get(d.day) ?? 0
                const dayBudget = r.budgetDaily.get(d.day) ?? 0
                const variance = daySales - dayBudget
                const achievement = d.budgetCum > 0 ? d.actualCum / d.budgetCum : 0
                return (
                  <Tr key={d.day}>
                    <Td>{d.day}</Td>
                    <Td>{formatCurrency(dayBudget)}</Td>
                    <Td>{formatCurrency(daySales)}</Td>
                    <Td $positive={variance > 0} $negative={variance < 0}>
                      {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                    </Td>
                    <Td>{formatCurrency(d.budgetCum)}</Td>
                    <Td>{formatCurrency(d.actualCum)}</Td>
                    <Td $positive={achievement >= 1} $negative={achievement < 0.9}>
                      {formatPercent(achievement)}
                    </Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrapper>
      </Card>
    </MainContent>
  )
}
