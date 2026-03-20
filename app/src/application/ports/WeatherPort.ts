/**
 * WeatherPort — 天気データ取得の契約
 *
 * infrastructure/weather の実装詳細を隠蔽し、
 * application 層から天気 API への依存を1つのアダプタに集約する。
 */
import type {
  GeocodingResult,
  DailyWeatherSummary,
  HourlyWeatherRecord,
  DailyForecast,
} from '@/domain/models/record'

/** ETRN 観測所情報 */
export interface EtrnStation {
  readonly stationType: 'a1' | 's1'
  readonly blockNo: string
  readonly stationName: string
  readonly precNo?: number
}

/** 都道府県名マップ（コード → 名称） */
export type PrefectureNameMap = Record<string, string>

/** 予報オフィス解決結果 */
export interface ForecastOfficeResolution {
  readonly officeCode: string
  readonly officeName: string
  readonly weekAreaCode?: string
}

/** 週間予報取得結果 */
export interface WeeklyForecastResult {
  readonly forecasts: readonly DailyForecast[]
  readonly resolvedWeekAreaCode: string
}

export interface WeatherPort {
  // ── ジオコーディング ──
  searchLocation(query: string): Promise<readonly GeocodingResult[]>

  // ── ETRN 観測所 ──
  resolveEtrnStationByLocation(latitude: number, longitude: number): Promise<EtrnStation | null>
  searchStationsByPrefecture(prefectureName: string): Promise<readonly EtrnStation[]>

  // ── ETRN 気象データ ──
  fetchEtrnDailyWeather(
    precNo: number,
    blockNo: string,
    stationType: 'a1' | 's1',
    year: number,
    month: number,
  ): Promise<readonly DailyWeatherSummary[]>
  fetchEtrnHourlyRange(
    precNo: number,
    blockNo: string,
    stationType: 'a1' | 's1',
    year: number,
    month: number,
    days: readonly number[],
    onProgress?: (completed: number, total: number) => void,
  ): Promise<readonly HourlyWeatherRecord[]>

  // ── 週間天気予報 ──
  resolveForecastOfficeByLocation(
    latitude: number,
    longitude: number,
  ): Promise<ForecastOfficeResolution | null>
  fetchWeeklyForecast(officeCode: string, weekAreaCode?: string): Promise<WeeklyForecastResult>

  // ── 定数 ──
  readonly PREFECTURE_NAMES: PrefectureNameMap
}
