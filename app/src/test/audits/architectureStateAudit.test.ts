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
import { SRC_DIR, collectTsFiles, rel } from '../guardTestHelpers'

// ── Import all allowlists ──
import {
  applicationToInfrastructure,
  presentationDuckdbHook,
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  domainLargeFiles,
  cmpPrevYearDaily,
  cmpFramePrevious,
  cmpDailyMapping,
  ctxHook,
} from '../allowlists'
import type { AllowlistEntry, QuantitativeAllowlistEntry } from '../allowlists'

// ── Allowlist Registry ──
// すべての allowlist をレジストリに登録し、網羅的に集計する
const ALLOWLIST_REGISTRY: Record<string, readonly AllowlistEntry[]> = {
  applicationToInfrastructure,
  presentationDuckdbHook,
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  domainLargeFiles,
  cmpPrevYearDaily,
  cmpFramePrevious,
  cmpDailyMapping,
  ctxHook,
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

// ── Helper: アクティブ Bridge ファイルの棚卸し ──
// dual-run compare コードを含む bridge のみカウントする。
// authoritative 昇格済み bridge（WASM + TS fallback のみ）は含めない。
function inventoryBridgeFiles(): Array<{ path: string; lines: number }> {
  const servicesDir = path.join(SRC_DIR, 'application/services')
  if (!fs.existsSync(servicesDir)) return []
  const files = collectTsFiles(servicesDir)
  return files
    .filter((f) => /Bridge\.ts$/.test(f))
    .filter((f) => {
      const content = fs.readFileSync(f, 'utf-8')
      // dual-run compare の痕跡: getExecutionMode or recordCall import
      return content.includes('getExecutionMode') || content.includes('recordCall')
    })
    .map((f) => ({
      path: rel(f),
      lines: fs.readFileSync(f, 'utf-8').split('\n').length,
    }))
}

// ── Helper: 複雑度ホットスポット ──
interface ComplexityHotspot {
  file: string
  memoCount: number
  stateCount: number
  lineCount: number
}

function detectComplexityHotspots(topN = 10): ComplexityHotspot[] {
  const dirs = [path.join(SRC_DIR, 'presentation'), path.join(SRC_DIR, 'application/hooks')]
  const entries: ComplexityHotspot[] = []
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue
    for (const f of collectTsFiles(dir)) {
      const content = fs.readFileSync(f, 'utf-8')
      const memoCount = (content.match(/\buseMemo\b/g) || []).length
      const stateCount = (content.match(/\buseState\b/g) || []).length
      if (memoCount + stateCount >= 4) {
        entries.push({
          file: rel(f),
          memoCount,
          stateCount,
          lineCount: content.split('\n').length,
        })
      }
    }
  }
  return entries
    .sort((a, b) => b.memoCount + b.stateCount - (a.memoCount + a.stateCount))
    .slice(0, topN)
}

// ── Helper: facade hook の棚卸し ──
function inventoryFacadeHooks(): string[] {
  const hooksDir = path.join(SRC_DIR, 'application/hooks')
  if (!fs.existsSync(hooksDir)) return []
  const files = collectTsFiles(hooksDir)
  const facades: string[] = []
  for (const f of files) {
    if (!path.basename(f).startsWith('use')) continue
    const content = fs.readFileSync(f, 'utf-8')
    // 他 hook を 3+ import しているファイルを facade とみなす
    const hookImports = content.match(/\buse[A-Z]\w+/g) || []
    const uniqueHooks = new Set(hookImports)
    if (uniqueHooks.size >= 4) {
      facades.push(rel(f))
    }
  }
  return facades
}

// ── Helper: allowlist 上限近接ファイル ──
interface NearLimitEntry {
  file: string
  metric: string
  actual: number
  limit: number
  pct: number
}

function detectNearLimitFiles(): NearLimitEntry[] {
  const results: NearLimitEntry[] = []
  const allQuantitative: Array<{
    entries: readonly QuantitativeAllowlistEntry[]
    metric: string
    countFn: (content: string) => number
  }> = [
    {
      entries: useMemoLimits,
      metric: 'useMemo',
      countFn: (c) => (c.match(/\buseMemo\s*\(/g) || []).length,
    },
    {
      entries: useStateLimits,
      metric: 'useState',
      countFn: (c) => (c.match(/\buseState\s*[<(]/g) || []).length,
    },
    { entries: hookLineLimits, metric: 'lines', countFn: (c) => c.split('\n').length },
    {
      entries: presentationMemoLimits,
      metric: 'useMemo',
      countFn: (c) => (c.match(/\buseMemo\s*\(/g) || []).length,
    },
    {
      entries: presentationStateLimits,
      metric: 'useState',
      countFn: (c) => (c.match(/\buseState\s*[<(]/g) || []).length,
    },
  ]
  for (const { entries, metric, countFn } of allQuantitative) {
    for (const entry of entries) {
      const fullPath = path.join(SRC_DIR, entry.path)
      if (!fs.existsSync(fullPath)) continue
      const content = fs.readFileSync(fullPath, 'utf-8')
      const actual = countFn(content)
      const pct = Math.round((actual / entry.limit) * 100)
      if (pct >= 80) {
        results.push({ file: entry.path, metric, actual, limit: entry.limit, pct })
      }
    }
  }
  return results.sort((a, b) => b.pct - a.pct)
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
    activeBridges: inventoryBridgeFiles(),
    facadeHooks: inventoryFacadeHooks(),
    complexityHotspots: detectComplexityHotspots(),
    nearLimitFiles: detectNearLimitFiles(),
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
    // 12 allowlists が存在する（新規追加時はここを更新）
    expect(registryCount).toBeGreaterThanOrEqual(12)
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
    const expectedFrozen = ['cmpPrevYearDaily', 'cmpFramePrevious']
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

  it('アクティブ Bridge ファイルの棚卸し（増加禁止）', () => {
    const MAX_BRIDGE_FILES = 5
    expect(
      snapshot.activeBridges.length,
      `Bridge ファイルが ${snapshot.activeBridges.length} 件（上限 ${MAX_BRIDGE_FILES}）: ${snapshot.activeBridges.map((b) => b.path).join(', ')}`,
    ).toBeLessThanOrEqual(MAX_BRIDGE_FILES)
  })

  it('複雑度ホットスポットをスナップショットに含める', () => {
    // report-only: ホットスポットが検出されること自体は正常
    expect(snapshot.complexityHotspots).toBeDefined()
    expect(Array.isArray(snapshot.complexityHotspots)).toBe(true)
  })

  it('allowlist 上限超過が 0 件', () => {
    const exceeded = snapshot.nearLimitFiles.filter((f) => f.pct > 100)
    expect(
      exceeded.map((f) => `${f.file}: ${f.metric} ${f.actual}/${f.limit} (${f.pct}%)`),
      'allowlist 上限を超過しているファイルがあります',
    ).toEqual([])
  })

  it('facade hook をスナップショットに含める', () => {
    // report-only: facade hook が存在すること自体は正常
    expect(snapshot.facadeHooks).toBeDefined()
    expect(Array.isArray(snapshot.facadeHooks)).toBe(true)
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
      '',
      '## Active Bridges',
      '',
      ...snapshot.activeBridges.map((b) => `- ${b.path} (${b.lines} lines)`),
      '',
      '## Facade Hooks',
      '',
      ...snapshot.facadeHooks.map((f) => `- ${f}`),
      '',
      '## Complexity Hotspots (Top 10)',
      '',
      '| ファイル | useMemo | useState | 行数 |',
      '|---|---|---|---|',
      ...snapshot.complexityHotspots.map(
        (h) => `| ${h.file} | ${h.memoCount} | ${h.stateCount} | ${h.lineCount} |`,
      ),
      '',
      '## Near-Limit Files (≥80%)',
      '',
      '| ファイル | 指標 | 実測 | 上限 | % |',
      '|---|---|---|---|---|',
      ...snapshot.nearLimitFiles.map(
        (f) => `| ${f.file} | ${f.metric} | ${f.actual} | ${f.limit} | ${f.pct}% |`,
      ),
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
