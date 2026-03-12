export type ViewMode = 'aggregate' | 'compare'

import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'

export const createFmt = (fmtCurrency: CurrencyFormatter) => (v: number) => fmtCurrency(v)

export const AGG_LABELS: Record<string, string> = {
  inventoryCost: '在庫仕入原価',
  estCogs: '推定原価',
  estimated: '推定在庫',
}
