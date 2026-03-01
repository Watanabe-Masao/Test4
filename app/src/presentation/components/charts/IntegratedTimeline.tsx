import { useMemo, useState } from 'react'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toComma } from './chartTheme'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import {
  normalizeMinMax,
  pearsonCorrelation,
  detectDivergence,
  movingAverage,
} from '@/application/hooks/useStatistics'
import type { StoreResult } from '@/domain/models'

const Wrapper = styled.div`
  width: 100%;
  height: 480px;
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
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const CorrelationRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

const CorrBadge = styled.div<{ $strength: 'strong' | 'moderate' | 'weak' }>`
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ $strength }) =>
    $strength === 'strong'
      ? `${sc.positive}1f`
      : $strength === 'moderate'
        ? `${sc.caution}1f`
        : 'rgba(148,163,184,0.12)'};
  color: ${({ $strength }) =>
    $strength === 'strong' ? sc.positive : $strength === 'moderate' ? sc.caution : '#94a3b8'};
  border: 1px solid
    ${({ $strength }) =>
      $strength === 'strong'
        ? `${sc.positive}40`
        : $strength === 'moderate'
          ? `${sc.caution}40`
          : 'rgba(148,163,184,0.25)'};
  white-space: nowrap;
`

const ViewToggle = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const ViewBtn = styled.button<{ $active?: boolean }>`
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

type ViewMode = 'normalized' | 'raw'

const SERIES_CONFIG = [
  { key: 'sales', label: '売上', color: palette.primary },
  { key: 'cost', label: '仕入', color: sc.negative },
  { key: 'grossProfit', label: '粗利', color: sc.positive },
  { key: 'discount', label: '売変', color: palette.warningDark },
] as const

interface Props {
  result: StoreResult
  daysInMonth: number
}

export function IntegratedTimeline({ result, daysInMonth }: Props) {
  const ct = useChartTheme()
  const [viewMode, setViewMode] = useState<ViewMode>('normalized')

  const { chartData, correlations, divergences } = useMemo(() => {
    const salesArr: number[] = []
    const costArr: number[] = []
    const gpArr: number[] = []
    const discountArr: number[] = []
    const days: number[] = []

    for (let d = 1; d <= daysInMonth; d++) {
      const rec = result.daily.get(d)
      days.push(d)
      const sales = rec?.sales ?? 0
      const cost = rec ? rec.purchase.cost + rec.deliverySales.cost : 0
      const discount = rec?.discountAmount ?? 0
      salesArr.push(sales)
      costArr.push(cost)
      gpArr.push(sales - cost)
      discountArr.push(discount)
    }

    // 正規化
    const normSales = normalizeMinMax(salesArr)
    const normCost = normalizeMinMax(costArr)
    const normGP = normalizeMinMax(gpArr)
    const normDiscount = normalizeMinMax(discountArr)

    // 移動平均（7日）
    const maSales = movingAverage(salesArr, 7)
    const maCost = movingAverage(costArr, 7)

    // チャートデータ
    const data = days.map((d, i) => ({
      day: d,
      sales: salesArr[i],
      cost: costArr[i],
      grossProfit: gpArr[i],
      discount: discountArr[i],
      normSales: normSales.values[i],
      normCost: normCost.values[i],
      normGrossProfit: normGP.values[i],
      normDiscount: normDiscount.values[i],
      maSales: maSales[i],
      maCost: maCost[i],
    }))

    // 相関計算
    const series = [
      { name: '売上', values: salesArr },
      { name: '仕入', values: costArr },
      { name: '粗利', values: gpArr },
      { name: '売変', values: discountArr },
    ]
    const corrs: { pair: string; r: number }[] = []
    for (let i = 0; i < series.length; i++) {
      for (let j = i + 1; j < series.length; j++) {
        const { r } = pearsonCorrelation(series[i].values, series[j].values)
        corrs.push({ pair: `${series[i].name}×${series[j].name}`, r })
      }
    }

    // 乖離検出（売上 vs 仕入）
    const divPts = detectDivergence(salesArr, costArr, 30)

    return { chartData: data, correlations: corrs, divergences: divPts }
  }, [result, daysInMonth])

  const divergentRanges = useMemo(() => {
    const ranges: { start: number; end: number }[] = []
    let rangeStart: number | null = null
    for (const pt of divergences) {
      if (pt.isSignificant) {
        if (rangeStart == null) rangeStart = pt.index + 1
      } else {
        if (rangeStart != null) {
          ranges.push({ start: rangeStart, end: pt.index })
          rangeStart = null
        }
      }
    }
    if (rangeStart != null) {
      ranges.push({ start: rangeStart, end: divergences.length })
    }
    return ranges
  }, [divergences])

  const isNorm = viewMode === 'normalized'

  if (chartData.every((d) => d.sales === 0)) {
    return (
      <Wrapper>
        <HeaderRow>
          <Title>統合タイムライン</Title>
        </HeaderRow>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            color: ct.textMuted,
            fontSize: ct.fontSize.sm,
          }}
        >
          データがありません
        </div>
      </Wrapper>
    )
  }

  const corrStrength = (r: number): 'strong' | 'moderate' | 'weak' => {
    const abs = Math.abs(r)
    if (abs >= 0.7) return 'strong'
    if (abs >= 0.4) return 'moderate'
    return 'weak'
  }

  return (
    <Wrapper>
      <HeaderRow>
        <Title>統合タイムライン — 売上・仕入・粗利・売変の連動分析</Title>
        <ViewToggle>
          <ViewBtn $active={viewMode === 'normalized'} onClick={() => setViewMode('normalized')}>
            正規化
          </ViewBtn>
          <ViewBtn $active={viewMode === 'raw'} onClick={() => setViewMode('raw')}>
            実数
          </ViewBtn>
        </ViewToggle>
      </HeaderRow>
      <CorrelationRow>
        {correlations.map((c) => (
          <CorrBadge key={c.pair} $strength={corrStrength(c.r)}>
            {c.pair}: r={c.r.toFixed(2)}
          </CorrBadge>
        ))}
      </CorrelationRow>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="82%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
            tickFormatter={(v: number) => `${v}日`}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            width={isNorm ? 35 : 60}
            tickFormatter={(v: number) => (isNorm ? `${Math.round(v)}` : toComma(v))}
            label={
              isNorm
                ? {
                    value: '正規化値(0-100)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    fontSize: ct.fontSize.xs,
                    fill: ct.textMuted,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              const v = value as number
              if (isNorm) return [`${v.toFixed(1)}`, name]
              return [toComma(v), name]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />

          {/* 乖離ゾーンのハイライト */}
          {divergentRanges.map((range, i) => (
            <ReferenceArea
              key={i}
              x1={range.start}
              x2={range.end}
              fill={sc.negative}
              fillOpacity={0.06}
              strokeOpacity={0}
            />
          ))}

          {SERIES_CONFIG.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={isNorm ? `norm${s.key.charAt(0).toUpperCase() + s.key.slice(1)}` : s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />
          ))}

          {/* 移動平均（raw mode のみ） */}
          {!isNorm && (
            <>
              <Line
                type="monotone"
                dataKey="maSales"
                name="売上 7日MA"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="maCost"
                name="仕入 7日MA"
                stroke={sc.negative}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </Wrapper>
  )
}
