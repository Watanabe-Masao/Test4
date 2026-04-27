/**
 * noParseIntStoreIdGuard —
 * `infrastructure/dataProcessing/*Processor.ts` で店舗コードに対する `parseInt(...)`
 * の利用を ratchet-down で凍結する。
 *
 * 設計意図:
 *   `parseInt('001')` は `1` になり leading zero を破壊する。`parseInt('A1')`
 *   は `NaN` を返し、`|| 0` でフォールバックすると **存在しない店舗 "0"** が
 *   生成される。これは最も検知しにくい類のデータ汚染で、店舗フィルタや
 *   集計の整合性を silent に破壊する。
 *
 *   店舗コードは文字列として扱う (`normalizeRecordStoreIds` /
 *   `validateStoreId` 等) のが正本。`parseInt` は店舗コード正規化の文脈では
 *   使わない。
 *
 *   現状 7 processor / 10 call が違反。新規追加禁止 → 段階的に置換。
 *
 * 検出対象:
 *   - file: `src/infrastructure/dataProcessing/*Processor.ts` (除く `.test.ts`)
 *   - signal: 同一行に `parseInt(` と店舗コンテキスト識別子を両方含む
 *     - 店舗コンテキスト: `storeId` / `StoreId` / `storeCode` / `StoreCode`
 *       / `stoMatch` / `storeMatch`
 *
 * Baseline 推移:
 *   - 2026-04-26 初期: 7 file / 10 call
 *   - 目標: 0 / 0 (`normalizeStoreCode` 等の文字列保持 helper に置換)
 *
 * 例外:
 *   `infrastructure/storeIdNormalization.ts` / `application/queries/queryInputCanonical.ts`
 *   等の正規化 helper は scope 外（本 guard は import 境界のみを対象）。
 *
 * @see CLAUDE.md §設計原則 — E1 境界で検証
 * @responsibility R:guard
 *
 * @taxonomyKind T:unclassified
 */

import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = path.resolve(__dirname, '../..')
const PROCESSOR_DIR = path.join(SRC_DIR, 'infrastructure/dataProcessing')

const BASELINE_FILES = 7
const BASELINE_CALLS = 10

const KNOWN_FILES: readonly string[] = [
  'BudgetProcessor.ts',
  'ClassifiedSalesProcessor.ts',
  'CostInclusionProcessor.ts',
  'PurchaseProcessor.ts',
  'SettingsProcessor.ts',
  'SpecialSalesProcessor.ts',
  'TransferProcessor.ts',
]

const STORE_CONTEXT_TOKENS = [
  'storeId',
  'StoreId',
  'storeCode',
  'StoreCode',
  'stoMatch',
  'storeMatch',
] as const

interface Detection {
  readonly file: string
  readonly callCount: number
}

function listProcessorFiles(): string[] {
  if (!fs.existsSync(PROCESSOR_DIR)) return []
  return fs
    .readdirSync(PROCESSOR_DIR)
    .filter((f) => /Processor\.ts$/.test(f) && !f.endsWith('.test.ts'))
    .sort()
}

function countViolationsInFile(content: string): number {
  let count = 0
  for (const line of content.split('\n')) {
    if (!line.includes('parseInt(')) continue
    if (STORE_CONTEXT_TOKENS.some((t) => line.includes(t))) {
      count += (line.match(/parseInt\s*\(/g) ?? []).length
    }
  }
  return count
}

function detect(): Detection[] {
  const out: Detection[] = []
  for (const name of listProcessorFiles()) {
    const content = fs.readFileSync(path.join(PROCESSOR_DIR, name), 'utf-8')
    const callCount = countViolationsInFile(content)
    if (callCount > 0) {
      out.push({ file: name, callCount })
    }
  }
  return out
}

describe('noParseIntStoreIdGuard', () => {
  const detections = detect()
  const totalCalls = detections.reduce((sum, d) => sum + d.callCount, 0)
  const detectedFiles = detections.map((d) => d.file).sort()

  it('parseInt(storeCode) 利用 file 数が baseline を超えない（ratchet-down）', () => {
    expect(
      detectedFiles.length,
      `parseInt(店舗コード) 使用 ${detectedFiles.length} file が baseline=${BASELINE_FILES} を超過。\n` +
        '検出: ' +
        detectedFiles.join(', ') +
        '\n\n' +
        'hint: 店舗コードは文字列として扱ってください。\n' +
        '  - leading zero 破壊 ("001" → "1") 防止\n' +
        '  - NaN || 0 で「店舗 0」を捏造しない\n' +
        '  - 必要なら normalizeRecordStoreIds / validateStoreId を経由する',
    ).toBeLessThanOrEqual(BASELINE_FILES)
  })

  it('parseInt(storeCode) 呼び出し総数が baseline を超えない（ratchet-down）', () => {
    expect(
      totalCalls,
      `parseInt(店舗コード) 呼び出し ${totalCalls} 件 が baseline=${BASELINE_CALLS} を超過。\n` +
        '内訳: ' +
        detections.map((d) => `${d.file}=${d.callCount}`).join(', '),
    ).toBeLessThanOrEqual(BASELINE_CALLS)
  })

  it('検出ファイルが ALLOWLIST と一致する（差分検出）', () => {
    const expected = [...KNOWN_FILES].sort()
    const newFiles = detectedFiles.filter((f) => !expected.includes(f))
    const goneFiles = expected.filter((f) => !detectedFiles.includes(f))

    expect(
      newFiles,
      `新規の parseInt(店舗コード) 利用 file: ${newFiles.join(', ')}\n` +
        '解消するか、KNOWN_FILES に追加 + BASELINE_FILES を +1 してください。',
    ).toEqual([])

    expect(
      goneFiles,
      `ALLOWLIST 内の利用が解消: ${goneFiles.join(', ')}\n` +
        'BASELINE_FILES / BASELINE_CALLS を更新し、KNOWN_FILES から削除してください（卒業処理）。',
    ).toEqual([])
  })
})
