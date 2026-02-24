/**
 * 分類別時間帯売上のインデックス構造
 *
 * 生の `CategoryTimeSalesRecord[]` 配列を、検索・集約しやすい構造に変換したもの。
 * データインポート時に1回だけ構築し、UIフィルタ操作のたびに生配列を走査することを避ける。
 *
 * ## アクセスパターン
 *
 * 全チャートコンポーネントは以下の順でフィルタを適用する:
 * 1. 日付範囲（スライダー）→ day でルックアップ
 * 2. 店舗選択 → storeId でルックアップ
 * 3. 分類階層（部門/ライン/クラス）→ レコード内のコードで等値フィルタ
 * 4. 時間帯集約 → timeSlots を合算
 *
 * このインデックスは (storeId, day) を複合キーとして O(1) アクセスを提供する。
 */
import type { CategoryTimeSalesRecord } from './DataTypes'

/**
 * storeId × day でインデックス化された分類別時間帯売上データ。
 *
 * 階層フィルタ（部門/ライン/クラス）は事前適用せず、レコード単位で保持する。
 * 理由: ユーザーがドリルダウンを切り替えるたびにインデックスを再構築するのは
 * パフォーマンス上不利なため、フィルタは hooks 側で動的に適用する。
 */
export interface CategoryTimeSalesIndex {
  /** storeId → day → その店舗×日のレコード群 */
  readonly byStoreDay: ReadonlyMap<string, ReadonlyMap<number, readonly CategoryTimeSalesRecord[]>>
  /** データに含まれる全店舗ID */
  readonly storeIds: ReadonlySet<string>
  /** データに含まれる全日付 */
  readonly allDays: ReadonlySet<number>
  /** 総レコード数 */
  readonly recordCount: number
}

/** 空のインデックス */
export const EMPTY_CTS_INDEX: CategoryTimeSalesIndex = {
  byStoreDay: new Map(),
  storeIds: new Set(),
  allDays: new Set(),
  recordCount: 0,
}
