/**
 * computeMovingAverage — 日次系列の移動平均を計算する純粋関数
 *
 * DuckDB / React / QueryHandler を知らない。
 * DailySeriesPoint と同形の入力を受け取り、trailing window の移動平均を返す。
 *
 * @guard A2 Domain は純粋（副作用なし）
 *
 * @responsibility R:unclassified
 */

import { z } from 'zod'

// ─── Zod Schemas ─────────────────────────────────────

export const MovingAveragePointSchema = z.object({
  value: z.number().nullable(),
  status: z.enum(['ok', 'missing']),
})
export type MovingAveragePoint = z.infer<typeof MovingAveragePointSchema>

export const MovingAverageMissingnessPolicySchema = z.enum(['strict', 'partial'])
export type MovingAverageMissingnessPolicy = z.infer<typeof MovingAverageMissingnessPolicySchema>

/**
 * 日次系列の trailing 移動平均を計算する。
 *
 * - strict: 窓内に missing が1件でも → value=null, status='missing'
 * - partial: 窓内の ok 値のみで平均。全 missing → null
 * - windowSize=1: ok 値はそのまま返る
 *
 * 入力 series は requiredRange の全日を含む前提。
 * anchorRange への切り戻しは handler 側の責務。
 * @calc-id CALC-024
 */
export function computeMovingAverage(
  series: readonly MovingAveragePoint[],
  windowSize: number,
  policy: MovingAverageMissingnessPolicy,
): readonly MovingAveragePoint[] {
  return series.map((_current, index) => {
    const windowStart = Math.max(0, index - windowSize + 1)
    const windowSlice = series.slice(windowStart, index + 1)

    if (windowSlice.length < windowSize) {
      return { value: null, status: 'missing' as const }
    }

    const okValues = windowSlice.filter((p) => p.status === 'ok' && p.value !== null)

    if (policy === 'strict') {
      if (okValues.length < windowSize) {
        return { value: null, status: 'missing' as const }
      }
      const sum = okValues.reduce((acc, p) => acc + p.value!, 0)
      return { value: sum / windowSize, status: 'ok' as const }
    }

    if (okValues.length === 0) {
      return { value: null, status: 'missing' as const }
    }
    const sum = okValues.reduce((acc, p) => acc + p.value!, 0)
    return { value: sum / okValues.length, status: 'ok' as const }
  })
}
