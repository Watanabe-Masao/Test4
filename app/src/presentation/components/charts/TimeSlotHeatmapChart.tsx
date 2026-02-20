import { useState, useMemo } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar, countDowInRange, useHierarchyDropdown, HierarchyDropdowns } from './PeriodFilter'

const Wrapper = styled.div`
  width: 100%;
  min-height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const HeaderRow = styled.div`
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

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover { opacity: 0.85; }
`

const HeatGrid = styled.div`
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

/** 前年比用セル: 緑(+) / 赤(-) のグラデーション */
const DiffCell = styled.div<{ $ratio: number; $hasData: boolean }>`
  width: 100%;
  min-width: 32px;
  height: 28px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.5rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $ratio }) => Math.abs($ratio) > 0.15 ? '#fff' : '#9ca3af'};
  background: ${({ $ratio, $hasData }) => {
    if (!$hasData) return 'transparent'
    if ($ratio === 0) return 'rgba(100,100,100,0.1)'
    // 正: 緑系, 負: 赤系
    const absR = Math.min(Math.abs($ratio), 0.5) / 0.5 // 0~1 にクランプ (±50%で最大)
    if ($ratio > 0) {
      return `rgba(34,197,94,${0.2 + absR * 0.7})`
    }
    return `rgba(239,68,68,${0.2 + absR * 0.7})`
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

const LegendBar = styled.div<{ $type: 'amount' | 'diff' }>`
  width: 100px;
  height: 8px;
  border-radius: 4px;
  background: ${({ $type }) =>
    $type === 'diff'
      ? 'linear-gradient(to right, rgba(239,68,68,0.8), rgba(100,100,100,0.15), rgba(34,197,94,0.8))'
      : 'linear-gradient(to right, rgba(100,100,100,0.15), rgba(99,102,241,0.4), rgba(239,68,68,0.95))'};
`

type HeatmapMode = 'amount' | 'yoyDiff'

/** hour → dow → amount の集計を行う共通関数 */
function buildHourDowMatrix(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
  filter: ReturnType<typeof useCategoryHierarchy>['filter'],
  hf: ReturnType<typeof useHierarchyDropdown>,
  year: number,
  month: number,
  pf: ReturnType<typeof usePeriodFilter>,
) {
  const map = new Map<number, Map<number, number>>()
  const hourSet = new Set<number>()
  const filtered = hf.applyFilter(filterByHierarchy(records, filter))

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

  const dowCounts = pf.mode === 'dowAvg'
    ? countDowInRange(year, month, pf.dayRange[0], pf.dayRange[1])
    : null
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

  return { hours, matrix }
}

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
  year: number
  month: number
  daysInMonth: number
  /** 前年同曜日対応済みレコード */
  prevYearRecords?: readonly CategoryTimeSalesRecord[]
}

/** 時間帯×曜日 売上ヒートマップ（前年比較モード対応） */
export function TimeSlotHeatmapChart({ categoryTimeSales, selectedStoreIds, year, month, daysInMonth, prevYearRecords }: Props) {
  const { filter } = useCategoryHierarchy()
  const pf = usePeriodFilter(daysInMonth, year, month)
  const periodRecords = useMemo(() => pf.filterRecords(categoryTimeSales.records), [categoryTimeSales, pf])
  const prevPeriodRecords = useMemo(
    () => prevYearRecords ? pf.filterRecords(prevYearRecords) : [],
    [prevYearRecords, pf],
  )
  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const hasPrevYear = prevPeriodRecords.length > 0
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('amount')

  const curData = useMemo(
    () => buildHourDowMatrix(periodRecords, selectedStoreIds, filter, hf, year, month, pf),
    [periodRecords, selectedStoreIds, year, month, filter, pf, hf],
  )

  const prevData = useMemo(
    () => hasPrevYear ? buildHourDowMatrix(prevPeriodRecords, selectedStoreIds, filter, hf, year, month, pf) : null,
    [prevPeriodRecords, selectedStoreIds, year, month, filter, pf, hf, hasPrevYear],
  )

  // 差分マトリックス (前年比の変化率)
  const diffMatrix = useMemo(() => {
    if (!prevData) return null
    // 当年の hours を基準にする
    return curData.hours.map((h, hi) => {
      const prevHi = prevData.hours.indexOf(h)
      return DOW_LABELS.map((_, dow) => {
        const cur = curData.matrix[hi]?.[dow] ?? 0
        const prev = prevHi >= 0 ? (prevData.matrix[prevHi]?.[dow] ?? 0) : 0
        if (prev === 0 && cur === 0) return { ratio: 0, diff: 0, hasData: false }
        if (prev === 0) return { ratio: 1, diff: cur, hasData: true }
        return { ratio: (cur - prev) / prev, diff: cur - prev, hasData: true }
      })
    })
  }, [curData, prevData])

  const maxVal = Math.max(0, ...curData.matrix.flat())

  if (curData.hours.length === 0) return null

  const modeLabel = pf.mode === 'dowAvg' ? '（曜日別平均）' : pf.mode === 'dailyAvg' ? '（日平均）' : ''
  const showDiff = heatmapMode === 'yoyDiff' && diffMatrix

  return (
    <Wrapper>
      <HeaderRow>
        <Title>
          時間帯×曜日 {showDiff ? '前年比増減' : '売上ヒートマップ'}{modeLabel}
        </Title>
        {hasPrevYear && (
          <TabGroup>
            <Tab $active={heatmapMode === 'amount'} onClick={() => setHeatmapMode('amount')}>売上</Tab>
            <Tab $active={heatmapMode === 'yoyDiff'} onClick={() => setHeatmapMode('yoyDiff')}>前年比</Tab>
          </TabGroup>
        )}
      </HeaderRow>

      <HeatGrid style={{ gridTemplateColumns: `50px repeat(${DOW_LABELS.length}, 1fr)` }}>
        {/* Header row */}
        <HeaderCell />
        {DOW_LABELS.map((d) => <HeaderCell key={d}>{d}</HeaderCell>)}

        {/* Data rows */}
        {curData.hours.map((h, hi) => (
          <>
            <RowLabel key={`label-${h}`}>{h}時</RowLabel>
            {showDiff
              ? diffMatrix[hi].map((cell, di) => (
                  <DiffCell
                    key={`${h}-${di}`}
                    $ratio={cell.ratio}
                    $hasData={cell.hasData}
                    title={`${DOW_LABELS[di]}曜 ${h}時: ${cell.diff >= 0 ? '+' : ''}${cell.diff.toLocaleString()}円 (${cell.ratio >= 0 ? '+' : ''}${(cell.ratio * 100).toFixed(1)}%)`}
                  >
                    {cell.hasData ? `${cell.ratio >= 0 ? '+' : ''}${(cell.ratio * 100).toFixed(0)}%` : ''}
                  </DiffCell>
                ))
              : curData.matrix[hi].map((val, di) => {
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
      </HeatGrid>
      <LegendRow>
        {showDiff ? (
          <>
            <span>減少</span>
            <LegendBar $type="diff" />
            <span>増加</span>
          </>
        ) : (
          <>
            <span>低</span>
            <LegendBar $type="amount" />
            <span>高</span>
          </>
        )}
      </LegendRow>
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
}
