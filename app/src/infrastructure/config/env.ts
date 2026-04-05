/**
 * Feature Availability Contract: 型付き環境変数バリデーション
 *
 * 全 VITE_* 環境変数を一元的にバリデーションし、
 * Feature flag を導出する。
 */

import { z } from 'zod'

const envSchema = z.object({
  VITE_BASE_PATH: z.string().optional().default('/'),
  VITE_JMA_PROXY_URL: z.string().optional(),
  VITE_ENABLE_WEATHER: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
})

function parseEnv() {
  const raw = {
    VITE_BASE_PATH: import.meta.env.VITE_BASE_PATH,
    VITE_JMA_PROXY_URL: import.meta.env.VITE_JMA_PROXY_URL,
    VITE_ENABLE_WEATHER: import.meta.env.VITE_ENABLE_WEATHER,
  }

  const result = envSchema.safeParse(raw)
  if (!result.success) {
    console.warn('[env] Environment validation failed:', result.error.format())
    return envSchema.parse({})
  }
  return result.data
}

const parsedEnv = parseEnv()

/** BASE_PATH — Vite が自動提供する base URL（trailing slash 付き） */
export const BASE_PATH = import.meta.env.BASE_URL

/**
 * Weather 機能の有効/無効
 *
 * 決定ロジック:
 * 1. VITE_ENABLE_WEATHER が明示されていればそれに従う
 * 2. DEV 環境では常に有効（Vite proxy が利用可能）
 * 3. PROD で VITE_JMA_PROXY_URL があれば有効
 * 4. それ以外は無効（CORS で失敗するため）
 */
export const WEATHER_ENABLED: boolean =
  parsedEnv.VITE_ENABLE_WEATHER ?? (import.meta.env.DEV ? true : !!parsedEnv.VITE_JMA_PROXY_URL)

export { parsedEnv }
