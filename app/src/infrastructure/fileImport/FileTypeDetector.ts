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
    name: '売上納品_花',
    filenamePatterns: ['売上納品_花', '花', 'hana'],
    headerPatterns: ['販売金額'],
  },
  {
    type: 'directProduce',
    name: '売上納品_産直',
    filenamePatterns: ['売上納品_産直', '産直', 'sanchoku'],
    headerPatterns: ['販売金額'],
  },
  {
    type: 'purchase',
    name: '仕入',
    filenamePatterns: ['仕入', 'shiire'],
    headerPatterns: ['取引先コード', '原価金額', '売価金額'],
  },
  // 予算は「売上予算」を含むため先に判定する
  {
    type: 'budget',
    name: '売上予算',
    filenamePatterns: ['売上予算', '予算', 'budget'],
    headerPatterns: ['売上予算', '予算'],
  },
  // 分類別売上（旧「売上売変客数」を置換）
  {
    type: 'classifiedSales',
    name: '分類別売上',
    filenamePatterns: [
      '分類別売上',
      '売上売変客数',
      '売上売変',
      'bunruibetsu',
      'uriage_baihen',
      'uriageBaihen',
    ],
    headerPatterns: ['グループ名称', '部門名称', 'ライン名称', 'クラス名称'],
  },
  // 分類別時間帯売上（消耗品の前に配置 — 7. vs 8. の競合防止）
  {
    type: 'categoryTimeSales',
    name: '分類別時間帯売上',
    filenamePatterns: ['分類別時間帯売上', '時間帯売上'],
    headerPatterns: ['取引時間', '【ライン】', '【クラス】'],
  },
  {
    type: 'initialSettings',
    name: '初期設定',
    filenamePatterns: ['初期', '設定', 'setting'],
    headerPatterns: ['期首', '期末'],
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
  {
    type: 'departmentKpi',
    name: '部門別KPI',
    filenamePatterns: ['部門別', '部門KPI', 'dept_kpi', 'departmentKpi'],
    headerPatterns: ['粗利率予算', '値入', '機首在庫'],
  },
] as const

/**
 * 命名規則によるプレフィックス判定
 */
const PREFIX_RULES: readonly { prefix: string; type: DataType }[] = [
  { prefix: '0_', type: 'budget' },
  { prefix: '1_', type: 'classifiedSales' },
  { prefix: '2_', type: 'flowers' },
  { prefix: '3_', type: 'directProduce' },
  { prefix: '4_', type: 'interStoreOut' },
  { prefix: '5_', type: 'interStoreIn' },
  { prefix: '6_', type: 'purchase' },
  { prefix: '999_', type: 'initialSettings' },
]

/**
 * ファイル名からデータ種別を判定する
 */
function matchByFilename(filename: string): DataType | null {
  const basename = filename.replace(/^.*[\\/]/, '')

  // 分類別時間帯売上: "7.分類別時間帯売上" or "8.分類別時間帯売上"
  // 注: /^\d+\.分類別/ は "1.分類別売上" も誤って categoryTimeSales に分類するため、
  // "時間帯" を含むパターンに限定する
  if (/^\d+\.分類別時間帯/.test(basename) || /^\d+\..*時間帯/.test(basename))
    return 'categoryTimeSales'

  // 消耗品: "8.消耗品" or 先頭2桁数字 + "消耗品"
  if (/^\d+\.消耗/.test(basename) || /^\d{2}消耗/.test(basename)) return 'consumables'

  // キーワードマッチ
  const lower = filename.toLowerCase()
  for (const rule of FILE_TYPE_RULES) {
    if (rule.filenamePatterns.some((p) => lower.includes(p.toLowerCase()))) {
      return rule.type
    }
  }

  // プレフィックス判定（フォールバック）
  for (const rule of PREFIX_RULES) {
    if (basename.startsWith(rule.prefix)) return rule.type
  }

  return null
}

/**
 * ヘッダー行からデータ種別を判定する
 */
function matchByHeader(rows: readonly unknown[][]): DataType | null {
  if (rows.length === 0) return null

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
 */
export function detectFileType(filename: string, rows: readonly unknown[][]): DetectionResult {
  const byFilename = matchByFilename(filename)
  if (byFilename) {
    const rule = FILE_TYPE_RULES.find((r) => r.type === byFilename)
    return { type: byFilename, confidence: 'filename', ruleName: rule?.name ?? null }
  }

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
