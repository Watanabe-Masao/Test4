/**
 * Widget Ownership Registry — re-export from production module.
 *
 * 正本は presentation/pages/Dashboard/widgets/widgetOwnership.ts に移設。
 * guard テストはこの re-export を通じて参照する。
 */
export {
  WIDGET_OWNERSHIP,
  type WidgetOwner,
  type WidgetOwnershipEntry,
  type WidgetId,
} from '@/presentation/pages/Dashboard/widgets/widgetOwnership'
