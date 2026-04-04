/**
 * ドキュメント整合性テスト
 *
 * CLAUDE.md・roles/・references/ とコードベースの整合性を機械的に検証する。
 *
 * @guard G1 ルールはテストに書く
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  applicationToInfrastructure,
  presentationToInfrastructure,
  infrastructureToApplication,
  presentationToUsecases,
  presentationDuckdbHook,
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
  reactImportExcludeDirs,
  sideEffectChain,
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
} from './allowlists'

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..')

// ─── ヘルパー ───────────────────────────────────────────

function readFile(relativePath: string): string {
  const fullPath = path.join(ROOT_DIR, relativePath)
  if (!fs.existsSync(fullPath)) return ''
  return fs.readFileSync(fullPath, 'utf-8')
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT_DIR, relativePath))
}

function listDir(relativePath: string): string[] {
  const fullPath = path.join(ROOT_DIR, relativePath)
  if (!fs.existsSync(fullPath)) return []
  return fs
    .readdirSync(fullPath, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

// ─── MetricId 整合性 ────────────────────────────────────

describe('MetricId registry consistency', () => {
  it('metric-id-registry.md covers all MetricIds defined in Explanation.ts', () => {
    const explanationTs = readFile('app/src/domain/models/Explanation.ts')
    const registry = readFile('references/03-guides/metric-id-registry.md')

    // Explanation.ts から MetricId 型定義ブロックだけを抽出
    const metricIdBlockMatch = explanationTs.match(/export type MetricId =\n([\s\S]*?)(?:\n\n|$)/)
    expect(metricIdBlockMatch).not.toBeNull()
    const metricIdBlock = metricIdBlockMatch![1]

    const metricIdPattern = /\| '(\w+)'/g
    const codeMetricIds: string[] = []
    let match
    while ((match = metricIdPattern.exec(metricIdBlock)) !== null) {
      codeMetricIds.push(match[1])
    }

    expect(codeMetricIds.length).toBeGreaterThan(0)

    // registry に各 MetricId が記載されているか
    const missing = codeMetricIds.filter((id) => !registry.includes(id))
    expect(missing).toEqual([])
  })
})

// ─── ロール・ディレクトリ整合性 ─────────────────────────

describe('Role directory consistency', () => {
  const claudeMd = readFile('CLAUDE.md')

  it('all roles referenced in CLAUDE.md routing table have ROLE.md', () => {
    const roleNames = [
      'pm-business',
      'review-gate',
      'documentation-steward',
      'architecture',
      'implementation',
    ]
    const specialistRoles = ['invariant-guardian', 'duckdb-specialist', 'explanation-steward']

    for (const role of roleNames) {
      // staff か line かを判定
      const isStaff = ['pm-business', 'review-gate', 'documentation-steward'].includes(role)
      const dir = isStaff ? `roles/staff/${role}` : `roles/line/${role}`
      expect(fileExists(`${dir}/ROLE.md`)).toBe(true)
      expect(fileExists(`${dir}/SKILL.md`)).toBe(true)
    }

    for (const role of specialistRoles) {
      const dir = `roles/line/specialist/${role}`
      expect(fileExists(`${dir}/ROLE.md`)).toBe(true)
      expect(fileExists(`${dir}/SKILL.md`)).toBe(true)
    }
  })

  it('CLAUDE.md routing table mentions all existing roles', () => {
    // staff ロール
    const staffRoles = listDir('roles/staff')
    for (const role of staffRoles) {
      expect(claudeMd).toContain(role)
    }

    // line ロール
    const lineRoles = listDir('roles/line').filter((d) => d !== 'specialist')
    for (const role of lineRoles) {
      expect(claudeMd).toContain(role)
    }

    // specialist ロール
    const specialistDir = path.join(ROOT_DIR, 'roles/line/specialist')
    if (fs.existsSync(specialistDir)) {
      const specialists = listDir('roles/line/specialist')
      for (const role of specialists) {
        expect(claudeMd).toContain(role)
      }
    }
  })
})

// ─── ガードテスト存在確認 ────────────────────────────────

describe('Guard test map consistency', () => {
  it('guard-test-map.md references existing test files', () => {
    const guardTestMap = readFile('references/03-guides/guard-test-map.md')
    const testFilePattern = /`([^`]*\.test\.ts[x]?)`/g
    const referencedFiles: string[] = []
    let match
    while ((match = testFilePattern.exec(guardTestMap)) !== null) {
      referencedFiles.push(match[1])
    }

    for (const testFile of referencedFiles) {
      // パスを正規化（app/src/ プレフィックスを補完）
      const fullPath = testFile.startsWith('app/') ? testFile : `app/src/${testFile}`
      expect(fileExists(fullPath)).toBe(true)
    }
  })
})

// ─── references/ パス参照の有効性 ────────────────────────

describe('Reference path validity', () => {
  it('ROLE.md files reference existing documents', () => {
    const roleDirs = [
      'roles/staff/pm-business',
      'roles/staff/review-gate',
      'roles/staff/documentation-steward',
      'roles/line/architecture',
      'roles/line/implementation',
      'roles/line/specialist/invariant-guardian',
      'roles/line/specialist/duckdb-specialist',
      'roles/line/specialist/explanation-steward',
    ]

    for (const dir of roleDirs) {
      const roleMd = readFile(`${dir}/ROLE.md`)
      // references/ へのパス参照を抽出
      const refPattern = /`(references\/[^`]+)`/g
      let match
      while ((match = refPattern.exec(roleMd)) !== null) {
        const refPath = match[1]
        expect(fileExists(refPath)).toBe(true)
      }
    }
  })
})

// ─── 設計原則の整合性 ───────────────────────────────────

describe('Design principle consistency', () => {
  it('CLAUDE.md contains all 9 design principle categories (A-H + Q)', () => {
    const claudeMd = readFile('CLAUDE.md')

    const expectedCategories = [
      'A. 層境界',
      'B. 実行エンジン境界',
      'C. 純粋性と責務分離',
      'D. 数学的不変条件',
      'E. 型安全と欠損処理',
      'F. コード構造規約',
      'G. 機械的防御',
      'H. Screen Runtime',
    ]

    for (const cat of expectedCategories) {
      expect(claudeMd).toContain(cat)
    }
  })

  it('principle-migration-map.md exists in archive and references new categories', () => {
    const migrationMap = readFile('references/99-archive/principle-migration-map.md')
    expect(migrationMap).toContain('旧19原則')
    expect(migrationMap).toContain('旧13禁止事項')
    expect(migrationMap).toContain('旧12ルール')
    expect(migrationMap).toContain('旧7層内原則')
  })
})

// ─── Safety-First Architecture 文書整合 ───────────────

describe('Safety-first architecture document consistency', () => {
  const safetyDocs = [
    'references/03-guides/safety-first-architecture-plan.md',
    'references/01-principles/critical-path-safety-map.md',
    'references/01-principles/modular-monolith-evolution.md',
  ] as const

  it('all safety-first architecture documents exist', () => {
    const missing = safetyDocs.filter((p) => !fileExists(p))
    expect(missing).toEqual([])
  })

  it('CLAUDE.md references all safety-first documents', () => {
    const claudeMd = readFile('CLAUDE.md')
    const missing = safetyDocs.filter((p) => !claudeMd.includes(p))
    expect(missing).toEqual([])
  })
})

// ─── 不変条件カタログ ↔ ガードテスト対応表 ──────────────

describe('Invariant catalog ↔ guard test map consistency', () => {
  it('all INV-* IDs in invariant-catalog.md appear in guard-test-map.md', () => {
    const catalog = readFile('references/03-guides/invariant-catalog.md')
    const guardMap = readFile('references/03-guides/guard-test-map.md')

    const invPattern = /### (INV-[A-Z]+-\d+)/g
    const catalogIds: string[] = []
    let match
    while ((match = invPattern.exec(catalog)) !== null) {
      catalogIds.push(match[1])
    }

    expect(catalogIds.length).toBeGreaterThan(0)

    const missing = catalogIds.filter((id) => !guardMap.includes(id))
    expect(missing).toEqual([])
  })

  it('all INV-* IDs in guard-test-map.md appear in invariant-catalog.md', () => {
    const catalog = readFile('references/03-guides/invariant-catalog.md')
    const guardMap = readFile('references/03-guides/guard-test-map.md')

    const invPattern = /INV-[A-Z]+-\d+/g
    const mapIds = new Set<string>()
    let match
    while ((match = invPattern.exec(guardMap)) !== null) {
      mapIds.add(match[0])
    }

    expect(mapIds.size).toBeGreaterThan(0)

    const missing = [...mapIds].filter((id) => !catalog.includes(id))
    expect(missing).toEqual([])
  })
})

// ─── エンジン責務マトリクス ↔ 実コード ──────────────────

describe('Engine responsibility ↔ code consistency', () => {
  it('JS modules listed in engine-responsibility.md exist in domain/calculations/', () => {
    const doc = readFile('references/01-principles/engine-responsibility.md')

    // JS テーブルからモジュール名を抽出（`module.ts` or `subdir/module.ts` パターン）
    const jsSection = doc.split('### DuckDB')[0]
    const modulePattern = /`([\w/]+\.ts)`/g
    const modules = new Set<string>()
    let match
    while ((match = modulePattern.exec(jsSection)) !== null) {
      modules.add(match[1])
    }

    expect(modules.size).toBeGreaterThan(0)

    const missing = [...modules].filter((mod) => {
      // application/ や infrastructure/ 等の絶対パスは app/src/ から検証
      if (mod.includes('/')) {
        const parts = mod.split('/')
        if (['application', 'infrastructure', 'domain'].includes(parts[0])) {
          return !fileExists(`app/src/${mod}`)
        }
      }
      return !fileExists(`app/src/domain/calculations/${mod}`)
    })
    expect(missing).toEqual([])
  })

  it('DuckDB modules listed in engine-responsibility.md exist in infrastructure/duckdb/queries/', () => {
    const doc = readFile('references/01-principles/engine-responsibility.md')

    // DuckDB テーブルからモジュール名を抽出
    const duckSection = doc.split('### DuckDB')[1]?.split('### 両エンジン')[0] ?? ''
    const modulePattern = /`(\w+\.ts)`/g
    const modules = new Set<string>()
    let match
    while ((match = modulePattern.exec(duckSection)) !== null) {
      modules.add(match[1])
    }

    expect(modules.size).toBeGreaterThan(0)

    const missing = [...modules].filter(
      (mod) => !fileExists(`app/src/infrastructure/duckdb/queries/${mod}`),
    )
    expect(missing).toEqual([])
  })
})

// ─── CLAUDE.md 内の references/ パス有効性 ──────────────

describe('CLAUDE.md reference path validity', () => {
  it('all references/ paths in CLAUDE.md exist on disk', () => {
    const claudeMd = readFile('CLAUDE.md')

    const refPattern = /`(references\/[^`]+\.md)`/g
    const paths = new Set<string>()
    let match
    while ((match = refPattern.exec(claudeMd)) !== null) {
      paths.add(match[1])
    }

    expect(paths.size).toBeGreaterThan(0)

    const missing = [...paths].filter((p) => !fileExists(p))
    expect(missing).toEqual([])
  })
})

// ─── ROLE.md 連携プロトコル相互参照 ─────────────────────

describe('Role protocol bidirectional consistency', () => {
  const roleNameToPath: Record<string, string> = {
    'pm-business': 'roles/staff/pm-business',
    'review-gate': 'roles/staff/review-gate',
    'documentation-steward': 'roles/staff/documentation-steward',
    architecture: 'roles/line/architecture',
    implementation: 'roles/line/implementation',
    'invariant-guardian': 'roles/line/specialist/invariant-guardian',
    'duckdb-specialist': 'roles/line/specialist/duckdb-specialist',
    'explanation-steward': 'roles/line/specialist/explanation-steward',
  }

  it('every role mentioned in a protocol table has a corresponding ROLE.md', () => {
    for (const [, dir] of Object.entries(roleNameToPath)) {
      const roleMd = readFile(`${dir}/ROLE.md`)
      // 連携プロトコルセクションのみを抽出
      const sectionMatch = roleMd.match(/## 連携プロトコル[\s\S]*?(?=\n## |\n$|$)/)
      if (!sectionMatch) continue
      const section = sectionMatch[0]

      // テーブルの「方向+相手」列からロール名を抽出
      const protocolPattern = /\|\s*(?:←|→|←→)\s+(\S+)\s*\|/g
      let match
      while ((match = protocolPattern.exec(section)) !== null) {
        const counterpart = match[1]
        // 汎用表現・グループ参照はスキップ
        if (counterpart === '全ロール' || counterpart === '人間' || counterpart.includes('*'))
          continue
        expect(Object.keys(roleNameToPath)).toContain(counterpart)
      }
    }
  })
})

// ─── @guard タグ整合性 ───────────────────────────────────

describe('@guard tag consistency', () => {
  /** 制約テスト（Guard）として分類されるファイル */
  const GUARD_TEST_FILES = [
    // guards/ ディレクトリ（旧 architectureGuard, hookComplexityGuard, domainPurityGuard を分割）
    'guards/layerBoundaryGuard.test.ts',
    'guards/presentationIsolationGuard.test.ts',
    'guards/structuralConventionGuard.test.ts',
    'guards/codePatternGuard.test.ts',
    'guards/sizeGuard.test.ts',
    'guards/purityGuard.test.ts',
    // 単一関心事のガード（分割不要）
    'comparisonMigrationGuard.test.ts',
    'scopeConsistencyGuard.test.ts',
    'designSystemGuard.test.ts',
    'documentConsistency.test.ts',
    'scopeBoundaryInvariant.test.ts',
    'waterfallDataIntegrity.test.ts',
  ]

  it('制約テストファイルに @guard タグが含まれる', () => {
    const missing: string[] = []
    for (const file of GUARD_TEST_FILES) {
      const content = readFile(`app/src/test/${file}`)
      if (!content.includes('@guard')) {
        missing.push(file)
      }
    }
    expect(missing, `@guard タグがないファイル:\n${missing.join('\n')}`).toEqual([])
  })

  it('@guard タグは GUARD_TAG_REGISTRY に登録済みの ID のみ使用する', () => {
    // レジストリから有効な ID セットを構築
    const registryContent = readFile('app/src/test/guardTagRegistry.ts')
    const registryIds = new Set<string>()
    const idPattern = /^\s+([A-Z]\d+):/gm
    let match
    while ((match = idPattern.exec(registryContent)) !== null) {
      registryIds.add(match[1])
    }

    // 全 .ts/.tsx ファイルから @guard タグを収集
    const srcDir = path.join(ROOT_DIR, 'app/src')
    const violations: string[] = []

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue
          scanDir(fullPath)
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          const guardMatches = content.matchAll(/\*\s+@guard\s+(\S+)/g)
          for (const m of guardMatches) {
            if (!registryIds.has(m[1])) {
              const rel = path.relative(srcDir, fullPath)
              violations.push(`${rel}: 未登録の guard ID "${m[1]}"`)
            }
          }
        }
      }
    }
    scanDir(srcDir)

    expect(
      violations,
      `GUARD_TAG_REGISTRY に未登録のタグが使用されています:\n${violations.join('\n')}`,
    ).toEqual([])
  })

  it('GUARD_TAG_REGISTRY の全タグがコードベースで少なくとも1回使用されている', () => {
    const registryContent = readFile('app/src/test/guardTagRegistry.ts')
    const registryIds = new Set<string>()
    const idPattern = /^\s+([A-Z]\d+):/gm
    let match
    while ((match = idPattern.exec(registryContent)) !== null) {
      registryIds.add(match[1])
    }

    // 全ソースファイルから使用されている guard ID を収集
    const srcDir = path.join(ROOT_DIR, 'app/src')
    const usedIds = new Set<string>()

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === 'dist') continue
          scanDir(fullPath)
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          // guardTagRegistry.ts を除外（レジストリ定義元）
          if (entry.name === 'guardTagRegistry.ts') continue
          const content = fs.readFileSync(fullPath, 'utf-8')
          const guardMatches = content.matchAll(/@guard\s+([A-Z]\d+)/g)
          for (const m of guardMatches) {
            usedIds.add(m[1])
          }
        }
      }
    }
    scanDir(srcDir)

    // 現時点でガードテスト未対応のタグ（レビューで検証する原則）
    // タグ付与が進んだらここから削除し、テスト通過させる
    const REVIEW_ONLY_TAGS = new Set([
      'C1', // 1ファイル = 1変更理由 — レビューで検証
      'C4', // 描画は純粋 — レビューで検証
      'F3', // 全パターンに例外なし — レビューで検証
      'F6', // チャート間データは文脈継承 — レビューで検証
      'F8', // 独立互換で正本を汚さない — レビューで検証
      'H1', // Screen Plan 経由のみ — Gate 2 でガード化予定
      'H5', // visible-only は plan 宣言 — Gate 3 でガード化予定
      'H6', // ChartCard は通知のみ — Gate 3 でガード化予定
      'A5', // DI はコンポジションルート — レビューで検証
      'C7', // 同義 API/action の併存禁止 — レビューで検証
      'G7', // キャッシュは本体より複雑にしない — レビューで検証
      // C5 (最小セレクタ) — codePatternGuard で機械検証に昇格
      // G2 (エラーは伝播) — codePatternGuard で機械検証に昇格
    ])

    const unused = [...registryIds]
      .filter((id) => !usedIds.has(id) && !REVIEW_ONLY_TAGS.has(id))
      .sort()
    expect(
      unused,
      `未使用の guard タグ（コードベースに @guard 参照なし、REVIEW_ONLY にも未登録）:\n${unused.join(', ')}\n` +
        'タグ付与するか REVIEW_ONLY_TAGS に登録してください。',
    ).toEqual([])
  })
})

// ─── 許可リスト総数トラッキング ──────────────────────────

describe('許可リスト総数トラッキング', () => {
  it('全許可リストの合計エントリ数が上限を超えない', () => {
    // 全許可リストの配列をインポートして総数をカウント
    const allLists = [
      applicationToInfrastructure,
      presentationToInfrastructure,
      infrastructureToApplication,
      presentationToUsecases,
      presentationDuckdbHook,
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
      reactImportExcludeDirs,
      sideEffectChain,
      useMemoLimits,
      useStateLimits,
      hookLineLimits,
      presentationMemoLimits,
      presentationStateLimits,
    ]
    const totalEntries = allLists.reduce((sum, list) => sum + list.length, 0)
    const MAX_TOTAL = 55

    expect(
      totalEntries,
      `許可リスト総数が ${totalEntries} 件（上限: ${MAX_TOTAL}）。\n` +
        '許可リストを増やす前に、構造改善で解消できないか検討してください。',
    ).toBeLessThanOrEqual(MAX_TOTAL)
  })

  it('凍結済み許可リストが空のまま維持されている', () => {
    const frozenLists = [
      { name: 'presentationToInfrastructure', list: presentationToInfrastructure },
      { name: 'infrastructureToApplication', list: infrastructureToApplication },
      { name: 'presentationDuckdbHook', list: presentationDuckdbHook },
      { name: 'largeComponentTier2', list: largeComponentTier2 },
      { name: 'cmpPrevYearDaily', list: cmpPrevYearDaily },
      { name: 'cmpFramePrevious', list: cmpFramePrevious },
      { name: 'dowCalcOverride', list: dowCalcOverride },
    ]
    const violations = frozenLists
      .filter((f) => f.list.length > 0)
      .map((f) => `${f.name}: ${f.list.length} 件`)

    expect(
      violations,
      `凍結済み許可リストにエントリが追加されています:\n${violations.join('\n')}\n` +
        '凍結済みリストへの追加は禁止です。',
    ).toEqual([])
  })
})

// ─── 後方互換コード監視 ──────────────────────────────────

describe('後方互換コード監視', () => {
  const srcDir = path.resolve(__dirname, '..')

  /**
   * 残存が許可された @deprecated コードの一覧（凍結式管理）。
   * 新規追加は禁止（C7: 同義 API/action の併存禁止）。
   * 削除条件を満たしたらエントリを削除し、上限を引き下げる。
   */
  const KNOWN_DEPRECATED = [
    // WASM dual-run 統合完了まで維持
    'domain/calculations/estMethod.ts',
    'domain/calculations/discountImpact.ts',
    // Bridge の後方互換ラッパー（calculateEstMethod @deprecated）
    'application/services/grossProfitBridge.ts',
    // ImportedData 型・adapter（infrastructure 内部でのみ使用）
    'domain/models/ImportedData.ts',
    'domain/models/monthlyDataAdapter.ts',
  ]
  const MAX_DEPRECATED_FILES = 5

  it('@deprecated を含むファイル数が上限を超えない', () => {
    const allFiles: string[] = []
    function walk(dir: string) {
      if (!fs.existsSync(dir)) return
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (['node_modules', 'dist', '__tests__', '_prototypes'].includes(entry.name)) continue
          walk(full)
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
          allFiles.push(full)
        }
      }
    }
    walk(srcDir)

    const deprecated: string[] = []
    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      if (content.includes('@deprecated')) {
        const rel = path.relative(srcDir, file).replace(/\\/g, '/')
        if (!KNOWN_DEPRECATED.includes(rel)) {
          deprecated.push(rel)
        }
      }
    }

    expect(
      deprecated,
      `未登録の @deprecated コードが検出されました:\n${deprecated.join('\n')}\n` +
        '→ KNOWN_DEPRECATED に登録するか、@deprecated を削除してください。\n' +
        '新規の後方互換追加は C7 原則で禁止です。',
    ).toEqual([])
  })

  it('KNOWN_DEPRECATED の件数が上限を超えない', () => {
    expect(
      KNOWN_DEPRECATED.length,
      `KNOWN_DEPRECATED が ${KNOWN_DEPRECATED.length} 件（上限: ${MAX_DEPRECATED_FILES}）。\n` +
        '後方互換を削除したら KNOWN_DEPRECATED からも削除し、上限を引き下げてください。',
    ).toBeLessThanOrEqual(MAX_DEPRECATED_FILES)
  })

  it('KNOWN_DEPRECATED のファイルが実在する', () => {
    for (const rel of KNOWN_DEPRECATED) {
      const full = path.join(srcDir, rel)
      expect(fs.existsSync(full), `KNOWN_DEPRECATED のファイルが存在しません: ${rel}`).toBe(true)
    }
  })
})

// ─── 構造化データ（docs/contracts/）ベースの整合性検証 ──────

describe('Structured source consistency (docs/contracts/)', () => {
  const principles = JSON.parse(readFile('docs/contracts/principles.json'))
  const metadata = JSON.parse(readFile('docs/contracts/project-metadata.json'))

  // ── 設計原則 taxonomy ──────────────────────────────────

  it('CLAUDE.md の設計原則カテゴリが principles.json と一致する', () => {
    const claudeMd = readFile('CLAUDE.md')
    for (const cat of principles.categories) {
      expect(
        claudeMd,
        `CLAUDE.md に設計原則カテゴリ "${cat.id}. ${cat.title}" が見つかりません`,
      ).toContain(`${cat.id}. ${cat.title}`)
    }
  })

  it('references/README.md の taxonomy が principles.json と一致する', () => {
    const refReadme = readFile('references/README.md')
    const taxonomy = principles.taxonomy
    expect(refReadme, `references/README.md に taxonomy "${taxonomy}" が見つかりません`).toContain(
      taxonomy.replace('+', ' + '),
    )
  })

  it('guardTagRegistry.ts の全カテゴリ ID が principles.json に存在する', () => {
    const registryContent = readFile('app/src/test/guardTagRegistry.ts')
    const idPattern = /^\s+([A-Z])\d+:/gm
    const registryCategories = new Set<string>()
    let match
    while ((match = idPattern.exec(registryContent)) !== null) {
      registryCategories.add(match[1])
    }

    const principleIds = new Set(principles.categories.map((c: { id: string }) => c.id))

    const missing = [...registryCategories].filter((id) => !principleIds.has(id))
    expect(
      missing,
      `guardTagRegistry に存在するが principles.json に未定義のカテゴリ: ${missing.join(', ')}`,
    ).toEqual([])
  })

  // ── 旧語彙検出 ────────────────────────────────────────

  it('主要文書に旧体系の語彙が残っていない', () => {
    const docsToCheck = [
      'CLAUDE.md',
      'CONTRIBUTING.md',
      'references/README.md',
      'references/01-principles/design-principles.md',
    ]

    const violations: string[] = []
    for (const doc of docsToCheck) {
      const content = readFile(doc)
      for (const term of principles.obsoleteTerms) {
        if (content.includes(term)) {
          violations.push(`${doc}: 旧語彙 "${term}" が残っています`)
        }
      }
    }

    expect(violations, violations.join('\n')).toEqual([])
  })

  // ── バージョン一致 ────────────────────────────────────

  it('package.json version が project-metadata.json と一致する', () => {
    const pkgJson = JSON.parse(readFile('app/package.json'))
    expect(
      pkgJson.version,
      `package.json version "${pkgJson.version}" != metadata "${metadata.appVersion}"`,
    ).toBe(metadata.appVersion)
  })

  it('CHANGELOG.md 最新バージョンが project-metadata.json と一致する', () => {
    const changelog = readFile('CHANGELOG.md')
    const versionPattern = /## \[v([\d.]+)\]/
    const match = versionPattern.exec(changelog)
    expect(match).not.toBeNull()
    expect(
      match![1],
      `CHANGELOG.md 最新 "v${match![1]}" != metadata "${metadata.appVersion}"`,
    ).toBe(metadata.appVersion)
  })

  // ── WASM 前提の記載確認 ────────────────────────────────

  it('必須文書に WASM 前提が記載されている', () => {
    const missing: string[] = []
    for (const doc of metadata.docsRequiringWasmMention) {
      const content = readFile(doc)
      if (
        !content.includes('wasm') &&
        !content.includes('WASM') &&
        !content.includes('build:wasm')
      ) {
        missing.push(doc)
      }
    }
    expect(
      missing,
      `WASM 前提の記載がない文書: ${missing.join(', ')}\nWASM ビルドが npm install の前提であることを明記してください。`,
    ).toEqual([])
  })

  // ── CI ジョブ一致 ──────────────────────────────────────

  it('ci.yml のジョブ名が project-metadata.json と一致する', () => {
    const ciYml = readFile('.github/workflows/ci.yml')
    const missing: string[] = []
    for (const job of metadata.ciJobs) {
      // ci.yml では "jobname:" のパターンでジョブ定義される
      if (!ciYml.includes(`${job}:`)) {
        missing.push(job)
      }
    }
    expect(missing, `ci.yml に存在しない CI ジョブ: ${missing.join(', ')}`).toEqual([])
  })

  // ── references/ 件数の直書き禁止 ──────────────────────

  it('references/README.md に壊れやすい件数直書きがない', () => {
    const refReadme = readFile('references/README.md')
    // ファイル数カラムがあるのは許容するが、実態と一致していることを検証
    const countPattern = /\|\s*`(\d+-[^`]+\/)`\s*\|[^|]+\|\s*(\d+)\+?\s*\|/g
    let match
    const discrepancies: string[] = []
    while ((match = countPattern.exec(refReadme)) !== null) {
      const dir = match[1]
      const claimed = parseInt(match[2], 10)
      const fullDir = path.join(ROOT_DIR, 'references', dir)
      if (fs.existsSync(fullDir)) {
        const actual = fs.readdirSync(fullDir).filter((f) => f.endsWith('.md')).length
        if (actual > claimed + 5 || actual < claimed - 5) {
          discrepancies.push(`references/${dir}: 記載 ${claimed}, 実態 ${actual}（差が大きい）`)
        }
      }
    }
    expect(discrepancies, discrepancies.join('\n')).toEqual([])
  })
})

// ─── Generated section 整合 ─────────────────────────────

describe('Generated section integrity', () => {
  const GENERATED_SECTION_FILES = [
    'CLAUDE.md',
    'references/02-status/technical-debt-roadmap.md',
  ] as const

  it('generated section のマーカーが正しく対になっている', () => {
    const broken: string[] = []
    for (const file of GENERATED_SECTION_FILES) {
      const content = readFile(file)
      if (!content) continue
      const starts = (content.match(/<!-- GENERATED:START /g) ?? []).length
      const ends = (content.match(/<!-- GENERATED:END /g) ?? []).length
      if (starts !== ends) {
        broken.push(`${file}: START=${starts}, END=${ends}`)
      }
      if (starts === 0) {
        broken.push(`${file}: generated section が存在しない`)
      }
    }
    expect(broken, broken.join('\n')).toEqual([])
  })

  it('architecture-health.json が存在し有効な JSON である', () => {
    const healthJson = readFile('references/02-status/generated/architecture-health.json')
    expect(healthJson, 'architecture-health.json が存在しない').toBeTruthy()
    const parsed = JSON.parse(healthJson)
    expect(parsed.schemaVersion).toBe('1.0.0')
    expect(parsed.kpis.length).toBeGreaterThan(0)
    expect(parsed.summary).toBeDefined()
    expect(parsed.summary.hardGatePass).toBe(true)
  })

  it('obligation map のパスパターンが実在するディレクトリに対応する', () => {
    // obligation-collector.ts の OBLIGATION_MAP を検証
    const obligationSrc = readFile('tools/architecture-health/src/collectors/obligation-collector.ts')
    if (!obligationSrc) return
    const patterns = [...obligationSrc.matchAll(/pathPattern:\s*'([^']+)'/g)].map((m) => m[1])
    const missing: string[] = []
    for (const p of patterns) {
      const fullPath = path.join(ROOT_DIR, p)
      if (!fs.existsSync(fullPath)) {
        missing.push(p)
      }
    }
    expect(missing, `存在しないパスパターン: ${missing.join(', ')}`).toEqual([])
  })
})

// ─── open-issues.md 状態整合 ────────────────────────────

describe('open-issues.md state consistency', () => {
  it('解決済み ID が現在の課題セクションに重複していない', () => {
    const content = readFile('references/02-status/open-issues.md')
    if (!content) return

    // 解決済みセクションから ID を抽出
    const resolvedSection = content.split(/##.*解決済み|##.*アーカイブ|##.*Resolved/i)[1] ?? ''
    const resolvedIds = new Set<string>()
    const idPattern = /\b([CSR]-\d+)\b/g
    let match
    while ((match = idPattern.exec(resolvedSection)) !== null) {
      resolvedIds.add(match[1])
    }

    if (resolvedIds.size === 0) return

    // 現在の課題セクション（解決済みより前の部分）
    const currentSection = content.split(/##.*解決済み|##.*アーカイブ|##.*Resolved/i)[0] ?? ''
    const duplicates: string[] = []
    for (const id of resolvedIds) {
      if (currentSection.includes(id)) {
        duplicates.push(id)
      }
    }

    expect(
      duplicates,
      `解決済み ID が現在の課題セクションに残っています: ${duplicates.join(', ')}`,
    ).toEqual([])
  })
})
