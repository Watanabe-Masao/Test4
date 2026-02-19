import { useState, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesRecord } from '@/domain/models'

/* ── Types ──────────────────────────────────────────────── */

export type AggregateMode = 'total' | 'dailyAvg' | 'dowAvg'

export interface PeriodFilterState {
  /** 対象日範囲 [from, to] */
  dayRange: [number, number]
  /** 集計モード: total=期間合計, dailyAvg=期間内日平均, dowAvg=曜日別平均 */
  mode: AggregateMode
  /** dowAvg 時に対象とする曜日 (0=日〜6=土)。空=全曜日 */
  selectedDows: ReadonlySet<number>
}

export interface PeriodFilterResult extends PeriodFilterState {
  setDayRange: (range: [number, number]) => void
  setMode: (mode: AggregateMode) => void
  toggleDow: (dow: number) => void
  /** 期間でフィルタ済みレコード */
  filterRecords: (records: readonly CategoryTimeSalesRecord[]) => readonly CategoryTimeSalesRecord[]
  /** 集計係数（dailyAvg の場合 1/日数） */
  divisor: number
  /** year/month (曜日計算用) */
  year: number
  month: number
}

/* ── Hook ───────────────────────────────────────────────── */

export function usePeriodFilter(daysInMonth: number, year: number, month: number): PeriodFilterResult {
  const [dayRange, setDayRange] = useState<[number, number]>([1, daysInMonth])
  const [mode, setMode] = useState<AggregateMode>('total')
  const [selectedDows, setSelectedDows] = useState<ReadonlySet<number>>(new Set<number>())

  const toggleDow = useCallback((dow: number) => {
    setSelectedDows((prev) => {
      const next = new Set(prev)
      if (next.has(dow)) next.delete(dow)
      else next.add(dow)
      return next
    })
  }, [])

  const filterRecords = useCallback(
    (records: readonly CategoryTimeSalesRecord[]) => {
      let result = records.filter((r) => r.day >= dayRange[0] && r.day <= dayRange[1])
      if (mode === 'dowAvg' && selectedDows.size > 0) {
        result = result.filter((r) => {
          const dow = new Date(year, month - 1, r.day).getDay()
          return selectedDows.has(dow)
        })
      }
      return result
    },
    [dayRange, mode, selectedDows, year, month],
  )

  const divisor = useMemo(() => {
    if (mode === 'total') return 1
    if (mode === 'dailyAvg') {
      const span = dayRange[1] - dayRange[0] + 1
      return span > 0 ? span : 1
    }
    // dowAvg: 曜日別に割る → 各曜日の出現回数で割る必要があるので widget 側で処理
    return 1
  }, [mode, dayRange])

  return { dayRange, setDayRange, mode, setMode, selectedDows, toggleDow, filterRecords, divisor, year, month }
}

/* ── Styled ─────────────────────────────────────────────── */

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  flex-wrap: wrap;
`

const Label = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
`

const RangeValue = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  min-width: 80px;
  text-align: center;
`

const SliderInput = styled.input`
  flex: 1;
  min-width: 80px;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.border};
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg2};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg2};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
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
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

const Sep = styled.span`
  width: 1px;
  height: 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
`

const DowToggle = styled.button<{ $active: boolean; $isSun: boolean; $isSat: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: ${({ $active, $isSun, $isSat, theme }) =>
    $active
      ? '#fff'
      : $isSun ? '#ef4444' : $isSat ? '#3b82f6' : theme.colors.text3};
  background: ${({ $active, $isSun, $isSat }) =>
    $active
      ? $isSun ? '#ef4444' : $isSat ? '#3b82f6' : '#6366f1'
      : 'transparent'};
  border: 1px solid ${({ $active, $isSun, $isSat, theme }) =>
    $active
      ? 'transparent'
      : $isSun ? 'rgba(239,68,68,0.4)' : $isSat ? 'rgba(59,130,246,0.4)' : theme.colors.border};
  transition: all 0.15s;
  &:hover { opacity: 0.85; }
`

/* ── Component ──────────────────────────────────────────── */

interface PeriodFilterBarProps {
  pf: PeriodFilterResult
  daysInMonth: number
}

const MODE_LABELS: Record<AggregateMode, string> = {
  total: '期間合計',
  dailyAvg: '日平均',
  dowAvg: '曜日別平均',
}

const DOW_LABELS_FILTER = ['日', '月', '火', '水', '木', '金', '土'] as const

export function PeriodFilterBar({ pf, daysInMonth }: PeriodFilterBarProps) {
  const isFullRange = pf.dayRange[0] === 1 && pf.dayRange[1] === daysInMonth

  return (
    <Bar>
      <Label>期間</Label>
      <SliderInput
        type="range"
        min={1}
        max={daysInMonth}
        value={pf.dayRange[0]}
        onChange={(e) => {
          const v = Number(e.target.value)
          pf.setDayRange([Math.min(v, pf.dayRange[1]), pf.dayRange[1]])
        }}
      />
      <RangeValue>{pf.dayRange[0]}日 〜 {pf.dayRange[1]}日</RangeValue>
      <SliderInput
        type="range"
        min={1}
        max={daysInMonth}
        value={pf.dayRange[1]}
        onChange={(e) => {
          const v = Number(e.target.value)
          pf.setDayRange([pf.dayRange[0], Math.max(v, pf.dayRange[0])])
        }}
      />
      {!isFullRange && (
        <Tab
          $active={false}
          onClick={() => pf.setDayRange([1, daysInMonth])}
          style={{ fontSize: '0.55rem' }}
        >
          全期間
        </Tab>
      )}
      <Sep />
      <TabGroup>
        {(['total', 'dailyAvg', 'dowAvg'] as AggregateMode[]).map((m) => (
          <Tab key={m} $active={pf.mode === m} onClick={() => pf.setMode(m)}>
            {MODE_LABELS[m]}
          </Tab>
        ))}
      </TabGroup>
      {pf.mode === 'dowAvg' && (
        <>
          <Sep />
          <Label>曜日</Label>
          <TabGroup>
            {DOW_LABELS_FILTER.map((label, dow) => (
              <DowToggle
                key={dow}
                $active={pf.selectedDows.has(dow)}
                $isSun={dow === 0}
                $isSat={dow === 6}
                onClick={() => pf.toggleDow(dow)}
                title={`${label}曜日${pf.selectedDows.has(dow) ? 'を除外' : 'を選択'}`}
              >
                {label}
              </DowToggle>
            ))}
          </TabGroup>
        </>
      )}
    </Bar>
  )
}

/* ── Utility: 曜日カウント計算 ─────────────────────────── */

/** dayRange 内で各曜日(0=日〜6=土)が何日あるか返す */
export function countDowInRange(
  year: number,
  month: number,
  from: number,
  to: number,
): Map<number, number> {
  const counts = new Map<number, number>()
  for (let d = from; d <= to; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    counts.set(dow, (counts.get(dow) ?? 0) + 1)
  }
  return counts
}

/* ── 部門/ライン/クラス プルダウンフィルタ ──────────────── */

interface HierarchyOption {
  code: string
  name: string
  total: number
}

export interface HierarchyFilterState {
  deptCode: string
  lineCode: string
  klassCode: string
}

export interface HierarchyFilterResult extends HierarchyFilterState {
  setDeptCode: (code: string) => void
  setLineCode: (code: string) => void
  setKlassCode: (code: string) => void
  departments: HierarchyOption[]
  lines: HierarchyOption[]
  klasses: HierarchyOption[]
  applyFilter: (records: readonly CategoryTimeSalesRecord[]) => readonly CategoryTimeSalesRecord[]
}

/** 部門/ライン/クラスの絞り込みプルダウン用 hook */
export function useHierarchyDropdown(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
): HierarchyFilterResult {
  const [deptCode, setDeptCode] = useState('')
  const [lineCode, setLineCode] = useState('')
  const [klassCode, setKlassCode] = useState('')

  const storeFiltered = useMemo(
    () => selectedStoreIds.size === 0 ? records : records.filter((r) => selectedStoreIds.has(r.storeId)),
    [records, selectedStoreIds],
  )

  const departments = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of storeFiltered) {
      const ex = map.get(rec.department.code)
      if (ex) { ex.total += rec.totalAmount } else {
        map.set(rec.department.code, { name: rec.department.name || rec.department.code, total: rec.totalAmount })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered])

  const lines = useMemo(() => {
    const filtered = deptCode ? storeFiltered.filter((r) => r.department.code === deptCode) : storeFiltered
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of filtered) {
      const ex = map.get(rec.line.code)
      if (ex) { ex.total += rec.totalAmount } else {
        map.set(rec.line.code, { name: rec.line.name || rec.line.code, total: rec.totalAmount })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered, deptCode])

  const klasses = useMemo(() => {
    let filtered = storeFiltered
    if (deptCode) filtered = filtered.filter((r) => r.department.code === deptCode)
    if (lineCode) filtered = filtered.filter((r) => r.line.code === lineCode)
    const map = new Map<string, { name: string; total: number }>()
    for (const rec of filtered) {
      const ex = map.get(rec.klass.code)
      if (ex) { ex.total += rec.totalAmount } else {
        map.set(rec.klass.code, { name: rec.klass.name || rec.klass.code, total: rec.totalAmount })
      }
    }
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, name: v.name, total: v.total }))
      .sort((a, b) => b.total - a.total)
  }, [storeFiltered, deptCode, lineCode])

  const applyFilter = useCallback(
    (recs: readonly CategoryTimeSalesRecord[]) => {
      let result = recs
      if (deptCode) result = result.filter((r) => r.department.code === deptCode)
      if (lineCode) result = result.filter((r) => r.line.code === lineCode)
      if (klassCode) result = result.filter((r) => r.klass.code === klassCode)
      return result
    },
    [deptCode, lineCode, klassCode],
  )

  // 親が変わったら子をリセット
  const wrappedSetDept = useCallback((code: string) => {
    setDeptCode(code); setLineCode(''); setKlassCode('')
  }, [])
  const wrappedSetLine = useCallback((code: string) => {
    setLineCode(code); setKlassCode('')
  }, [])

  return {
    deptCode, lineCode, klassCode,
    setDeptCode: wrappedSetDept, setLineCode: wrappedSetLine, setKlassCode,
    departments, lines, klasses, applyFilter,
  }
}

/* ── HierarchyDropdowns UI ─────────────────────────────── */

const FilterSelect = styled.select`
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
  max-width: 140px;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.palette.primary}; }
`

const DropdownRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

const DropdownLabel = styled.span`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
`

interface HierarchyDropdownsProps {
  hf: HierarchyFilterResult
  /** 表示する階層 (デフォルト: 全て) */
  levels?: ('dept' | 'line' | 'klass')[]
}

export function HierarchyDropdowns({ hf, levels = ['dept', 'line', 'klass'] }: HierarchyDropdownsProps) {
  const showDept = levels.includes('dept') && hf.departments.length > 1
  const showLine = levels.includes('line') && hf.lines.length > 1
  const showKlass = levels.includes('klass') && hf.klasses.length > 1
  if (!showDept && !showLine && !showKlass) return null

  return (
    <DropdownRow>
      <DropdownLabel>絞込</DropdownLabel>
      {showDept && (
        <FilterSelect value={hf.deptCode} onChange={(e) => hf.setDeptCode(e.target.value)}>
          <option value="">全部門</option>
          {hf.departments.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
        </FilterSelect>
      )}
      {showLine && (
        <FilterSelect value={hf.lineCode} onChange={(e) => hf.setLineCode(e.target.value)}>
          <option value="">全ライン</option>
          {hf.lines.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </FilterSelect>
      )}
      {showKlass && (
        <FilterSelect value={hf.klassCode} onChange={(e) => hf.setKlassCode(e.target.value)}>
          <option value="">全クラス</option>
          {hf.klasses.map((k) => <option key={k.code} value={k.code}>{k.name}</option>)}
        </FilterSelect>
      )}
    </DropdownRow>
  )
}
