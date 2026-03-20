/**
 * バックアップフォーマットユーティリティ
 *
 * SHA-256 チェックサム計算、gzip 圧縮/展開、JSON → Map 復元など、
 * バックアップファイルのフォーマット処理を担当する純粋ユーティリティ。
 */
import type { BudgetData } from '@/domain/models/record'
import type { ImportedData } from '@/domain/models/storeTypes'
import { budgetFromSerializable } from './internal/serialization'

// ─── JSON → Map 復元ヘルパー ─────────────────────────────

/**
 * plain object → Map 変換。
 * JSON.parse の結果は plain object であり Map ではないため、
 * ImportedData の Map フィールドを復元する必要がある。
 */
function objectToMap<V>(obj: unknown): Map<string, V> {
  if (obj instanceof Map) return obj as Map<string, V>
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    return new Map(Object.entries(obj as Record<string, V>))
  }
  return new Map()
}

/**
 * budget フィールドを復元する。
 * BudgetData.daily は Map<number, number> であり、
 * JSON.parse では plain object になるため budgetFromSerializable で復元する。
 */
function hydrateBudgetMap(obj: unknown): Map<string, BudgetData> {
  const map = new Map<string, BudgetData>()
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return map
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v && typeof v === 'object') {
      const parsed = budgetFromSerializable(v as Record<string, unknown>)
      if (parsed) map.set(k, parsed)
    }
  }
  return map
}

/**
 * JSON.parse の結果を正しい ImportedData に復元する。
 * Map フィールド（stores, suppliers, settings, budget）を
 * plain object から Map に変換する。
 */
export function hydrateImportedData(raw: unknown): ImportedData {
  const base = raw as Record<string, unknown>
  return {
    ...base,
    stores: objectToMap(base.stores),
    suppliers: objectToMap(base.suppliers),
    settings: objectToMap(base.settings),
    budget: hydrateBudgetMap(base.budget),
    // prevYear系は空で初期化（useAutoLoadPrevYear が実際の年月から自動ロードする）
    prevYearClassifiedSales: base.prevYearClassifiedSales ?? { records: [] },
    prevYearCategoryTimeSales: base.prevYearCategoryTimeSales ?? { records: [] },
  } as unknown as ImportedData
}

// ─── SHA-256 チェックサム ──────────────────────────────

export async function computeSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── gzip 圧縮/展開 ──────────────────────────────────

/** CompressionStream API が使用可能か（Blob.stream も必要） */
export function isCompressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof Blob.prototype.stream === 'function'
}

/** gzip 圧縮 */
export async function compress(data: string): Promise<Blob> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Response(stream).blob()
}

/** gzip 展開 */
export async function decompress(blob: Blob): Promise<string> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

/** Blob が gzip か判定する（マジックバイト 1f 8b） */
export async function isGzipped(blob: Blob): Promise<boolean> {
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
  return header[0] === 0x1f && header[1] === 0x8b
}
