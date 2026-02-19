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
  // 予算は「売上予算」を含むため sales より先に判定する
  {
    type: 'budget',
    name: '予算',
    filenamePatterns: ['売上予算', '予算', 'budget'],
    headerPatterns: ['売上予算', '予算'],
  },
  // 前年売上売変を salesDiscount より先に判定する（「前年」キーワードで区別）
  {
    type: 'prevYearSalesDiscount',
    name: '前年売上売変',
    filenamePatterns: ['前年売上売変', '前年売上', 'prev_uriage'],
    headerPatterns: [],
  },
  // 売上売変客数の複合ファイル（客数を含む新形式も同一タイプで処理）
  {
    type: 'salesDiscount',
    name: '売上売変',
    filenamePatterns: ['売上売変客数', '売上売変', 'uriage_baihen', 'uriageBaihen'],
    headerPatterns: [],
  },
  // 分類別時間帯売上（消耗品の前に配置 — 8. vs 8_ の競合防止）
  {
    type: 'categoryTimeSales',
    name: '分類別時間帯売上',
    filenamePatterns: ['分類別時間帯売上', '時間帯売上'],
    headerPatterns: ['取引時間', '【ライン】', '【クラス】'],
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
 * 命名規則によるプレフィックス判定: 0_売上予算.xlsx, 1_売上売変.xlsx, ...
 */
const PREFIX_RULES: readonly { prefix: string; type: DataType }[] = [
  { prefix: '0_', type: 'budget' },
  { prefix: '1_', type: 'salesDiscount' },
  { prefix: '2_', type: 'purchase' },
  { prefix: '3_', type: 'flowers' },
  { prefix: '4_', type: 'directProduce' },
  { prefix: '5_', type: 'interStoreIn' },
  { prefix: '6_', type: 'interStoreOut' },
  { prefix: '7_', type: 'initialSettings' },
  { prefix: '8_', type: 'consumables' },
  { prefix: '998_', type: 'prevYearSalesDiscount' },
]

/**
 * ファイル名からデータ種別を判定する
 */
function matchByFilename(filename: string): DataType | null {
  const basename = filename.replace(/^.*[\\/]/, '')

  // 分類別時間帯売上: "8.分類別時間帯売上" (例: 8.分類別時間帯売上260201.csv)
  if (/^8\.分類別/.test(basename) || /^8\..*時間帯/.test(basename)) return 'categoryTimeSales'

  // 消耗品: 先頭2桁数字 + "消耗品" (例: 01消耗品_260130.xls)
  if (/^\d{2}消耗/.test(basename)) return 'consumables'

  // キーワードマッチ（優先: ファイル名に明示的なデータ種別名がある場合）
  // ※ プレフィックス番号がユーザー環境と異なる場合でも正しく判定できる
  const lower = filename.toLowerCase()
  for (const rule of FILE_TYPE_RULES) {
    if (rule.filenamePatterns.some((p) => lower.includes(p.toLowerCase()))) {
      return rule.type
    }
  }

  // 命名規則プレフィックス判定（フォールバック: キーワードで判定できない場合）
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
