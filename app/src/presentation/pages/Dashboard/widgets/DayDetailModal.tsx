import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell as ReCell, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { formatCurrency, formatPercent } from '@/domain/calculations/utils'
import { getDailyTotalCost } from '@/domain/models/DailyRecord'
import type { DailyRecord } from '@/domain/models'
import type { PrevYearData } from '@/application/hooks'
import {
  PinModalOverlay,
  DetailModalContent, DetailHeader, DetailTitle, DetailCloseBtn,
  DetailKpiGrid, DetailKpiCard, DetailKpiLabel, DetailKpiValue,
  DetailSection, DetailSectionTitle, DetailRow, DetailLabel, DetailValue,
  DetailBarWrapper, DetailBarRow, DetailBarLabel, DetailBarTrack, DetailBarFill, DetailBarAmount,
  DetailChartWrapper, DetailColumns,
} from '../DashboardPage.styles'

/** 千円表記 (コンパクト) */
function fmtSen(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen.toLocaleString()}千`
}

interface DayDetailModalProps {
  day: number
  month: number
  year: number
  record: DailyRecord | undefined
  budget: number
  cumBudget: number
  cumSales: number
  cumPrevYear: number
  prevYear: PrevYearData
  onClose: () => void
}

export function DayDetailModal({
  day, month, year, record, budget, cumBudget, cumSales, cumPrevYear, prevYear, onClose,
}: DayDetailModalProps) {
  const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土']

  const actual = record?.sales ?? 0
  const diff = actual - budget
  const ach = budget > 0 ? actual / budget : 0
  const cumDiff = cumSales - cumBudget
  const cumAch = cumBudget > 0 ? cumSales / cumBudget : 0
  const pySales = prevYear.daily.get(day)?.sales ?? 0
  const pyRatio = pySales > 0 ? actual / pySales : 0
  const cumPyRatio = cumPrevYear > 0 ? cumSales / cumPrevYear : 0
  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

  // Cumulative chart data
  const cumChartData = Array.from({ length: day }, (_, i) => {
    const d = i + 1
    // We need to recalculate from the props - the parent passes final cumulative values for this day
    // For the chart we need all days up to this day, but we only have the final values
    // So we accept them as-is and let the parent provide cumBudget/cumSales for this day
    return { day: d }
  })
  // The parent should provide cumulative data arrays; for now use simplified approach
  // Build from record data - but we don't have all days here.
  // Better approach: accept chartData as a prop
  void cumChartData // Will be replaced by prop-based approach below

  return (
    <PinModalOverlay onClick={onClose}>
      <DetailModalContent onClick={(e) => e.stopPropagation()}>
        <DetailHeader>
          <DetailTitle>{month}月{day}日（{dayOfWeek}）の詳細</DetailTitle>
          <DetailCloseBtn onClick={onClose}>✕</DetailCloseBtn>
        </DetailHeader>

        {/* KPI Cards */}
        <DetailKpiGrid>
          <DetailKpiCard $accent="#6366f1">
            <DetailKpiLabel>予算</DetailKpiLabel>
            <DetailKpiValue>{formatCurrency(budget)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={actual >= budget ? '#22c55e' : '#ef4444'}>
            <DetailKpiLabel>実績</DetailKpiLabel>
            <DetailKpiValue>{formatCurrency(actual)}</DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={diff >= 0 ? '#22c55e' : '#ef4444'}>
            <DetailKpiLabel>予算差異</DetailKpiLabel>
            <DetailKpiValue $color={diff >= 0 ? '#22c55e' : '#ef4444'}>
              {formatCurrency(diff)}
            </DetailKpiValue>
          </DetailKpiCard>
          <DetailKpiCard $accent={ach >= 1 ? '#22c55e' : ach >= 0.9 ? '#f59e0b' : '#ef4444'}>
            <DetailKpiLabel>達成率</DetailKpiLabel>
            <DetailKpiValue $color={ach >= 1 ? '#22c55e' : ach >= 0.9 ? '#f59e0b' : '#ef4444'}>
              {formatPercent(ach)}
            </DetailKpiValue>
          </DetailKpiCard>
        </DetailKpiGrid>

        {/* Budget vs Actual Bar (当日) */}
        <DetailSection>
          <DetailSectionTitle>予算 vs 実績（当日）</DetailSectionTitle>
          {(() => {
            const maxVal = Math.max(budget, actual, pySales, 1)
            return (
              <DetailBarWrapper>
                <DetailBarRow>
                  <DetailBarLabel>予算</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(budget / maxVal) * 100} $color="#6366f1">
                      <DetailBarAmount>{fmtSen(budget)}</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                <DetailBarRow>
                  <DetailBarLabel>実績</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(actual / maxVal) * 100} $color="#22c55e">
                      <DetailBarAmount>{fmtSen(actual)}（{formatPercent(ach)}）</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                {prevYear.hasPrevYear && pySales > 0 && (
                  <DetailBarRow>
                    <DetailBarLabel>前年</DetailBarLabel>
                    <DetailBarTrack>
                      <DetailBarFill $width={(pySales / maxVal) * 100} $color="#9ca3af">
                        <DetailBarAmount>{fmtSen(pySales)}（{formatPercent(pyRatio)}）</DetailBarAmount>
                      </DetailBarFill>
                    </DetailBarTrack>
                  </DetailBarRow>
                )}
              </DetailBarWrapper>
            )
          })()}
        </DetailSection>

        {/* Budget vs Actual Bar (累計) */}
        <DetailSection>
          <DetailSectionTitle>予算 vs 実績（累計）</DetailSectionTitle>
          {(() => {
            const maxVal = Math.max(cumBudget, cumSales, cumPrevYear, 1)
            return (
              <DetailBarWrapper>
                <DetailBarRow>
                  <DetailBarLabel>予算</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(cumBudget / maxVal) * 100} $color="#6366f1">
                      <DetailBarAmount>{fmtSen(cumBudget)}</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                <DetailBarRow>
                  <DetailBarLabel>実績</DetailBarLabel>
                  <DetailBarTrack>
                    <DetailBarFill $width={(cumSales / maxVal) * 100} $color="#22c55e">
                      <DetailBarAmount>{fmtSen(cumSales)}（{formatPercent(cumAch)}）</DetailBarAmount>
                    </DetailBarFill>
                  </DetailBarTrack>
                </DetailBarRow>
                {prevYear.hasPrevYear && cumPrevYear > 0 && (
                  <DetailBarRow>
                    <DetailBarLabel>前年</DetailBarLabel>
                    <DetailBarTrack>
                      <DetailBarFill $width={(cumPrevYear / maxVal) * 100} $color="#9ca3af">
                        <DetailBarAmount>{fmtSen(cumPrevYear)}（{formatPercent(cumPyRatio)}）</DetailBarAmount>
                      </DetailBarFill>
                    </DetailBarTrack>
                  </DetailBarRow>
                )}
              </DetailBarWrapper>
            )
          })()}
        </DetailSection>

        <DetailColumns>
          {/* Left: Cumulative */}
          <DetailSection>
            <DetailSectionTitle>累計情報（1日〜{day}日）</DetailSectionTitle>
            <DetailRow>
              <DetailLabel>予算累計</DetailLabel>
              <DetailValue>{formatCurrency(cumBudget)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>実績累計</DetailLabel>
              <DetailValue>{formatCurrency(cumSales)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>累計差異</DetailLabel>
              <DetailValue $color={cumDiff >= 0 ? '#22c55e' : '#ef4444'}>{formatCurrency(cumDiff)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>累計達成率</DetailLabel>
              <DetailValue $color={cumAch >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(cumAch)}</DetailValue>
            </DetailRow>
            {prevYear.hasPrevYear && pySales > 0 && (
              <>
                <DetailRow>
                  <DetailLabel>前年同曜日</DetailLabel>
                  <DetailValue>{formatCurrency(pySales)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>前年比</DetailLabel>
                  <DetailValue $color={pyRatio >= 1 ? '#22c55e' : '#ef4444'}>{formatPercent(pyRatio)}</DetailValue>
                </DetailRow>
              </>
            )}
          </DetailSection>

          {/* Right: Breakdown */}
          <DetailSection>
            <DetailSectionTitle>売上内訳</DetailSectionTitle>
            {record ? (() => {
              const totalCost = getDailyTotalCost(record)
              const items: { label: string; cost: number; price: number }[] = [
                { label: '仕入（在庫）', cost: record.purchase.cost, price: record.purchase.price },
                { label: '花', cost: record.flowers.cost, price: record.flowers.price },
                { label: '産直', cost: record.directProduce.cost, price: record.directProduce.price },
                { label: '店間入', cost: record.interStoreIn.cost, price: record.interStoreIn.price },
                { label: '店間出', cost: record.interStoreOut.cost, price: record.interStoreOut.price },
                { label: '部門間入', cost: record.interDepartmentIn.cost, price: record.interDepartmentIn.price },
                { label: '部門間出', cost: record.interDepartmentOut.cost, price: record.interDepartmentOut.price },
              ].filter(item => item.cost !== 0 || item.price !== 0)
              const totalPrice = items.reduce((sum, item) => sum + Math.abs(item.price), 0)

              const barData = items.map(item => ({
                name: item.label,
                cost: item.cost,
                price: item.price,
              }))

              return (
                <>
                  {barData.length > 0 && (
                    <DetailChartWrapper>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${Math.round(v / 10000)}万`} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                          <Tooltip formatter={(val, name) => [formatCurrency((val as number) ?? 0), name === 'cost' ? '原価' : '売価']} />
                          <Bar dataKey="cost" fill="#f59e0b" name="cost" barSize={8}>
                            {barData.map((_, i) => <ReCell key={i} fill="#f59e0b" />)}
                          </Bar>
                          <Bar dataKey="price" fill="#6366f1" name="price" barSize={8}>
                            {barData.map((_, i) => <ReCell key={i} fill="#6366f1" />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </DetailChartWrapper>
                  )}
                  {items.map((item) => {
                    const ratio = totalPrice > 0 ? Math.abs(item.price) / totalPrice : 0
                    return (
                      <DetailRow key={item.label}>
                        <DetailLabel>{item.label}</DetailLabel>
                        <DetailValue>
                          {formatCurrency(item.price)} <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>(原 {formatCurrency(item.cost)})</span>
                          <span style={{ color: '#6366f1', fontSize: '0.75rem', marginLeft: '4px' }}>({formatPercent(ratio)})</span>
                        </DetailValue>
                      </DetailRow>
                    )
                  })}
                  <DetailRow>
                    <DetailLabel>総仕入原価</DetailLabel>
                    <DetailValue>{formatCurrency(totalCost)}</DetailValue>
                  </DetailRow>
                  {record.consumable.cost > 0 && (
                    <DetailRow>
                      <DetailLabel>消耗品費</DetailLabel>
                      <DetailValue>{formatCurrency(record.consumable.cost)}</DetailValue>
                    </DetailRow>
                  )}
                  {record.discountAmount !== 0 && (
                    <DetailRow>
                      <DetailLabel>売変額</DetailLabel>
                      <DetailValue $color="#ef4444">{formatCurrency(record.discountAmount)}</DetailValue>
                    </DetailRow>
                  )}
                </>
              )
            })() : (
              <DetailRow>
                <DetailLabel>データなし</DetailLabel>
                <DetailValue>-</DetailValue>
              </DetailRow>
            )}
          </DetailSection>
        </DetailColumns>
      </DetailModalContent>
    </PinModalOverlay>
  )
}
