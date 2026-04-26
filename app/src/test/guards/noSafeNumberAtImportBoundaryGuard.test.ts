/**
 * noSafeNumberAtImportBoundaryGuard —
 * `infrastructure/dataProcessing/*Processor.ts` (CSV/XLSX import 境界) における
 * `safeNumber()` の利用を ratchet-down で凍結する。
 *
 * 設計意図:
 *   `safeNumber()` (`domain/calculations/utils.ts`) は計算層で「不正値を 0 に丸める」
 *   fallback ヘルパー。これを **import 境界** で使うと、原本由来の数値欠損 / 不正
 *   セルが silent に 0 化されて永続化され、後段の集計から検知不能になる。
 *
 *   import 境界では:
 *     - 不正値は parse error として明示的に rejected されるべき
 *     - 数値変換は専用 parser (`parseNumericCell()` 等) を経由して provenance を残す
 *     - silent fallback は計算層 (純粋ロジック) に閉じ込める
 *
 *   現状 9 processor / 27 call が違反。新規追加禁止 → 段階的に置換。
 *
 * 検出対象:
 *   - file: `src/infrastructure/dataProcessing/*Processor.ts` (除く `.test.ts`)
 *   - signal: `safeNumber(` （識別子境界つき）
 *
 * Baseline 推移:
 *   - 2026-04-26 初期: 9 file / 27 call
 *   - 目標: 0 / 0 (専用 parser に置換完了時)
 *
 * @see docs (TBD): `references/01-principles/import-boundary-policy.md`
 * @responsibility R:guard
 */

import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

const SRC_DIR = path.resolve(__dirname, '../..')
const PROCESSOR_DIR = path.join(SRC_DIR, 'infrastructure/dataProcessing')

const BASELINE_FILES = 9
const BASELINE_CALLS = 27

const KNOWN_FILES: readonly string[] = [
  'BudgetProcessor.ts',
  'CategoryTimeSalesProcessor.ts',
  'ClassifiedSalesProcessor.ts',
  'CostInclusionProcessor.ts',
  'DepartmentKpiProcessor.ts',
  'PurchaseProcessor.ts',
  'SettingsProcessor.ts',
  'SpecialSalesProcessor.ts',
  'TransferProcessor.ts',
]

const SAFE_NUMBER_RE = /\bsafeNumber\s*\(/g

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

function detect(): Detection[] {
  const out: Detection[] = []
  for (const name of listProcessorFiles()) {
    const content = fs.readFileSync(path.join(PROCESSOR_DIR, name), 'utf-8')
    const matches = content.match(SAFE_NUMBER_RE)
    if (matches && matches.length > 0) {
      out.push({ file: name, callCount: matches.length })
    }
  }
  return out
}

describe('noSafeNumberAtImportBoundaryGuard', () => {
  const detections = detect()
  const totalCalls = detections.reduce((sum, d) => sum + d.callCount, 0)
  const detectedFiles = detections.map((d) => d.file).sort()

  it('safeNumber 利用 file 数が baseline を超えない（ratchet-down）', () => {
    expect(
      detectedFiles.length,
      `import 境界で safeNumber 使用 ${detectedFiles.length} file が baseline=${BASELINE_FILES} を超過。\n` +
        '検出: ' +
        detectedFiles.join(', ') +
        '\n\n' +
        'hint: import 境界では safeNumber を使わず、明示的な parse error / 専用 parser を使ってください。\n' +
        '  silent な 0 化は計算層 (domain/calculations) に限定する。',
    ).toBeLessThanOrEqual(BASELINE_FILES)
  })

  it('safeNumber 呼び出し総数が baseline を超えない（ratchet-down）', () => {
    expect(
      totalCalls,
      `import 境界で safeNumber 呼び出し ${totalCalls} 件 が baseline=${BASELINE_CALLS} を超過。\n` +
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
      `新規の safeNumber 利用 file: ${newFiles.join(', ')}\n` +
        '解消するか、KNOWN_FILES に追加 + BASELINE_FILES を +1 してください。',
    ).toEqual([])

    expect(
      goneFiles,
      `ALLOWLIST 内の利用が解消: ${goneFiles.join(', ')}\n` +
        'BASELINE_FILES / BASELINE_CALLS を更新し、KNOWN_FILES から削除してください（卒業処理）。',
    ).toEqual([])
  })
})
