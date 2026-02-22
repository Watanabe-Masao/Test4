/**
 * PeriodFilter — 期間・集計モード制御フック & UI
 *
 * ## 平均計算の設計方針（重要）
 *
 * 平均値は「合計 ÷ COUNT」で算出する。COUNT の求め方はモードにより異なる:
 *
 * | モード     | COUNT (= divisor)                     |
 * |-----------|---------------------------------------|
 * | total     | 1（除算なし）                          |
 * | dailyAvg  | dayRange 内の日数                      |
 * | dowAvg    | dayRange 内で selectedDows に該当する日数 |
 *
 * ### dowAvg 除数の安全設計
 *
 * - `countDowInRange(year, month, from, to)` で実際のカレンダーから曜日出現回数を算出。
 * - 閏年・月の日数差（28〜31日）により同じ曜日でも月ごとに出現回数が異なる。
 *   例: 2026年3月は月曜5回、2026年2月は月曜4回。
 * - 0 除算防止: divisor の最小値は常に 1 が保証される。
 *
 * ### 前年比較チャートでの注意事項
 *
 * 当年と前年でデータカバー日が異なる場合、各チャートは実際の
 * データ重複日数に基づいた除数を独自に計算する必要がある。
 * `TimeSlotYoYComparisonChart` は `curDays` / `prevDays` を個別に追跡する。
 *
 * @see countDowInRange — 曜日カウントユーティリティ
 * @see PeriodFilter.test.ts — 平均計算の正当性テスト
 */
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
  /**
   * 集計除数。
   * - total  → 1（除算なし）
   * - dailyAvg → 期間内日数
   * - dowAvg → 選択曜日の出現回数合計（未選択時は期間内全日数）
   *
   * 0 除算防止のため最低値は 1 が保証される。
   */
  divisor: number
  /**
   * モードに応じた安全な除算ヘルパー。
   * `total` モードでは値をそのまま返し、`dailyAvg`/`dowAvg` では
   * `divisor` で除算した結果を Math.round して返す。
   *
   * 各チャートで `const div = pf.mode !== 'total' ? pf.divisor : 1` と
   * 書く代わりにこの関数を使うことで、0 除算防止とモード判定が一箇所に集約される。
   *
   * @example
   * const avgAmount = pf.divideByMode(totalAmount)
   */
  divideByMode: (value: number) => number
  /** year/month (曜日計算用) */
  year: number
  month: number
  /** データ末日に基づくデフォルト終了日（リセット用） */
  defaultEndDay: number
  /** デフォルト範囲にリセット */
  resetToDefault: () => void
}

/* ── Hook ───────────────────────────────────────────────── */

/**
 * @param daysInMonth 月の日数
 * @param year 年
 * @param month 月
 * @param dataMaxDay データが存在する最大日（0 = 未検出）。変化時に自動リセット。
 */
export function usePeriodFilter(
  daysInMonth: number,
  year: number,
  month: number,
  dataMaxDay?: number,
): PeriodFilterResult {
  const effectiveEnd = dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
  const [dayRange, setDayRange] = useState<[number, number]>([1, effectiveEnd])
  const [mode, setMode] = useState<AggregateMode>('total')
  const [selectedDows, setSelectedDows] = useState<ReadonlySet<number>>(new Set<number>())

  // dataMaxDay 変化時（ファイル取込など）に自動リセット。
  // state に前回値を保持し、レンダー中に比較→リセット（React推奨パターン）。
  const [prevDataMaxDay, setPrevDataMaxDay] = useState(dataMaxDay)
  if (prevDataMaxDay !== dataMaxDay) {
    setPrevDataMaxDay(dataMaxDay)
    const newEnd = dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
    setDayRange([1, newEnd])
  }

  const resetToDefault = useCallback(() => {
    const end = dataMaxDay && dataMaxDay > 0 ? Math.min(dataMaxDay, daysInMonth) : daysInMonth
    setDayRange([1, end])
  }, [dataMaxDay, daysInMonth])

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
    // dowAvg: 選択された曜日の出現回数合計で割る
    const dowCounts = countDowInRange(year, month, dayRange[0], dayRange[1])
    if (selectedDows.size > 0) {
      let total = 0
      for (const dow of selectedDows) total += dowCounts.get(dow) ?? 0
      return total > 0 ? total : 1
    }
    // 曜日未選択 = 全曜日 → 期間内全日数
    const span = dayRange[1] - dayRange[0] + 1
    return span > 0 ? span : 1
  }, [mode, dayRange, selectedDows, year, month])

  const divideByMode = useCallback(
    (value: number) => Math.round(value / divisor),
    [divisor],
  )

  return {
    dayRange, setDayRange, mode, setMode, selectedDows, toggleDow,
    filterRecords, divisor, divideByMode, year, month,
    defaultEndDay: effectiveEnd, resetToDefault,
  }
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
  const isDefault = pf.dayRange[0] === 1 && pf.dayRange[1] === pf.defaultEndDay

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
      {!isDefault && (
        <Tab
          $active={false}
          onClick={pf.resetToDefault}
          style={{ fontSize: '0.55rem' }}
        >
          リセット
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

/**
 * 指定月の dayRange 内で各曜日 (0=日〜6=土) が何日あるか返す。
 *
 * 閏年・月末日数の違いを正しく反映する。
 * dowAvg モードの除数計算に使用される中核ユーティリティ。
 *
 * @param year  対象年（例: 2026）
 * @param month 対象月 1-12
 * @param from  開始日（1-based）
 * @param to    終了日（1-based, inclusive）
 * @returns Map<曜日(0-6), 出現回数>
 *
 * @example
 * // 2026年2月（28日間）→ 各曜日4回ずつ
 * countDowInRange(2026, 2, 1, 28)
 * // => Map { 0=>4, 1=>4, 2=>4, 3=>4, 4=>4, 5=>4, 6=>4 }
 *
 * @example
 * // 2024年2月（閏年29日間）→ 木曜だけ5回
 * countDowInRange(2024, 2, 1, 29)
 * // => Map { 4=>5, 0=>4, 1=>4, ... }
 */
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
