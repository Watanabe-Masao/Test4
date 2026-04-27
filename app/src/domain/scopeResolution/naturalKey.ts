/**
 * Natural Key 生成 — レコードの一意識別子
 *
 * データ種別ごとにレコードの一意キーを生成する。
 * 区切り文字はタブ `\t`（既存の classifiedSalesRecordKey と統一）。
 *
 * 既存の classifiedSalesRecordKey / categoryTimeSalesRecordKey とは別関数として定義する。
 * 理由: 既存関数は prefix なし。ここでは全種別を一意にするため prefix を付与する。
 *
 * @responsibility R:unclassified
 */

import type { DatedRecord, CategoryTimeSalesRecord } from '../models/DataTypes'
import type { ClassifiedSalesRecord } from '../models/ClassifiedSales'
import type { RecordStorageDataType } from '../models/ScopeResolution'

const SEP = '\t'

// ─── 種別別 Natural Key ──────────────────────────────────────

function purchaseKey(r: DatedRecord): string {
  return `purchase${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}`
}

function classifiedSalesKey(r: ClassifiedSalesRecord): string {
  return `cs${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}${SEP}${r.groupName}${SEP}${r.departmentName}${SEP}${r.lineName}${SEP}${r.className}`
}

function categoryTimeSalesKey(r: CategoryTimeSalesRecord): string {
  return `cts${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}${SEP}${r.department.code}${SEP}${r.line.code}${SEP}${r.klass.code}`
}

function flowersKey(r: DatedRecord): string {
  return `flowers${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}`
}

function directProduceKey(r: DatedRecord): string {
  return `dp${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}`
}

function interStoreInKey(r: DatedRecord): string {
  return `isi${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}`
}

function interStoreOutKey(r: DatedRecord): string {
  return `iso${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}`
}

function consumablesKey(r: DatedRecord): string {
  return `con${SEP}${r.year}${SEP}${r.month}${SEP}${r.day}${SEP}${r.storeId}`
}

// ─── ディスパッチ ────────────────────────────────────────────

/**
 * データ種別とレコードから Natural Key を生成する。
 * 全種別で prefix + タブ区切り形式。
 */
export function naturalKey(dataType: RecordStorageDataType, record: DatedRecord): string {
  switch (dataType) {
    case 'purchase':
      return purchaseKey(record)
    case 'classifiedSales':
      return classifiedSalesKey(record as ClassifiedSalesRecord)
    case 'categoryTimeSales':
      return categoryTimeSalesKey(record as CategoryTimeSalesRecord)
    case 'flowers':
      return flowersKey(record)
    case 'directProduce':
      return directProduceKey(record)
    case 'interStoreIn':
      return interStoreInKey(record)
    case 'interStoreOut':
      return interStoreOutKey(record)
    case 'consumables':
      return consumablesKey(record)
  }
}
