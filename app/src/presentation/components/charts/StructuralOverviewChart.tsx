import { useMemo, useCallback, memo } from 'react'
import styled from 'styled-components'
import { toPct, toComma } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { safeDivide, getEffectiveGrossProfitRate } from '@/domain/calculations/utils'
import { useCrossChartSelection } from './crossChartSelectionHooks'
import type { StoreResult } from '@/domain/models'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const FlowContainer = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
  min-height: 220px;
`

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  flex: 1;
  min-width: 0;
`

const ColumnLabel = styled.div`
  font-size: 0.55rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text4};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`

const FlowNode = styled.div<{ $color: string; $height: number; $clickable?: boolean }>`
  background: ${({ $color }) => $color}18;
  border: 1px solid ${({ $color }) => $color}40;
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  min-height: ${({ $height }) => Math.max($height, 36)}px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: border-color 0.15s;
  &:hover {
    ${({ $clickable, $color }) => ($clickable ? `border-color: ${$color};` : '')}
  }
`

const NodeLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const NodeValue = styled.div`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const NodeSub = styled.div`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const YoyBadge = styled.span<{ $positive: boolean }>`
  display: inline-block;
  font-size: 0.45rem;
  font-weight: 600;
  padding: 0 3px;
  border-radius: 2px;
  margin-left: 4px;
  color: ${({ $positive }) => sc.cond($positive)};
  background: ${({ $positive }) => ($positive ? 'rgba(14,165,233,0.1)' : 'rgba(249,115,22,0.1)')};
`

const Arrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.text4};
  font-size: 0.8rem;
`

const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  flex-wrap: wrap;
`

const SumCard = styled.div<{ $color: string }>`
  flex: 1;
  min-width: 120px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
`

const SumLabel = styled.div`
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

const SumValue = styled.div`
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

interface Props {
  result: StoreResult
  prevYearResult?: StoreResult
}

/** 収益構造俯瞰図: 売上→原価→売変→粗利のフロー可視化 */
export const StructuralOverviewChart = memo(function StructuralOverviewChart({
  result,
  prevYearResult,
}: Props) {
  const r = result
  const prev = prevYearResult
  const { requestDrillThrough } = useCrossChartSelection()

  const handleDrillThrough = useCallback(
    (widgetId: string) => {
      requestDrillThrough({ widgetId })
    },
    [requestDrillThrough],
  )

  const nodes = useMemo(() => {
    const grossSales = r.grossSales
    const totalSales = r.totalSales
    const totalCost = r.inventoryCost + r.deliverySalesCost
    const discount = r.totalDiscount
    const consumable = r.totalConsumable
    const gpInv = r.invMethodGrossProfit
    const gpEst = r.estMethodMargin
    const budget = r.grossProfitBudget

    // 前年比計算
    const yoy = (cur: number, prevVal: number | undefined) => {
      if (prevVal == null || prevVal === 0) return null
      return cur / prevVal
    }

    return {
      // 左列: 収入
      grossSales: { value: grossSales, yoy: yoy(grossSales, prev?.grossSales) },
      totalSales: { value: totalSales, yoy: yoy(totalSales, prev?.totalSales) },
      // 中間列: コスト構造
      cost: {
        value: totalCost,
        yoy: yoy(totalCost, prev ? prev.inventoryCost + prev.deliverySalesCost : undefined),
      },
      discount: { value: discount, yoy: yoy(discount, prev?.totalDiscount) },
      consumable: { value: consumable, yoy: yoy(consumable, prev?.totalConsumable) },
      // 右列: 利益
      gpInv: {
        value: gpInv,
        yoy:
          gpInv != null && prev?.invMethodGrossProfit != null
            ? yoy(gpInv, prev.invMethodGrossProfit)
            : null,
      },
      gpEst: { value: gpEst, yoy: yoy(gpEst, prev?.estMethodMargin) },
      budget: { value: budget },
      // 率
      discountRate: r.discountRate,
      gpRateInv: r.invMethodGrossProfitRate,
      gpRateEst: r.estMethodMarginRate,
      markupRate: r.coreMarkupRate,
    }
  }, [r, prev])

  const fmtMan = (v: number | null | undefined) => {
    if (v == null) return '-'
    return `${Math.round(v / 10000).toLocaleString()}万`
  }

  const renderYoy = (ratio: number | null) => {
    if (ratio == null) return null
    return <YoyBadge $positive={ratio >= 1}>{toPct(ratio)}</YoyBadge>
  }

  // ノードの相対高さ（粗売上を100として）
  const base = nodes.grossSales.value || 1
  const h = (v: number | null | undefined) => Math.round(((v ?? 0) / base) * 160)

  return (
    <Wrapper aria-label="構造概要チャート">
      <Title>
        収益構造俯瞰図（売上→原価→売変→粗利）
        <ChartHelpButton guide={CHART_GUIDES['structural-overview']} />
      </Title>
      <FlowContainer>
        {/* 左: 売上 */}
        <Column>
          <ColumnLabel>収入</ColumnLabel>
          <FlowNode $color={palette.primary} $height={h(nodes.grossSales.value)}>
            <NodeLabel>粗売上</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.grossSales.value)}
              {renderYoy(nodes.grossSales.yoy)}
            </NodeValue>
            <NodeSub>{toComma(nodes.grossSales.value)}円</NodeSub>
          </FlowNode>
          <FlowNode $color={palette.purpleDark} $height={h(nodes.totalSales.value)}>
            <NodeLabel>純売上</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.totalSales.value)}
              {renderYoy(nodes.totalSales.yoy)}
            </NodeValue>
            <NodeSub>
              粗売上の{toPct(safeDivide(nodes.totalSales.value, nodes.grossSales.value, 0))}
            </NodeSub>
          </FlowNode>
        </Column>

        <Arrow>&rarr;</Arrow>

        {/* 中: コスト */}
        <Column>
          <ColumnLabel>コスト</ColumnLabel>
          <FlowNode
            $color={sc.negative}
            $height={h(nodes.cost.value)}
            $clickable
            onClick={() => handleDrillThrough('daily-sales')}
          >
            <NodeLabel>仕入原価</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.cost.value)}
              {renderYoy(nodes.cost.yoy)}
            </NodeValue>
            <NodeSub>値入率 {toPct(nodes.markupRate)}</NodeSub>
          </FlowNode>
          <FlowNode
            $color={palette.warningDark}
            $height={h(nodes.discount.value)}
            $clickable
            onClick={() => handleDrillThrough('discount-trend')}
          >
            <NodeLabel>売変額</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.discount.value)}
              {renderYoy(nodes.discount.yoy)}
            </NodeValue>
            <NodeSub>売変率 {toPct(nodes.discountRate)}</NodeSub>
          </FlowNode>
          <FlowNode $color={palette.orange} $height={h(nodes.consumable.value)}>
            <NodeLabel>消耗品費</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.consumable.value)}
              {renderYoy(nodes.consumable.yoy)}
            </NodeValue>
          </FlowNode>
        </Column>

        <Arrow>&rarr;</Arrow>

        {/* 右: 利益 */}
        <Column>
          <ColumnLabel>利益</ColumnLabel>
          {nodes.gpInv.value != null && (
            <FlowNode
              $color={sc.positive}
              $height={h(nodes.gpInv.value)}
              $clickable
              onClick={() => handleDrillThrough('gross-profit-rate')}
            >
              <NodeLabel>粗利（在庫法）</NodeLabel>
              <NodeValue>
                {fmtMan(nodes.gpInv.value)}
                {renderYoy(nodes.gpInv.yoy)}
              </NodeValue>
              <NodeSub>粗利率 {nodes.gpRateInv != null ? toPct(nodes.gpRateInv) : '-'}</NodeSub>
            </FlowNode>
          )}
          <FlowNode
            $color={palette.cyanDark}
            $height={h(nodes.gpEst.value)}
            $clickable
            onClick={() => handleDrillThrough('gross-profit-rate')}
          >
            <NodeLabel>在庫差分（推定法）</NodeLabel>
            <NodeValue>
              {fmtMan(nodes.gpEst.value)}
              {renderYoy(nodes.gpEst.yoy)}
            </NodeValue>
            <NodeSub>在庫差分率 {toPct(nodes.gpRateEst)}</NodeSub>
            <NodeSub>※損益ではありません</NodeSub>
          </FlowNode>
          {nodes.budget.value > 0 && (
            <FlowNode $color={palette.purpleDeep} $height={40}>
              <NodeLabel>粗利予算</NodeLabel>
              <NodeValue>{fmtMan(nodes.budget.value)}</NodeValue>
              <NodeSub>
                残: {fmtMan(nodes.budget.value - (nodes.gpInv.value ?? nodes.gpEst.value))}
              </NodeSub>
            </FlowNode>
          )}
        </Column>
      </FlowContainer>

      <SummaryRow>
        <SumCard $color={palette.primary}>
          <SumLabel>売上構成</SumLabel>
          <SumValue>
            原価 {toPct(safeDivide(nodes.cost.value, nodes.grossSales.value, 0))} / 売変{' '}
            {toPct(nodes.discountRate)} / 消耗品{' '}
            {toPct(safeDivide(nodes.consumable.value, nodes.totalSales.value, 0))}
          </SumValue>
        </SumCard>
        <SumCard $color={sc.positive}>
          <SumLabel>粗利率トレンド</SumLabel>
          <SumValue>
            {nodes.gpRateInv != null
              ? `在庫法: ${toPct(nodes.gpRateInv)}`
              : `推定法（在庫差分率）: ${toPct(nodes.gpRateEst)}`}
            {prev && (prev.invMethodGrossProfitRate != null || prev.estMethodMarginRate > 0) && (
              <YoyBadge
                $positive={getEffectiveGrossProfitRate(r) >= getEffectiveGrossProfitRate(prev)}
              >
                前年 {toPct(getEffectiveGrossProfitRate(prev))}
              </YoyBadge>
            )}
          </SumValue>
        </SumCard>
      </SummaryRow>
    </Wrapper>
  )
})
