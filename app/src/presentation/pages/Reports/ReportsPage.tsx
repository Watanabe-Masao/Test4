import { MainContent } from '@/presentation/components/Layout'
import { Card, CardTitle, KpiCard, KpiGrid } from '@/presentation/components/common'
import { useCalculation, useStoreSelection } from '@/application/hooks'
import { useAppState } from '@/application/context'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { safeDivide } from '@/domain/calculations/utils'
import { calculateBudgetAnalysis } from '@/domain/calculations/budgetAnalysis'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import styled from 'styled-components'

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media print {
    break-inside: avoid;
    margin-bottom: 16px;
  }
`

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const ReportHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
  padding-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 2px solid ${({ theme }) => theme.colors.palette.primary};
`

const ReportDate = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }

  @media print {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
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
  &:first-child { text-align: left; }
`

const Td = styled.td<{ $accent?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $accent, theme }) => $accent ? theme.colors.palette.primary : theme.colors.text};
  font-weight: ${({ $accent, theme }) => $accent ? theme.typography.fontWeight.bold : 'normal'};
  &:first-child { text-align: left; font-weight: ${({ theme }) => theme.typography.fontWeight.semibold}; }
`

const TotalRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

const Tr = styled.tr`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
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

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

export function ReportsPage() {
  const { isCalculated } = useCalculation()
  const { currentResult, storeName } = useStoreSelection()
  const { settings } = useAppState()

  if (!isCalculated || !currentResult) {
    return (
      <MainContent title="月次レポート" storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  const r = currentResult
  const { daysInMonth } = useCalculation()
  const { targetYear, targetMonth } = useAppState().settings
  const today = new Date()
  const reportDate = `${targetYear}年${targetMonth}月${today.getDate()}日`

  // Budget analysis
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

  // Category data
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
      }
    })

  const totalCategoryCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)

  return (
    <MainContent title="月次レポート" storeName={storeName}>
      <ReportHeader>
        <div />
        <ReportDate>{reportDate} 現在</ReportDate>
      </ReportHeader>

      {/* 概要KPI */}
      <Section>
        <SectionTitle>概要</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="総売上高"
            value={formatCurrency(r.totalSales)}
            accent="#6366f1"
          />
          <KpiCard
            label="【在庫法】粗利益"
            value={r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
            subText={r.invMethodGrossProfitRate != null ? `粗利率: ${formatPercent(r.invMethodGrossProfitRate)}` : '在庫設定なし'}
            accent="#22c55e"
          />
          <KpiCard
            label="予算達成率"
            value={formatPercent(analysis.budgetAchievementRate)}
            subText={`予算: ${formatCurrency(r.budget)}`}
            accent="#0ea5e9"
          />
          <KpiCard
            label="月末予測達成率"
            value={formatPercent(analysis.projectedAchievement)}
            subText={`予測売上: ${formatCurrency(analysis.projectedSales)}`}
            accent="#f59e0b"
          />
        </KpiGrid>
      </Section>

      {/* 損益計算 */}
      <SummaryGrid>
        <Card $accent="#22c55e">
          <CardTitle>【在庫法】実績粗利</CardTitle>
          <CalcRow>
            <CalcLabel>総売上高</CalcLabel>
            <CalcValue>{formatCurrency(r.totalSales)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>総仕入原価</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCost)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>期首在庫</CalcLabel>
            <CalcValue>{r.openingInventory != null ? formatCurrency(r.openingInventory) : '未設定'}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>期末在庫</CalcLabel>
            <CalcValue>{r.closingInventory != null ? formatCurrency(r.closingInventory) : '未設定'}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>売上原価 (COGS)</CalcLabel>
            <CalcHighlight>{r.invMethodCogs != null ? formatCurrency(r.invMethodCogs) : '-'}</CalcHighlight>
          </CalcRow>
          <CalcRow>
            <CalcLabel>粗利益</CalcLabel>
            <CalcHighlight $color="#22c55e">
              {r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
            </CalcHighlight>
          </CalcRow>
          <CalcRow>
            <CalcLabel>粗利率</CalcLabel>
            <CalcHighlight $color="#22c55e">
              {r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>

        <Card $accent="#0ea5e9">
          <CardTitle>【推定法】在庫推定指標</CardTitle>
          <CalcRow>
            <CalcLabel>コア売上</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCoreSales)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>コア値入率</CalcLabel>
            <CalcValue>{formatPercent(r.coreMarkupRate)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>売変率</CalcLabel>
            <CalcValue>{formatPercent(r.discountRate)}</CalcValue>
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
      </SummaryGrid>

      {/* 仕入・売変 */}
      <Section>
        <SectionTitle>仕入・売変詳細</SectionTitle>
        <KpiGrid>
          <KpiCard label="在庫仕入原価" value={formatCurrency(r.inventoryCost)} accent="#f59e0b" />
          <KpiCard label="売上納品原価" value={formatCurrency(r.deliverySalesCost)} subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`} accent="#ec4899" />
          <KpiCard label="消耗品費" value={formatCurrency(r.totalConsumable)} subText={`消耗品率: ${formatPercent(r.consumableRate)}`} accent="#f97316" />
          <KpiCard label="売変ロス原価" value={formatCurrency(r.discountLossCost)} subText={`売変額: ${formatCurrency(r.totalDiscount)}`} accent="#ef4444" />
        </KpiGrid>
      </Section>

      {/* 移動集計 */}
      <Section>
        <SectionTitle>移動集計</SectionTitle>
        <KpiGrid>
          <KpiCard label="店間入" value={formatCurrency(r.transferDetails.interStoreIn.cost)} accent="#22c55e" />
          <KpiCard label="店間出" value={formatCurrency(r.transferDetails.interStoreOut.cost)} accent="#ef4444" />
          <KpiCard label="部門間入" value={formatCurrency(r.transferDetails.interDepartmentIn.cost)} accent="#3b82f6" />
          <KpiCard label="部門間出" value={formatCurrency(r.transferDetails.interDepartmentOut.cost)} accent="#a855f7" />
        </KpiGrid>
      </Section>

      {/* カテゴリ別 */}
      {categoryData.length > 0 && (
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
                  <Th>構成比</Th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((d) => {
                  const share = safeDivide(Math.abs(d.cost), totalCategoryCost, 0)
                  return (
                    <Tr key={d.category}>
                      <Td>{d.label}</Td>
                      <Td>{formatCurrency(d.cost)}</Td>
                      <Td>{formatCurrency(d.price)}</Td>
                      <Td>{formatPercent(d.markup)}</Td>
                      <Td>{formatPercent(share)}</Td>
                    </Tr>
                  )
                })}
                <TotalRow>
                  <Td>合計</Td>
                  <Td $accent>{formatCurrency(categoryData.reduce((s, d) => s + d.cost, 0))}</Td>
                  <Td $accent>{formatCurrency(categoryData.reduce((s, d) => s + d.price, 0))}</Td>
                  <Td $accent>
                    {formatPercent(safeDivide(
                      categoryData.reduce((s, d) => s + d.price, 0) - categoryData.reduce((s, d) => s + d.cost, 0),
                      categoryData.reduce((s, d) => s + d.price, 0),
                      0,
                    ))}
                  </Td>
                  <Td $accent>100.0%</Td>
                </TotalRow>
              </tbody>
            </Table>
          </TableWrapper>
        </Section>
      )}

      {/* 予算 */}
      <Section>
        <SectionTitle>予算分析</SectionTitle>
        <KpiGrid>
          <KpiCard label="月間予算" value={formatCurrency(r.budget)} accent="#6366f1" />
          <KpiCard label="予算達成率" value={formatPercent(analysis.budgetAchievementRate)} accent="#22c55e" />
          <KpiCard label="予算消化率" value={formatPercent(analysis.budgetProgressRate)} subText={`経過: ${r.elapsedDays}/${daysInMonth}日`} accent="#0ea5e9" />
          <KpiCard label="残余予算" value={formatCurrency(analysis.remainingBudget)} accent="#f59e0b" />
        </KpiGrid>
      </Section>

      {/* 目標対比 */}
      <Section>
        <SectionTitle>目標対比</SectionTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>指標</Th>
                <Th>目標</Th>
                <Th>実績</Th>
                <Th>差異</Th>
                <Th>評価</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td>粗利率</Td>
                <Td>{formatPercent(settings.targetGrossProfitRate)}</Td>
                <Td>{r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}</Td>
                <Td $accent={r.invMethodGrossProfitRate != null && r.invMethodGrossProfitRate >= settings.targetGrossProfitRate}>
                  {r.invMethodGrossProfitRate != null
                    ? `${r.invMethodGrossProfitRate >= settings.targetGrossProfitRate ? '+' : ''}${formatPercent(r.invMethodGrossProfitRate - settings.targetGrossProfitRate)}`
                    : '-'}
                </Td>
                <Td>
                  {r.invMethodGrossProfitRate != null
                    ? r.invMethodGrossProfitRate >= settings.targetGrossProfitRate ? '達成' : r.invMethodGrossProfitRate >= settings.warningThreshold ? '注意' : '未達'
                    : '-'}
                </Td>
              </Tr>
              <Tr>
                <Td>予算達成</Td>
                <Td>{formatCurrency(r.budget)}</Td>
                <Td>{formatCurrency(r.totalSales)}</Td>
                <Td $accent={r.totalSales >= r.budget}>
                  {r.totalSales >= r.budget ? '+' : ''}{formatCurrency(r.totalSales - r.budget)}
                </Td>
                <Td>{analysis.budgetAchievementRate >= 1 ? '達成' : analysis.budgetAchievementRate >= 0.9 ? '進行中' : '要注意'}</Td>
              </Tr>
              <Tr>
                <Td>値入率</Td>
                <Td>{formatPercent(settings.defaultMarkupRate)}</Td>
                <Td>{formatPercent(r.averageMarkupRate)}</Td>
                <Td $accent={r.averageMarkupRate >= settings.defaultMarkupRate}>
                  {r.averageMarkupRate >= settings.defaultMarkupRate ? '+' : ''}{formatPercent(r.averageMarkupRate - settings.defaultMarkupRate)}
                </Td>
                <Td>{r.averageMarkupRate >= settings.defaultMarkupRate ? '達成' : '未達'}</Td>
              </Tr>
            </tbody>
          </Table>
        </TableWrapper>
      </Section>
    </MainContent>
  )
}
