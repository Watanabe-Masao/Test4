/**
 * TimeSlotComparisonTable — 時間帯別比較テーブル（横軸=時間帯）
 *
 * グラフと見方を合わせ、横軸に時間帯、縦軸に当年/前年/差分/前年比を表示。
 * gridLeft / gridRight でチャートのプロットエリアと列位置を揃える。
 *
 * 天気情報はグラフ直下に TimeSlotWeatherTable として独立配置。
 * @responsibility R:chart-view
 */
import { useMemo, memo } from 'react'
import { toPct, useCurrencyFormat } from './chartTheme'
import { MiniTable, MiniTh, MiniTd } from './TimeSlotSalesChart.styles'

type MetricToggle = 'amount' | 'quantity'

interface ChartRow {
  readonly [key: string]: string | number | null
}

/** 時間帯別天気の表示モデル（weatherCode は domain で解決済み） */
export interface WeatherHourlyDisplay {
  readonly hour: number
  readonly avgTemperature: number
  readonly totalPrecipitation: number
  /** domain 層で変換済みのアイコン文字。null = データなし */
  readonly icon: string | null
  /** domain 層で変換済みのラベル（"晴れ" 等）。null = データなし */
  readonly label: string | null
  /** ツールチップに表示する天気詳細テキスト（午前/午後サマリ等） */
  readonly tooltip?: string
}

interface Props {
  readonly chartData: readonly ChartRow[]
  readonly curLabel: string
  readonly compLabel: string
  readonly hasPrev: boolean
  readonly metric?: MetricToggle
  readonly gridLeft?: number
  readonly gridRight?: number
}

export interface ColData {
  readonly hour: string
  readonly current: number
  readonly prev: number
  readonly diff: number
  readonly ratio: number | null
}

export function buildCols(
  data: readonly ChartRow[],
  metric: MetricToggle,
  hasPrev: boolean,
): ColData[] {
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

export function weatherByHour(
  data: readonly WeatherHourlyDisplay[] | undefined,
): ReadonlyMap<number, WeatherHourlyDisplay> {
  if (!data) return new Map()
  return new Map(data.map((w) => [w.hour, w]))
}

export const TimeSlotComparisonTable = memo(function TimeSlotComparisonTable({
  chartData,
  curLabel,
  compLabel,
  hasPrev,
  metric: metricProp,
  gridLeft = 55,
  gridRight = 45,
}: Props) {
  const metric = metricProp ?? 'amount'
  const isAmount = metric === 'amount'
  const cf = useCurrencyFormat()

  const cols = useMemo(() => buildCols(chartData, metric, hasPrev), [chartData, metric, hasPrev])

  const fmtVal = isAmount
    ? (v: number) => cf.formatWithUnit(v)
    : (v: number) => `${v.toLocaleString()}点`

  const fmtDiff = isAmount
    ? (v: number) => `${v >= 0 ? '+' : ''}${cf.formatWithUnit(v)}`
    : (v: number) => `${v >= 0 ? '+' : ''}${v.toLocaleString()}点`

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <MiniTable style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: gridLeft }} />
            {cols.map((c) => (
              <col key={c.hour} />
            ))}
            {/* 右マージン分のダミー列 */}
            <col style={{ width: gridRight }} />
          </colgroup>
          <thead>
            <tr>
              <MiniTh style={{ textAlign: 'left' }}></MiniTh>
              {cols.map((c) => (
                <MiniTh key={c.hour}>{c.hour}時</MiniTh>
              ))}
              <MiniTh></MiniTh>
            </tr>
          </thead>
          <tbody>
            {/* 当年 */}
            <tr>
              <MiniTd style={{ fontWeight: 600, textAlign: 'left' }}>{curLabel}</MiniTd>
              {cols.map((c) => (
                <MiniTd key={c.hour}>{fmtVal(c.current)}</MiniTd>
              ))}
              <MiniTd></MiniTd>
            </tr>
            {/* 前年 */}
            {hasPrev && (
              <tr>
                <MiniTd style={{ fontWeight: 600, textAlign: 'left' }}>{compLabel}</MiniTd>
                {cols.map((c) => (
                  <MiniTd key={c.hour}>{fmtVal(c.prev)}</MiniTd>
                ))}
                <MiniTd></MiniTd>
              </tr>
            )}
            {/* 差分 */}
            {hasPrev && (
              <tr>
                <MiniTd style={{ fontWeight: 600, textAlign: 'left' }}>差分</MiniTd>
                {cols.map((c) => (
                  <MiniTd key={c.hour} $highlight $positive={c.diff >= 0}>
                    {fmtDiff(c.diff)}
                  </MiniTd>
                ))}
                <MiniTd></MiniTd>
              </tr>
            )}
            {/* 前年比 */}
            {hasPrev && (
              <tr>
                <MiniTd style={{ fontWeight: 600, textAlign: 'left' }}>{compLabel}比</MiniTd>
                {cols.map((c) => (
                  <MiniTd key={c.hour} $highlight $positive={(c.ratio ?? 0) >= 1}>
                    {c.ratio != null ? toPct(c.ratio) : '-'}
                  </MiniTd>
                ))}
                <MiniTd></MiniTd>
              </tr>
            )}
          </tbody>
        </MiniTable>
      </div>
    </>
  )
})

// ── 天気アイコンテーブル（グラフ直下に配置） ──

interface WeatherTableProps {
  readonly hours: readonly string[]
  readonly curLabel?: string
  readonly compLabel: string
  readonly hasPrev: boolean
  readonly curWeather?: readonly WeatherHourlyDisplay[]
  readonly prevWeather?: readonly WeatherHourlyDisplay[]
  readonly gridLeft?: number
  readonly gridRight?: number
}

export const TimeSlotWeatherTable = memo(function TimeSlotWeatherTable({
  hours,
  compLabel,
  hasPrev,
  curWeather,
  prevWeather,
  gridLeft = 55,
  gridRight = 45,
}: WeatherTableProps) {
  const curW = useMemo(() => weatherByHour(curWeather), [curWeather])
  const prevW = useMemo(() => weatherByHour(prevWeather), [prevWeather])
  const hasWeather = curW.size > 0
  const hasPrevWeather = hasWeather && hasPrev && prevW.size > 0

  const hasIcons = useMemo(() => curWeather?.some((w) => w.icon != null) ?? false, [curWeather])
  const hasPrevIcons = useMemo(
    () => prevWeather?.some((w) => w.icon != null) ?? false,
    [prevWeather],
  )

  if (!hasWeather || !hasIcons) return null

  return (
    <div style={{ overflowX: 'auto' }}>
      <MiniTable style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: gridLeft }} />
          {hours.map((h) => (
            <col key={h} />
          ))}
          <col style={{ width: gridRight }} />
        </colgroup>
        <tbody>
          {/* 天気アイコン（当年） */}
          <tr>
            <MiniTd style={{ fontWeight: 600, textAlign: 'left' }}>天気</MiniTd>
            {hours.map((h) => {
              const w = curW.get(parseInt(h, 10) || 0)
              return (
                <MiniTd
                  key={h}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    cursor: w?.tooltip ? 'help' : undefined,
                  }}
                  title={w?.tooltip}
                >
                  {w?.icon ?? ''}
                </MiniTd>
              )
            })}
            <MiniTd></MiniTd>
          </tr>
          {/* 前年天気アイコン */}
          {hasPrevWeather && hasPrevIcons && (
            <tr>
              <MiniTd style={{ fontWeight: 600, textAlign: 'left' }}>{compLabel}天気</MiniTd>
              {hours.map((h) => {
                const w = prevW.get(parseInt(h, 10) || 0)
                return (
                  <MiniTd
                    key={h}
                    style={{
                      textAlign: 'center',
                      fontSize: '0.8rem',
                      cursor: w?.tooltip ? 'help' : undefined,
                    }}
                    title={w?.tooltip}
                  >
                    {w?.icon ?? ''}
                  </MiniTd>
                )
              })}
              <MiniTd></MiniTd>
            </tr>
          )}
        </tbody>
      </MiniTable>
    </div>
  )
})
