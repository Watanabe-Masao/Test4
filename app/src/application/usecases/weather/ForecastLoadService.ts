/**
 * 週間天気予報データ取得オーケストレーション
 *
 * lat/lon → 逆ジオコーディング → officeCode → forecast API
 * の流れで週間天気予報を取得する。AMeDAS に非依存。
 */
import type { StoreLocation, DailyForecast, ForecastAreaResolution } from '@/domain/models'
import { resolveForecastOfficeByLocation, fetchWeeklyForecast } from '@/infrastructure/weather'

/**
 * 店舗の位置情報から週間天気予報を取得する。
 *
 * 1. officeCode を解決（StoreLocation にキャッシュ済みなら skip）
 * 2. forecast API で週間予報を取得
 */
export async function loadForecastForStore(location: StoreLocation): Promise<{
  readonly forecasts: readonly DailyForecast[]
  readonly resolution: ForecastAreaResolution | null
}> {
  let officeCode = location.forecastOfficeCode
  let officeName = ''
  let weekAreaCode = location.weekAreaCode

  // 1. officeCode を解決
  if (!officeCode) {
    const resolved = await resolveForecastOfficeByLocation(location.latitude, location.longitude)
    if (!resolved) {
      console.warn('[Weather:Forecast] officeCode 解決失敗')
      return { forecasts: [], resolution: null }
    }
    officeCode = resolved.officeCode
    officeName = resolved.officeName
  }

  // 2. 週間天気予報を取得
  console.debug(
    '[Weather:Forecast] forecast fetch: office=%s weekArea=%s',
    officeCode,
    weekAreaCode ?? '(auto)',
  )
  const result = await fetchWeeklyForecast(officeCode, weekAreaCode ?? undefined)

  // weekAreaCode が未キャッシュの場合、レスポンスから取得した値を使う
  if (!weekAreaCode && result.resolvedWeekAreaCode) {
    weekAreaCode = result.resolvedWeekAreaCode
  }

  const resolution: ForecastAreaResolution = {
    officeCode,
    officeName,
    weekAreaCode: weekAreaCode ?? '',
    weekAreaName: '',
    amedasStationId: '',
  }

  console.debug(
    '[Weather:Forecast] forecast done: office=%s weekArea=%s days=%d',
    officeCode,
    weekAreaCode,
    result.forecasts.length,
  )

  return { forecasts: result.forecasts, resolution }
}
