import {
  Card,
  CardTitle,
  KpiCard,
  KpiGrid,
  Chip,
  ChipGroup,
  ChartErrorBoundary,
} from '@/presentation/components/common'
import type { MetricId, StoreResult } from '@/domain/models'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import {
  BudgetVsActualChart,
  PrevYearComparisonChart,
  EstimatedInventoryDetailChart,
} from '@/presentation/components/charts'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { ComparisonView } from '@/presentation/pages/Analysis/ComparisonView'
import type { InsightData } from './useInsightData'
import {
  Section,
  SectionTitle,
  ChartSection,
  ToggleSection,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  CalcGrid,
  CalcRow,
  CalcLabel,
  CalcValue,
  CalcHighlight,
  Formula,
  CalcPurpose,
  CalcNullGuide,
  VarianceRow,
  VarianceValue,
  VarianceLabel,
} from './InsightPage.styles'

interface BudgetTabProps {
  readonly d: InsightData
  readonly r: StoreResult
  readonly onExplain: (metricId: MetricId) => void
}

export function BudgetTabContent({ d, r, onExplain }: BudgetTabProps) {
  return (
    <>
      {d.selectedResults.length > 1 && (
        <ToggleSection>
          <ChipGroup>
            <Chip $active={d.viewMode === 'total'} onClick={() => d.setViewMode('total')}>
              合計モード
            </Chip>
            <Chip $active={d.viewMode === 'comparison'} onClick={() => d.setViewMode('comparison')}>
              比較モード
            </Chip>
          </ChipGroup>
        </ToggleSection>
      )}

      {d.viewMode === 'comparison' && d.selectedResults.length > 1 ? (
        <ComparisonView results={d.selectedResults} />
      ) : (
        <>
          <KpiGrid>
            <KpiCard
              label="予算達成率"
              value={d.formatPercent(r.budgetProgressRate)}
              subText={`経過日予算累計比: ${r.elapsedDays}日分`}
              accent={palette.primary}
              onClick={() => onExplain('budgetProgressRate')}
              trend={
                r.budgetAchievementRate >= 1
                  ? { direction: 'up', label: '達成' }
                  : r.budgetAchievementRate >= 0.9
                    ? { direction: 'flat', label: '進行中' }
                    : { direction: 'down', label: '要注意' }
              }
            />
            <KpiCard
              label="予算消化率"
              value={d.formatPercent(r.budgetAchievementRate)}
              subText={`予算: ${d.fmtCurrency(r.budget)}`}
              accent={sc.positive}
              onClick={() => onExplain('budgetAchievementRate')}
            />
            <KpiCard
              label="月末予測売上"
              value={d.fmtCurrency(r.projectedSales)}
              accent={palette.infoDark}
              onClick={() => onExplain('projectedSales')}
              trend={
                r.projectedAchievement >= 1
                  ? { direction: 'up', label: '達成見込' }
                  : r.projectedAchievement >= 0.95
                    ? { direction: 'flat', label: '微妙' }
                    : { direction: 'down', label: '未達見込' }
              }
            />
            <KpiCard
              label="達成率予測"
              value={d.formatPercent(r.projectedAchievement)}
              subText={`残余予算: ${d.fmtCurrency(r.remainingBudget)}`}
              accent={sc.achievement(r.projectedAchievement)}
              onClick={() => onExplain('remainingBudget')}
            />
            <KpiCard
              label="粗利額予算"
              value={d.fmtCurrency(r.grossProfitBudget)}
              subText={`実績: ${d.fmtCurrency(d.actualGrossProfit)}`}
              accent={palette.purpleDark}
              badge={r.invMethodGrossProfit != null ? 'actual' : 'estimated'}
              formulaSummary={
                r.invMethodGrossProfit != null ? '売上 − 売上原価' : 'コア売上 − 推定原価'
              }
              onClick={
                r.invMethodGrossProfit != null ? () => onExplain('invMethodGrossProfit') : undefined
              }
            />
            <KpiCard
              label="粗利率"
              value={d.formatPercent(d.actualGrossProfitRate)}
              subText={`予算: ${d.formatPercent(r.grossProfitRateBudget)}`}
              accent={palette.pinkDark}
              badge={r.invMethodGrossProfitRate != null ? 'actual' : 'estimated'}
              formulaSummary={
                r.invMethodGrossProfitRate != null ? '粗利益 ÷ 総売上' : '推定マージン ÷ コア売上'
              }
              onClick={
                r.invMethodGrossProfitRate != null
                  ? () => onExplain('invMethodGrossProfitRate')
                  : () => onExplain('estMethodMarginRate')
              }
            />
            {d.prevYear.hasPrevYear && (
              <KpiCard
                label="比較期売上"
                value={d.fmtCurrency(d.prevYear.totalSales)}
                subText={`比較期比: ${d.prevYear.totalSales > 0 ? d.formatPercent(r.totalSales / d.prevYear.totalSales) : '-'}`}
                accent={palette.slate}
              />
            )}
            {d.prevYear.hasPrevYear && d.prevYear.totalSales > 0 && (
              <KpiCard
                label="比較期比"
                value={d.formatPercent(r.totalSales / d.prevYear.totalSales)}
                subText={`差額: ${d.fmtCurrency(r.totalSales - d.prevYear.totalSales)}`}
                accent={sc.cond(r.totalSales >= d.prevYear.totalSales)}
              />
            )}
          </KpiGrid>

          {d.prevYear.hasPrevYear && (
            <ToggleSection>
              <ChipGroup>
                <Chip
                  $active={d.chartMode === 'budget-vs-actual'}
                  onClick={() => d.setChartMode('budget-vs-actual')}
                >
                  予算 vs 実績
                </Chip>
                <Chip
                  $active={d.chartMode === 'prev-year'}
                  onClick={() => d.setChartMode('prev-year')}
                >
                  当期 vs 比較期
                </Chip>
                <Chip
                  $active={d.chartMode === 'all-three'}
                  onClick={() => d.setChartMode('all-three')}
                >
                  予算 vs 実績 vs 比較期
                </Chip>
              </ChipGroup>
            </ToggleSection>
          )}
          <ChartSection>
            <ChartErrorBoundary>
              {d.chartMode === 'budget-vs-actual' && (
                <BudgetVsActualChart
                  data={d.chartData}
                  budget={r.budget}
                  year={d.year}
                  month={d.month}
                />
              )}
              {d.chartMode === 'prev-year' &&
                d.prevYear.hasPrevYear &&
                (() => {
                  const currentDaily = new Map<number, { sales: number }>()
                  for (const [day, s] of d.salesDaily) currentDaily.set(day, { sales: s })
                  return (
                    <PrevYearComparisonChart
                      currentDaily={currentDaily}
                      prevYearDaily={d.prevYear.daily}
                      daysInMonth={d.daysInMonth}
                      year={d.year}
                      month={d.month}
                    />
                  )
                })()}
              {d.chartMode === 'all-three' && (
                <BudgetVsActualChart
                  data={d.chartData}
                  budget={r.budget}
                  showPrevYear
                  year={d.year}
                  month={d.month}
                />
              )}
              {d.chartMode !== 'budget-vs-actual' && !d.prevYear.hasPrevYear && (
                <BudgetVsActualChart
                  data={d.chartData}
                  budget={r.budget}
                  year={d.year}
                  month={d.month}
                />
              )}
            </ChartErrorBoundary>
          </ChartSection>

          {/* 日別予算 vs 実績テーブル */}
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
                    {d.prevYear.hasPrevYear && <Th>比較期</Th>}
                    {d.prevYear.hasPrevYear && <Th>比較期比</Th>}
                    {d.prevYear.hasPrevYear && <Th>比較期累計</Th>}
                    {d.prevYear.hasPrevYear && <Th>累計比較期比</Th>}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cumDiscount = 0
                    let cumGrossSales = 0
                    let cumPrevYear = 0
                    return d.chartData
                      .filter((cd) => cd.actualCum > 0 || cd.budgetCum > 0)
                      .map((cd) => {
                        const dailyRec = r.daily.get(cd.day)
                        const daySales = d.salesDaily.get(cd.day) ?? 0
                        const dayBudget = r.budgetDaily.get(cd.day) ?? 0
                        const variance = daySales - dayBudget
                        const achievement = cd.budgetCum > 0 ? cd.actualCum / cd.budgetCum : 0
                        const dayDiscountAbsolute = dailyRec?.discountAbsolute ?? 0
                        cumDiscount += dayDiscountAbsolute
                        cumGrossSales += dailyRec?.grossSales ?? 0
                        const discountRateCum = d.safeDivide(cumDiscount, cumGrossSales, 0)
                        const cumDiscountRate = discountRateCum
                        const budgetVariance = cd.actualCum - cd.budgetCum
                        const pyDaySales =
                          d.prevYear.daily.get(toDateKeyFromParts(d.year, d.month, cd.day))
                            ?.sales ?? 0
                        cumPrevYear += pyDaySales
                        const pyDayRatio = pyDaySales > 0 ? daySales / pyDaySales : 0
                        const pyCumRatio = cumPrevYear > 0 ? cd.actualCum / cumPrevYear : 0
                        return (
                          <Tr key={cd.day}>
                            <Td>{cd.day}</Td>
                            <Td>{d.fmtCurrency(dayBudget)}</Td>
                            <Td>{d.fmtCurrency(daySales)}</Td>
                            <Td $positive={variance > 0} $negative={variance < 0}>
                              {variance > 0 ? '+' : ''}
                              {d.fmtCurrency(variance)}
                            </Td>
                            <Td>{d.fmtCurrency(dayDiscountAbsolute)}</Td>
                            <Td>{d.fmtCurrency(cd.budgetCum)}</Td>
                            <Td>{d.fmtCurrency(cd.actualCum)}</Td>
                            <Td $positive={budgetVariance > 0} $negative={budgetVariance < 0}>
                              {budgetVariance > 0 ? '+' : ''}
                              {d.fmtCurrency(budgetVariance)}
                            </Td>
                            <Td $positive={achievement >= 1} $negative={achievement < 0.9}>
                              {d.formatPercent(achievement)}
                            </Td>
                            <Td>{d.formatPercent(discountRateCum)}</Td>
                            <Td>{d.formatPercent(cumDiscountRate)}</Td>
                            {d.prevYear.hasPrevYear && (
                              <Td>{pyDaySales > 0 ? d.fmtCurrency(pyDaySales) : '-'}</Td>
                            )}
                            {d.prevYear.hasPrevYear && (
                              <Td
                                $positive={pyDayRatio >= 1}
                                $negative={pyDayRatio > 0 && pyDayRatio < 1}
                              >
                                {pyDaySales > 0 ? d.formatPercent(pyDayRatio) : '-'}
                              </Td>
                            )}
                            {d.prevYear.hasPrevYear && (
                              <Td>{cumPrevYear > 0 ? d.fmtCurrency(cumPrevYear) : '-'}</Td>
                            )}
                            {d.prevYear.hasPrevYear && (
                              <Td
                                $positive={pyCumRatio >= 1}
                                $negative={pyCumRatio > 0 && pyCumRatio < 1}
                              >
                                {cumPrevYear > 0 ? d.formatPercent(pyCumRatio) : '-'}
                              </Td>
                            )}
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
    </>
  )
}

export function GrossProfitTabContent({ d, r, onExplain }: BudgetTabProps) {
  return (
    <>
      <CalcGrid>
        {/* ── 左: 実績（P/L） ── */}
        <Card $accent={sc.positive}>
          <CardTitle>【在庫法】実績粗利</CardTitle>
          <CalcPurpose>目的：会計上の実績損益を確認する（確定値）</CalcPurpose>
          <Formula>売上原価 = 期首在庫 + 総仕入高 - 期末在庫</Formula>
          {r.invMethodCogs == null && (
            <CalcNullGuide>
              在庫法の計算には期首在庫と期末在庫の設定が必要です。管理画面の在庫設定から入力してください。
            </CalcNullGuide>
          )}
          <CalcRow>
            <CalcLabel>期首在庫</CalcLabel>
            <CalcValue>
              {r.openingInventory != null ? d.fmtCurrency(r.openingInventory) : '未設定'}
            </CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('purchaseCost')}>
            <CalcLabel>＋ 総仕入原価</CalcLabel>
            <CalcValue>{d.fmtCurrency(r.totalCost)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>－ 期末在庫</CalcLabel>
            <CalcValue>
              {r.closingInventory != null ? d.fmtCurrency(r.closingInventory) : '未設定'}
            </CalcValue>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodCogs != null}
            onClick={r.invMethodCogs != null ? () => onExplain('invMethodCogs') : undefined}
          >
            <CalcLabel>＝ 売上原価 (COGS)</CalcLabel>
            <CalcHighlight>
              {r.invMethodCogs != null ? d.fmtCurrency(r.invMethodCogs) : '-'}
            </CalcHighlight>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('salesTotal')} style={{ marginTop: 8 }}>
            <CalcLabel>総売上高</CalcLabel>
            <CalcValue>{d.fmtCurrency(r.totalSales)}</CalcValue>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodGrossProfit != null}
            onClick={
              r.invMethodGrossProfit != null ? () => onExplain('invMethodGrossProfit') : undefined
            }
          >
            <CalcLabel>実績粗利益</CalcLabel>
            <CalcHighlight $color={sc.positive}>
              {r.invMethodGrossProfit != null ? d.fmtCurrency(r.invMethodGrossProfit) : '-'}
            </CalcHighlight>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodGrossProfitRate != null}
            onClick={
              r.invMethodGrossProfitRate != null
                ? () => onExplain('invMethodGrossProfitRate')
                : undefined
            }
          >
            <CalcLabel>実績粗利率</CalcLabel>
            <CalcHighlight $color={sc.positive}>
              {r.invMethodGrossProfitRate != null
                ? d.formatPercent(r.invMethodGrossProfitRate)
                : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>

        {/* ── 右: 推定（在庫推定） ── */}
        <Card $accent={palette.warningDark}>
          <CardTitle>【推定法】在庫差異検知（理論値）</CardTitle>
          <CalcPurpose>目的：在庫差異・異常検知（実績粗利ではありません）</CalcPurpose>
          <Formula>推定原価 = 粗売上 × (1 - 値入率) + 原価算入費</Formula>
          <CalcRow $clickable onClick={() => onExplain('coreSales')}>
            <CalcLabel>コア売上</CalcLabel>
            <CalcValue>{d.fmtCurrency(r.totalCoreSales)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('grossSales')}>
            <CalcLabel>粗売上（売変前）</CalcLabel>
            <CalcValue>{d.fmtCurrency(r.grossSales)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('discountRate')}>
            <CalcLabel>売変率</CalcLabel>
            <CalcValue>{d.formatPercent(r.discountRate)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('coreMarkupRate')}>
            <CalcLabel>コア値入率</CalcLabel>
            <CalcValue>{d.formatPercent(r.coreMarkupRate)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('estMethodCogs')}>
            <CalcLabel>推定原価</CalcLabel>
            <CalcHighlight>{d.fmtCurrency(r.estMethodCogs)}</CalcHighlight>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('estMethodMargin')}>
            <CalcLabel>推定マージン</CalcLabel>
            <CalcHighlight $color={palette.warningDark}>
              {d.fmtCurrency(r.estMethodMargin)}
            </CalcHighlight>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('estMethodMarginRate')}>
            <CalcLabel>推定マージン率</CalcLabel>
            <CalcHighlight $color={palette.warningDark}>
              {d.formatPercent(r.estMethodMarginRate)}
            </CalcHighlight>
          </CalcRow>
          <CalcRow
            $clickable={r.estMethodClosingInventory != null}
            onClick={
              r.estMethodClosingInventory != null
                ? () => onExplain('estMethodClosingInventory')
                : undefined
            }
          >
            <CalcLabel>推定期末在庫（理論値）</CalcLabel>
            <CalcHighlight $color={palette.cyanDark}>
              {r.estMethodClosingInventory != null
                ? d.fmtCurrency(r.estMethodClosingInventory)
                : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>
      </CalcGrid>

      {/* ── 乖離比較（実績 vs 推定） ── */}
      {r.invMethodCogs != null &&
        r.estMethodClosingInventory != null &&
        r.closingInventory != null && (
          <Section>
            <SectionTitle>実績 vs 推定 乖離</SectionTitle>
            {(() => {
              const invDiff = r.closingInventory! - r.estMethodClosingInventory!
              const invDiffRate = r.closingInventory !== 0 ? invDiff / r.closingInventory! : 0
              const absDiffRate = Math.abs(invDiffRate)
              const severity: 'low' | 'mid' | 'high' =
                absDiffRate > 0.1 ? 'high' : absDiffRate > 0.03 ? 'mid' : 'low'
              return (
                <>
                  <VarianceRow $severity={severity}>
                    <VarianceLabel>
                      期末在庫乖離（実績 − 推定）
                      {severity === 'high' && ' — 要確認'}
                      {severity === 'mid' && ' — 注意'}
                    </VarianceLabel>
                    <VarianceValue>
                      {d.fmtCurrency(invDiff)}（{d.formatPercent(invDiffRate)}）
                    </VarianceValue>
                  </VarianceRow>
                </>
              )
            })()}
          </Section>
        )}

      <Section>
        <ChartErrorBoundary>
          <EstimatedInventoryDetailChart
            daily={r.daily}
            daysInMonth={d.daysInMonth}
            openingInventory={r.openingInventory}
            closingInventory={r.closingInventory}
            markupRate={r.coreMarkupRate}
            discountRate={r.discountRate}
            comparisonResults={d.selectedResults}
            stores={d.stores}
          />
        </ChartErrorBoundary>
      </Section>

      <Section>
        <SectionTitle>移動集計</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="店間入"
            value={d.fmtCurrency(r.transferDetails.interStoreIn.cost)}
            subText={`売価: ${d.fmtCurrency(r.transferDetails.interStoreIn.price)}`}
            accent={sc.positive}
          />
          <KpiCard
            label="店間出"
            value={d.fmtCurrency(r.transferDetails.interStoreOut.cost)}
            subText={`売価: ${d.fmtCurrency(r.transferDetails.interStoreOut.price)}`}
            accent={sc.negative}
          />
          <KpiCard
            label="部門間入"
            value={d.fmtCurrency(r.transferDetails.interDepartmentIn.cost)}
            accent={palette.blueDark}
          />
          <KpiCard
            label="部門間出"
            value={d.fmtCurrency(r.transferDetails.interDepartmentOut.cost)}
            accent={palette.purpleDeep}
          />
        </KpiGrid>
      </Section>
    </>
  )
}
