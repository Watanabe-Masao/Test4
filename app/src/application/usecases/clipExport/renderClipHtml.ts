/**
 * クリップ HTML レンダラー
 *
 * ClipBundle を自己完結型 HTML 文字列に変換する。
 * CSS / JS テンプレートは clipCss.ts / clipJs.ts に分離。
 *
 * @responsibility R:unclassified
 */
import type { ClipBundle } from './types'
import { CSS_CONTENT } from './clipCss'
import { JS_CONTENT } from './clipJs'

/** HTML 特殊文字のエスケープ */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderClipHtml(bundle: ClipBundle): string {
  const dataJson = JSON.stringify(bundle)
  const title = escapeHtml(`${bundle.storeName} ${bundle.year}年${bundle.month}月 レポート`)

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
${CSS_CONTENT}
</style>
</head>
<body>
<div id="app"></div>
<script>
const DATA = ${dataJson};
${JS_CONTENT}
</script>
</body>
</html>`
}
