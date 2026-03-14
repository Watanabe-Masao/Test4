/**
 * charts バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import { DailySalesChart } from '@/presentation/components/charts/core'
 *   import { FeatureChart } from '@/presentation/components/charts/duckdb'
 *   import { IntegratedTimeline } from '@/presentation/components/charts/advanced'
 *   import { useChartTheme } from '@/presentation/components/charts/chartInfra'
 */
export * from './core'
export * from './duckdb'
export * from './advanced'
export * from './chartInfra'
