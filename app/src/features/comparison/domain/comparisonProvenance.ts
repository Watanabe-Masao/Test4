/**
 * ComparisonProvenance — 比較データの出自追跡
 *
 * 比較データがどのように生成されたかを透明に記録する。
 * silent fallback を防ぎ、UI がデータの信頼性を判断できるようにする。
 *
 * @responsibility R:unclassified
 */

/** 日付マッピングの種類 */
export type MappingKind =
  | 'same-date' // 同日比較（1/15 → 前年1/15）
  | 'same-dow' // 同曜日比較（曜日アライン済み）
  | 'wow' // 前週比較
  | 'custom-offset' // カスタムオフセット

/**
 * DataComparisonProvenance — 比較データの出自情報
 *
 * 比較結果の事実を追跡する。plan-level の PlanComparisonProvenance
 * (domain/models/ComparisonWindow.ts) とは棲み分け。
 *
 * - PlanComparisonProvenance: plan が「何を要求したか」
 * - DataComparisonProvenance (本型): result が「何を返したか」
 */
export interface DataComparisonProvenance {
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

/** CompareModeV2 → MappingKind の変換 */
export function toMappingKind(
  compareMode: 'sameDate' | 'sameDayOfWeek' | 'prevMonth',
): MappingKind {
  switch (compareMode) {
    case 'sameDate':
      return 'same-date'
    case 'sameDayOfWeek':
      return 'same-dow'
    case 'prevMonth':
      return 'same-date'
  }
}

/** デフォルトの provenance（フォールバックなし、最大信頼度） */
export function createProvenance(
  sourceDate: string,
  mappingKind: MappingKind,
): DataComparisonProvenance {
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
): DataComparisonProvenance {
  return {
    sourceDate,
    mappingKind,
    fallbackApplied: true,
    fallbackReason: reason,
    confidence: 0.7,
  }
}
