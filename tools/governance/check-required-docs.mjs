#!/usr/bin/env node
// tools/governance/check-required-docs.mjs
//
// Wave 3 / Phase 7 sub-PR 1 — Required Docs advisory checker
//
// 役割: required-docs-matrix.generated.json を入力に、各 target の missing required docs を
// advisory として report。Wave 3 = advisory only (= warnings、CI fail なし)。
//
// 不可侵 (ADR-SCP-021 + plan.md Wave 3 / Phase 7 完了条件 + 不可侵原則 11 整合):
//   - 初期は advisory + new-only gate のみ foul (= 既存 missing は baseline、新規追加 path で
//     missing が増える場合のみ warning)
//   - pre-write 強制機構なし
//   - exit code 0 維持 (= advisory)
//
// 起動:
//   - `node tools/governance/check-required-docs.mjs` — bulk advisory report
//   - `node tools/governance/check-required-docs.mjs --target <pathPrefix>` — 特定 target 限定

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

const GENERATED_PATH = resolve(REPO_ROOT, 'docs/contracts/generated/required-docs-matrix.generated.json')

if (!existsSync(GENERATED_PATH)) {
  console.error('required-docs-matrix.generated.json not found.')
  console.error('Run: node tools/governance/build-required-docs-matrix.mjs')
  process.exit(1)
}

const matrix = JSON.parse(readFileSync(GENERATED_PATH, 'utf8'))

// ----------------------------------------------------------------------------
// Argument parsing
// ----------------------------------------------------------------------------

const args = process.argv.slice(2)
const targetIdx = args.indexOf('--target')
const targetFilter = targetIdx >= 0 ? args[targetIdx + 1] : null

// ----------------------------------------------------------------------------
// Report findings
// ----------------------------------------------------------------------------

let totalFindings = 0
let totalTargetsScanned = 0

console.log('# Required Docs Advisory Report')
console.log('')
console.log(`generatedAt: ${matrix.generatedAt}`)
console.log(`generatedAtSha: ${matrix.generatedAtSha}`)
console.log('')

for (const rule of matrix.rules) {
  console.log(`## targetType: ${rule.targetType}`)
  console.log(`pathPattern: ${rule.pathPattern}`)
  console.log(`targetCount: ${rule.derived.targetCount} / exceptionCount: ${rule.derived.exceptionCount}`)
  console.log(`missingRequiredCount: ${rule.derived.missingRequiredCount}`)
  console.log('')

  for (const target of rule.derived.targets) {
    if (target.skipped) continue
    if (targetFilter && !target.targetPath.startsWith(targetFilter)) continue
    totalTargetsScanned += 1
    if (target.missingRequired.length > 0) {
      console.log(`  ⚠️ ${target.targetPath}:`)
      for (const m of target.missingRequired) {
        console.log(`     - missing required: ${m.docPath} (kind: ${m.docKind})`)
        totalFindings += 1
      }
    }
    if (target.missingOptional.length > 0) {
      // optional missing は info のみ
      for (const m of target.missingOptional) {
        if (targetFilter) {
          console.log(`  ℹ️  ${target.targetPath}:`)
          console.log(`     - missing optional: ${m.docPath} (kind: ${m.docKind})`)
        }
      }
    }
  }
  console.log('')
}

console.log('## Summary')
console.log('')
console.log(`Targets scanned: ${totalTargetsScanned}`)
console.log(`Required findings (advisory): ${totalFindings}`)

// Wave 3 advisory: always exit 0
process.exit(0)
