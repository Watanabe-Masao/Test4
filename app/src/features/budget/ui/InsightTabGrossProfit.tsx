/**
 * 粗利計算タブ (在庫法 vs 推定法 + 乖離検知 + 在庫詳細 + 移動集計)。
 * 元は InsightTabBudget.tsx に同居していた GrossProfitTabContent を
 * 責務分離のため独立ファイルに切り出し (Phase 2-B / 2026-04-13)。
 *
 * @responsibility R:unclassified
 */
import { ChartErrorBoundary } from '@/presentation/components/common/feedback'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import type { MetricId } from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'
import {
  EstimatedInventoryDetailChart,
  DualPeriodSlider,
  useDualPeriodRange,
} from '@/presentation/components/charts'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import {
  Section,
  SectionTitle,
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
} from '@/presentation/pages/Insight/InsightPage.styles'

interface GrossProfitTabProps {
  readonly d: InsightData
  readonly r: StoreResult
  readonly onExplain: (metricId: MetricId) => void
}

export function GrossProfitTabContent({ d, r, onExplain }: GrossProfitTabProps) {
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(d.daysInMonth)

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
          <DualPeriodSlider
            min={1}
            max={d.daysInMonth}
            p1Start={rangeStart}
            p1End={rangeEnd}
            onP1Change={setRange}
            p2Start={p2Start}
            p2End={p2End}
            onP2Change={onP2Change}
            p2Enabled={p2Enabled}
          />
          <EstimatedInventoryDetailChart
            daily={r.daily}
            daysInMonth={d.daysInMonth}
            openingInventory={r.openingInventory}
            closingInventory={r.closingInventory}
            markupRate={r.coreMarkupRate}
            discountRate={r.discountRate}
            comparisonResults={d.selectedResults}
            stores={d.stores}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
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
