#!/usr/bin/env node
// tools/governance/check-coverage.mjs
//
// Wave 3 / Phase 9 sub-PR 1 — Artifact Coverage advisory checker
//
// 役割: artifact-coverage.generated.json を入力に、unmanaged artifact を advisory として report。
// Wave 3 = advisory only (= warnings、CI fail なし)、初期 inventory only。
//
// 不可侵 (ADR-SCP-021 + plan.md Wave 3 / Phase 9 + 不可侵原則 11 整合):
//   - 初期 inventory only (= 全 artifact 分類)、次 phase で new-only gate
//   - pre-write 強制機構なし
//   - exit code 0 維持
//
// 起動:
//   - `node tools/governance/check-coverage.mjs` — bulk advisory report
//   - `node tools/governance/check-coverage.mjs --zone <zone>` — zone 限定 (例: --zone app)

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

const GENERATED_PATH = resolve(REPO_ROOT, 'docs/contracts/generated/artifact-coverage.generated.json')

if (!existsSync(GENERATED_PATH)) {
  console.error('artifact-coverage.generated.json not found.')
  console.error('Run: node tools/governance/build-artifact-coverage.mjs')
  process.exit(1)
}

const coverage = JSON.parse(readFileSync(GENERATED_PATH, 'utf8'))

// ----------------------------------------------------------------------------
// Argument parsing
// ----------------------------------------------------------------------------

const args = process.argv.slice(2)
const zoneIdx = args.indexOf('--zone')
const zoneFilter = zoneIdx >= 0 ? args[zoneIdx + 1] : null

// ----------------------------------------------------------------------------
// Report
// ----------------------------------------------------------------------------

console.log('# Artifact Coverage Advisory Report')
console.log('')
console.log(`generatedAt: ${coverage.generatedAt}`)
console.log(`generatedAtSha: ${coverage.generatedAtSha}`)
console.log('')
console.log('## Summary')
console.log('')
console.log(`Total tracked files: ${coverage.summary.totalTrackedFiles}`)
console.log(`Managed: ${coverage.summary.managedFiles}`)
console.log(`Unmanaged (advisory): ${coverage.summary.unmanaged} (${coverage.summary.unmanagedFilesPercent}%)`)
console.log('')

console.log('## By Category')
console.log('')
for (const cat of [
  'declared',
  'generated',
  'archived',
  'external',
  'temporary-with-expiry',
  'ignored-with-reason',
]) {
  console.log(`  ${cat}: ${coverage.summary[cat] ?? 0}`)
}
console.log('')

if (zoneFilter) {
  const filtered = coverage.unmanagedFiles.filter((f) => f.startsWith(zoneFilter))
  console.log(`## Unmanaged in zone '${zoneFilter}' (${filtered.length} files)`)
  console.log('')
  for (const f of filtered.slice(0, 50)) console.log(`  - ${f}`)
  if (filtered.length > 50) console.log(`  ... +${filtered.length - 50} more`)
} else {
  console.log('## Unmanaged by Zone')
  console.log('')
  for (const u of coverage.unmanagedByZone.slice(0, 15)) {
    console.log(`  ${u.zone}/: ${u.count}`)
  }
}

console.log('')
console.log('Wave 3 advisory: exit code 0 維持 (= no CI fail)。')
console.log('Wave 3 future: new-only gate (= 新規追加 unmanaged のみ warning) で運用予定。')

// Wave 3 advisory: always exit 0
process.exit(0)
