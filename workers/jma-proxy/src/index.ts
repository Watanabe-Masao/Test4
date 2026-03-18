/**
 * JMA CORS Proxy — Cloudflare Worker
 *
 * 気象庁の2つのホストへのリクエストを中継し、CORS ヘッダーを付与して返す。
 *
 * ルーティング:
 *   /bosai/*          → www.jma.go.jp    (予報・AMeDAS・マスタデータ)
 *   /stats/etrn/*     → www.data.jma.go.jp (過去の気象データ ETRN)
 */

/** ホスト別のルーティング定義 */
const ROUTES: readonly { readonly prefix: string; readonly origin: string }[] = [
  // www.jma.go.jp — 予報・AMeDAS
  { prefix: '/bosai/amedas/', origin: 'https://www.jma.go.jp' },
  { prefix: '/bosai/forecast/', origin: 'https://www.jma.go.jp' },
  { prefix: '/bosai/common/', origin: 'https://www.jma.go.jp' },
  // www.data.jma.go.jp — ETRN 過去データ
  { prefix: '/stats/etrn/', origin: 'https://www.data.jma.go.jp' },
]

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin')

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    // GET のみ許可
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) })
    }

    // パスからルーティング先を決定
    const path = url.pathname
    const route = ROUTES.find((r) => path.startsWith(r.prefix))
    if (!route) {
      return new Response('Forbidden: path not allowed', {
        status: 403,
        headers: corsHeaders(origin),
      })
    }

    // プロキシ先 URL を構築
    const targetUrl = `${route.origin}${path}${url.search}`

    // ETRN は HTML を返すため Accept ヘッダーを分ける
    const isEtrn = route.origin.includes('data.jma.go.jp')
    const acceptHeader = isEtrn ? 'text/html, */*' : 'application/json'

    const targetResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; weather-proxy)',
        Accept: acceptHeader,
      },
    })

    // レスポンスをコピーして CORS ヘッダーを付与
    const response = new Response(targetResponse.body, {
      status: targetResponse.status,
      statusText: targetResponse.statusText,
      headers: {
        ...Object.fromEntries(targetResponse.headers.entries()),
        ...corsHeaders(origin),
        // ETRN は変わらないデータなので長めにキャッシュ、予報は短め
        'Cache-Control': isEtrn ? 'public, max-age=3600' : 'public, max-age=300',
      },
    })

    return response
  },
}
