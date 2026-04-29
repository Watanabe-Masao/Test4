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
import type { DocRef, HealthKpi } from '../types.js'
import { renderAagResponse, buildObligationResponse } from '../aag-response.js'

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
  /**
   * Phase K Option 1 後続 F (2026-04-29):
   * true なら **新規追加ファイル** (`git diff --name-only --diff-filter=A`) のみを
   * trigger 対象にする。既存ファイルの modification は trigger しない。
   * 「新規 .md → registry 登録必須」のような additive-only な義務に使用する。
   * 既定値 false (= 全変更を trigger 対象 = 従来挙動)。
   */
  readonly triggerOnAdded?: boolean
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
  // --- WASM invariant テスト変更 → invariant-catalog 更新必須 ---
  {
    pathPattern: 'wasm/',
    obligationId: 'obligation.wasm.invariants',
    label: 'WASM invariant テスト追加・変更時は invariant-catalog.md への登録が必要',
    check: { type: 'file_modified', file: 'references/03-guides/invariant-catalog.md' },
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
  // --- references/ に新文書追加 → doc-registry.json に登録 ---
  // triggerOnAdded: true で新規 .md 追加のみを trigger 対象にする (既存ファイル
  // modification は registry 既登録済のため obligation 不要、Phase K F 改善)。
  {
    pathPattern: 'references/03-guides/',
    obligationId: 'obligation.guides.registry',
    label: '実装ガイド追加時は doc-registry.json にも登録が必要',
    check: { type: 'file_modified', file: 'docs/contracts/doc-registry.json' },
    triggerOnAdded: true,
  },
  // --- features/ に新モジュール追加 → CLAUDE.md 更新 ---
  {
    pathPattern: 'app/src/features/',
    obligationId: 'obligation.features.docs',
    label: 'features/ モジュール追加時は docs:generate でプロジェクト構成を更新',
    check: { type: 'health_regenerated' },
  },
  // --- widget registry source 変更 → 対応 WID-NNN.md frontmatter sync ---
  // Phase A scope: Anchor Slice 5 件（WID-002 / 006 / 018 / 033 / 040）。
  // 強い co-change 検証は AR-CONTENT-SPEC-FRONTMATTER-SYNC guard 側で行うため、
  // 本 entry は generated_section_fresh 互換の placeholder で「変更検知 → CI が
  // guard を回す」までの導線を貼るのみ。Phase B で 45 件全体に拡大、Phase I で
  // PR base..HEAD diff ベースの強い co-change 検証に置換する。
  {
    pathPattern: 'app/src/presentation/pages/',
    obligationId: 'obligation.widget-spec.frontmatter-sync',
    label:
      'Widget registry 変更時は対応 WID-NNN.md frontmatter の sync が必要 (`npm run content-specs:check`)',
    check: { type: 'health_regenerated' },
  },
] as const

// ---------------------------------------------------------------------------
// Required Reads Map — 編集パス → 必読 docs / refs
//
// 「特定パスを編集するときに読むべき docs/refs」の宣言マップ。
// 既存 OBLIGATION_MAP（チェック付き）とは別の関心事であり、
// CLAUDE.md Trigger Map と UserPromptSubmit hook の基盤データになる。
//
// - pathPrefix: 編集パスの prefix（簡易マッチ）
// - requiredReads: そのパスを編集する前に読むべき docs/refs の path 配列
// - rationale: なぜ読む必要があるか（人間可読）
// ---------------------------------------------------------------------------

export interface RequiredReadsRule {
  readonly pathPrefix: string
  readonly requiredReads: readonly string[]
  readonly rationale: string
}

export const PATH_TO_REQUIRED_READS: readonly RequiredReadsRule[] = [
  {
    pathPrefix: 'app/src/application/readModels/grossProfit/',
    requiredReads: ['references/01-principles/gross-profit-definition.md'],
    rationale: '粗利 readModel 変更時は粗利定義書を必読（4種の粗利の意味と計算式）',
  },
  {
    pathPrefix: 'app/src/application/readModels/purchaseCost/',
    requiredReads: ['references/01-principles/purchase-cost-definition.md'],
    rationale: '仕入原価 readModel 変更時は仕入原価定義書を必読（3独立正本の統合契約）',
  },
  {
    pathPrefix: 'app/src/application/readModels/salesFact/',
    requiredReads: ['references/01-principles/sales-definition.md'],
    rationale: '売上 readModel 変更時は売上定義書を必読',
  },
  {
    pathPrefix: 'app/src/application/readModels/discountFact/',
    requiredReads: ['references/01-principles/discount-definition.md'],
    rationale: '値引き readModel 変更時は値引き定義書を必読',
  },
  {
    pathPrefix: 'app/src/application/readModels/customerFact/',
    requiredReads: ['references/01-principles/customer-definition.md'],
    rationale: '客数 readModel 変更時は客数定義書を必読',
  },
  {
    pathPrefix: 'app/src/application/readModels/factorDecomposition/',
    requiredReads: ['references/01-principles/authoritative-calculation-definition.md'],
    rationale: '要因分解 readModel 変更時は authoritative 計算定義書を必読',
  },
  {
    pathPrefix: 'app/src/domain/calculations/',
    requiredReads: ['references/03-guides/invariant-catalog.md'],
    rationale: 'ドメイン計算変更時は不変条件カタログを必読（D1/D2/D3 の数学的不変条件）',
  },
  {
    pathPrefix: 'app/src/infrastructure/duckdb/',
    requiredReads: ['references/03-guides/duckdb-architecture.md'],
    rationale: 'DuckDB infrastructure 変更時は DuckDB アーキテクチャガイドを必読',
  },
  {
    pathPrefix: 'app/src/application/usecases/explanation/',
    requiredReads: ['references/03-guides/explanation-architecture.md'],
    rationale: 'Explanation usecase 変更時は説明責任アーキテクチャを必読（L1→L2→L3 3段階）',
  },
] as const

/**
 * pathPrefix にマッチする RequiredReadsRule を返す（複数マッチあり）。
 * 将来的に CLAUDE.md Trigger Map / UserPromptSubmit hook が利用する API。
 */
export function lookupRequiredReads(changedPath: string): RequiredReadsRule[] {
  return PATH_TO_REQUIRED_READS.filter((rule) => changedPath.startsWith(rule.pathPrefix))
}

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

/**
 * Phase K Option 1 後続 F (2026-04-29):
 * git diff で **新規追加** ファイルのみを取得する (`--diff-filter=A`)。
 * `triggerOnAdded: true` の obligation rule で使用。
 */
function getAddedFiles(repoRoot: string, base?: string): string[] {
  const diffTarget = base ?? 'HEAD~1'
  try {
    const output = execSync(
      `git diff --name-only --diff-filter=A ${diffTarget} 2>/dev/null`,
      {
        cwd: repoRoot,
        encoding: 'utf-8',
        timeout: 10000,
      },
    )
    return output
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  } catch {
    return []
  }
}

function isHealthJsonFresh(_repoRoot: string, changedFiles: string[]): boolean {
  return changedFiles.includes('references/02-status/generated/architecture-health.json')
}

/**
 * Generated section（`<!-- GENERATED:START ... -->` ～ `<!-- GENERATED:END ... -->`）
 * を除去して、手書き部分のみを返す。
 */
function stripGeneratedSections(content: string): string {
  return content.replace(/<!-- GENERATED:START [^>]*-->[\s\S]*?<!-- GENERATED:END [^>]*-->/g, '')
}

/**
 * ファイルの変更が generated section 内のみかどうかを判定する。
 * 手書き部分が変わっていなければ true（= obligation のトリガーにしない）。
 *
 * - generated section マーカーを持たないファイルは常に false（通常の変更として扱う）
 * - 旧バージョン取得に失敗した場合も false（安全側に倒す）
 */
function isGeneratedSectionOnlyChange(
  repoRoot: string,
  file: string,
  diffTarget: string,
): boolean {
  try {
    const filePath = resolve(repoRoot, file)
    if (!existsSync(filePath)) return false
    const newContent = readFileSync(filePath, 'utf-8')

    // generated section マーカーがなければ通常のファイル変更
    if (!newContent.includes('<!-- GENERATED:START ')) return false

    const oldContent = execSync(`git show ${diffTarget}:${file} 2>/dev/null`, {
      cwd: repoRoot,
      encoding: 'utf-8',
      timeout: 10000,
    })

    return stripGeneratedSections(oldContent).trim() === stripGeneratedSections(newContent).trim()
  } catch {
    // 取得失敗（新規ファイル等）は安全側: 通常の変更として扱う
    return false
  }
}

export function collectObligations(
  repoRoot: string,
  options?: { base?: string },
): HealthKpi[] {
  const diffTarget = options?.base ?? 'HEAD~1'
  const changedFiles = getChangedFiles(repoRoot, options?.base)
  if (changedFiles.length === 0) return []
  // triggerOnAdded: true の rule 評価用に新規追加ファイル list も並行取得
  const addedFiles = getAddedFiles(repoRoot, options?.base)

  const kpis: HealthKpi[] = []
  let violations = 0

  for (const rule of OBLIGATION_MAP) {
    // triggerOnAdded: true なら新規追加ファイルのみ、false (default) なら全変更ファイルを trigger source とする
    const sourceFiles = rule.triggerOnAdded ? addedFiles : changedFiles
    // generated section のみの変更はトリガーから除外する
    const triggered = sourceFiles.some(
      (f) =>
        f.startsWith(rule.pathPattern) && !isGeneratedSectionOnlyChange(repoRoot, f, diffTarget),
    )
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

    if (!satisfied) {
      violations++
      // 単一描画経路: aag-response.ts の renderAagResponse() を経由
      if (process.env.AAG_VERBOSE !== '0') {
        const resp = buildObligationResponse(rule.label, rule.pathPattern)
        console.error(renderAagResponse(resp))
      }
    }
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
 * Required Reads マップの宣言数 + broken link 数を KPI として返す。
 *
 * - declaredCount: PATH_TO_REQUIRED_READS の宣言数（情報用、status: 'ok'）
 * - brokenLinks: requiredReads が指す doc が実在しない数（status: brokenLinks > 0 で 'fail'）
 *
 * 将来 CLAUDE.md Trigger Map と UserPromptSubmit hook が同じ宣言を参照するため、
 * リンク健全性をここで保証する。
 */
export function collectRequiredReadsKpis(repoRoot: string): HealthKpi[] {
  let brokenLinks = 0
  for (const rule of PATH_TO_REQUIRED_READS) {
    for (const docPath of rule.requiredReads) {
      const absPath = resolve(repoRoot, docPath)
      if (!existsSync(absPath)) {
        brokenLinks++
      }
    }
  }

  const docRefs: DocRef[] = [
    {
      kind: 'definition',
      path: 'tools/architecture-health/src/collectors/obligation-collector.ts',
    },
  ]

  return [
    {
      id: 'docs.obligation.requiredReads.declaredCount',
      label: 'Required Reads マップ宣言数',
      category: 'docs',
      value: PATH_TO_REQUIRED_READS.length,
      unit: 'count',
      status: 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: [],
    },
    {
      id: 'docs.obligation.requiredReads.brokenLinks',
      label: 'Required Reads マップ broken link 数',
      category: 'docs',
      value: brokenLinks,
      unit: 'count',
      status: brokenLinks > 0 ? 'fail' : 'ok',
      owner: 'documentation-steward',
      docRefs,
      implRefs: [],
    },
  ]
}

/**
 * 詳細なレポート（CI / PR コメント用）
 */
export function reportObligationDetails(
  repoRoot: string,
  options?: { base?: string },
): { rule: ObligationRule; satisfied: boolean }[] {
  const diffTarget = options?.base ?? 'HEAD~1'
  const changedFiles = getChangedFiles(repoRoot, options?.base)
  if (changedFiles.length === 0) return []

  const results: { rule: ObligationRule; satisfied: boolean }[] = []

  for (const rule of OBLIGATION_MAP) {
    // generated section のみの変更はトリガーから除外する
    const triggered = changedFiles.some(
      (f) =>
        f.startsWith(rule.pathPattern) && !isGeneratedSectionOnlyChange(repoRoot, f, diffTarget),
    )
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
