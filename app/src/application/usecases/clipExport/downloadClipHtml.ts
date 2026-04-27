/**
 * クリップ HTML のダウンロード
 *
 * @responsibility R:unclassified
 */
import type { ClipBundle } from './types'
import { renderClipHtml } from './renderClipHtml'

/** ClipBundle を自己完結型 HTML ファイルとしてダウンロードさせる */
export function downloadClipHtml(bundle: ClipBundle): void {
  const html = renderClipHtml(bundle)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${bundle.storeName}_${bundle.year}年${bundle.month}月_レポート.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
