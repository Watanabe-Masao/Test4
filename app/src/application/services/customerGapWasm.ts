/**
 * customerGap WASM wrapper (candidate)
 * @contractId BIZ-013
 * @semanticClass business
 * @authorityKind candidate-authoritative
 *
 * @responsibility R:unclassified
 */
import type { CustomerGapInput, CustomerGapResult } from '@/domain/calculations/customerGap'
import { getCustomerGapWasmExports } from './wasmEngine'

function getWasm() {
  return getCustomerGapWasmExports()!
}

export function calculateCustomerGapWasm(input: CustomerGapInput): CustomerGapResult | null {
  const wasm = getWasm()
  const arr = wasm.calculate_customer_gap(
    input.curCustomers,
    input.prevCustomers,
    input.curQuantity,
    input.prevQuantity,
    input.curSales,
    input.prevSales,
  )
  if (arr[0] === 1.0) return null
  return {
    customerYoY: arr[1],
    quantityYoY: arr[2],
    salesYoY: arr[3],
    quantityCustomerGap: arr[4],
    amountCustomerGap: arr[5],
  }
}
