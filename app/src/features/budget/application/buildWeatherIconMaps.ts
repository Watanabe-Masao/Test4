/**
 * buildWeatherIconMaps — 日別天気サマリ配列から day → 絵文字 の Map を構築
 *
 * DrillCalendar / DayCalendarCell から天気アイコンを直接引けるようにするための
 * pure helper。`dateKey` (YYYY-MM-DD) から day 部分を抽出して day 番号をキーにする。
 *
 * - 当年: ctx.weatherDaily (対象月) をそのまま map 化
 * - 前年: ctx.prevYearWeatherDaily (前年同月) は day をそのまま当年の day に対応付ける
 *   (sameDate alignment 前提)。sameDow の厳密対応は将来拡張 — 当面は day 位置で
 *   簡略マッチする
 *
 * @responsibility R:transform
 */
import type { DailyWeatherSummary } from '@/domain/models/WeatherData'
import { toWeatherDisplay } from '@/domain/weather/weatherAggregation'

export interface WeatherIconMaps {
  /** 当年の day → 絵文字 */
  readonly current: ReadonlyMap<number, string>
  /** 前年の day → 絵文字 (sameDate alignment 前提) */
  readonly prevYear: ReadonlyMap<number, string>
}

const EMPTY: WeatherIconMaps = {
  current: new Map(),
  prevYear: new Map(),
}

function parseDayFromDateKey(dateKey: string): number | null {
  // "YYYY-MM-DD" の末尾 2 桁を day として取得
  const parts = dateKey.split('-')
  if (parts.length !== 3) return null
  const d = Number(parts[2])
  return Number.isFinite(d) && d >= 1 && d <= 31 ? d : null
}

function toMap(summaries: readonly DailyWeatherSummary[] | undefined): ReadonlyMap<number, string> {
  if (!summaries || summaries.length === 0) return new Map()
  const map = new Map<number, string>()
  for (const s of summaries) {
    const day = parseDayFromDateKey(s.dateKey)
    if (day == null) continue
    const info = toWeatherDisplay(s.dominantWeatherCode)
    if (info) map.set(day, info.icon)
  }
  return map
}

export function buildWeatherIconMaps(
  weatherDaily: readonly DailyWeatherSummary[] | undefined,
  prevYearWeatherDaily: readonly DailyWeatherSummary[] | undefined,
): WeatherIconMaps {
  if (
    (!weatherDaily || weatherDaily.length === 0) &&
    (!prevYearWeatherDaily || prevYearWeatherDaily.length === 0)
  ) {
    return EMPTY
  }
  return {
    current: toMap(weatherDaily),
    prevYear: toMap(prevYearWeatherDaily),
  }
}
