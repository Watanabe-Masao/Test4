/**
 * TimeSlotComparisonTable — 時間帯別比較テーブル（横軸=時間帯）
 *
 * グラフと見方を合わせ、横軸に時間帯、縦軸に当年/前年/差分/前年比を表示。
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

interface ColData {
  readonly hour: string
  readonly current: number
  readonly prev: number
  readonly diff: number
  readonly ratio: number | null
}

function buildCols(data: readonly ChartRow[], metric: MetricToggle, hasPrev: boolean): ColData[] {
  const curKey = metric === 'amount' ? 'amount' : 'quantity'
  const prevKey = metric === 'amount' ? 'prevAmount' : 'prevQuantity'

  return data.map((r) => {
    const current = (r[curKey] as number) ?? 0
    const prev = hasPrev ? ((r[prevKey] as number) ?? 0) : 0
    const diff = current - prev
    const ratio = prev > 0 ? current / prev : null
    return { hour: r.hour as string, current, prev, diff, ratio }
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

  const cols = useMemo(() => buildCols(chartData, metric, hasPrev), [chartData, metric, hasPrev])
  const curW = useMemo(() => weatherByHour(curWeather), [curWeather])
  const prevW = useMemo(() => weatherByHour(prevWeather), [prevWeather])
  const hasWeather = curW.size > 0
  const hasPrevWeather = hasWeather && hasPrev && prevW.size > 0

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
              <MiniTh style={{ textAlign: 'left' }}></MiniTh>
              {cols.map((c) => (
                <MiniTh key={c.hour}>{c.hour}時</MiniTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 当年 */}
            <tr>
              <MiniTd style={{ fontWeight: 600 }}>{curLabel}</MiniTd>
              {cols.map((c) => (
                <MiniTd key={c.hour}>
                  {toComma(c.current)}
                  {suffix}
                </MiniTd>
              ))}
            </tr>
            {/* 前年 */}
            {hasPrev && (
              <tr>
                <MiniTd style={{ fontWeight: 600 }}>{compLabel}</MiniTd>
                {cols.map((c) => (
                  <MiniTd key={c.hour}>
                    {toComma(c.prev)}
                    {suffix}
                  </MiniTd>
                ))}
              </tr>
            )}
            {/* 差分 */}
            {hasPrev && (
              <tr>
                <MiniTd style={{ fontWeight: 600 }}>差分</MiniTd>
                {cols.map((c) => (
                  <MiniTd key={c.hour} $highlight $positive={c.diff >= 0}>
                    {c.diff >= 0 ? '+' : ''}
                    {toComma(c.diff)}
                    {suffix}
                  </MiniTd>
                ))}
              </tr>
            )}
            {/* 前年比 */}
            {hasPrev && (
              <tr>
                <MiniTd style={{ fontWeight: 600 }}>{compLabel}比</MiniTd>
                {cols.map((c) => (
                  <MiniTd key={c.hour} $highlight $positive={(c.ratio ?? 0) >= 1}>
                    {c.ratio != null ? toPct(c.ratio) : '-'}
                  </MiniTd>
                ))}
              </tr>
            )}
            {/* 気温 */}
            {hasWeather && (
              <tr>
                <MiniTd style={{ fontWeight: 600 }}>気温</MiniTd>
                {cols.map((c) => {
                  const w = curW.get(parseInt(c.hour, 10) || 0)
                  return <MiniTd key={c.hour}>{w ? `${w.avgTemperature.toFixed(1)}°` : '-'}</MiniTd>
                })}
              </tr>
            )}
            {/* 降水量 */}
            {hasWeather && (
              <tr>
                <MiniTd style={{ fontWeight: 600 }}>降水</MiniTd>
                {cols.map((c) => {
                  const w = curW.get(parseInt(c.hour, 10) || 0)
                  return (
                    <MiniTd key={c.hour}>
                      {w
                        ? w.totalPrecipitation > 0
                          ? `${w.totalPrecipitation.toFixed(1)}mm`
                          : '-'
                        : '-'}
                    </MiniTd>
                  )
                })}
              </tr>
            )}
            {/* 前年気温 */}
            {hasPrevWeather && (
              <tr>
                <MiniTd style={{ fontWeight: 600 }}>{compLabel}気温</MiniTd>
                {cols.map((c) => {
                  const w = prevW.get(parseInt(c.hour, 10) || 0)
                  return <MiniTd key={c.hour}>{w ? `${w.avgTemperature.toFixed(1)}°` : '-'}</MiniTd>
                })}
              </tr>
            )}
          </tbody>
        </MiniTable>
      </TableWrapper>
    </>
  )
})
