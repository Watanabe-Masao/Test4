/**
 * Import boundary validation schemas (zod)
 *
 * processFileData() の先頭で生データの構造チェックを行い、
 * 不正な形式のファイルを早期に弾く。
 */
import { z } from 'zod'
import type { DataType } from '@/domain/models'

/** 生の行データ: unknown[][] */
const rowsBase = z.array(z.array(z.unknown()))

/**
 * データ種別ごとの最低行数・最低列数。
 * ヘッダ行 + 最低1データ行 を保証する。
 */
const STRUCTURAL_RULES: Record<DataType, { minRows: number; minCols: number; label: string }> = {
  purchase:                  { minRows: 3, minCols: 4,  label: '仕入データ' },
  sales:                     { minRows: 4, minCols: 4,  label: '売上データ' },
  discount:                  { minRows: 3, minCols: 3,  label: '売変データ' },
  salesDiscount:             { minRows: 3, minCols: 3,  label: '売上売変データ' },
  prevYearSalesDiscount:     { minRows: 3, minCols: 3,  label: '前年売上売変データ' },
  initialSettings:           { minRows: 2, minCols: 2,  label: '初期設定データ' },
  budget:                    { minRows: 2, minCols: 2,  label: '予算データ' },
  interStoreIn:              { minRows: 2, minCols: 3,  label: '店間入庫データ' },
  interStoreOut:             { minRows: 2, minCols: 3,  label: '店間出庫データ' },
  flowers:                   { minRows: 2, minCols: 2,  label: '花卉データ' },
  directProduce:             { minRows: 2, minCols: 2,  label: '産直データ' },
  consumables:               { minRows: 2, minCols: 2,  label: '消耗品データ' },
  categoryTimeSales:         { minRows: 4, minCols: 5,  label: '分類別時間帯売上データ' },
  prevYearCategoryTimeSales: { minRows: 4, minCols: 5,  label: '前年分類別時間帯売上データ' },
  departmentKpi:             { minRows: 2, minCols: 5,  label: '部門別KPIデータ' },
}

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
  // （ヘッダ行がラベルのみで短い形式もあるため、全行の最大幅で判定）
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
    throw new ImportSchemaError(
      `${rule.label}にデータ行が含まれていません`,
      type,
      filename,
    )
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
