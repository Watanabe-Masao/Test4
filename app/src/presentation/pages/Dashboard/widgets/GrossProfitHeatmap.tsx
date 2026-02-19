import styled from 'styled-components'
import { formatPercent } from '@/domain/calculations/utils'
import { getDailyTotalCost } from '@/domain/models/DailyRecord'
import type { WidgetContext } from './types'

// ─── Styled Components ──────────────────────────────────

const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  overflow-x: auto;
`

const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const HeatTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  table-layout: fixed;
`

const HeatTh = styled.th`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[1]}`};
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
`

const HeatThStore = styled(HeatTh)`
  text-align: left;
  width: 80px;
  min-width: 80px;
`

const HeatTd = styled.td<{ $bg: string; $textColor: string }>`
  padding: ${({ theme }) => `${theme.spacing[1]}`};
  text-align: center;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.5rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  background: ${({ $bg }) => $bg};
  color: ${({ $textColor }) => $textColor};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'};
  cursor: default;
  position: relative;
  &:hover {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -1px;
    z-index: 1;
  }
`

const HeatTdStore = styled.td`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const EmptyCell = styled.td`
  padding: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'};
`

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
`

const LegendSwatch = styled.div<{ $bg: string }>`
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background: ${({ $bg }) => $bg};
  border: 1px solid rgba(0,0,0,0.1);
`

// ─── Color Logic ────────────────────────────────────────

function rateToColor(rate: number, target: number, warning: number): { bg: string; text: string } {
  if (rate >= target) {
    // Green zone: stronger green for higher rates
    const intensity = Math.min((rate - target) / 0.05, 1)
    const alpha = 0.25 + intensity * 0.35
    return { bg: `rgba(34, 197, 94, ${alpha})`, text: alpha > 0.4 ? '#fff' : '#166534' }
  }
  if (rate >= warning) {
    // Yellow zone
    const intensity = (rate - warning) / (target - warning)
    const alpha = 0.2 + (1 - intensity) * 0.3
    return { bg: `rgba(234, 179, 8, ${alpha})`, text: '#854d0e' }
  }
  // Red zone: stronger red for lower rates
  const intensity = Math.min((warning - rate) / 0.05, 1)
  const alpha = 0.25 + intensity * 0.35
  return { bg: `rgba(239, 68, 68, ${alpha})`, text: alpha > 0.4 ? '#fff' : '#991b1b' }
}

// ─── Component ──────────────────────────────────────────

export function GrossProfitHeatmapWidget({ ctx }: { ctx: WidgetContext }) {
  const { allStoreResults, stores, daysInMonth, targetRate, warningRate } = ctx

  // Build store data rows
  const storeRows: { id: string; name: string; dailyRates: Map<number, number> }[] = []

  for (const [storeId, result] of allStoreResults) {
    const store = stores.get(storeId)
    const name = store?.name ?? storeId
    const dailyRates = new Map<number, number>()

    // Calculate cumulative GP rate up to each day
    let cumSales = 0
    let cumCost = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = result.daily.get(d)
      if (rec) {
        cumSales += rec.sales
        cumCost += getDailyTotalCost(rec)
        if (cumSales > 0) {
          dailyRates.set(d, (cumSales - cumCost) / cumSales)
        }
      }
    }
    storeRows.push({ id: storeId, name, dailyRates })
  }

  if (storeRows.length === 0) return null

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <Wrapper>
      <Title>店舗別 粗利率ヒートマップ（累計）</Title>
      <HeatTable>
        <thead>
          <tr>
            <HeatThStore>店舗</HeatThStore>
            {days.map((d) => (
              <HeatTh key={d}>{d}</HeatTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {storeRows.map((row) => (
            <tr key={row.id}>
              <HeatTdStore>{row.name}</HeatTdStore>
              {days.map((d) => {
                const rate = row.dailyRates.get(d)
                if (rate == null) {
                  return <EmptyCell key={d} />
                }
                const { bg, text } = rateToColor(rate, targetRate, warningRate)
                return (
                  <HeatTd key={d} $bg={bg} $textColor={text} title={`${row.name} ${d}日: ${formatPercent(rate)}`}>
                    {(rate * 100).toFixed(1)}
                  </HeatTd>
                )
              })}
            </tr>
          ))}
        </tbody>
      </HeatTable>
      <Legend>
        <LegendSwatch $bg="rgba(239, 68, 68, 0.5)" />
        <span>低 (&lt;{(warningRate * 100).toFixed(0)}%)</span>
        <LegendSwatch $bg="rgba(234, 179, 8, 0.4)" />
        <span>注意 ({(warningRate * 100).toFixed(0)}〜{(targetRate * 100).toFixed(0)}%)</span>
        <LegendSwatch $bg="rgba(34, 197, 94, 0.5)" />
        <span>良好 (&ge;{(targetRate * 100).toFixed(0)}%)</span>
      </Legend>
    </Wrapper>
  )
}
