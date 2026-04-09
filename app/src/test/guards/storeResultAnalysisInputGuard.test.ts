/**
 * StoreResult Analysis Input Guard — StoreResult.totalCustomers の分析用途新規利用を禁止
 *
 * StoreResult.totalCustomers は summary result として残すが、
 * 分析入力（PI値、客数GAP等）としては CustomerFact を使用すべき。
 * 既存利用は allowlist で一時許可し、新規利用を禁止する ratchet guard。
 *
 * @see references/01-principles/customer-definition.md
 * @see references/01-principles/canonical-input-sets.md
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-STRUCT-STORE-RESULT-INPUT)
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { collectTsFiles, rel } from '../guardTestHelpers'
import { getRuleById, formatViolationMessage, checkRatchetDown } from '../architectureRules'

const SRC_DIR = path.resolve(__dirname, '../..')

/**
 * 既存の .totalCustomers 利用箇所（allowlist）
 *
 * これらは段階的に CustomerFact 経由に移行する。
 * 新規追加は禁止。移行完了時にエントリを削除する。
 */
const TOTAL_CUSTOMERS_ALLOWLIST = new Set<string>([
  // 全 7 エントリ移行完了:
  // - SensitivityDashboard: customerCount ?? 0 (CustomerFact 正本フォールバック)
  // - DataTableWidgets: ctx.readModels?.customerFact?.grandTotalCustomers 経由
  // - conditionPanelSalesDetail.vm: storeCustomerMap / grandTotalCustomers 引数追加
  // - conditionPanelSalesDetail.tsx: VM 経由（.totalCustomers 不参照）
  // - conditionSummaryUtils: extractPrevYearCustomerCount を features/comparison に移動
  // - useInsightData: opts 必須化 + extractPrevYearCustomerCount
  // - MobileDashboardPage: daily 集計 + extractPrevYearCustomerCount
])

describe('StoreResult analysis input guard', () => {
  const rule = getRuleById('AR-STRUCT-STORE-RESULT-INPUT')!

  it('presentation 層の .totalCustomers 新規利用が allowlist に含まれていること', () => {
    const presentationDir = path.join(SRC_DIR, 'presentation')
    if (!fs.existsSync(presentationDir)) return

    const files = collectTsFiles(presentationDir)
    const violations: string[] = []

    for (const file of files) {
      const relPath = rel(file)
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('.totalCustomers') && !TOTAL_CUSTOMERS_ALLOWLIST.has(relPath)) {
        violations.push(relPath)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('allowlist の件数が増加していないこと（ratchet）', () => {
    const MAX_ALLOWLIST = 0
    expect(
      TOTAL_CUSTOMERS_ALLOWLIST.size,
      `[${rule.id}] ${rule.what}\nallowlist: ${TOTAL_CUSTOMERS_ALLOWLIST.size} (上限: ${MAX_ALLOWLIST})`,
    ).toBeLessThanOrEqual(MAX_ALLOWLIST)
    checkRatchetDown(rule, TOTAL_CUSTOMERS_ALLOWLIST.size, 'allowlist')
  })
})
