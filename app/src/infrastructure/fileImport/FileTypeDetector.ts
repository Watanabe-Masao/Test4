import type { DataType } from '@/domain/models'

/**
 * ファイル種別自動判定 — 統合レジストリ
 *
 * 全ての DataType に関する情報（判定ルール + 構造検証パラメータ）を
 * FILE_TYPE_REGISTRY に一元管理する。
 */

/** ファイル種別エントリ */
export interface FileTypeEntry {
  readonly type: DataType
  readonly name: string
  readonly filenamePatterns: readonly string[]
  readonly headerPatterns: readonly string[]
  /** 数値プレフィックス（"0_" 等）によるフォールバック判定 */
  readonly prefix?: string
  /** 特殊な正規表現パターン（basename に対して適用） */
  readonly filenameRegex?: RegExp
  /** 構造検証: 最低行数 */
  readonly minRows: number
  /** 構造検証: 最低列数 */
  readonly minCols: number
}

/**
 * 統合レジストリ — DataType ごとの判定ルール + 構造検証パラメータ
 *
 * 配列順序は判定優先度を表す。
 * 花・産直はヘッダーが同一のためファイル名で先に判定する。
 * 予算は「売上予算」を含むため classifiedSales より先に配置する。
 */
export const FILE_TYPE_REGISTRY: readonly FileTypeEntry[] = [
  {
    type: 'flowers',
    name: '売上納品_花',
    filenamePatterns: ['売上納品_花', '花', 'hana'],
    headerPatterns: ['販売金額'],
    prefix: '2_',
    minRows: 2,
    minCols: 2,
  },
  {
    type: 'directProduce',
    name: '売上納品_産直',
    filenamePatterns: ['売上納品_産直', '産直', 'sanchoku'],
    headerPatterns: ['販売金額'],
    prefix: '3_',
    minRows: 2,
    minCols: 2,
  },
  {
    type: 'purchase',
    name: '仕入',
    filenamePatterns: ['仕入', 'shiire'],
    headerPatterns: ['取引先コード', '原価金額', '売価金額'],
    prefix: '6_',
    minRows: 3,
    minCols: 4,
  },
  {
    type: 'budget',
    name: '売上予算',
    filenamePatterns: ['売上予算', '予算', 'budget'],
    headerPatterns: ['売上予算', '予算'],
    prefix: '0_',
    minRows: 2,
    minCols: 2,
  },
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
    prefix: '1_',
    minRows: 2,
    minCols: 7,
  },
  {
    type: 'categoryTimeSales',
    name: '分類別時間帯売上',
    filenamePatterns: ['分類別時間帯売上', '時間帯売上'],
    headerPatterns: ['取引時間', '【ライン】', '【クラス】'],
    filenameRegex: /^\d+\..*時間帯/,
    minRows: 4,
    minCols: 5,
  },
  {
    type: 'initialSettings',
    name: '初期設定',
    filenamePatterns: ['初期', '設定', 'setting'],
    headerPatterns: ['期首', '期末'],
    prefix: '999_',
    minRows: 2,
    minCols: 2,
  },
  {
    type: 'interStoreIn',
    name: '店間入',
    filenamePatterns: ['店間入', '入庫'],
    headerPatterns: ['店コードIN', '店舗コードIN'],
    prefix: '5_',
    minRows: 2,
    minCols: 3,
  },
  {
    type: 'interStoreOut',
    name: '店間出',
    filenamePatterns: ['店間出', '出庫'],
    headerPatterns: ['店コードOUT', '店舗コードOUT'],
    prefix: '4_',
    minRows: 2,
    minCols: 3,
  },
  {
    type: 'consumables',
    name: '原価算入費',
    filenamePatterns: ['消耗', 'consumable', '原価算入'],
    headerPatterns: [],
    filenameRegex: /^\d+\.消耗|^\d{2}消耗/,
    minRows: 2,
    minCols: 2,
  },
  {
    type: 'departmentKpi',
    name: '部門別KPI',
    filenamePatterns: ['部門別', '部門KPI', 'dept_kpi', 'departmentKpi'],
    headerPatterns: ['粗利率予算', '値入', '機首在庫'],
    minRows: 2,
    minCols: 5,
  },
]

// ─── 判定ロジック ─────────────────────────────────────────

/**
 * ファイル名からデータ種別を判定する
 */
function matchByFilename(filename: string): DataType | null {
  const basename = filename.replace(/^.*[\\/]/, '')

  // 正規表現パターンを先に判定（番号付きファイル名の競合防止）
  for (const entry of FILE_TYPE_REGISTRY) {
    if (entry.filenameRegex && entry.filenameRegex.test(basename)) {
      return entry.type
    }
  }

  // キーワードマッチ
  const lower = filename.toLowerCase()
  for (const entry of FILE_TYPE_REGISTRY) {
    if (entry.filenamePatterns.some((p) => lower.includes(p.toLowerCase()))) {
      return entry.type
    }
  }

  // プレフィックス判定（フォールバック）
  for (const entry of FILE_TYPE_REGISTRY) {
    if (entry.prefix && basename.startsWith(entry.prefix)) {
      return entry.type
    }
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

  for (const entry of FILE_TYPE_REGISTRY) {
    if (entry.headerPatterns.length === 0) continue
    if (entry.headerPatterns.some((p) => headerText.includes(p))) {
      return entry.type
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
    const entry = FILE_TYPE_REGISTRY.find((r) => r.type === byFilename)
    return { type: byFilename, confidence: 'filename', ruleName: entry?.name ?? null }
  }

  const byHeader = matchByHeader(rows)
  if (byHeader) {
    const entry = FILE_TYPE_REGISTRY.find((r) => r.type === byHeader)
    return { type: byHeader, confidence: 'header', ruleName: entry?.name ?? null }
  }

  return { type: null, confidence: 'none', ruleName: null }
}

/**
 * データ種別の表示名を取得
 */
export function getDataTypeName(type: DataType): string {
  const entry = FILE_TYPE_REGISTRY.find((r) => r.type === type)
  return entry?.name ?? type
}

/**
 * 構造検証ルールをレジストリから生成する。
 * importSchemas.ts から参照される。
 */
export function getStructuralRules(): Record<
  DataType,
  { minRows: number; minCols: number; label: string }
> {
  const rules = {} as Record<DataType, { minRows: number; minCols: number; label: string }>
  for (const entry of FILE_TYPE_REGISTRY) {
    rules[entry.type] = { minRows: entry.minRows, minCols: entry.minCols, label: entry.name }
  }
  return rules
}
