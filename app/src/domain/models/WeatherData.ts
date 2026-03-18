/**
 * 天気データ型定義
 *
 * 気象庁の実測値をドメイン型として定義する。
 * date_key (YYYY-MM-DD) を主キーとし、月跨ぎでも連続的に保持する。
 */

/** WMO Weather Code を天気カテゴリに分類 */
export type WeatherCategory = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'other'

/** 時間別天気レコード（気象庁実測値の1時間分） */
export interface HourlyWeatherRecord {
  readonly dateKey: string // YYYY-MM-DD
  readonly hour: number // 0-23
  readonly temperature: number // °C
  readonly humidity: number // %
  readonly precipitation: number // mm (1時間降水量)
  readonly windSpeed: number // km/h
  readonly weatherCode: number // WMO 互換コード（実測値から導出）
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
  readonly amedasStationId?: string // JMA 観測所番号（予報区解決・ETRN 名称マッチング用）
  readonly amedasStationName?: string // 観測所名（ETRN 名称マッチング・表示用）
  readonly forecastOfficeCode?: string // 府県予報区コード（解決済みキャッシュ）
  readonly weekAreaCode?: string // 週間予報区域コード（解決済みキャッシュ）
  readonly etrnPrecNo?: number // ETRN 府県コード（解決済みキャッシュ）
  readonly etrnBlockNo?: string // ETRN 観測所コード（解決済みキャッシュ）
  readonly etrnStationType?: 'a1' | 's1' // ETRN 観測所種別: a1=AMeDAS, s1=気象台
}

/**
 * 週間天気予報の1日分
 *
 * 気象庁 forecast API の [1] (週間予報) から抽出。
 * weatherCode は気象庁独自コード（100系=晴、200系=曇、300系=雨、400系=雪）。
 */
export interface DailyForecast {
  readonly dateKey: string // YYYY-MM-DD
  readonly weatherCode: string // 気象庁天気コード ("100", "201" 等)
  readonly pop: number | null // 降水確率 (%)
  readonly tempMin: number | null // 最低気温 °C
  readonly tempMax: number | null // 最高気温 °C
  readonly reliability: 'A' | 'B' | 'C' | null // 予報信頼度
}

/** 予報区域の解決結果 */
export interface ForecastAreaResolution {
  readonly officeCode: string // 府県予報区コード (例: "130000")
  readonly officeName: string // 府県名 (例: "東京都")
  readonly weekAreaCode: string // 週間予報区域コード
  readonly weekAreaName: string // 週間予報区域名
  readonly amedasStationId: string // 気温データ用 JMA 観測所番号
}

/** 国土地理院 住所検索API の検索結果 */
export interface GeocodingResult {
  readonly name: string
  readonly latitude: number
  readonly longitude: number
  readonly country: string
  readonly admin1?: string // 都道府県等
  readonly admin2?: string // 市区町村等
}
