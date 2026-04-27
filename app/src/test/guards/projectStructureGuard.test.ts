/**
 * Project Structure Guard — プロジェクト構成文書とファイルシステムの整合性検証
 *
 * references/02-status/project-structure.md に記載されたディレクトリ構成が
 * 実際のファイルシステムと一致していることを機械的に検証する。
 *
 * ドキュメント品質層のガード。
 *
 * @guard G1 テストに書く
 * ルール定義: architectureRules.ts (AR-DOC-STATIC-NUMBER)
 *
 * @responsibility R:unclassified
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getRuleById, formatViolationMessage } from '../architectureRules'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const SRC_DIR = path.resolve(__dirname, '../..')
const rule = getRuleById('AR-DOC-STATIC-NUMBER')!

// ── 4 層の必須ディレクトリ ────────────────────────────────────
const REQUIRED_LAYER_DIRS = [
  'domain',
  'application',
  'infrastructure',
  'presentation',
  'features',
  'test',
]

// ── allowlists/ の必須ファイル ────────────────────────────────
const REQUIRED_ALLOWLIST_FILES = [
  'architecture.ts',
  'complexity.ts',
  'docs.ts',
  'duckdb.ts',
  'size.ts',
  'performance.ts',
  'migration.ts',
  'responsibility.ts',
  'misc.ts',
  'types.ts',
  'index.ts',
]

describe('Project Structure Guard: プロジェクト構成の整合性', () => {
  it('app/src/ の 4 層 + features + test ディレクトリが存在する', () => {
    const missing: string[] = []
    for (const dir of REQUIRED_LAYER_DIRS) {
      if (!fs.existsSync(path.join(SRC_DIR, dir))) {
        missing.push(`app/src/${dir}/`)
      }
    }
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('features/ のモジュール一覧が project-structure.md と一致する', () => {
    const featuresDir = path.join(SRC_DIR, 'features')
    const actualModules = fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()

    // CLAUDE.md の features/ 記述も確認
    const claudeMd = fs.readFileSync(path.join(PROJECT_ROOT, 'CLAUDE.md'), 'utf-8')

    const violations: string[] = []

    // features/ に存在するが CLAUDE.md に記載されていないモジュール
    for (const mod of actualModules) {
      if (!claudeMd.includes(mod)) {
        violations.push(`features/${mod} がファイルシステムに存在するが CLAUDE.md に記載なし`)
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('allowlists/ の必須ファイルが全て存在する', () => {
    const allowlistDir = path.join(SRC_DIR, 'test/allowlists')
    const missing: string[] = []
    for (const file of REQUIRED_ALLOWLIST_FILES) {
      if (!fs.existsSync(path.join(allowlistDir, file))) {
        missing.push(`allowlists/${file}`)
      }
    }
    expect(missing, formatViolationMessage(rule, missing)).toEqual([])
  })

  it('guards/ のファイルが project-structure.md に反映されている', () => {
    const guardsDir = path.join(SRC_DIR, 'test/guards')
    const actualGuards = fs
      .readdirSync(guardsDir)
      .filter((f) => f.endsWith('.test.ts'))
      .sort()

    const structureDoc = path.join(PROJECT_ROOT, 'references/02-status/project-structure.md')
    const content = fs.readFileSync(structureDoc, 'utf-8')

    // guards/ に存在するが project-structure.md の generated section に
    // 記載されていないファイルを検出（generated section が空なら skip）
    const hasGeneratedSection = content.includes('GENERATED:START guard-files-list')
    const generatedContent = content.match(
      /GENERATED:START guard-files-list -->([\s\S]*?)<!-- GENERATED:END/,
    )

    if (hasGeneratedSection && generatedContent?.[1]?.trim()) {
      const violations: string[] = []
      for (const guard of actualGuards) {
        if (!generatedContent[1].includes(guard)) {
          violations.push(`guards/${guard} が project-structure.md に記載なし`)
        }
      }
      expect(violations, formatViolationMessage(rule, violations)).toEqual([])
    }
    // generated section が空の場合は docs:generate で埋まるので skip
  })
})
