/**
 * Phase 15a: テンプレートCSVダウンロード
 *
 * 各データ種別のインポート用CSVテンプレートを生成し、ダウンロードさせる。
 * ヘッダー行のみを持つ空テンプレートで、各プロセッサが期待する列構造に合致する。
 */
import type { DataType } from '@/domain/models'
import { toCsvString, downloadCsv } from './csvExporter'

/**
 * 各データ種別のテンプレート列ヘッダー定義。
 * インポートプロセッサが期待する列構造に対応する。
 */
const TEMPLATE_HEADERS: Partial<Record<DataType, readonly string[]>> = {
  purchase: ['取引先コード', '', '', '0000001:取引先名', '', '0000002:取引先名', ''],
  classifiedSales: [
    '日付',
    '店舗名称',
    'グループ名称',
    '部門名称',
    'ライン名称',
    'クラス名称',
    '販売金額',
    '71売変',
    '72売変',
    '73売変',
    '74売変',
  ],
  flowers: ['', '', '', '0001:店舗名', ''],
  directProduce: ['', '', '', '0001:店舗名', ''],
  interStoreOut: ['日付', '店コードOUT', '店コードIN', '部門コード', '原価金額', '売価金額'],
  interStoreIn: ['店コードIN', '日付', '店コードOUT', '原価金額', '売価金額'],
  budget: ['店舗コード', '日付', '売上予算'],
  categoryTimeSales: ['', '', '', '', '', '【取引時間】', '', '9:00', '', '10:00', ''],
  consumables: ['勘定コード', '品目コード', '品目名', '数量', '原価', '日付'],
}

/**
 * テンプレートCSVの2行目（サブヘッダー / サンプルデータ）
 */
const TEMPLATE_SUBHEADERS: Partial<Record<DataType, readonly (readonly string[])[]>> = {
  purchase: [
    ['', '', '', '0001:店舗名A', '', '0001:店舗名A', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['2026/1/1', '', '', '原価金額', '売価金額', '原価金額', '売価金額'],
  ],
  classifiedSales: [
    [
      '2026/1/1',
      '0001:店舗名',
      'グループA',
      '部門A',
      'ラインA',
      'クラスA',
      '10000',
      '0',
      '0',
      '0',
      '0',
    ],
  ],
  flowers: [
    ['', '', '', '販売金額', '来店客数'],
    ['', '', '', '', ''],
    ['2026/1/1', '', '', '10000', '100'],
  ],
  directProduce: [
    ['', '', '', '販売金額', ''],
    ['', '', '', '', ''],
    ['2026/1/1', '', '', '10000', ''],
  ],
  interStoreOut: [['2026/1/1', '0001', '0002', '001', '10000', '12000']],
  interStoreIn: [['0001', '2026/1/1', '0002', '10000', '12000']],
  budget: [['0001', '2026/1/1', '100000']],
  categoryTimeSales: [
    ['', '', '', '', '', '数量', '金額', '数量', '金額', '数量', '金額'],
    [
      '【期間】',
      '【店舗】',
      '【部門】',
      '【ライン】',
      '【クラス】',
      '数量',
      '金額',
      '数量',
      '金額',
      '数量',
      '金額',
    ],
    [
      '2026年01月01日(月)',
      '0001:店舗名',
      '000001:部門名',
      '000101:ライン名',
      '010101:クラス名',
      '10',
      '10000',
      '5',
      '5000',
      '5',
      '5000',
    ],
  ],
  consumables: [['81257', '001', '消耗品A', '1', '500', '2026/1/1']],
}

/**
 * 各データ種別の日本語説明
 */
export const TEMPLATE_DESCRIPTIONS: Partial<Record<DataType, string>> = {
  purchase: '仕入データ（取引先別・店舗別・日別の原価/売価）',
  classifiedSales: '分類別売上データ（日付・店舗・分類階層・販売金額・売変）',
  flowers: '花卉売上納品データ（店舗別・日別の販売金額・客数）',
  directProduce: '産直売上納品データ（店舗別・日別の販売金額）',
  interStoreOut: '店間出庫データ（日付・出庫元・入庫先・原価・売価）',
  interStoreIn: '店間入庫データ（入庫先・日付・出庫元・原価・売価）',
  budget: '売上予算データ（店舗コード・日付・予算金額）',
  categoryTimeSales: '分類別時間帯売上データ（時間帯別の数量・金額）',
  consumables: '消耗品データ（勘定コード・品目・数量・原価・日付）',
}

/**
 * テンプレートファイル名
 */
const TEMPLATE_FILENAMES: Partial<Record<DataType, string>> = {
  purchase: 'テンプレート_仕入',
  classifiedSales: 'テンプレート_分類別売上',
  flowers: 'テンプレート_売上納品_花',
  directProduce: 'テンプレート_売上納品_産直',
  interStoreOut: 'テンプレート_店間出',
  interStoreIn: 'テンプレート_店間入',
  budget: 'テンプレート_売上予算',
  categoryTimeSales: 'テンプレート_分類別時間帯売上',
  consumables: 'テンプレート_消耗品',
}

/** テンプレートダウンロード対応データ種別 */
export type TemplateDataType = Exclude<DataType, 'initialSettings' | 'departmentKpi'>

/** テンプレートが利用可能なデータ種別の一覧 */
export const TEMPLATE_TYPES: readonly TemplateDataType[] = [
  'purchase',
  'classifiedSales',
  'flowers',
  'directProduce',
  'interStoreOut',
  'interStoreIn',
  'budget',
  'categoryTimeSales',
  'consumables',
] as const

/** テンプレートの表示ラベル */
export const TEMPLATE_LABELS: Record<TemplateDataType, string> = {
  purchase: '仕入',
  classifiedSales: '分類別売上',
  flowers: '花卉',
  directProduce: '産直',
  interStoreOut: '店間出',
  interStoreIn: '店間入',
  budget: '売上予算',
  categoryTimeSales: '時間帯売上',
  consumables: '消耗品',
}

/**
 * 指定されたデータ種別のCSVテンプレートをダウンロードする。
 *
 * @param dataType ダウンロード対象のデータ種別
 */
export function downloadTemplate(dataType: DataType): void {
  const headers = TEMPLATE_HEADERS[dataType]
  if (!headers) return

  const rows: (readonly string[])[] = [headers]

  const subHeaders = TEMPLATE_SUBHEADERS[dataType]
  if (subHeaders) {
    for (const row of subHeaders) {
      rows.push(row)
    }
  }

  const csvContent = toCsvString(rows)
  const filename = TEMPLATE_FILENAMES[dataType] ?? `テンプレート_${dataType}`

  downloadCsv(csvContent, { filename })
}
