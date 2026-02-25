/**
 * 分類別時間帯売上のインデックス構造
 *
 * 生の `CategoryTimeSalesRecord[]` 配列を、検索・集約しやすい構造に変換したもの。
 * データインポート時に1回だけ構築し、UIフィルタ操作のたびに生配列を走査することを避ける。
 *
 * ## アクセスパターン
 *
 * 全チャート用フックは以下の順でフィルタを適用する:
 * 1. 日付範囲（DateRange）→ dateKey ('YYYY-MM-DD') でルックアップ
 * 2. 店舗選択 → storeId でルックアップ
 * 3. 分類階層（部門/ライン/クラス）→ レコード内のコードで等値フィルタ
 * 4. 時間帯集約 → timeSlots を合算
 *
 * このインデックスは (storeId, dateKey) を複合キーとして O(1) アクセスを提供する。
 *
 * ## 月をまたぐクエリのサポート
 *
 * dateKey は 'YYYY-MM-DD' 形式の ISO 8601 文字列（例: '2026-02-03'）なので、
 * 辞書順比較が日付順と一致する。
 * `{ from: {2026,1,20}, to: {2026,2,10} }` のような月またぎ範囲も
 * `fromKey <= dateKey <= toKey` の辞書順比較で検索可能。
 *
 * 当年・前年のデータを同一インデックスに格納し、DateRange で期間を指定して
 * クエリすることで、前年比・同曜日比較・任意期間比較が自然に動作する。
 */
import type { CategoryTimeSalesRecord } from './DataTypes'
import type { DateKey } from './CalendarDate'

/**
 * storeId × dateKey ('YYYY-MM-DD') でインデックス化された分類別時間帯売上データ。
 *
 * 階層フィルタ（部門/ライン/クラス）は事前適用せず、レコード単位で保持する。
 * 理由: ユーザーがドリルダウンを切り替えるたびにインデックスを再構築するのは
 * パフォーマンス上不利なため、フィルタは hooks 側で動的に適用する。
 */
export interface CategoryTimeSalesIndex {
  /** storeId → dateKey ('YYYY-MM-DD') → その店舗×日のレコード群 */
  readonly byStoreDate: ReadonlyMap<string, ReadonlyMap<DateKey, readonly CategoryTimeSalesRecord[]>>
  /** データに含まれる全店舗ID */
  readonly storeIds: ReadonlySet<string>
  /** データに含まれる全 dateKey ('YYYY-MM-DD') */
  readonly allDateKeys: ReadonlySet<DateKey>
  /** 総レコード数 */
  readonly recordCount: number
}

/** 空のインデックス */
export const EMPTY_CTS_INDEX: CategoryTimeSalesIndex = {
  byStoreDate: new Map(),
  storeIds: new Set(),
  allDateKeys: new Set(),
  recordCount: 0,
}
