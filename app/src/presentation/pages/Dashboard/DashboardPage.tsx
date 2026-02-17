import { MainContent } from '@/presentation/components/Layout'
import { KpiCard, KpiGrid } from '@/presentation/components/common'
import { useCalculation } from '@/application/hooks'
import { useStoreSelection } from '@/application/hooks'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import styled from 'styled-components'

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[10]};
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

const EmptyIcon = styled.div`
  font-size: 2rem;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const EmptyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export function DashboardPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, storeName, stores } = useStoreSelection()

  if (!isCalculated) {
    return (
      <MainContent title="ダッシュボード">
        <EmptyState>
          <EmptyIcon>📊</EmptyIcon>
          <EmptyTitle>データを読み込んでください</EmptyTitle>
          <p>左のサイドバーからファイルをドラッグ＆ドロップすると自動で計算されます。</p>
        </EmptyState>
      </MainContent>
    )
  }

  if (!currentResult) {
    return (
      <MainContent title="ダッシュボード" storeName={storeName}>
        <Section>
          <SectionTitle>全店舗概要</SectionTitle>
          <KpiGrid>
            <KpiCard label="店舗数" value={`${stores.size}店舗`} accent="#6366f1" />
          </KpiGrid>
        </Section>
      </MainContent>
    )
  }

  const r = currentResult

  return (
    <MainContent title="ダッシュボード" storeName={storeName}>
      <Section>
        <SectionTitle>売上・利益</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="総売上高"
            value={formatCurrency(r.totalSales)}
            accent="#6366f1"
          />
          <KpiCard
            label="コア売上"
            value={formatCurrency(r.totalCoreSales)}
            subText={`花: ${formatCurrency(r.flowerSalesPrice)} / 産直: ${formatCurrency(r.directProduceSalesPrice)}`}
            accent="#8b5cf6"
          />
          <KpiCard
            label="【在庫法】粗利益"
            value={r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
            subText={r.invMethodGrossProfitRate != null ? `粗利率: ${formatPercent(r.invMethodGrossProfitRate)}` : '在庫設定なし'}
            accent="#22c55e"
          />
          <KpiCard
            label="【推定法】マージン"
            value={formatCurrency(r.estMethodMargin)}
            subText={`マージン率: ${formatPercent(r.estMethodMarginRate)}`}
            accent="#0ea5e9"
          />
        </KpiGrid>
      </Section>

      <Section>
        <SectionTitle>仕入・原価</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="総仕入原価"
            value={formatCurrency(r.totalCost)}
            accent="#f59e0b"
          />
          <KpiCard
            label="在庫仕入原価"
            value={formatCurrency(r.inventoryCost)}
            accent="#ea580c"
          />
          <KpiCard
            label="売上納品原価"
            value={formatCurrency(r.deliverySalesCost)}
            subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`}
            accent="#ec4899"
          />
          <KpiCard
            label="消耗品費"
            value={formatCurrency(r.totalConsumable)}
            subText={`消耗品率: ${formatPercent(r.consumableRate)}`}
            accent="#f97316"
          />
        </KpiGrid>
      </Section>

      <Section>
        <SectionTitle>売変・値入</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="売変額合計"
            value={formatCurrency(r.totalDiscount)}
            subText={`売変率: ${formatPercent(r.discountRate)}`}
            accent="#f43f5e"
          />
          <KpiCard
            label="売変ロス原価"
            value={formatCurrency(r.discountLossCost)}
            accent="#dc2626"
          />
          <KpiCard
            label="平均値入率"
            value={formatPercent(r.averageMarkupRate)}
            accent="#3b82f6"
          />
          <KpiCard
            label="コア値入率"
            value={formatPercent(r.coreMarkupRate)}
            accent="#06b6d4"
          />
        </KpiGrid>
      </Section>

      <Section>
        <SectionTitle>予算・予測</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="月間予算"
            value={formatCurrency(r.budget)}
            accent="#6366f1"
          />
          <KpiCard
            label="日平均売上"
            value={formatCurrency(r.averageDailySales)}
            subText={`営業日: ${r.salesDays}日 / 経過: ${r.elapsedDays}日`}
            accent="#8b5cf6"
          />
          <KpiCard
            label="月末予測売上"
            value={formatCurrency(r.projectedSales)}
            accent="#22c55e"
          />
          <KpiCard
            label="予算達成率予測"
            value={formatPercent(r.projectedAchievement)}
            accent="#0ea5e9"
          />
        </KpiGrid>
      </Section>
    </MainContent>
  )
}
