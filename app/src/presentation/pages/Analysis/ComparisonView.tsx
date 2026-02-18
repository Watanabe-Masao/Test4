import { Card, CardTitle } from '@/presentation/components/common'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import type { StoreResult } from '@/domain/models/StoreResult'
import { TableWrapper, Table, Th, Td, Tr } from './AnalysisPage.styles'

export function buildAnalysis(r: StoreResult, daysInMonth: number) {
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

/** 比較モード: 店舗別予算メトリクスを横並び表示 */
export function ComparisonView({ results, daysInMonth }: { results: StoreResult[]; daysInMonth: number }) {
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
