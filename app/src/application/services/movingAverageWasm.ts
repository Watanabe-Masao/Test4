/**
 * computeMovingAverage WASM wrapper (candidate)
 * @contractId ANA-009
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import type {
  MovingAveragePoint,
  MovingAverageMissingnessPolicy,
} from '@/domain/calculations/temporal/computeMovingAverage'
import { getMovingAverageWasmExports } from './wasmEngine'

function getWasm() {
  return getMovingAverageWasmExports()!
}

const POLICY_MAP: Record<MovingAverageMissingnessPolicy, number> = {
  strict: 0,
  partial: 1,
}

export function computeMovingAverageWasm(
  series: readonly MovingAveragePoint[],
  windowSize: number,
  policy: MovingAverageMissingnessPolicy,
): readonly MovingAveragePoint[] {
  const wasm = getWasm()

  const values = new Float64Array(series.length)
  const statuses = new Uint8Array(series.length)
  for (let i = 0; i < series.length; i++) {
    values[i] = series[i].value ?? NaN
    statuses[i] = series[i].status === 'ok' ? 0 : 1
  }

  const arr = wasm.compute_moving_average(values, statuses, windowSize, POLICY_MAP[policy])

  const result: MovingAveragePoint[] = []
  for (let i = 0; i < arr.length; i += 2) {
    const value = arr[i]
    const status = arr[i + 1]
    result.push({
      value: Number.isNaN(value) ? null : value,
      status: status === 0 ? 'ok' : 'missing',
    })
  }
  return result
}
