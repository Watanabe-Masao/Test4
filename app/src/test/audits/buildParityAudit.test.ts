/**
 * Build Parity Audit — CI と正本ビルド手順の一致検証
 *
 * package.json scripts と CI workflow の実行対象が一致しているか、
 * build 正本が script なのか workflow 内 shell なのか、
 * WASM ビルド対象に漏れがないかを検証する。
 *
 * このリポジトリは WASM を含むので、ローカル / CI のズレが
 * 普通の React リポジトリより起きやすい。
 *
 * @audit Build Parity
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT_DIR = path.resolve(__dirname, '../../../..')
const APP_DIR = path.resolve(ROOT_DIR, 'app')

function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

// ── CI ワークフロー解析 ──

function parseCiWorkflow(): {
  content: string
  wasmBuildCommands: string[]
  npmScriptCalls: string[]
  directShellCommands: string[]
} | null {
  const ciPath = path.join(ROOT_DIR, '.github/workflows/ci.yml')
  const content = readFileIfExists(ciPath)
  if (!content) return null

  const lines = content.split('\n')
  const wasmBuildCommands: string[] = []
  const npmScriptCalls: string[] = []
  const directShellCommands: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // wasm-pack build の直接呼び出し検出
    if (/wasm-pack\s+build/.test(trimmed)) {
      wasmBuildCommands.push(trimmed)
    }
    // npm run / npx 呼び出し
    if (/npm\s+run\s+\w+/.test(trimmed)) {
      const match = trimmed.match(/npm\s+run\s+([\w:.-]+)/)
      if (match) npmScriptCalls.push(match[1])
    }
    if (/npx\s+\w+/.test(trimmed)) {
      directShellCommands.push(trimmed)
    }
  }

  return { content, wasmBuildCommands, npmScriptCalls, directShellCommands }
}

// ── package.json scripts 解析 ──

function parsePackageScripts(): Record<string, string> | null {
  const pkgPath = path.join(APP_DIR, 'package.json')
  const content = readFileIfExists(pkgPath)
  if (!content) return null
  const pkg = JSON.parse(content)
  return pkg.scripts ?? {}
}

// ── pre-push hook 解析 ──

/**
 * pre-push hook から `npm run <script>` 呼び出しを抽出する。
 * buildParityAudit は CI と pre-push の capability 対称性を検証する目的で
 * この情報を使う。「CI が走らせるステップは pre-push でも走っているか」を
 * 機械的に保証することで、開発者/AI が push 時点で気づく機会を作る。
 */
function parsePrePushHook(): {
  content: string
  npmScriptCalls: string[]
} | null {
  const hookPath = path.join(ROOT_DIR, 'tools/git-hooks/pre-push')
  const content = readFileIfExists(hookPath)
  if (!content) return null

  const npmScriptCalls: string[] = []
  for (const line of content.split('\n')) {
    // `npm run <name>` 形式を抽出（--silent や引数は無視）
    const match = line.match(/npm\s+run\s+([\w:.-]+)/)
    if (match) npmScriptCalls.push(match[1])
  }
  return { content, npmScriptCalls }
}

// ── WASM モジュール一覧 ──

function listWasmModules(): string[] {
  const wasmDir = path.join(ROOT_DIR, 'wasm')
  if (!fs.existsSync(wasmDir)) return []
  return fs
    .readdirSync(wasmDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(wasmDir, d.name, 'Cargo.toml')))
    .map((d) => d.name)
}

// ── Tests ──

describe('Build Parity Audit — CI と正本ビルド手順の一致検証', () => {
  const ci = parseCiWorkflow()
  const scripts = parsePackageScripts()
  const wasmModules = listWasmModules()
  const prePush = parsePrePushHook()

  it('CI ワークフローが存在する', () => {
    expect(ci, '.github/workflows/ci.yml が見つかりません').not.toBeNull()
  })

  it('package.json scripts が存在する', () => {
    expect(scripts, 'app/package.json の scripts が見つかりません').not.toBeNull()
  })

  it('CI で wasm-pack build の直接呼び出しがない（npm run build:wasm 経由であるべき）', () => {
    if (!ci) return
    expect(
      ci.wasmBuildCommands,
      `CI で wasm-pack build が直接呼ばれています。npm run build:wasm 経由にすべきです: ${ci.wasmBuildCommands.join(', ')}`,
    ).toEqual([])
  })

  it('build:wasm script が全 WASM モジュールをビルドする', () => {
    if (!scripts || wasmModules.length === 0) return
    const buildWasm = scripts['build:wasm'] ?? ''
    const missingModules = wasmModules.filter((mod) => !buildWasm.includes(mod))
    expect(
      missingModules,
      `build:wasm に含まれない WASM モジュール: ${missingModules.join(', ')}`,
    ).toEqual([])
  })

  it('CI の npm run 呼び出しが package.json scripts に存在する', () => {
    if (!ci || !scripts) return
    const missing = ci.npmScriptCalls.filter((script) => !(script in scripts))
    expect(missing, `CI が存在しない npm script を呼んでいます: ${missing.join(', ')}`).toEqual([])
  })

  it('CI の3ジョブ構成が維持されている', () => {
    if (!ci) return
    // fast-gate, test-coverage, e2e の3ジョブが存在するか
    const hasJobPattern = (name: string) => new RegExp(`${name}:`, 'm').test(ci.content)
    const expectedJobs = ['fast-gate', 'test-coverage', 'e2e']
    const missingJobs = expectedJobs.filter((j) => !hasJobPattern(j))
    expect(missingJobs, `CI に必要なジョブが不足: ${missingJobs.join(', ')}`).toEqual([])
  })

  it('CI 必須ステップが正本スクリプト経由で実行されている', () => {
    if (!ci) return
    // CLAUDE.md の CI パイプライン定義に基づく必須ステップ
    const requiredScripts = ['lint', 'build', 'test:guards']
    const missing = requiredScripts.filter((s) => !ci.npmScriptCalls.includes(s))
    expect(
      missing,
      `CI に必須スクリプトが不足: ${missing.join(', ')}。CLAUDE.md §CI パイプラインを参照。`,
    ).toEqual([])
  })

  it('CI に build-storybook ステップが含まれている', () => {
    if (!ci) return
    expect(
      ci.npmScriptCalls.includes('build-storybook'),
      'CI に build-storybook が含まれていません。test-coverage ジョブで実行されるべきです。',
    ).toBe(true)
  })

  it('CI に format:check ステップが含まれている', () => {
    if (!ci) return
    expect(
      ci.npmScriptCalls.includes('format:check'),
      'CI に format:check が含まれていません。CLAUDE.md §CI パイプライン参照。',
    ).toBe(true)
  })

  // ── pre-push hook の capability 対称性 ──
  //
  // CI fast-gate の必須ステップ (lint / format:check / test:guards) は
  // pre-push でも同じステップを走らせることで、push 時点で検出するチャンスを
  // 開発者/AI に与える。CI と pre-push の非対称は「ローカルで通るのに CI で
  // 落ちる」現象を生み、特に format 系の見逃しが発生しやすい
  // (2026-04-13, shiire-arari#0de794e 参照)。

  it('pre-push hook が存在する', () => {
    expect(prePush, 'tools/git-hooks/pre-push が見つかりません').not.toBeNull()
  })

  it('pre-push hook が CI fast-gate と同じ必須ステップを走らせている（capability 対称性）', () => {
    if (!prePush) return
    // CI fast-gate の必須ステップ（lint / format:check / test:guards）。
    // build は WASM 前提でローカル実行コストが高いため pre-push からは除外。
    const fastGateRequiredScripts = ['lint', 'format:check', 'test:guards']
    const missing = fastGateRequiredScripts.filter((s) => !prePush.npmScriptCalls.includes(s))
    expect(
      missing,
      `pre-push が CI fast-gate の必須ステップを走らせていません: ${missing.join(', ')}。` +
        ' CI と pre-push の capability 対称性を保つため、tools/git-hooks/pre-push に追加してください。' +
        ' 修正手順: tools/git-hooks/pre-push にチェックを追加 → chmod +x で再配置。',
    ).toEqual([])
  })

  it('pre-push hook の npm run 呼び出しが package.json scripts に存在する', () => {
    if (!prePush || !scripts) return
    const missing = prePush.npmScriptCalls.filter((script) => !(script in scripts))
    expect(
      missing,
      `pre-push hook が存在しない npm script を呼んでいます: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('ビルドパリティレポートを生成する', () => {
    const reportDir = path.resolve(__dirname, '../../../../references/04-tracking/generated')
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    const report = {
      timestamp: new Date().toISOString(),
      wasmModules,
      packageScripts: scripts ? Object.keys(scripts) : [],
      ci: ci
        ? {
            wasmBuildDirectCalls: ci.wasmBuildCommands.length,
            npmScriptCalls: ci.npmScriptCalls,
            directShellCommands: ci.directShellCommands.length,
          }
        : null,
    }

    const jsonPath = path.join(reportDir, 'build-parity-audit.json')
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8')
    expect(fs.existsSync(jsonPath)).toBe(true)
  })
})
