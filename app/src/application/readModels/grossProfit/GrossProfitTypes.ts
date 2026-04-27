/**
 * 粗利 — 計算正本の Zod 契約
 *
 * 仕入原価は「取得の正本化」（readPurchaseCost）。
 * 粗利は「計算の正本化」（calculateGrossProfit）。形が異なる。
 *
 * 4種の粗利:
 *   inventory × before_cost_inclusion = 在庫法・原価算入費前
 *   inventory × after_cost_inclusion  = 在庫法・原価算入費後
 *   estimated × before_cost_inclusion = 推定法（COGS に原価算入費内包済み）
 *   estimated × after_cost_inclusion  = 推定法（before と同値、追加控除不要）
 *
 * @see references/01-principles/gross-profit-definition.md
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

// ── 定義軸 ──

export const GrossProfitMethod = z.enum(['inventory', 'estimated'])
export type GrossProfitMethod = z.infer<typeof GrossProfitMethod>

export const InclusionMode = z.enum(['before_cost_inclusion', 'after_cost_inclusion'])
export type InclusionMode = z.infer<typeof InclusionMode>

// ── 入力契約 ──

export const GrossProfitInput = z.object({
  /** 総売上（在庫法）or コア売上（推定法） */
  sales: z.number(),
  /**
   * 仕入原価:
   *   在庫法 = PurchaseCostReadModel.grandTotalCost（3正本全部）
   *   推定法 = PurchaseCostReadModel.inventoryPurchaseCost（売上納品除外）
   */
  purchaseCost: z.number(),
  /** 期首在庫（在庫法で必須、推定法でも推定期末在庫算出に使用） */
  openingInventory: z.number().nullable().optional(),
  /** 期末在庫（在庫法で必須） */
  closingInventory: z.number().nullable().optional(),
  /** 原価算入費（在庫法の after_cost_inclusion で使用） */
  costInclusion: z.number().optional(),
  /** 計算方法 */
  method: GrossProfitMethod,
  /** 原価算入費の反映モード */
  inclusionMode: InclusionMode,
  /** 推定法固有: 売変率 */
  discountRate: z.number().optional(),
  /** 推定法固有: 値入率 */
  markupRate: z.number().optional(),
})

export type GrossProfitInput = z.infer<typeof GrossProfitInput>

// ── 出力契約 ──

export const GrossProfitResult = z.object({
  grossProfit: z.number(),
  grossProfitRate: z.number(),
  method: GrossProfitMethod,
  inclusionMode: InclusionMode,
})

export type GrossProfitResult = z.infer<typeof GrossProfitResult>

// ── メタデータ ──

export const GrossProfitMeta = z.object({
  /** 在庫法から推定法へのフォールバックが発生したか */
  usedFallback: z.boolean(),
  /** 実際に使用された計算方法 */
  source: GrossProfitMethod,
  /** 原価算入費が反映済みかどうか（監査用） */
  inclusionApplied: z.boolean(),
  /** 丸め規約 */
  rounding: z.object({
    amountMethod: z.literal('round'),
    amountPrecision: z.literal(0),
    rateMethod: z.literal('raw'),
  }),
})

export type GrossProfitMeta = z.infer<typeof GrossProfitMeta>

// ── 完全な出力型 ──

export const GrossProfitReadModel = GrossProfitResult.extend({
  meta: GrossProfitMeta,
})

export type GrossProfitReadModel = z.infer<typeof GrossProfitReadModel>
