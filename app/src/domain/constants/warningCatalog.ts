/**
 * Warning Code カタログ
 *
 * ## 責務
 * warning code（意味状態）と表示文言を分離する。
 * domain 計算が返す warning code に対して:
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
 */

// ── Warning Severity ──

/** 警告の深刻度 */
export type WarningSeverity = 'info' | 'warning' | 'critical'

// ── Warning Entry ──

/** 警告カタログエントリ */
export interface WarningEntry {
  /** 警告コード（domain 計算が返す文字列と一致） */
  readonly code: string
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
  {
    code: 'discount_rate_negative',
    severity: 'critical',
    label: '売変率異常',
    message: '売変率が負の値です。データの整合性を確認してください。',
  },
  {
    code: 'discount_rate_out_of_domain',
    severity: 'critical',
    label: '売変率定義域外',
    message: '売変率が100%以上のため、推定法による計算ができません。',
  },
  {
    code: 'markup_rate_negative',
    severity: 'warning',
    label: '値入率異常',
    message: '値入率が負の値です。仕入データを確認してください。',
  },
  {
    code: 'markup_rate_exceeds_one',
    severity: 'warning',
    label: '値入率超過',
    message: '値入率が100%を超えています。仕入データを確認してください。',
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
