import { useMemo } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesData } from '@/domain/models'

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

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  selectedStoreIds: ReadonlySet<string>
}

/** 分類別時間帯 KPIサマリー */
export function TimeSlotKpiSummary({ categoryTimeSales, selectedStoreIds }: Props) {
  const kpi = useMemo(() => {
    const records = categoryTimeSales.records.filter(
      (r) => selectedStoreIds.size === 0 || selectedStoreIds.has(r.storeId),
    )

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
      if (amt > peakHourAmount) { peakHour = h; peakHourAmount = amt }
    }
    const peakHourPct = totalAmount > 0 ? (peakHourAmount / totalAmount * 100).toFixed(1) : '0'

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
      if (v.amount > topDeptAmount) { topDeptName = v.name; topDeptAmount = v.amount }
    }
    const topDeptPct = totalAmount > 0 ? (topDeptAmount / totalAmount * 100).toFixed(1) : '0'

    // Store count
    const storeSet = new Set(records.map((r) => r.storeId))
    const daySet = new Set(records.map((r) => r.day))

    // Unique categories
    const categorySet = new Set(records.map((r) => `${r.department.code}-${r.line.code}-${r.klass.code}`))

    // Active hours
    const activeHours = hourly.size

    // Average per hour
    const avgPerHour = activeHours > 0 ? Math.round(totalAmount / activeHours) : 0

    return {
      totalAmount,
      totalQuantity,
      peakHour,
      peakHourAmount,
      peakHourPct,
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
  }, [categoryTimeSales, selectedStoreIds])

  if (!kpi) return null

  return (
    <Wrapper>
      <Title>分類別時間帯売上 サマリー</Title>
      <Grid>
        <Card $accent="#6366f1">
          <CardLabel>総売上金額</CardLabel>
          <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
          <CardSub>{kpi.totalAmount.toLocaleString()}円</CardSub>
        </Card>
        <Card $accent="#06b6d4">
          <CardLabel>総数量</CardLabel>
          <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
          <CardSub>{kpi.recordCount.toLocaleString()}レコード</CardSub>
        </Card>
        <Card $accent="#f59e0b">
          <CardLabel>ピーク時間帯</CardLabel>
          <CardValue>{kpi.peakHour}時台</CardValue>
          <CardSub>構成比 {kpi.peakHourPct}%</CardSub>
        </Card>
        <Card $accent="#22c55e">
          <CardLabel>売上1位部門</CardLabel>
          <CardValue style={{ fontSize: kpi.topDeptName.length > 5 ? '0.85rem' : undefined }}>
            {kpi.topDeptName}
          </CardValue>
          <CardSub>構成比 {kpi.topDeptPct}%</CardSub>
        </Card>
        <Card $accent="#ec4899">
          <CardLabel>対象店舗/日数</CardLabel>
          <CardValue>{kpi.storeCount}店 / {kpi.dayCount}日</CardValue>
          <CardSub>{kpi.categoryCount}分類</CardSub>
        </Card>
        <Card $accent="#8b5cf6">
          <CardLabel>時間帯平均</CardLabel>
          <CardValue>{Math.round(kpi.avgPerHour / 10000).toLocaleString()}万</CardValue>
          <CardSub>{kpi.activeHours}時間帯</CardSub>
        </Card>
      </Grid>
    </Wrapper>
  )
}
