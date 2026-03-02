/**
 * モバイル専用ダッシュボード
 *
 * /mobile ルートでレンダリングされるスマートフォン向け画面。
 * AppShell を使わず、モバイルファーストの独自レイアウトを持つ。
 */
import { useState, useMemo, useCallback } from 'react'
import styled, { useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import {
  useCalculation,
  usePrevYearData,
  useStoreSelection,
  useAutoLoadPrevYear,
  useMonthSwitcher,
  useBudgetChartData,
} from '@/application/hooks'
import { useSettingsStore } from '@/application/stores/settingsStore'
import {
  formatCurrency,
  formatPercent,
  safeDivide,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import { sc } from '@/presentation/theme/semanticColors'
import { getDaysInMonth } from '@/domain/constants/defaults'
import type { AppTheme } from '@/presentation/theme/theme'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'

// ─── Types ─────────────────────────────────────────────────

type MobileTab = 'kpi' | 'chart' | 'daily'

// ─── Styled Components ─────────────────────────────────────

const MobileShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text};
  overflow: hidden;
`

const Header = styled.header`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const HeaderTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const HeaderSub = styled.div`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text4};
`

const MonthNav = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const MonthArrow = styled.button`
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 14px;
  &:active:not(:disabled) {
    opacity: 0.5;
  }
  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const DesktopLink = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.palette.primary};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  &:active {
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const TabBar = styled.div`
  flex-shrink: 0;
  display: flex;
  background: ${({ theme }) => theme.colors.bg2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  flex: 1;
  text-align: center;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text4)};
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
  &:active {
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const ScrollContent = styled.main`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: ${({ theme }) => theme.spacing[4]};
  padding-bottom: ${({ theme }) => theme.spacing[8]};
`

const KpiCardWrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const KpiRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const KpiLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

const KpiValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const KpiSub = styled.div<{ $color?: string }>`
  font-size: 11px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text4};
`

const KpiDivider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.spacing[3]} 0;
`

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};
`

const KpiMiniCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
`

const KpiMiniLabel = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

const KpiMiniValue = styled.div<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const ChartCard = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const ChartTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const EmptyMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60vh;
  gap: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text4};
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};
`

const EmptyIcon = styled.div`
  font-size: 48px;
`

const DailyRow = styled.div<{ $isWeekend: boolean }>`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $isWeekend, theme }) =>
    $isWeekend ? `${theme.colors.palette.danger ?? '#ef4444'}08` : 'transparent'};
`

const DailyDay = styled.div`
  width: 40px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text2};
`

const DailyValues = styled.div`
  flex: 1;
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
`

const DailyCol = styled.div`
  flex: 1;
  text-align: right;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text};
`

const DailyHeader = styled(DailyRow)`
  background: ${({ theme }) => theme.colors.bg3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
`

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

// ─── Component ─────────────────────────────────────────────

export function MobileDashboardPage() {
  const [tab, setTab] = useState<MobileTab>('kpi')
  const navigate = useNavigate()
  const theme = useTheme() as AppTheme

  const { isCalculated, daysInMonth } = useCalculation()
  const { currentResult, storeName } = useStoreSelection()
  const settings = useSettingsStore((s) => s.settings)
  const prevYear = usePrevYearData(currentResult?.elapsedDays)

  useAutoLoadPrevYear()

  const { isSwitching, goToPrevMonth, goToNextMonth } = useMonthSwitcher()
  const { targetYear, targetMonth } = settings
  const r = currentResult

  // 予算 vs 実績 累計データ
  const budgetChartData = useBudgetChartData(r, daysInMonth, prevYear)

  // 日別売上データ
  const dailySalesData = useMemo(() => {
    if (!r) return []
    const data: { day: number; sales: number; budget: number; dow: number }[] = []
    const firstDow = new Date(targetYear, targetMonth - 1, 1).getDay()
    const dim = getDaysInMonth(targetYear, targetMonth)
    for (let d = 1; d <= dim; d++) {
      const rec = r.daily.get(d)
      data.push({
        day: d,
        sales: rec?.sales ?? 0,
        budget: r.budgetDaily.get(d) ?? 0,
        dow: (firstDow + d - 1) % 7,
      })
    }
    return data
  }, [r, targetYear, targetMonth])

  const handleGoDesktop = useCallback(() => {
    navigate('/dashboard')
  }, [navigate])

  // ─── Empty / Loading ──

  if (!isCalculated || !r) {
    return (
      <MobileShell>
        <Header>
          <MonthNav>
            <MonthArrow onClick={goToPrevMonth} disabled={isSwitching}>
              ◀
            </MonthArrow>
            <div>
              <HeaderTitle>
                {targetYear}年{targetMonth}月
              </HeaderTitle>
              <HeaderSub>{isSwitching ? '切替中...' : 'モバイルダッシュボード'}</HeaderSub>
            </div>
            <MonthArrow onClick={goToNextMonth} disabled={isSwitching}>
              ▶
            </MonthArrow>
          </MonthNav>
          <DesktopLink onClick={handleGoDesktop}>PC版</DesktopLink>
        </Header>
        <EmptyMessage>
          <EmptyIcon>📊</EmptyIcon>
          <div>
            データを読み込んでください
            <br />
            <span style={{ fontSize: '12px' }}>PC版からファイルをインポートしてください</span>
          </div>
          <DesktopLink onClick={handleGoDesktop}>PC版を開く</DesktopLink>
        </EmptyMessage>
      </MobileShell>
    )
  }

  // ─── KPI values ──

  const elapsedBudget = r.dailyCumulative.get(r.elapsedDays)?.budget ?? 0
  const elapsedDiff = r.totalSales - elapsedBudget
  const pyRatio =
    prevYear.hasPrevYear && prevYear.totalSales > 0 ? r.totalSales / prevYear.totalSales : null
  const pyCustomerRatio =
    prevYear.hasPrevYear && prevYear.totalCustomers > 0
      ? r.totalCustomers / prevYear.totalCustomers
      : null
  const txValue = calculateTransactionValue(r.totalSales, r.totalCustomers)
  const prevTxValue = prevYear.hasPrevYear
    ? calculateTransactionValue(prevYear.totalSales, prevYear.totalCustomers)
    : null

  const chartText = theme.colors.text3
  const chartGrid = theme.colors.border

  // ─── Render ──

  return (
    <MobileShell>
      {/* ヘッダー */}
      <Header>
        <MonthNav>
          <MonthArrow onClick={goToPrevMonth} disabled={isSwitching}>
            ◀
          </MonthArrow>
          <div>
            <HeaderTitle>
              {targetYear}年{targetMonth}月 {storeName}
            </HeaderTitle>
            <HeaderSub>
              {isSwitching ? '切替中...' : `${r.elapsedDays}日経過 / ${daysInMonth}日`}
            </HeaderSub>
          </div>
          <MonthArrow onClick={goToNextMonth} disabled={isSwitching}>
            ▶
          </MonthArrow>
        </MonthNav>
        <DesktopLink onClick={handleGoDesktop}>PC版</DesktopLink>
      </Header>

      {/* タブバー */}
      <TabBar>
        <Tab $active={tab === 'kpi'} onClick={() => setTab('kpi')}>
          概要
        </Tab>
        <Tab $active={tab === 'chart'} onClick={() => setTab('chart')}>
          チャート
        </Tab>
        <Tab $active={tab === 'daily'} onClick={() => setTab('daily')}>
          日別
        </Tab>
      </TabBar>

      {/* コンテンツ */}
      <ScrollContent>
        {tab === 'kpi' && (
          <>
            {/* 売上実績 */}
            <KpiCardWrapper>
              <KpiRow>
                <KpiLabel>売上実績</KpiLabel>
                <KpiValue>{formatCurrency(r.totalSales)}</KpiValue>
              </KpiRow>
              <KpiSub>予算: {formatCurrency(elapsedBudget)}</KpiSub>
              <KpiSub $color={sc.cond(elapsedDiff >= 0)}>
                差異: {elapsedDiff >= 0 ? '+' : ''}
                {formatCurrency(elapsedDiff)}
              </KpiSub>
              <KpiDivider />
              <KpiGrid>
                <KpiMiniCard>
                  <KpiMiniLabel>予算達成率</KpiMiniLabel>
                  <KpiMiniValue $color={sc.cond(r.budgetProgressRate >= 1)}>
                    {formatPercent(r.budgetProgressRate)}
                  </KpiMiniValue>
                </KpiMiniCard>
                <KpiMiniCard>
                  <KpiMiniLabel>予算消化率</KpiMiniLabel>
                  <KpiMiniValue $color={sc.cond(r.budgetAchievementRate >= 1)}>
                    {formatPercent(r.budgetAchievementRate)}
                  </KpiMiniValue>
                </KpiMiniCard>
                <KpiMiniCard>
                  <KpiMiniLabel>月間予算</KpiMiniLabel>
                  <KpiMiniValue>{formatCurrency(r.budget)}</KpiMiniValue>
                </KpiMiniCard>
                <KpiMiniCard>
                  <KpiMiniLabel>残予算</KpiMiniLabel>
                  <KpiMiniValue $color={r.remainingBudget <= 0 ? sc.positive : undefined}>
                    {formatCurrency(r.remainingBudget)}
                  </KpiMiniValue>
                </KpiMiniCard>
              </KpiGrid>
            </KpiCardWrapper>

            {/* 粗利・仕入 */}
            <KpiCardWrapper>
              <KpiRow>
                <KpiLabel>値入率 / 売変率</KpiLabel>
                <KpiValue>{formatPercent(r.averageMarkupRate)}</KpiValue>
              </KpiRow>
              <KpiSub>
                売変率: {formatPercent(r.discountRate)} ({formatCurrency(r.totalDiscount)})
              </KpiSub>
              <KpiDivider />
              <KpiGrid>
                <KpiMiniCard>
                  <KpiMiniLabel>仕入原価</KpiMiniLabel>
                  <KpiMiniValue>{formatCurrency(r.totalCost)}</KpiMiniValue>
                </KpiMiniCard>
                <KpiMiniCard>
                  <KpiMiniLabel>消耗品費</KpiMiniLabel>
                  <KpiMiniValue>{formatCurrency(r.totalConsumable)}</KpiMiniValue>
                </KpiMiniCard>
                {r.invMethodGrossProfitRate != null && (
                  <KpiMiniCard>
                    <KpiMiniLabel>粗利率</KpiMiniLabel>
                    <KpiMiniValue
                      $color={sc.gpRate(
                        r.invMethodGrossProfitRate,
                        settings.targetGrossProfitRate,
                        settings.warningThreshold,
                      )}
                    >
                      {formatPercent(r.invMethodGrossProfitRate)}
                    </KpiMiniValue>
                  </KpiMiniCard>
                )}
                {r.invMethodGrossProfit != null && (
                  <KpiMiniCard>
                    <KpiMiniLabel>粗利額</KpiMiniLabel>
                    <KpiMiniValue>{formatCurrency(r.invMethodGrossProfit)}</KpiMiniValue>
                  </KpiMiniCard>
                )}
              </KpiGrid>
            </KpiCardWrapper>

            {/* 客数・前年比 */}
            <KpiCardWrapper>
              <KpiRow>
                <KpiLabel>客数</KpiLabel>
                <KpiValue>{formatCurrency(r.totalCustomers)}</KpiValue>
              </KpiRow>
              <KpiSub>客単価: {formatCurrency(txValue)}</KpiSub>
              <KpiSub>
                日平均客数: {formatCurrency(safeDivide(r.totalCustomers, r.elapsedDays))}
              </KpiSub>
              {prevYear.hasPrevYear && (
                <>
                  <KpiDivider />
                  <KpiGrid>
                    <KpiMiniCard>
                      <KpiMiniLabel>前年売上比</KpiMiniLabel>
                      <KpiMiniValue $color={pyRatio != null ? sc.cond(pyRatio >= 1) : undefined}>
                        {pyRatio != null ? formatPercent(pyRatio, 1) : '-'}
                      </KpiMiniValue>
                    </KpiMiniCard>
                    <KpiMiniCard>
                      <KpiMiniLabel>前年客数比</KpiMiniLabel>
                      <KpiMiniValue
                        $color={pyCustomerRatio != null ? sc.cond(pyCustomerRatio >= 1) : undefined}
                      >
                        {pyCustomerRatio != null ? formatPercent(pyCustomerRatio, 1) : '-'}
                      </KpiMiniValue>
                    </KpiMiniCard>
                    <KpiMiniCard>
                      <KpiMiniLabel>前年客単価</KpiMiniLabel>
                      <KpiMiniValue>
                        {prevTxValue != null ? formatCurrency(prevTxValue) : '-'}
                      </KpiMiniValue>
                    </KpiMiniCard>
                    <KpiMiniCard>
                      <KpiMiniLabel>当年客単価</KpiMiniLabel>
                      <KpiMiniValue>{formatCurrency(txValue)}</KpiMiniValue>
                    </KpiMiniCard>
                  </KpiGrid>
                </>
              )}
            </KpiCardWrapper>
          </>
        )}

        {tab === 'chart' && (
          <>
            {/* 予算 vs 実績 累計 */}
            <ChartCard>
              <ChartTitle>予算 vs 実績（累計）</ChartTitle>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={budgetChartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: chartText, fontSize: 10 }}
                    tickLine={false}
                    interval={6}
                  />
                  <YAxis
                    tick={{ fill: chartText, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 10000)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme.colors.bg2,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    formatter={(v: number | undefined, name: string | undefined) => [
                      formatCurrency(v ?? 0),
                      name ?? '',
                    ]}
                    labelFormatter={(label) => `${label}日`}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="actualCum"
                    name="実績"
                    stroke={theme.colors.palette.primary}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="budgetCum"
                    name="予算"
                    stroke={theme.colors.palette.slate}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  {prevYear.hasPrevYear && (
                    <Line
                      type="monotone"
                      dataKey="prevYearCum"
                      name="前年"
                      stroke={theme.colors.palette.warning}
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      dot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* 日別売上 */}
            <ChartCard>
              <ChartTitle>日別売上</ChartTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={dailySalesData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: chartText, fontSize: 10 }}
                    tickLine={false}
                    interval={6}
                  />
                  <YAxis
                    tick={{ fill: chartText, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${Math.round(v / 10000)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme.colors.bg2,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: 6,
                      fontSize: 11,
                    }}
                    formatter={(v: number | undefined, name: string | undefined) => [
                      formatCurrency(v ?? 0),
                      name ?? '',
                    ]}
                    labelFormatter={(label) => `${label}日`}
                  />
                  <Bar dataKey="sales" name="売上" radius={[2, 2, 0, 0]}>
                    {dailySalesData.map((entry) => (
                      <Cell
                        key={entry.day}
                        fill={
                          entry.sales === 0
                            ? `${theme.colors.palette.slate}40`
                            : entry.dow === 0 || entry.dow === 6
                              ? theme.colors.palette.warning
                              : theme.colors.palette.primary
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}

        {tab === 'daily' && (
          <>
            <DailyHeader $isWeekend={false}>
              <DailyDay>日</DailyDay>
              <DailyValues>
                <DailyCol>売上</DailyCol>
                <DailyCol>客数</DailyCol>
                <DailyCol>客単価</DailyCol>
              </DailyValues>
            </DailyHeader>
            {dailySalesData.map((entry) => {
              const rec = r.daily.get(entry.day)
              if (!rec && entry.sales === 0) return null
              const customers = rec?.customers ?? 0
              const tv = calculateTransactionValue(entry.sales, customers)
              const isWeekend = entry.dow === 0 || entry.dow === 6
              return (
                <DailyRow key={entry.day} $isWeekend={isWeekend}>
                  <DailyDay>
                    {entry.day} {DOW_LABELS[entry.dow]}
                  </DailyDay>
                  <DailyValues>
                    <DailyCol>{formatCurrency(entry.sales)}</DailyCol>
                    <DailyCol>{customers > 0 ? formatCurrency(customers) : '-'}</DailyCol>
                    <DailyCol>{tv > 0 ? formatCurrency(tv) : '-'}</DailyCol>
                  </DailyValues>
                </DailyRow>
              )
            })}
          </>
        )}
      </ScrollContent>
    </MobileShell>
  )
}
