/**
 * ChartRegistry — AI開発向けチャートメタデータレジストリ
 *
 * 全チャートの構造メタデータを統一管理する。
 * 新チャート追加時の手順を機械的に定義し、判断を不要にする。
 *
 * 使い方:
 *   1. ChartName/ ディレクトリ作成（.tsx + .styles.ts + .vm.ts + index.ts）
 *   2. CHART_REGISTRY に1エントリ追加
 *   3. dataRequirements を宣言 → Architecture Guard が検証
 *   4. metricIds を宣言 → Explanation との連携自動化
 *   5. domain を宣言 → 縦スライス移行時に自動分類
 * @responsibility R:utility
 */
import type { WidgetSize } from '@/presentation/components/widgets/types'
import type { ViewType } from '@/domain/models/storeTypes'
import type { MetricId } from '@/domain/models/Explanation'

/** チャートの業務ドメイン分類 */
export type ChartDomain = 'sales' | 'inventory' | 'category' | 'customer' | 'forecast' | 'shared'

/** チャートレジストリのエントリ */
export interface ChartRegistryEntry {
  /** 一意識別子（WidgetDef.id と同一） */
  readonly id: string
  /** 表示ラベル */
  readonly label: string
  /** UI グループ */
  readonly group: string
  /** ウィジェットサイズ */
  readonly size: WidgetSize
  /** 業務ドメイン（縦スライス分類用） */
  readonly domain: ChartDomain
  /** データ要件 */
  readonly dataRequirements: ChartDataRequirements
  /** 関連する MetricId（Explanation 連携用） */
  readonly metricIds?: readonly MetricId[]
  /** 検索・分類用タグ */
  readonly tags?: readonly string[]
  /** ファイルパス（ChartName/ ディレクトリからの相対） */
  readonly path: string
  /** 遷移先ページ */
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
  /** ディレクトリ構造に移行済みか */
  readonly isDirectoryStructure: boolean
}

/** チャートのデータ要件宣言 */
export interface ChartDataRequirements {
  /** WriteModel（StoreResult）のフィールド参照 */
  readonly writeModel?: readonly string[]
  /** 使用する QueryHandler 名 */
  readonly queryHandler?: readonly string[]
  /** 比較コンテキストの使用 */
  readonly comparison?: boolean
  /** データベース接続の使用 */
  readonly duckdb?: boolean
}

/**
 * チャートレジストリ
 *
 * Phase 6 で段階的にエントリを追加する。
 * 新規チャートは必ず登録する。既存チャートはディレクトリ化時に登録する。
 */
export const CHART_REGISTRY: readonly ChartRegistryEntry[] = [
  // ─── ディレクトリ構造移行済み ──────────────────────
  {
    id: 'chart-gp-rate',
    label: '粗利率推移チャート',
    group: 'トレンド分析',
    size: 'full',
    domain: 'sales',
    dataRequirements: {
      writeModel: ['daily', 'totalSales', 'totalCost'],
    },
    metricIds: ['invMethodGrossProfitRate', 'estMethodMarginRate'],
    tags: ['profit', 'trend', 'cumulative'],
    path: 'GrossProfitRateChart',
    linkTo: { view: 'daily' },
    isDirectoryStructure: true,
  },
]

/** レジストリの ID → エントリマップ */
export const CHART_REGISTRY_MAP: ReadonlyMap<string, ChartRegistryEntry> = new Map(
  CHART_REGISTRY.map((e) => [e.id, e]),
)
