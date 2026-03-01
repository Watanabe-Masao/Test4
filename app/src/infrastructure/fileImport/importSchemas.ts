/**
 * Import boundary validation schemas (zod)
 *
 * processFileData() の先頭で生データの構造チェックを行い、
 * 不正な形式のファイルを早期に弾く。
 *
 * 構造検証ルール（minRows/minCols/label）は FileTypeDetector.ts の
 * FILE_TYPE_REGISTRY に一元管理されている。
 */
import { z } from 'zod'
import type { DataType } from '@/domain/models'
import { getStructuralRules } from './FileTypeDetector'

/** 生の行データ: unknown[][] */
const rowsBase = z.array(z.array(z.unknown()))

/**
 * データ種別ごとの最低行数・最低列数。
 * FILE_TYPE_REGISTRY から生成される。
 */
export const STRUCTURAL_RULES: Record<
  DataType,
  { minRows: number; minCols: number; label: string }
> = getStructuralRules()

/**
 * 指定された DataType に対して生データの構造を検証する。
 *
 * @throws ImportSchemaError 最低行数・列数を満たさない場合
 */
export function validateRawRows(
  type: DataType,
  rows: readonly unknown[][],
  filename: string,
): void {
  const rule = STRUCTURAL_RULES[type]
  if (!rule) return

  // 行数チェック
  const parsed = rowsBase.min(rule.minRows).safeParse(rows)
  if (!parsed.success) {
    throw new ImportSchemaError(
      `${rule.label}の行数が不足しています（最低${rule.minRows}行必要、${rows.length}行）`,
      type,
      filename,
    )
  }

  // 列数チェック: いずれかの行が最低列数を満たしていること
  const maxCols = rows.reduce((max, row) => Math.max(max, row.length), 0)
  if (maxCols < rule.minCols) {
    throw new ImportSchemaError(
      `${rule.label}の列数が不足しています（最低${rule.minCols}列必要、最大${maxCols}列）`,
      type,
      filename,
    )
  }

  // データ行にも最低1行は非空であることを確認
  const dataRows = rows.slice(1)
  const hasNonEmpty = dataRows.some(
    (row) => row.length > 0 && row.some((cell) => cell != null && cell !== ''),
  )
  if (!hasNonEmpty) {
    throw new ImportSchemaError(`${rule.label}にデータ行が含まれていません`, type, filename)
  }
}

/** スキーマ検証エラー */
export class ImportSchemaError extends Error {
  readonly dataType: DataType
  readonly filename: string

  constructor(message: string, dataType: DataType, filename: string) {
    super(message)
    this.name = 'ImportSchemaError'
    this.dataType = dataType
    this.filename = filename
  }
}
