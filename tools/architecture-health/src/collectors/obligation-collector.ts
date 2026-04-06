/**
 * Obligation Collector — 変更パス → doc 更新義務の検出
 *
 * git diff から変更ファイルを取得し、
 * obligation map に基づいて「更新すべきだが未更新」の doc を検出する。
 *
 * CI で `docs:check` として実行し、不履行で fail させる。
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { HealthKpi } from '../types.js'

// ---------------------------------------------------------------------------
// Obligation Map — パスパターン → 更新義務のある doc/action
// ---------------------------------------------------------------------------

export interface ObligationRule {
  /** 変更パスの glob パターン（簡易マッチ用の prefix） */
  readonly pathPattern: string
  /** 更新が必要な doc または action の ID */
  readonly obligationId: string
  /** 人間可読な説明 */
  readonly label: string
  /** 検証方法 */
  readonly check: ObligationCheck
}

type ObligationCheck =
  | { readonly type: 'generated_section_fresh' }
  | { readonly type: 'file_modified'; readonly file: string }
  | { readonly type: 'health_regenerated' }

export const OBLIGATION_MAP: readonly ObligationRule[] = [
  // --- allowlist 変更 → health regeneration ---
  {
    pathPattern: 'app/src/test/allowlists/',
    obligationId: 'obligation.allowlist.health',
    label: 'Allowlist 変更時は health regeneration が必要',
    check: { type: 'health_regenerated' },
  },
  // --- readModels 変更 → 定義書確認 ---
  {
    pathPattern: 'app/src/application/readModels/',
    obligationId: 'obligation.readModel.definition',
    label: 'readModel 変更時は定義書リンク確認が必要',
    check: { type: 'file_modified', file: 'references/02-status/generated/architecture-health.json' },
  },
  // --- guard 変更 → health regeneration ---
  {
    pathPattern: 'app/src/test/guards/',
    obligationId: 'obligation.guard.health',
    label: 'Guard 変更時は health regeneration が必要',
    check: { type: 'health_regenerated' },
  },
  // --- domain/calculations 変更 → canon registry 確認 ---
  {
    pathPattern: 'app/src/domain/calculations/',
    obligationId: 'obligation.calculation.registry',
    label: '計算ファイル変更時は calculationCanonRegistry 確認が必要',
    check: { type: 'file_modified', file: 'app/src/test/calculationCanonRegistry.ts' },
  },
  // --- CI workflow 変更 → project-metadata 確認 ---
  {
    pathPattern: '.github/workflows/',
    obligationId: 'obligation.ci.metadata',
    label: 'CI workflow 変更時は project-metadata.json 確認が必要',
    check: { type: 'file_modified', file: 'docs/contracts/project-metadata.json' },
  },
  // --- WASM 変更 → setup docs 確認 ---
  {
    pathPattern: 'wasm/',
    obligationId: 'obligation.wasm.docs',
    label: 'WASM 変更時は setup docs 確認が必要',
    check: { type: 'file_modified', file: 'docs/contracts/project-metadata.json' },
  },
  // --- principles 変更 → contracts 確認 ---
  {
    pathPattern: 'references/01-principles/',
    obligationId: 'obligation.principles.contracts',
    label: '設計原則変更時は principles.json 確認が必要',
    check: { type: 'file_modified', file: 'docs/contracts/principles.json' },
  },
  // --- health ツール変更 → generated docs 再生成必須 ---
  {
    pathPattern: 'tools/architecture-health/',
    obligationId: 'obligation.health-tool.regenerate',
    label: 'Health ツール変更時は docs:generate 再実行が必要',
    check: { type: 'health_regenerated' },
  },
  // --- DuckDB ロード順序変更 → ドキュメント更新必須 ---
  {
    pathPattern: 'app/src/application/runtime-adapters/useDuckDB.ts',
    obligationId: 'obligation.duckdb-loading.doc',
    label: 'DuckDB ロード順序変更時はデータロード順序図の更新が必要',
    check: { type: 'file_modified', file: 'references/03-guides/duckdb-data-loading-sequence.md' },
  },
  // --- チャートデータフロー変更 → マップ更新必須 ---
  {
    pathPattern: 'app/src/application/hooks/plans/',
    obligationId: 'obligation.chart-plan.doc',
    label: 'Screen Plan 変更時はチャートデータフローマップの更新が必要',
    check: { type: 'file_modified', file: 'references/03-guides/chart-data-flow-map.md' },
  },
  // --- ページレジストリ変更 → チェックリスト確認 ---
  {
    pathPattern: 'app/src/application/navigation/pageRegistry.ts',
    obligationId: 'obligation.page-registry.doc',
    label: 'ページレジストリ変更時は新規ページチェックリストの確認が必要',
    check: { type: 'file_modified', file: 'references/03-guides/new-page-checklist.md' },
  },
  // --- DuckDB スキーマ変更 → 型境界契約確認 ---
  {
    pathPattern: 'app/src/infrastructure/duckdb/schemas.ts',
    obligationId: 'obligation.duckdb-schema.doc',
    label: 'DuckDB スキーマ変更時は型境界契約の確認が必要',
    check: { type: 'file_modified', file: 'references/03-guides/duckdb-type-boundary-contract.md' },
  },
  // Hook の責務分離は obligation ではなくガードテストで強制する
  // → responsibilitySeparationGuard.test.ts (G8: useMemo+useCallback 合計上限)
  // --- health rules 変更 → health.json 再生成必須 ---
  {
    pathPattern: 'tools/architecture-health/src/config/',
    obligationId: 'obligation.health-config.regenerate',
    label: 'Health ルール/リンク変更時は health.json 再生成が必要',
    check: { type: 'health_regenerated' },
  },
  // --- generated/** の手編集禁止 ---
  {
    pathPattern: 'references/02-status/generated/',
    obligationId: 'obligation.generated.no-manual-edit',
    label: 'Generated ファイルは手編集禁止（docs:generate で再生成すること）',
    check: { type: 'health_regenerated' },
  },
] as const

// ---------------------------------------------------------------------------
// 収集
// ---------------------------------------------------------------------------

/**
 * git diff で変更ファイルを取得する。
 * base が指定されていれば base..HEAD、なければ HEAD~1..HEAD を使う。
 */
function getChangedFiles(repoRoot: string, base?: string): string[] {
  const diffTarget = base ?? 'HEAD~1'
  try {
    const output = execSync(`git diff --name-only ${diffTarget} 2>/dev/null`, {
      cwd: repoRoot,
      encoding: 'utf-8',
      timeout: 10000,
    })
    return output
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  } catch {
    return []
  }
}

function isHealthJsonFresh(repoRoot: string, changedFiles: string[]): boolean {
  return changedFiles.includes('references/02-status/generated/architecture-health.json')
}

export function collectObligations(
  repoRoot: string,
  options?: { base?: string },
): HealthKpi[] {
  const changedFiles = getChangedFiles(repoRoot, options?.base)
  if (changedFiles.length === 0) return []

  const kpis: HealthKpi[] = []
  let violations = 0

  for (const rule of OBLIGATION_MAP) {
    const triggered = changedFiles.some((f) => f.startsWith(rule.pathPattern))
    if (!triggered) continue

    let satisfied: boolean
    switch (rule.check.type) {
      case 'health_regenerated':
        satisfied = isHealthJsonFresh(repoRoot, changedFiles)
        break
      case 'generated_section_fresh':
        satisfied = isHealthJsonFresh(repoRoot, changedFiles)
        break
      case 'file_modified':
        satisfied = changedFiles.includes(rule.check.file)
        break
    }

    if (!satisfied) violations++
  }

  kpis.push({
    id: 'docs.obligation.violations',
    label: 'Doc 更新義務違反数',
    category: 'docs',
    value: violations,
    unit: 'count',
    status: 'ok',
    owner: 'documentation-steward',
    docRefs: [
      { kind: 'definition', path: 'tools/architecture-health/src/collectors/obligation-collector.ts' },
    ],
    implRefs: [],
  })

  return kpis
}

/**
 * 詳細なレポート（CI / PR コメント用）
 */
export function reportObligationDetails(
  repoRoot: string,
  options?: { base?: string },
): { rule: ObligationRule; satisfied: boolean }[] {
  const changedFiles = getChangedFiles(repoRoot, options?.base)
  if (changedFiles.length === 0) return []

  const results: { rule: ObligationRule; satisfied: boolean }[] = []

  for (const rule of OBLIGATION_MAP) {
    const triggered = changedFiles.some((f) => f.startsWith(rule.pathPattern))
    if (!triggered) continue

    let satisfied: boolean
    switch (rule.check.type) {
      case 'health_regenerated':
        satisfied = isHealthJsonFresh(repoRoot, changedFiles)
        break
      case 'generated_section_fresh':
        satisfied = isHealthJsonFresh(repoRoot, changedFiles)
        break
      case 'file_modified':
        satisfied = changedFiles.includes(rule.check.file)
        break
    }

    results.push({ rule, satisfied })
  }

  return results
}
