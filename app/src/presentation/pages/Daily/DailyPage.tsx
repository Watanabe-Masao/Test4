import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle } from '@/presentation/components/common'
import { DailySalesChart, GrossProfitRateChart } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { useAppState } from '@/application/context'
import { formatCurrency } from '@/domain/calculations/utils'
import styled from 'styled-components'

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
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
  position: sticky;
  top: 0;
  z-index: 5;

  &:first-child {
    text-align: center;
    position: sticky;
    left: 0;
    z-index: 6;
    background: ${({ theme }) => theme.colors.bg2};
  }
`

const Td = styled.td<{ $negative?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $negative, theme }) => $negative ? theme.colors.palette.danger : theme.colors.text};

  &:first-child {
    text-align: center;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text2};
    position: sticky;
    left: 0;
    background: ${({ theme }) => theme.colors.bg3};
    z-index: 3;
  }
`

const Tr = styled.tr`
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

export function DailyPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName } = useStoreSelection()
  const { settings } = useAppState()

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="日別トレンド" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult

  // 日別データをソート
  const days = Array.from(r.daily.entries()).sort(([a], [b]) => a - b)

  return (
    <MainContent title="日別トレンド" storeName={storeName}>
      <ChartGrid>
        <DailySalesChart daily={r.daily} daysInMonth={daysInMonth} />
        <GrossProfitRateChart
          daily={r.daily}
          daysInMonth={daysInMonth}
          targetRate={settings.targetGrossProfitRate}
          warningRate={settings.warningThreshold}
        />
      </ChartGrid>

      <Card>
        <CardTitle>日別明細</CardTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>日</Th>
                <Th>売上</Th>
                <Th>仕入原価</Th>
                <Th>仕入売価</Th>
                <Th>店間入</Th>
                <Th>店間出</Th>
                <Th>部門間入</Th>
                <Th>部門間出</Th>
                <Th>花</Th>
                <Th>産直</Th>
                <Th>売変額</Th>
                <Th>消耗品</Th>
              </tr>
            </thead>
            <tbody>
              {days.map(([day, rec]) => (
                <Tr key={day}>
                  <Td>{day}</Td>
                  <Td>{formatCurrency(rec.sales)}</Td>
                  <Td>{formatCurrency(rec.purchase.cost)}</Td>
                  <Td>{formatCurrency(rec.purchase.price)}</Td>
                  <Td>{rec.interStoreIn.cost !== 0 ? formatCurrency(rec.interStoreIn.cost) : '-'}</Td>
                  <Td $negative={rec.interStoreOut.cost < 0}>
                    {rec.interStoreOut.cost !== 0 ? formatCurrency(rec.interStoreOut.cost) : '-'}
                  </Td>
                  <Td>{rec.interDepartmentIn.cost !== 0 ? formatCurrency(rec.interDepartmentIn.cost) : '-'}</Td>
                  <Td $negative={rec.interDepartmentOut.cost < 0}>
                    {rec.interDepartmentOut.cost !== 0 ? formatCurrency(rec.interDepartmentOut.cost) : '-'}
                  </Td>
                  <Td>{rec.flowers.price > 0 ? formatCurrency(rec.flowers.price) : '-'}</Td>
                  <Td>{rec.directProduce.price > 0 ? formatCurrency(rec.directProduce.price) : '-'}</Td>
                  <Td $negative={rec.discountAbsolute > 0}>
                    {rec.discountAbsolute > 0 ? formatCurrency(rec.discountAbsolute) : '-'}
                  </Td>
                  <Td>{rec.consumable.cost > 0 ? formatCurrency(rec.consumable.cost) : '-'}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </Card>
    </MainContent>
  )
}
