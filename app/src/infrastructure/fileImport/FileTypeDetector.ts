import type { DataType } from '@/domain/models'

/**
 * ファイル種別自動判定
 */

interface FileTypeRule {
  readonly type: DataType
  readonly name: string
  readonly filenamePatterns: readonly string[]
  readonly headerPatterns: readonly string[]
}

const FILE_TYPE_RULES: readonly FileTypeRule[] = [
  // 花・産直はヘッダーが同一のためファイル名で先に判定する
  {
    type: 'flowers',
    name: '花',
    filenamePatterns: ['花', 'hana'],
    headerPatterns: ['販売金額'],
  },
  {
    type: 'directProduce',
    name: '産直',
    filenamePatterns: ['産直', 'sanchoku'],
    headerPatterns: ['販売金額'],
  },
  {
    type: 'purchase',
    name: '仕入',
    filenamePatterns: ['仕入', 'shiire'],
    headerPatterns: ['取引先コード', '原価金額', '売価金額'],
  },
  // 売上売変の複合ファイルを sales / discount より先に判定する
  {
    type: 'salesDiscount',
    name: '売上売変',
    filenamePatterns: ['売上売変', 'uriage_baihen', 'uriageBaihen'],
    headerPatterns: [],
  },
  {
    type: 'sales',
    name: '売上',
    filenamePatterns: ['売上', 'uriage'],
    headerPatterns: ['販売金額', '売上'],
  },
  {
    type: 'discount',
    name: '売変',
    filenamePatterns: ['売変', 'baihen'],
    headerPatterns: ['売変合計', '値引'],
  },
  {
    type: 'initialSettings',
    name: '初期設定',
    filenamePatterns: ['初期', '設定', 'setting'],
    headerPatterns: ['期首', '期末'],
  },
  {
    type: 'budget',
    name: '予算',
    filenamePatterns: ['予算', 'budget'],
    headerPatterns: ['予算'],
  },
  {
    type: 'interStoreIn',
    name: '店間入',
    filenamePatterns: ['店間入', '入庫'],
    headerPatterns: ['店コードIN', '店舗コードIN'],
  },
  {
    type: 'interStoreOut',
    name: '店間出',
    filenamePatterns: ['店間出', '出庫'],
    headerPatterns: ['店コードOUT', '店舗コードOUT'],
  },
  {
    type: 'consumables',
    name: '消耗品',
    filenamePatterns: ['消耗', 'consumable'],
    headerPatterns: [],
  },
] as const

/**
 * ファイル名からデータ種別を判定する
 */
function matchByFilename(filename: string): DataType | null {
  const lower = filename.toLowerCase()
  for (const rule of FILE_TYPE_RULES) {
    if (rule.filenamePatterns.some((p) => lower.includes(p.toLowerCase()))) {
      return rule.type
    }
  }
  return null
}

/**
 * ヘッダー行からデータ種別を判定する
 */
function matchByHeader(rows: readonly unknown[][]): DataType | null {
  if (rows.length === 0) return null

  // 先頭3行を検査対象にする
  const headerText = rows
    .slice(0, 3)
    .flat()
    .map((cell) => String(cell ?? ''))
    .join(' ')

  for (const rule of FILE_TYPE_RULES) {
    if (rule.headerPatterns.length === 0) continue
    if (rule.headerPatterns.some((p) => headerText.includes(p))) {
      return rule.type
    }
  }
  return null
}

/** 判定結果 */
export interface DetectionResult {
  readonly type: DataType | null
  readonly confidence: 'filename' | 'header' | 'none'
  readonly ruleName: string | null
}

/**
 * ファイル種別を自動判定する
 *
 * 判定順序:
 * 1. ファイル名パターンマッチ（優先）
 * 2. ヘッダーパターンマッチ
 */
export function detectFileType(filename: string, rows: readonly unknown[][]): DetectionResult {
  // 1. ファイル名で判定（花・産直はヘッダーが同一のためこちらを優先）
  const byFilename = matchByFilename(filename)
  if (byFilename) {
    const rule = FILE_TYPE_RULES.find((r) => r.type === byFilename)
    return { type: byFilename, confidence: 'filename', ruleName: rule?.name ?? null }
  }

  // 2. ヘッダーで判定
  const byHeader = matchByHeader(rows)
  if (byHeader) {
    const rule = FILE_TYPE_RULES.find((r) => r.type === byHeader)
    return { type: byHeader, confidence: 'header', ruleName: rule?.name ?? null }
  }

  return { type: null, confidence: 'none', ruleName: null }
}

/**
 * データ種別の表示名を取得
 */
export function getDataTypeName(type: DataType): string {
  const rule = FILE_TYPE_RULES.find((r) => r.type === type)
  return rule?.name ?? type
}
