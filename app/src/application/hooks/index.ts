/**
 * application/hooks バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import { useImport } from '@/application/hooks/data'
 *   import { useCalculation } from '@/application/hooks/calculation'
 *   import { useDuckDB } from '@/application/hooks/analytics'
 *   import { useSettings } from '@/application/hooks/ui'
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
 *
 * @responsibility R:unclassified
 */
export * from './data'
export * from './calculation'
export * from './analytics'
export * from './ui'
