/**
 * WeatherSummarySection — 天気サマリー表示（テーブルレイアウト）
 *
 * カードの auto-fill グリッドだとウィンドウ幅で崩れるため、
 * 固定列のテーブル風レイアウトで当年+前年を上下配置。
 */
import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import type { WeatherSummaryResult } from './weatherSummary'

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀',
  cloudy: '☁',
  rainy: '☂',
  snowy: '❄',
  other: '—',
}

// ── Styled ──

const Wrapper = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  display: flex;
  align-items: center;
  gap: 6px;
`

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  flex-wrap: wrap;
`

const Cell = styled.div<{ $accent?: string; $muted?: boolean }>`
  flex: 1 1 0;
  min-width: 100px;
  max-width: 200px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  border-top: 3px solid ${({ $accent }) => $accent ?? 'transparent'};
  text-align: center;
  ${({ $muted }) => ($muted ? 'opacity: 0.65;' : '')}
`

const Value = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.2;
`

const Unit = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 400;
  opacity: 0.6;
`

const Caption = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 2px;
`

const Diff = styled.span<{ $positive?: boolean }>`
  color: ${({ $positive }) => ($positive ? sc.positive : sc.negative)};
  font-weight: 600;
`

// ── Data ──

interface MetricDef {
  label: string
  accent: string
  value: (s: WeatherSummaryResult) => number
  unit: string
  format?: (n: number) => string
}

const METRICS: readonly MetricDef[] = [
  { label: '平均気温', accent: '#f59e0b', value: (s) => s.avgTemp, unit: '°C' },
  { label: '最高気温', accent: '#ef4444', value: (s) => s.maxTemp, unit: '°C' },
  { label: '最低気温', accent: '#3b82f6', value: (s) => s.minTemp, unit: '°C' },
  { label: '降水量', accent: '#3b82f6', value: (s) => s.totalPrecip, unit: 'mm' },
  { label: '日照時間', accent: '#f59e0b', value: (s) => s.sunshineHours, unit: 'h' },
]

export function fmt(n: number): string {
  return n.toFixed(1)
}

export function diffStr(cur: number, prev: number): string {
  const d = cur - prev
  return d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1)
}

// ── Component ──

interface Props {
  readonly summary: WeatherSummaryResult
  readonly prevSummary?: WeatherSummaryResult | null
  readonly label: string
}

export function WeatherSummarySection({ summary, prevSummary, label }: Props) {
  const icon = summary.weatherCategory ? (WEATHER_ICONS[summary.weatherCategory] ?? '') : '📊'

  return (
    <Wrapper>
      <Label>
        {icon} {label}
        {summary.weatherText && (
          <span style={{ fontWeight: 400, opacity: 0.7 }}>{summary.weatherText}</span>
        )}
      </Label>

      {/* 当年 */}
      <Row>
        {METRICS.map((m) => (
          <Cell key={m.label} $accent={m.accent}>
            <Value>
              {fmt(m.value(summary))}
              <Unit>{m.unit}</Unit>
            </Value>
            <Caption>{m.label}</Caption>
          </Cell>
        ))}
        {summary.totalDays > 1 ? (
          <Cell $accent="#10b981">
            <Value>
              {summary.sunnyDays}
              <Unit> / {summary.totalDays}日</Unit>
            </Value>
            <Caption>
              ☀{summary.sunnyDays} ☁{summary.cloudyDays} ☂{summary.rainyDays}
            </Caption>
          </Cell>
        ) : (
          <Cell $accent="#10b981">
            <Value>
              {summary.avgHumidity.toFixed(0)}
              <Unit>%</Unit>
            </Value>
            <Caption>湿度</Caption>
          </Cell>
        )}
      </Row>

      {/* 前年 */}
      {prevSummary && (
        <>
          <Label style={{ opacity: 0.5, fontSize: '0.7rem', marginTop: 4 }}>📊 前年</Label>
          <Row>
            {METRICS.map((m) => {
              const cur = m.value(summary)
              const prev = m.value(prevSummary)
              const diff = diffStr(cur, prev)
              return (
                <Cell key={m.label} $accent={m.accent} $muted>
                  <Value>
                    {fmt(prev)}
                    <Unit>{m.unit}</Unit>
                  </Value>
                  <Caption>
                    {m.label} <Diff $positive={cur >= prev}>({diff})</Diff>
                  </Caption>
                </Cell>
              )
            })}
            {prevSummary.totalDays > 1 && (
              <Cell $accent="#10b981" $muted>
                <Value>
                  {prevSummary.sunnyDays}
                  <Unit> / {prevSummary.totalDays}日</Unit>
                </Value>
                <Caption>
                  ☀{prevSummary.sunnyDays} ☁{prevSummary.cloudyDays} ☂{prevSummary.rainyDays}
                </Caption>
              </Cell>
            )}
          </Row>
        </>
      )}
    </Wrapper>
  )
}
