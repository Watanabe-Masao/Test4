import { useMemo } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesData } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar, countDowInRange } from './PeriodFilter'

const Wrapper = styled.div`
  width: 100%;
  min-height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[4]};
`

const Grid = styled.div`
  display: grid;
  gap: 2px;
  overflow-x: auto;
`

const HeaderCell = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  text-align: center;
  padding: 2px 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const RowLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text2};
  text-align: right;
  padding: 2px 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  white-space: nowrap;
`

const HeatCell = styled.div<{ $intensity: number; $hasData: boolean }>`
  width: 100%;
  min-width: 32px;
  height: 28px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $intensity }) => $intensity > 0.6 ? '#fff' : $intensity > 0.3 ? '#e5e7eb' : '#9ca3af'};
  background: ${({ $intensity, $hasData }) => {
    if (!$hasData) return 'transparent'
    if ($intensity <= 0) return 'rgba(100,100,100,0.1)'
    const r = Math.round(99 + (239 - 99) * $intensity)
    const g = Math.round(102 + (68 - 102) * Math.pow($intensity, 1.5))
    const b = Math.round(241 - 241 * Math.pow($intensity, 1.5) + 68 * Math.pow($intensity, 1.5))
    return `rgba(${r},${g},${b},${0.3 + $intensity * 0.65})`
  }};
  cursor: default;
  transition: transform 0.1s;
  &:hover { transform: scale(1.1); z-index: 1; }
`

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const LegendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const LegendBar = styled.div`
  width: 100px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, rgba(100,100,100,0.15), rgba(99,102,241,0.4), rgba(239,68,68,0.95));
`

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
  year: number
  month: number
  daysInMonth: number
}

/** 時間帯×曜日 売上ヒートマップ */
export function TimeSlotHeatmapChart({ categoryTimeSales, selectedStoreIds, year, month, daysInMonth }: Props) {
  const { filter } = useCategoryHierarchy()
  const pf = usePeriodFilter(daysInMonth, year, month)

  const { hours, matrix, maxVal } = useMemo(() => {
    // hour → dow → amount
    const map = new Map<number, Map<number, number>>()
    const hourSet = new Set<number>()
    const filtered = filterByHierarchy(pf.filterRecords(categoryTimeSales.records), filter)

    for (const rec of filtered) {
      if (selectedStoreIds.size > 0 && !selectedStoreIds.has(rec.storeId)) continue
      const dow = new Date(year, month - 1, rec.day).getDay()
      for (const slot of rec.timeSlots) {
        hourSet.add(slot.hour)
        if (!map.has(slot.hour)) map.set(slot.hour, new Map())
        const dowMap = map.get(slot.hour)!
        dowMap.set(dow, (dowMap.get(dow) ?? 0) + slot.amount)
      }
    }

    // dowAvg: 各曜日の出現回数で割る
    const dowCounts = pf.mode === 'dowAvg'
      ? countDowInRange(year, month, pf.dayRange[0], pf.dayRange[1])
      : null
    // dailyAvg: 全日数で割る
    const dailyDiv = pf.mode === 'dailyAvg' ? pf.divisor : 1

    const hours = [...hourSet].sort((a, b) => a - b)
    const matrix: number[][] = hours.map((h) => {
      return DOW_LABELS.map((_, dow) => {
        const raw = map.get(h)?.get(dow) ?? 0
        if (dowCounts) {
          const cnt = dowCounts.get(dow) ?? 1
          return Math.round(raw / cnt)
        }
        return Math.round(raw / dailyDiv)
      })
    })
    const maxVal = Math.max(0, ...matrix.flat())

    return { hours, matrix, maxVal }
  }, [categoryTimeSales, selectedStoreIds, year, month, filter, pf])

  if (hours.length === 0) return null

  const modeLabel = pf.mode === 'dowAvg' ? '（曜日別平均）' : pf.mode === 'dailyAvg' ? '（日平均）' : ''

  return (
    <Wrapper>
      <Title>時間帯×曜日 売上ヒートマップ{modeLabel}</Title>
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <Grid style={{ gridTemplateColumns: `50px repeat(${DOW_LABELS.length}, 1fr)` }}>
        {/* Header row */}
        <HeaderCell />
        {DOW_LABELS.map((d) => <HeaderCell key={d}>{d}</HeaderCell>)}

        {/* Data rows */}
        {hours.map((h, hi) => (
          <>
            <RowLabel key={`label-${h}`}>{h}時</RowLabel>
            {matrix[hi].map((val, di) => {
              const intensity = maxVal > 0 ? val / maxVal : 0
              const label = val > 0 ? `${Math.round(val / 10000)}万` : ''
              return (
                <HeatCell
                  key={`${h}-${di}`}
                  $intensity={intensity}
                  $hasData={val > 0}
                  title={`${DOW_LABELS[di]}曜 ${h}時: ${val.toLocaleString()}円`}
                >
                  {label}
                </HeatCell>
              )
            })}
          </>
        ))}
      </Grid>
      <LegendRow>
        <span>低</span>
        <LegendBar />
        <span>高</span>
      </LegendRow>
    </Wrapper>
  )
}
