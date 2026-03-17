/**
 * JMA API のベース URL 解決
 *
 * JMA（気象庁）サーバーはクロスオリジンリクエストを拒否するため、
 * 環境に応じてプロキシ経由の URL に切り替える。
 *
 * - 開発環境: Vite dev server のプロキシ (/jma-api → www.jma.go.jp)
 * - 本番環境: 環境変数 VITE_JMA_PROXY_URL で指定した CORS プロキシ
 * - フォールバック: 直接アクセス（CORS でブロックされる可能性あり）
 */

/** JMA API のベース URL を返す */
export function getJmaBaseUrl(): string {
  if (import.meta.env.DEV) {
    return '/jma-api'
  }
  const proxyUrl = import.meta.env.VITE_JMA_PROXY_URL as string | undefined
  if (proxyUrl) {
    return proxyUrl.replace(/\/$/, '') // 末尾スラッシュ除去
  }
  // フォールバック: 直接アクセス（CORS で失敗する可能性がある）
  return 'https://www.jma.go.jp'
}
