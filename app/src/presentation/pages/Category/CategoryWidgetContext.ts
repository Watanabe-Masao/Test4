/**
 * CategoryWidgetContext —
 * Category ページ専用 widget context 型
 *
 * projects/architecture-debt-recovery SP-A ADR-A-001 PR2。
 *
 * UnifiedWidgetContext から page-local optional field 3 件
 * (`selectedResults?` / `storeNames?` / `onCustomCategoryChange?`) を剥離し、
 * Category ページの widget が必須値として受け取れるようにする。
 *
 * 移行計画:
 *  - PR2 (本 file): 型の新設 — UnifiedWidgetContext は page-local optional を保持したまま
 *  - PR3c: CATEGORY 2 widget を本 context 経由に切替
 *  - PR4: UnifiedWidgetContext から 3 field を物理削除
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-A-001
 *  - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-003
 *  - projects/widget-context-boundary/checklist.md Phase 1
 */
import type { StoreResult } from '@/domain/models/storeTypes'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets/types'

export interface CategoryWidgetContext extends Omit<
  UnifiedWidgetContext,
  'insightData' | 'costDetailData' | 'selectedResults' | 'storeNames' | 'onCustomCategoryChange'
> {
  readonly selectedResults: readonly StoreResult[]
  readonly storeNames: ReadonlyMap<string, string>
  readonly onCustomCategoryChange: (supplierCode: string, value: string) => void
}
