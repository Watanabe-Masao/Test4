/**
 * calculateFactorDecomposition — 要因分解の計算正本
 *
 * 既存の factorDecomposition.ts（Rust bridge 経由）を内部利用し、
 * Zod 契約 + Shapley 不変条件検証を追加する。
 *
 * @see references/01-principles/authoritative-calculation-definition.md
 *
 * @responsibility R:unclassified
 */
import { decompose2, decompose3, decompose5 } from '@/domain/calculations/factorDecomposition'
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'
import {
  FactorDecompositionReadModel,
  type FactorDecompositionReadModel as FactorDecompositionReadModelType,
  type DecomposeLevel,
} from './FactorDecompositionTypes'

const SHAPLEY_TOLERANCE = 1.0

export interface DecomposeInput {
  readonly prevSales: number
  readonly curSales: number
  readonly prevCustomers: number
  readonly curCustomers: number
  readonly level: DecomposeLevel
  // 3/5要素用
  readonly prevQuantity?: number
  readonly curQuantity?: number
  // 5要素用
  readonly curCategories?: readonly CategoryQtyAmt[]
  readonly prevCategories?: readonly CategoryQtyAmt[]
}

/**
 * 要因分解の計算正本。
 *
 * Shapley 不変条件（Σ effects = Δ sales）を runtime で検証。
 */
export function calculateFactorDecomposition(
  input: DecomposeInput,
): FactorDecompositionReadModelType {
  const salesDelta = input.curSales - input.prevSales
  let effects: Record<string, number>
  let effectsSum: number
  let usedFallback = false

  if (input.level === 'two') {
    const result = decompose2(
      input.prevSales,
      input.curSales,
      input.prevCustomers,
      input.curCustomers,
    )
    effects = { custEffect: result.custEffect, ticketEffect: result.ticketEffect }
    effectsSum = result.custEffect + result.ticketEffect
  } else if (input.level === 'three') {
    const result = decompose3(
      input.prevSales,
      input.curSales,
      input.prevCustomers,
      input.curCustomers,
      input.prevQuantity ?? 0,
      input.curQuantity ?? 0,
    )
    effects = {
      custEffect: result.custEffect,
      qtyEffect: result.qtyEffect,
      pricePerItemEffect: result.pricePerItemEffect,
    }
    effectsSum = result.custEffect + result.qtyEffect + result.pricePerItemEffect
  } else {
    const result = decompose5(
      input.prevSales,
      input.curSales,
      input.prevCustomers,
      input.curCustomers,
      input.prevQuantity ?? 0,
      input.curQuantity ?? 0,
      input.curCategories ?? [],
      input.prevCategories ?? [],
    )
    if (result) {
      effects = {
        custEffect: result.custEffect,
        qtyEffect: result.qtyEffect,
        priceEffect: result.priceEffect,
        mixEffect: result.mixEffect,
      }
      effectsSum = result.custEffect + result.qtyEffect + result.priceEffect + result.mixEffect
    } else {
      // 5要素分解が成立しない場合（カテゴリデータ不足）→ 3要素にフォールバック
      usedFallback = true
      const fallback = decompose3(
        input.prevSales,
        input.curSales,
        input.prevCustomers,
        input.curCustomers,
        input.prevQuantity ?? 0,
        input.curQuantity ?? 0,
      )
      effects = {
        custEffect: fallback.custEffect,
        qtyEffect: fallback.qtyEffect,
        pricePerItemEffect: fallback.pricePerItemEffect,
      }
      effectsSum = fallback.custEffect + fallback.qtyEffect + fallback.pricePerItemEffect
    }
  }

  const invariantSatisfied = Math.abs(effectsSum - salesDelta) < SHAPLEY_TOLERANCE

  return FactorDecompositionReadModel.parse({
    level: input.level,
    prevSales: input.prevSales,
    curSales: input.curSales,
    salesDelta,
    effects,
    effectsSum,
    invariantSatisfied,
    meta: {
      usedFallback,
      authoritative: true,
      tolerance: SHAPLEY_TOLERANCE,
    },
  })
}
