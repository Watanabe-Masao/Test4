/**
 * WeatherPort — 天気データ取得の契約
 *
 * 消費者（WeatherLoadService 等）が使いたい抽象を定義する。
 * infrastructure の API シグネチャ（precNo/blockNo 等の低レベル引数）は
 * アダプタ内に閉じ込め、ポートは EtrnStation 単位の操作を提供する。
 *
 * domain 型のみに依存し、infrastructure への依存は持たない。
 */
import type {
  GeocodingResult,
  DailyWeatherSummary,
  HourlyWeatherRecord,
  DailyForecast,
} from '@/domain/models/record'

/** ETRN 観測所情報（ドメイン型） */
export interface EtrnStation {
  readonly stationType: 'a1' | 's1'
  readonly blockNo: string
  readonly stationName: string
  readonly precNo?: number
}

/** ETRN 静的観測所エントリ（都道府県・座標付き） */
export interface EtrnStationEntry {
  readonly precNo: number
  readonly blockNo: string
  readonly name: string
  readonly prefecture: string
  readonly lat: readonly [number, number]
  readonly lon: readonly [number, number]
}

/** 都道府県名マップ（コード → 名称） */
export type PrefectureNameMap = Readonly<Record<string, string>>

/** 予報オフィス解決結果 */
export interface ForecastOfficeResolution {
  readonly officeCode: string
  readonly officeName: string
  readonly weekAreaCode?: string
}

/** 時間帯データ取得の進捗コールバック */
export type HourlyProgressCallback = (completed: number, total: number) => void

export interface WeatherPort {
  // ── ジオコーディング ──
  searchLocation(query: string): Promise<readonly GeocodingResult[]>

  // ── ETRN 観測所 ──
  resolveEtrnStationByLocation(latitude: number, longitude: number): Promise<EtrnStation | null>
  /** 静的リストから全 s1 観測所を取得する */
  getStaticStationList(): readonly EtrnStationEntry[]

  // ── ETRN 気象データ（EtrnStation 単位の操作） ──
  /** 観測所の月別日次天気データを取得する */
  fetchDailyWeather(
    station: EtrnStation,
    year: number,
    month: number,
  ): Promise<readonly DailyWeatherSummary[]>
  /** 観測所の月別時間帯天気データを取得する（指定日のみ） */
  fetchHourlyRange(
    station: EtrnStation,
    year: number,
    month: number,
    days: readonly number[],
    onProgress?: HourlyProgressCallback,
  ): Promise<readonly HourlyWeatherRecord[]>

  // ── 週間天気予報 ──
  resolveForecastOfficeByLocation(
    latitude: number,
    longitude: number,
  ): Promise<ForecastOfficeResolution | null>
  /** 週間天気予報を取得する */
  fetchWeeklyForecast(
    officeCode: string,
    weekAreaCode?: string,
  ): Promise<{
    readonly forecasts: readonly DailyForecast[]
    readonly resolvedWeekAreaCode: string
  }>

  // ── 定数 ──
  readonly PREFECTURE_NAMES: PrefectureNameMap
}
