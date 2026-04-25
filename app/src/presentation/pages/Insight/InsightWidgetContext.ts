/**
 * InsightWidgetContext —
 * Insight ページ専用 widget context 型
 *
 * projects/architecture-debt-recovery SP-A ADR-A-001 PR2。
 *
 * UnifiedWidgetContext から page-local optional field (`insightData?`) を剥離し、
 * Insight ページの widget が必須値として `insightData` を受け取れるようにする。
 *
 * 移行計画:
 *  - PR2 (本 file): 型の新設 — UnifiedWidgetContext は page-local optional を保持したまま
 *  - PR3a: INSIGHT 6 widget を本 context 経由に切替
 *  - PR4: UnifiedWidgetContext から `insightData?` を物理削除
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-001
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-001
 *  - projects/widget-context-boundary/checklist.md Phase 1
 */
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets/types'

/**
 * 5 page-local optional field のうち本 context は `insightData` のみを required として公開する。
 * 他の 4 field は Omit で除外（他ページの context に属するため本 context には存在しない）。
 */
export interface InsightWidgetContext extends Omit<
  UnifiedWidgetContext,
  'insightData' | 'costDetailData' | 'selectedResults' | 'storeNames' | 'onCustomCategoryChange'
> {
  readonly insightData: InsightData
}
