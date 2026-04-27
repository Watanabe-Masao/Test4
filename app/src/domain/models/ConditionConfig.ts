/**
 * コンディションサマリー設定の型定義
 *
 * 3層構造で閾値を解決する:
 *   1. メトリクスレジストリ（デフォルト値、コード内定義）
 *   2. グローバル設定（ユーザーが全店共通で変更）
 *   3. 店舗別オーバーライド（ユーザーが店舗ごとに変更）
 *
 * 解決順序: store override > global config > registry default
 *
 * @responsibility R:unclassified
 */

/** 閾値セット（青・黄・赤の3段階） */
export interface ThresholdSet {
  readonly blue: number
  readonly yellow: number
  readonly red: number
}

/** 閾値の方向: 高い方が良い or 低い方が良い */
export type ThresholdDirection = 'higher_better' | 'lower_better'

/** 閾値の単位 */
export type ThresholdUnit = 'pt' | 'pct' | 'yen' | 'ratio'

/** コンディションメトリクスID */
export type ConditionMetricId =
  | 'sales'
  | 'gp'
  | 'gpRate'
  | 'markupRate'
  | 'discountRate'
  | 'costInclusion'
  | 'salesYoY'
  | 'customerYoY'
  | 'txValue'
  | 'itemsYoY'
  | 'totalCost'
  | 'requiredPace'
  | 'dailySales'
  | 'qtyCustomerGap'
  | 'amtCustomerGap'

/** メトリクスレジストリエントリ（コード内定義、不変） */
export interface ConditionMetricDef {
  readonly id: ConditionMetricId
  readonly label: string
  readonly direction: ThresholdDirection
  readonly unit: ThresholdUnit
  readonly defaults: ThresholdSet
  /** 閾値入力時の表示倍率（例: pt → ×100 で表示） */
  readonly displayMultiplier: number
  /** 閾値入力時のステップ */
  readonly inputStep: number
  /** 閾値入力時の単位ラベル */
  readonly inputUnit: string
  /** 前年データ必須か */
  readonly requiresPrevYear?: boolean
}

/** ユーザーが変更可能な部分（Partial で保存） */
export interface ConditionMetricUserConfig {
  readonly enabled?: boolean
  readonly thresholds?: Partial<ThresholdSet>
}

/** コンディションサマリー全体の設定 */
export interface ConditionSummaryConfig {
  /** グローバル設定（全店共通） */
  readonly global: Partial<Record<ConditionMetricId, ConditionMetricUserConfig>>
  /** 店舗別オーバーライド（storeId → メトリクスID → 設定） */
  readonly storeOverrides: Partial<
    Record<string, Partial<Record<ConditionMetricId, ConditionMetricUserConfig>>>
  >
}

/** 解決済みの閾値（resolveConditionConfig の出力） */
export interface ResolvedConditionMetric {
  readonly id: ConditionMetricId
  readonly label: string
  readonly direction: ThresholdDirection
  readonly unit: ThresholdUnit
  readonly thresholds: ThresholdSet
  readonly enabled: boolean
}
