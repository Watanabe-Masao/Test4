#!/usr/bin/env node
// Pre-push skip rules evaluator (= DA-β-001 implementation)
//
// 役割: pre-push hook が実行する check 群のうち、変更ファイル pattern に基づいて
// **skip すべき check** を articulate する。design philosophy = negative articulation:
// 「何を check するか」ではなく「何を check しないか」を exclusion manifest で宣言。
//
// I/O:
//   stdin:  changed file paths (1 line per file)
//   stdout: line 1 = "MATCHED:rule1,rule2" (matched rule names) — empty exit code 0 if no match
//           line 2+ = check function names to skip (deduplicated)
//   exit:   0 = success (regardless of match), 1 = error (config missing/malformed)
//
// Manifest path: tools/git-hooks/pre-push-skip-rules.json
// Schema: skip-rules-v1
//   { skipBaseline: number, skipRules: [{ name, matchAll: regex, skip: string[], rationale }] }
//
// Match semantics: matchAll = 全 changed file が regex に一致した場合のみ rule active
// (= 1 file でも外れたら skip しない、安全側 default)

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const CONFIG_PATH = resolve(__dirname, 'pre-push-skip-rules.json')

let config
try {
  config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
} catch (err) {
  process.stderr.write(`[skip-rules-evaluator] config 読み込み失敗: ${err.message}\n`)
  process.exit(1)
}

const changedFiles = readFileSync(0, 'utf-8')
  .trim()
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)

if (changedFiles.length === 0) {
  process.exit(0)
}

const matchedRules = []
for (const rule of config.skipRules ?? []) {
  if (!rule.matchAll) continue
  const re = new RegExp(rule.matchAll)
  if (changedFiles.every((f) => re.test(f))) {
    matchedRules.push(rule)
  }
}

if (matchedRules.length === 0) {
  process.exit(0)
}

const skipSet = new Set()
const ruleNames = []
for (const rule of matchedRules) {
  ruleNames.push(rule.name)
  for (const check of rule.skip ?? []) {
    skipSet.add(check)
  }
}

console.log(`MATCHED:${ruleNames.join(',')}`)
for (const check of skipSet) {
  console.log(check)
}
