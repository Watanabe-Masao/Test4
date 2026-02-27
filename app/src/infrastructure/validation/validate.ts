/**
 * レコード配列のバリデーションユーティリティ
 *
 * 大量データ（10万行超）を効率的に検証するためのサンプリング方式を提供する。
 */
import type { ZodSchema } from 'zod'

export interface ValidationError {
  readonly index: number
  readonly message: string
}

export interface ValidationResult {
  readonly invalidCount: number
  readonly errors: readonly ValidationError[]
}

/**
 * レコード配列を全件検証する。
 *
 * @param maxErrors 記録するエラーの上限（メモリ保護）
 */
export function validateRecords(
  schema: ZodSchema,
  records: readonly unknown[],
  maxErrors: number = 50,
): ValidationResult {
  const errors: ValidationError[] = []
  let invalidCount = 0

  for (let i = 0; i < records.length; i++) {
    const result = schema.safeParse(records[i])
    if (!result.success) {
      invalidCount++
      if (errors.length < maxErrors) {
        errors.push({ index: i, message: result.error.message })
      }
    }
  }

  return { invalidCount, errors }
}

/**
 * レコード配列をサンプリング検証する。
 *
 * 先頭・末尾・中間からサンプルを抽出し safeParse する。
 * サンプルで異常を検出した場合のみ全件検証にフォールバックする。
 *
 * @param sampleSize 抽出するサンプル数（デフォルト 30）
 */
export function validateRecordsSampled(
  schema: ZodSchema,
  records: readonly unknown[],
  sampleSize: number = 30,
): ValidationResult {
  if (records.length === 0) {
    return { invalidCount: 0, errors: [] }
  }

  // 配列がサンプルサイズの2倍以下なら全件検証
  if (records.length <= sampleSize * 2) {
    return validateRecords(schema, records)
  }

  // サンプル抽出: 先頭 1/3 + 末尾 1/3 + ランダム中間 1/3
  const third = Math.max(1, Math.floor(sampleSize / 3))
  const indices = new Set<number>()

  // 先頭
  for (let i = 0; i < third && i < records.length; i++) {
    indices.add(i)
  }
  // 末尾
  for (let i = Math.max(0, records.length - third); i < records.length; i++) {
    indices.add(i)
  }
  // ランダム中間（決定論的シード: 配列長ベース）
  let seed = records.length
  while (indices.size < sampleSize && indices.size < records.length) {
    // 簡易 LCG（再現可能にするため Math.random を避ける）
    seed = (seed * 1664525 + 1013904223) >>> 0
    indices.add(seed % records.length)
  }

  // サンプル検証
  for (const i of indices) {
    const result = schema.safeParse(records[i])
    if (!result.success) {
      // 異常検出 → 全件フォールバック
      return validateRecords(schema, records)
    }
  }

  // サンプル通過 → 全件信頼
  return { invalidCount: 0, errors: [] }
}
