/**
 * @canonical presentation/pages/Reports/widgets
 *
 * ReportsPage ウィジェットレジストリの **barrel re-export shim**。
 * 本 file は ADR-C-001 PR3 で削除予定の legacy path（LEG-012）。
 * 新規 consumer は `@/presentation/pages/Reports/widgets` を直接 import してください。
 *
 * @sunsetCondition ADR-C-001 PR3 で本 file を物理削除（consumer grep で 0 件確認済み）
 * @expiresAt 2026-05-31
 * @reason ADR-C-001: features 側 widgets.tsx の byte-identical 複製解消
 *
 * 参照:
 * - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-C-001
 * - projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-012
 */
export * from '@/presentation/pages/Reports/widgets'
