import type { StoreResult } from '@/domain/models/StoreResult'
import type { AppSettings } from '@/domain/models/Settings'
import type { MetricId } from '@/domain/models'
import { Card, CardTitle, KpiCard, KpiGrid } from '@/presentation/components/common'
import { formatCurrency, formatPercent } from '@/domain/formatting'
import { safeDivide } from '@/domain/calculations/utils'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/domain/constants/categories'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  Section,
  SectionTitle,
  SummaryGrid,
  TableWrapper,
  Table,
  Th,
  Td,
  Tr,
  TotalRow,
  CalcRow,
  CalcLabel,
  CalcValue,
  CalcHighlight,
  CalcPurpose,
  CalcNullGuide,
  VarianceRow,
  VarianceLabel,
  VarianceValue,
} from './ReportsPage.styles'

interface ReportSummaryGridProps {
  readonly result: StoreResult
  readonly settings: AppSettings
  readonly daysInMonth: number
  readonly onExplain: (metricId: MetricId) => void
}

export function ReportSummaryGrid({
  result: r,
  settings,
  daysInMonth,
  onExplain,
}: ReportSummaryGridProps) {
  // Category data
  const categoryData = CATEGORY_ORDER.flatMap((cat) => {
    const pair = r.categoryTotals.get(cat)
    if (!pair) return []
    return [
      {
        category: cat,
        label: CATEGORY_LABELS[cat],
        cost: pair.cost,
        price: pair.price,
        markup: safeDivide(pair.price - pair.cost, pair.price, 0),
      },
    ]
  })

  const totalCategoryCost = categoryData.reduce((s, c) => s + Math.abs(c.cost), 0)

  return (
    <>
      {/* 1. 概況サマリー ─「全体はどうなってる？」 */}
      <Section>
        <SectionTitle>概況サマリー</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="総売上高"
            value={formatCurrency(r.totalSales)}
            accent={palette.primary}
            onClick={() => onExplain('salesTotal')}
          />
          <KpiCard
            label="【在庫法】実績粗利益"
            value={r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
            subText={
              r.invMethodGrossProfitRate != null
                ? `実績粗利率: ${formatPercent(r.invMethodGrossProfitRate)}`
                : '在庫設定なし'
            }
            accent={sc.positive}
            badge="actual"
            formulaSummary="売上 − 売上原価（期首+仕入−期末）"
            onClick={
              r.invMethodGrossProfit != null ? () => onExplain('invMethodGrossProfit') : undefined
            }
          />
          <KpiCard
            label="予算達成率"
            value={formatPercent(r.budgetAchievementRate)}
            subText={`予算: ${formatCurrency(r.budget)}`}
            accent={palette.infoDark}
            onClick={() => onExplain('budgetAchievementRate')}
          />
          <KpiCard
            label="月末予測達成率"
            value={formatPercent(r.projectedAchievement)}
            subText={`予測売上: ${formatCurrency(r.projectedSales)}`}
            accent={sc.achievement(r.projectedAchievement)}
            onClick={() => onExplain('projectedSales')}
          />
        </KpiGrid>
      </Section>

      {/* 2. 目標対実績 ─「計画通りに進んでる？」 */}
      <Section>
        <SectionTitle>目標対実績</SectionTitle>
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
              <Tr
                onClick={() => onExplain('invMethodGrossProfitRate')}
                style={{ cursor: 'pointer' }}
              >
                <Td>粗利率</Td>
                <Td>{formatPercent(settings.targetGrossProfitRate)}</Td>
                <Td>
                  {r.invMethodGrossProfitRate != null
                    ? formatPercent(r.invMethodGrossProfitRate)
                    : '-'}
                </Td>
                <Td
                  $accent={
                    r.invMethodGrossProfitRate != null &&
                    r.invMethodGrossProfitRate >= settings.targetGrossProfitRate
                  }
                >
                  {r.invMethodGrossProfitRate != null
                    ? `${r.invMethodGrossProfitRate >= settings.targetGrossProfitRate ? '+' : ''}${formatPercent(r.invMethodGrossProfitRate - settings.targetGrossProfitRate)}`
                    : '-'}
                </Td>
                <Td>
                  {r.invMethodGrossProfitRate != null
                    ? r.invMethodGrossProfitRate >= settings.targetGrossProfitRate
                      ? '達成'
                      : r.invMethodGrossProfitRate >= settings.warningThreshold
                        ? '注意'
                        : '未達'
                    : '-'}
                </Td>
              </Tr>
              <Tr onClick={() => onExplain('budgetAchievementRate')} style={{ cursor: 'pointer' }}>
                <Td>予算達成</Td>
                <Td>{formatCurrency(r.budget)}</Td>
                <Td>{formatCurrency(r.totalSales)}</Td>
                <Td $accent={r.totalSales >= r.budget}>
                  {r.totalSales >= r.budget ? '+' : ''}
                  {formatCurrency(r.totalSales - r.budget)}
                </Td>
                <Td>
                  {r.budgetAchievementRate >= 1
                    ? '達成'
                    : r.budgetAchievementRate >= 0.9
                      ? '進行中'
                      : '要注意'}
                </Td>
              </Tr>
              <Tr onClick={() => onExplain('averageMarkupRate')} style={{ cursor: 'pointer' }}>
                <Td>値入率</Td>
                <Td>{formatPercent(settings.defaultMarkupRate)}</Td>
                <Td>{formatPercent(r.averageMarkupRate)}</Td>
                <Td $accent={r.averageMarkupRate >= settings.defaultMarkupRate}>
                  {r.averageMarkupRate >= settings.defaultMarkupRate ? '+' : ''}
                  {formatPercent(r.averageMarkupRate - settings.defaultMarkupRate)}
                </Td>
                <Td>{r.averageMarkupRate >= settings.defaultMarkupRate ? '達成' : '未達'}</Td>
              </Tr>
            </tbody>
          </Table>
        </TableWrapper>
        <KpiGrid>
          <KpiCard
            label="月間予算"
            value={formatCurrency(r.budget)}
            accent={palette.primary}
            onClick={() => onExplain('budget')}
          />
          <KpiCard
            label="予算達成率"
            value={formatPercent(r.budgetAchievementRate)}
            accent={sc.positive}
            onClick={() => onExplain('budgetAchievementRate')}
          />
          <KpiCard
            label="予算消化率"
            value={formatPercent(r.budgetProgressRate)}
            subText={`経過: ${r.elapsedDays}/${daysInMonth}日`}
            accent={palette.infoDark}
            onClick={() => onExplain('budgetProgressRate')}
          />
          <KpiCard
            label="残余予算"
            value={formatCurrency(r.remainingBudget)}
            accent={sc.cond(r.remainingBudget <= 0)}
            onClick={() => onExplain('remainingBudget')}
          />
        </KpiGrid>
      </Section>

      {/* 3. 損益構造 ─「利益の構造は？」 */}
      <SummaryGrid>
        {/* ── 左: 実績（P/L） ── */}
        <Card $accent={sc.positive}>
          <CardTitle>【在庫法】実績粗利</CardTitle>
          <CalcPurpose>目的：会計上の実績損益を確認する（確定値）</CalcPurpose>
          {r.invMethodCogs == null && (
            <CalcNullGuide>
              在庫法の計算には期首在庫と期末在庫の設定が必要です。管理画面の在庫設定から入力してください。
            </CalcNullGuide>
          )}
          <CalcRow $clickable onClick={() => onExplain('salesTotal')}>
            <CalcLabel>総売上高</CalcLabel>
            <CalcValue>{formatCurrency(r.totalSales)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('purchaseCost')}>
            <CalcLabel>総仕入原価</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCost)}</CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>期首在庫</CalcLabel>
            <CalcValue>
              {r.openingInventory != null ? formatCurrency(r.openingInventory) : '未設定'}
            </CalcValue>
          </CalcRow>
          <CalcRow>
            <CalcLabel>期末在庫</CalcLabel>
            <CalcValue>
              {r.closingInventory != null ? formatCurrency(r.closingInventory) : '未設定'}
            </CalcValue>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodCogs != null}
            onClick={r.invMethodCogs != null ? () => onExplain('invMethodCogs') : undefined}
          >
            <CalcLabel>売上原価 (COGS)</CalcLabel>
            <CalcHighlight>
              {r.invMethodCogs != null ? formatCurrency(r.invMethodCogs) : '-'}
            </CalcHighlight>
          </CalcRow>
          <CalcRow
            $clickable={r.invMethodGrossProfit != null}
            onClick={
              r.invMethodGrossProfit != null ? () => onExplain('invMethodGrossProfit') : undefined
            }
          >
            <CalcLabel>実績粗利益</CalcLabel>
            <CalcHighlight $color={sc.positive}>
              {r.invMethodGrossProfit != null ? formatCurrency(r.invMethodGrossProfit) : '-'}
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
              {r.invMethodGrossProfitRate != null ? formatPercent(r.invMethodGrossProfitRate) : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>

        {/* ── 右: 推定（在庫推定） ── */}
        <Card $accent={palette.warningDark}>
          <CardTitle>【推定法】在庫差異検知（理論値）</CardTitle>
          <CalcPurpose>目的：在庫差異・異常検知（実績粗利ではありません）</CalcPurpose>
          <CalcRow $clickable onClick={() => onExplain('coreSales')}>
            <CalcLabel>コア売上</CalcLabel>
            <CalcValue>{formatCurrency(r.totalCoreSales)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('coreMarkupRate')}>
            <CalcLabel>コア値入率</CalcLabel>
            <CalcValue>{formatPercent(r.coreMarkupRate)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('discountRate')}>
            <CalcLabel>売変率</CalcLabel>
            <CalcValue>{formatPercent(r.discountRate)}</CalcValue>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('estMethodCogs')}>
            <CalcLabel>推定原価</CalcLabel>
            <CalcHighlight>{formatCurrency(r.estMethodCogs)}</CalcHighlight>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('estMethodMargin')}>
            <CalcLabel>推定マージン</CalcLabel>
            <CalcHighlight $color={palette.warningDark}>
              {formatCurrency(r.estMethodMargin)}
            </CalcHighlight>
          </CalcRow>
          <CalcRow $clickable onClick={() => onExplain('estMethodMarginRate')}>
            <CalcLabel>推定マージン率</CalcLabel>
            <CalcHighlight $color={palette.warningDark}>
              {formatPercent(r.estMethodMarginRate)}
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
                ? formatCurrency(r.estMethodClosingInventory)
                : '-'}
            </CalcHighlight>
          </CalcRow>
        </Card>
      </SummaryGrid>

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
                <VarianceRow $severity={severity}>
                  <VarianceLabel>
                    期末在庫乖離（実績 − 推定）
                    {severity === 'high' && ' — 要確認'}
                    {severity === 'mid' && ' — 注意'}
                  </VarianceLabel>
                  <VarianceValue>
                    {formatCurrency(invDiff)}（{formatPercent(invDiffRate)}）
                  </VarianceValue>
                </VarianceRow>
              )
            })()}
          </Section>
        )}

      {/* 4. 仕入・売変・移動 ─「コストの内訳は？」 */}
      <Section>
        <SectionTitle>仕入・売変詳細</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="在庫仕入原価"
            value={formatCurrency(r.inventoryCost)}
            accent={palette.warningDark}
            onClick={() => onExplain('inventoryCost')}
          />
          <KpiCard
            label="売上納品原価"
            value={formatCurrency(r.deliverySalesCost)}
            subText={`売価: ${formatCurrency(r.deliverySalesPrice)}`}
            accent={palette.pinkDark}
            onClick={() => onExplain('deliverySalesCost')}
          />
          <KpiCard
            label="原価算入費"
            value={formatCurrency(r.totalCostInclusion)}
            subText={`原価算入率: ${formatPercent(r.costInclusionRate)}`}
            accent={palette.orange}
            onClick={() => onExplain('totalCostInclusion')}
          />
          <KpiCard
            label="売変ロス原価"
            value={formatCurrency(r.discountLossCost)}
            subText={`売変額: ${formatCurrency(r.totalDiscount)}`}
            accent={sc.negative}
            onClick={() => onExplain('discountLossCost')}
          />
        </KpiGrid>
      </Section>

      <Section>
        <SectionTitle>移動集計</SectionTitle>
        <KpiGrid>
          <KpiCard
            label="店間入"
            value={formatCurrency(r.transferDetails.interStoreIn.cost)}
            accent={sc.positive}
          />
          <KpiCard
            label="店間出"
            value={formatCurrency(r.transferDetails.interStoreOut.cost)}
            accent={sc.negative}
          />
          <KpiCard
            label="部門間入"
            value={formatCurrency(r.transferDetails.interDepartmentIn.cost)}
            accent={palette.blueDark}
          />
          <KpiCard
            label="部門間出"
            value={formatCurrency(r.transferDetails.interDepartmentOut.cost)}
            accent={palette.purpleDeep}
          />
        </KpiGrid>
      </Section>

      {/* 5. カテゴリ構造 ─「内訳は？」 */}
      {categoryData.length > 0 && (
        <Section>
          <SectionTitle>カテゴリ別明細</SectionTitle>
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
                    {formatPercent(
                      safeDivide(
                        categoryData.reduce((s, d) => s + d.price, 0) -
                          categoryData.reduce((s, d) => s + d.cost, 0),
                        categoryData.reduce((s, d) => s + d.price, 0),
                        0,
                      ),
                    )}
                  </Td>
                  <Td $accent>100.0%</Td>
                </TotalRow>
              </tbody>
            </Table>
          </TableWrapper>
        </Section>
      )}
    </>
  )
}
