#!/usr/bin/env node
// tools/governance/build-tree-contracts.mjs
//
// Wave 1 / Phase 3-A — Tree Contracts authoring source normalizer
//
// 役割: `docs/contracts/src/repo/tree-contracts.yaml` (= Phase 2A landed authoring source、
// Phase 2E で 4 status enum 拡張) を normalize し、`docs/contracts/generated/tree-contracts.generated.json`
// (machine truth) を生成。本 generator は **inventory ではなく contract の宣言** を normalize するため、
// Phase 2 の inventory generators (build-repo-topology / build-skeleton-diff / build-*-inventory) と
// 異なり、observed-only / inventoryStatus field は articulate しない (= declared status の正本生成)。
//
// 出力: docs/contracts/generated/tree-contracts.generated.json
//
// 不可侵 (不可侵原則 1 + ADR-SCP-001 整合):
//   - YAML authoring source → JSON machine truth の deterministic normalize
//   - schemaVersion / metadata block (sourceSha / sourcePaths / generatedAt) 必須
//   - object key alphabetical sort + array order-preserving (= contract entry の declaration 順保持) +
//     indent 2 spaces + final newline
//   - schema (= docs/contracts/schema/tree-contracts.schema.json、Phase 2E で 4 enum 拡張版) 検証 OK
//
// 依存: js-yaml (= app/node_modules から createRequire で resolve、root package.json には未追加 = Wave 1 MVP)
//
// 起動: `node tools/governance/build-tree-contracts.mjs` (repo root から実行)

import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
} from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')

const require = createRequire(resolve(REPO_ROOT, 'app/package.json'))
const yaml = require('js-yaml')
const Ajv = require('ajv')

const SOURCE_PATH = resolve(REPO_ROOT, 'docs/contracts/src/repo/tree-contracts.yaml')
const SCHEMA_PATH = resolve(REPO_ROOT, 'docs/contracts/schema/tree-contracts.schema.json')
const OUTPUT_DIR = resolve(REPO_ROOT, 'docs/contracts/generated')
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'tree-contracts.generated.json')

function getCurrentSha() {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

function toPosixPath(p) {
  return p.replace(/\\/g, '/')
}

// deterministic stringify: object key alphabetical sort、array order-preserving (= declaration 順保持)
function deterministicStringify(obj) {
  function sortKeys(value) {
    if (Array.isArray(value)) {
      return value.map(sortKeys)
    }
    if (value && typeof value === 'object') {
      const sorted = {}
      for (const key of Object.keys(value).sort()) {
        sorted[key] = sortKeys(value[key])
      }
      return sorted
    }
    return value
  }
  return JSON.stringify(sortKeys(obj), null, 2) + '\n'
}

function main() {
  const sourceSha = getCurrentSha()
  const generatedAt = new Date().toISOString()

  if (!existsSync(SOURCE_PATH)) {
    console.error(`ERROR: source not found: ${toPosixPath(relative(REPO_ROOT, SOURCE_PATH))}`)
    process.exit(1)
  }
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`ERROR: schema not found: ${toPosixPath(relative(REPO_ROOT, SCHEMA_PATH))}`)
    process.exit(1)
  }

  const yamlText = readFileSync(SOURCE_PATH, 'utf8')
  const data = yaml.load(yamlText)

  // metadata block を populate (= generated JSON では必須、不可侵原則 1 整合)
  const output = {
    schemaVersion: data.schemaVersion,
    scope: data.scope,
    metadata: {
      sourceSha,
      sourcePaths: ['docs/contracts/src/repo/tree-contracts.yaml'],
      generatedAt,
    },
    contracts: data.contracts,
  }

  // schema validation (= 不可侵原則 1 補強)
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(schema)
  const valid = validate(output)
  if (!valid) {
    console.error('SCHEMA VALIDATION FAILED:')
    console.error(JSON.stringify(validate.errors, null, 2))
    process.exit(1)
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }
  writeFileSync(OUTPUT_PATH, deterministicStringify(output))

  // summary log
  const byStatus = {}
  for (const c of data.contracts) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1
  }

  console.log(`Wrote ${toPosixPath(relative(REPO_ROOT, OUTPUT_PATH))}`)
  console.log(`  schemaVersion: ${output.schemaVersion}`)
  console.log(`  scope: ${output.scope}`)
  console.log(`  sourceSha: ${sourceSha}`)
  console.log(`  contracts: ${output.contracts.length}`)
  for (const [k, v] of Object.entries(byStatus).sort()) {
    console.log(`    ${k}: ${v}`)
  }
}

main()
