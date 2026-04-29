#!/usr/bin/env node
/**
 * Phase K Option 2 migration: Behavior Claims table に verificationNote 列を追加。
 *
 * 動作:
 *  1. references/05-contents/{widgets,read-models,calculations,charts,ui-components}/*.md を走査
 *  2. "Behavior Claims" heading の直下にある markdown table を検出
 *  3. header / separator / data row を 7 列化（既に 7 列なら no-op）
 *  4. 既知の reviewed claim パターンに対して rationale を自動入力
 *     （未知の reviewed 行は `TBD` で埋める → guard が hard fail させる）
 *
 * 後方互換: parseBehaviorClaimsTable は 6 列 / 7 列両対応。本 migration は
 * markdown table を 7 列化することで rendering 整合と guard 強制を両立する。
 *
 * 一回限りの migration script。Phase K Option 1 完了後の sprint で archive。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '../..')
const SPECS_BASE = resolve(REPO_ROOT, 'references/05-contents')

const SPEC_DIRS = ['widgets', 'read-models', 'calculations', 'charts', 'ui-components']

// ---------------------------------------------------------------------------
// Reviewed claim rationale rules — claim text パターン → rationale 1〜2 文
//
// マッチしない reviewed 行は `TBD` を入れる（guard で hard fail → 手作業修正）。
// ---------------------------------------------------------------------------

const RATIONALE_RULES = [
  // ── Widget 定型文 ──────────────────────────────────────────────
  {
    pattern: /registry 行は.*view marshalling 専用.*consumedCtxFields/,
    note: '宣言 widget の妥当性は consumedCtxFields 整合 (frontmatterSyncGuard) と R:tag/G8 mechanism (responsibilityTagGuard) で構造的に担保。widget 個別 test は冗長',
  },
  {
    pattern: /visibility predicate.*空データ時.*dead UI 回避/,
    note: '空状態到達経路は load 中 / fallback / partial 等多岐。widget 個別の predicate test より consumed readModel/calc layer の null 安全契約で構造的保証',
  },
  {
    pattern: /allStoreResults\.size.*visibility predicate.*空 Map/,
    note: '空 Map 到達経路は infrastructure load + Application 層の責務。Application 層 hook の null 安全契約で構造的保証され widget test は冗長',
  },

  // ── UIC ────────────────────────────────────────────────────────
  {
    pattern: /props 経由で渡されたデータをそのまま rendering.*A3 \/ C4 描画純粋/,
    note: '描画純粋性は A3 + C4 で構造的保証 (purityGuard / presentationIsolationGuard)。component 内 fetch/計算の不在は layerBoundaryGuard で hard fail',
  },
  {
    pattern: /関連 4 component.*同 directory 配置.*orchestration/,
    note: 'directory 配置は projectStructureGuard で確認できるが、orchestration 意図の表明は lifecycleStatus + replacedBy の declarative 関係で機械化困難 (semantic intent)',
  },
  {
    pattern: /empty\/loading state は親 widget が制御.*描画のみ.*状態判定なし/,
    note: '親子間の状態責任分担は responsibilitySeparationGuard で粒度判定が困難。本 component の純描画性は描画 test ではなく hook 不在 (props 駆動) の AST 検査で保証',
  },
  {
    pattern: /props 駆動の純描画 component.*styled view を返却.*内部 state なし/,
    note: 'props 駆動 + state なしは renderSideEffectGuard / purityGuard で構造的保証。styled view 出力の意味的妥当性は visual evidence (story) 経由',
  },
  {
    pattern: /tone variant.*色分け.*A11Y 適合.*Storybook で確認可能/,
    note: 'A11Y contrast は単体テスト不向き (実 DOM + computed style 必要)。Storybook story + visual regression baseline で構造的保証',
  },
  {
    pattern: /KpiCard の grid layout primitive.*KpiCard と pair 配置で常用/,
    note: 'CSS-in-JS layout primitive の正しさは visual regression が唯一の信頼経路。indirect cover via KpiCard.stories で baseline 化済',
  },
  {
    pattern: /KpiCard の Visual regression 経由で間接的に layout 安定性検証/,
    note: 'indirect cover の妥当性は KpiCard.stories の DashboardGrid story で機械的に保証 (UIC-002 と pair で baseline 化)',
  },
  {
    pattern: /全 chart component.*共通 wrapper.*layout の正本/,
    note: 'chart 個別の layout 制御不在は H6 (ChartCard 通知のみ) + presentationIsolationGuard で構造的保証。「正本性」自体は宣言で意図 = test 化対象外',
  },
  {
    pattern: /props 駆動の純描画 component.*status.*title.*error.*内部 fetch 禁止/,
    note: '内部 fetch 不在は layerBoundaryGuard で hard fail。状態別 UI 切替は visual evidence (ChartCard.stories の 4 状態) で構造的保証',
  },
  {
    pattern: /UIC-004 ChartCard 経由の間接消費のみ.*chart component が直接 import 禁止.*H6 経路集約/,
    note: 'chart 直接 import 禁止は import path guard で構造的保証。H6 経路集約は presentation 層の architectural rule であり test 化単体では表現不能',
  },
  {
    pattern: /skeleton animation の純描画.*state なし.*loading visual primitive/,
    note: '純描画 + state なしは renderSideEffectGuard で構造的保証。skeleton animation の視覚的妥当性は ChartCard.stories Loading で indirect cover',
  },
  {
    pattern: /empty\/error UI は本 component のスコープ外.*loading 専用/,
    note: 'スコープ境界の妥当性は ChartState.tsx の export 構造で declarative。本 component と ChartError/ChartEmpty は別 export で責任分離が物理的に明確',
  },

  // ── CHART ──────────────────────────────────────────────────────
  {
    pattern: /comparisonResults\.length < 2.*null return.*registry 行の早期 return/,
    note: '空状態の早期 return は registry 行で chart 描画前に skip する宣言的経路。chart layer の test は raw 計算 / fetch の不在を前提とし当該 condition は registry 側責務',
  },
  {
    pattern: /lane pending.*storeDailySeries=null.*縮退描画/,
    note: 'lane pending は infrastructure load 時の中間状態で、専用 spinner なしの縮退描画は UX 設計判断。chart layer test より infrastructure load test で構造的保証',
  },
  {
    pattern: /CALC-002.*calculatePIValues.*出力を mapping して描画.*chart 内 raw 計算禁止/,
    note: 'chart 内 raw 計算不在は chartInputBuilderGuard で構造的保証。mapping の意味整合は CALC-002 出力契約 (Zod schema) で fail-fast',
  },
  {
    pattern: /標準偏差 \/ Z スコア層は CALC-002 出力 field をそのまま mapping.*再計算しない.*B3/,
    note: 'B3 (率は domain で算出) は responsibilityTagGuard で構造的保証。chart layer の再計算不在は chartInputBuilderGuard で hard fail',
  },
  {
    pattern: /RM-001 \/ CALC-011 出力を mapping.*累計予算 vs 累計実績.*chart 内 raw 計算禁止/,
    note: 'mapping の正しさは RM-001 + CALC-011 出力契約で fail-fast。chart 内 raw 計算不在は chartInputBuilderGuard で構造的保証',
  },
  {
    pattern: /budget = 0 のとき達成率 0% 表示.*null 化禁止で chart 軸破壊回避/,
    note: 'CALC-011 が 0 を返す契約は CALC layer の test で保証。null 化禁止は chart 軸の前提条件で UI 設計判断 (test 化より契約宣言が適切)',
  },
  {
    pattern: /RM-005 customerFact ready\/fallback 経路と CALC-001 客数 GAP の双方を mapping/,
    note: 'mapping の正しさは RM-005 + CALC-001 出力契約 (Zod schema) で fail-fast。chart 内 raw 計算不在は chartInputBuilderGuard で構造的保証',
  },
  {
    pattern: /prevYear 不在時.*当年データのみで scatter 描画.*前年比較系列を skip.*null 安全/,
    note: 'null 安全 mapping は CALC-001 出力契約で表現済。skip の妥当性は UI 縮退設計判断で test より宣言的契約が適切',
  },
  {
    pattern: /CALC-014.*buildPrevYearCostApprox.*出力を chart 入力として mapping.*前年近似原価/,
    note: 'mapping の正しさは CALC-014 出力契約で fail-fast。「前年近似」性質の表明は analytic-authoritative classification で declarative (semanticClassification)',
  },
  {
    pattern: /logic\.ts.*純 pure layer.*tsx.*描画のみ.*A3 \/ C4 描画純粋.*Logic test で数値検証/,
    note: 'tsx と logic の責務分離は A3 + C4 + presentationIsolationGuard で構造的保証。数値検証は Logic test に委譲済',
  },

  // ── CALC reviewed CLM-004 (#8 5 件) ────────────────────────────
  {
    pattern: /markupRate.*入力意味が CALC-010 estMethod と一貫.*estMethod ↔ discountImpact 共有.*INV-DI-03/,
    note: '横断的意味整合 (CALC 間の入出力 markupRate 一貫性) は test 単独で表現不能。INV-DI-03 invariant + CALC-016/010 の出力契約で構造的保証',
  },
  {
    pattern: /analytic-authoritative であり.*正確値ではない.*傾向比較用途のみ.*INV-PYC-03/,
    note: 'analytic-authoritative classification は semantic 性質宣言で test 化不能。registry 行参照経路 + INV-PYC-03 で構造的保証',
  },
  {
    pattern: /CALC-010.*calculateEstMethod.*markupRate.*入力は本 calc の.*coreMarkupRate.*出力と意味一貫.*INV-MKR-04/,
    note: '異 CALC 間の入出力意味一貫性は test 単独で表現不能。INV-MKR-04 + 推定法粗利の精度依存性宣言で構造的保証',
  },
  {
    pattern: /率は \*\*% 整数\*\*.*pct\(ratio\).*ratio \* 100.*プロトタイプ命名規約に統一.*INV-BS-05/,
    note: '表現規約 (% 整数 vs ratio) の統一は test より命名規約宣言が一次。INV-BS-05 + caller 全体の数値見直し義務で互換破壊を防御',
  },
  {
    pattern: /95% Z は.*CONFIDENCE_95_ZSCORE.*domain\/constants.*固定.*INV-AF-05.*信頼区間幅が全 caller 波及/,
    note: '定数固定の宣言は domain/constants の declarative 配置で構造的保証。変更時の全 caller 波及は INV-AF-05 invariant + import path guard で検出',
  },
]

function findRationale(claimText) {
  for (const rule of RATIONALE_RULES) {
    if (rule.pattern.test(claimText)) return rule.note
  }
  return null
}

// ---------------------------------------------------------------------------
// Spec migration
// ---------------------------------------------------------------------------

function migrateSpec(filePath) {
  const original = readFileSync(filePath, 'utf-8')
  const lines = original.split('\n')

  // Find Behavior Claims heading
  let i = 0
  while (i < lines.length && !/^#+\s+.*Behavior Claims/i.test(lines[i])) i++
  if (i >= lines.length) return { changed: false, unmatchedReviewed: [] }

  // Find header row
  while (i < lines.length && !/^\s*\|\s*ID\s*\|/i.test(lines[i])) i++
  if (i >= lines.length) return { changed: false, unmatchedReviewed: [] }

  const headerIdx = i
  const sepIdx = headerIdx + 1
  const headerCols = lines[headerIdx].match(/\|/g)?.length ?? 0
  // header の `|` 数 = データ列数 + 1 (両端含めて)。6 列 header なら 7 個の `|`
  // 7 列化済なら 8 個の `|`
  if (headerCols >= 8) {
    // Already 7-column. Still scan reviewed rows to find missing rationales.
  }

  // Update header
  if (!/verificationNote/.test(lines[headerIdx])) {
    lines[headerIdx] = lines[headerIdx].replace(/\|\s*$/, '| verificationNote |')
  }
  // Update separator
  if (lines[sepIdx]) {
    const sepCols = lines[sepIdx].match(/\|/g)?.length ?? 0
    if (sepCols < 8) {
      lines[sepIdx] = lines[sepIdx].replace(/\|\s*$/, '|---|')
    }
  }

  // Iterate data rows
  const unmatchedReviewed = []
  let j = sepIdx + 1
  while (j < lines.length) {
    const line = lines[j]
    const trimmed = line.trim()
    if (trimmed === '' || !trimmed.startsWith('|')) break
    if (trimmed.startsWith('#')) break

    // Parse cells (preserve leading whitespace + style)
    const cells = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())
    if (cells.length < 6) {
      j++
      continue
    }
    const id = cells[0]
    if (!id.startsWith('CLM-')) {
      j++
      continue
    }

    if (cells.length === 6) {
      // 6-column row, append verificationNote cell
      const claim = cells[1]
      const evidenceLevel = cells[2]
      let note = '-'
      if (evidenceLevel === 'reviewed') {
        const rationale = findRationale(claim)
        if (rationale) {
          note = rationale
        } else {
          note = 'TBD'
          unmatchedReviewed.push({ id, claim })
        }
      }
      // Reconstruct line preserving leading whitespace
      const leading = line.match(/^\s*/)?.[0] ?? ''
      lines[j] = `${leading}| ${cells.join(' | ')} | ${note} |`
    } else if (cells.length >= 7) {
      // Already 7+ columns
      const evidenceLevel = cells[2]
      const verificationNote = cells[6]
      if (evidenceLevel === 'reviewed' && (verificationNote === '' || verificationNote === '-' || verificationNote === 'TBD')) {
        const claim = cells[1]
        const rationale = findRationale(claim)
        if (rationale) {
          cells[6] = rationale
          const leading = line.match(/^\s*/)?.[0] ?? ''
          lines[j] = `${leading}| ${cells.join(' | ')} |`
        } else {
          unmatchedReviewed.push({ id, claim })
        }
      }
    }
    j++
  }

  const updated = lines.join('\n')
  if (updated !== original) {
    writeFileSync(filePath, updated, 'utf-8')
    return { changed: true, unmatchedReviewed }
  }
  return { changed: false, unmatchedReviewed }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let totalChanged = 0
let totalUnmatched = 0
const unmatchedDetails = []
for (const dir of SPEC_DIRS) {
  const fullDir = resolve(SPECS_BASE, dir)
  if (!existsSync(fullDir)) continue
  const files = readdirSync(fullDir).filter((f) => /^[A-Z]+(?:-\d{3})\.md$/.test(f))
  for (const f of files) {
    const filePath = resolve(fullDir, f)
    const { changed, unmatchedReviewed } = migrateSpec(filePath)
    if (changed) totalChanged++
    if (unmatchedReviewed.length > 0) {
      totalUnmatched += unmatchedReviewed.length
      for (const u of unmatchedReviewed) {
        unmatchedDetails.push(`${f}: ${u.id} — ${u.claim.slice(0, 80)}...`)
      }
    }
  }
}

console.log(`migrated ${totalChanged} spec(s)`)
if (unmatchedDetails.length > 0) {
  console.log(`\n⚠ ${totalUnmatched} unmatched reviewed claim(s) require manual rationale:`)
  for (const d of unmatchedDetails) console.log(`  ${d}`)
  process.exit(1)
}
