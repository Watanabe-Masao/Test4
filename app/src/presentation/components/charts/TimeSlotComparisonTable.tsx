/**
 * TimeSlotComparisonTable — 時間帯別比較テーブル
 *
 * chartData から金額/点数を切り替えて前年（前週）比較テーブルを表示する。
 * 天気データ（気温・降水量）の時間帯別平均も表示可能。
 */
import { useState, useMemo, memo } from 'react'
import { toComma, toPct } from './chartTheme'
import { TabGroup, Tab, TableWrapper, MiniTable, MiniTh, MiniTd } from './TimeSlotSalesChart.styles'

type MetricToggle = 'amount' | 'quantity'

interface ChartRow {
  readonly [key: string]: string | number | null
}

/** 天気時間帯平均データ */
export interface WeatherHourlyAvg {
  readonly hour: number
  readonly avgTemperature: number
  readonly totalPrecipitation: number
}

interface Props {
  readonly chartData: readonly ChartRow[]
  readonly curLabel: string
  readonly compLabel: string
  readonly hasPrev: boolean
  readonly curWeather?: readonly WeatherHourlyAvg[]
  readonly prevWeather?: readonly WeatherHourlyAvg[]
}

interface TableRow {
  readonly hour: string
  readonly hourNum: number
  readonly current: number
  readonly prev: number
  readonly diff: number
  readonly ratio: number | null
}

function buildRows(data: readonly ChartRow[], metric: MetricToggle, hasPrev: boolean): TableRow[] {
  const curKey = metric === 'amount' ? 'amount' : 'quantity'
  const prevKey = metric === 'amount' ? 'prevAmount' : 'prevQuantity'

  return data.map((r) => {
    const current = (r[curKey] as number) ?? 0
    const prev = hasPrev ? ((r[prevKey] as number) ?? 0) : 0
    const diff = current - prev
    const ratio = prev > 0 ? current / prev : null
    const hourStr = r.hour as string
    const hourNum = parseInt(hourStr, 10) || 0
    return { hour: hourStr, hourNum, current, prev, diff, ratio }
  })
}

function weatherByHour(
  data: readonly WeatherHourlyAvg[] | undefined,
): ReadonlyMap<number, WeatherHourlyAvg> {
  if (!data) return new Map()
  return new Map(data.map((w) => [w.hour, w]))
}

export const TimeSlotComparisonTable = memo(function TimeSlotComparisonTable({
  chartData,
  curLabel,
  compLabel,
  hasPrev,
  curWeather,
  prevWeather,
}: Props) {
  const [metric, setMetric] = useState<MetricToggle>('amount')
  const isAmount = metric === 'amount'
  const suffix = isAmount ? '円' : '点'

  const rows = useMemo(() => buildRows(chartData, metric, hasPrev), [chartData, metric, hasPrev])
  const curW = useMemo(() => weatherByHour(curWeather), [curWeather])
  const prevW = useMemo(() => weatherByHour(prevWeather), [prevWeather])
  const hasWeather = curW.size > 0

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <TabGroup>
          <Tab $active={metric === 'amount'} onClick={() => setMetric('amount')}>
            金額
          </Tab>
          <Tab $active={metric === 'quantity'} onClick={() => setMetric('quantity')}>
            点数
          </Tab>
        </TabGroup>
      </div>
      <TableWrapper>
        <MiniTable>
          <thead>
            <tr>
              <MiniTh>時間帯</MiniTh>
              <MiniTh>{curLabel}</MiniTh>
              {hasPrev && <MiniTh>{compLabel}</MiniTh>}
              {hasPrev && <MiniTh>差分</MiniTh>}
              {hasPrev && <MiniTh>{compLabel}比</MiniTh>}
              {hasWeather && <MiniTh>気温</MiniTh>}
              {hasWeather && <MiniTh>降水</MiniTh>}
              {hasWeather && hasPrev && prevW.size > 0 && <MiniTh>前年気温</MiniTh>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const cw = curW.get(row.hourNum)
              const pw = prevW.get(row.hourNum)
              return (
                <tr key={row.hour}>
                  <MiniTd>{row.hour}</MiniTd>
                  <MiniTd>
                    {toComma(row.current)}
                    {suffix}
                  </MiniTd>
                  {hasPrev && (
                    <MiniTd>
                      {toComma(row.prev)}
                      {suffix}
                    </MiniTd>
                  )}
                  {hasPrev && (
                    <MiniTd $highlight $positive={row.diff >= 0}>
                      {row.diff >= 0 ? '+' : ''}
                      {toComma(row.diff)}
                      {suffix}
                    </MiniTd>
                  )}
                  {hasPrev && (
                    <MiniTd $highlight $positive={(row.ratio ?? 0) >= 1}>
                      {row.ratio != null ? toPct(row.ratio) : '-'}
                    </MiniTd>
                  )}
                  {hasWeather && <MiniTd>{cw ? `${cw.avgTemperature.toFixed(1)}°` : '-'}</MiniTd>}
                  {hasWeather && (
                    <MiniTd>
                      {cw
                        ? cw.totalPrecipitation > 0
                          ? `${cw.totalPrecipitation.toFixed(1)}mm`
                          : '-'
                        : '-'}
                    </MiniTd>
                  )}
                  {hasWeather && hasPrev && prevW.size > 0 && (
                    <MiniTd>{pw ? `${pw.avgTemperature.toFixed(1)}°` : '-'}</MiniTd>
                  )}
                </tr>
              )
            })}
          </tbody>
        </MiniTable>
      </TableWrapper>
    </>
  )
})
