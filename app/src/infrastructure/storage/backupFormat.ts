/**
 * バックアップフォーマットユーティリティ
 *
 * SHA-256 チェックサム計算、gzip 圧縮/展開、JSON → Map 復元など、
 * バックアップファイルのフォーマット処理を担当する純粋ユーティリティ。
 */
import type { BudgetData } from '@/domain/models/record'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { DataOrigin } from '@/domain/models/DataOrigin'
import { budgetFromSerializable } from './internal/serialization'

// ─── JSON → Map 復元ヘルパー ─────────────────────────────

/**
 * plain object → Map 変換。
 * JSON.parse の結果は plain object であり Map ではないため、
 * MonthlyData の Map フィールドを復元する必要がある。
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
 * JSON.parse の結果を MonthlyData に復元する。
 * Map フィールド（stores, suppliers, settings, budget）を
 * plain object から Map に変換する。
 * prevYear* フィールドは無視する（MonthlyData には存在しない）。
 *
 * 旧 ImportedData 形式のバックアップにも対応（prevYear* を読み飛ばす）。
 */
export function hydrateMonthlyData(raw: unknown, origin: DataOrigin): MonthlyData {
  const base = raw as Record<string, unknown>
  return {
    origin,
    stores: objectToMap(base.stores),
    suppliers: objectToMap(base.suppliers),
    settings: objectToMap(base.settings),
    budget: hydrateBudgetMap(base.budget),
    classifiedSales: (base.classifiedSales as MonthlyData['classifiedSales']) ?? { records: [] },
    purchase: (base.purchase as MonthlyData['purchase']) ?? { records: [] },
    interStoreIn: (base.interStoreIn as MonthlyData['interStoreIn']) ?? { records: [] },
    interStoreOut: (base.interStoreOut as MonthlyData['interStoreOut']) ?? { records: [] },
    flowers: (base.flowers as MonthlyData['flowers']) ?? { records: [] },
    directProduce: (base.directProduce as MonthlyData['directProduce']) ?? { records: [] },
    consumables: (base.consumables as MonthlyData['consumables']) ?? { records: [] },
    categoryTimeSales: (base.categoryTimeSales as MonthlyData['categoryTimeSales']) ?? {
      records: [],
    },
    departmentKpi: (base.departmentKpi as MonthlyData['departmentKpi']) ?? { records: [] },
  }
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
