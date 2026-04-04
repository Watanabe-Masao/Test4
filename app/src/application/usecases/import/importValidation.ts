/**
 * インポートデータのバリデーション
 *
 * ImportedData に対するビジネスルールバリデーションを担当する。
 * 整合性チェック、重複検出、日付範囲検証など。
 *
 * 照合・整合性チェックは importDataIntegrity.ts に委譲。
 */
import type { ValidationMessage } from '@/domain/models/record'
import type { DataSummaryInput } from '@/application/services/dataSummary'
import type { ImportSummary } from './FileImportService'
import { validateReconciliation, validateDataIntegrity } from './importDataIntegrity'

/**
 * インポートデータのバリデーション
 */
export function validateImportData(
  data: DataSummaryInput,
  importSummary?: ImportSummary,
): readonly ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const storeCount = data.stores.size

  // ── インポート結果サマリー ──
  if (importSummary) {
    messages.push(...validateImportSummary(importSummary))
  }

  // ── 必須データチェック ──
  if (data.purchase.records.length === 0) {
    messages.push({
      level: 'warning',
      message: '仕入データがありません（売上分析モードで動作します）',
    })
  }
  if (data.classifiedSales.records.length === 0) {
    messages.push({ level: 'error', message: '分類別売上データがありません' })
  }

  // ── 店舗存在チェック ──
  if (storeCount === 0) {
    messages.push({ level: 'warning', message: '店舗が検出されませんでした' })
  } else {
    messages.push(...validateStoreReferences(data))
  }

  // ── 在庫設定チェック ──
  messages.push(...validateInventorySettings(data))

  // ── 照合・整合性チェック（委譲） ──
  messages.push(...validateReconciliation(data))
  messages.push(...validateDataIntegrity(data))

  // ── 日付範囲チェック ──
  messages.push(...validateDateRanges(data))

  // ── オプショナルデータ ──
  messages.push(...validateOptionalData(data))

  return messages
}

// ── 内部ヘルパー ──

function validateImportSummary(importSummary: ImportSummary): ValidationMessage[] {
  const messages: ValidationMessage[] = []

  const failures = importSummary.results.filter((r) => !r.ok)
  if (failures.length > 0) {
    messages.push({
      level: 'error',
      message: `${failures.length}件のファイルの取り込みに失敗しました`,
      details: failures.map((f) => `${f.filename}: ${f.error ?? '不明なエラー'}`),
    })
  }

  if (importSummary.skippedFiles && importSummary.skippedFiles.length > 0) {
    messages.push({
      level: 'warning',
      message: `${importSummary.skippedFiles.length}件のファイルがスキップされました（非対応形式）`,
      details: importSummary.skippedFiles.map((f) => f),
    })
  }

  const filesWithWarnings = importSummary.results.filter(
    (r) => r.ok && r.warnings && r.warnings.length > 0,
  )
  if (filesWithWarnings.length > 0) {
    const details: string[] = []
    for (const f of filesWithWarnings) {
      for (const w of f.warnings!) details.push(w)
    }
    messages.push({
      level: 'warning',
      message: 'データの読み取りに関する警告があります',
      details,
    })
  }

  const filesWithSkips = importSummary.results.filter(
    (r) => r.ok && r.skippedRows && r.skippedRows.length > 0,
  )
  if (filesWithSkips.length > 0) {
    const details: string[] = []
    for (const f of filesWithSkips) {
      details.push(`${f.filename} (${f.typeName}):`)
      for (const row of f.skippedRows!) {
        details.push(`  ${row}`)
      }
    }
    messages.push({
      level: 'warning',
      message: `一部のデータ行がスキップされました`,
      details,
    })
  }

  if (importSummary.successCount > 0) {
    const details = importSummary.results
      .filter((r) => r.ok)
      .map((r) => `${r.typeName}: ${r.filename}${r.rowCount ? ` (${r.rowCount}行)` : ''}`)
    messages.push({
      level: 'info',
      message: `${importSummary.successCount}件のファイルを正常に取り込みました`,
      details,
    })
  }

  return messages
}

function validateStoreReferences(data: DataSummaryInput): ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const storeIds = new Set(data.stores.keys())
  const unknownStoreIds = new Set<string>()

  const checkRecordStoreIds = (records: readonly { readonly storeId: string }[], label: string) => {
    const unknown: string[] = []
    const seen = new Set<string>()
    for (const rec of records) {
      if (!seen.has(rec.storeId)) {
        seen.add(rec.storeId)
        if (!storeIds.has(rec.storeId)) {
          unknownStoreIds.add(rec.storeId)
          unknown.push(rec.storeId)
        }
      }
    }
    return unknown.length > 0 ? `${label}: 店舗ID ${unknown.join(', ')}` : null
  }

  const unknownDetails: string[] = []
  const d3 = checkRecordStoreIds(data.interStoreIn.records, '店間入データ')
  if (d3) unknownDetails.push(d3)
  const d4 = checkRecordStoreIds(data.interStoreOut.records, '店間出データ')
  if (d4) unknownDetails.push(d4)
  const d5 = checkRecordStoreIds(data.flowers.records, '花データ')
  if (d5) unknownDetails.push(d5)
  const d6 = checkRecordStoreIds(data.directProduce.records, '産直データ')
  if (d6) unknownDetails.push(d6)
  const d7 = checkRecordStoreIds(data.consumables.records, '消耗品データ')
  if (d7) unknownDetails.push(d7)

  for (const [sid] of data.settings) {
    if (!storeIds.has(sid)) {
      unknownStoreIds.add(sid)
      unknownDetails.push(`在庫設定: 店舗ID ${sid}`)
    }
  }
  for (const [sid] of data.budget) {
    if (!storeIds.has(sid)) {
      unknownStoreIds.add(sid)
      unknownDetails.push(`予算データ: 店舗ID ${sid}`)
    }
  }

  if (unknownDetails.length > 0) {
    messages.push({
      level: 'warning',
      message: `${unknownStoreIds.size}件の未登録店舗IDがデータに含まれています`,
      details: unknownDetails,
    })
  }

  return messages
}

function validateInventorySettings(data: DataSummaryInput): ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const storeCount = data.stores.size
  const invCount = data.settings.size

  if (invCount === 0) {
    messages.push({
      level: 'warning',
      message: '在庫設定がありません。初期設定ファイルを読み込むか手動設定してください',
    })
  } else if (invCount < storeCount) {
    const missingStores: string[] = []
    for (const [id, store] of data.stores) {
      if (!data.settings.has(id)) {
        missingStores.push(`${store.name} (ID: ${id})`)
      }
    }
    messages.push({
      level: 'warning',
      message: `一部店舗の在庫設定がありません (${invCount}/${storeCount})`,
      details: missingStores.length > 0 ? [`未設定: ${missingStores.join(', ')}`] : undefined,
    })
  }

  return messages
}

function validateDateRanges(data: DataSummaryInput): ValidationMessage[] {
  const messages: ValidationMessage[] = []

  if (data.classifiedSales.records.length === 0) return messages

  let csMaxDay = 0
  for (const rec of data.classifiedSales.records) {
    if (rec.day > csMaxDay) csMaxDay = rec.day
  }

  const checkFlatRecordsRange = (records: readonly { readonly day: number }[], label: string) => {
    if (!records || records.length === 0) return

    let maxDay = 0
    for (const rec of records) {
      if (rec.day > maxDay) maxDay = rec.day
    }

    if (maxDay > 0 && maxDay < csMaxDay) {
      messages.push({
        level: 'warning',
        message: `${label}の最終取込日（${maxDay}日）が分類別売上（${csMaxDay}日）より短いです — 取り込み忘れの可能性があります`,
      })
    }
  }

  checkFlatRecordsRange(data.flowers.records, '花データ')
  checkFlatRecordsRange(data.directProduce.records, '産直データ')

  if (data.purchase.records.length > 0) {
    let purchaseMaxDay = 0
    for (const rec of data.purchase.records) {
      if (rec.day > purchaseMaxDay) purchaseMaxDay = rec.day
    }

    if (purchaseMaxDay > 0 && purchaseMaxDay < csMaxDay) {
      messages.push({
        level: 'warning',
        message: `仕入データの最終取込日（${purchaseMaxDay}日）が売上データ（${csMaxDay}日）より短いです — ${purchaseMaxDay + 1}日以降の粗利計算は仕入原価ゼロで算出されています`,
        details: [
          `仕入データ: 1日〜${purchaseMaxDay}日`,
          `売上データ: 1日〜${csMaxDay}日`,
          `${purchaseMaxDay + 1}日〜${csMaxDay}日の期間は仕入データがないため、粗利が過大に表示されます`,
          'KPI画面の警告をクリックすると仕入データが有効な期間に絞り込めます',
        ],
      })
    }
  }

  return messages
}

function validateOptionalData(data: DataSummaryInput): ValidationMessage[] {
  const messages: ValidationMessage[] = []

  if (data.budget.size === 0) {
    messages.push({
      level: 'info',
      message: '予算データがありません。予算ファイルを読み込むとより詳細な分析が可能です',
    })
  }
  const hasDiscountData = data.classifiedSales.records.some(
    (r) => r.discount71 !== 0 || r.discount72 !== 0 || r.discount73 !== 0 || r.discount74 !== 0,
  )
  if (!hasDiscountData && data.classifiedSales.records.length > 0) {
    messages.push({
      level: 'warning',
      message: '売変データがありません — 推定法（推定在庫・推定マージン率）の精度が低下します',
      details: [
        '分類別売上ファイルに売変列（71〜74）が含まれていません',
        '推定法では売変率を用いて推定原価を算出するため、売変データがないと推定精度が大幅に低下します',
        '売変列付きの分類別売上ファイルを再インポートしてください',
      ],
    })
  }

  return messages
}

/**
 * バリデーションにエラーがないかチェック
 */
export function hasValidationErrors(messages: readonly ValidationMessage[]): boolean {
  return messages.some((m) => m.level === 'error')
}
