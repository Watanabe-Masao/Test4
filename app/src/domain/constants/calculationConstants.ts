/**
 * 計算で使用する定数
 *
 * ドメイン層の計算ロジックで使われるマジックナンバーを
 * 名前付き定数として一元管理する。
 */

// ── 時間・暦定数 ──

/** 1週間の日数 */
export const DAYS_PER_WEEK = 7

/** 1年の日数（非閏年） */
export const DAYS_PER_YEAR = 365

/** 1日のミリ秒数 (24 × 60 × 60 × 1000) */
export const MILLISECONDS_PER_DAY = 86_400_000

/** 1年の月数 */
export const MONTHS_PER_YEAR = 12

// ── 比較・アラインメント ──

/** 同曜日選択の探索半径（前年同日を anchor として ±N 日の候補窓） */
export const DOW_ALIGNMENT_WINDOW = 7

// ── 移動平均・トレンド窓 ──

/** 加重移動平均のデフォルト窓サイズ */
export const DEFAULT_WMA_WINDOW = 5

/** 短期移動平均の月数 */
export const SHORT_TERM_MA_MONTHS = 3

/** 中期移動平均の月数 */
export const MEDIUM_TERM_MA_MONTHS = 6

// ── 統計閾値 ──

/** 乖離検出閾値（0-100 正規化スケール上） */
export const DIVERGENCE_DETECTION_THRESHOLD = 30

/** 95%信頼区間の Z スコア（正規分布近似） */
export const CONFIDENCE_95_ZSCORE = 1.96
