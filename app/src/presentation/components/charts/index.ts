/**
 * charts バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import { DailySalesChart } from '@/presentation/components/charts/core'
 *   import { FeatureChart } from '@/presentation/components/charts/duckdb'
 *   import { IntegratedTimeline } from '@/presentation/components/charts/advanced'
 *   import { useChartTheme } from '@/presentation/components/charts/chartInfra'
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
 */
export * from './core'
export * from './duckdb'
export * from './advanced'
export * from './chartInfra'
