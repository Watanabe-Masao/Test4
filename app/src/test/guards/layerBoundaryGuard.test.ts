/**
 * Layer Boundary Guard — 4層依存ルール
 *
 * Presentation → Application → Domain ← Infrastructure
 * 各層の依存方向を検証する。
 *
 * ルール定義: architectureRules.ts (AR-A1-*)
 *
 * @guard A1 4層依存ルール
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  SRC_DIR,
  collectTsFiles,
  extractImports,
  extractValueImports,
  rel as relativePath,
} from '../guardTestHelpers'
import { applicationToInfrastructure, buildAllowlistSet } from '../allowlists'
import { getRuleById, formatViolationMessage } from '../architectureRules'

// ─── 許可リスト（allowlists.ts から構築） ────────────────

const APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST = buildAllowlistSet(applicationToInfrastructure)

// ─── テスト ──────────────────────────────────────────────

describe('Layer Boundary Guard', () => {
  it('domain/ は外部層に依存しない', () => {
    const rule = getRuleById('AR-A1-DOMAIN')!
    const domainDir = path.join(SRC_DIR, 'domain')
    const files = collectTsFiles(domainDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (
          imp.startsWith('@/application/') ||
          imp.startsWith('@/infrastructure/') ||
          imp.startsWith('@/presentation/')
        ) {
          violations.push(`${relativePath(file)}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('application/ は infrastructure/ に直接依存しない（許可リスト除く）', () => {
    const rule = getRuleById('AR-A1-APP-INFRA')!
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (rel.startsWith('application/hooks/duckdb/')) continue
      if (rel.startsWith('application/queries/')) continue
      if (rel.startsWith('application/runtime-adapters/')) continue
      if (APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.has(rel)) continue

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('application/ は presentation/ に依存しない', () => {
    const rule = getRuleById('AR-A1-APP-PRES')!
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/presentation/')) {
          violations.push(`${relativePath(file)}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('presentation/ は infrastructure/ に直接依存しない（許可リスト除く、import type は許容）', () => {
    const rule = getRuleById('AR-A1-PRES-INFRA')!
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)

      const imports = extractValueImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('presentation/ は application/usecases/ を直接 import しない（import type は許容）', () => {
    const rule = getRuleById('AR-A1-PRES-USECASE')!

    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)

      const imports = extractValueImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/application/usecases/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('infrastructure/ は application/ に依存しない（後方互換 re-export 除く）', () => {
    const rule = getRuleById('AR-A1-INFRA-APP')!
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/application/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  it('infrastructure/ は presentation/ に依存しない', () => {
    const rule = getRuleById('AR-A1-INFRA-PRES')!
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    for (const file of files) {
      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/presentation/')) {
          violations.push(`${relativePath(file)}: ${imp}`)
        }
      }
    }

    expect(violations, formatViolationMessage(rule, violations)).toEqual([])
  })

  // ─── 許可リスト増加防止 ─────────────────────────────

  it('APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST は 15 件以下', () => {
    expect(
      APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.size,
      `APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST が ${APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.size} 件（上限: 15）`,
    ).toBeLessThanOrEqual(15)
  })

  // ─── 許可リストファイル実在チェック ─────────────────

  it('許可リストのファイルが実在する', () => {
    const allAllowlists = [...APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST]

    for (const rel of allAllowlists) {
      const fullPath = path.join(SRC_DIR, rel)
      expect(fs.existsSync(fullPath), `Allowlisted file does not exist: ${rel}`).toBe(true)
    }
  })
})
