/**
 * Architecture State Audit — 構造状態スナップショット
 *
 * allowlist 件数・カテゴリ内訳・凍結状態・複雑度ホットスポットを
 * 機械的にスナップショット化し、構造の現在地を観測する。
 *
 * guards/ が「違反を止める」のに対し、この監査は「状態を観測し数値化する」。
 * 文書ではなくこの監査出力を構造状態の正本とする。
 *
 * @audit Architecture State Snapshot
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { SRC_DIR, collectTsFiles } from '../guardTestHelpers'

// ── Import all allowlists ──
import {
  applicationToInfrastructure,
  presentationToInfrastructure,
  infrastructureToApplication,
  presentationToUsecases,
  presentationDuckdbHook,
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  largeComponentTier2,
  infraLargeFiles,
  domainLargeFiles,
  usecasesLargeFiles,
  cmpPrevYearDaily,
  cmpFramePrevious,
  cmpDailyMapping,
  dowCalcOverride,
  ctxHook,
  vmReactImport,
  sideEffectChain,
} from '../allowlists'
import type { AllowlistEntry } from '../allowlists'

// ── Allowlist Registry ──
// すべての allowlist をレジストリに登録し、網羅的に集計する
const ALLOWLIST_REGISTRY: Record<string, readonly AllowlistEntry[]> = {
  applicationToInfrastructure,
  presentationToInfrastructure,
  infrastructureToApplication,
  presentationToUsecases,
  presentationDuckdbHook,
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  largeComponentTier2,
  infraLargeFiles,
  domainLargeFiles,
  usecasesLargeFiles,
  cmpPrevYearDaily,
  cmpFramePrevious,
  cmpDailyMapping,
  dowCalcOverride,
  ctxHook,
  vmReactImport,
  sideEffectChain,
}

// ── Helper: カテゴリ集計 ──
function countByCategory(entries: readonly AllowlistEntry[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of entries) {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1
  }
  return counts
}

// ── Helper: 凍結判定（0件 = 凍結） ──
function frozenLists(): string[] {
  return Object.entries(ALLOWLIST_REGISTRY)
    .filter(([, entries]) => entries.length === 0)
    .map(([name]) => name)
}

// ── Helper: .vm.ts 件数 ──
function countVmFiles(): number {
  const files = collectTsFiles(SRC_DIR)
  return files.filter((f) => f.endsWith('.vm.ts')).length
}

// ── Helper: 互換 re-export 残数 ──
function countCompatReexports(): number {
  const files = collectTsFiles(SRC_DIR)
  let count = 0
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8')
    const lines = content
      .split('\n')
      .filter((l) => l.trim().length > 0 && !l.trim().startsWith('//'))
    // ファイルが re-export のみで構成されているかチェック
    const reExportLines = lines.filter(
      (l) => /^export\s+\{/.test(l.trim()) || /^export\s+type\s+\{/.test(l.trim()),
    )
    // re-export only file: 実質行が全て export 文
    if (lines.length > 0 && lines.length <= 5 && reExportLines.length === lines.length) {
      // index.ts バレルは除外（正当なバレル）
      if (!f.endsWith('/index.ts')) {
        count++
      }
    }
  }
  return count
}

// ── Snapshot 生成 ──
function generateSnapshot() {
  const allEntries = Object.values(ALLOWLIST_REGISTRY).flat()
  const totalCount = allEntries.length
  const categoryBreakdown = countByCategory(allEntries)
  const frozen = frozenLists()

  const listSummary: Record<string, { count: number; categories: Record<string, number> }> = {}
  for (const [name, entries] of Object.entries(ALLOWLIST_REGISTRY)) {
    listSummary[name] = {
      count: entries.length,
      categories: countByCategory(entries),
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalAllowlistEntries: totalCount,
    categoryBreakdown,
    frozenLists: frozen,
    frozenCount: frozen.length,
    activeLists: Object.keys(ALLOWLIST_REGISTRY).length - frozen.length,
    vmFileCount: countVmFiles(),
    compatReexportCount: countCompatReexports(),
    listSummary,
  }
}

// ── Tests ──

describe('Architecture State Audit — 構造状態スナップショット', () => {
  const snapshot = generateSnapshot()

  it('スナップショットが生成される', () => {
    expect(snapshot.totalAllowlistEntries).toBeGreaterThanOrEqual(0)
    expect(snapshot.timestamp).toBeTruthy()
  })

  it('全 allowlist がレジストリに登録されている', () => {
    // allowlists/index.ts の export 数と一致するか
    const registryCount = Object.keys(ALLOWLIST_REGISTRY).length
    // 21 allowlists が存在する（新規追加時はここを更新）
    expect(registryCount).toBeGreaterThanOrEqual(21)
  })

  it('migration カテゴリが 0 件（全件解消済み）', () => {
    const migrationCount = snapshot.categoryBreakdown['migration'] ?? 0
    expect(
      migrationCount,
      `migration カテゴリに ${migrationCount} 件の残件があります。全件解消済みのはずです。`,
    ).toBe(0)
  })

  it('legacy カテゴリが 0 件（全件解消済み）', () => {
    const legacyCount = snapshot.categoryBreakdown['legacy'] ?? 0
    expect(
      legacyCount,
      `legacy カテゴリに ${legacyCount} 件の残件があります。全件解消済みのはずです。`,
    ).toBe(0)
  })

  it('凍結リストが期待通り凍結されている', () => {
    // 以下は全件解消済みで空であるべき
    const expectedFrozen = [
      'presentationToInfrastructure',
      'infrastructureToApplication',
      'largeComponentTier2',
      'cmpPrevYearDaily',
      'cmpFramePrevious',
    ]
    for (const name of expectedFrozen) {
      expect(
        snapshot.frozenLists,
        `${name} は凍結（0件）であるべきですが、エントリが残っています。`,
      ).toContain(name)
    }
  })

  it('bridge カテゴリが 2 件以下（収束中）', () => {
    const bridgeCount = snapshot.categoryBreakdown['bridge'] ?? 0
    expect(
      bridgeCount,
      `bridge カテゴリが ${bridgeCount} 件。2件以下であるべきです。`,
    ).toBeLessThanOrEqual(2)
  })

  it('スナップショットレポートを生成する', () => {
    const reportDir = path.resolve(__dirname, '../../../../references/02-status/generated')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    // JSON レポート
    const jsonPath = path.join(reportDir, 'architecture-state-snapshot.json')
    fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2), 'utf-8')

    // Markdown レポート
    const md = [
      '# Architecture State Snapshot',
      '',
      `> Generated: ${snapshot.timestamp}`,
      '',
      '## Allowlist Summary',
      '',
      `| 指標 | 値 |`,
      `|---|---|`,
      `| 総エントリ数 | ${snapshot.totalAllowlistEntries} |`,
      `| アクティブリスト数 | ${snapshot.activeLists} |`,
      `| 凍結リスト数 | ${snapshot.frozenCount} |`,
      `| .vm.ts ファイル数 | ${snapshot.vmFileCount} |`,
      `| 互換 re-export 残数 | ${snapshot.compatReexportCount} |`,
      '',
      '## Category Breakdown',
      '',
      '| カテゴリ | 件数 |',
      '|---|---|',
      ...Object.entries(snapshot.categoryBreakdown)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, count]) => `| ${cat} | ${count} |`),
      '',
      '## Frozen Lists',
      '',
      ...snapshot.frozenLists.map((name) => `- ${name}`),
      '',
      '## Per-List Detail',
      '',
      '| リスト名 | 件数 | カテゴリ内訳 |',
      '|---|---|---|',
      ...Object.entries(snapshot.listSummary)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(
          ([name, s]) =>
            `| ${name} | ${s.count} | ${
              Object.entries(s.categories)
                .map(([c, n]) => `${c}:${n}`)
                .join(', ') || '-'
            } |`,
        ),
    ].join('\n')

    const mdPath = path.join(reportDir, 'architecture-state-snapshot.md')
    fs.writeFileSync(mdPath, md, 'utf-8')

    expect(fs.existsSync(jsonPath)).toBe(true)
    expect(fs.existsSync(mdPath)).toBe(true)
  })
})
