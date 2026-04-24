/**
 * reviewPolicyRequiredGuard —
 * Architecture Rule の `reviewPolicy` 必須化 ratchet-down
 *
 * projects/architecture-debt-recovery SP-D ADR-D-001 PR1。
 *
 * 現在、RuleOperationalState.reviewPolicy は optional。
 * PR3 で required に型レベル昇格するまでの間、新規 rule 追加時に
 * reviewPolicy 未設定のルールが増えないことを ratchet-down で保証する。
 *
 * 検出対象:
 *  - R1: reviewPolicy 未設定 rule が baseline を超えない（ratchet-down）
 *  - R2: baseline を構成する unset rule の allowlist と一致する（削除忘れ検出）
 *
 * Baseline の由来:
 *  - ADR-D-001 の当初見積もりは 92 件（inquiry/11 §E 時点）
 *  - Wave 0 切替で 9 SAFETY rule に reviewPolicy 付記済み
 *  - 現状は 139 件の rule が reviewPolicy 未設定（本 baseline の根拠）
 *  - ADR-D-001 PR2 で 92 件を bulk 整備し baseline を減少させる
 *  - ADR-D-001 PR3 で RuleOperationalState.reviewPolicy を required 昇格
 *  - ADR-D-001 PR4 で baseline=0 固定モード移行
 *
 * 参照:
 *  - projects/architecture-debt-recovery/inquiry/15-remediation-plan.md §ADR-D-001
 *  - references/03-guides/architecture-rule-system.md §Temporal Governance
 *
 * @responsibility R:guard
 */

import { describe, expect, it } from 'vitest'
import { ARCHITECTURE_RULES } from '../architectureRules'

const BASELINE = 139

const KNOWN_UNSET_ALLOWLIST: readonly string[] = [
  // 139 ruleId — reviewPolicy 未設定。ADR-D-001 PR2 で bulk 整備予定。
  'AR-001',
  'AR-002',
  'AR-003',
  'AR-004',
  'AR-005',
  'AR-A1-APP-INFRA',
  'AR-A1-APP-PRES',
  'AR-A1-DOMAIN',
  'AR-A1-INFRA-APP',
  'AR-A1-INFRA-PRES',
  'AR-A1-PRES-INFRA',
  'AR-A1-PRES-USECASE',
  'AR-AAG-DERIVED-ONLY-IMPORT',
  'AR-AAG-NO-BASE-RULES-CONSUMER-IMPORT',
  'AR-AAG-NO-DIRECT-OVERLAY-IMPORT',
  'AR-BRIDGE-CANDIDATE-DEFAULT',
  'AR-BRIDGE-DIRECT-IMPORT',
  'AR-BRIDGE-RATE-OWNERSHIP',
  'AR-C3-STORE',
  'AR-C5-SELECTOR',
  'AR-C6-FACADE',
  'AR-C7-NO-DUAL-API',
  'AR-C9-HONEST-UNCLASSIFIED',
  'AR-CAND-ANA-CONTRACT-REQUIRED',
  'AR-CAND-ANA-INVARIANT-REQUIRED',
  'AR-CAND-ANA-METHOD-REQUIRED',
  'AR-CAND-ANA-NO-BUSINESS-BRIDGE',
  'AR-CAND-ANA-NO-CURRENT-BIZ-MIX',
  'AR-CAND-ANA-NO-DIRECT-IMPORT',
  'AR-CAND-ANA-NO-FACTOR-DECOMP',
  'AR-CAND-BIZ-CONTRACT-REQUIRED',
  'AR-CAND-BIZ-NO-ANALYTICS-BRIDGE',
  'AR-CAND-BIZ-NO-CURRENT-MIX',
  'AR-CAND-BIZ-NO-DIRECT-IMPORT',
  'AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN',
  'AR-CAND-BIZ-NO-RATE-UI',
  'AR-CAND-BIZ-NO-ROLLBACK-SKIP',
  'AR-CANON-SEMANTIC-REQUIRED',
  'AR-CANON-ZOD-REQUIRED',
  'AR-CANON-ZOD-REVIEW',
  'AR-COCHANGE-DUCKDB-MOCK',
  'AR-COCHANGE-READMODEL-PARSE',
  'AR-COCHANGE-VALIDATION-SEVERITY',
  'AR-CONTRACT-ANALYTIC-METHOD',
  'AR-CONTRACT-BUSINESS-MEANING',
  'AR-CONTRACT-SEMANTIC-REQUIRED',
  'AR-CONVENTION-BARREL',
  'AR-CONVENTION-CONTEXT-SINGLE-SOURCE',
  'AR-CONVENTION-FEATURE-BOUNDARY',
  'AR-CURRENT-FACTOR-BUSINESS-LOCK',
  'AR-CURRENT-NO-CANDIDATE-MIX',
  'AR-CURRENT-NO-CANDIDATE-STATE',
  'AR-CURRENT-NO-DIRECT-IMPORT-GROWTH',
  'AR-CURRENT-NO-STANDALONE-AUTH',
  'AR-CURRENT-SEMANTIC-REQUIRED',
  'AR-CURRENT-VIEW-SEPARATION',
  'AR-DOC-STATIC-NUMBER',
  'AR-E4-TRUTHINESS',
  'AR-G2-EMPTY-CATCH',
  'AR-G3-SUPPRESS',
  'AR-G3-SUPPRESS-RATIONALE',
  'AR-G4-INTERNAL',
  'AR-G5-DOMAIN-LINES',
  'AR-G5-HOOK-LINES',
  'AR-G5-HOOK-MEMO',
  'AR-G5-HOOK-STATE',
  'AR-G5-INFRA-LINES',
  'AR-G5-USECASE-LINES',
  'AR-G6-COMPONENT',
  'AR-G7-CACHE-BODY',
  'AR-JS-NO-NEW-AUTHORITATIVE',
  'AR-JS-NO-PRES-HELPER-PROMOTE',
  'AR-JS-NO-REFERENCE-GROWTH',
  'AR-MIG-OLD-PATH',
  'AR-PATH-CUSTOMER',
  'AR-PATH-CUSTOMER-GAP',
  'AR-PATH-DISCOUNT',
  'AR-PATH-FACTOR-DECOMPOSITION',
  'AR-PATH-FREE-PERIOD',
  'AR-PATH-FREE-PERIOD-BUDGET',
  'AR-PATH-FREE-PERIOD-DEPT-KPI',
  'AR-PATH-GROSS-PROFIT',
  'AR-PATH-GROSS-PROFIT-CONSISTENCY',
  'AR-PATH-PI-VALUE',
  'AR-PATH-PURCHASE-COST',
  'AR-PATH-SALES',
  'AR-Q3-CHART-NO-DUCKDB',
  'AR-Q4-ALIGNMENT-HANDLER',
  'AR-RESP-EXPORT-DENSITY',
  'AR-RESP-FALLBACK-SPREAD',
  'AR-RESP-FEATURE-COMPLEXITY',
  'AR-RESP-HOOK-COMPLEXITY',
  'AR-RESP-MODULE-STATE',
  'AR-RESP-NORMALIZATION',
  'AR-RESP-STORE-COUPLING',
  'AR-REVIEW-NEEDED-BLOCK',
  'AR-SAFETY-NULLABLE-ASYNC',
  'AR-SAFETY-VALIDATION-ENFORCE',
  'AR-SCOPE-AWARE-MUTATION',
  'AR-STRUCT-ANALYSIS-FRAME',
  'AR-STRUCT-CALC-CANON',
  'AR-STRUCT-CANONICAL-INPUT',
  'AR-STRUCT-CANONICALIZATION',
  'AR-STRUCT-COMPARISON-SCOPE',
  'AR-STRUCT-DATA-INTEGRITY',
  'AR-STRUCT-DUAL-RUN-EXIT',
  'AR-STRUCT-FALLBACK-METADATA',
  'AR-STRUCT-PAGE-META',
  'AR-STRUCT-PRES-ISOLATION',
  'AR-STRUCT-PURITY',
  'AR-STRUCT-QUERY-PATTERN',
  'AR-STRUCT-RENDER-SIDE-EFFECT',
  'AR-STRUCT-STORE-RESULT-INPUT',
  'AR-STRUCT-TEMPORAL-ROLLING',
  'AR-STRUCT-TEMPORAL-SCOPE',
  'AR-STRUCT-TOPOLOGY',
  'AR-TAG-ADAPTER',
  'AR-TAG-BARREL',
  'AR-TAG-CALCULATION',
  'AR-TAG-CHART-OPTION',
  'AR-TAG-CHART-VIEW',
  'AR-TAG-CONTEXT',
  'AR-TAG-FORM',
  'AR-TAG-LAYOUT',
  'AR-TAG-ORCHESTRATION',
  'AR-TAG-PAGE',
  'AR-TAG-PERSISTENCE',
  'AR-TAG-QUERY-EXEC',
  'AR-TAG-QUERY-PLAN',
  'AR-TAG-REDUCER',
  'AR-TAG-SELECTION-GUIDE',
  'AR-TAG-STATE-MACHINE',
  'AR-TAG-TRANSFORM',
  'AR-TAG-UTILITY',
  'AR-TAG-WIDGET',
  'AR-TERM-AUTHORITATIVE-STANDALONE',
  'AR-TSIG-COMP-03',
  'AR-TSIG-TEST-01',
  'AR-TSIG-TEST-04',
]

describe('reviewPolicyRequiredGuard', () => {
  const missing = ARCHITECTURE_RULES.filter((r) => !r.reviewPolicy).map((r) => r.id)
  const missingSet = new Set(missing)
  const allowlistSet = new Set(KNOWN_UNSET_ALLOWLIST)

  it('R1: reviewPolicy 未設定ルール数が baseline を超えない（ratchet-down）', () => {
    expect(missing.length).toBeLessThanOrEqual(BASELINE)
  })

  it('R2a: allowlist 記載の ruleId が実在する（stale 検出）', () => {
    const stale = KNOWN_UNSET_ALLOWLIST.filter((id) => !ARCHITECTURE_RULES.some((r) => r.id === id))
    expect(stale, `存在しない ruleId が allowlist に残存: ${stale.join(', ')}`).toEqual([])
  })

  it('R2b: allowlist 記載の rule が reviewPolicy を獲得していない（卒業検出）', () => {
    const graduated = KNOWN_UNSET_ALLOWLIST.filter((id) => !missingSet.has(id))
    expect(
      graduated,
      `reviewPolicy を獲得した rule が allowlist に残存: ${graduated.join(', ')}（卒業処理してください）`,
    ).toEqual([])
  })

  it('R2c: 実際に未設定の rule が全て allowlist に載っている（新規追加検出）', () => {
    const newUnset = missing.filter((id) => !allowlistSet.has(id))
    expect(
      newUnset,
      `reviewPolicy 未設定の新規 rule: ${newUnset.join(', ')}\n` +
        `新規 rule は reviewPolicy を設定するか、やむを得ない場合 allowlist に追加 + baseline 調整してください。`,
    ).toEqual([])
  })
})
