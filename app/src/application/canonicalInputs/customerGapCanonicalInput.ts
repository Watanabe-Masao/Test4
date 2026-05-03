/**
 * 客数GAP の canonical input builder
 *
 * 当期・前年の SalesFactReadModel + CustomerFactReadModel から
 * 客数GAP 計算に必要な入力を構築する。
 *
 * @see references/01-foundation/canonical-input-sets.md
 * @see references/01-foundation/customer-gap-definition.md
 *
 * @responsibility R:unclassified
 */
import {
  calculateCustomerGap,
  type CustomerGapInput,
  type CustomerGapResult,
} from '@/domain/calculations/customerGap'
import type { SalesFactReadModel } from '@/application/readModels/salesFact'
import type { CustomerFactReadModel } from '@/application/readModels/customerFact'

/**
 * 客数GAP の canonical input を構築し、domain 計算を実行する
 *
 * 入力の粒度合わせ（grandTotal レベル）を行い、
 * calculateCustomerGap に渡す。
 */
export function buildAndCalculateCustomerGap(
  curSalesFact: SalesFactReadModel,
  prevSalesFact: SalesFactReadModel,
  curCustomerFact: CustomerFactReadModel,
  prevCustomerFact: CustomerFactReadModel,
): CustomerGapResult | null {
  const input: CustomerGapInput = {
    curCustomers: curCustomerFact.grandTotalCustomers,
    prevCustomers: prevCustomerFact.grandTotalCustomers,
    curQuantity: curSalesFact.grandTotalQuantity,
    prevQuantity: prevSalesFact.grandTotalQuantity,
    curSales: curSalesFact.grandTotalAmount,
    prevSales: prevSalesFact.grandTotalAmount,
  }
  return calculateCustomerGap(input)
}

/**
 * 個別の CustomerGapInput を構築する（domain 計算は呼び出し元で実行）
 *
 * store 粒度や comparison window 粒度で使用する場合はこちらを使い、
 * 呼び出し元で calculateCustomerGap() を呼ぶ。
 */
export function buildCustomerGapCanonicalInput(
  curSales: number,
  prevSales: number,
  curQuantity: number,
  prevQuantity: number,
  curCustomers: number,
  prevCustomers: number,
): CustomerGapInput {
  return { curCustomers, prevCustomers, curQuantity, prevQuantity, curSales, prevSales }
}
