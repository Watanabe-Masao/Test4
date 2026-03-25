/**
 * 天気データ取得用の代表店舗ID選択フック
 *
 * 選択中の店舗のうち、位置情報（storeLocations）が設定されている
 * 最初の店舗を天気データの取得対象として返す。
 *
 * useUnifiedWidgetContext から分離した天気サブシステム。
 */
import { useMemo } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'

/**
 * 天気データ取得用の代表店舗IDを決定する。
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
    return ids.find((id) => storeLocations[id]) ?? ids[0] ?? ''
  }, [selectedStoreIds, stores, storeLocations])
}
