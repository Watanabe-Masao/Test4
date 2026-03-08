/**
 * ChartTooltip のファクトリ。Recharts の content prop に直接渡せる形で返す。
 *
 * @example
 * <Tooltip content={createChartTooltip({ ct, formatter, labelFormatter })} />
 *
 * // トレンド付き
 * <Tooltip content={createChartTooltip({
 *   ct,
 *   formatter: ...,
 *   trendResolver: (name, entry) => {
 *     const prev = entry.payload?.prevYearSales as number | undefined
 *     const cur = entry.value as number
 *     if (prev && prev > 0) return { ratio: cur / prev }
 *     return null
 *   },
 * })} />
 */
import type { ChartTheme } from './chartTheme'
import { ChartTooltip, type ChartTooltipProps } from './ChartTooltip'

export function createChartTooltip(opts: {
  ct: ChartTheme
  formatter?: ChartTooltipProps['formatter']
  labelFormatter?: ChartTooltipProps['labelFormatter']
  trendResolver?: ChartTooltipProps['trendResolver']
}) {
  return function ChartTooltipContent(props: Record<string, unknown>) {
    return (
      <ChartTooltip
        active={props.active as boolean}
        payload={props.payload as ChartTooltipProps['payload']}
        label={props.label as string | number}
        ct={opts.ct}
        formatter={opts.formatter}
        labelFormatter={opts.labelFormatter}
        trendResolver={opts.trendResolver}
      />
    )
  }
}
