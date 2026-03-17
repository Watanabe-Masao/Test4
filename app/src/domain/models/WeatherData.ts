/**
 * 天気データ型定義
 *
 * 気象庁 AMEDAS の実測値をドメイン型として定義する。
 * date_key (YYYY-MM-DD) を主キーとし、月跨ぎでも連続的に保持する。
 */

/** WMO Weather Code を天気カテゴリに分類 */
export type WeatherCategory = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'other'

/** 時間別天気レコード（気象庁 AMEDAS 実測値の1時間分） */
export interface HourlyWeatherRecord {
  readonly dateKey: string // YYYY-MM-DD
  readonly hour: number // 0-23
  readonly temperature: number // °C
  readonly humidity: number // %
  readonly precipitation: number // mm (1時間降水量)
  readonly windSpeed: number // km/h
  readonly weatherCode: number // WMO 互換コード（AMEDAS 実測値から導出）
  readonly sunshineDuration: number // seconds (日照時間)
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
  readonly amedasStationId?: string // 最寄り AMEDAS 観測所番号（解決済みキャッシュ）
  readonly amedasStationName?: string // 観測所名（表示用）
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
