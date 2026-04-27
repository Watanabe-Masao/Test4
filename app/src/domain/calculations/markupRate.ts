/**
 * 値入率（マークアップ率）計算
 *
 * 正式な業務確定値を導出する Authoritative 関数。
 * 全仕入（仕入 + 売上納品 + 移動）から全体値入率と、
 * コア仕入（仕入 + 移動、売上納品除く）からコア値入率を計算する。
 *
 * 値入率 = (売価 - 原価) / 売価
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'
import { safeDivide } from './utils'

/** 値入率計算の入力 */
export interface MarkupRateInput {
  /** 仕入売価合計 */
  readonly purchasePrice: number
  /** 仕入原価合計 */
  readonly purchaseCost: number
  /** 売上納品売価合計（花 + 産直） */
  readonly deliveryPrice: number
  /** 売上納品原価合計（花 + 産直） */
  readonly deliveryCost: number
  /** 移動売価合計（店間入出 + 部門間入出） */
  readonly transferPrice: number
  /** 移動原価合計（店間入出 + 部門間入出） */
  readonly transferCost: number
  /** デフォルト値入率（コア仕入なし時のフォールバック） */
  readonly defaultMarkupRate: number
}

export const MarkupRateInputSchema = z.object({
  purchasePrice: z.number(),
  purchaseCost: z.number(),
  deliveryPrice: z.number(),
  deliveryCost: z.number(),
  transferPrice: z.number(),
  transferCost: z.number(),
  defaultMarkupRate: z.number(),
})

/** 値入率計算の結果 */
export interface MarkupRateResult {
  /** 全体値入率（仕入 + 売上納品 + 移動） */
  readonly averageMarkupRate: number
  /** コア値入率（仕入 + 移動、売上納品除く） */
  readonly coreMarkupRate: number
}

export const MarkupRateResultSchema = z.object({
  averageMarkupRate: z.number(),
  coreMarkupRate: z.number(),
})

/**
 * 値入率を計算する
 *
 * averageMarkupRate = (allPrice - allCost) / allPrice
 *   allPrice = purchasePrice + deliveryPrice + transferPrice
 *   allCost  = purchaseCost  + deliveryCost  + transferCost
 *
 * coreMarkupRate = (corePrice - coreCost) / corePrice
 *   corePrice = purchasePrice + transferPrice
 *   coreCost  = purchaseCost  + transferCost
 */
export function calculateMarkupRates(input: MarkupRateInput): MarkupRateResult {
  const allPrice = input.purchasePrice + input.deliveryPrice + input.transferPrice
  const allCost = input.purchaseCost + input.deliveryCost + input.transferCost
  const averageMarkupRate = safeDivide(allPrice - allCost, allPrice, 0)

  const corePrice = input.purchasePrice + input.transferPrice
  const coreCost = input.purchaseCost + input.transferCost
  const coreMarkupRate = safeDivide(corePrice - coreCost, corePrice, input.defaultMarkupRate)

  return { averageMarkupRate, coreMarkupRate }
}
