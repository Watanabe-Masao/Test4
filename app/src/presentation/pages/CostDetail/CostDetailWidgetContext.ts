/**
 * CostDetailWidgetContext —
 * CostDetail ページ専用 widget context 型
 *
 * projects/architecture-debt-recovery SP-A ADR-A-001 PR2。
 *
 * UnifiedWidgetContext から page-local optional field (`costDetailData?`) を剥離し、
 * CostDetail ページの widget が必須値として `costDetailData` を受け取れるようにする。
 *
 * 移行計画:
 *  - PR2 (本 file): 型の新設 — UnifiedWidgetContext は page-local optional を保持したまま
 *  - PR3b: COST_DETAIL 4 widget を本 context 経由に切替
 *  - PR4: UnifiedWidgetContext から `costDetailData?` を物理削除
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-001
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-002
 *  - projects/widget-context-boundary/checklist.md Phase 1
 */
import type { CostDetailData } from '@/features/cost-detail'
import type { RenderUnifiedWidgetContext } from '@/presentation/components/widgets/types'

/**
 * CostDetail ページ widget の render-time context。
 *
 * ADR-A-004 PR3 (2026-04-25): base を `RenderUnifiedWidgetContext` に変更。
 * widget 本体は dispatch chokepoint で narrow 済みの `result: StoreResult` /
 * `prevYear: PrevYearData` を直接参照する。
 */
export interface CostDetailWidgetContext extends RenderUnifiedWidgetContext {
  readonly costDetailData: CostDetailData
}
