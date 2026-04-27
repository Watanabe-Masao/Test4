/**
 * 天気データ取得用の代表店舗ID選択フック
 *
 * 選択中の店舗のうち、位置情報（storeLocations）が設定されている
 * 最初の店舗を天気データの取得対象として返す。
 *
 * useUnifiedWidgetContext から分離した天気サブシステム。
 *
 * @responsibility R:unclassified
 */
import { useMemo } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'

/**
 * 天気データ取得用の代表店舗IDを決定する。
 *
 * `useWeatherData` は `storeLocations[storeId]` が無い場合に早期 return するため、
 * ここで location を持たない店舗を fallback として返すと fetch が永遠に走らない。
 * location がある店舗が 1 つも無ければ空文字列を返し、呼び出し側でガードする。
 *
 * @param selectedStoreIds 選択中の店舗IDセット（空 = 全店舗）
 * @param stores 全店舗マップ（キーが店舗ID）
 * @returns 位置情報を持つ最初の店舗ID。該当なしは空文字列。
 */
export function useWeatherStoreId(
  selectedStoreIds: ReadonlySet<string>,
  stores: ReadonlyMap<string, unknown>,
): string {
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  return useMemo(() => {
    const ids = selectedStoreIds.size > 0 ? [...selectedStoreIds] : [...stores.keys()]
    return ids.find((id) => storeLocations[id]) ?? ''
  }, [selectedStoreIds, stores, storeLocations])
}
