/**
 * ComparisonProvenance — 比較データの出自追跡
 *
 * 比較データがどのように生成されたかを透明に記録する。
 * silent fallback を防ぎ、UI がデータの信頼性を判断できるようにする。
 */

/** 日付マッピングの種類 */
export type MappingKind =
  | 'same-date' // 同日比較（1/15 → 前年1/15）
  | 'same-dow' // 同曜日比較（曜日アライン済み）
  | 'wow' // 前週比較
  | 'custom-offset' // カスタムオフセット

/** 比較データの出自情報 */
export interface ComparisonProvenance {
  /** 比較元の日付（ISO 形式: YYYY-MM-DD） */
  readonly sourceDate: string
  /** マッピング種別 */
  readonly mappingKind: MappingKind
  /** フォールバックが適用されたか */
  readonly fallbackApplied: boolean
  /** フォールバックの理由（適用された場合） */
  readonly fallbackReason?: string
  /** データの信頼度（0.0-1.0） */
  readonly confidence: number
}

/** デフォルトの provenance（フォールバックなし、最大信頼度） */
export function createProvenance(
  sourceDate: string,
  mappingKind: MappingKind,
): ComparisonProvenance {
  return {
    sourceDate,
    mappingKind,
    fallbackApplied: false,
    confidence: 1.0,
  }
}

/** フォールバック適用時の provenance */
export function createFallbackProvenance(
  sourceDate: string,
  mappingKind: MappingKind,
  reason: string,
): ComparisonProvenance {
  return {
    sourceDate,
    mappingKind,
    fallbackApplied: true,
    fallbackReason: reason,
    confidence: 0.7,
  }
}
