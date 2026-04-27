/**
 * piValue WASM wrapper (candidate)
 *
 * WASM の Float64Array / scalar 戻り値を既存の型に変換する薄い adapter。
 * ロジック判断・比較・モード判断・フォールバックは一切含めない（bridge の責務）。
 *
 * Rust 実装 (wasm/pi-value/) の wasm-bindgen export を呼び出す。
 *
 * @contractId BIZ-012
 * @semanticClass business
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import type { PIValueInput, PIValueResult } from '@/domain/calculations/piValue'
import { getPiValueWasmExports } from './wasmEngine'

/* ── WASM export 取得 ──────────────────────────── */

function getPiValueWasm() {
  return getPiValueWasmExports()!
}

/* ── WASM 呼び出し wrapper ────────────────────── */

export function calculateQuantityPIWasm(totalQuantity: number, customers: number): number {
  const wasm = getPiValueWasm()
  return wasm.calculate_quantity_pi(totalQuantity, customers)
}

export function calculateAmountPIWasm(totalSales: number, customers: number): number {
  const wasm = getPiValueWasm()
  return wasm.calculate_amount_pi(totalSales, customers)
}

export function calculatePIValuesWasm(input: PIValueInput): PIValueResult {
  const wasm = getPiValueWasm()
  const arr = wasm.calculate_pi_values(input.totalQuantity, input.totalSales, input.customers)
  return {
    quantityPI: arr[0],
    amountPI: arr[1],
  }
}
