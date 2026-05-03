/**
 * 要因分解 — 計算正本の Zod 契約
 *
 * シャープリー値ベースの売上要因分解。
 * 不変条件: Σ effects = Δ sales（Shapley 効率性公理）
 *
 * Rust crate (factor-decomposition) が authoritative 計算を担う。
 * この契約は「正しい計算結果を正しい意味で使う」ことを保証する。
 *
 * @see references/01-foundation/authoritative-calculation-definition.md
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

export const DecomposeLevel = z.enum(['two', 'three', 'five'])
export type DecomposeLevel = z.infer<typeof DecomposeLevel>

// ── 2要素分解 ──

export const TwoFactorResultSchema = z.object({
  custEffect: z.number(),
  ticketEffect: z.number(),
})

// ── 3要素分解 ──

export const ThreeFactorResultSchema = z.object({
  custEffect: z.number(),
  qtyEffect: z.number(),
  pricePerItemEffect: z.number(),
})

// ── 5要素分解 ──

export const FiveFactorResultSchema = z.object({
  custEffect: z.number(),
  qtyEffect: z.number(),
  priceEffect: z.number(),
  mixEffect: z.number(),
})

// ── 統合 ReadModel ──

export const FactorDecompositionReadModel = z.object({
  level: DecomposeLevel,
  /** 前期売上 */
  prevSales: z.number(),
  /** 当期売上 */
  curSales: z.number(),
  /** 売上差 = curSales - prevSales */
  salesDelta: z.number(),
  /** 分解結果（level に応じて 2/3/5 要素） */
  effects: z.record(z.string(), z.number()),
  /** Σ effects（salesDelta と一致すべき） */
  effectsSum: z.number(),
  /** 不変条件: |effectsSum - salesDelta| < tolerance */
  invariantSatisfied: z.boolean(),
  meta: z.object({
    /** フォールバックが発生したか（JS fallback 使用時に true） */
    usedFallback: z.boolean(),
    /** Rust authoritative 計算を使用したか */
    authoritative: z.boolean(),
    tolerance: z.number(),
  }),
})

export type FactorDecompositionReadModel = z.infer<typeof FactorDecompositionReadModel>
