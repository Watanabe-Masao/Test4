import { calculationCache } from '@/application/services/calculationCache'
import { useUiStore } from '@/application/stores/uiStore'

/**
 * store 更新後の共通副作用: キャッシュ破棄 + UI 再計算トリガー
 *
 * R2 対策: この2行パターンが 7ファイル 12箇所に散在していたため集約。
 * 副作用チェーンを1箇所に閉じることで、変更時の影響範囲を限定する。
 */
export function invalidateAfterStateChange(): void {
  calculationCache.clear()
  useUiStore.getState().invalidateCalculation()
}
