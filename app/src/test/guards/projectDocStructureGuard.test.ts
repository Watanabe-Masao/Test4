/**
 * Project Doc Structure Guard
 *
 * projects/<id>/ の 4-doc + config 構造が揃っていること、および各 doc が
 * 自分の**役割範囲**に閉じていることを機械的に検証する。
 *
 * 規約: `references/03-guides/project-checklist-governance.md` §4 (ディレクトリ構造) §4.1 (役割分離)。
 *
 * 検出する違反:
 *
 * - **D1: 必須ファイル欠落** — `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` /
 *   `checklist.md` / `config/project.json` のいずれかが存在しない
 * - **D2: AI_CONTEXT.md に役割 banner なし** — 先頭 30 行に `> 役割:` 表記がない
 * - **D3: HANDOFF.md に役割 banner なし** — 同上
 * - **D4: AI_CONTEXT.md に volatile セクションが混在** — `## Current Status`,
 *   `## 現在地`, `## Immediate Next Actions`, `## 次にやること`, `## Phase 進捗`,
 *   `## 完了済み` 等、session ごとに変わる内容は HANDOFF.md の責務。
 *   AI_CONTEXT.md は **stable content のみ** (Purpose / Scope / Read Order /
 *   Required References / Constraints) に閉じる。
 *
 * ## なぜ D4 が必要か
 *
 * 分離の本来の設計意図は:
 *
 * | 文書 | 変更頻度 | 主な読み手 |
 * |---|---|---|
 * | AI_CONTEXT.md | 数週間〜数ヶ月に 1 回（scope 変更時のみ） | 初見の AI（1 回だけ読む） |
 * | HANDOFF.md | 作業セッションごと（checkbox 進行ごと） | 再開する作業 AI（毎回読む） |
 *
 * これが実現できていないと、AI_CONTEXT.md が HANDOFF.md と重複 content を
 * 抱え、両方更新する必要が生まれ、drift の温床になる。D4 は volatile content
 * を AI_CONTEXT.md に書けなくすることで、分離を**機械的に強制**する。
 *
 * 役割 banner は
 * `> 役割: <1 文で何のための文書か>` の blockquote 形式で統一する。
 * これにより「どの文書を開けばよいか」を読み手が迷わない。
 *
 * scope: projects/<id>/（active のみ）+ projects/_template/
 * - projects/completed/ は archive 済み（凍結）なので検査対象外
 * - collection kind（例: quick-fixes）も構造は要求される
 *
 * @see references/03-guides/project-checklist-governance.md §4 §4.1
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../..')
const PROJECTS_DIR = path.join(PROJECT_ROOT, 'projects')

const REQUIRED_FILES: readonly string[] = [
  'AI_CONTEXT.md',
  'HANDOFF.md',
  'plan.md',
  'checklist.md',
  'config/project.json',
]

const ROLE_BANNER_FILES: readonly string[] = ['AI_CONTEXT.md', 'HANDOFF.md']

/** 先頭 N 行に blockquote 内で `役割:` を述べる行があれば banner ありとみなす */
const BANNER_HEAD_LINES = 30
// 許可形式:
//   > 役割: 起点文書。...
//   > **役割:** 起点文書。...
//   > **本文書の役割:** 起点文書。...
//   > 役割： 起点文書。...（全角コロン）
const BANNER_RE = /^\s*>[^\n]*役割[:：]/

/**
 * AI_CONTEXT.md に書いてはいけない volatile セクション見出し。
 * これらは session ごとに変わる内容であり HANDOFF.md の責務に閉じる。
 * 大文字小文字の揺れと日英どちらの表記も吸収する。
 */
const FORBIDDEN_AI_CONTEXT_SECTION_RE: readonly RegExp[] = [
  /^#{1,6}\s+Current\s+Status\b/i,
  /^#{1,6}\s+現在(?:地|状態|状況)/,
  /^#{1,6}\s+Immediate\s+Next\s+Actions?\b/i,
  /^#{1,6}\s+Next\s+Actions?\b/i, // "Next Actions — Governance 保守" 等も拾う
  /^#{1,6}\s+次に\s*やる\s*こと/,
  /^#{1,6}\s+Phase\s+進捗/,
  /^#{1,6}\s+完了済み/,
  /^#{1,6}\s+Completed\b/i,
  /^#{1,6}\s+Immediate\s+Priority\b/i,
  /^#{1,6}\s+Ha?mari/i, // Hamari points / ハマりポイント
  /^#{1,6}\s+ハマり/,
]

interface ProjectDir {
  readonly projectId: string
  readonly absDir: string
  readonly relDir: string
  /** 検査対象は active + _template。completed は除外 */
  readonly kindHint: 'active' | 'template'
}

function listProjectDirsToCheck(): ProjectDir[] {
  const out: ProjectDir[] = []
  if (!fs.existsSync(PROJECTS_DIR)) return out

  for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name === 'completed') continue
    const absDir = path.join(PROJECTS_DIR, entry.name)
    const relDir = path.relative(PROJECT_ROOT, absDir).replace(/\\/g, '/')
    if (entry.name === '_template') {
      out.push({ projectId: '_template', absDir, relDir, kindHint: 'template' })
      continue
    }
    // config/project.json が無いディレクトリは project ではないので skip
    if (!fs.existsSync(path.join(absDir, 'config/project.json'))) continue
    out.push({ projectId: entry.name, absDir, relDir, kindHint: 'active' })
  }
  return out
}

interface StructureViolation {
  readonly projectId: string
  readonly file: string
  readonly code: string
  readonly message: string
  readonly hint: string
}

function checkProjectDir(project: ProjectDir): StructureViolation[] {
  const violations: StructureViolation[] = []

  // D1: 必須ファイル欠落
  for (const rel of REQUIRED_FILES) {
    const abs = path.join(project.absDir, rel)
    if (!fs.existsSync(abs)) {
      violations.push({
        projectId: project.projectId,
        file: `${project.relDir}/${rel}`,
        code: 'D1',
        message: `必須ファイル '${rel}' が欠落しています`,
        hint:
          'projects/_template/ を参考に不足ファイルを追加してください。' +
          ' 詳細: references/03-guides/project-checklist-governance.md §4 §10。',
      })
    }
  }

  // D2 / D3: 役割 banner 必須
  for (const name of ROLE_BANNER_FILES) {
    const abs = path.join(project.absDir, name)
    if (!fs.existsSync(abs)) continue // D1 で既に検出済み
    const head = fs.readFileSync(abs, 'utf-8').split(/\r?\n/).slice(0, BANNER_HEAD_LINES)
    const hasBanner = head.some((l) => BANNER_RE.test(l))
    if (!hasBanner) {
      const code = name === 'AI_CONTEXT.md' ? 'D2' : 'D3'
      violations.push({
        projectId: project.projectId,
        file: `${project.relDir}/${name}`,
        code,
        message: `'${name}' の先頭 ${BANNER_HEAD_LINES} 行に役割 banner (\`> 役割: ...\`) がありません`,
        hint:
          `ファイル先頭（title 直後）に次の形式で役割 banner を追加してください:\n` +
          `    > 役割: <この文書が何のためにあるか 1 文>\n` +
          ' これにより読み手は「この文書を開けばよいか」を即判断できます。' +
          ' 詳細: references/03-guides/project-checklist-governance.md §4.1。',
      })
    }
  }

  // D4: AI_CONTEXT.md に volatile セクションが含まれていないこと
  const aiContextAbs = path.join(project.absDir, 'AI_CONTEXT.md')
  if (fs.existsSync(aiContextAbs)) {
    const content = fs.readFileSync(aiContextAbs, 'utf-8')
    const lines = content.split(/\r?\n/)
    // fenced code block 内の見出しは「例」なのでスキップ
    let fenceOpen: string | undefined
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i]
      const fenceMatch = raw.match(/^\s*(`{3,}|~{3,})/)
      if (fenceMatch) {
        if (fenceOpen === undefined) {
          fenceOpen = fenceMatch[1][0]
        } else if (fenceMatch[1][0] === fenceOpen) {
          fenceOpen = undefined
        }
        continue
      }
      if (fenceOpen !== undefined) continue
      for (const re of FORBIDDEN_AI_CONTEXT_SECTION_RE) {
        if (re.test(raw)) {
          violations.push({
            projectId: project.projectId,
            file: `${project.relDir}/AI_CONTEXT.md`,
            code: 'D4',
            message: `L${i + 1}: '${raw.trim()}' は volatile セクション見出しであり AI_CONTEXT.md の責務外です`,
            hint:
              'このセクションは HANDOFF.md に移動してください。\n' +
              ' AI_CONTEXT.md は stable content (Purpose / Scope / Read Order / Required References / Constraints) のみを持ちます。\n' +
              ' 理由: AI_CONTEXT.md は数週間に 1 回だけ更新される「意味空間の入口」として設計されており、\n' +
              ' session ごとの状態変化（Current Status / Next Actions 等）を持つと HANDOFF.md と drift します。\n' +
              ' 詳細: references/03-guides/project-checklist-governance.md §4.1。',
          })
          break // 同じ行で複数 regex にヒットしても 1 件のみ
        }
      }
    }
  }

  return violations
}

function formatViolations(violations: readonly StructureViolation[]): string {
  if (violations.length === 0) return ''
  const lines: string[] = [`違反 (${violations.length} 件):`]
  for (const v of violations) {
    lines.push('')
    lines.push(`  [${v.code}] ${v.file}`)
    lines.push(`    project: ${v.projectId}`)
    lines.push(`    ${v.message}`)
    for (const hintLine of v.hint.split('\n')) {
      lines.push(`    ${hintLine}`)
    }
  }
  return lines.join('\n')
}

describe('Project Doc Structure Guard', () => {
  const projects = listProjectDirsToCheck()

  it('active project と _template が発見できている', () => {
    expect(projects.length).toBeGreaterThan(0)
    // _template は必ず存在するはず
    expect(projects.some((p) => p.kindHint === 'template')).toBe(true)
  })

  it('全 active project（+ _template）が 4-doc + config 構造を持つ', () => {
    const allViolations: StructureViolation[] = []
    for (const p of projects) {
      allViolations.push(...checkProjectDir(p).filter((v) => v.code === 'D1'))
    }
    expect(allViolations, formatViolations(allViolations)).toEqual([])
  })

  it('全 active project の AI_CONTEXT.md と HANDOFF.md に役割 banner がある', () => {
    const allViolations: StructureViolation[] = []
    for (const p of projects) {
      allViolations.push(...checkProjectDir(p).filter((v) => v.code === 'D2' || v.code === 'D3'))
    }
    expect(allViolations, formatViolations(allViolations)).toEqual([])
  })

  it('AI_CONTEXT.md は volatile セクション (Current Status / Next Actions 等) を持たない', () => {
    const allViolations: StructureViolation[] = []
    for (const p of projects) {
      allViolations.push(...checkProjectDir(p).filter((v) => v.code === 'D4'))
    }
    expect(allViolations, formatViolations(allViolations)).toEqual([])
  })
})
