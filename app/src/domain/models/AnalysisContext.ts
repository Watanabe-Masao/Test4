/**
 * AnalysisContext — 分析コンテキスト型定義
 *
 * 全ページ共通の「分析の視点」を表現する。
 * ページではなくコンテキストが分析の主役（設計原則2）。
 */

/** 分析の時間粒度 */
export type AnalysisGranularity = 'daily' | 'weekly' | 'monthly'

/** データ系統トグル（実績/推定の明示的切り替え） */
export type DataLineage = 'actual' | 'estimated'

/**
 * 比較期間の種別
 * - yoy: 前年同期
 * - prevMonth: 前月
 * - prevWeek: 前週
 * - custom: 任意期間
 */
export type ComparisonType = 'yoy' | 'prevMonth' | 'prevWeek' | 'custom'

/** 分析コンテキスト: 全ページ共通のフィルタ + 表示条件 */
export interface AnalysisContext {
  /** 対象期間 */
  readonly period: {
    readonly year: number
    readonly month: number
    /** 月内の日付範囲（省略時は月全体） */
    readonly startDay?: number
    readonly endDay?: number
  }

  /** 比較期間（省略時は比較なし） */
  readonly comparison?: {
    readonly type: ComparisonType
    /** custom の場合のみ指定 */
    readonly year?: number
    readonly month?: number
  }

  /** 時間粒度 */
  readonly granularity: AnalysisGranularity

  /** 対象店舗ID群（空 = 全店） */
  readonly storeIds: ReadonlySet<string>

  /** カテゴリ階層フィルタ（省略時はフィルタなし） */
  readonly categoryFilter?: string

  /** 部門フィルタ（省略時はフィルタなし） */
  readonly departmentFilter?: string

  /** データ系統（実績 or 推定） */
  readonly dataLineage: DataLineage
}

/**
 * DrillType — ドリルダウン操作の3タイプ（設計原則3）
 *
 * A: 絞り込み — 同一ページ内でフィルタ追加
 * B: 明細遷移 — 詳細ページへパラメータ付きナビゲーション
 * C: 比較遷移 — 比較・要因分解セクションへナビゲーション
 */
export type DrillType = 'filter' | 'detail' | 'compare'

/** ドリルダウンアクションの定義 */
export interface DrillAction {
  readonly type: DrillType

  /** A: filter — 追加するフィルタ条件 */
  readonly filter?: {
    readonly key: string
    readonly value: string
  }

  /** B: detail — 遷移先ページとパラメータ */
  readonly navigate?: {
    readonly view: string
    readonly params?: Record<string, string>
  }

  /** C: compare — 比較セクションとパラメータ */
  readonly compare?: {
    readonly view: string
    readonly tab?: string
    readonly params?: Record<string, string>
  }
}
