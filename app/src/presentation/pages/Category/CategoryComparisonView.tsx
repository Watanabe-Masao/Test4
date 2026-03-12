import { ChartErrorBoundary } from '@/presentation/components/common'
import type { StoreResult } from '@/domain/models'
import { formatPercent } from '@/domain/formatting'
import { useCurrencyFormat } from '@/presentation/components/charts/chartTheme'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import {
  ChartGrid,
  Section,
  SectionTitle,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  Badge,
} from './CategoryPage.styles'
import {
  StoreComparisonCategoryBarChart,
  StoreComparisonMarkupRadarChart,
} from './CategoryComparisonCharts'
import { CATEGORY_COLORS, buildCategoryData } from './categoryData'

interface CategoryComparisonViewProps {
  readonly selectedResults: StoreResult[]
  readonly storeNames: Map<string, string>
}

export function CategoryComparisonView({
  selectedResults,
  storeNames,
}: CategoryComparisonViewProps) {
  const { format: fmtCurrency } = useCurrencyFormat()
  return (
    <>
      {/* 比較チャート */}
      <ChartErrorBoundary>
        <ChartGrid>
          <StoreComparisonCategoryBarChart
            selectedResults={selectedResults}
            storeNames={storeNames}
          />
          <StoreComparisonMarkupRadarChart
            selectedResults={selectedResults}
            storeNames={storeNames}
          />
        </ChartGrid>
      </ChartErrorBoundary>

      <Section>
        <SectionTitle>店舗間カテゴリ比較</SectionTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>カテゴリ</Th>
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-cost`} colSpan={1}>
                    {sr.storeId} 原価
                  </Th>
                ))}
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-price`} colSpan={1}>
                    {sr.storeId} 売価
                  </Th>
                ))}
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-markup`} colSpan={1}>
                    {sr.storeId} 値入率
                  </Th>
                ))}
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-cross`} colSpan={1}>
                    {sr.storeId} 相乗積
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.filter((cat) =>
                selectedResults.some((sr) => sr.categoryTotals.has(cat)),
              ).map((cat) => (
                <Tr key={cat}>
                  <Td>
                    <Badge $color={CATEGORY_COLORS[cat] ?? '#64748b'} />
                    {CATEGORY_LABELS[cat]}
                  </Td>
                  {selectedResults.map((sr) => {
                    const pair = sr.categoryTotals.get(cat)
                    return <Td key={`${sr.storeId}-cost`}>{pair ? fmtCurrency(pair.cost) : '-'}</Td>
                  })}
                  {selectedResults.map((sr) => {
                    const pair = sr.categoryTotals.get(cat)
                    return (
                      <Td key={`${sr.storeId}-price`}>{pair ? fmtCurrency(pair.price) : '-'}</Td>
                    )
                  })}
                  {selectedResults.map((sr) => {
                    const pair = sr.categoryTotals.get(cat)
                    const markup = pair ? safeDivide(pair.price - pair.cost, pair.price, 0) : 0
                    return (
                      <Td key={`${sr.storeId}-markup`}>{pair ? formatPercent(markup) : '-'}</Td>
                    )
                  })}
                  {selectedResults.map((sr) => {
                    const storeData = buildCategoryData(sr)
                    const found = storeData.find((d) => d.category === cat)
                    return (
                      <Td key={`${sr.storeId}-cross`}>
                        {found ? formatPercent(found.crossMultiplication) : '-'}
                      </Td>
                    )
                  })}
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </Section>

      <Section>
        <SectionTitle>店舗間取引先比較</SectionTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>取引先</Th>
                <Th>コード</Th>
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-cost`}>{sr.storeId} 原価</Th>
                ))}
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-price`}>{sr.storeId} 売価</Th>
                ))}
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-markup`}>{sr.storeId} 値入率</Th>
                ))}
                {selectedResults.map((sr) => (
                  <Th key={`${sr.storeId}-cross`}>{sr.storeId} 相乗積</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Collect all unique supplier codes across stores
                const allCodes = new Set<string>()
                const supplierNames = new Map<string, string>()
                selectedResults.forEach((sr) => {
                  sr.supplierTotals.forEach((st) => {
                    allCodes.add(st.supplierCode)
                    supplierNames.set(st.supplierCode, st.supplierName)
                  })
                })
                return Array.from(allCodes).map((code) => (
                  <Tr key={code}>
                    <Td>{supplierNames.get(code) ?? code}</Td>
                    <Td>{code}</Td>
                    {selectedResults.map((sr) => {
                      const st = sr.supplierTotals.get(code)
                      return <Td key={`${sr.storeId}-cost`}>{st ? fmtCurrency(st.cost) : '-'}</Td>
                    })}
                    {selectedResults.map((sr) => {
                      const st = sr.supplierTotals.get(code)
                      return <Td key={`${sr.storeId}-price`}>{st ? fmtCurrency(st.price) : '-'}</Td>
                    })}
                    {selectedResults.map((sr) => {
                      const st = sr.supplierTotals.get(code)
                      return (
                        <Td key={`${sr.storeId}-markup`}>
                          {st ? formatPercent(st.markupRate) : '-'}
                        </Td>
                      )
                    })}
                    {selectedResults.map((sr) => {
                      const st = sr.supplierTotals.get(code)
                      if (!st) {
                        return <Td key={`${sr.storeId}-cross`}>-</Td>
                      }
                      const storeTotalPrice = Array.from(sr.supplierTotals.values()).reduce(
                        (sum, s) => sum + s.price,
                        0,
                      )
                      const crossMult = safeDivide(st.price - st.cost, storeTotalPrice, 0)
                      return <Td key={`${sr.storeId}-cross`}>{formatPercent(crossMult)}</Td>
                    })}
                  </Tr>
                ))
              })()}
            </tbody>
          </Table>
        </TableWrapper>
      </Section>
    </>
  )
}
