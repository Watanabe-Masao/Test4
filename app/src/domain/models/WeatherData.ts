/**
 * 天気データ型定義
 *
 * Open-Meteo API から取得した天気データのドメイン型。
 * date_key (YYYY-MM-DD) を主キーとし、月跨ぎでも連続的に保持する。
 */

/** WMO Weather Code を天気カテゴリに分類 */
export type WeatherCategory = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'other'

/** 時間別天気レコード（Open-Meteo Historical/Forecast API の1時間分） */
export interface HourlyWeatherRecord {
  readonly dateKey: string // YYYY-MM-DD
  readonly hour: number // 0-23
  readonly temperature: number // °C (temperature_2m)
  readonly humidity: number // % (relative_humidity_2m)
  readonly precipitation: number // mm (precipitation)
  readonly windSpeed: number // km/h (wind_speed_10m)
  readonly weatherCode: number // WMO weather interpretation code
  readonly sunshineDuration: number // seconds (sunshine_duration)
}

/**
 * 日別天気サマリ（時間別から集約）
 *
 * domain/calculations/weatherAggregation.ts の純粋関数で導出する。
 * UI 表示・相関分析の入力として使用。
 */
export interface DailyWeatherSummary {
  readonly dateKey: string
  readonly temperatureAvg: number // 日平均気温 °C
  readonly temperatureMax: number // 日最高気温 °C
  readonly temperatureMin: number // 日最低気温 °C
  readonly precipitationTotal: number // 日合計降水量 mm
  readonly humidityAvg: number // 日平均湿度 %
  readonly windSpeedMax: number // 日最大風速 km/h
  readonly dominantWeatherCode: number // 最頻出の WMO コード
  readonly sunshineTotalHours: number // 日照時間合計 hours
}

/** 店舗の位置情報（ジオコーディング結果） */
export interface StoreLocation {
  readonly latitude: number
  readonly longitude: number
  readonly resolvedName?: string // ジオコーディングで解決された地名（確認用）
}

/** Open-Meteo Geocoding API の検索結果 */
export interface GeocodingResult {
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  readonly country: string
  readonly admin1?: string // 都道府県等
  readonly admin2?: string // 市区町村等
}
