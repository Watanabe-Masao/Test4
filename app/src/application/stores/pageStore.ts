/**
 * ページ管理ストア
 *
 * ユーザーがページの追加・削除・名前変更を行えるようにする。
 * 各ページは独自の名前とウィジェットレイアウトを持つ。
 * localStorage で永続化。
 */
import { create } from 'zustand'

export interface CustomPage {
  /** 一意識別子 */
  readonly id: string
  /** ユーザーが設定した表示名 */
  readonly label: string
  /** このページのデフォルトウィジェットID一覧 */
  readonly defaultWidgetIds: readonly string[]
  /** ルートパス（自動生成: /custom/{id}） */
  readonly path: string
}

interface PageStoreState {
  /** カスタムページ一覧 */
  readonly pages: readonly CustomPage[]
  /** ページ追加 */
  addPage: (label: string, defaultWidgetIds?: string[]) => CustomPage
  /** ページ削除 */
  removePage: (id: string) => void
  /** ページ名変更 */
  renamePage: (id: string, label: string) => void
  /** ページのデフォルトウィジェットID更新 */
  updatePageDefaults: (id: string, widgetIds: string[]) => void
}

const STORAGE_KEY = 'custom_pages_v1'

function generateId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadPages(): CustomPage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function savePages(pages: readonly CustomPage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pages))
  } catch {
    // ignore
  }
}

export const usePageStore = create<PageStoreState>((set, get) => ({
  pages: loadPages(),

  addPage: (label, defaultWidgetIds = []) => {
    const id = generateId()
    const newPage: CustomPage = {
      id,
      label,
      defaultWidgetIds,
      path: `/custom/${id}`,
    }
    const next = [...get().pages, newPage]
    set({ pages: next })
    savePages(next)
    return newPage
  },

  removePage: (id) => {
    const next = get().pages.filter((p) => p.id !== id)
    set({ pages: next })
    savePages(next)
    // レイアウトも削除
    try {
      localStorage.removeItem(`widget_layout_custom_${id}_v1`)
    } catch {
      // ignore
    }
  },

  renamePage: (id, label) => {
    const next = get().pages.map((p) => (p.id === id ? { ...p, label } : p))
    set({ pages: next })
    savePages(next)
  },

  updatePageDefaults: (id, widgetIds) => {
    const next = get().pages.map((p) => (p.id === id ? { ...p, defaultWidgetIds: widgetIds } : p))
    set({ pages: next })
    savePages(next)
  },
}))
