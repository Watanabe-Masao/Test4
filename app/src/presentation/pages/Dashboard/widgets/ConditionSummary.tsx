import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent, formatCurrency, safeDivide } from '@/domain/calculations/utils'
import type { MetricId } from '@/domain/models'
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

const HintBadge = styled.span`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text3};
  opacity: 0.5;
  pointer-events: none;
  ${Card}:hover & {
    opacity: 0.9;
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
}

// ─── Component ──────────────────────────────────────────

export function ConditionSummaryWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result
  const { targetRate, warningRate, onExplain } = ctx

  const gpRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
  const gpAfterConsumable =
    r.invMethodGrossProfitRate != null
      ? safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
      : r.estMethodMarginRate
  const costRate = safeDivide(r.inventoryCost + r.deliverySalesCost, r.grossSales, 0)

  const items: ConditionItem[] = [
    // 1. Gross Profit Rate — sub に構成成分を表示
    {
      label: '粗利率',
      value: formatPercent(gpRate),
      sub: `目標 ${formatPercent(targetRate)} / 原価率 ${formatPercent(costRate)} / 売変率 ${formatPercent(r.discountRate)} / 消耗品率 ${formatPercent(r.consumableRate)}`,
      signal: gpRate >= targetRate ? 'green' : gpRate >= warningRate ? 'yellow' : 'red',
      metricId:
        r.invMethodGrossProfitRate != null ? 'invMethodGrossProfitRate' : 'estMethodMarginRate',
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
    },
    // 3. Budget Achievement Rate (progress)
    {
      label: '予算消化率',
      value: formatPercent(r.budgetProgressRate),
      sub: `達成率 ${formatPercent(r.budgetAchievementRate)} / 残予算 ${formatCurrency(r.remainingBudget)}`,
      signal: r.budgetProgressRate >= 1 ? 'green' : r.budgetProgressRate >= 0.9 ? 'yellow' : 'red',
      metricId: 'budgetProgressRate',
    },
    // 4. Projected Achievement
    {
      label: '着地予測達成率',
      value: formatPercent(r.projectedAchievement),
      sub: `予測 ${formatCurrency(r.projectedSales)} / 予算 ${formatCurrency(r.budget)}`,
      signal:
        r.projectedAchievement >= 1 ? 'green' : r.projectedAchievement >= 0.95 ? 'yellow' : 'red',
      metricId: 'projectedSales',
    },
    // 5. Discount Rate — sub に売変額と粗売上を表示
    {
      label: '売変率',
      value: formatPercent(r.discountRate),
      sub: `売変額 ${formatCurrency(r.totalDiscount)} / 粗売上 ${formatCurrency(r.grossSales)}`,
      signal: r.discountRate <= 0.03 ? 'green' : r.discountRate <= 0.05 ? 'yellow' : 'red',
      metricId: 'discountRate',
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
    })
  }

  // 8. Transaction Value (小数第2位まで表示)
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
    })
  }

  return (
    <Wrapper>
      <Title>コンディションサマリー</Title>
      <Grid>
        {items.map((item) => {
          const color = SIGNAL_COLORS[item.signal]
          return (
            <Card
              key={item.label}
              $borderColor={color}
              $clickable={!!item.metricId}
              onClick={item.metricId ? () => onExplain(item.metricId!) : undefined}
            >
              {item.metricId && <HintBadge>根拠</HintBadge>}
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
    </Wrapper>
  )
}
