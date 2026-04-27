/**
 * 計算で使用する定数
 *
 * ドメイン層の計算ロジックで使われるマジックナンバーを
 * 名前付き定数として一元管理する。
 *
 * @responsibility R:unclassified
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

// ── PI値 ──

/** PI値の乗数（来店客1,000人あたり） */
export const PI_MULTIPLIER = 1_000

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

/** 異常値検出の Z スコア閾値（平均 ± N 標準偏差） */
export const ANOMALY_ZSCORE_THRESHOLD = 2.0

/** トレンド判定の変化率閾値（±3%以上で上昇/下降と判定） */
export const TREND_CHANGE_THRESHOLD = 0.03

// ── 額合わせ残差許容閾値 ──

/**
 * 額の積み上げにおける残差率の許容上限（0.01% = 0.0001）
 *
 * 部門別合計と全体合計など、同一データソースからの額合わせは
 * 本来一致（残差0）が正常。端数処理による微小なずれのみ許容する。
 * これを超える残差はデータ不整合またはロジック不備を示す。
 */
export const AMOUNT_RECONCILIATION_TOLERANCE = 0.0001

// ── 表示・書式 ──

/** 万円変換の除数 */
export const MANYEN_DIVISOR = 10_000

// ── 観測期間閾値 ──

/** 観測期間: 最低必要日数（これ未満は invalid） */
export const DEFAULT_MIN_DAYS_FOR_VALID = 5

/** 観測期間: partial 判定日数（これ未満は partial） */
export const DEFAULT_MIN_DAYS_FOR_OK = 10

/** 観測期間: 販売停滞閾値（lastRecordedSalesDay からこの日数以上経過で停滞警告） */
export const DEFAULT_STALE_DAYS_THRESHOLD = 7

/** 観測期間: 最低営業日数（これ未満は invalid） */
export const DEFAULT_MIN_SALES_DAYS = 3
