/**
 * 分類別時間帯売上のインデックス構造
 *
 * 生の `CategoryTimeSalesRecord[]` 配列を、検索・集約しやすい構造に変換したもの。
 * データインポート時に1回だけ構築し、UIフィルタ操作のたびに生配列を走査することを避ける。
 *
 * ## アクセスパターン
 *
 * 全チャート用フックは以下の順でフィルタを適用する:
 * 1. 日付範囲（DateRange）→ dateKey (YYYYMMDD) でルックアップ
 * 2. 店舗選択 → storeId でルックアップ
 * 3. 分類階層（部門/ライン/クラス）→ レコード内のコードで等値フィルタ
 * 4. 時間帯集約 → timeSlots を合算
 *
 * このインデックスは (storeId, dateKey) を複合キーとして O(1) アクセスを提供する。
 *
 * ## 月をまたぐクエリのサポート
 *
 * dateKey は YYYYMMDD 形式の数値（例: 20260203）なので、
 * `{ from: {2026,1,20}, to: {2026,2,10} }` のような月またぎ範囲も
 * `fromKey <= dateKey <= toKey` の単純比較で検索可能。
 *
 * 当年・前年のデータを同一インデックスに格納し、DateRange で期間を指定して
 * クエリすることで、前年比・同曜日比較・任意期間比較が自然に動作する。
 */
import type { CategoryTimeSalesRecord } from './DataTypes'
import type { DateKey } from './CalendarDate'

/**
 * storeId × dateKey (YYYYMMDD) でインデックス化された分類別時間帯売上データ。
 *
 * 階層フィルタ（部門/ライン/クラス）は事前適用せず、レコード単位で保持する。
 * 理由: ユーザーがドリルダウンを切り替えるたびにインデックスを再構築するのは
 * パフォーマンス上不利なため、フィルタは hooks 側で動的に適用する。
 */
export interface CategoryTimeSalesIndex {
  /** storeId → dateKey (YYYYMMDD) → その店舗×日のレコード群 */
  readonly byStoreDate: ReadonlyMap<string, ReadonlyMap<DateKey, readonly CategoryTimeSalesRecord[]>>
  /** データに含まれる全店舗ID */
  readonly storeIds: ReadonlySet<string>
  /** データに含まれる全 dateKey (YYYYMMDD) */
  readonly allDateKeys: ReadonlySet<DateKey>
  /** 総レコード数 */
  readonly recordCount: number

  // ── 後方互換 ──
  // 移行期間中、既存コードが byStoreDay / allDays を参照する場合があるため維持。
  // 新規コードは byStoreDate / allDateKeys を使うこと。

  /**
   * @deprecated byStoreDate を使用してください
   * storeId → day → レコード群（単一月のデータのみ有効）
   */
  readonly byStoreDay: ReadonlyMap<string, ReadonlyMap<number, readonly CategoryTimeSalesRecord[]>>
  /**
   * @deprecated allDateKeys を使用してください
   * データに含まれる全日付（day 番号のみ、月をまたぐ場合は不正確）
   */
  readonly allDays: ReadonlySet<number>
}

/** 空のインデックス */
export const EMPTY_CTS_INDEX: CategoryTimeSalesIndex = {
  byStoreDate: new Map(),
  storeIds: new Set(),
  allDateKeys: new Set(),
  recordCount: 0,
  // 後方互換
  byStoreDay: new Map(),
  allDays: new Set(),
}
