/**
 * AnalysisFrame fingerprint — cache key 用の安定ハッシュ
 *
 * AnalysisFrame の内容から一意のキーを生成する。
 * storeIds の順序差で別物扱いにならないよう、sort して hash する。
 *
 * 将来の free-period cache はこの fingerprint をキーにする。
 */
import type { FreePeriodAnalysisFrame } from './AnalysisFrame'
import type { CalendarDate } from './CalendarDate'

function dateStr(d: CalendarDate): string {
  return `${d.year}-${d.month}-${d.day}`
}

/**
 * FreePeriodAnalysisFrame から安定な cache key 文字列を生成する。
 *
 * 含まれる要素:
 * - anchorRange (from/to)
 * - storeIds (sorted)
 * - granularity
 * - comparison の effectivePeriod2 + alignmentMode (or 'none')
 */
export function computeAnalysisFrameKey(frame: FreePeriodAnalysisFrame): string {
  const range = `${dateStr(frame.anchorRange.from)}~${dateStr(frame.anchorRange.to)}`
  const stores = [...frame.storeIds].sort().join(',') || '*'
  const gran = frame.granularity

  let comp = 'none'
  if (frame.comparison) {
    const ep2 = frame.comparison.effectivePeriod2
    comp = `${frame.comparison.alignmentMode}:${dateStr(ep2.from)}~${dateStr(ep2.to)}:dow${frame.comparison.dowOffset}`
  }

  return `fp:${range}:${stores}:${gran}:${comp}`
}
