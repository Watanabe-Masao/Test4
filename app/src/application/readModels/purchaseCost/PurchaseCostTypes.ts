/**
 * 仕入原価 — 複合正本の Zod 契約
 *
 * 3つの独立正本（通常仕入・売上納品・移動原価）を組み合わせて
 * 総仕入原価を構成する。各正本は独立に管理され、用途に応じて組み合わせる:
 *
 *   在庫法:   通常仕入 + 売上納品 + 移動原価（3つ全部）
 *   推定法:   通常仕入 + 移動原価（売上納品を除外）
 *   仕入分析: 通常仕入 + 売上納品 + 移動原価（3つ全部）
 *
 * 正本定義の根拠: references/01-principles/purchase-cost-definition.md
 *
 * parse 方針:
 *   正本 read model 生成時は DEV/PROD とも .parse() — fail fast
 *   周辺 I/O は .safeParse() + ログ可
 */
import { z } from 'zod'

// ── 入力契約 ──

export const PurchaseCostQueryInput = z.object({
  dateFrom: z.string(), // 'YYYY-MM-DD'
  dateTo: z.string(),
  storeIds: z.array(z.string()).optional(),
})

export type PurchaseCostQueryInput = z.infer<typeof PurchaseCostQueryInput>

// ── 日別×帳合先行（通常仕入の最小粒度） ──

export const PurchaseDaySupplierRow = z.object({
  day: z.number(),
  supplierCode: z.string(),
  cost: z.number(),
  price: z.number(),
})

export type PurchaseDaySupplierRow = z.infer<typeof PurchaseDaySupplierRow>

// ── 日別×種別行（売上納品・移動原価の最小粒度） ──

export const CategoryDayRow = z.object({
  day: z.number(),
  categoryKey: z.string(), // 'flowers' | 'directProduce' | 'interStoreIn' | etc.
  cost: z.number(),
  price: z.number(),
})

export type CategoryDayRow = z.infer<typeof CategoryDayRow>

// ── 3つの独立正本 ──

/** 通常仕入正本: 帳合先別 × 日 */
export const PurchaseCanonical = z.object({
  rows: z.array(PurchaseDaySupplierRow),
  totalCost: z.number(),
  totalPrice: z.number(),
})

export type PurchaseCanonical = z.infer<typeof PurchaseCanonical>

/** 売上納品正本: 花・産直 × 日 */
export const DeliverySalesCanonical = z.object({
  rows: z.array(CategoryDayRow),
  totalCost: z.number(),
  totalPrice: z.number(),
})

export type DeliverySalesCanonical = z.infer<typeof DeliverySalesCanonical>

/** 移動原価正本: 店間IN/OUT・部門間IN/OUT × 日 */
export const TransfersCanonical = z.object({
  rows: z.array(CategoryDayRow),
  totalCost: z.number(),
  totalPrice: z.number(),
})

export type TransfersCanonical = z.infer<typeof TransfersCanonical>

// ── 複合正本（ReadModel） ──

export const PurchaseCostReadModel = z.object({
  /** 通常仕入正本 */
  purchase: PurchaseCanonical,
  /** 売上納品正本（花・産直） */
  deliverySales: DeliverySalesCanonical,
  /** 移動原価正本（全方向: IN + OUT） */
  transfers: TransfersCanonical,

  /** 総仕入原価 = purchase + deliverySales + transfers（在庫法・仕入分析共通） */
  grandTotalCost: z.number(),
  grandTotalPrice: z.number(),

  /** 期中仕入原価 = purchase + transfers（推定法用 — 売上納品を除外） */
  inventoryPurchaseCost: z.number(),
  inventoryPurchasePrice: z.number(),

  /** メタデータ */
  meta: z.object({
    /** 欠損日数（監査用） */
    missingDayCount: z.number(),
    /** DuckDB dataVersion */
    dataVersion: z.number(),
  }),
})

export type PurchaseCostReadModel = z.infer<typeof PurchaseCostReadModel>
