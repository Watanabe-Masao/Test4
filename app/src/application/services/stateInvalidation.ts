/**
 * @responsibility R:unclassified
 */

import { useUiStore } from '@/application/stores/uiStore'

/**
 * store 更新後の共通副作用: UI 再計算トリガー
 *
 * R2 対策: この副作用パターンが複数ファイルに散在していたため集約。
 * 副作用チェーンを1箇所に閉じることで、変更時の影響範囲を限定する。
 *
 * dataVersion ベースのキャッシュでは、version 変更で自動的に
 * 古いキャッシュにヒットしなくなるため、明示的な clear() は不要。
 */
export function invalidateAfterStateChange(): void {
  useUiStore.getState().invalidateCalculation()
}
