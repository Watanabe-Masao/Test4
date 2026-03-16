/**
 * Open-Meteo Historical / Forecast Weather API クライアント
 *
 * 指定した緯度経度・日付範囲の時間別天気データを取得する。
 * API キー不要・CORS 対応・無料（非商用）。
 *
 * @see https://open-meteo.com/en/docs/historical-weather-api
 * @see https://open-meteo.com/en/docs
 */
import type { HourlyWeatherRecord } from '@/domain/models'

const HISTORICAL_API_BASE = 'https://archive-api.open-meteo.com/v1/archive'
const FORECAST_API_BASE = 'https://api.open-meteo.com/v1/forecast'

/** 取得する時間別変数 */
const HOURLY_VARIABLES = [
  'temperature_2m',
  'relative_humidity_2m',
  'precipitation',
  'wind_speed_10m',
  'weather_code',
  'sunshine_duration',
].join(',')

const TIMEZONE = 'Asia/Tokyo'
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000

/**
 * 過去の天気データを日付範囲で取得する。
 *
 * @param latitude 緯度
 * @param longitude 経度
 * @param startDate 開始日（YYYY-MM-DD）
 * @param endDate 終了日（YYYY-MM-DD）
 * @returns 時間別天気レコードの配列
 */
export async function fetchHistoricalWeather(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
): Promise<readonly HourlyWeatherRecord[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    hourly: HOURLY_VARIABLES,
    timezone: TIMEZONE,
  })

  const data = await fetchWithRetry(`${HISTORICAL_API_BASE}?${params}`)
  return parseHourlyResponse(data)
}

/**
 * 天気予報データを取得する（7日先まで）。
 *
 * @param latitude 緯度
 * @param longitude 経度
 * @returns 時間別天気レコードの配列
 */
export async function fetchForecastWeather(
  latitude: number,
  longitude: number,
): Promise<readonly HourlyWeatherRecord[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY_VARIABLES,
    timezone: TIMEZONE,
  })

  const data = await fetchWithRetry(`${FORECAST_API_BASE}?${params}`)
  return parseHourlyResponse(data)
}

// ─── Internal ────────────────────────────────────────

/** Open-Meteo API レスポンスの hourly 部分 */
interface OpenMeteoHourlyResponse {
  readonly hourly?: {
    readonly time?: readonly string[]
    readonly temperature_2m?: readonly (number | null)[]
    readonly relative_humidity_2m?: readonly (number | null)[]
    readonly precipitation?: readonly (number | null)[]
    readonly wind_speed_10m?: readonly (number | null)[]
    readonly weather_code?: readonly (number | null)[]
    readonly sunshine_duration?: readonly (number | null)[]
  }
}

function parseHourlyResponse(data: OpenMeteoHourlyResponse): readonly HourlyWeatherRecord[] {
  const h = data.hourly
  if (!h?.time) return []

  const records: HourlyWeatherRecord[] = []
  for (let i = 0; i < h.time.length; i++) {
    const iso = h.time[i] // "2025-03-15T14:00"
    const dateKey = iso.slice(0, 10) // "2025-03-15"
    const hour = parseInt(iso.slice(11, 13), 10) // 14

    records.push({
      dateKey,
      hour,
      temperature: h.temperature_2m?.[i] ?? 0,
      humidity: h.relative_humidity_2m?.[i] ?? 0,
      precipitation: h.precipitation?.[i] ?? 0,
      windSpeed: h.wind_speed_10m?.[i] ?? 0,
      weatherCode: h.weather_code?.[i] ?? 0,
      sunshineDuration: h.sunshine_duration?.[i] ?? 0,
    })
  }

  return records
}

async function fetchWithRetry(url: string): Promise<OpenMeteoHourlyResponse> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`)
      }
      return (await response.json()) as OpenMeteoHourlyResponse
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY_MS * 2 ** attempt
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError ?? new Error('Open-Meteo API request failed')
}
