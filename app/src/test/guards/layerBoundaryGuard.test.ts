/**
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
import {
  applicationToInfrastructure,
  presentationToInfrastructure,
  infrastructureToApplication,
  presentationToUsecases,
  buildAllowlistSet,
} from '../allowlists'

// ─── 許可リスト（allowlists.ts から構築） ────────────────

const APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST = buildAllowlistSet(applicationToInfrastructure)
const PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST = buildAllowlistSet(presentationToInfrastructure)
const INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST = buildAllowlistSet(infrastructureToApplication)

// ─── テスト ──────────────────────────────────────────────

describe('Layer Boundary Guard', () => {
  it('domain/ は外部層に依存しない', () => {
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

    expect(violations).toEqual([])
  })

  it('application/ は infrastructure/ に直接依存しない（許可リスト除く）', () => {
    const appDir = path.join(SRC_DIR, 'application')
    const files = collectTsFiles(appDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      // DuckDB adapter hooks: infrastructure/duckdb/ への依存は構造的に正しい
      if (rel.startsWith('application/hooks/duckdb/')) continue
      if (APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.has(rel)) continue

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('application/ は presentation/ に依存しない', () => {
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

    expect(violations).toEqual([])
  })

  it('presentation/ は infrastructure/ に直接依存しない（許可リスト除く、import type は許容）', () => {
    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST.has(rel)) continue

      const imports = extractValueImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/infrastructure/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('presentation/ は application/usecases/ を直接 import しない（禁止事項 #11、import type は許容）', () => {
    // 値 import の既存違反（凍結）。移行完了時に許可リストから削除する。新規追加は禁止。
    // import type は実行時依存を生まないため検出対象外。
    const USECASE_ALLOWLIST = buildAllowlistSet(presentationToUsecases)
    const MAX_USECASE_ALLOWLIST = 1

    const presDir = path.join(SRC_DIR, 'presentation')
    const files = collectTsFiles(presDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (USECASE_ALLOWLIST.has(rel)) continue

      const imports = extractValueImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/application/usecases/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(
      violations,
      'presentation/ は usecase を直接 import してはいけません。\n' +
        'Application 層の hook を経由してデータを取得してください。\n' +
        `違反: \n${violations.join('\n')}`,
    ).toEqual([])

    expect(
      USECASE_ALLOWLIST.size,
      `usecase 許可リストが上限 ${MAX_USECASE_ALLOWLIST} を超えています。新規追加禁止。`,
    ).toBeLessThanOrEqual(MAX_USECASE_ALLOWLIST)
  })

  it('infrastructure/ は application/ に依存しない（後方互換 re-export 除く）', () => {
    const infraDir = path.join(SRC_DIR, 'infrastructure')
    const files = collectTsFiles(infraDir)
    const violations: string[] = []

    for (const file of files) {
      const rel = relativePath(file)
      if (INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST.has(rel)) continue

      const imports = extractImports(file)
      for (const imp of imports) {
        if (imp.startsWith('@/application/')) {
          violations.push(`${rel}: ${imp}`)
        }
      }
    }

    expect(violations).toEqual([])
  })

  it('infrastructure/ は presentation/ に依存しない', () => {
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

    expect(violations).toEqual([])
  })

  // ─── 許可リスト増加防止 ─────────────────────────────

  it('APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST は 12 件以下', () => {
    expect(
      APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.size,
      `APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST が ${APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST.size} 件（上限: 12）`,
    ).toBeLessThanOrEqual(12)
  })

  it('PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST は 0 件（完全解消済み）', () => {
    expect(PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST.size).toBeLessThanOrEqual(0)
  })

  it('INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST は 0 件（完全解消済み）', () => {
    expect(INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST.size).toBeLessThanOrEqual(0)
  })

  // ─── 許可リストファイル実在チェック ─────────────────

  it('許可リストのファイルが実在する', () => {
    const allAllowlists = [
      ...APPLICATION_TO_INFRASTRUCTURE_ALLOWLIST,
      ...PRESENTATION_TO_INFRASTRUCTURE_ALLOWLIST,
      ...INFRASTRUCTURE_TO_APPLICATION_ALLOWLIST,
    ]

    for (const rel of allAllowlists) {
      const fullPath = path.join(SRC_DIR, rel)
      expect(fs.existsSync(fullPath), `Allowlisted file does not exist: ${rel}`).toBe(true)
    }
  })
})
