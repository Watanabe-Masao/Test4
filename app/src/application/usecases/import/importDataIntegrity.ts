/**
 * インポートデータの整合性チェック
 *
 * importValidation.ts から分離。
 * 分類別売上と分類別時間帯売上の照合、重複検出、階層整合性を担当する。
 */
import type { ValidationMessage } from '@/domain/models/record'
import type { DataSummaryInput } from '@/application/services/dataSummary'
import { classifiedSalesRecordKey, categoryTimeSalesRecordKey } from '@/domain/models/record'
import { AMOUNT_RECONCILIATION_TOLERANCE } from '@/domain/constants'

/**
 * 分類別売上と分類別時間帯売上の照合チェック
 *
 * Phase 1: 月次合計で乖離を検出（軽量）
 * Phase 2: 乖離がある場合のみ日別内訳を生成（詳細）
 */
export function validateReconciliation(data: DataSummaryInput): readonly ValidationMessage[] {
  const messages: ValidationMessage[] = []

  if (!data.categoryTimeSales?.records?.length || data.classifiedSales.records.length === 0) {
    return messages
  }

  // Phase 1: 月次合計
  let totalCSSum = 0
  let totalCtsSum = 0
  for (const rec of data.classifiedSales.records) {
    totalCSSum += rec.salesAmount
  }
  for (const rec of data.categoryTimeSales.records) {
    totalCtsSum += rec.totalAmount
  }

  if (totalCSSum <= 0 || totalCtsSum <= 0) return messages

  const divergence = Math.abs(totalCSSum - totalCtsSum)
  const divergenceRate = divergence / totalCSSum
  if (divergenceRate <= AMOUNT_RECONCILIATION_TOLERANCE) return messages

  // Phase 2: 日別乖離の内訳を生成
  const csByDay = new Map<number, number>()
  const ctsByDay = new Map<number, number>()
  for (const rec of data.classifiedSales.records) {
    csByDay.set(rec.day, (csByDay.get(rec.day) ?? 0) + rec.salesAmount)
  }
  for (const rec of data.categoryTimeSales.records) {
    ctsByDay.set(rec.day, (ctsByDay.get(rec.day) ?? 0) + rec.totalAmount)
  }

  const allDays = new Set<number>([...csByDay.keys(), ...ctsByDay.keys()])
  const sortedDays = [...allDays].sort((a, b) => a - b)

  const dailyDetails: string[] = []
  for (const day of sortedDays) {
    const csAmt = csByDay.get(day) ?? 0
    const ctsAmt = ctsByDay.get(day) ?? 0
    const dayDiv = Math.abs(csAmt - ctsAmt)
    if (csAmt === 0 && ctsAmt === 0) continue
    const dayRate = csAmt > 0 ? dayDiv / csAmt : ctsAmt > 0 ? 1 : 0
    if (dayRate > AMOUNT_RECONCILIATION_TOLERANCE || dayDiv > 1000) {
      const sign = ctsAmt >= csAmt ? '+' : '-'
      dailyDetails.push(
        `  ${day}日: 分類別 ${Math.round(csAmt).toLocaleString()}円 / 時間帯 ${Math.round(ctsAmt).toLocaleString()}円（差 ${sign}${Math.round(dayDiv).toLocaleString()}円, ${(dayRate * 100).toFixed(1)}%）`,
      )
    }
  }

  // 片方にしか存在しない日を検出
  const csOnlyDays = sortedDays.filter((d) => (csByDay.get(d) ?? 0) > 0 && !ctsByDay.has(d))
  const ctsOnlyDays = sortedDays.filter((d) => (ctsByDay.get(d) ?? 0) > 0 && !csByDay.has(d))
  if (csOnlyDays.length > 0) {
    dailyDetails.push(`  ※ 分類別売上のみ: ${csOnlyDays.join(', ')}日`)
  }
  if (ctsOnlyDays.length > 0) {
    dailyDetails.push(`  ※ 時間帯売上のみ: ${ctsOnlyDays.join(', ')}日`)
  }

  const details = [
    `月合計 — 分類別: ${Math.round(totalCSSum).toLocaleString()}円 / 時間帯: ${Math.round(totalCtsSum).toLocaleString()}円（差額 ${Math.round(divergence).toLocaleString()}円）`,
    '',
    '▼ 日別内訳（乖離 >1% または >1,000円）',
    ...(dailyDetails.length > 0
      ? dailyDetails
      : ['  すべての日で1%以内です（日別相殺により月合計で乖離が発生）']),
    '',
    '要因分解チャートの精度に影響する可能性があります',
  ]

  messages.push({
    level: 'warning',
    message: `分類別売上と分類別時間帯売上の合計に乖離があります（${(divergenceRate * 100).toFixed(1)}%）`,
    details,
  })

  return messages
}

/**
 * 重複レコード検出 + カテゴリ階層の整合性チェック
 */
export function validateDataIntegrity(data: DataSummaryInput): readonly ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const storeCount = data.stores.size

  // ── レコード件数の妥当性チェック ──
  if (data.classifiedSales.records.length > 0 && storeCount > 0) {
    const avgPerStore = data.classifiedSales.records.length / storeCount
    if (avgPerStore > 3100) {
      messages.push({
        level: 'warning',
        message: `分類別売上のレコード密度が異常に高い値です（1店舗あたり${Math.round(avgPerStore)}件）`,
        details: [
          `総レコード数: ${data.classifiedSales.records.length}`,
          `店舗数: ${storeCount}`,
          '別月のデータが混入している、または同一ファイルが重複取込された可能性があります',
        ],
      })
    }
  }

  // ── 重複レコード検出: classifiedSales ──
  if (data.classifiedSales.records.length > 0) {
    const csKeys = new Map<string, number>()
    for (const rec of data.classifiedSales.records) {
      const key = classifiedSalesRecordKey(rec)
      csKeys.set(key, (csKeys.get(key) ?? 0) + 1)
    }
    const csDuplicateCount = Array.from(csKeys.values()).filter((c) => c > 1).length
    if (csDuplicateCount > 0) {
      messages.push({
        level: 'warning',
        message: `分類別売上に${csDuplicateCount}件の重複レコードがあります（同一ファイルの再取込の可能性）`,
        details: [
          `総レコード数: ${data.classifiedSales.records.length}`,
          `ユニークキー数: ${csKeys.size}`,
          '重複レコードは計算値（売上合計等）が実際の2倍になる原因になります',
        ],
      })
    }
  }

  // ── 重複レコード検出: categoryTimeSales ──
  if (data.categoryTimeSales?.records?.length) {
    const ctsKeys = new Map<string, number>()
    for (const rec of data.categoryTimeSales.records) {
      const key = categoryTimeSalesRecordKey(rec)
      ctsKeys.set(key, (ctsKeys.get(key) ?? 0) + 1)
    }
    const ctsDuplicateCount = Array.from(ctsKeys.values()).filter((c) => c > 1).length
    if (ctsDuplicateCount > 0) {
      messages.push({
        level: 'warning',
        message: `分類別時間帯売上に${ctsDuplicateCount}件の重複レコードがあります（同一ファイルの再取込の可能性）`,
        details: [
          `総レコード数: ${data.categoryTimeSales.records.length}`,
          `ユニークキー数: ${ctsKeys.size}`,
          '重複レコードはチャートの表示値が実際の倍になる原因になります',
        ],
      })
    }
  }

  // ── カテゴリ階層の整合性チェック ──
  if (data.classifiedSales.records.length > 0) {
    const SUBTOTAL_MARKERS = ['合計', '小計', '計']
    const subtotalRecords = data.classifiedSales.records.filter((r) =>
      SUBTOTAL_MARKERS.some(
        (m) => r.className === m || r.lineName === m || r.departmentName === m || r.groupName === m,
      ),
    )
    if (subtotalRecords.length > 0) {
      const subtotalSales = subtotalRecords.reduce((sum, r) => sum + Math.abs(r.salesAmount), 0)
      const totalSales = data.classifiedSales.records.reduce(
        (sum, r) => sum + Math.abs(r.salesAmount),
        0,
      )
      messages.push({
        level: 'warning',
        message: `分類別売上に${subtotalRecords.length}件の小計/合計行が含まれています — 売上が二重計上されている可能性があります`,
        details: [
          `小計/合計行の売上合計: ${Math.round(subtotalSales).toLocaleString()}円`,
          `全レコードの売上合計: ${Math.round(totalSales).toLocaleString()}円`,
          '小計行と明細行が混在すると、集計値が実際の2倍以上になります',
          'ファイルからクラス名称が「合計」等の行を除外して再インポートしてください',
        ],
      })
    }
  }

  return messages
}
