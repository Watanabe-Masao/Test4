import { MainContent } from '@/presentation/components/Layout'
import { CategoryPieChart } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
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

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
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
  &:first-child { text-align: left; }
`

const Td = styled.td`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  &:first-child { text-align: left; font-weight: ${({ theme }) => theme.typography.fontWeight.semibold}; }
`

const Tr = styled.tr`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

const Badge = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[3]};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

const CATEGORY_COLORS: Record<string, string> = {
  market: '#f59e0b', lfc: '#3b82f6', saladClub: '#22c55e', processed: '#a855f7',
  directDelivery: '#06b6d4', flowers: '#ec4899', directProduce: '#84cc16',
  consumables: '#ea580c', interStore: '#f43f5e', interDepartment: '#8b5cf6', other: '#64748b',
}

export function CategoryPage() {
  const { isCalculated } = useCalculation()
  const { currentStoreId, currentResult, isAllStores, stores } = useStoreSelection()

  const storeName = isAllStores
    ? '全店合計'
    : stores.get(currentStoreId)?.name ?? currentStoreId

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="カテゴリ分析" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult

  // カテゴリ別データ
  const categoryData = CATEGORY_ORDER
    .filter((cat) => r.categoryTotals.has(cat))
    .map((cat) => {
      const pair = r.categoryTotals.get(cat)!
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        cost: pair.cost,
        price: pair.price,
        markup: safeDivide(pair.price - pair.cost, pair.price, 0),
        color: CATEGORY_COLORS[cat] ?? '#64748b',
      }
    })

  // 取引先別データ
  const supplierData = Array.from(r.supplierTotals.values())
    .sort((a, b) => b.cost - a.cost)

  return (
    <MainContent title="カテゴリ分析" storeName={storeName}>
      <ChartGrid>
        <CategoryPieChart categoryTotals={r.categoryTotals} mode="cost" />
        <CategoryPieChart categoryTotals={r.categoryTotals} mode="price" />
      </ChartGrid>

      <Section>
        <SectionTitle>カテゴリ別集計</SectionTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>カテゴリ</Th>
                <Th>原価</Th>
                <Th>売価</Th>
                <Th>値入率</Th>
                <Th>構成比（原価）</Th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((d) => {
                const totalCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)
                const share = safeDivide(Math.abs(d.cost), totalCost, 0)
                return (
                  <Tr key={d.category}>
                    <Td><Badge $color={d.color} />{d.label}</Td>
                    <Td>{formatCurrency(d.cost)}</Td>
                    <Td>{formatCurrency(d.price)}</Td>
                    <Td>{formatPercent(d.markup)}</Td>
                    <Td>{formatPercent(share)}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrapper>
      </Section>

      {supplierData.length > 0 && (
        <Section>
          <SectionTitle>取引先別集計</SectionTitle>
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <Th>取引先</Th>
                  <Th>コード</Th>
                  <Th>原価</Th>
                  <Th>売価</Th>
                  <Th>値入率</Th>
                </tr>
              </thead>
              <tbody>
                {supplierData.map((s) => (
                  <Tr key={s.supplierCode}>
                    <Td>{s.supplierName}</Td>
                    <Td>{s.supplierCode}</Td>
                    <Td>{formatCurrency(s.cost)}</Td>
                    <Td>{formatCurrency(s.price)}</Td>
                    <Td>{formatPercent(s.markupRate)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>
        </Section>
      )}
    </MainContent>
  )
}
