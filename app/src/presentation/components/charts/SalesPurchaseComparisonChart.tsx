import { useMemo, useState, useCallback, memo } from 'react'
import type { ReactNode } from 'react'
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, toComma, toPct, toAxisYen, STORE_COLORS } from './chartTheme'
import { createChartTooltip } from './ChartTooltip'
import { DayRangeSlider } from './DayRangeSlider'
import { useDayRange } from './useDayRange'
import { computeEstimatedInventory } from '@/application/hooks/useInventoryEstimation'
import { safeDivide } from '@/domain/calculations/utils'
import type { Store, StoreResult } from '@/domain/models'

const Wrapper = styled.div`
  width: 100%;
  min-height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  flex-wrap: wrap;
`

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ControlLabel = styled.span`
  font-size: 0.5rem;
  color: ${({ theme }) => theme.colors.text4};
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 3px;
  align-items: center;
`

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.55rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const StoreChip = styled.button<{ $active: boolean; $color: string }>`
  padding: 2px 8px;
  font-size: 0.55rem;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'transparent')};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, $color }) => ($active ? `${$color}18` : 'transparent')};
  color: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.text4)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 3px;
  opacity: ${({ $active }) => ($active ? 1 : 0.5)};
  &:hover {
    opacity: 1;
  }
`

const StoreDotInline = styled.span<{ $color: string }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`

const CompTable = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  overflow-x: auto;
`
const MiniTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6rem;
`
const MiniTh = styled.th<{ $sortable?: boolean }>`
  text-align: center;
  padding: 3px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  &:first-child {
    text-align: left;
  }
  &:hover {
    color: ${({ $sortable, theme }) => ($sortable ? theme.colors.text : theme.colors.text3)};
  }
`
const MiniTd = styled.td`
  text-align: center;
  padding: 2px 5px;
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')};
  white-space: nowrap;
  &:first-child {
    text-align: left;
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  }
`
const StoreDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 4px;
  vertical-align: middle;
`

const RankBadge = styled.span<{ $rank: number }>`
  display: inline-block;
  font-size: 0.5rem;
  font-weight: 700;
  width: 14px;
  height: 14px;
  line-height: 14px;
  text-align: center;
  border-radius: 50%;
  margin-right: 3px;
  color: ${({ theme }) => theme.colors.palette.white};
  background: ${({ $rank }) =>
    $rank === 1 ? '#f59e0b' : $rank === 2 ? '#94a3b8' : $rank === 3 ? '#b45309' : '#64748b'};
`

type SortKey = 'sales' | 'cost' | 'diff' | 'gpRate' | 'discountRate' | 'markupRate'
type SeriesMode = 'all' | 'sales' | 'purchase' | 'inventory'

interface Props {
  comparisonResults: readonly StoreResult[]
  stores: ReadonlyMap<string, Store>
  daysInMonth: number
  headerExtra?: ReactNode
}

export const SalesPurchaseComparisonChart = memo(function SalesPurchaseComparisonChart({
  comparisonResults,
  stores,
  daysInMonth,
  headerExtra,
}: Props) {
  const ct = useChartTheme()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)
  const [sortKey, setSortKey] = useState<SortKey>('sales')
  const [sortDesc, setSortDesc] = useState(true)
  const [seriesMode, setSeriesMode] = useState<SeriesMode>('sales')
  const [visibleStoreIds, setVisibleStoreIds] = useState<Set<string> | null>(null) // null = all

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc((d) => !d)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }
  const arrow = (key: SortKey) => (sortKey === key ? (sortDesc ? ' ▼' : ' ▲') : '')

  const storeEntries = useMemo(
    () =>
      comparisonResults.map((r) => ({
        storeId: r.storeId,
        name: stores.get(r.storeId)?.name ?? r.storeId,
        hasInventory: r.openingInventory != null,
        result: r,
      })),
    [comparisonResults, stores],
  )

  const anyHasInventory = storeEntries.some((s) => s.hasInventory)

  const toggleStore = useCallback(
    (storeId: string) => {
      setVisibleStoreIds((prev) => {
        if (prev === null) {
          // All visible → hide this one
          const next = new Set(storeEntries.map((s) => s.storeId))
          next.delete(storeId)
          return next.size === 0 ? null : next
        }
        const next = new Set(prev)
        if (next.has(storeId)) {
          next.delete(storeId)
          // If all removed, show all
          return next.size === 0 ? null : next
        }
        next.add(storeId)
        // If all added, return null (= all)
        return next.size === storeEntries.length ? null : next
      })
    },
    [storeEntries],
  )

  const isStoreVisible = useCallback(
    (storeId: string) => visibleStoreIds === null || visibleStoreIds.has(storeId),
    [visibleStoreIds],
  )

  const showSales = seriesMode === 'all' || seriesMode === 'sales'
  const showPurchase = seriesMode === 'all' || seriesMode === 'purchase'
  const showInventory = (seriesMode === 'all' || seriesMode === 'inventory') && anyHasInventory

  const chartData = useMemo(() => {
    const invByStore = new Map<string, ReturnType<typeof computeEstimatedInventory>>()
    for (const s of storeEntries) {
      if (s.hasInventory) {
        invByStore.set(
          s.storeId,
          computeEstimatedInventory(
            s.result.daily,
            daysInMonth,
            s.result.openingInventory!,
            s.result.closingInventory,
            s.result.coreMarkupRate,
            s.result.discountRate,
          ),
        )
      }
    }

    const data: Record<string, number | null>[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const entry: Record<string, number | null> = { day: d }
      for (const s of storeEntries) {
        const rec = s.result.daily.get(d)
        entry[`${s.name}_売上`] = rec?.sales ?? 0
        entry[`${s.name}_仕入`] = rec?.purchase.cost ?? 0
        const inv = invByStore.get(s.storeId)
        entry[`${s.name}_推定在庫`] = inv?.[d - 1]?.estimated ?? null
      }
      data.push(entry)
    }
    return data.filter((d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd)
  }, [storeEntries, daysInMonth, rangeStart, rangeEnd])

  if (storeEntries.length < 2) return null

  const visibleEntries = storeEntries.filter((s) => isStoreVisible(s.storeId))

  return (
    <Wrapper aria-label="売仕比較チャート">
      <Header>
        <Title>売上・仕入・推定在庫 店舗比較</Title>
        <Controls>
          <ControlGroup>
            <ControlLabel>表示系列</ControlLabel>
            <ButtonGroup>
              <ToggleBtn $active={seriesMode === 'sales'} onClick={() => setSeriesMode('sales')}>
                売上
              </ToggleBtn>
              <ToggleBtn
                $active={seriesMode === 'purchase'}
                onClick={() => setSeriesMode('purchase')}
              >
                仕入
              </ToggleBtn>
              {anyHasInventory && (
                <ToggleBtn
                  $active={seriesMode === 'inventory'}
                  onClick={() => setSeriesMode('inventory')}
                >
                  推定在庫
                </ToggleBtn>
              )}
              <ToggleBtn $active={seriesMode === 'all'} onClick={() => setSeriesMode('all')}>
                全て
              </ToggleBtn>
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>店舗フィルタ</ControlLabel>
            <ButtonGroup>
              {storeEntries.map((s, i) => (
                <StoreChip
                  key={s.storeId}
                  $active={isStoreVisible(s.storeId)}
                  $color={STORE_COLORS[i % STORE_COLORS.length]}
                  onClick={() => toggleStore(s.storeId)}
                >
                  <StoreDotInline $color={STORE_COLORS[i % STORE_COLORS.length]} />
                  {s.name.length > 6 ? s.name.slice(0, 6) + '…' : s.name}
                </StoreChip>
              ))}
            </ButtonGroup>
          </ControlGroup>
          {headerExtra}
        </Controls>
      </Header>

      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          {showInventory && (
            <YAxis
              yAxisId="left"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toAxisYen}
              width={55}
            />
          )}
          <YAxis
            yAxisId="right"
            orientation={showInventory ? 'right' : 'left'}
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toAxisYen}
            width={55}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value, name) => [
                value != null ? toComma(value as number) : '-',
                (name as string) ?? '',
              ],
              labelFormatter: (label) => `${label}日`,
            })}
          />
          {seriesMode === 'all' && (
            <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          )}

          {/* 棒グラフ: 売上 */}
          {showSales &&
            visibleEntries.map((s) => {
              const i = storeEntries.indexOf(s)
              return (
                <Bar
                  key={`${s.storeId}_sales`}
                  yAxisId="right"
                  dataKey={`${s.name}_売上`}
                  fill={STORE_COLORS[i % STORE_COLORS.length]}
                  fillOpacity={seriesMode === 'all' ? 0.35 : 0.55}
                  isAnimationActive={false}
                />
              )
            })}

          {/* 棒グラフ: 仕入 */}
          {showPurchase &&
            visibleEntries.map((s) => {
              const i = storeEntries.indexOf(s)
              return (
                <Bar
                  key={`${s.storeId}_purchase`}
                  yAxisId="right"
                  dataKey={`${s.name}_仕入`}
                  fill={STORE_COLORS[i % STORE_COLORS.length]}
                  fillOpacity={seriesMode === 'all' ? 0.15 : 0.45}
                  isAnimationActive={false}
                />
              )
            })}

          {/* 折れ線: 推定在庫 */}
          {showInventory &&
            visibleEntries.map((s) => {
              const i = storeEntries.indexOf(s)
              return s.hasInventory ? (
                <Line
                  key={`${s.storeId}_inv`}
                  yAxisId="left"
                  type="monotone"
                  dataKey={`${s.name}_推定在庫`}
                  stroke={STORE_COLORS[i % STORE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: STORE_COLORS[i % STORE_COLORS.length],
                    stroke: ct.bg2,
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              ) : null
            })}
        </ComposedChart>
      </ResponsiveContainer>

      {/* 店舗サマリーテーブル */}
      <CompTable>
        <MiniTable>
          <thead>
            <tr>
              <MiniTh>店舗</MiniTh>
              <MiniTh $sortable onClick={() => handleSort('sales')}>
                売上合計{arrow('sales')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('cost')}>
                仕入原価{arrow('cost')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('diff')}>
                差額{arrow('diff')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('gpRate')}>
                粗利率{arrow('gpRate')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('discountRate')}>
                売変率{arrow('discountRate')}
              </MiniTh>
              <MiniTh>推定期末在庫</MiniTh>
              <MiniTh $sortable onClick={() => handleSort('markupRate')}>
                値入率{arrow('markupRate')}
              </MiniTh>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = storeEntries.map((s, i) => {
                const diff = s.result.totalSales - s.result.inventoryCost
                const gpRate =
                  s.result.invMethodGrossProfitRate ??
                  safeDivide(s.result.estMethodMargin, s.result.totalCoreSales, 0)
                return { s, i, diff, gpRate, discountRate: s.result.discountRate }
              })
              const getVal = (row: (typeof rows)[0]): number => {
                switch (sortKey) {
                  case 'sales':
                    return row.s.result.totalSales
                  case 'cost':
                    return row.s.result.inventoryCost
                  case 'diff':
                    return row.diff
                  case 'gpRate':
                    return row.gpRate
                  case 'discountRate':
                    return row.discountRate
                  case 'markupRate':
                    return row.s.result.coreMarkupRate
                }
              }
              const sorted = [...rows].sort((a, b) =>
                sortDesc ? getVal(b) - getVal(a) : getVal(a) - getVal(b),
              )
              return sorted.map((row, rank) => {
                const estClosing = row.s.result.estMethodClosingInventory
                const dimmed = !isStoreVisible(row.s.storeId)
                return (
                  <tr
                    key={row.s.storeId}
                    style={{
                      opacity: dimmed ? 0.4 : 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleStore(row.s.storeId)}
                  >
                    <MiniTd>
                      <RankBadge $rank={rank + 1}>{rank + 1}</RankBadge>
                      <StoreDot $color={STORE_COLORS[row.i % STORE_COLORS.length]} />
                      {row.s.name}
                    </MiniTd>
                    <MiniTd>{toComma(row.s.result.totalSales)}</MiniTd>
                    <MiniTd>{toComma(row.s.result.inventoryCost)}</MiniTd>
                    <MiniTd>{toComma(row.diff)}</MiniTd>
                    <MiniTd>{toPct(row.gpRate)}</MiniTd>
                    <MiniTd>{toPct(row.discountRate)}</MiniTd>
                    <MiniTd>{estClosing != null ? toComma(estClosing) : '-'}</MiniTd>
                    <MiniTd>{toPct(row.s.result.coreMarkupRate)}</MiniTd>
                  </tr>
                )
              })
            })()}
          </tbody>
        </MiniTable>
      </CompTable>

      <DayRangeSlider
        min={1}
        max={daysInMonth}
        start={rangeStart}
        end={rangeEnd}
        onChange={setRange}
      />
    </Wrapper>
  )
})
