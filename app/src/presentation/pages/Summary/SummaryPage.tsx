import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid } from '@/presentation/components/common'
import { InventoryTrendChart } from '@/presentation/components/charts'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import styled from 'styled-components'

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const CalcGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`

const CalcRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

const CalcLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

const CalcValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

const CalcHighlight = styled(CalcValue)<{ $color?: string }>`
  color: ${({ $color, theme }) => $color ?? theme.colors.palette.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`

const Formula = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

export function SummaryPage() {
  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, selectedResults, stores, storeName } = useStoreSelection()

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="粗利計算" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult

  return (
    <MainContent title="粗利計算" storeName={storeName}>
      <Section>
        <InventoryTrendChart
          daily={r.daily}
          daysInMonth={daysInMonth}
          openingInventory={r.openingInventory}
          closingInventory={r.closingInventory}
          markupRate={r.coreMarkupRate}
          discountRate={r.discountRate}
          comparisonResults={selectedResults}
          stores={stores}
        />
      </Section>

      <CalcGrid>
        <Card $accent={sc.positive}>
          <CardTitle>【在庫法】実績粗利</CardTitle>
          <Formula>売上原価 = 期首在庫 + 総仕入高 - 期末在庫</Formula>
          <CalcRow>
            <CalcLabel>期首在庫</CalcLabel>
            <CalcValue>{r.openingInventory != null ? formatCurrency(r.openingInventory) : '未設定'}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>＋ 総仕入原価</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCost)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>－ 期末在庫</CalcLabel>
            <CalcValue>{r.closingInventory != null ? formatCurrency(r.closingInventory) : '未設定'}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>＝ 売上原価 (COGS)</CalcLabel>
            <CalcHighlight>{r.invMethodCogs != null ? formatCurrency(r.invMethodCogs) : '-'}</CalcHighlight>
          </CalcRow>
          <CalcRow style={{ marginTop: 8 }}>
            <CalcLabel>総売上高</CalcLabel>
            <CalcValue>{formatCurrency(r.totalSales)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>粗利益</CalcLabel>
            <CalcHighlight $color={sc.positive}>
              {r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
            </CalcHighlight>
          </CalcRow>
          <CalcRow>
            <CalcLabel>粗利率</CalcLabel>
            <CalcHighlight $color={sc.positive}>
              {r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>

        <Card $accent="#0ea5e9">
          <CardTitle>【推定法】在庫推定指標</CardTitle>
          <Formula>推定原価 = 粗売上 × (1 - 値入率) + 消耗品費</Formula>
          <CalcRow>
            <CalcLabel>コア売上</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCoreSales)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>粗売上（売変前）</CalcLabel>
            <CalcValue>{formatCurrency(r.grossSales)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>売変率</CalcLabel>
            <CalcValue>{formatPercent(r.discountRate)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>コア値入率</CalcLabel>
            <CalcValue>{formatPercent(r.coreMarkupRate)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>推定原価</CalcLabel>
            <CalcHighlight>{formatCurrency(r.estMethodCogs)}</CalcHighlight>
          </CalcRow>
          <CalcRow>
            <CalcLabel>推定マージン</CalcLabel>
            <CalcHighlight $color="#0ea5e9">{formatCurrency(r.estMethodMargin)}</CalcHighlight>
          </CalcRow>
          <CalcRow>
            <CalcLabel>推定マージン率</CalcLabel>
            <CalcHighlight $color="#0ea5e9">{formatPercent(r.estMethodMarginRate)}</CalcHighlight>
          </CalcRow>
          <CalcRow>
            <CalcLabel>推定期末在庫</CalcLabel>
            <CalcHighlight $color="#06b6d4">
              {r.estMethodClosingInventory != null ? formatCurrency(r.estMethodClosingInventory) : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>
      </CalcGrid>

      <Section>
        <SectionTitle>移動集計</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="店間入"
            value={formatCurrency(r.transferDetails.interStoreIn.cost)}
            subText={`売価: ${formatCurrency(r.transferDetails.interStoreIn.price)}`}
            accent={sc.positive}
          />
          <KpiCard
            label="店間出"
            value={formatCurrency(r.transferDetails.interStoreOut.cost)}
            subText={`売価: ${formatCurrency(r.transferDetails.interStoreOut.price)}`}
            accent={sc.negative}
          />
          <KpiCard
            label="部門間入"
            value={formatCurrency(r.transferDetails.interDepartmentIn.cost)}
            accent="#3b82f6"
          />
          <KpiCard
            label="部門間出"
            value={formatCurrency(r.transferDetails.interDepartmentOut.cost)}
            accent="#a855f7"
          />
        </KpiGrid>
      </Section>
    </MainContent>
  )
}
