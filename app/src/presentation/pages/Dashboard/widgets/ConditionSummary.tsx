import styled from 'styled-components'
import { formatPercent, formatCurrency, safeDivide } from '@/domain/calculations/utils'
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

const Card = styled.div<{ $borderColor: string }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $borderColor }) => $borderColor};
  border-radius: ${({ theme }) => theme.radii.md};
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

// ─── Signal Logic ───────────────────────────────────────

type SignalLevel = 'green' | 'yellow' | 'red'

const SIGNAL_COLORS: Record<SignalLevel, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
}

interface ConditionItem {
  label: string
  value: string
  sub?: string
  signal: SignalLevel
}

// ─── Component ──────────────────────────────────────────

export function ConditionSummaryWidget({ ctx }: { ctx: WidgetContext }) {
  const r = ctx.result
  const { targetRate, warningRate } = ctx

  const gpRate = r.invMethodGrossProfitRate ?? r.estMethodMarginRate
  const gpAfterConsumable = r.invMethodGrossProfitRate != null
    ? safeDivide(r.invMethodGrossProfit! - r.totalConsumable, r.totalSales, 0)
    : r.estMethodMarginRate

  const items: ConditionItem[] = [
    // 1. Gross Profit Rate
    {
      label: '粗利率',
      value: formatPercent(gpRate),
      sub: `目標: ${formatPercent(targetRate)}`,
      signal: gpRate >= targetRate ? 'green' : gpRate >= warningRate ? 'yellow' : 'red',
    },
    // 2. GP Rate after consumables
    {
      label: '原算後粗利率',
      value: formatPercent(gpAfterConsumable),
      sub: `消耗品費: ${formatCurrency(r.totalConsumable)}`,
      signal: gpAfterConsumable >= targetRate ? 'green' : gpAfterConsumable >= warningRate ? 'yellow' : 'red',
    },
    // 3. Budget Achievement Rate (progress)
    {
      label: '予算消化率',
      value: formatPercent(r.budgetProgressRate),
      sub: `達成率: ${formatPercent(r.budgetAchievementRate)}`,
      signal: r.budgetProgressRate >= 1 ? 'green' : r.budgetProgressRate >= 0.9 ? 'yellow' : 'red',
    },
    // 4. Projected Achievement
    {
      label: '着地予測達成率',
      value: formatPercent(r.projectedAchievement),
      sub: `予測売上: ${formatCurrency(r.projectedSales)}`,
      signal: r.projectedAchievement >= 1 ? 'green' : r.projectedAchievement >= 0.95 ? 'yellow' : 'red',
    },
    // 5. Discount Rate
    {
      label: '売変率',
      value: formatPercent(r.discountRate),
      sub: `売変額: ${formatCurrency(r.totalDiscount)}`,
      signal: r.discountRate <= 0.03 ? 'green' : r.discountRate <= 0.05 ? 'yellow' : 'red',
    },
    // 6. Consumable Rate
    {
      label: '消耗品率',
      value: formatPercent(r.consumableRate),
      sub: `消耗品費: ${formatCurrency(r.totalConsumable)}`,
      signal: r.consumableRate <= 0.02 ? 'green' : r.consumableRate <= 0.03 ? 'yellow' : 'red',
    },
  ]

  return (
    <Wrapper>
      <Title>コンディションサマリー</Title>
      <Grid>
        {items.map((item) => {
          const color = SIGNAL_COLORS[item.signal]
          return (
            <Card key={item.label} $borderColor={color}>
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
