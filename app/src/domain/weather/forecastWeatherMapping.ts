/**
 * 気象庁天気コード → WMO 互換コード / WeatherCategory 変換
 *
 * 気象庁の天気予報コード体系:
 *   100系 = 晴れ、200系 = 曇り、300系 = 雨、400系 = 雪
 *
 * WeatherBadge 等の既存 UI コンポーネントと共用するために
 * WMO 互換コードへ変換する。
 */
import type { WeatherCategory } from '@/domain/models/record'

/**
 * 気象庁天気コードを WMO 互換コードに変換する。
 *
 * @param jmaCode 気象庁天気コード (例: "100", "201", "302")
 * @returns WMO 互換コード (0-99)
 */
export function mapJmaWeatherCodeToWmo(jmaCode: string): number {
  const code = parseInt(jmaCode, 10)
  if (isNaN(code)) return 0

  const category = Math.floor(code / 100)

  switch (category) {
    case 1: // 100系: 晴れ
      return 1 // Mainly clear
    case 2: // 200系: 曇り
      return 3 // Overcast
    case 3: // 300系: 雨
      return 63 // Rain
    case 4: // 400系: 雪
      return 73 // Snow
    default:
      return 0 // Clear sky
  }
}

/**
 * 気象庁天気コードを WeatherCategory に変換する。
 *
 * @param jmaCode 気象庁天気コード
 * @returns WeatherCategory
 */
export function mapJmaWeatherCodeToCategory(jmaCode: string): WeatherCategory {
  const code = parseInt(jmaCode, 10)
  if (isNaN(code)) return 'other'

  const category = Math.floor(code / 100)

  switch (category) {
    case 1:
      return 'sunny'
    case 2:
      return 'cloudy'
    case 3:
      return 'rainy'
    case 4:
      return 'snowy'
    default:
      return 'other'
  }
}
