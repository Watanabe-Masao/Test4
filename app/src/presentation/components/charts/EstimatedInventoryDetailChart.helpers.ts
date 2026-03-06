export type ViewMode = 'aggregate' | 'compare'

export const fmt = (v: number) => Math.round(v).toLocaleString('ja-JP')

export const AGG_LABELS: Record<string, string> = {
  inventoryCost: '在庫仕入原価',
  estCogs: '推定原価',
  estimated: '推定在庫',
}
