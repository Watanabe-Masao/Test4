/**
 * Warning Code カタログ
 *
 * ## 責務
 * warning code（意味状態）と表示文言を分離する。
 * domain 計算が返す warning code に対して:
 * - category（分類）
 * - severity（深刻度）
 * - label（短縮表示ラベル）
 * - message（詳細説明）
 * を一元管理する。
 *
 * ## 設計原則
 * - warning は「意味状態」であり、表示責務とは独立
 * - code は domain 計算が生成する文字列と一致する
 * - UI / explanation は code を介して表示文言を取得する
 * - severity によって authoritative 採用可否を判断できる
 *
 * ## 命名規則
 * - すべて lowercase snake_case
 * - 先頭にカテゴリ接頭辞:
 *   - calc_* : 計算定義域異常
 *   - obs_*  : 観測期間異常
 *   - cmp_*  : 比較期間不足/比較異常
 *   - fb_*   : fallback 発動
 *   - auth_* : authoritative 採用不可
 * - 1 code = 1 事象
 * - UI 文言を code に埋め込まない
 *
 * @responsibility R:unclassified
 */

// ── Warning Category ──

/** 警告の分類カテゴリ */
export type WarningCategory = 'calc' | 'obs' | 'cmp' | 'fb' | 'auth'

// ── Warning Severity ──

/** 警告の深刻度 */
export type WarningSeverity = 'info' | 'warning' | 'critical'

// ── Warning Entry ──

/** 警告カタログエントリ */
export interface WarningEntry {
  /** 警告コード（domain 計算が返す文字列と一致） */
  readonly code: string
  /** 分類カテゴリ */
  readonly category: WarningCategory
  /** 深刻度 */
  readonly severity: WarningSeverity
  /** 短縮表示ラベル（badge / chip 用） */
  readonly label: string
  /** 詳細説明（tooltip / 説明パネル用） */
  readonly message: string
}

// ── カタログ定義 ──

/**
 * 全 warning code の定義
 *
 * domain/calculations/ が返す warning 文字列と 1:1 対応する。
 */
const WARNING_ENTRIES: readonly WarningEntry[] = [
  // ── calc_* : 計算定義域異常 ──
  {
    code: 'calc_discount_rate_negative',
    category: 'calc',
    severity: 'critical',
    label: '売変率異常',
    message: '売変率が負の値です。データの整合性を確認してください。',
  },
  {
    code: 'calc_discount_rate_out_of_domain',
    category: 'calc',
    severity: 'critical',
    label: '売変率定義域外',
    message: '売変率が100%以上のため、推定法による計算ができません。',
  },
  {
    code: 'calc_markup_rate_negative',
    category: 'calc',
    severity: 'warning',
    label: '値入率異常',
    message: '値入率が負の値です。仕入データを確認してください。',
  },
  {
    code: 'calc_markup_rate_exceeds_one',
    category: 'calc',
    severity: 'warning',
    label: '値入率超過',
    message: '値入率が100%を超えています。仕入データを確認してください。',
  },

  // ── obs_* : 観測期間異常 ──
  {
    code: 'obs_window_incomplete',
    category: 'obs',
    severity: 'warning',
    label: '観測期間不足',
    message: '観測期間が不完全です。集計値は部分的な実績に基づいています。',
  },
  {
    code: 'obs_no_sales_data',
    category: 'obs',
    severity: 'critical',
    label: '販売実績なし',
    message: '対象期間に販売実績がありません。予測系指標は算出できません。',
  },
  {
    code: 'obs_stale_sales_data',
    category: 'obs',
    severity: 'critical',
    label: '販売データ停滞',
    message: '一定期間、販売実績が記録されていません。予測値の信頼性が低下しています。',
  },
  {
    code: 'obs_insufficient_sales_days',
    category: 'obs',
    severity: 'warning',
    label: '営業日数不足',
    message: '営業日数が最低必要日数に満たないため、集計値の信頼性が低い可能性があります。',
  },

  // ── cmp_* : 比較期間不足/比較異常 ──
  {
    code: 'cmp_prior_year_insufficient',
    category: 'cmp',
    severity: 'warning',
    label: '前年データ不足',
    message: '前年同期間のデータが不足しています。比較値の信頼性が低い可能性があります。',
  },

  // ── fb_* : fallback 発動 ──
  {
    code: 'fb_estimated_value_used',
    category: 'fb',
    severity: 'info',
    label: '推定値使用',
    message: '正式値が取得できないため、推定値を使用しています。',
  },

  // ── auth_* : authoritative 採用不可 ──
  {
    code: 'auth_partial_rejected',
    category: 'auth',
    severity: 'info',
    label: '参考値',
    message: '警告があるため正式値として採用されていません。参考値として表示しています。',
  },
] as const

// ── インデックス ──

const WARNING_MAP: ReadonlyMap<string, WarningEntry> = new Map(
  WARNING_ENTRIES.map((entry) => [entry.code, entry]),
)

// ── 公開関数 ──

/**
 * warning code から WarningEntry を取得する
 *
 * 未登録の code の場合は null を返す。
 */
export function getWarningEntry(code: string): WarningEntry | null {
  return WARNING_MAP.get(code) ?? null
}

/**
 * warning code から表示ラベルを取得する
 *
 * 未登録の code の場合は code そのものを返す（後方互換）。
 */
export function getWarningLabel(code: string): string {
  return WARNING_MAP.get(code)?.label ?? code
}

/**
 * warning code から詳細メッセージを取得する
 *
 * 未登録の code の場合は code そのものを返す（後方互換）。
 */
export function getWarningMessage(code: string): string {
  return WARNING_MAP.get(code)?.message ?? code
}

/**
 * warning code から severity を取得する
 *
 * 未登録の code の場合は 'warning' を返す（安全側デフォルト）。
 */
export function getWarningSeverity(code: string): WarningSeverity {
  return WARNING_MAP.get(code)?.severity ?? 'warning'
}

/**
 * warning code から category を取得する
 *
 * 未登録の code の場合は接頭辞から推定を試み、それも失敗すれば 'calc' を返す。
 */
export function getWarningCategory(code: string): WarningCategory {
  const entry = WARNING_MAP.get(code)
  if (entry) return entry.category
  // 未登録でも接頭辞から推定
  const prefix = code.split('_')[0]
  if (
    prefix === 'calc' ||
    prefix === 'obs' ||
    prefix === 'cmp' ||
    prefix === 'fb' ||
    prefix === 'auth'
  ) {
    return prefix
  }
  return 'calc'
}

/**
 * 複数の warning code を severity 付きで解決する
 *
 * UI が badge / tooltip を描画する際に使う。
 */
export function resolveWarnings(
  codes: readonly string[],
): readonly (WarningEntry & { readonly resolved: true })[] {
  return codes.map((code) => {
    const entry = WARNING_MAP.get(code)
    if (entry) {
      return { ...entry, resolved: true }
    }
    return {
      code,
      category: getWarningCategory(code),
      severity: 'warning' as const,
      label: code,
      message: code,
      resolved: true,
    }
  })
}

/**
 * warning codes の中で最も深刻な severity を返す
 *
 * critical > warning > info の順。空配列の場合は null。
 */
export function getMaxSeverity(codes: readonly string[]): WarningSeverity | null {
  if (codes.length === 0) return null

  const SEVERITY_ORDER: Record<WarningSeverity, number> = {
    info: 0,
    warning: 1,
    critical: 2,
  }

  let max: WarningSeverity = 'info'
  for (const code of codes) {
    const severity = getWarningSeverity(code)
    if (SEVERITY_ORDER[severity] > SEVERITY_ORDER[max]) {
      max = severity
    }
  }
  return max
}

/**
 * 全登録済み warning code を返す（テスト用）
 */
export function getAllWarningCodes(): readonly string[] {
  return WARNING_ENTRIES.map((e) => e.code)
}
