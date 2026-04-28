#!/usr/bin/env node
/**
 * Content Spec PR Impact Report (Phase I)
 *
 * 役割: PR の base..head diff から source 変更を抽出し、影響を受ける content
 * spec を列挙、リスク評価を含めた markdown / JSON レポートを出力する。
 *
 * 使い方:
 *   node tools/widget-specs/impact.mjs --base main --head HEAD
 *   node tools/widget-specs/impact.mjs --base main --head HEAD --json
 *   npm run content-specs:impact -- --base main --head HEAD
 *
 * 出力:
 *   - Changed sources (git diff)
 *   - Affected specs (sourceRef / registrySource 一致)
 *   - Risk level (lifecycle / evidence / kind 別)
 *   - Required actions (generator 再実行 / lastVerifiedCommit 更新 / etc)
 *
 * 詳細: projects/phased-content-specs-rollout/plan.md §Phase I
 *
 * exit code:
 *   0 = no impact
 *   1 = impact detected (CI artifact 保存対象)
 *   2 = error
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..', '..')
const SPECS_BASE = resolve(REPO_ROOT, 'references/05-contents')

const KIND_DIRS = {
  widget: 'widgets',
  'read-model': 'read-models',
  calculation: 'calculations',
  chart: 'charts',
  'ui-component': 'ui-components',
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { base: 'main', head: 'HEAD', json: false }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') args.json = true
    else if (a === '--base') args.base = argv[++i]
    else if (a.startsWith('--base=')) args.base = a.slice('--base='.length)
    else if (a === '--head') args.head = argv[++i]
    else if (a.startsWith('--head=')) args.head = a.slice('--head='.length)
  }
  return args
}

// ---------------------------------------------------------------------------
// Frontmatter parser (collector と同等の subset)
// ---------------------------------------------------------------------------

function parseScalar(s) {
  if (s === 'null' || s === '~' || s === '') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === '[]') return []
  if (s === '{}') return {}
  if (/^-?\d+$/.test(s)) return Number(s)
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1)
  }
  return s
}

function parseFrontmatter(specPath) {
  const content = readFileSync(specPath, 'utf-8')
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return null
  const raw = {}
  const lines = m[1].split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.trim() === '' || line.trim().startsWith('#')) {
      i++
      continue
    }
    const km = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/)
    if (!km) {
      i++
      continue
    }
    const key = km[1]
    const valueRaw = km[2].trim()
    if (valueRaw === '') {
      const block = []
      let j = i + 1
      while (j < lines.length) {
        const next = lines[j]
        if (next.trim() === '' || next.trim().startsWith('#')) {
          j++
          continue
        }
        if (!next.startsWith('  ')) break
        block.push(next)
        j++
      }
      if (block.length > 0 && block.every((l) => l.trim().startsWith('- '))) {
        raw[key] = block.map((l) => parseScalar(l.trim().slice(2).trim()))
      } else if (block.length > 0) {
        const obj = {}
        for (const l of block) {
          const om = l.trim().match(/^([A-Za-z0-9_]+):\s*(.*)$/)
          if (om) obj[om[1]] = parseScalar(om[2].trim())
        }
        raw[key] = obj
      } else {
        raw[key] = []
      }
      i = j
    } else {
      raw[key] = parseScalar(valueRaw)
      i++
    }
  }
  return raw
}

// ---------------------------------------------------------------------------
// Spec enumeration
// ---------------------------------------------------------------------------

function inferKindFromId(id) {
  if (/^WID-\d{3}$/.test(id)) return 'widget'
  if (/^RM-\d{3}$/.test(id)) return 'read-model'
  if (/^CALC-\d{3}$/.test(id)) return 'calculation'
  if (/^CHART-\d{3}$/.test(id)) return 'chart'
  if (/^UIC-\d{3}$/.test(id)) return 'ui-component'
  return null
}

function listAllSpecs() {
  const out = []
  for (const [kind, dir] of Object.entries(KIND_DIRS)) {
    const fullDir = join(SPECS_BASE, dir)
    if (!existsSync(fullDir)) continue
    const re =
      kind === 'widget'
        ? /^WID-\d{3}\.md$/
        : kind === 'read-model'
          ? /^RM-\d{3}\.md$/
          : kind === 'calculation'
            ? /^CALC-\d{3}\.md$/
            : kind === 'chart'
              ? /^CHART-\d{3}\.md$/
              : /^UIC-\d{3}\.md$/
    const files = readdirSync(fullDir).filter((f) => re.test(f))
    for (const f of files) {
      const fm = parseFrontmatter(join(fullDir, f))
      if (!fm) continue
      const id = String(fm.id ?? '')
      if (inferKindFromId(id) !== kind) continue
      const sourcePath =
        kind === 'widget' ? String(fm.registrySource ?? '') : String(fm.sourceRef ?? '')
      out.push({
        id,
        kind,
        sourcePath,
        exportName: String(fm.exportName ?? fm.widgetDefId ?? ''),
        lifecycleStatus: typeof fm.lifecycleStatus === 'string' ? fm.lifecycleStatus : 'active',
        replacedBy: typeof fm.replacedBy === 'string' ? fm.replacedBy : null,
        deadline: typeof fm.deadline === 'string' ? fm.deadline : null,
        contractId: typeof fm.contractId === 'string' ? fm.contractId : null,
        authorityKind: typeof fm.authorityKind === 'string' ? fm.authorityKind : null,
        storiesCount: Array.isArray(fm.stories) ? fm.stories.length : 0,
        visualTestsCount: Array.isArray(fm.visualTests) ? fm.visualTests.length : 0,
        definitionDoc: typeof fm.definitionDoc === 'string' ? fm.definitionDoc : null,
      })
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id))
}

// ---------------------------------------------------------------------------
// Git diff
// ---------------------------------------------------------------------------

function getChangedFiles(base, head) {
  try {
    const out = execSync(`git diff --name-only ${base}..${head}`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 15000,
    })
    return out
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
  } catch (e) {
    console.error(`[impact] git diff failed: ${e.message}`)
    return null
  }
}

// ---------------------------------------------------------------------------
// Risk evaluation
// ---------------------------------------------------------------------------

/**
 * Risk level (low / medium / high) を spec の lifecycle / authorityKind /
 * evidence カバレッジ / kind から評価する。
 *
 * - business-authoritative + active + 計算系 → medium-high
 * - lifecycleStatus=deprecated/sunsetting → high (退役中の変更は影響波及大)
 * - evidence 未整備 chart/UIC → medium (見た目 silent drift リスク)
 * - active + utility → low
 */
function evaluateRisk(spec) {
  const reasons = []
  let level = 'low'

  if (spec.lifecycleStatus === 'deprecated' || spec.lifecycleStatus === 'sunsetting') {
    level = 'high'
    reasons.push(`lifecycleStatus="${spec.lifecycleStatus}" (退役中の変更は consumer 影響大)`)
  }

  if (spec.authorityKind === 'business-authoritative') {
    if (level !== 'high') level = 'medium'
    reasons.push('business-authoritative (業務正本、変更時は invariant test 必須)')
  } else if (spec.authorityKind === 'analytic-authoritative') {
    if (level === 'low') level = 'medium'
    reasons.push('analytic-authoritative (分析正本、parity test 必須)')
  }

  if (
    (spec.kind === 'chart' || spec.kind === 'ui-component') &&
    spec.storiesCount === 0 &&
    spec.visualTestsCount === 0
  ) {
    if (level === 'low') level = 'medium'
    reasons.push('visual evidence 未整備 (見た目 silent drift リスク)')
  }

  if (spec.deadline) {
    reasons.push(`deadline=${spec.deadline} (lifecycle 期限制約あり)`)
  }

  if (reasons.length === 0) reasons.push('active spec、特記リスクなし')

  return { level, reasons }
}

// ---------------------------------------------------------------------------
// Report generation
// ---------------------------------------------------------------------------

function buildReport(args, changedFiles, allSpecs) {
  // Source → spec reverse map (1 source can have multiple specs, e.g.
  // calculationCanonRegistry.ts は CALC 11 件が依存)
  const sourceToSpecs = new Map()
  for (const spec of allSpecs) {
    if (!spec.sourcePath) continue
    const list = sourceToSpecs.get(spec.sourcePath) ?? []
    list.push(spec)
    sourceToSpecs.set(spec.sourcePath, list)
  }

  const affectedSpecs = []
  const seenSpecIds = new Set()
  const triggeringChanges = []

  for (const file of changedFiles) {
    const specs = sourceToSpecs.get(file)
    if (!specs || specs.length === 0) continue
    triggeringChanges.push({ file, specCount: specs.length })
    for (const spec of specs) {
      if (seenSpecIds.has(spec.id)) continue
      seenSpecIds.add(spec.id)
      affectedSpecs.push({ ...spec, risk: evaluateRisk(spec), triggeredBy: file })
    }
  }

  const riskCounts = { high: 0, medium: 0, low: 0 }
  for (const s of affectedSpecs) {
    riskCounts[s.risk.level]++
  }

  return {
    base: args.base,
    head: args.head,
    changedFileCount: changedFiles.length,
    triggeringChanges,
    affectedSpecs,
    riskCounts,
  }
}

function renderMarkdown(report) {
  const lines = []
  lines.push('# Content Spec PR Impact Report')
  lines.push('')
  lines.push(`**base**: \`${report.base}\` / **head**: \`${report.head}\``)
  lines.push('')
  lines.push(`Changed files: ${report.changedFileCount}`)
  lines.push(`Affected specs: ${report.affectedSpecs.length}`)
  lines.push('')
  lines.push(`Risk: high=${report.riskCounts.high} / medium=${report.riskCounts.medium} / low=${report.riskCounts.low}`)
  lines.push('')

  if (report.affectedSpecs.length === 0) {
    lines.push('No content spec impact detected.')
    lines.push('')
    return lines.join('\n')
  }

  lines.push('## Triggering Changes')
  lines.push('')
  for (const c of report.triggeringChanges) {
    lines.push(`- \`${c.file}\` → ${c.specCount} spec(s)`)
  }
  lines.push('')

  lines.push('## Affected Specs')
  lines.push('')
  for (const s of report.affectedSpecs) {
    const tag = s.risk.level.toUpperCase()
    lines.push(`### [${tag}] ${s.id} (${s.kind})`)
    lines.push('')
    lines.push(`- **export**: \`${s.exportName}\``)
    lines.push(`- **source**: \`${s.sourcePath}\``)
    lines.push(`- **lifecycle**: ${s.lifecycleStatus}${s.replacedBy ? ` → ${s.replacedBy}` : ''}`)
    if (s.contractId) lines.push(`- **contractId**: ${s.contractId}`)
    if (s.authorityKind) lines.push(`- **authority**: ${s.authorityKind}`)
    if (s.kind === 'chart' || s.kind === 'ui-component') {
      lines.push(`- **evidence**: stories=${s.storiesCount} / visualTests=${s.visualTestsCount}`)
    }
    lines.push(`- **risk reasons**:`)
    for (const r of s.risk.reasons) lines.push(`  - ${r}`)
    lines.push('')
  }

  lines.push('## Required Actions')
  lines.push('')
  lines.push('- [ ] `npm run content-specs:check` を実行し frontmatter sync を確認')
  lines.push(
    '- [ ] 必要なら `npm run content-specs:generate` で frontmatter を再生成し commit に同梱',
  )
  lines.push('- [ ] 各 affected spec の prose (1 文概要 / Invariants / Co-Change Impact) が現状と整合するかレビュー')
  if (report.riskCounts.high > 0) {
    lines.push(
      '- [ ] **HIGH risk spec** は Promote Ceremony PR template (`references/03-guides/promote-ceremony-pr-template.md`) の手順に従い 1 PR 5 同期で更新',
    )
  }
  if (report.riskCounts.medium > 0) {
    lines.push(
      '- [ ] **MEDIUM risk spec** は invariant test / visual test 双方が PR で更新されているか確認',
    )
  }
  lines.push('')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv)
  const changedFiles = getChangedFiles(args.base, args.head)
  if (changedFiles == null) {
    process.exit(2)
  }
  const allSpecs = listAllSpecs()
  const report = buildReport(args, changedFiles, allSpecs)

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(renderMarkdown(report))
  }

  process.exit(report.affectedSpecs.length > 0 ? 1 : 0)
}

main()
