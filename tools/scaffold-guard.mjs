#!/usr/bin/env node
/**
 * scaffold-guard.mjs
 *
 * Phase K Option 1 後続再発防止 D (HANDOFF タスク D、2026-04-29):
 * 新 architecture rule + guard test の co-change 義務 (5 箇所同時更新) を
 * 半自動化する scaffold script。
 *
 * 背景:
 *   1 新 guard を追加するとき、以下 5 箇所への登録が必要 (本セッションで顕在化):
 *     1. app-domain/gross-profit/rule-catalog/base-rules.ts (rule 定義)
 *     2. app/src/test/architectureRules/defaults.ts (DEFAULT_EXECUTION_OVERLAY)
 *     3. projects/<active>/aag/execution-overlay.ts (project overlay + reviewPolicy)
 *     4. app/src/test/guardCategoryMap.ts (category / layer / note)
 *     5. references/03-guides/guard-test-map.md (人間可読 catalog)
 *   どれか 1 つ忘れるたびに guard test が hard fail (architectureRuleGuard /
 *   defaultOverlayCompletenessGuard 等)。本 script は以下を行う:
 *     - guard test skeleton ファイルを `app/src/test/guards/` に生成
 *     - 5 箇所 paste-ready の snippet を stdout に出力 (developer は各 file の
 *       適切な位置に paste するだけ)
 *
 * 使い方:
 *   node tools/scaffold-guard.mjs \
 *     --rule-id AR-FOO-BAR \
 *     --guard-name fooBarGuard \
 *     --slice governance-ops \
 *     --owner architecture \
 *     --description "<one-line what>" \
 *     --why "<rationale>"
 *
 * オプション:
 *   --rule-id           required, e.g. "AR-FOO-BAR"
 *   --guard-name        required, e.g. "fooBarGuard" (camelCase, "Guard" suffix なし)
 *   --slice             required, e.g. "governance-ops" (guardTags の slice)
 *   --owner             required, e.g. "architecture" / "documentation-steward"
 *   --description       required, what が説明
 *   --why               required, why の説明
 *   --tag               optional, principleRefs / guardTags (default: G1)
 *   --category          optional, guardCategoryMap (default: registry-integrity)
 *   --layer             optional, guardCategoryMap (default: operations)
 *   --no-write          dry run、ファイル書込みせず stdout に出力するだけ
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

function parseArgs() {
  const args = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--no-write') {
      args.noWrite = true
      continue
    }
    if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
      args[key] = argv[++i]
    }
  }
  return args
}

function readActiveProjectId() {
  try {
    const content = readFileSync(resolve(REPO_ROOT, 'CURRENT_PROJECT.md'), 'utf-8')
    const m = content.match(/^active:\s*([^\s]+)\s*$/m)
    if (!m) throw new Error('active 行を CURRENT_PROJECT.md から parse できなかった')
    return m[1]
  } catch (e) {
    process.stderr.write(`[scaffold-guard] CURRENT_PROJECT.md 読取失敗: ${e.message}\n`)
    process.exit(1)
  }
}

function todayIso() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

const args = parseArgs()

// ── 必須引数 validation ──
const required = ['ruleId', 'guardName', 'slice', 'owner', 'description', 'why']
const missing = required.filter((k) => !args[k])
if (missing.length > 0) {
  process.stderr.write(
    `[scaffold-guard] 必須引数が不足: ${missing.join(', ')}\n` +
      `使い方: node tools/scaffold-guard.mjs --rule-id <ID> --guard-name <name> ` +
      `--slice <slice> --owner <owner> --description "..." --why "..."\n`,
  )
  process.exit(1)
}
if (!/^AR-[A-Z][A-Z0-9-]*$/.test(args.ruleId)) {
  process.stderr.write(`[scaffold-guard] --rule-id は "AR-..." の大文字+ハイフン形式: ${args.ruleId}\n`)
  process.exit(1)
}
if (!/^[a-z][a-zA-Z0-9]*$/.test(args.guardName)) {
  process.stderr.write(`[scaffold-guard] --guard-name は camelCase: ${args.guardName}\n`)
  process.exit(1)
}

const tag = args.tag ?? 'G1'
const category = args.category ?? 'registry-integrity'
const layer = args.layer ?? 'operations'
const today = todayIso()
const activeProject = readActiveProjectId()
const guardFile = `${args.guardName}Guard.test.ts`
const guardPath = `app/src/test/guards/${guardFile}`
const guardAbsPath = resolve(REPO_ROOT, guardPath)

// ── guard test skeleton ──
const skeleton = `/**
 * ${args.guardName}Guard — ${args.ruleId}
 *
 * ${args.description}
 *
 * 背景 / Why:
 *   ${args.why}
 *
 * @guard ${tag} テストに書く / ${args.slice}
 * @taxonomyKind T:meta-guard
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'

describe('${args.guardName}Guard (${args.ruleId})', () => {
  it('TODO: 検出 logic を実装', () => {
    // TODO: scaffold で生成された skeleton。実装で violations の検出 logic を書く
    const violations: string[] = []
    expect(violations, violations.join('\\n')).toEqual([])
  })
})
`

// ── 5 箇所 paste-ready snippets ──
const snippets = {
  ruleCatalog: `// app-domain/gross-profit/rule-catalog/base-rules.ts に追加 (適切な slice block 末尾):
  {
    slice: "${args.slice}",
    id: "${args.ruleId}",
    principleRefs: ["${tag}"],
    ruleClass: "invariant",
    guardTags: ["${tag}"],
    epoch: 1,
    doc: "references/03-guides/guard-test-map.md",
    what: "${args.description}",
    why: "${args.why}",
    correctPattern: { description: "TODO: 正しいパターンを記述" },
    outdatedPattern: { description: "TODO: 違反パターンを記述" },
    decisionCriteria: {
      when: "TODO: いつ判断するか",
      exceptions: "TODO: 例外条件",
      escalation: "TODO: エスカレーション経路",
    },
    detection: { type: "custom", severity: "gate", baseline: 0 },
    migrationRecipe: {
      steps: ["TODO: 修正手順 1", "TODO: 修正手順 2"],
    },
    sunsetCondition: "TODO: 撤退条件 / なし",
    protectedHarm: { prevents: ["TODO: 防止する事故"] },
  },`,

  defaults: `// app/src/test/architectureRules/defaults.ts の DEFAULT_EXECUTION_OVERLAY 末尾に追加:
  '${args.ruleId}': {
    fixNow: 'now',
    executionPlan: { effort: 'trivial', priority: 1 },
  },`,

  projectOverlay: `// projects/${activeProject}/aag/execution-overlay.ts の EXECUTION_OVERLAY 末尾に追加:
  "${args.ruleId}": {
    fixNow: "now",
    executionPlan: { effort: "trivial", priority: 1 },
    reviewPolicy: {
      owner: "${args.owner}",
      lastReviewedAt: "${today}",
      reviewCadenceDays: 90,
    },
  },`,

  categoryMap: `// app/src/test/guardCategoryMap.ts の GUARD_CATEGORY_MAP 末尾に追加:
  '${args.ruleId}': {
    category: '${category}',
    layer: '${layer}',
    note: 'core-rule: ${args.description}',
  },`,

  guardTestMap: `// references/03-guides/guard-test-map.md の guard table 末尾に追加:
| \`${guardPath}\` | ${args.owner} | 1件 | ${args.ruleId} を実装。${args.description} ${args.why} |`,
}

// ── 出力 ──
function emit() {
  process.stdout.write(`# scaffold-guard output (active project: ${activeProject})\n\n`)
  if (args.noWrite) {
    process.stdout.write(`## guard skeleton (${guardPath}) [dry-run]\n\n`)
    process.stdout.write('```ts\n' + skeleton + '```\n\n')
  } else {
    if (existsSync(guardAbsPath)) {
      process.stderr.write(`[scaffold-guard] ${guardPath} は既に存在。--no-write で snippets だけ出力可\n`)
      process.exit(1)
    }
    writeFileSync(guardAbsPath, skeleton, 'utf-8')
    process.stdout.write(`✓ Wrote guard skeleton: ${guardPath}\n\n`)
  }

  process.stdout.write('## paste-ready snippets (5 箇所同時更新)\n\n')
  process.stdout.write('### 1. Rule registry\n\n```ts\n' + snippets.ruleCatalog + '\n```\n\n')
  process.stdout.write('### 2. defaults.ts\n\n```ts\n' + snippets.defaults + '\n```\n\n')
  process.stdout.write(
    '### 3. Project overlay (' + activeProject + ')\n\n```ts\n' + snippets.projectOverlay + '\n```\n\n',
  )
  process.stdout.write('### 4. guardCategoryMap.ts\n\n```ts\n' + snippets.categoryMap + '\n```\n\n')
  process.stdout.write(
    '### 5. guard-test-map.md\n\n```\n' + snippets.guardTestMap + '\n```\n\n',
  )
  process.stdout.write('## next steps\n\n')
  process.stdout.write('  1. 5 snippets を各ファイルの適切な位置に paste\n')
  process.stdout.write('  2. ' + guardPath + ' を編集して violation 検出 logic を実装\n')
  process.stdout.write('  3. cd app && npx vitest run ' + guardPath + ' で iterate\n')
  process.stdout.write('  4. cd app && npm run test:guards で全 guard 検証\n')
  process.stdout.write('  5. cd app && npm run docs:generate で health metrics 再生成\n')
}

emit()
