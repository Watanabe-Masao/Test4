/**
 * 粗利の表示名定数マップ
 *
 * 在庫法/推定法の表示名を一元管理する。
 * UI で粗利のラベルを表示する際はこの定数を使用すること。
 *
 * @see references/01-principles/gross-profit-definition.md §8
 */
export const GROSS_PROFIT_LABELS = {
  /** フォールバック後の統一名（在庫法優先） */
  effective: '粗利',
  effectiveRate: '粗利率',

  /** 在庫法の実績値を明示的に表示する場合 */
  inventory: '粗利益（在庫法）',
  inventoryRate: '粗利率（在庫法）',
  inventoryBadge: '実績',
  inventoryTooltip: '在庫法による実績値',

  /** 推定法の理論値を明示的に表示する場合 */
  estimated: '推定マージン',
  estimatedRate: '推定マージン率',
  estimatedBadge: '推定',
  estimatedTooltip: '推定法による理論値（実績粗利ではありません）',

  /** 方法を示す注釈（括弧付き） */
  inventoryNote: '（在庫法）',
  estimatedNote: '（推定法・理論値）',
} as const
