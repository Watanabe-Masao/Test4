/**
 * WeatherSummarySection — 月間/日別サマリー表示（当年+前年の上下2段）
 *
 * 当年の値を上段、前年の値を下段に配置してレイアウト崩れを防止。
 * 差分表示（+/-）付き。
 */
import type { WeatherSummaryResult } from './weatherSummary'
import {
  SectionLabel,
  SummaryGrid,
  SummaryCard,
  SummaryValue,
  SummaryUnit,
  SummaryCaption,
} from './WeatherPage.styles'

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}
const staggerItem = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
}

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀',
  cloudy: '☁',
  rainy: '☂',
  snowy: '❄',
  other: '—',
}

interface SummaryItemDef {
  readonly label: string
  readonly accent: string
  readonly cur: (s: WeatherSummaryResult) => string
  readonly unit: string
  readonly prev?: (s: WeatherSummaryResult) => string
  readonly diff?: (cur: WeatherSummaryResult, prev: WeatherSummaryResult) => string
}

const ITEMS: readonly SummaryItemDef[] = [
  {
    label: '平均気温',
    accent: '#f59e0b',
    cur: (s) => s.avgTemp.toFixed(1),
    unit: '°C',
    prev: (s) => s.avgTemp.toFixed(1),
    diff: (c, p) => {
      const d = c.avgTemp - p.avgTemp
      return d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1)
    },
  },
  {
    label: '最高気温',
    accent: '#ef4444',
    cur: (s) => s.maxTemp.toFixed(1),
    unit: '°C',
    prev: (s) => s.maxTemp.toFixed(1),
  },
  {
    label: '最低気温',
    accent: '#3b82f6',
    cur: (s) => s.minTemp.toFixed(1),
    unit: '°C',
    prev: (s) => s.minTemp.toFixed(1),
  },
  {
    label: '降水量',
    accent: '#3b82f6',
    cur: (s) => s.totalPrecip.toFixed(1),
    unit: 'mm',
    prev: (s) => s.totalPrecip.toFixed(1),
  },
  {
    label: '日照時間',
    accent: '#f59e0b',
    cur: (s) => s.sunshineHours.toFixed(1),
    unit: 'h',
    prev: (s) => s.sunshineHours.toFixed(1),
  },
]

interface Props {
  readonly summary: WeatherSummaryResult
  readonly prevSummary?: WeatherSummaryResult | null
  readonly label: string
}

export function WeatherSummarySection({ summary, prevSummary, label }: Props) {
  const icon = summary.weatherCategory ? (WEATHER_ICONS[summary.weatherCategory] ?? '') : '📊'

  return (
    <>
      <SectionLabel>
        {icon} {label}
        {summary.weatherText && (
          <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>
            {summary.weatherText}
          </span>
        )}
      </SectionLabel>

      {/* 当年 */}
      <SummaryGrid variants={staggerContainer} initial="initial" animate="animate">
        {ITEMS.map((item) => (
          <SummaryCard key={item.label} variants={staggerItem} $accent={item.accent}>
            <SummaryValue>
              {item.cur(summary)}
              <SummaryUnit>{item.unit}</SummaryUnit>
            </SummaryValue>
            <SummaryCaption>{item.label}</SummaryCaption>
          </SummaryCard>
        ))}
        {summary.totalDays > 1 ? (
          <SummaryCard variants={staggerItem} $accent="#10b981">
            <SummaryValue>
              {summary.sunnyDays}
              <SummaryUnit> / {summary.totalDays}日</SummaryUnit>
            </SummaryValue>
            <SummaryCaption>
              ☀{summary.sunnyDays} ☁{summary.cloudyDays} ☂{summary.rainyDays}
            </SummaryCaption>
          </SummaryCard>
        ) : (
          <SummaryCard variants={staggerItem} $accent="#10b981">
            <SummaryValue>
              {summary.avgHumidity.toFixed(0)}
              <SummaryUnit>%</SummaryUnit>
            </SummaryValue>
            <SummaryCaption>湿度</SummaryCaption>
          </SummaryCard>
        )}
      </SummaryGrid>

      {/* 前年（ある場合のみ） */}
      {prevSummary && (
        <>
          <SectionLabel style={{ opacity: 0.6, fontSize: '0.7rem' }}>📊 前年同月</SectionLabel>
          <SummaryGrid variants={staggerContainer} initial="initial" animate="animate">
            {ITEMS.map((item) => {
              const diffText = item.diff ? item.diff(summary, prevSummary) : null
              return (
                <SummaryCard
                  key={item.label}
                  variants={staggerItem}
                  $accent={item.accent}
                  style={{ opacity: 0.7 }}
                >
                  <SummaryValue style={{ fontSize: '1rem' }}>
                    {item.prev?.(prevSummary) ?? '—'}
                    <SummaryUnit>{item.unit}</SummaryUnit>
                  </SummaryValue>
                  <SummaryCaption>
                    {item.label}
                    {diffText && (
                      <span
                        style={{
                          marginLeft: 4,
                          color: diffText.startsWith('+') ? '#10b981' : '#ef4444',
                        }}
                      >
                        ({diffText})
                      </span>
                    )}
                  </SummaryCaption>
                </SummaryCard>
              )
            })}
            {prevSummary.totalDays > 1 && (
              <SummaryCard variants={staggerItem} $accent="#10b981" style={{ opacity: 0.7 }}>
                <SummaryValue style={{ fontSize: '1rem' }}>
                  {prevSummary.sunnyDays}
                  <SummaryUnit> / {prevSummary.totalDays}日</SummaryUnit>
                </SummaryValue>
                <SummaryCaption>
                  ☀{prevSummary.sunnyDays} ☁{prevSummary.cloudyDays} ☂{prevSummary.rainyDays}
                </SummaryCaption>
              </SummaryCard>
            )}
          </SummaryGrid>
        </>
      )}
    </>
  )
}
