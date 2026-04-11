/**
 * pi-value-wasm 型付きモック（candidate: BIZ-012）
 *
 * Rust WASM モジュールの API サーフェスを模倣する。
 * 3 関数すべてを TS ドメイン関数へのパススルーで実装。
 */
import {
  calculateQuantityPI as calculateQuantityPITS,
  calculateAmountPI as calculateAmountPITS,
  calculatePIValues as calculatePIValuesTS,
} from '@/domain/calculations/piValue'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function calculate_quantity_pi(totalQuantity: number, customers: number): number {
  return calculateQuantityPITS(totalQuantity, customers)
}

export function calculate_amount_pi(totalSales: number, customers: number): number {
  return calculateAmountPITS(totalSales, customers)
}

/** Returns Float64Array [quantityPI, amountPI] */
export function calculate_pi_values(
  totalQuantity: number,
  totalSales: number,
  customers: number,
): Float64Array {
  const result = calculatePIValuesTS({ totalQuantity, totalSales, customers })
  const arr = new Float64Array(2)
  arr[0] = result.quantityPI
  arr[1] = result.amountPI
  return arr
}
