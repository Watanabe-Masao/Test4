/**
 * StoreDaySummary: 参照用結合済みレコード（マテリアライズドビュー）
 *
 * 複数ファイル由来のデータを店舗×日で事前結合した参照用レコード。
 * ソースデータ（StoreDayIndex群）は分離を維持し、このサマリーは
 * 読み取り高速化のためのキャッシュとして保持する。
 *
 * ソースデータから常に再生成可能。
 *
 * 設計原則:
 * - JSON シリアライズ可能（Map/Set を使わない）
 * - フラットな数値フィールド（ネストは最小限）
 * - 詳細明細（supplierBreakdown, transferBreakdown）は含めない
 *   → 必要時にソースデータから取得する
 * - 売変内訳（discountEntries）は配列だが要素数固定（4種）のため含める
 */

import type { DiscountEntry } from './DiscountEntry'

/** 店舗×日の結合済みサマリーレコード */
export interface StoreDaySummary {
  // ── 識別 ──
  readonly day: number // 1-31

  // ── 売上系 (classifiedSales 由来) ──
  readonly sales: number
  readonly coreSales: number
  readonly grossSales: number
  readonly discountAmount: number
  readonly discountAbsolute: number
  readonly discountEntries: readonly DiscountEntry[]

  // ── 仕入系 (purchase 由来) ──
  readonly purchaseCost: number
  readonly purchasePrice: number

  // ── 移動系 (interStoreIn/Out 由来) ──
  readonly interStoreInCost: number
  readonly interStoreInPrice: number
  readonly interStoreOutCost: number
  readonly interStoreOutPrice: number
  readonly interDeptInCost: number
  readonly interDeptInPrice: number
  readonly interDeptOutCost: number
  readonly interDeptOutPrice: number

  // ── 納品売上 (flowers + directProduce 由来) ──
  readonly flowersCost: number
  readonly flowersPrice: number
  readonly directProduceCost: number
  readonly directProducePrice: number

  // ── 消耗品 (costInclusions 由来) ──
  readonly costInclusionCost: number

  // ── 客数 (flowers 由来) ──
  readonly customers: number
}

/**
 * StoreDaySummaryIndex: 店舗別×日別のサマリーインデックス。
 * storeId → day → StoreDaySummary の2重インデックスで O(1) アクセス。
 */
export type StoreDaySummaryIndex = {
  readonly [storeId: string]: {
    readonly [day: number]: StoreDaySummary
  }
}

/**
 * StoreDaySummaryCache: サマリーとソースデータの紐付け。
 * fingerprint がソースデータのハッシュと一致する場合のみキャッシュ有効。
 */
export interface StoreDaySummaryCache {
  /** ソースデータ（ImportedData + settings）の MurmurHash3 フィンガープリント */
  readonly sourceFingerprint: string
  /** 生成日時（ISO 8601） */
  readonly builtAt: string
  /** 店舗×日のサマリーインデックス */
  readonly summaries: StoreDaySummaryIndex
}
