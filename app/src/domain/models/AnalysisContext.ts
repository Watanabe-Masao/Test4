/**
 * AnalysisContext — ドリルダウン型定義
 *
 * 設計原則3「ドリルは3種類に固定」の型定義。
 */

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
