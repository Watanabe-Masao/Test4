/**
 * domain/calculations バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import { calculateInvMethod } from '@/domain/calculations/grossProfit'
 *   import { calculateForecast } from '@/domain/calculations/forecast.barrel'
 *   import { decompose3 } from '@/domain/calculations/decomposition'
 */
export * from './grossProfit'
export * from './forecast.barrel'
export * from './decomposition'
export { prorateBudget, projectLinear } from './budgetAnalysis'
