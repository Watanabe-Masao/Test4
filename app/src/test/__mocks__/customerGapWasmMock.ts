/**
 * customer-gap-wasm 型付きモック（candidate: BIZ-013）
 */
import { calculateCustomerGap } from '@/domain/calculations/customerGap'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function calculate_customer_gap(
  curCustomers: number,
  prevCustomers: number,
  curQuantity: number,
  prevQuantity: number,
  curSales: number,
  prevSales: number,
): Float64Array {
  const result = calculateCustomerGap({
    curCustomers,
    prevCustomers,
    curQuantity,
    prevQuantity,
    curSales,
    prevSales,
  })
  const arr = new Float64Array(6)
  if (result === null) {
    arr[0] = 1.0
  } else {
    arr[0] = 0.0
    arr[1] = result.customerYoY
    arr[2] = result.quantityYoY
    arr[3] = result.salesYoY
    arr[4] = result.quantityCustomerGap
    arr[5] = result.amountCustomerGap
  }
  return arr
}
