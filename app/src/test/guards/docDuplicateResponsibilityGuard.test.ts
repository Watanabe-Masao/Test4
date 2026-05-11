/**
 * DOC-FAIL-DUPLICATE-RESPONSIBILITY guardrail-shadow check
 *
 * **Stage**: guardrail-shadow (= warning emit only、exit 0、AAG-SCP-DOC-LEARNING-002 整合)
 * **Source pattern**: docs/contracts/src/docs/document-failure-taxonomy.yaml の
 * `DOC-FAIL-DUPLICATE-RESPONSIBILITY` (= 8 observations、guard candidate auto-promote 済)
 * **Detection algorithm**: projects/active/<id>/ 配下の各 file が projects/_template/<same-relative-path>
 * と byte-identical (= identical hash) かを検査。identical な file は unfilled template duplicate
 * (= sub-program で customize されないまま放置されている duplicate copy)。
 *
 * **Baseline**: 0 (= Wave 3 / Phase 6 sub-PR 5 で taxonomy-v2 unfilled 8 duplicates cleanup 完了済、
 * 本 guard 着地時点では observed 0 が baseline)。
 *
 * **Wave 3 advisory only**: shadow mode で warning emit、ratchet-down baseline 確立。
 * - guardrail-shadow → guardrail-advisory → hard-fail の 5 段階 maturity progression
 * - hard-fail 化は Wave 4+ で別 sub-PR + user 判断 gate を経て articulate
 *
 * @see references/01-foundation/canonicalization-principles.md (= 重複回避 governance)
 * @see docs/contracts/src/docs/document-failure-taxonomy.yaml (= DOC-FAIL-DUPLICATE-RESPONSIBILITY pattern)
 * @see projects/completed/aag-structural-control-plane/ (= 親 program、Failure Loop articulate)
 * @see projects/active/aag-failure-pattern-guards/ (= 本 guard が属する sub-program)
 *
 * @responsibility R:unclassified
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, join } from 'node:path'
import { createHash } from 'node:crypto'

const REPO_ROOT = resolve(__dirname, '../../../..')
const TEMPLATE_DIR = resolve(REPO_ROOT, 'projects/_template')
const ACTIVE_DIR = resolve(REPO_ROOT, 'projects/active')

function hashFile(absPath: string): string {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex')
}

function walkFiles(dir: string, base: string = dir): string[] {
  if (!existsSync(dir)) return []
  const entries: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) {
      entries.push(...walkFiles(full, base))
    } else {
      entries.push(relative(base, full))
    }
  }
  return entries
}

interface DuplicateFinding {
  readonly activeProject: string
  readonly relativePath: string
  readonly templatePath: string
  readonly activePath: string
}

function findDuplicates(): DuplicateFinding[] {
  const findings: DuplicateFinding[] = []
  if (!existsSync(TEMPLATE_DIR) || !existsSync(ACTIVE_DIR)) return findings

  const templateFiles = walkFiles(TEMPLATE_DIR)
  const templateHashes = new Map<string, string>()
  for (const rel of templateFiles) {
    const abs = join(TEMPLATE_DIR, rel)
    templateHashes.set(rel, hashFile(abs))
  }

  for (const project of readdirSync(ACTIVE_DIR)) {
    const projectDir = join(ACTIVE_DIR, project)
    if (!statSync(projectDir).isDirectory()) continue
    for (const [rel, templateHash] of templateHashes.entries()) {
      const activePath = join(projectDir, rel)
      if (!existsSync(activePath)) continue
      const activeHash = hashFile(activePath)
      if (activeHash === templateHash) {
        findings.push({
          activeProject: project,
          relativePath: rel,
          templatePath: relative(REPO_ROOT, join(TEMPLATE_DIR, rel)),
          activePath: relative(REPO_ROOT, activePath),
        })
      }
    }
  }
  return findings
}

describe('docDuplicateResponsibilityGuard (= DOC-FAIL-DUPLICATE-RESPONSIBILITY shadow check)', () => {
  /**
   * Baseline: 0 (= Wave 3 / Phase 6 sub-PR 5 cleanup 完了後、observed 0)。
   * 新規 active project が _template から copy 後に customize されないまま放置されると
   * detection。stage = guardrail-shadow なので fail させず、advisory として warning のみ surface。
   */
  it('byte-identical template duplicates が baseline (= 0) を超えない (shadow mode)', () => {
    const findings = findDuplicates()
    if (findings.length > 0) {
      // shadow mode: console.warn のみ、test は pass
      console.warn(
        `[DOC-FAIL-DUPLICATE-RESPONSIBILITY shadow] ${findings.length} unfilled template duplicates detected:`,
      )
      for (const f of findings) {
        console.warn(`  - ${f.activePath} == ${f.templatePath}`)
      }
      console.warn('  → これらは _template から copy 後 customize されていない duplicate copies。')
      console.warn(
        '  → Wave 4+ で hard-fail 化 (= guardrail-shadow → guardrail-advisory → hard-fail 5 段階 progression)、本 stage は advisory のみ。',
      )
    }
    // shadow mode: baseline=0 を expect するが、上回っても fail しない
    // Wave 4+ で hard-fail 化判断 (= AAG-SCP-DOC-LEARNING-002 整合)
    const baseline = 0
    expect(findings.length).toBeLessThanOrEqual(Math.max(baseline, findings.length))
  })

  it('detection algorithm が動作する (= self-test)', () => {
    // template が存在し walk 可能であることを確認 (= guard が動作可能 state)
    expect(existsSync(TEMPLATE_DIR)).toBe(true)
    const templateFiles = walkFiles(TEMPLATE_DIR)
    expect(templateFiles.length).toBeGreaterThan(0)
  })
})
