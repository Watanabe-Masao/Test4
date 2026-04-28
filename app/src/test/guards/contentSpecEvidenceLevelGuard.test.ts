/**
 * Content Spec Evidence Level Guard — AR-CONTENT-SPEC-EVIDENCE-LEVEL
 *
 * Phase J 着手 (2026-04-28): spec body の "Behavior Claims" セクションを parse し、
 * 各 claim の evidenceLevel が enum 値で、`tested` claim には test path が、
 * `guarded` claim には guard path が記載されていることを機械検証する。
 *
 * Phase J 段階展開:
 *   J1: evidenceLevel を任意項目として導入 (本 commit)
 *   J2: tested / guarded / reviewed / asserted / generated / unknown を分類 (本 commit)
 *   J3: high-risk claim の evidenceLevel = asserted を 0 にする (本 commit、riskLevel=high
 *       の claim に asserted が付いていたら hard fail)
 *   J4: tested claim の test path 必須 (本 commit、tests cell 空なら hard fail)
 *   J5: guarded claim の guard path 必須 (本 commit、guards cell 空なら hard fail)
 *
 * Behavior Claims セクション format (markdown table、spec body):
 *
 *   ### Behavior Claims (Phase J Evidence Level)
 *
 *   | ID | claim | evidenceLevel | riskLevel | tests | guards |
 *   |---|---|---|---|---|---|
 *   | CLM-001 | claim text | tested | high | path/to/test.ts | - |
 *   | CLM-002 | claim text | guarded | medium | - | path/to/guard.test.ts |
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase J + §5.2 Evidence Level
 *
 * @taxonomyKind T:meta-guard
 *
 * @responsibility R:unclassified
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  REPO_ROOT,
  SPECS_BASE,
  type SpecKind,
  type EvidenceLevel,
  type RiskLevel,
} from './contentSpecHelpers'

const VALID_EVIDENCE_LEVELS = new Set<EvidenceLevel>([
  'generated',
  'tested',
  'guarded',
  'reviewed',
  'asserted',
  'unknown',
])
const VALID_RISK_LEVELS = new Set<RiskLevel>(['high', 'medium', 'low'])

const KIND_DIRS: Record<SpecKind, string> = {
  widget: 'widgets',
  'read-model': 'read-models',
  calculation: 'calculations',
  chart: 'charts',
  'ui-component': 'ui-components',
}

interface ParsedClaim {
  readonly id: string
  readonly claim: string
  readonly evidenceLevel: string
  readonly riskLevel: string
  readonly tests: readonly string[]
  readonly guards: readonly string[]
}

interface SpecClaims {
  readonly specId: string
  readonly specPath: string
  readonly claims: readonly ParsedClaim[]
}

function listSpecFiles(): string[] {
  const out: string[] = []
  for (const dir of Object.values(KIND_DIRS)) {
    const fullDir = resolve(SPECS_BASE, dir)
    if (!existsSync(fullDir)) continue
    const files = readdirSync(fullDir).filter((f) => /^[A-Z]+(?:-\d{3})\.md$/.test(f))
    for (const f of files) out.push(resolve(fullDir, f))
  }
  return out
}

function parseCellList(cell: string): readonly string[] {
  const trimmed = cell.trim()
  if (trimmed === '' || trimmed === '-' || trimmed === 'なし' || trimmed === 'none') return []
  return trimmed
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s !== '-')
}

function parseBehaviorClaimsTable(specContent: string): readonly ParsedClaim[] {
  const lines = specContent.split('\n')
  let i = 0
  // Find heading containing "Behavior Claims"
  while (i < lines.length && !/^#+\s+.*Behavior Claims/i.test(lines[i])) i++
  if (i >= lines.length) return []
  // Skip to header row
  while (i < lines.length && !/^\s*\|\s*ID\s*\|/i.test(lines[i])) i++
  if (i >= lines.length) return []
  // Skip header + separator
  i += 2
  const claims: ParsedClaim[] = []
  while (i < lines.length) {
    const line = lines[i].trim()
    if (line === '' || !line.startsWith('|')) break
    // skip if next heading
    if (line.startsWith('#')) break
    // Parse pipe-delimited row
    const cells = line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
    if (cells.length < 6) {
      i++
      continue
    }
    const [id, claim, evidenceLevel, riskLevel, testsRaw, guardsRaw] = cells
    if (!id.startsWith('CLM-')) {
      i++
      continue
    }
    claims.push({
      id,
      claim,
      evidenceLevel,
      riskLevel,
      tests: parseCellList(testsRaw),
      guards: parseCellList(guardsRaw),
    })
    i++
  }
  return claims
}

function loadAllClaims(): SpecClaims[] {
  return listSpecFiles().map((p) => {
    const content = readFileSync(p, 'utf-8')
    const claims = parseBehaviorClaimsTable(content)
    const specId = p.split('/').pop()?.replace(/\.md$/, '') ?? ''
    return { specId, specPath: p.replace(REPO_ROOT + '/', ''), claims }
  })
}

describe('Content Spec Evidence Level Guard (AR-CONTENT-SPEC-EVIDENCE-LEVEL)', () => {
  const allClaims = loadAllClaims()
  const specsWithClaims = allClaims.filter((s) => s.claims.length > 0)

  it('全 behavior claim の evidenceLevel が enum 値である', () => {
    const violations: string[] = []
    for (const spec of specsWithClaims) {
      for (const c of spec.claims) {
        if (!VALID_EVIDENCE_LEVELS.has(c.evidenceLevel as EvidenceLevel)) {
          violations.push(
            `${spec.specId} ${c.id}: evidenceLevel="${c.evidenceLevel}" は無効。generated | tested | guarded | reviewed | asserted | unknown のいずれか`,
          )
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('全 behavior claim の riskLevel が enum 値である', () => {
    const violations: string[] = []
    for (const spec of specsWithClaims) {
      for (const c of spec.claims) {
        if (!VALID_RISK_LEVELS.has(c.riskLevel as RiskLevel)) {
          violations.push(
            `${spec.specId} ${c.id}: riskLevel="${c.riskLevel}" は無効。high | medium | low のいずれか`,
          )
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('high-risk claim は evidenceLevel=asserted を許可しない (J3)', () => {
    const violations: string[] = []
    for (const spec of specsWithClaims) {
      for (const c of spec.claims) {
        if (c.riskLevel === 'high' && c.evidenceLevel === 'asserted') {
          violations.push(
            `${spec.specId} ${c.id}: high-risk claim で evidenceLevel=asserted は禁止。tested / guarded / reviewed のいずれかに昇格すること`,
          )
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('tested claim には test path が必須 (J4)', () => {
    const violations: string[] = []
    for (const spec of specsWithClaims) {
      for (const c of spec.claims) {
        if (c.evidenceLevel === 'tested' && c.tests.length === 0) {
          violations.push(
            `${spec.specId} ${c.id}: evidenceLevel=tested で tests cell が空。test ファイル path を記入すること`,
          )
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('guarded claim には guard path が必須 (J5)', () => {
    const violations: string[] = []
    for (const spec of specsWithClaims) {
      for (const c of spec.claims) {
        if (c.evidenceLevel === 'guarded' && c.guards.length === 0) {
          violations.push(
            `${spec.specId} ${c.id}: evidenceLevel=guarded で guards cell が空。guard ファイル path を記入すること`,
          )
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('claim id は CLM-NNN 形式である', () => {
    const violations: string[] = []
    for (const spec of specsWithClaims) {
      for (const c of spec.claims) {
        if (!/^CLM-\d{3}$/.test(c.id)) {
          violations.push(`${spec.specId} ${c.id}: CLM-NNN (3 桁ゼロ埋め) 形式でない`)
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([])
  })

  it('Behavior Claims が無い spec の数が baseline を超えない (J6 coverage ratchet-down)', () => {
    // Phase J Step 2 (2026-04-28): Behavior Claims を全 spec に段階展開する。
    // baseline は「claims 0 件 spec 数」。本値は ratchet-down のみ許可（増加禁止）。
    //
    // baseline 算定:
    //   - 全 spec 数 (現時点 89 件)
    //   - cover 済 spec (claims 1 件以上、Step 1: CALC-001/002/007 +
    //     Step 2〜5: CALC-003〜024 (calculation 全 24 件) +
    //     Step 6: RM-001〜010 (read-model 全 10 件) +
    //     Step 7: CHART-001〜005 + UIC-001〜005 (chart + ui-component 全 10 件) +
    //     Step 8: WID-001〜015 (widget batch 1) = 計 59 件)
    //   - 未 cover spec = 89 - 59 = 30 件
    //
    // 段階計画:
    //   Step 1 (J1〜J5): 3 件（pilot）
    //   Step 2: tier1 残 4 件、baseline=82 (ratchet-down 起点)
    //   Step 3: tier2 calc 4 件、baseline=78
    //   Step 4: tier3 第一波 calc 5 件、baseline=73
    //   Step 5: tier3 第二波 + completed 8 件、baseline=65
    //   Step 6: read-model 全 10 件、baseline=55
    //   Step 7: chart 5 + ui-component 5、baseline=45
    //   Step 8 (本 commit): widget batch 1 (WID-001〜015)、baseline=30
    //   Step 9: widget batch 2 (WID-016〜030)、baseline=15 想定
    //   Step 10: widget batch 3 (WID-031〜045)、baseline=0 = Phase J 完遂
    //
    // 「全 spec カバー」は Phase J 完遂条件（baseline=0）。
    const COVERAGE_BASELINE = 30
    const uncovered: string[] = []
    for (const sc of allClaims) {
      if (sc.claims.length === 0) uncovered.push(sc.specId)
    }
    expect(
      uncovered.length,
      `claims 未記載 spec ${uncovered.length} / baseline ${COVERAGE_BASELINE}\n` +
        `  uncovered (数多いため head 10): ${uncovered.slice(0, 10).join(', ')}${uncovered.length > 10 ? ` ... (他 ${uncovered.length - 10} 件)` : ''}\n` +
        `  ratchet-down: baseline 以上に増やしてはいけない（新規 spec 追加時は claim 同梱）`,
    ).toBeLessThanOrEqual(COVERAGE_BASELINE)
  })
})
