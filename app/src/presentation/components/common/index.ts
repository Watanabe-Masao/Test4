/**
 * common バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import { Card } from '@/presentation/components/common/layout'
 *   import { KpiCard } from '@/presentation/components/common/tables'
 *   import { Modal } from '@/presentation/components/common/feedback'
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
 */
export * from './layout'
export * from './forms'
export * from './tables'
export * from './feedback'
