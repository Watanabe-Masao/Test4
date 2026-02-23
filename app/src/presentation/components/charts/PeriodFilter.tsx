/**
 * PeriodFilter — 期間・集計モード制御フック & UI
 *
 * ═══════════════════════════════════════════════════════════
 * ## 設計ルール（破ってはいけない原則）
 * ═══════════════════════════════════════════════════════════
 *
 * 以下のルールは全チャートコンポーネントに適用される。
 * 違反はアーキテクチャガードテスト（divisorRules.test.ts）で検出される。
 *
 * ### RULE-1: 除数は必ず computeDivisor() を経由する
 *
 * 平均計算の除数は `computeDivisor(distinctDayCount, mode)` で算出する。
 * インラインで `mode === 'total' ? 1 : (days.size > 0 ? days.size : 1)`
 * のような独自実装を書いてはいけない。
 *
 * ✅ 正しい: `const div = computeDivisor(days.size, pf.mode)`
 * ❌ 違反:  `const div = pf.mode === 'total' ? 1 : days.size || 1`
 *
 * ### RULE-2: 除数はカレンダーではなく実データから算出する
 *
 * カレンダー上の日数（28日、月曜4回等）ではなく、フィルタ適用後の
 * レコードに実際に存在する distinct day 数を使う。
 *
 * ✅ 正しい: `computeDivisor(countDistinctDays(filtered), mode)`
 * ❌ 違反:  カレンダー日数で除算
 *
 * ### RULE-3: 当年と前年の除数は独立して算出する
 *
 * 前年比較では当年・前年それぞれの実データ日数から個別に除数を算出する。
 * 一方の除数を他方に流用してはいけない。
 *
 * ✅ 正しい: `curDiv = computeDivisor(curDays.size, mode)`
 *            `prevDiv = computeDivisor(prevDays.size, mode)`
 * ❌ 違反:  `div = computeDivisor(curDays.size, mode)` を前年にも適用
 *
 * ### RULE-4: 0除算は computeDivisor が防止する
 *
 * 個別の `Math.max(x, 1)` や `x || 1` ガードは不要。
 * computeDivisor は常に >= 1 を返す。二重ガードは設計違反の兆候。
 *
 * ### RULE-5: 店舗フィルタは filterByStore() を経由する
 *
 * ストア絞り込みは `filterByStore(records, selectedStoreIds)` で行う。
 * 各チャート内でインラインの `if (!selectedStoreIds.has(...)) continue` は禁止。
 *
 * ✅ 正しい: `const storeFiltered = filterByStore(records, selectedStoreIds)`
 * ❌ 違反:  `if (selectedStoreIds.size > 0 && !selectedStoreIds.has(rec.storeId)) continue`
 *
 * ### RULE-6: 計算変数は一元管理された純粋関数を経由する
 *
 * 計算に使用する変数（日数カウント、除数、フィルタ済みレコード等）は
 * このファイルで定義された純粋関数を経由して算出する。
 * 各チャートでの独自実装（Set<number> での手動カウント等）は禁止。
 *
 * ✅ 正しい: `const days = countDistinctDays(filtered)`
 * ❌ 違反:  `const days = new Set<number>(); for (...) days.add(rec.day); days.size`
 *
 * ═══════════════════════════════════════════════════════════
 * ## 純粋関数一覧（一元管理ポイント）
 * ═══════════════════════════════════════════════════════════
 *
 * | ID         | 関数名              | 役割                          |
 * |------------|--------------------|-----------------------------|
 * | TR-DIV-001 | computeDivisor     | mode + day数 → 除数（>= 1）   |
 * | TR-DIV-002 | countDistinctDays  | records → distinct day 数     |
 * | TR-DIV-003 | computeDowDivisorMap | records → 曜日別除数 Map    |
 * | TR-FIL-001 | filterByStore      | records + storeIds → 店舗絞込 |
 *
 * @see divisorRules.test.ts — アーキテクチャガードテスト（構造違反の自動検出）
 * @see PeriodFilter.test.ts — 技術ルール準拠テスト（不変条件・動的検証）
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
  /** 期間 + 曜日でフィルタ済みレコードを返す */
  filterRecords: (records: readonly CategoryTimeSalesRecord[]) => readonly CategoryTimeSalesRecord[]
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

  return {
    dayRange, setDayRange, mode, setMode, selectedDows, toggleDow,
    filterRecords, year, month,
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

const WarningLabel = styled.span`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.palette.warning};
  white-space: nowrap;
  font-weight: 600;
`

interface PeriodFilterBarProps {
  pf: PeriodFilterResult
  daysInMonth: number
  /** 取込データ有効期間（経過日数）。超過時に警告表示 */
  elapsedDays?: number
}

const MODE_LABELS: Record<AggregateMode, string> = {
  total: '期間合計',
  dailyAvg: '日平均',
  dowAvg: '曜日別平均',
}

const DOW_LABELS_FILTER = ['日', '月', '火', '水', '木', '金', '土'] as const

export function PeriodFilterBar({ pf, daysInMonth, elapsedDays }: PeriodFilterBarProps) {
  const isDefault = pf.dayRange[0] === 1 && pf.dayRange[1] === pf.defaultEndDay
  const exceedsValidPeriod = elapsedDays != null && elapsedDays > 0 && pf.dayRange[1] > elapsedDays

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
      {exceedsValidPeriod && (
        <WarningLabel>
          {elapsedDays}日以降はデータなし
        </WarningLabel>
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

/* ── 技術ルール: 実データ駆動型除数 (Data-Driven Divisor Rules) ── */

/**
 * 【TR-DIV-001】除数算出ルール
 *
 * 実データの distinct day 数と集計モードから除数を算出する純粋関数。
 * **全チャートはこの関数を通じて除数を一元的に算出すること。**
 *
 * 不変条件:
 *   - mode === 'total' → 必ず 1 を返す
 *   - 返り値は常に >= 1（0除算防止保証）
 *   - distinctDayCount が 0 でも安全（1 を返す）
 *
 * @param distinctDayCount 実データの distinct day 数
 * @param mode 集計モード
 * @returns 除数（>= 1 保証）
 */
export function computeDivisor(distinctDayCount: number, mode: AggregateMode): number {
  if (mode === 'total') return 1
  return distinctDayCount > 0 ? distinctDayCount : 1
}

/**
 * 【TR-DIV-002】レコード配列から distinct day 数を算出
 *
 * レコードの `.day` フィールドをユニークカウントする。
 * 店舗フィルタ等の事前フィルタ適用後のレコードを渡すこと。
 *
 * @param records フィルタ適用済みレコード配列
 * @returns distinct day 数（0 の場合あり — computeDivisor で安全に除数化される）
 */
export function countDistinctDays(records: readonly CategoryTimeSalesRecord[]): number {
  const days = new Set<number>()
  for (const rec of records) days.add(rec.day)
  return days.size
}

/**
 * 【TR-DIV-003】曜日別の実データ駆動型除数を算出
 *
 * ヒートマップ等、曜日ごとに異なる除数が必要な場合に使用する。
 * 各曜日について、その曜日に該当する distinct day 数をカウントする。
 *
 * 使用例: dowAvg モードのヒートマップで、月曜は 4 日分、火曜は 3 日分
 * のように曜日ごとに異なる除数を適用する場合。
 *
 * @param records filterRecords() 適用済みのレコード配列
 * @param year 年（曜日計算用）
 * @param month 月（曜日計算用）
 * @returns Map<曜日(0-6), 実データ日数>（各値は >= 1 保証）
 */
export function computeDowDivisorMap(
  records: readonly CategoryTimeSalesRecord[],
  year: number,
  month: number,
): Map<number, number> {
  const dowDays = new Map<number, Set<number>>()
  for (const rec of records) {
    const dow = new Date(year, month - 1, rec.day).getDay()
    if (!dowDays.has(dow)) dowDays.set(dow, new Set())
    dowDays.get(dow)!.add(rec.day)
  }
  const result = new Map<number, number>()
  for (const [dow, days] of dowDays) {
    result.set(dow, days.size > 0 ? days.size : 1)
  }
  return result
}

/* ── フィルタリング純粋関数 ────────────────────────────── */

/**
 * 【TR-FIL-001】店舗フィルタ
 *
 * selectedStoreIds が空の場合は全レコードを返す（全店舗表示）。
 * 空でない場合は指定店舗のレコードのみを返す。
 *
 * 全チャートはこの関数を通じて店舗絞り込みを一元的に行うこと。
 * インラインの `if (selectedStoreIds.size > 0 && !selectedStoreIds.has(...)) continue`
 * は設計違反。
 *
 * @param records フィルタ対象レコード配列
 * @param selectedStoreIds 選択中の店舗ID集合（空 = 全店舗）
 * @returns 店舗フィルタ適用済みレコード
 */
export function filterByStore(
  records: readonly CategoryTimeSalesRecord[],
  selectedStoreIds: ReadonlySet<string>,
): readonly CategoryTimeSalesRecord[] {
  if (selectedStoreIds.size === 0) return records
  return records.filter((r) => selectedStoreIds.has(r.storeId))
}

/* ── Utility: 曜日カウント計算 ─────────────────────────── */

/**
 * 指定月の dayRange 内で各曜日 (0=日〜6=土) が何日あるか返す。
 *
 * 閏年・月末日数の違いを正しく反映する。
 * テストでの比較検証用に export する。チャートコード内での除数用途には使用禁止。
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
