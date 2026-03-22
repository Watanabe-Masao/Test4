/**
 * domain/calculations バレル — サブバレルから re-export
 *
 * @guard B1 Authoritative 計算は domain/calculations のみ
 * @guard F1 バレルで後方互換
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
