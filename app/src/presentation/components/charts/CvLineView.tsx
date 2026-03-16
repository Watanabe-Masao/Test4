/**
 * CV折れ線グラフビュー — CvTimeSeriesChart のサブコンポーネント
 */
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from './SafeResponsiveContainer'
import type { useChartTheme } from './chartTheme'
import { CATEGORY_COLORS, formatDateKey } from './ChartParts'
import type { OverlayMode } from './CvTimeSeriesChart.vm'

interface CvLineTooltipProps {
  active?: boolean
  payload?: readonly { dataKey: string; value: number; color: string; name: string }[]
  label?: string
  ct: ReturnType<typeof useChartTheme>
  overlay: OverlayMode
}

function CvLineTooltipContent({ active, payload, label, ct, overlay }: CvLineTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      style={{
        background: ct.bg2,
        border: `1px solid ${ct.grid}`,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: ct.fontSize.sm,
        fontFamily: ct.fontFamily,
        color: ct.text,
        maxWidth: 280,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
      {payload.map((entry) => {
        const isCv = entry.dataKey.startsWith('cv_')
        const isPi = entry.dataKey.startsWith('pi_')
        const suffix = isCv ? ' (CV)' : isPi ? ' (PI)' : ''
        if (overlay === 'cv' && isPi) return null
        if (overlay === 'pi' && isCv) return null
        return (
          <div key={entry.dataKey} style={{ color: entry.color, fontSize: '0.6rem' }}>
            {entry.name}
            {suffix}: {entry.value.toFixed(3)}
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  readonly data: readonly Record<string, number | string>[]
  readonly topCodes: readonly string[]
  readonly categoryNames: ReadonlyMap<string, string>
  readonly ct: ReturnType<typeof useChartTheme>
  readonly overlay: OverlayMode
  readonly showCv: boolean
  readonly showPi: boolean
}

export function CvLineView({ data, topCodes, categoryNames, ct, overlay, showCv, showPi }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart
        data={data as Record<string, number | string>[]}
        margin={{ top: 8, right: 50, left: 10, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.3} />
        <XAxis
          dataKey="dateKey"
          tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
          stroke={ct.grid}
          tickFormatter={formatDateKey}
        />
        {showCv && (
          <YAxis
            yAxisId="cv"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            domain={[0, 'auto']}
            label={{
              value: 'CV',
              angle: -90,
              position: 'insideLeft',
              offset: 5,
              fontSize: 10,
              fill: ct.textMuted,
            }}
          />
        )}
        {showPi && (
          <YAxis
            yAxisId="pi"
            orientation="right"
            tick={{ fontSize: ct.fontSize.xs, fill: ct.textMuted }}
            stroke={ct.grid}
            domain={[0, 'auto']}
            label={{
              value: 'PI',
              angle: 90,
              position: 'insideRight',
              offset: 5,
              fontSize: 10,
              fill: ct.textMuted,
            }}
          />
        )}
        <Tooltip content={<CvLineTooltipContent ct={ct} overlay={overlay} />} />
        <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '0.6rem' }} />
        {showCv &&
          topCodes.map((code, i) => (
            <Line
              key={`cv_${code}`}
              yAxisId="cv"
              type="monotone"
              dataKey={`cv_${code}`}
              name={categoryNames.get(code) ?? code}
              stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        {showPi &&
          topCodes.map((code, i) => (
            <Line
              key={`pi_${code}`}
              yAxisId="pi"
              type="monotone"
              dataKey={`pi_${code}`}
              name={`${categoryNames.get(code) ?? code} (PI)`}
              stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
            />
          ))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}
