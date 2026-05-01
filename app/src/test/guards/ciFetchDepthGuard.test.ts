/**
 * CI Fetch-Depth Guard — AR-CI-FETCH-DEPTH
 *
 * Phase K Option 1 後続の再発防止 mechanism (2026-04-29 着手):
 * `.github/workflows/*.yml` 内の `actions/checkout@*` step に対して、
 * full git history が必要な job では `with: fetch-depth: 0` の指定を強制する。
 *
 * 背景:
 *   PR #1205 で contentSpecLastSourceCommitGuard が shallow clone (default
 *   `fetch-depth: 1`) で false-positive 一括 fail を起こす事故が発生。fast-gate /
 *   docs-health / test-coverage / content-specs-impact の checkout に明示
 *   `fetch-depth: 0` を追加して解決したが、新 workflow / 新 job 追加時に同種事故が
 *   再発する構造的リスクが残る。本 guard は workflow YAML を機械検証して
 *   「git log を読む test を含む job は fetch-depth: 0 必須」を hard fail で強制する。
 *
 * Allowlist (full history 不要):
 *   - wasm-build: Rust ビルド only、git log 非依存
 *   - e2e (matrix): build + Playwright のみ
 *   - pages-build: production build のみ
 *   - deploy: actions/deploy-pages、checkout 不在
 *
 * 検証対象 (full history 必須):
 *   - fast-gate / docs-health / test-coverage: vitest 実行に
 *     contentSpecLastSourceCommitGuard を含む
 *   - content-specs-impact: base..HEAD diff
 *
 * @guard G1 テストに書く / governance-ops
 * @taxonomyKind T:meta-guard
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const REPO_ROOT = resolve(__dirname, '../../../..')
const WORKFLOWS_DIR = resolve(REPO_ROOT, '.github/workflows')

/**
 * full git history を必要としない job の allowlist。
 * ここに追加するときは「本当に git log を読まないか」を明示的に確認すること。
 */
const FETCH_DEPTH_NOT_REQUIRED_JOBS: ReadonlySet<string> = new Set([
  'wasm-build', // Rust build のみ
  'e2e', // matrix で chromium / mobile-chrome、Playwright のみ
  'pages-build', // production build + upload-pages-artifact
  'deploy', // actions/deploy-pages、checkout 不在
])

interface CheckoutUsage {
  readonly file: string
  readonly jobName: string
  readonly stepLine: number // 1-indexed
  readonly hasFetchDepthZero: boolean
}

/**
 * workflow YAML を line-based parse する pure helper。
 * 完全な YAML parser ではないが、jobs.<name>.steps[*].uses + with.fetch-depth の検出に十分。
 *
 * 仕様:
 *   - top-level `jobs:` block を検出
 *   - 各 job ('  <name>:' = indent 2) の steps[*] を走査
 *   - 各 step が `actions/checkout@*` を uses しているか判定
 *   - その step の `with:` block 内に `fetch-depth: 0` があるか判定
 */
function parseCheckouts(filePath: string): CheckoutUsage[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const file = filePath.replace(REPO_ROOT + '/', '')
  const result: CheckoutUsage[] = []

  let inJobsBlock = false
  let currentJob: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // `jobs:` top-level block 検出
    if (/^jobs:\s*$/.test(line)) {
      inJobsBlock = true
      continue
    }
    if (!inJobsBlock) continue

    // 別の top-level key (indent 0) で jobs: block 終了
    if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('#')) {
      inJobsBlock = false
      continue
    }

    // job name 検出: indent 2 で `<name>:` (空行 / コメント以外)
    const jobMatch = line.match(/^ {2}([a-zA-Z][a-zA-Z0-9_-]*):\s*$/)
    if (jobMatch) {
      currentJob = jobMatch[1]
      continue
    }

    // step `- uses: actions/checkout@*` 検出 (indent は steps の context により可変だが、
    // 通常 indent 6 で `      - uses: actions/checkout@v4`)
    if (currentJob && /^\s*-\s+uses:\s+actions\/checkout@/.test(line)) {
      const stepLine = i + 1
      // 直後の連続した indent block で `with:` → `fetch-depth: 0` を探す
      const stepIndentMatch = line.match(/^(\s*)/)
      const stepIndent = stepIndentMatch ? stepIndentMatch[1].length : 0
      let hasFetchDepthZero = false
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]
        const nextTrimmed = next.trimStart()
        // 空行 / コメント行は skip (block 継続)
        if (nextTrimmed === '' || nextTrimmed.startsWith('#')) continue
        const nextIndentMatch = next.match(/^(\s*)/)
        const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0
        // 同 indent (= 次 step / 次 job key) または親 indent に戻ったら block 終了
        if (nextIndent <= stepIndent && !nextTrimmed.startsWith('with')) break
        if (/^fetch-depth:\s*0\s*(?:#.*)?$/.test(nextTrimmed)) {
          hasFetchDepthZero = true
          break
        }
      }
      result.push({ file, jobName: currentJob, stepLine, hasFetchDepthZero })
    }
  }
  return result
}

function listWorkflowFiles(): string[] {
  if (!existsSync(WORKFLOWS_DIR)) return []
  return readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .map((f) => resolve(WORKFLOWS_DIR, f))
    .sort()
}

describe('CI Fetch-Depth Guard (AR-CI-FETCH-DEPTH)', () => {
  const allCheckouts = listWorkflowFiles().flatMap(parseCheckouts)

  it('full history 必須 job の actions/checkout に `fetch-depth: 0` が指定されている', () => {
    const violations: string[] = []
    for (const co of allCheckouts) {
      if (FETCH_DEPTH_NOT_REQUIRED_JOBS.has(co.jobName)) continue
      if (!co.hasFetchDepthZero) {
        violations.push(
          `${co.file}:${co.stepLine} job=${co.jobName}: actions/checkout で fetch-depth: 0 が未指定。\n` +
            `    → 修正: 同 step の \`with:\` block に \`fetch-depth: 0\` を追加。\n` +
            `    根拠: contentSpecLastSourceCommitGuard 等の git log 依存 guard を実行する job では full history が必要 (PR #1205 の事故を構造的に防止)。\n` +
            `    Allowlist (full history 不要 job): ${[...FETCH_DEPTH_NOT_REQUIRED_JOBS].join(', ')}`,
        )
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('Allowlist 内の job 名が実 workflow に存在する (orphan allowlist 検出)', () => {
    const allJobNames = new Set(allCheckouts.map((co) => co.jobName))
    const orphans = [...FETCH_DEPTH_NOT_REQUIRED_JOBS].filter((name) => !allJobNames.has(name))
    // deploy は checkout を持たない (actions/deploy-pages のみ) ので
    // allCheckouts に出現しない。orphan ではなく仕様上の allowlist。
    const REAL_ORPHANS = orphans.filter((name) => name !== 'deploy')
    expect(
      REAL_ORPHANS,
      `FETCH_DEPTH_NOT_REQUIRED_JOBS に登録されているが実 workflow に存在しない job: ${REAL_ORPHANS.join(', ')}`,
    ).toEqual([])
  })
})
