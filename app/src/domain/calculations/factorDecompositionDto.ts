/**
 * factorDecomposition FFI 契約型
 *
 * Rust/WASM 境界を越える入出力の shape を型レベルで固定する。
 * type 定義のみ。変換関数・validation・runtime helper は含めない。
 *
 * レスポンス型は factorDecomposition.ts の既存型を再利用する。
 *
 * @responsibility R:unclassified
 */
import type {
  CategoryQtyAmt,
  TwoFactorResult,
  ThreeFactorResult,
  FiveFactorResult,
  PriceMixResult,
} from './factorDecomposition'

/* ── Request 型 ─────────────────────────────────── */

export interface Decompose2Request {
  readonly prevSales: number
  readonly curSales: number
  readonly prevCust: number
  readonly curCust: number
}

export interface Decompose3Request {
  readonly prevSales: number
  readonly curSales: number
  readonly prevCust: number
  readonly curCust: number
  readonly prevTotalQty: number
  readonly curTotalQty: number
}

export interface DecomposePriceMixRequest {
  readonly curCategories: readonly CategoryQtyAmt[]
  readonly prevCategories: readonly CategoryQtyAmt[]
}

export interface Decompose5Request {
  readonly prevSales: number
  readonly curSales: number
  readonly prevCust: number
  readonly curCust: number
  readonly prevTotalQty: number
  readonly curTotalQty: number
  readonly curCategories: readonly CategoryQtyAmt[]
  readonly prevCategories: readonly CategoryQtyAmt[]
}

/* ── Response 型（既存型の re-export）──────────── */

export type { TwoFactorResult, ThreeFactorResult, FiveFactorResult, PriceMixResult }
