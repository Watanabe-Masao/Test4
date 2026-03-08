/**
 * common バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import { Card } from '@/presentation/components/common/layout'
 *   import { KpiCard } from '@/presentation/components/common/tables'
 *   import { Modal } from '@/presentation/components/common/feedback'
 */
export * from './layout'
export * from './forms'
export * from './tables'
export * from './feedback'
