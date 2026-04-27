/**
 * @responsibility R:unclassified
 */

export { PageWidgetContainer } from './PageWidgetContainer'
export { WidgetSettingsPanel } from './WidgetSettingsPanel'
export { loadPageLayout, savePageLayout, buildWidgetMap } from './widgetLayout'
export { UNIFIED_WIDGET_REGISTRY, UNIFIED_WIDGET_MAP } from './unifiedRegistry'
export { narrowRenderCtx } from './widgetContextNarrow'
export type {
  UnifiedWidgetDef,
  WidgetSize,
  PageKey,
  BuiltinPageKey,
  PageWidgetConfig,
  UnifiedWidgetContext,
  RenderUnifiedWidgetContext,
} from './types'
