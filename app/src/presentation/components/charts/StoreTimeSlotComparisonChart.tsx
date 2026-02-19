import { useMemo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, STORE_COLORS } from './chartTheme'
import type { CategoryTimeSalesData, Store } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'

const Wrapper = styled.div`
  width: 100%;
  height: 400px;
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

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  stores: ReadonlyMap<string, Store>
}

/** 店舗別 時間帯売上レーダーチャート */
export function StoreTimeSlotComparisonChart({ categoryTimeSales, stores }: Props) {
  const ct = useChartTheme()
  const { filter } = useCategoryHierarchy()

  const { data, storeNames } = useMemo(() => {
    // store → hour → amount
    const storeHourMap = new Map<string, Map<number, number>>()
    const hourSet = new Set<number>()
    const filtered = filterByHierarchy(categoryTimeSales.records, filter)

    for (const rec of filtered) {
      if (!storeHourMap.has(rec.storeId)) storeHourMap.set(rec.storeId, new Map())
      const hourMap = storeHourMap.get(rec.storeId)!

      for (const slot of rec.timeSlots) {
        hourSet.add(slot.hour)
        hourMap.set(slot.hour, (hourMap.get(slot.hour) ?? 0) + slot.amount)
      }
    }

    const hours = [...hourSet].sort((a, b) => a - b)
    const storeIds = [...storeHourMap.keys()]

    const storeNames = storeIds.map((id) => ({
      id,
      name: stores.get(id)?.name ?? `店舗${id}`,
    }))

    const data = hours.map((h) => {
      const entry: Record<string, string | number> = { hour: `${h}時` }
      for (const s of storeNames) {
        entry[s.name] = storeHourMap.get(s.id)?.get(h) ?? 0
      }
      return entry
    })

    return { data, storeNames }
  }, [categoryTimeSales, stores, filter])

  if (data.length === 0 || storeNames.length <= 1) return null

  return (
    <Wrapper>
      <Title>店舗別 時間帯売上パターン比較</Title>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="88%">
        <RadarChart data={data} margin={{ top: 4, right: 30, left: 30, bottom: 4 }}>
          <PolarGrid stroke={ct.grid} strokeOpacity={0.4} />
          <PolarAngleAxis
            dataKey="hour"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
          />
          <PolarRadiusAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            tickFormatter={toManYen}
          />
          {storeNames.map((s, i) => (
            <Radar
              key={s.id}
              name={s.name}
              dataKey={s.name}
              stroke={STORE_COLORS[i % STORE_COLORS.length]}
              fill={STORE_COLORS[i % STORE_COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined) => [`${Math.round(value ?? 0).toLocaleString()}円`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
