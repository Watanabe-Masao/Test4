/**
 * moving-average-wasm 型付きモック（candidate: ANA-009）
 */
import { computeMovingAverage } from '@/domain/calculations/temporal/computeMovingAverage'
import type { MovingAverageMissingnessPolicy } from '@/domain/calculations/temporal/computeMovingAverage'

export default function init(): Promise<void> {
  return Promise.resolve()
}

const POLICY_REVERSE: Record<number, MovingAverageMissingnessPolicy> = {
  0: 'strict',
  1: 'partial',
}

export function compute_moving_average(
  values: Float64Array,
  statuses: Uint8Array,
  windowSize: number,
  policy: number,
): Float64Array {
  const series = Array.from(values).map((v, i) => ({
    value: Number.isNaN(v) ? null : v,
    status: (statuses[i] === 0 ? 'ok' : 'missing') as 'ok' | 'missing',
  }))
  const result = computeMovingAverage(series, windowSize, POLICY_REVERSE[policy] ?? 'strict')
  const arr = new Float64Array(result.length * 2)
  for (let i = 0; i < result.length; i++) {
    arr[i * 2] = result[i].value ?? NaN
    arr[i * 2 + 1] = result[i].status === 'ok' ? 0 : 1
  }
  return arr
}
