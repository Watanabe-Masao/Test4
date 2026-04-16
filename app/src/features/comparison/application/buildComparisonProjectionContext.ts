import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { ComparisonProjectionContext } from './ComparisonProjectionContext'

/**
 * PeriodSelection → ComparisonProjectionContext の唯一の構築経路。
 * @responsibility R:adapter
 *
 * features/comparison/ 内部で PeriodSelection を import するのはこのファイルだけ。
 * 他の comparison feature コードはすべて ComparisonProjectionContext 経由で
 * 必要な情報を受け取る。
 *
 * @param periodSelection UI state から取得した期間選択
 * @returns projection で必要な最小 sub-fields のみを抽出した context
 */
export function buildComparisonProjectionContext(
  periodSelection: PeriodSelection,
): ComparisonProjectionContext {
  return {
    basisYear: periodSelection.period1.from.year,
    basisMonth: periodSelection.period1.from.month,
    period2: periodSelection.period2,
  }
}
