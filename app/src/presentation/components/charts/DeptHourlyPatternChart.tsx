import { memo, useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, useCurrencyFormatter, toComma, toPct } from './chartTheme'
import type { CategoryTimeSalesRecord, CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import { pearsonCorrelation } from '@/domain/calculations'
import { useCategoryHierarchy, filterByHierarchy } from './categoryHierarchyHooks'
import { usePeriodFilter, useHierarchyDropdown } from './periodFilterHooks'
import { PeriodFilterBar, HierarchyDropdowns } from './PeriodFilter'
import { computeDivisor, countDistinctDays, filterByStore } from './periodFilterUtils'
import { queryByDateRange } from '@/application/usecases'
import { sc } from '@/presentation/theme/semanticColors'

const Wrapper = styled.div`
  width: 100%;
  height: 440px;
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
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
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
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text3)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

const Separator = styled.span`
  width: 1px;
  height: 16px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
`
const EmptyFilterMsg = styled.div`
  text-align: center;
  padding: 40px 16px;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

const SelectWrap = styled.select`
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const TopNSelect = styled(SelectWrap)``

const InsightBar = styled.div`
  margin: ${({ theme }) => theme.spacing[2]} 0 0;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  border-left: 3px solid ${({ theme }) => theme.colors.palette.primary};
  font-size: 0.62rem;
  color: ${({ theme }) => theme.colors.text2};
  line-height: 1.6;
`
const InsightItem = styled.div`
  &::before {
    content: '▸ ';
    opacity: 0.5;
  }
`

const DEPT_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#84cc16',
  '#f97316',
  '#14b8a6',
]

type GroupLevel = 'department' | 'line' | 'klass'
type ViewMode = 'stacked' | 'separate'

interface Props {
  ctsIndex: CategoryTimeSalesIndex
  /** 分類別時間帯売上インデックス（前年、同曜日オフセット適用済み） */
  prevCtsIndex?: CategoryTimeSalesIndex
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
  /** 販売データ存在最大日（スライダーデフォルト値用） */
  dataMaxDay?: number
}

/** 部門/ライン/クラス別 時間帯パターンチャート */
export const DeptHourlyPatternChart = memo(function DeptHourlyPatternChart({
  ctsIndex,
  prevCtsIndex,
  selectedStoreIds,
  daysInMonth,
  year,
  month,
  dataMaxDay,
}: Props) {
  const ct = useChartTheme()
  const fmt = useCurrencyFormatter()
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')
  const [groupLevel, setGroupLevel] = useState<GroupLevel>('department')
  const [topN, setTopN] = useState(5)
  const [lineFilter, setLineFilter] = useState<string>('')
  const { filter } = useCategoryHierarchy()
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
  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  // 利用可能なラインの一覧（ライン→クラス表示時のフィルタ用）【TR-FIL-001】
  const availableLines = useMemo(() => {
    const lineMap = new Map<string, string>()
    const storeFiltered = filterByStore(
      filterByHierarchy(hf.applyFilter(periodRecords), filter),
      selectedStoreIds,
    )
    for (const rec of storeFiltered) {
      if (!lineMap.has(rec.line.code)) {
        lineMap.set(rec.line.code, rec.line.name || rec.line.code)
      }
    }
    // 金額順でソート
    const totals = new Map<string, number>()
    for (const rec of storeFiltered) {
      totals.set(rec.line.code, (totals.get(rec.line.code) ?? 0) + rec.totalAmount)
    }
    return Array.from(lineMap.entries())
      .map(([code, name]) => ({ code, name, total: totals.get(code) ?? 0 }))
      .sort((a, b) => b.total - a.total)
  }, [periodRecords, selectedStoreIds, filter, hf])

  // 利用可能な部門一覧（部門→ライン表示時のフィルタ用）【TR-FIL-001】
  const availableDepartments = useMemo(() => {
    const deptMap = new Map<string, string>()
    const storeFiltered = filterByStore(
      filterByHierarchy(hf.applyFilter(periodRecords), filter),
      selectedStoreIds,
    )
    for (const rec of storeFiltered) {
      if (!deptMap.has(rec.department.code)) {
        deptMap.set(rec.department.code, rec.department.name || rec.department.code)
      }
    }
    const totals = new Map<string, number>()
    for (const rec of storeFiltered) {
      totals.set(rec.department.code, (totals.get(rec.department.code) ?? 0) + rec.totalAmount)
    }
    return Array.from(deptMap.entries())
      .map(([code, name]) => ({ code, name, total: totals.get(code) ?? 0 }))
      .sort((a, b) => b.total - a.total)
  }, [periodRecords, selectedStoreIds, filter, hf])

  const [deptFilter, setDeptFilter] = useState<string>('')

  const { data, departments, total } = useMemo(() => {
    const deptHourMap = new Map<string, Map<number, number>>()
    const deptNames = new Map<string, string>()
    const hourSet = new Set<number>()
    let storeFiltered: readonly CategoryTimeSalesRecord[] = filterByStore(
      filterByHierarchy(hf.applyFilter(periodRecords), filter),
      selectedStoreIds,
    )

    // 追加フィルタ：ラインでクラスを絞る、部門でラインを絞る
    if (groupLevel === 'klass' && lineFilter) {
      storeFiltered = storeFiltered.filter((r) => r.line.code === lineFilter)
    }
    if (groupLevel === 'line' && deptFilter) {
      storeFiltered = storeFiltered.filter((r) => r.department.code === deptFilter)
    }

    for (const rec of storeFiltered) {
      let deptKey: string, deptName: string
      if (groupLevel === 'department') {
        deptKey = rec.department.code
        deptName = rec.department.name || deptKey
      } else if (groupLevel === 'line') {
        deptKey = rec.line.code
        deptName = rec.line.name || deptKey
      } else {
        deptKey = rec.klass.code
        deptName = rec.klass.name || deptKey
      }
      deptNames.set(deptKey, deptName)

      if (!deptHourMap.has(deptKey)) deptHourMap.set(deptKey, new Map())
      const hourMap = deptHourMap.get(deptKey)!

      for (const slot of rec.timeSlots) {
        hourSet.add(slot.hour)
        hourMap.set(slot.hour, (hourMap.get(slot.hour) ?? 0) + slot.amount)
      }
    }

    // 実データの distinct day から除数を算出【TR-DIV-001】【TR-DIV-002】
    const dataDivisor = computeDivisor(countDistinctDays(storeFiltered), pf.mode)

    const deptTotals = [...deptHourMap.entries()].map(([code, hourMap]) => ({
      code,
      name: deptNames.get(code) ?? code,
      total: [...hourMap.values()].reduce((s, v) => s + v, 0),
      hourMap,
    }))
    deptTotals.sort((a, b) => b.total - a.total)
    const topDepts = deptTotals.slice(0, topN)

    const hours = [...hourSet].sort((a, b) => a - b)
    const data = hours.map((h) => {
      const entry: Record<string, string | number> = { hour: `${h}時` }
      for (const dept of topDepts) {
        entry[dept.name] = Math.round((dept.hourMap.get(h) ?? 0) / dataDivisor)
      }
      return entry
    })

    const overallTotal = Math.round(deptTotals.reduce((s, d) => s + d.total, 0) / dataDivisor)
    return { data, departments: topDepts.map((d) => d.name), total: overallTotal }
  }, [periodRecords, selectedStoreIds, filter, groupLevel, topN, lineFilter, deptFilter, pf, hf])

  // 前年比較（CTS由来データ同士で比較。注: classifiedSalesとは別データソース）
  const prevYearYoY = useMemo(() => {
    if (!prevCtsIndex || prevCtsIndex.recordCount === 0) return null
    const prevRange: DateRange = {
      from: { year: year - 1, month, day: pf.dayRange[0] },
      to: { year: year - 1, month, day: pf.dayRange[1] },
    }
    const prevRecs = queryByDateRange(prevCtsIndex, {
      dateRange: prevRange,
      storeIds: selectedStoreIds,
    })
    const filtered = filterByStore(
      filterByHierarchy(hf.applyFilter(prevRecs), filter),
      selectedStoreIds,
    )
    if (filtered.length === 0) return null
    const prevDiv = computeDivisor(countDistinctDays(filtered), pf.mode)
    const prevTotal = Math.round(filtered.reduce((s, r) => s + r.totalAmount, 0) / prevDiv)
    if (prevTotal === 0) return null
    return { prevTotal, yoyRatio: total / prevTotal }
  }, [prevCtsIndex, selectedStoreIds, year, month, pf, filter, hf, total])

  // カニバリゼーション分析: 部門間の時間帯パターン相関
  // 負の相関 → 同時間帯で一方が増えると他方が減る傾向（顧客の奪い合いの可能性）
  const cannibalization = useMemo(() => {
    if (departments.length < 2 || data.length < 3) return []
    const patterns = departments.map((dept) => data.map((d) => (d[dept] as number) ?? 0))
    const results: { deptA: string; deptB: string; r: number }[] = []
    for (let i = 0; i < departments.length; i++) {
      for (let j = i + 1; j < departments.length; j++) {
        const { r } = pearsonCorrelation(patterns[i], patterns[j])
        if (r < -0.3) {
          results.push({ deptA: departments[i], deptB: departments[j], r })
        }
      }
    }
    return results.sort((a, b) => a.r - b.r)
  }, [data, departments])

  if (data.length === 0 || departments.length === 0)
    return (
      <Wrapper aria-label="部門別時間帯パターンチャート">
        <Header>
          <Title>部門別 時間帯パターン</Title>
        </Header>
        <EmptyFilterMsg>選択した絞り込み条件に該当するデータがありません</EmptyFilterMsg>
        <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
        <HierarchyDropdowns hf={hf} />
      </Wrapper>
    )

  const levelLabels: Record<GroupLevel, string> = {
    department: '部門',
    line: 'ライン',
    klass: 'クラス',
  }
  const filterLabel =
    groupLevel === 'klass' && lineFilter
      ? (availableLines.find((l) => l.code === lineFilter)?.name ?? '')
      : groupLevel === 'line' && deptFilter
        ? (availableDepartments.find((d) => d.code === deptFilter)?.name ?? '')
        : ''
  const titleText = filterLabel
    ? `${filterLabel} ${levelLabels[groupLevel]}別 時間帯パターン（上位${departments.length}件）`
    : `${levelLabels[groupLevel]}別 時間帯パターン（上位${departments.length}件）`

  return (
    <Wrapper aria-label="部門別時間帯パターンチャート">
      <Header>
        <Title>
          {titleText}
          {pf.mode === 'dailyAvg' || pf.mode === 'dowAvg' ? '（日平均）' : ''}
          {prevYearYoY && (
            <span
              style={{
                marginLeft: 8,
                fontSize: '0.65rem',
                fontWeight: 600,
                color: sc.cond(prevYearYoY.yoyRatio >= 1),
              }}
            >
              前年比 {toPct(prevYearYoY.yoyRatio)}
            </span>
          )}
        </Title>
        <Controls>
          {/* グループレベル切替 */}
          <TabGroup>
            {(['department', 'line', 'klass'] as GroupLevel[]).map((l) => (
              <Tab
                key={l}
                $active={groupLevel === l}
                onClick={() => {
                  setGroupLevel(l)
                  setLineFilter('')
                  setDeptFilter('')
                }}
              >
                {levelLabels[l]}
              </Tab>
            ))}
          </TabGroup>

          {/* ライン→クラス時のラインフィルタ */}
          {groupLevel === 'klass' && availableLines.length > 0 && (
            <>
              <Separator />
              <SelectWrap value={lineFilter} onChange={(e) => setLineFilter(e.target.value)}>
                <option value="">全ライン</option>
                {availableLines.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </SelectWrap>
            </>
          )}

          {/* 部門→ライン時の部門フィルタ */}
          {groupLevel === 'line' && availableDepartments.length > 1 && (
            <>
              <Separator />
              <SelectWrap value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">全部門</option>
                {availableDepartments.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.name}
                  </option>
                ))}
              </SelectWrap>
            </>
          )}

          <Separator />

          {/* 上位N件選択 */}
          <TopNSelect value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                上位{n}件
              </option>
            ))}
          </TopNSelect>

          <Separator />

          {/* 表示モード */}
          <TabGroup>
            <Tab $active={viewMode === 'stacked'} onClick={() => setViewMode('stacked')}>
              積み上げ
            </Tab>
            <Tab $active={viewMode === 'separate'} onClick={() => setViewMode('separate')}>
              独立
            </Tab>
          </TabGroup>
        </Controls>
      </Header>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="80%">
        <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="hour"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={fmt}
            width={50}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => [
              toComma(value ?? 0) + '円',
              name ?? '',
            ]}
            itemSorter={(item) => -(typeof item.value === 'number' ? item.value : 0)}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          {departments.map((dept, i) => (
            <Area
              key={dept}
              type="monotone"
              dataKey={dept}
              stackId={viewMode === 'stacked' ? 'dept' : undefined}
              stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
              fill={DEPT_COLORS[i % DEPT_COLORS.length]}
              fillOpacity={viewMode === 'stacked' ? 0.6 : 0.15}
              strokeWidth={viewMode === 'stacked' ? 0 : 2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      {cannibalization.length > 0 && (
        <InsightBar>
          <InsightItem>時間帯カニバリゼーション検出（相関分析）:</InsightItem>
          {cannibalization.map((c, i) => (
            <InsightItem key={i}>
              {c.deptA} × {c.deptB}: 相関r={c.r.toFixed(2)}（負の相関 → 同時間帯で競合の可能性）
            </InsightItem>
          ))}
        </InsightBar>
      )}
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
})
