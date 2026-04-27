/**
 * PageMeta — ページ正本型
 *
 * 全ページのメタデータを定義する型。実際のレジストリは application/navigation/pageRegistry.ts に置く。
 * ViewType は standard ページの id から導出する。
 *
 * 適用範囲:
 * - standard: 固定ページ（9 画面）
 * - dynamic: 動的ページの「入口定義」のみ（custom page 実体は pageStore で管理）
 * - redirect: RedirectMeta として別型管理（route alias のみ）
 *
 * 管理外:
 * - custom page の実体（ユーザーが作成した個別ページ）は pageStore で管理
 * - アプリ内遷移ロジック（ボタン押下時の画面切替等）
 *
 * @responsibility R:unclassified
 */

// ── ViewType（standard ページ識別子） ──

/**
 * Standard ページの識別子。
 * PAGE_REGISTRY の kind === 'standard' と一致することを pageMetaGuard で機械検証する。
 */
export type ViewType =
  | 'dashboard'
  | 'store-analysis'
  | 'daily'
  | 'insight'
  | 'category'
  | 'cost-detail'
  | 'purchase-analysis'
  | 'reports'
  | 'weather'
  | 'admin'

// ── PageMeta 型 ──

export type PageKind = 'standard' | 'dynamic'

export type PageCategory = 'hub' | 'analysis' | 'operations' | 'output' | 'admin' | 'extension'

export interface PageMeta {
  /** ページ識別子。standard ページは ViewType と一致する */
  readonly id: string
  /** URL パスパターン。standard: '/dashboard', dynamic: '/custom/:pageId' */
  readonly pathPattern: string
  readonly kind: PageKind
  readonly category: PageCategory
  /** 表示ラベル */
  readonly label: string
  /** ナビゲーションアイコン */
  readonly icon: string
  /** デスクトップ NavBar に表示するか */
  readonly navVisible: boolean
  /** モバイル BottomNav に表示するか（navVisible の subset） */
  readonly mobileNavVisible: boolean
  /** キーボードショートカット（1-9）。undefined = ショートカットなし */
  readonly shortcutIndex?: number
  /** NavBar + BottomNav 共通表示順 */
  readonly navOrder: number
  /** NavBar でこのエントリの後にグループ区切りを表示するか */
  readonly navDividerAfter?: boolean
  /** ページ先読み対象の PageMeta.id 配列 */
  readonly preloadTargets?: readonly string[]
}

/**
 * レガシーパスからのリダイレクト定義。
 * PageMeta とは別型（route alias であり、ページ定義ではない）。
 */
export interface RedirectMeta {
  /** リダイレクト元パス */
  readonly from: string
  /** リダイレクト先パス */
  readonly to: string
}
