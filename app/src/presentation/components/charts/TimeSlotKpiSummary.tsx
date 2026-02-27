import { useMemo } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesIndex, DateRange } from '@/domain/models'
import { queryByDateRange } from '@/application/usecases'
import { useCategoryHierarchy, filterByHierarchy } from './categoryHierarchyHooks'
import {
  findCoreTime,
  findTurnaroundHour,
  formatCoreTime,
  formatTurnaroundHour,
} from './timeSlotUtils'
import { toPct } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
`

const Card = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
`

const CardLabel = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
`

const CardValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const CardSub = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 2px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

const DiffBadge = styled.span<{ $positive: boolean }>`
  display: inline-block;
  font-size: 0.5rem;
  font-weight: 600;
  color: ${({ $positive }) => sc.cond($positive)};
  background: ${({ $positive }) => ($positive ? 'rgba(14,165,233,0.1)' : 'rgba(249,115,22,0.1)')};
  padding: 0 4px;
  border-radius: 3px;
  margin-left: 4px;
`

interface Props {
  ctsIndex: CategoryTimeSalesIndex
  /** 前年CTS（省略時は前年比非表示） */
  prevCtsIndex?: CategoryTimeSalesIndex
  dateRange: DateRange
  /** 前年のDateRange（省略時は前年比非表示） */
  prevDateRange?: DateRange
  selectedStoreIds: ReadonlySet<string>
}

/** 分類別時間帯 KPIサマリー */
export function TimeSlotKpiSummary({
  ctsIndex,
  prevCtsIndex,
  dateRange,
  prevDateRange,
  selectedStoreIds,
}: Props) {
  const { filter } = useCategoryHierarchy()

  const kpi = useMemo(() => {
    const storeIds = selectedStoreIds.size > 0 ? selectedStoreIds : undefined
    const allRecords = queryByDateRange(ctsIndex, { dateRange, storeIds })
    const records = filterByHierarchy(allRecords, filter)

    if (records.length === 0) return null

    // Total
    const totalAmount = records.reduce((s, r) => s + r.totalAmount, 0)
    const totalQuantity = records.reduce((s, r) => s + r.totalQuantity, 0)

    // Peak hour
    const hourly = new Map<number, number>()
    for (const rec of records) {
      for (const slot of rec.timeSlots) {
        hourly.set(slot.hour, (hourly.get(slot.hour) ?? 0) + slot.amount)
      }
    }
    let peakHour = 0
    let peakHourAmount = 0
    for (const [h, amt] of hourly) {
      if (amt > peakHourAmount) {
        peakHour = h
        peakHourAmount = amt
      }
    }
    const peakHourPct = totalAmount > 0 ? toPct(peakHourAmount / totalAmount) : '0%'

    // Top department
    const deptMap = new Map<string, { name: string; amount: number }>()
    for (const rec of records) {
      const key = rec.department.code
      const existing = deptMap.get(key) ?? { name: rec.department.name, amount: 0 }
      deptMap.set(key, { name: existing.name, amount: existing.amount + rec.totalAmount })
    }
    let topDeptName = '-'
    let topDeptAmount = 0
    for (const [, v] of deptMap) {
      if (v.amount > topDeptAmount) {
        topDeptName = v.name
        topDeptAmount = v.amount
      }
    }
    const topDeptPct = totalAmount > 0 ? toPct(topDeptAmount / totalAmount) : '0%'

    // Store count
    const storeSet = new Set(records.map((r) => r.storeId))
    const daySet = new Set(records.map((r) => r.day))

    // Unique categories
    const categorySet = new Set(
      records.map((r) => `${r.department.code}-${r.line.code}-${r.klass.code}`),
    )

    // Active hours
    const activeHours = hourly.size

    // Average per hour
    const avgPerHour = activeHours > 0 ? Math.round(totalAmount / activeHours) : 0

    // コアタイム & 折り返し時間帯
    const coreTime = findCoreTime(hourly)
    const turnaroundHourVal = findTurnaroundHour(hourly)
    const coreTimePct = totalAmount > 0 && coreTime ? toPct(coreTime.total / totalAmount) : '0%'

    return {
      totalAmount,
      totalQuantity,
      peakHour,
      peakHourAmount,
      peakHourPct,
      coreTime,
      coreTimePct,
      turnaroundHour: turnaroundHourVal,
      topDeptName,
      topDeptAmount,
      topDeptPct,
      storeCount: storeSet.size,
      dayCount: daySet.size,
      categoryCount: categorySet.size,
      activeHours,
      avgPerHour,
      recordCount: records.length,
    }
  }, [ctsIndex, dateRange, selectedStoreIds, filter])

  // 前年KPI（前年比表示用）
  const prevKpi = useMemo(() => {
    if (!prevCtsIndex || !prevDateRange || prevCtsIndex.recordCount === 0) return null
    const storeIds = selectedStoreIds.size > 0 ? selectedStoreIds : undefined
    const allRecords = queryByDateRange(prevCtsIndex, { dateRange: prevDateRange, storeIds })
    const records = filterByHierarchy(allRecords, filter)
    if (records.length === 0) return null
    const totalAmount = records.reduce((s, r) => s + r.totalAmount, 0)
    const totalQuantity = records.reduce((s, r) => s + r.totalQuantity, 0)
    const hourly = new Map<number, number>()
    for (const rec of records) {
      for (const slot of rec.timeSlots) {
        hourly.set(slot.hour, (hourly.get(slot.hour) ?? 0) + slot.amount)
      }
    }
    let peakHour = 0,
      peakHourAmount = 0
    for (const [h, amt] of hourly) {
      if (amt > peakHourAmount) {
        peakHour = h
        peakHourAmount = amt
      }
    }
    return { totalAmount, totalQuantity, peakHour }
  }, [prevCtsIndex, prevDateRange, selectedStoreIds, filter])

  if (!kpi) return null

  return (
    <Wrapper>
      <Title>分類別時間帯売上 サマリー</Title>
      <Grid>
        <Card $accent={palette.primary}>
          <CardLabel>総売上金額</CardLabel>
          <CardValue>
            {Math.round(kpi.totalAmount / 10000).toLocaleString()}万円
            {prevKpi && prevKpi.totalAmount > 0 && (
              <DiffBadge $positive={kpi.totalAmount >= prevKpi.totalAmount}>
                {toPct(kpi.totalAmount / prevKpi.totalAmount)}
              </DiffBadge>
            )}
          </CardValue>
          <CardSub>{kpi.totalAmount.toLocaleString()}円</CardSub>
        </Card>
        <Card $accent={palette.cyanDark}>
          <CardLabel>総数量</CardLabel>
          <CardValue>
            {kpi.totalQuantity.toLocaleString()}点
            {prevKpi && prevKpi.totalQuantity > 0 && (
              <DiffBadge $positive={kpi.totalQuantity >= prevKpi.totalQuantity}>
                {toPct(kpi.totalQuantity / prevKpi.totalQuantity)}
              </DiffBadge>
            )}
          </CardValue>
          <CardSub>{kpi.recordCount.toLocaleString()}レコード</CardSub>
        </Card>
        <Card $accent={palette.warningDark}>
          <CardLabel>ピーク時間帯</CardLabel>
          <CardValue>
            {kpi.peakHour}時台
            {prevKpi && prevKpi.peakHour !== kpi.peakHour && (
              <DiffBadge $positive={false}>前年{prevKpi.peakHour}時</DiffBadge>
            )}
          </CardValue>
          <CardSub>構成比 {kpi.peakHourPct}</CardSub>
        </Card>
        <Card $accent={palette.purpleDark}>
          <CardLabel>コアタイム</CardLabel>
          <CardValue>{formatCoreTime(kpi.coreTime)}</CardValue>
          <CardSub>構成比 {kpi.coreTimePct}</CardSub>
        </Card>
        <Card $accent={sc.negative}>
          <CardLabel>折り返し時間帯</CardLabel>
          <CardValue>{formatTurnaroundHour(kpi.turnaroundHour)}</CardValue>
          <CardSub>累積50%到達</CardSub>
        </Card>
        <Card $accent={sc.positive}>
          <CardLabel>売上1位部門</CardLabel>
          <CardValue style={{ fontSize: kpi.topDeptName.length > 5 ? '0.85rem' : undefined }}>
            {kpi.topDeptName}
          </CardValue>
          <CardSub>構成比 {kpi.topDeptPct}</CardSub>
        </Card>
        <Card $accent={palette.pinkDark}>
          <CardLabel>対象店舗/日数</CardLabel>
          <CardValue>
            {kpi.storeCount}店 / {kpi.dayCount}日
          </CardValue>
          <CardSub>{kpi.categoryCount}分類</CardSub>
        </Card>
        <Card $accent={palette.purpleDark}>
          <CardLabel>時間帯平均</CardLabel>
          <CardValue>{Math.round(kpi.avgPerHour / 10000).toLocaleString()}万</CardValue>
          <CardSub>{kpi.activeHours}時間帯</CardSub>
        </Card>
      </Grid>
    </Wrapper>
  )
}
