/**
 * Explanation / Evidence 型定義
 *
 * 計算結果の「説明責任」を担うデータモデル。
 * 各指標（MetricId）に対して:
 * - 式の透明化（formula）
 * - 入力の追跡（inputs）
 * - 根拠参照（evidenceRefs）
 * を構造化データとして保持する。
 *
 * ドメイン層のモデルとして定義するが、ロジックは含まない。
 * Explanation の生成はアプリケーション層（ExplanationService）が担う。
 */

// ─── MetricId ─────────────────────────────────────────────

/** 追跡対象の指標ID */
export type MetricId =
  | 'salesTotal'
  | 'coreSales'
  | 'grossSales'
  | 'purchaseCost'
  | 'inventoryCost'
  | 'deliverySalesCost'
  | 'discountTotal'
  | 'discountRate'
  | 'discountLossCost'
  | 'averageMarkupRate'
  | 'coreMarkupRate'
  | 'invMethodCogs'
  | 'invMethodGrossProfit'
  | 'invMethodGrossProfitRate'
  | 'estMethodCogs'
  | 'estMethodMargin'
  | 'estMethodMarginRate'
  | 'estMethodClosingInventory'
  | 'totalCustomers'
  | 'totalConsumable'
  | 'budget'
  | 'budgetAchievementRate'
  | 'budgetProgressRate'
  | 'projectedSales'
  | 'remainingBudget'

// ─── Unit ─────────────────────────────────────────────────

/** 値の単位 */
export type MetricUnit = 'yen' | 'rate' | 'count'

// ─── EvidenceRef ──────────────────────────────────────────

/** 根拠参照: どの入力データがこの指標に寄与したか */
export type EvidenceRef =
  | {
      readonly kind: 'daily'
      readonly dataType:
        | 'classifiedSales'
        | 'purchase'
        | 'flowers'
        | 'directProduce'
        | 'interStoreIn'
        | 'interStoreOut'
        | 'consumables'
      readonly storeId: string
      readonly day: number
    }
  | {
      readonly kind: 'aggregate'
      readonly dataType: 'categoryTimeSales' | 'budget' | 'settings'
      readonly storeId: string
      readonly day?: number
      readonly categoryId?: string
    }

// ─── ExplanationInput ─────────────────────────────────────

/** Explanation の入力パラメータ */
export interface ExplanationInput {
  readonly name: string
  /** 入力自体が指標なら、そのリンク先 */
  readonly metric?: MetricId
  readonly value: number
  readonly unit: MetricUnit
}

// ─── Breakdown ────────────────────────────────────────────

/** 日別内訳の詳細行（取引先別・移動種別 etc.） */
export interface BreakdownDetail {
  readonly label: string
  readonly value: number
  readonly unit: MetricUnit
}

/** 日別内訳エントリ */
export interface BreakdownEntry {
  readonly day: number
  readonly value: number
  readonly label?: string
  /** 日クリック時に展開する詳細（取引先別・カテゴリ別等） */
  readonly details?: readonly BreakdownDetail[]
}

// ─── Explanation ──────────────────────────────────────────

/** 指標の説明 */
export interface Explanation {
  readonly metric: MetricId
  readonly title: string
  /** 計算式（人間可読な文字列） */
  readonly formula: string
  /** 計算結果 */
  readonly value: number
  readonly unit: MetricUnit
  /** どの範囲の値か */
  readonly scope: {
    readonly storeId: string
    readonly year: number
    readonly month: number
  }
  /** 計算への入力パラメータ */
  readonly inputs: readonly ExplanationInput[]
  /** 日別内訳（ドリルダウン用） */
  readonly breakdown?: readonly BreakdownEntry[]
  /** 根拠データへの参照 */
  readonly evidenceRefs: readonly EvidenceRef[]
}

// ─── StoreExplanations ────────────────────────────────────

/** 店舗ごとの全指標説明 */
export type StoreExplanations = ReadonlyMap<MetricId, Explanation>
