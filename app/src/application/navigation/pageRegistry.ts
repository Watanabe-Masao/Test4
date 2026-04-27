/**
 * Page Registry — ページ正本レジストリ
 *
 * 全ページのメタデータを一元管理する。routes.tsx / viewMapping.ts / NavBar / BottomNav /
 * useKeyboardShortcuts / useRouteSync はすべてここから導出する。
 *
 * PAGE_REGISTRY が唯一の正本。ViewType（domain/models/PageMeta.ts）との一致は
 * pageMetaGuard で機械検証する。
 *
 * @responsibility R:unclassified
 */
import type { PageMeta, RedirectMeta, ViewType } from '@/domain/models/PageMeta'

// ── ページ定義（唯一の正本） ──

export const PAGE_REGISTRY: readonly PageMeta[] = [
  // L0: ダッシュボード
  {
    id: 'dashboard',
    pathPattern: '/dashboard',
    kind: 'standard',
    category: 'hub',
    label: 'ダッシュボード',
    icon: '📊',
    navVisible: true,
    mobileNavVisible: true,
    shortcutIndex: 1,
    navOrder: 0,
    navDividerAfter: true,
    preloadTargets: ['store-analysis', 'daily', 'insight'],
  },
  // L1/L2: 分析ドリルダウン
  {
    id: 'store-analysis',
    pathPattern: '/store-analysis',
    kind: 'standard',
    category: 'analysis',
    label: '店舗分析',
    icon: '🏪',
    navVisible: true,
    mobileNavVisible: false,
    shortcutIndex: undefined,
    navOrder: 1,
    preloadTargets: ['daily', 'dashboard'],
  },
  {
    id: 'daily',
    pathPattern: '/daily',
    kind: 'standard',
    category: 'analysis',
    label: '日別',
    icon: '📅',
    navVisible: true,
    mobileNavVisible: true,
    shortcutIndex: 2,
    navOrder: 2,
    preloadTargets: ['dashboard'],
  },
  {
    id: 'insight',
    pathPattern: '/insight',
    kind: 'standard',
    category: 'analysis',
    label: 'インサイト',
    icon: '📈',
    navVisible: true,
    mobileNavVisible: true,
    shortcutIndex: 3,
    navOrder: 3,
    navDividerAfter: true,
    preloadTargets: ['category'],
  },
  // 横断: 原価・カテゴリ
  {
    id: 'cost-detail',
    pathPattern: '/cost-detail',
    kind: 'standard',
    category: 'operations',
    label: '原価明細',
    icon: '💰',
    navVisible: true,
    mobileNavVisible: false,
    shortcutIndex: 5,
    navOrder: 4,
  },
  {
    id: 'purchase-analysis',
    pathPattern: '/purchase-analysis',
    kind: 'standard',
    category: 'operations',
    label: '仕入分析',
    icon: '🏭',
    navVisible: true,
    mobileNavVisible: false,
    shortcutIndex: undefined,
    navOrder: 5,
  },
  {
    id: 'category',
    pathPattern: '/category',
    kind: 'standard',
    category: 'analysis',
    label: 'カテゴリ',
    icon: '📁',
    navVisible: true,
    mobileNavVisible: true,
    shortcutIndex: 4,
    navOrder: 6,
    navDividerAfter: true,
  },
  // 外部データ
  {
    id: 'weather',
    pathPattern: '/weather',
    kind: 'standard',
    category: 'analysis',
    label: '天気',
    icon: '🌤',
    navVisible: true,
    mobileNavVisible: false,
    shortcutIndex: undefined,
    navOrder: 7,
    navDividerAfter: true,
  },
  // 出力
  {
    id: 'reports',
    pathPattern: '/reports',
    kind: 'standard',
    category: 'output',
    label: 'レポート',
    icon: '📄',
    navVisible: true,
    mobileNavVisible: false,
    shortcutIndex: 6,
    navOrder: 8,
  },
  // 管理（NavBar 下部に配置）
  {
    id: 'admin',
    pathPattern: '/admin',
    kind: 'standard',
    category: 'admin',
    label: '管理',
    icon: '⚙',
    navVisible: true,
    mobileNavVisible: true,
    shortcutIndex: undefined,
    navOrder: 100,
  },
  // 動的ページ入口（custom page 実体は pageStore で管理）
  {
    id: 'custom',
    pathPattern: '/custom/:pageId',
    kind: 'dynamic',
    category: 'extension',
    label: 'カスタム',
    icon: '📝',
    navVisible: false,
    mobileNavVisible: false,
    navOrder: 99,
  },
]

// ── リダイレクト定義（レガシー route alias） ──

export const REDIRECT_REGISTRY: readonly RedirectMeta[] = [
  { from: '/analysis', to: '/insight' },
  { from: '/forecast', to: '/insight' },
  { from: '/summary', to: '/insight' },
  { from: '/transfer', to: '/cost-detail' },
  { from: '/consumable', to: '/cost-detail' },
]

// ── 導出ヘルパー ──

/** id で PageMeta を取得 */
export function getPageById(id: string): PageMeta | undefined {
  return PAGE_REGISTRY.find((p) => p.id === id)
}

/** navVisible なページを navOrder 順で取得 */
export function getNavPages(): readonly PageMeta[] {
  return PAGE_REGISTRY.filter((p) => p.navVisible).sort((a, b) => a.navOrder - b.navOrder)
}

/** mobileNavVisible なページを navOrder 順で取得 */
export function getMobileNavPages(): readonly PageMeta[] {
  return PAGE_REGISTRY.filter((p) => p.mobileNavVisible).sort((a, b) => a.navOrder - b.navOrder)
}

/** shortcutIndex → PageMeta のマップ */
export function getShortcutMap(): ReadonlyMap<number, PageMeta> {
  const map = new Map<number, PageMeta>()
  for (const page of PAGE_REGISTRY) {
    if (page.shortcutIndex != null) {
      map.set(page.shortcutIndex, page)
    }
  }
  return map
}

/** standard ページの ViewType → path マッピング */
export function getViewToPath(): Record<ViewType, string> {
  const result = {} as Record<ViewType, string>
  for (const page of PAGE_REGISTRY) {
    if (page.kind === 'standard') {
      result[page.id as ViewType] = page.pathPattern
    }
  }
  return result
}

/** standard ページの path → ViewType マッピング（dynamic path は含まない） */
export function getPathToView(): Record<string, ViewType> {
  const result: Record<string, ViewType> = {}
  for (const page of PAGE_REGISTRY) {
    if (page.kind === 'standard') {
      result[page.pathPattern] = page.id as ViewType
    }
  }
  return result
}

/**
 * パスから PageMeta を特定する。
 *
 * - standard ページ: pathPattern の完全一致
 * - dynamic ページ: パターンマッチ（/custom/:pageId → /custom/abc にマッチ）
 * - redirect 解決は行わない（呼び出し側が REDIRECT_REGISTRY を参照）
 */
export function getPageByPath(pathname: string): PageMeta | undefined {
  // 1. standard ページの完全一致
  const standard = PAGE_REGISTRY.find((p) => p.kind === 'standard' && p.pathPattern === pathname)
  if (standard) return standard

  // 2. dynamic ページのパターンマッチ
  for (const page of PAGE_REGISTRY) {
    if (page.kind !== 'dynamic') continue
    if (matchDynamicPath(page.pathPattern, pathname)) return page
  }

  return undefined
}

/** リダイレクト先を取得（なければ undefined） */
export function getRedirectTarget(pathname: string): string | undefined {
  const redirect = REDIRECT_REGISTRY.find((r) => r.from === pathname)
  return redirect?.to
}

/** standard ページの id 一覧 */
export function getStandardPageIds(): readonly string[] {
  return PAGE_REGISTRY.filter((p) => p.kind === 'standard').map((p) => p.id)
}

// ── 内部ヘルパー ──

/** 簡易 path-to-regexp: :param にマッチ */
function matchDynamicPath(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')
  if (patternParts.length !== pathParts.length) return false
  return patternParts.every((part, i) => part.startsWith(':') || part === pathParts[i])
}
