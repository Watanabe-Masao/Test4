/**
 * application/hooks バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import { useImport } from '@/application/hooks/data'
 *   import { useCalculation } from '@/application/hooks/calculation'
 *   import { useDuckDB } from '@/application/hooks/analytics'
 *   import { useSettings } from '@/application/hooks/ui'
 */
export * from './data'
export * from './calculation'
export * from './analytics'
export * from './ui'
