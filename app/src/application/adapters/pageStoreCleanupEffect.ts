/**
 * ページ削除時の widget レイアウトキー クリーンアップ
 *
 * store は state 反映のみ（C3）。永続化副作用は adapter 層で subscribe する。
 * このモジュールを import するだけで副作用が有効になる。
 */
import { usePageStore, type CustomPage } from '@/application/stores/pageStore'
import { removeKey, STORAGE_KEYS } from './uiPersistenceAdapter'

usePageStore.subscribe((state, prev) => {
  const removedPages = (prev.pages as readonly CustomPage[]).filter(
    (p) => !(state.pages as readonly CustomPage[]).some((sp) => sp.id === p.id),
  )
  for (const page of removedPages) {
    removeKey(STORAGE_KEYS.widgetLayout(`custom_${page.id}`))
  }
})
