export type ViewMode = 'aggregate' | 'compare'

import { formatCurrency } from '@/domain/formatting'

export const fmt = (v: number) => formatCurrency(v)

export const AGG_LABELS: Record<string, string> = {
  inventoryCost: '在庫仕入原価',
  estCogs: '推定原価',
  estimated: '推定在庫',
}
