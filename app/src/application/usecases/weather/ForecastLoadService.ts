/**
 * 週間天気予報データ取得オーケストレーション
 *
 * AMEDAS 観測所 ID → 予報区域コード解決 → Forecast API 取得
 * の一連の流れを調停する。
 *
 * 予報データはキャッシュしない（毎回最新を取得する）。
 * 予報区域コード（officeCode, weekAreaCode）のみ StoreLocation にキャッシュ可能。
 */
import type { StoreLocation, DailyForecast, ForecastAreaResolution } from '@/domain/models'
import {
  findNearestStation,
  resolveForcastArea,
  fetchWeeklyForecast,
} from '@/infrastructure/weather'

/**
 * 店舗の位置情報から週間天気予報を取得する。
 *
 * 1. AMEDAS 観測所を解決（StoreLocation にキャッシュ済みなら skip）
 * 2. 予報区域コードを解決（StoreLocation にキャッシュ済みなら skip）
 * 3. Forecast API で週間予報を取得
 *
 * @param location 店舗の位置情報
 * @returns { forecasts, resolution } — 予報データと解決結果
 */
export async function loadForecastForStore(location: StoreLocation): Promise<{
  readonly forecasts: readonly DailyForecast[]
  readonly resolution: ForecastAreaResolution | null
}> {
  // 1. AMEDAS 観測所 ID を確保
  let stationId = location.amedasStationId
  if (!stationId) {
    const station = await findNearestStation(location.latitude, location.longitude)
    if (!station) {
      return { forecasts: [], resolution: null }
    }
    stationId = station.stationId
  }

  // 2. 予報区域コードを解決
  let officeCode = location.forecastOfficeCode
  let weekAreaCode = location.weekAreaCode

  let resolution: ForecastAreaResolution | null = null

  if (officeCode && weekAreaCode) {
    // キャッシュ済み — resolution は簡易構築
    resolution = {
      officeCode,
      officeName: '',
      weekAreaCode,
      weekAreaName: '',
      amedasStationId: stationId,
    }
  } else {
    // 3つの JMA JSON マスタから自動解決
    resolution = await resolveForcastArea(stationId)
    if (!resolution) {
      return { forecasts: [], resolution: null }
    }
    officeCode = resolution.officeCode
    weekAreaCode = resolution.weekAreaCode
  }

  // 3. 週間天気予報を取得
  const forecasts = await fetchWeeklyForecast(officeCode, weekAreaCode, stationId)

  return { forecasts, resolution }
}
