import { useState, useCallback, memo } from 'react'
import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import {
  formatPercent,
  formatCurrency,
  safeDivide,
  getEffectiveGrossProfitRate,
} from '@/domain/calculations/utils'
import type { MetricId, StoreResult } from '@/domain/models'
import { DISCOUNT_TYPES } from '@/domain/models'
import type { WidgetContext } from './types'

// ─── Styled Components ──────────────────────────────────

const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`

const Card = styled.div<{ $borderColor: string; $clickable?: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.md};
  position: relative;
  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;
    transition: box-shadow 0.15s, transform 0.15s;
    &:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.10);
      transform: translateY(-1px);
    }
  `}
`

const Signal = styled.div<{ $color: string }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  box-shadow: 0 0 8px ${({ $color }) => `${$color}60`};
  flex-shrink: 0;
  margin-top: 2px;
`

const CardContent = styled.div`
  flex: 1;
  min-width: 0;
`

const CardLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const CardValue = styled.div<{ $color: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color};
`

const CardSub = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const ChipRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
`

const EvidenceChip = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'};
  color: ${({ theme }) => theme.colors.text4};
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.palette.primary};
    color: #fff;
  }
`

// ─── Store Breakdown Overlay ────────────────────────────

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
`

const BreakdownPanel = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  min-width: 320px;
  max-width: 480px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`

const BreakdownTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const BreakdownRow = styled.div<{ $bold?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  ${({ $bold }) => $bold && 'font-weight: 700;'}
`

const BreakdownLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

const BreakdownValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const BreakdownSignal = styled.span<{ $color: string }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

const CloseBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-top: ${({ theme }) => theme.spacing[4]};
  display: block;
  width: 100%;
  text-align: center;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

// ─── Signal Logic ───────────────────────────────────────

type SignalLevel = 'green' | 'yellow' | 'red'

const SIGNAL_COLORS: Record<SignalLevel, string> = {
  green: palette.positive,
  yellow: palette.caution,
  red: palette.negative,
}

interface ConditionItem {
  label: string
  value: string
  sub?: string
  signal: SignalLevel
  metricId?: MetricId
  /** 店舗内訳を計算する関数（store breakdown用） */
  storeValue?: (sr: StoreResult) => { value: string; signal: SignalLevel }
}

// ─── Store breakdown value extractors ───────────────────

function gpRateBreakdown(
  sr: StoreResult,
  targetRate: number,
  warningRate: number,
): { value: string; signal: SignalLevel } {
  const rate = getEffectiveGrossProfitRate(sr)
  return {
    value: formatPercent(rate),
    signal: rate >= targetRate ? 'green' : rate >= warningRate ? 'yellow' : 'red',
  }
}

function budgetProgressBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  return {
    value: formatPercent(sr.budgetProgressRate),
    signal: sr.budgetProgressRate >= 1 ? 'green' : sr.budgetProgressRate >= 0.9 ? 'yellow' : 'red',
  }
}

function projectedAchievementBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  return {
    value: formatPercent(sr.projectedAchievement),
    signal:
      sr.projectedAchievement >= 1 ? 'green' : sr.projectedAchievement >= 0.95 ? 'yellow' : 'red',
  }
}

function discountRateBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  return {
    value: formatPercent(sr.discountRate),
    signal: sr.discountRate <= 0.03 ? 'green' : sr.discountRate <= 0.05 ? 'yellow' : 'red',
  }
}

function consumableRateBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  return {
    value: formatPercent(sr.consumableRate),
    signal: sr.consumableRate <= 0.02 ? 'green' : sr.consumableRate <= 0.03 ? 'yellow' : 'red',
  }
}

function customersBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  return {
    value: `${sr.totalCustomers.toLocaleString()}人`,
    signal: 'green',
  }
}

function txValueBreakdown(sr: StoreResult): { value: string; signal: SignalLevel } {
  const tx = safeDivide(sr.totalSales, sr.totalCustomers, 0)
  return {
    value: `${tx.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}円`,
    signal: 'green',
  }
}

// ─── Component ──────────────────────────────────────────

export const ConditionSummaryWidget = memo(function ConditionSummaryWidget({
  ctx,
}: {
  ctx: WidgetContext
}) {
  const r = ctx.result
  const { targetRate, warningRate, onExplain, allStoreResults, stores } = ctx
  const [breakdownItem, setBreakdownItem] = useState<ConditionItem | null>(null)

  const hasMultipleStores = allStoreResults.size > 1

  const handleCardClick = useCallback(
    (item: ConditionItem) => {
      if (hasMultipleStores && item.storeValue) {
        setBreakdownItem(item)
      }
    },
    [hasMultipleStores],
  )

  const handleEvidenceClick = useCallback(
    (e: React.MouseEvent, metricId: MetricId) => {
      e.stopPropagation()
      onExplain(metricId)
    },
    [onExplain],
  )

  const gpRate = getEffectiveGrossProfitRate(r)
  const gpAfterConsumable =
    r.invMethodGrossProfitRate != null
      ? safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
      : r.estMethodMarginRate
  const costRate = safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0)

  const items: ConditionItem[] = [
    // 1. Gross Profit Rate
    {
      label: '粗利率',
      value: formatPercent(gpRate),
      sub: `目標 ${formatPercent(targetRate)} / 原価率 ${formatPercent(costRate)} / 売変率 ${formatPercent(r.discountRate)} / 消耗品率 ${formatPercent(r.consumableRate)}`,
      signal: gpRate >= targetRate ? 'green' : gpRate >= warningRate ? 'yellow' : 'red',
      metricId:
        r.invMethodGrossProfitRate != null ? 'invMethodGrossProfitRate' : 'estMethodMarginRate',
      storeValue: (sr) => gpRateBreakdown(sr, targetRate, warningRate),
    },
    // 2. GP Rate after consumables
    {
      label: '原算後粗利率',
      value: formatPercent(gpAfterConsumable),
      sub: `粗利率 ${formatPercent(gpRate)} - 消耗品率 ${formatPercent(r.consumableRate)}（${formatCurrency(r.totalConsumable)}）`,
      signal:
        gpAfterConsumable >= targetRate
          ? 'green'
          : gpAfterConsumable >= warningRate
            ? 'yellow'
            : 'red',
      metricId:
        r.invMethodGrossProfitRate != null ? 'invMethodGrossProfitRate' : 'estMethodMarginRate',
      storeValue: (sr) => {
        const afterCon =
          sr.invMethodGrossProfitRate != null
            ? safeDivide(sr.invMethodGrossProfit! - sr.totalConsumable, sr.totalSales, 0)
            : sr.estMethodMarginRate
        return {
          value: formatPercent(afterCon),
          signal: afterCon >= targetRate ? 'green' : afterCon >= warningRate ? 'yellow' : 'red',
        }
      },
    },
    // 3. Budget Progress Rate
    {
      label: '予算消化率',
      value: formatPercent(r.budgetProgressRate),
      sub: `達成率 ${formatPercent(r.budgetAchievementRate)} / 残予算 ${formatCurrency(r.remainingBudget)}`,
      signal: r.budgetProgressRate >= 1 ? 'green' : r.budgetProgressRate >= 0.9 ? 'yellow' : 'red',
      metricId: 'budgetProgressRate',
      storeValue: budgetProgressBreakdown,
    },
    // 4. Projected Achievement
    {
      label: '着地予測達成率',
      value: formatPercent(r.projectedAchievement),
      sub: `予測 ${formatCurrency(r.projectedSales)} / 予算 ${formatCurrency(r.budget)}`,
      signal:
        r.projectedAchievement >= 1 ? 'green' : r.projectedAchievement >= 0.95 ? 'yellow' : 'red',
      metricId: 'projectedSales',
      storeValue: projectedAchievementBreakdown,
    },
    // 5. Discount Rate
    {
      label: '売変率',
      value: formatPercent(r.discountRate),
      sub: `売変額 ${formatCurrency(r.totalDiscount)} / 粗売上 ${formatCurrency(r.grossSales)}`,
      signal: r.discountRate <= 0.03 ? 'green' : r.discountRate <= 0.05 ? 'yellow' : 'red',
      metricId: 'discountRate',
      storeValue: discountRateBreakdown,
    },
  ]

  // 5b. Discount Breakdown (71-74)
  if (r.discountEntries.length > 0) {
    const totalDiscount = r.discountEntries.reduce((s, e) => s + e.amount, 0)
    for (const dt of DISCOUNT_TYPES) {
      const entry = r.discountEntries.find((e) => e.type === dt.type)
      const amt = entry?.amount ?? 0
      const rate = r.grossSales > 0 ? safeDivide(amt, r.grossSales, 0) : 0
      const pct = totalDiscount > 0 ? amt / totalDiscount : 0
      items.push({
        label: `${dt.label}（${dt.type}）`,
        value: formatCurrency(amt),
        sub: `売変率: ${formatPercent(rate)} / 構成比: ${formatPercent(pct, 1)}`,
        signal: rate <= 0.01 ? 'green' : rate <= 0.02 ? 'yellow' : 'red',
        metricId: 'discountRate',
      })
    }
  }

  items.push(
    // 6. Consumable Rate
    {
      label: '消耗品率',
      value: formatPercent(r.consumableRate),
      sub: `消耗品費 ${formatCurrency(r.totalConsumable)} / 売上 ${formatCurrency(r.totalSales)}`,
      signal: r.consumableRate <= 0.02 ? 'green' : r.consumableRate <= 0.03 ? 'yellow' : 'red',
      metricId: 'totalConsumable',
      storeValue: consumableRateBreakdown,
    },
  )

  // 7. Customer YoY (if prev year data available)
  const prevYear = ctx.prevYear
  if (prevYear.hasPrevYear && prevYear.totalCustomers > 0 && r.totalCustomers > 0) {
    const custYoY = r.totalCustomers / prevYear.totalCustomers
    items.push({
      label: '客数前年比',
      value: formatPercent(custYoY, 2),
      sub: `${r.totalCustomers.toLocaleString()}人 / 前年${prevYear.totalCustomers.toLocaleString()}人`,
      signal: custYoY >= 1 ? 'green' : custYoY >= 0.95 ? 'yellow' : 'red',
      metricId: 'totalCustomers',
      storeValue: customersBreakdown,
    })
  }

  // 8. Transaction Value
  if (r.totalCustomers > 0) {
    const txValue = safeDivide(r.totalSales, r.totalCustomers, 0)
    const prevTxValue =
      prevYear.hasPrevYear && prevYear.totalCustomers > 0
        ? safeDivide(prevYear.totalSales, prevYear.totalCustomers, 0)
        : null
    const txYoY = prevTxValue != null && prevTxValue > 0 ? txValue / prevTxValue : null
    const fmtTx = (v: number) =>
      `${v.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}円`
    items.push({
      label: '客単価',
      value: fmtTx(txValue),
      sub:
        prevTxValue != null
          ? `前年: ${fmtTx(prevTxValue)} (${formatPercent(txYoY!, 2)})`
          : `日平均客数: ${Math.round(r.averageCustomersPerDay)}人`,
      signal: txYoY != null ? (txYoY >= 1 ? 'green' : txYoY >= 0.97 ? 'yellow' : 'red') : 'green',
      metricId: 'totalCustomers',
      storeValue: txValueBreakdown,
    })
  }

  // Sort store entries by code
  const sortedStoreEntries = [...allStoreResults.entries()].sort(([, a], [, b]) => {
    const sa = stores.get(a.storeId)
    const sb = stores.get(b.storeId)
    return (sa?.code ?? a.storeId).localeCompare(sb?.code ?? b.storeId)
  })

  return (
    <Wrapper>
      <Title>コンディションサマリー</Title>
      <Grid>
        {items.map((item) => {
          const color = SIGNAL_COLORS[item.signal]
          const isClickable = hasMultipleStores && !!item.storeValue
          return (
            <Card
              key={item.label}
              $borderColor={color}
              $clickable={isClickable}
              onClick={isClickable ? () => handleCardClick(item) : undefined}
            >
              <ChipRow>
                {item.metricId && (
                  <EvidenceChip
                    onClick={(e) => handleEvidenceClick(e, item.metricId!)}
                    title="計算根拠を表示"
                  >
                    根拠
                  </EvidenceChip>
                )}
              </ChipRow>
              <Signal $color={color} />
              <CardContent>
                <CardLabel>{item.label}</CardLabel>
                <CardValue $color={color}>{item.value}</CardValue>
                {item.sub && <CardSub>{item.sub}</CardSub>}
              </CardContent>
            </Card>
          )
        })}
      </Grid>

      {/* Store Breakdown Overlay */}
      {breakdownItem && (
        <Overlay onClick={() => setBreakdownItem(null)}>
          <BreakdownPanel onClick={(e) => e.stopPropagation()}>
            <BreakdownTitle>{breakdownItem.label} — 店舗内訳</BreakdownTitle>
            {sortedStoreEntries.map(([storeId, sr]) => {
              const store = stores.get(storeId)
              const storeName = store?.name ?? storeId
              const bv = breakdownItem.storeValue!(sr)
              const signalColor = SIGNAL_COLORS[bv.signal]
              return (
                <BreakdownRow key={storeId}>
                  <BreakdownLabel>
                    <BreakdownSignal $color={signalColor} />
                    {storeName}
                  </BreakdownLabel>
                  <BreakdownValue $color={signalColor}>{bv.value}</BreakdownValue>
                </BreakdownRow>
              )
            })}
            <BreakdownRow $bold>
              <BreakdownLabel>合計</BreakdownLabel>
              <BreakdownValue $color={SIGNAL_COLORS[breakdownItem.signal]}>
                {breakdownItem.value}
              </BreakdownValue>
            </BreakdownRow>
            <CloseBtn onClick={() => setBreakdownItem(null)}>閉じる</CloseBtn>
          </BreakdownPanel>
        </Overlay>
      )}
    </Wrapper>
  )
})
