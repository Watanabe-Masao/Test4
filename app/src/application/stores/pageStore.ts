/**
 * ページ管理ストア
 *
 * ユーザーがページの追加・削除・名前変更を行えるようにする。
 * 各ページは独自の名前とウィジェットレイアウトを持つ。
 * 永続化は Zustand persist middleware 経由（C3: store は state 反映のみ）。
 *
 * @guard C3 store は state 反映のみ
 *
 * @responsibility R:unclassified
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { z } from 'zod'
import { createUiPersistOptions, STORAGE_KEYS } from '@/application/adapters/uiPersistenceAdapter'

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

const CustomPageSchema = z.object({
  id: z.string(),
  label: z.string(),
  defaultWidgetIds: z.array(z.string()),
  path: z.string(),
})

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

function generateId(): string {
  return `page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const usePageStore = create<PageStoreState>()(
  persist(
    (set, get) => ({
      pages: [],

      addPage: (label, defaultWidgetIds = []) => {
        const id = generateId()
        const newPage: CustomPage = {
          id,
          label,
          defaultWidgetIds,
          path: `/custom/${id}`,
        }
        set({ pages: [...get().pages, newPage] })
        return newPage
      },

      removePage: (id) => {
        set({ pages: get().pages.filter((p) => p.id !== id) })
      },

      renamePage: (id, label) => {
        set({ pages: get().pages.map((p) => (p.id === id ? { ...p, label } : p)) })
      },

      updatePageDefaults: (id, widgetIds) => {
        set({
          pages: get().pages.map((p) => (p.id === id ? { ...p, defaultWidgetIds: widgetIds } : p)),
        })
      },
    }),
    {
      ...createUiPersistOptions(STORAGE_KEYS.CUSTOM_PAGES),
      merge: (persisted, current) => {
        const stored = persisted as { pages?: unknown }
        if (!stored?.pages) return current
        const result = z.array(CustomPageSchema).safeParse(stored.pages)
        if (!result.success) {
          console.warn('[pageStore] hydration schema mismatch:', result.error.message)
          return current
        }
        return { ...current, pages: result.data }
      },
    },
  ),
)
