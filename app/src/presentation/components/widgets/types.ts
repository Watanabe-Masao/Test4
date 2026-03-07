/**
 * ページ横断ウィジェットシステム — 型定義
 *
 * ダッシュボードだけでなく、全ページでウィジェットの表示・並べ替え・
 * カスタマイズを可能にする共通型。
 */
import type { ReactNode } from 'react'
import type { ViewType } from '@/domain/models'

export type WidgetSize = 'kpi' | 'half' | 'full'

/**
 * ページ識別子。各ページが独立したレイアウトを持つ。
 */
export type PageKey = 'dashboard' | 'daily' | 'insight' | 'category' | 'costDetail' | 'reports'

/**
 * ウィジェット定義（ページ非依存）
 *
 * render 関数はページ固有の context を受け取る。
 * 型パラメータ T でページごとの WidgetContext を指定する。
 */
export interface WidgetDef<T = unknown> {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: T) => ReactNode
  /** データ有無による表示判定（未設定時は常に表示） */
  readonly isVisible?: (ctx: T) => boolean
  /** 関連ページへのリンク（「もっと詳しく」動線） */
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}

/**
 * ページ単位のウィジェット設定
 */
export interface PageWidgetConfig<T = unknown> {
  /** ページ識別子（localStorage のキーに使用） */
  readonly pageKey: PageKey
  /** このページで利用可能なウィジェット一覧 */
  readonly registry: readonly WidgetDef<T>[]
  /** デフォルトで表示するウィジェット ID */
  readonly defaultWidgetIds: readonly string[]
  /** ウィジェット設定パネルのタイトル */
  readonly settingsTitle: string
}
