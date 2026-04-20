/**
 * ConditionMatrixTable — pure display helpers
 *
 * マトリクスセルの色分け判定・率表示・方向アイコンの 3 関数。
 * React 非依存の pure。component 側は JSX 組み立てのみに集中する（C4 準拠）。
 *
 * @responsibility R:transform
 */
import { palette } from '@/presentation/theme/tokens'
import { formatPercent } from '@/domain/formatting'
import type { MatrixCell, TrendDirection } from '@/application/queries/advanced'

/**
 * ratio 値に応じた警告色を返す。
 * - `ratio >= 1.02` → positive（+2% 超）
 * - `0.98 <= ratio < 1.02` → undefined（中立帯）
 * - `ratio < 0.98` → negative
 * - `null` → undefined（未判定）
 */
export function ratioColor(ratio: number | null): string | undefined {
  if (ratio == null) return undefined
  if (ratio >= 1.02) return palette.positive
  if (ratio >= 0.98) return undefined
  return palette.negative
}

/** MatrixCell の ratio を % 表示。null は '-'。 */
export function formatRatio(c: MatrixCell): string {
  if (c.ratio == null) return '-'
  return formatPercent(c.ratio)
}

/** TrendDirection → 矢印アイコン */
export function directionArrow(dir: TrendDirection): string {
  if (dir === 'up') return '↑'
  if (dir === 'down') return '↓'
  return '→'
}
