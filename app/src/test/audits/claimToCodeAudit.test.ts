/**
 * Claim-to-Code Audit — 文書の主張とコード実態の検証
 *
 * 文書側の「完了」「全件解消」「凍結」「廃止済み」「正本化済み」などの
 * 主張を抽出し、コード側で実在チェックする。
 *
 * このリポジトリは docs が強いので、文書が少し古いだけで認識を誤る危険がある。
 * 主張と実体のズレを機械的に検出する。
 *
 * @audit Claim-to-Code Verification
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'

const ROOT_DIR = path.resolve(SRC_DIR, '../..')

function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

// ── Claim: cmpPrevYearDaily は全件解消済み ──

describe('Claim: prevYear.daily.get() は消費側から完全排除', () => {
  it('presentation/ に prevYear.daily.get() が残存しない', () => {
    const violations: string[] = []
    const pattern = /prevYear\.daily\.get\(/
    const files = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${rel(file)}:${i + 1}`)
        }
      }
    }
    expect(violations, 'prevYear.daily.get() が presentation/ に残存').toEqual([])
  })

  it('application/hooks に prevYear.daily.get() が残存しない', () => {
    const violations: string[] = []
    const pattern = /prevYear\.daily\.get\(/
    const dir = path.join(SRC_DIR, 'application/hooks')
    if (!fs.existsSync(dir)) return
    const files = collectTsFiles(dir)
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${rel(file)}:${i + 1}`)
        }
      }
    }
    expect(violations, 'prevYear.daily.get() が application/hooks に残存').toEqual([])
  })

  it('application/usecases に prevYear.daily.get() が残存しない', () => {
    const violations: string[] = []
    const pattern = /prevYear\.daily\.get\(/
    const dir = path.join(SRC_DIR, 'application/usecases')
    if (!fs.existsSync(dir)) return
    const files = collectTsFiles(dir)
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${rel(file)}:${i + 1}`)
        }
      }
    }
    expect(violations, 'prevYear.daily.get() が application/usecases に残存').toEqual([])
  })
})

// ── Claim: ComparisonFrame は廃止済み ──

describe('Claim: ComparisonFrame の新規参照禁止', () => {
  it('ComparisonFrame の import が新規追加されていない', () => {
    const violations: string[] = []
    // comparisonFrame 関連の直接 import を検出
    const pattern = /import\s.*(?:ComparisonFrame|comparisonFrame)(?!\.test)/
    const files = collectTsFiles(SRC_DIR)
    for (const file of files) {
      // 型定義ファイル自体と comparison ディレクトリは除外
      if (
        file.includes('comparisonTypes') ||
        file.includes('ComparisonScope') ||
        file.includes('comparisonFrame')
      )
        continue
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i]) && !lines[i].includes('import type')) {
          violations.push(`${rel(file)}:${i + 1}: ${lines[i].trim()}`)
        }
      }
    }
    expect(
      violations,
      'ComparisonFrame の値 import が検出されました。ComparisonScope を使用してください。',
    ).toEqual([])
  })
})

// ── Claim: 削除済み互換経路が復活していない ──

describe('Claim: 削除済み互換経路の再発禁止', () => {
  const DELETED_PATHS = [
    'application/hooks/useDuckDBQuery.ts',
    'presentation/components/charts/useDuckDBTimeSlotData.ts',
    'presentation/components/charts/useDuckDBTimeSlotDataLogic.ts',
  ]

  for (const deletedPath of DELETED_PATHS) {
    it(`${deletedPath} が復活していない`, () => {
      const fullPath = path.join(SRC_DIR, deletedPath)
      expect(
        fs.existsSync(fullPath),
        `削除済みファイル ${deletedPath} が復活しています。CLAUDE.md §移行完了済み経路を参照。`,
      ).toBe(false)
    })
  }

  it('useDuckDBTimeSlotData エイリアスが実装コードで import されていない', () => {
    const violations: string[] = []
    // import 文でのエイリアス使用を検出（allowlist/test 内の文字列参照は除外）
    const pattern = /import\s.*useDuckDBTimeSlotData/
    const files = collectTsFiles(SRC_DIR)
    for (const file of files) {
      const relPath = rel(file)
      // テスト・allowlist・型定義内の参照は除外
      if (relPath.includes('test/') || relPath.includes('allowlist')) continue
      const content = fs.readFileSync(file, 'utf-8')
      if (pattern.test(content)) {
        violations.push(relPath)
      }
    }
    expect(violations, 'useDuckDBTimeSlotData エイリアスの import が残存').toEqual([])
  })
})

// ── Claim: presentationDuckdbHook は全件卒業済み（MAX=0 凍結） ──

describe('Claim: presentation から DuckDB hook の直接 import が 0', () => {
  it('presentation/ に infrastructure/duckdb の直接 import がない', () => {
    const violations: string[] = []
    const pattern = /from\s+['"]@\/infrastructure\/duckdb/
    const files = collectTsFiles(path.join(SRC_DIR, 'presentation'))
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          violations.push(`${rel(file)}:${i + 1}`)
        }
      }
    }
    expect(
      violations,
      'presentation/ から infrastructure/duckdb への直接 import が検出されました',
    ).toEqual([])
  })
})

// ── Claim: bridge は 2 件以下（収束中） ──

describe('Claim: bridge allowlist の収束', () => {
  it('bridge カテゴリのエントリ一覧を報告する', () => {
    // 全 allowlist を走査して bridge カテゴリを収集
    const allAllowlists = path.join(SRC_DIR, 'test/allowlists')
    const files = fs.readdirSync(allAllowlists).filter((f) => f.endsWith('.ts') && f !== 'types.ts')
    const bridgeEntries: string[] = []

    for (const file of files) {
      const content = fs.readFileSync(path.join(allAllowlists, file), 'utf-8')
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("category: 'bridge'")) {
          // 前の行から path を取得
          for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
            const pathMatch = lines[j].match(/path:\s*'([^']+)'/)
            if (pathMatch) {
              bridgeEntries.push(pathMatch[1])
              break
            }
          }
        }
      }
    }

    expect(
      bridgeEntries.length,
      `bridge エントリが ${bridgeEntries.length} 件: ${bridgeEntries.join(', ')}`,
    ).toBeLessThanOrEqual(2)
  })
})

// ── Claim: CLAUDE.md の「新規追加禁止」が guard に反映されている ──

describe('Claim: CLAUDE.md 新規追加禁止ルールの guard 反映', () => {
  it('後方互換バレル（re-export のみ）の新規追加がない', () => {
    // 設計原則 C7: 後方互換バレル（re-export のみのファイル）を新規追加しない
    // 既存の互換バレルはすでに削除済みのため、復活していないことを確認
    const deletedPaths = [
      'application/hooks/useDuckDBQuery.ts',
      'presentation/components/charts/useDuckDBTimeSlotData.ts',
    ]
    for (const p of deletedPaths) {
      const fullPath = path.join(ROOT_DIR, 'app', 'src', p)
      expect(
        fs.existsSync(fullPath),
        `削除済みパス ${p} が復活しています。`,
      ).toBe(false)
    }
  })
})
