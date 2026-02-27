import { useState, useMemo, Fragment } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesRecord, CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import { calculateZScores } from '@/domain/calculations'
import { toPct } from './chartTheme'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import {
  usePeriodFilter,
  PeriodFilterBar,
  useHierarchyDropdown,
  HierarchyDropdowns,
} from './PeriodFilter'
import { computeDivisor, filterByStore } from './periodFilterUtils'
import { queryByDateRange } from '@/application/usecases'

const Wrapper = styled.div`
  width: 100%;
  min-height: 360px;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
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
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
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
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

const EmptyFilterMsg = styled.div`
  text-align: center;
  padding: 40px 16px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
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

const HeatCell = styled.div<{ $intensity: number; $hasData: boolean; $anomaly?: boolean }>`
  width: 100%;
  min-width: 32px;
  height: 28px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $intensity }) =>
    $intensity > 0.6 ? '#fff' : $intensity > 0.3 ? '#e5e7eb' : '#9ca3af'};
  background: ${({ $intensity, $hasData }) => {
    if (!$hasData) return 'transparent'
    if ($intensity <= 0) return 'rgba(100,100,100,0.1)'
    const r = Math.round(99 + (239 - 99) * $intensity)
    const g = Math.round(102 + (68 - 102) * Math.pow($intensity, 1.5))
    const b = Math.round(241 - 241 * Math.pow($intensity, 1.5) + 68 * Math.pow($intensity, 1.5))
    return `rgba(${r},${g},${b},${0.3 + $intensity * 0.65})`
  }};
  outline: ${({ $anomaly }) => ($anomaly ? '2px solid rgba(239,68,68,0.85)' : 'none')};
  outline-offset: -1px;
  cursor: default;
  transition: transform 0.1s;
  &:hover {
    transform: scale(1.1);
    z-index: 1;
  }
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
  color: ${({ $ratio }) => (Math.abs($ratio) > 0.15 ? '#fff' : '#9ca3af')};
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
  &:hover {
    transform: scale(1.1);
    z-index: 1;
  }
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

/**
 * hour → dow → amount の集計を行う共通関数。
 *
 * ## 除数の算出（重要）
 *
 * dowAvg モードでは曜日ごとに異なる除数が必要。
 * カレンダーベースの `countDowInRange` ではなく、実際にデータが存在する
 * 日の曜日をカウントして除数とする。これにより店休日やデータ欠損日が
 * 除数に含まれず、正確な曜日別平均が算出される。
 *
 * dailyAvg モードでも同様に、実データの distinct day 数で除算する。
 */
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
  const storeFiltered = filterByStore(
    hf.applyFilter(filterByHierarchy(records, filter)),
    selectedStoreIds,
  )

  // 実データから曜日ごとの distinct day をカウント（データ駆動型除数）
  const dowDaySet = new Map<number, Set<number>>() // dow -> Set<day>
  for (const rec of storeFiltered) {
    const dow = new Date(year, month - 1, rec.day).getDay()
    if (!dowDaySet.has(dow)) dowDaySet.set(dow, new Set())
    dowDaySet.get(dow)!.add(rec.day)
    for (const slot of rec.timeSlots) {
      hourSet.add(slot.hour)
      if (!map.has(slot.hour)) map.set(slot.hour, new Map())
      const dowMap = map.get(slot.hour)!
      dowMap.set(dow, (dowMap.get(dow) ?? 0) + slot.amount)
    }
  }

  // 全体の distinct day 数（dailyAvg 用）【TR-DIV-001】
  const allDays = new Set<number>()
  for (const days of dowDaySet.values()) for (const d of days) allDays.add(d)

  const hours = [...hourSet].sort((a, b) => a - b)
  const matrix: number[][] = hours.map((h) => {
    return DOW_LABELS.map((_, dow) => {
      const raw = map.get(h)?.get(dow) ?? 0
      // dowAvg: 曜日ごとの実データ日数を除数とする
      // dailyAvg/total: 全体の distinct day 数を除数とする（computeDivisor が total→1 を保証）
      const dayCount = pf.mode === 'dowAvg' ? (dowDaySet.get(dow)?.size ?? 0) : allDays.size
      return Math.round(raw / computeDivisor(dayCount, pf.mode))
    })
  })

  return { hours, matrix }
}

interface Props {
  ctsIndex: CategoryTimeSalesIndex
  prevCtsIndex: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  year: number
  month: number
  daysInMonth: number
  /** 販売データ存在最大日（スライダーデフォルト値用） */
  dataMaxDay?: number
}

/** 時間帯×曜日 売上ヒートマップ（前年比較モード対応） */
export function TimeSlotHeatmapChart({
  ctsIndex,
  prevCtsIndex,
  selectedStoreIds,
  year,
  month,
  daysInMonth,
  dataMaxDay,
}: Props) {
  const { filter } = useCategoryHierarchy()
  const [compMode, setCompMode] = useState<'yoy' | 'wow'>('yoy')
  const pf = usePeriodFilter(daysInMonth, year, month, dataMaxDay)

  const sliderDateRange: DateRange = useMemo(
    () => ({
      from: { year, month, day: pf.dayRange[0] },
      to: { year, month, day: pf.dayRange[1] },
    }),
    [year, month, pf.dayRange],
  )
  const dowFilter = pf.mode === 'dowAvg' && pf.selectedDows.size > 0 ? pf.selectedDows : undefined
  const periodRecords = useMemo(
    () =>
      queryByDateRange(ctsIndex, {
        dateRange: sliderDateRange,
        storeIds: selectedStoreIds,
        dow: dowFilter,
      }),
    [ctsIndex, sliderDateRange, selectedStoreIds, dowFilter],
  )

  // WoW: 前週期間 (dayRange を -7 日シフト)
  const wowPrevStart = pf.dayRange[0] - 7
  const wowPrevEnd = pf.dayRange[1] - 7
  const canWoW = wowPrevStart >= 1
  // canWoW が false なら yoy にフォールバック（派生状態）
  const activeCompMode = compMode === 'wow' && !canWoW ? ('yoy' as const) : compMode

  // 比較期間レコード（前年比 or 前週比で切替）
  const prevPeriodRecords = useMemo(() => {
    if (activeCompMode === 'wow') {
      const wowRange: DateRange = {
        from: { year, month, day: wowPrevStart },
        to: { year, month, day: wowPrevEnd },
      }
      return queryByDateRange(ctsIndex, { dateRange: wowRange, storeIds: selectedStoreIds })
    }
    if (prevCtsIndex.recordCount === 0) return [] as readonly CategoryTimeSalesRecord[]
    const prevRange: DateRange = {
      from: { year: year - 1, month, day: pf.dayRange[0] },
      to: { year: year - 1, month, day: pf.dayRange[1] },
    }
    let recs = queryByDateRange(prevCtsIndex, { dateRange: prevRange, storeIds: selectedStoreIds })
    if (dowFilter) {
      recs = recs.filter((r) => {
        const dow = new Date(year, month - 1, r.day).getDay()
        return dowFilter.has(dow)
      })
    }
    return recs
  }, [
    activeCompMode,
    ctsIndex,
    prevCtsIndex,
    selectedStoreIds,
    year,
    month,
    pf.dayRange,
    wowPrevStart,
    wowPrevEnd,
    dowFilter,
  ])
  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const hasPrevYear = prevPeriodRecords.length > 0
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('amount')

  // 動的ラベル
  const prevLbl = activeCompMode === 'wow' ? '前週' : '前年'

  // 前年データがカバーする日の集合（前年比モード用）
  const prevDaySet = useMemo(
    () => new Set(prevPeriodRecords.map((r) => r.day)),
    [prevPeriodRecords],
  )
  // 前年と重複する日のみの当年レコード（前年比の分母分子を揃える）
  const comparablePeriodRecords = useMemo(() => {
    if (!hasPrevYear) return periodRecords
    if (activeCompMode === 'wow') return periodRecords // WoW: both periods same coverage
    return periodRecords.filter((r) => prevDaySet.has(r.day))
  }, [periodRecords, prevDaySet, hasPrevYear, activeCompMode])

  const curData = useMemo(
    () => buildHourDowMatrix(periodRecords, selectedStoreIds, filter, hf, year, month, pf),
    [periodRecords, selectedStoreIds, year, month, filter, pf, hf],
  )

  // 前年比較用: 重複日のみで当年マトリックスを構築
  const comparableCurData = useMemo(
    () =>
      hasPrevYear
        ? buildHourDowMatrix(comparablePeriodRecords, selectedStoreIds, filter, hf, year, month, pf)
        : curData,
    [comparablePeriodRecords, selectedStoreIds, year, month, filter, pf, hf, hasPrevYear, curData],
  )

  const prevData = useMemo(
    () =>
      hasPrevYear
        ? buildHourDowMatrix(prevPeriodRecords, selectedStoreIds, filter, hf, year, month, pf)
        : null,
    [prevPeriodRecords, selectedStoreIds, year, month, filter, pf, hf, hasPrevYear],
  )

  // 差分マトリックス (前年比の変化率 — 重複日のみで比較)
  const diffMatrix = useMemo(() => {
    if (!prevData) return null
    // 重複日ベースの当年 hours を基準にする
    return comparableCurData.hours.map((h, hi) => {
      const prevHi = prevData.hours.indexOf(h)
      return DOW_LABELS.map((_, dow) => {
        const cur = comparableCurData.matrix[hi]?.[dow] ?? 0
        const prev = prevHi >= 0 ? (prevData.matrix[prevHi]?.[dow] ?? 0) : 0
        if (prev === 0 && cur === 0) return { ratio: 0, diff: 0, hasData: false }
        if (prev === 0) return { ratio: 1, diff: cur, hasData: true }
        return { ratio: (cur - prev) / prev, diff: cur - prev, hasData: true }
      })
    })
  }, [comparableCurData, prevData])

  const maxVal = Math.max(0, ...curData.matrix.flat())

  // Z-score異常検出: 全セルの値から統計的に突出したセルを検出
  const zScoreMatrix = useMemo(() => {
    const flat = curData.matrix.flat()
    if (flat.length < 3) return [] as number[][]
    const scores = [...calculateZScores(flat)]
    const result: number[][] = []
    for (let i = 0; i < curData.hours.length; i++) {
      result.push(scores.slice(i * DOW_LABELS.length, (i + 1) * DOW_LABELS.length))
    }
    return result
  }, [curData])

  if (curData.hours.length === 0)
    return (
      <Wrapper>
        <HeaderRow>
          <Title>時間帯×曜日 売上ヒートマップ</Title>
        </HeaderRow>
        <EmptyFilterMsg>選択した絞り込み条件に該当するデータがありません</EmptyFilterMsg>
        <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
        <HierarchyDropdowns hf={hf} />
      </Wrapper>
    )

  const modeLabel =
    pf.mode === 'dowAvg' ? '（曜日別平均）' : pf.mode === 'dailyAvg' ? '（日平均）' : ''
  const showDiff = heatmapMode === 'yoyDiff' && diffMatrix

  return (
    <Wrapper>
      <HeaderRow>
        <Title>
          時間帯×曜日 {showDiff ? `${prevLbl}比増減` : '売上ヒートマップ'}
          {modeLabel}
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {hasPrevYear && (
            <TabGroup>
              <Tab $active={compMode === 'yoy'} onClick={() => setCompMode('yoy')}>
                前年比
              </Tab>
              <Tab
                $active={compMode === 'wow'}
                onClick={() => {
                  if (canWoW) setCompMode('wow')
                }}
                style={canWoW ? undefined : { opacity: 0.4, cursor: 'not-allowed' }}
              >
                前週比
              </Tab>
            </TabGroup>
          )}
          {hasPrevYear && (
            <TabGroup>
              <Tab $active={heatmapMode === 'amount'} onClick={() => setHeatmapMode('amount')}>
                売上
              </Tab>
              <Tab $active={heatmapMode === 'yoyDiff'} onClick={() => setHeatmapMode('yoyDiff')}>
                {prevLbl}比
              </Tab>
            </TabGroup>
          )}
        </div>
      </HeaderRow>

      <HeatGrid style={{ gridTemplateColumns: `50px repeat(${DOW_LABELS.length}, 1fr)` }}>
        {/* Header row */}
        <HeaderCell />
        {DOW_LABELS.map((d) => (
          <HeaderCell key={d}>{d}</HeaderCell>
        ))}

        {/* Data rows */}
        {curData.hours.map((h, hi) => (
          <Fragment key={h}>
            <RowLabel>{h}時</RowLabel>
            {showDiff
              ? diffMatrix[hi].map((cell, di) => (
                  <DiffCell
                    key={`${h}-${di}`}
                    $ratio={cell.ratio}
                    $hasData={cell.hasData}
                    title={`${DOW_LABELS[di]}曜 ${h}時: ${cell.diff >= 0 ? '+' : ''}${cell.diff.toLocaleString()}円 (${cell.ratio >= 0 ? '+' : ''}${toPct(cell.ratio)})`}
                  >
                    {cell.hasData ? `${cell.ratio >= 0 ? '+' : ''}${toPct(cell.ratio, 0)}` : ''}
                  </DiffCell>
                ))
              : curData.matrix[hi].map((val, di) => {
                  const intensity = maxVal > 0 ? val / maxVal : 0
                  const z = zScoreMatrix[hi]?.[di] ?? 0
                  const isAnomaly = Math.abs(z) > 2
                  const label = val > 0 ? `${Math.round(val / 10000)}万` : ''
                  return (
                    <HeatCell
                      key={`${h}-${di}`}
                      $intensity={intensity}
                      $hasData={val > 0}
                      $anomaly={isAnomaly}
                      title={`${DOW_LABELS[di]}曜 ${h}時: ${val.toLocaleString()}円${isAnomaly ? ` (Z=${z.toFixed(1)}, 統計的異常値)` : ''}`}
                    >
                      {label}
                    </HeatCell>
                  )
                })}
          </Fragment>
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
