/**
 * JMA CORS Proxy — Cloudflare Worker
 *
 * 気象庁 API (www.jma.go.jp) へのリクエストを中継し、
 * CORS ヘッダーを付与して返す。
 *
 * 許可するパス:
 *   /bosai/amedas/*   — AMEDAS 実測データ
 *   /bosai/forecast/*  — 天気予報データ
 *   /bosai/common/*    — 共通マスタデータ
 */

const JMA_ORIGIN = 'https://www.jma.go.jp'

/** 許可するパスのプレフィックス */
const ALLOWED_PATHS = ['/bosai/amedas/', '/bosai/forecast/', '/bosai/common/'] as const

/** CORS ヘッダー */
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

    // パス検証: 許可リスト外は拒否
    const path = url.pathname
    const isAllowed = ALLOWED_PATHS.some((prefix) => path.startsWith(prefix))
    if (!isAllowed) {
      return new Response('Forbidden: path not allowed', {
        status: 403,
        headers: corsHeaders(origin),
      })
    }

    // JMA へプロキシ
    const jmaUrl = `${JMA_ORIGIN}${path}${url.search}`
    const jmaResponse = await fetch(jmaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; weather-proxy)',
        Accept: 'application/json',
      },
    })

    // レスポンスをコピーして CORS ヘッダーを付与
    const response = new Response(jmaResponse.body, {
      status: jmaResponse.status,
      statusText: jmaResponse.statusText,
      headers: {
        ...Object.fromEntries(jmaResponse.headers.entries()),
        ...corsHeaders(origin),
        'Cache-Control': 'public, max-age=300', // 5分キャッシュ
      },
    })

    return response
  },
}
