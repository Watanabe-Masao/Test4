/**
 * explanationHelpers
 *
 * generateExplanations で使用するヘルパー関数群。
 * 日別エビデンス・日別内訳・構成内訳など、Explanation 構築に共通の処理を提供する。
 */
import type {
  Explanation,
  ExplanationInput,
  EvidenceRef,
  BreakdownEntry,
  BreakdownDetail,
  MetricId,
  DailyRecord,
} from '@/domain/models'

/** ExplanationInput を簡潔に構築する */
export function inp(
  name: string,
  value: number,
  unit: Explanation['unit'],
  metric?: MetricId,
): ExplanationInput {
  return { name, value, unit, metric }
}

/** 日別データから EvidenceRef 配列を生成する */
export function dailyEvidence(
  dataType: EvidenceRef & { kind: 'daily' } extends { dataType: infer T } ? T : never,
  storeId: string,
  daily: ReadonlyMap<number, unknown>,
): EvidenceRef[] {
  const refs: EvidenceRef[] = []
  for (const day of daily.keys()) {
    refs.push({ kind: 'daily', dataType, storeId, day })
  }
  return refs
}

/** 日別レコードから BreakdownEntry 配列を生成する */
export function dailyBreakdown(
  daily: ReadonlyMap<number, DailyRecord>,
  getter: (rec: DailyRecord) => number,
  detailsGetter?: (rec: DailyRecord) => BreakdownDetail[],
): BreakdownEntry[] {
  const entries: BreakdownEntry[] = []
  for (const [day, rec] of daily) {
    const entry: BreakdownEntry = {
      day,
      value: getter(rec),
      details: detailsGetter?.(rec),
    }
    entries.push(entry)
  }
  return entries.sort((a, b) => a.day - b.day)
}

/** 仕入日別の取引先内訳を生成 */
export function supplierDetails(rec: DailyRecord): BreakdownDetail[] {
  const details: BreakdownDetail[] = []
  for (const [code, cp] of rec.supplierBreakdown) {
    details.push({ label: `取引先 ${code}`, value: cp.cost, unit: 'yen' })
  }
  return details
}

/**
 * 原価日別の構成内訳を生成
 *
 * getDailyTotalCost と同じ構成要素を列挙する。
 * getDailyTotalCost は全コンポーネントを加算するため、
 * ここでも符号を変えずにそのまま表示する。
 */
export function costComponentDetails(rec: DailyRecord): BreakdownDetail[] {
  const details: BreakdownDetail[] = []
  if (rec.purchase.cost !== 0)
    details.push({ label: '仕入原価', value: rec.purchase.cost, unit: 'yen' })
  if (rec.interStoreIn.cost !== 0)
    details.push({ label: '店間入', value: rec.interStoreIn.cost, unit: 'yen' })
  if (rec.interStoreOut.cost !== 0)
    details.push({ label: '店間出', value: rec.interStoreOut.cost, unit: 'yen' })
  if (rec.interDepartmentIn.cost !== 0)
    details.push({ label: '部門間入', value: rec.interDepartmentIn.cost, unit: 'yen' })
  if (rec.interDepartmentOut.cost !== 0)
    details.push({ label: '部門間出', value: rec.interDepartmentOut.cost, unit: 'yen' })
  if (rec.deliverySales.cost !== 0)
    details.push({ label: '売上納品原価', value: rec.deliverySales.cost, unit: 'yen' })
  return details
}

/** 売上日別の構成内訳を生成 */
export function salesComponentDetails(rec: DailyRecord): BreakdownDetail[] {
  const details: BreakdownDetail[] = []
  details.push({ label: 'コア売上', value: rec.coreSales, unit: 'yen' })
  if (rec.flowers.price !== 0)
    details.push({ label: '花売価', value: rec.flowers.price, unit: 'yen' })
  if (rec.directProduce.price !== 0)
    details.push({ label: '産直売価', value: rec.directProduce.price, unit: 'yen' })
  if (rec.deliverySales.price !== 0)
    details.push({ label: '売上納品売価', value: rec.deliverySales.price, unit: 'yen' })
  return details
}

/**
 * aggregate storeId の場合、全店舗分の dailyEvidence を展開する
 */
export function expandDailyEvidence(
  dataType: EvidenceRef & { kind: 'daily' } extends { dataType: infer T } ? T : never,
  storeId: string,
  daily: ReadonlyMap<number, unknown>,
  storeIds: readonly string[],
): EvidenceRef[] {
  if (storeId !== 'aggregate' || storeIds.length === 0) {
    return dailyEvidence(dataType, storeId, daily)
  }
  const refs: EvidenceRef[] = []
  for (const sid of storeIds) {
    for (const day of daily.keys()) {
      refs.push({ kind: 'daily', dataType, storeId: sid, day })
    }
  }
  return refs
}
