#!/usr/bin/env node
// tools/governance/build-temporal-scope-policy.mjs
//
// Wave 2 / Phase 4 sub-PR C — Temporal Scope Policy normalize generator
//
// 役割: docs/contracts/src/docs/temporal-scope-policy.yaml を normalize し、
// docs/contracts/generated/temporal-scope-policy.generated.json (= machine truth) を生成。
//
// 不可侵 (不可侵原則 1 + ADR-SCP-001 整合):
//   - YAML authoring → JSON machine truth の deterministic normalize
//   - schemaVersion / metadata block (sourceSha / sourcePaths / generatedAt) 必須
//   - object key alphabetical sort + array order-preserving + indent 2 + final newline
//   - schema (= docs/contracts/schema/temporal-scope-policy.schema.json) 検証 OK
//
// 起動: `node tools/governance/build-temporal-scope-policy.mjs` (repo root から実行)

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

const SOURCE_PATH = resolve(REPO_ROOT, 'docs/contracts/src/docs/temporal-scope-policy.yaml')
const SCHEMA_PATH = resolve(REPO_ROOT, 'docs/contracts/schema/temporal-scope-policy.schema.json')
const OUTPUT_PATH = resolve(
  REPO_ROOT,
  'docs/contracts/generated/temporal-scope-policy.generated.json',
)

function getCurrentSha() {
  try {
    return execSync('git rev-parse HEAD', { cwd: REPO_ROOT, encoding: 'utf8' }).trim()
  } catch {
    return 'unknown'
  }
}

function deterministicStringify(obj) {
  function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys)
    if (value && typeof value === 'object') {
      const sorted = {}
      for (const key of Object.keys(value).sort()) sorted[key] = sortKeys(value[key])
      return sorted
    }
    return value
  }
  return JSON.stringify(sortKeys(obj), null, 2) + '\n'
}

function main() {
  const sourceSha = getCurrentSha()
  const generatedAt = new Date().toISOString()

  const yamlText = readFileSync(SOURCE_PATH, 'utf8')
  const data = yaml.load(yamlText)

  const output = {
    schemaVersion: data.schemaVersion,
    stage: data.stage,
    metadata: {
      sourceSha,
      sourcePaths: ['docs/contracts/src/docs/temporal-scope-policy.yaml'],
      generatedAt,
    },
    policies: data.policies,
  }

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'))
  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(schema)
  if (!validate(output)) {
    console.error('SCHEMA VALIDATION FAILED:')
    console.error(JSON.stringify(validate.errors, null, 2))
    process.exit(1)
  }

  if (!existsSync(dirname(OUTPUT_PATH))) mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, deterministicStringify(output))

  console.log(`Wrote ${relative(REPO_ROOT, OUTPUT_PATH).replace(/\\/g, '/')}`)
  console.log(`  schemaVersion: ${output.schemaVersion}`)
  console.log(`  stage: ${output.stage}`)
  console.log(`  policies: ${output.policies.length}`)
  for (const p of output.policies) {
    console.log(`    ${p.id} (scope=${p.scope.join(',')}, severity=${p.severity})`)
  }
}

main()
