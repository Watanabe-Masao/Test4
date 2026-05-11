# Document Failure Taxonomy (machine view)

> 機械生成。手で編集しない。authoring source = `docs/contracts/src/docs/document-failure-taxonomy.yaml`、
> 観測 source = `docs/contracts/src/docs/document-reading-decisions.yaml`、
> generator = `tools/governance/build-document-failure-taxonomy.mjs`。

- 生成: 2026-05-11T13:54:35.304Z
- generatedAtSha: `f23062a46fcecaa6479a7f73fe5c4b9ba2bf1819`
- schemaVersion: `document-failure-taxonomy-v1`
- stage: `in-use`

## Summary

- Total registered patterns: 11
- Total observed references in reading-decisions: 55
- Reading-decision entries scanned: 398
- Guard candidates (observed >= 5): **6**
- Emerging patterns (observed 1-4): 2
- Unobserved patterns (observed 0): 3
- Unregistered DOC-FAIL-* in use: 0

### byComputedMaturity

| maturity | count |
|---|---|
| pattern-articulated | 3 |
| observed | 2 |
| guardrail-candidate-emitted | 6 |
| guardrail-shadow | 0 |
| guardrail-advisory | 0 |

## Guard Candidates (observedCount >= 5)

| id | observedCount | inputMaturity | computedMaturity | suggestedRemedy |
|---|---|---|---|---|
| `DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE` | 16 | observed | **guardrail-candidate-emitted** | move (= projects/active/<id>/ へ移動) または split (= 残すべき部分は canonical 化、TODO 部分は project へ) |
| `DOC-FAIL-LOCATION-MISMATCH` | 13 | observed | **guardrail-candidate-emitted** | move (= 適切な zone へ移動 + 参照更新) |
| `DOC-FAIL-DUPLICATE-RESPONSIBILITY` | 8 | pattern-articulated | **guardrail-candidate-emitted** | merge (= 統合 + 1 doc に正本化) または delete-candidate (= 参照 0 確認後) |
| `DOC-FAIL-TEMPORAL-MIXING` | 6 | observed | **guardrail-candidate-emitted** | split (= 過去 → archive-doc / 未来 → project-plan / 現在のみ canonical-doc に残す) |
| `DOC-FAIL-GENERATED-AS-MANUAL` | 5 | observed | **guardrail-candidate-emitted** | generated-register (= producer 経由で generated-report 化、ADR-SCP-008 例外条項 articulate) |
| `DOC-FAIL-STALE-DESCRIPTION` | 5 | observed | **guardrail-candidate-emitted** | rewrite-and-contract (= 現状を articulate する rewrite、未完了 articulate を削除し完了状態を反映) |

## Emerging Patterns (observedCount 1-4)

| id | observedCount | inputMaturity | computedMaturity |
|---|---|---|---|
| `DOC-FAIL-ARCHIVE-CONTENT-IN-CANONICAL` | 1 | observed | observed |
| `DOC-FAIL-AI-ROUTING-AMBIGUITY` | 1 | pattern-articulated | observed |

## Unobserved Patterns (curated but not yet seen)

| id | inputMaturity | suggestedRemedy |
|---|---|---|
| `DOC-FAIL-README-OVEREXPLAINS-UNREVIEWED-STRUCTURE` | pattern-articulated | rewrite-and-contract (= AAG-SCP-DOC-INDEX-005~008 整合の README rewrite + Universe Index への pointer 化) |
| `DOC-FAIL-UNEXPLAINED-CANONICAL` | pattern-articulated | rewrite-and-contract (= 役割 / consumer / 適用範囲を冒頭に articulate) |
| `DOC-FAIL-UNOWNED-DOC` | pattern-articulated | rewrite-and-contract (= owner / consumer / update trigger を明示) または delete-candidate |

## Unregistered DOC-FAIL-* In Use (advisory)

_(none — all DOC-FAIL-* used in reading-decisions are registered in taxonomy)_

## Per-Pattern Detail

### `DOC-FAIL-PROJECT-CONTENT-IN-REFERENCE`

- **title**: project content が references/ に混入
- **inputMaturity**: `observed`
- **computedMaturity**: `guardrail-candidate-emitted`
- **observedCount**: 16
- **suggestedRemedy**: move (= projects/active/<id>/ へ移動) または split (= 残すべき部分は canonical 化、TODO 部分は project へ)
- **observedPaths** (16):
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-correlation.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-customerGap.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-dowGapAnalysis.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-inventoryCalc.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-movingAverage.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-observationPeriod.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-piValue.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-pinIntervals.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-remainingBudgetRate.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-sensitivity.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-trendAnalysis.md`
  - `references/04-tracking/engine-maturity-matrix.md`
  - `references/04-tracking/engine-promotion-matrix.md`
  - `references/04-tracking/features-migration-status.md`
  - `references/99-archive/aag-doc-audit-report.md`
  - `references/99-archive/authoritative-term-sweep.md`
- **observedDispositions**: `archive`, `move`, `split`

### `DOC-FAIL-LOCATION-MISMATCH`

- **title**: 配置不一致 (= 内容は有効だが場所が誤り)
- **inputMaturity**: `observed`
- **computedMaturity**: `guardrail-candidate-emitted`
- **observedCount**: 13
- **suggestedRemedy**: move (= 適切な zone へ移動 + 参照更新)
- **observedPaths** (13):
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-correlation.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-customerGap.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-dowGapAnalysis.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-inventoryCalc.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-movingAverage.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-observationPeriod.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-piValue.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-pinIntervals.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-remainingBudgetRate.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-sensitivity.md`
  - `projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-trendAnalysis.md`
  - `references/03-implementation/ar-rule-binding-protocol.md`
  - `references/99-archive/aag-doc-audit-report.md`
- **observedDispositions**: `archive`, `move`

### `DOC-FAIL-DUPLICATE-RESPONSIBILITY`

- **title**: 責務重複 (= 同責務の文書が複数 zone に存在)
- **inputMaturity**: `pattern-articulated`
- **computedMaturity**: `guardrail-candidate-emitted`
- **observedCount**: 8
- **suggestedRemedy**: merge (= 統合 + 1 doc に正本化) または delete-candidate (= 参照 0 確認後)
- **observedPaths** (8):
  - `projects/active/taxonomy-v2/DERIVED.md`
  - `projects/active/taxonomy-v2/derived/README.md`
  - `projects/active/taxonomy-v2/derived/acceptance-suite.md`
  - `projects/active/taxonomy-v2/derived/inventory/00-example.md`
  - `projects/active/taxonomy-v2/derived/inventory/README.md`
  - `projects/active/taxonomy-v2/derived/pr-breakdown.md`
  - `projects/active/taxonomy-v2/derived/review-checklist.md`
  - `projects/active/taxonomy-v2/derived/test-plan.md`
- **observedDispositions**: `delete-candidate`

### `DOC-FAIL-TEMPORAL-MIXING`

- **title**: 時間軸の混在 (= present + past + future content が同 doc 内に混在)
- **inputMaturity**: `observed`
- **computedMaturity**: `guardrail-candidate-emitted`
- **observedCount**: 6
- **suggestedRemedy**: split (= 過去 → archive-doc / 未来 → project-plan / 現在のみ canonical-doc に残す)
- **observedPaths** (6):
  - `references/04-tracking/engine-maturity-matrix.md`
  - `references/04-tracking/engine-promotion-matrix.md`
  - `references/04-tracking/features-migration-status.md`
  - `references/04-tracking/frozen-list.md`
  - `references/99-archive/aag-doc-audit-report.md`
  - `references/99-archive/authoritative-term-sweep.md`
- **observedDispositions**: `archive`, `rewrite-and-contract`, `split`

### `DOC-FAIL-GENERATED-AS-MANUAL`

- **title**: 機械生成相当を手動 articulate (= generated-register 候補)
- **inputMaturity**: `observed`
- **computedMaturity**: `guardrail-candidate-emitted`
- **observedCount**: 5
- **suggestedRemedy**: generated-register (= producer 経由で generated-report 化、ADR-SCP-008 例外条項 articulate)
- **observedPaths** (5):
  - `references/04-tracking/engine-maturity-matrix.md`
  - `references/04-tracking/engine-promotion-matrix.md`
  - `references/04-tracking/frozen-list.md`
  - `references/04-tracking/quality-audit-latest.md`
  - `references/99-archive/authoritative-term-sweep.md`
- **observedDispositions**: `archive`, `delete-candidate`, `rewrite-and-contract`, `split`

### `DOC-FAIL-STALE-DESCRIPTION`

- **title**: 完了済 work を未完了として articulate (= staleness)
- **inputMaturity**: `observed`
- **computedMaturity**: `guardrail-candidate-emitted`
- **observedCount**: 5
- **suggestedRemedy**: rewrite-and-contract (= 現状を articulate する rewrite、未完了 articulate を削除し完了状態を反映)
- **observedPaths** (5):
  - `aag/_internal/README.md`
  - `projects/active/aag-structural-control-plane/HANDOFF.md`
  - `references/01-foundation/taxonomy-constitution.md`
  - `references/05-aag-interface/operations/project-checklist-governance.md`
  - `references/05-aag-interface/protocols/README.md`
- **observedDispositions**: `keep-and-contract`, `rewrite-and-contract`

### `DOC-FAIL-ARCHIVE-CONTENT-IN-CANONICAL`

- **title**: archive content が canonical-doc に混入
- **inputMaturity**: `observed`
- **computedMaturity**: `observed`
- **observedCount**: 1
- **suggestedRemedy**: split (= archive 部分を archive-doc へ抽出) または move (= 全体 archive 化)
- **observedPaths** (1):
  - `references/04-tracking/frozen-list.md`
- **observedDispositions**: `rewrite-and-contract`

### `DOC-FAIL-AI-ROUTING-AMBIGUITY`

- **title**: AI routing 曖昧 (= 同 query に対して複数文書が候補化)
- **inputMaturity**: `pattern-articulated`
- **computedMaturity**: `observed`
- **observedCount**: 1
- **suggestedRemedy**: merge (= 統合 + AI 単一エントリ articulate) または rewrite-and-contract (= 各文書の scope を articulate に分離)
- **observedPaths** (1):
  - `references/04-tracking/quality-audit-latest.md`
- **observedDispositions**: `delete-candidate`

### `DOC-FAIL-UNOWNED-DOC`

- **title**: 所有不明 (= 更新責任が articulate されていない)
- **inputMaturity**: `pattern-articulated`
- **computedMaturity**: `pattern-articulated`
- **observedCount**: 0
- **suggestedRemedy**: rewrite-and-contract (= owner / consumer / update trigger を明示) または delete-candidate

### `DOC-FAIL-UNEXPLAINED-CANONICAL`

- **title**: 意味不明 canonical (= 何のためか説明されていない正本)
- **inputMaturity**: `pattern-articulated`
- **computedMaturity**: `pattern-articulated`
- **observedCount**: 0
- **suggestedRemedy**: rewrite-and-contract (= 役割 / consumer / 適用範囲を冒頭に articulate)

### `DOC-FAIL-README-OVEREXPLAINS-UNREVIEWED-STRUCTURE`

- **title**: README が未精査構造を過剰説明 (= AAG-SCP-DOC-INDEX-008 違反)
- **inputMaturity**: `pattern-articulated`
- **computedMaturity**: `pattern-articulated`
- **observedCount**: 0
- **suggestedRemedy**: rewrite-and-contract (= AAG-SCP-DOC-INDEX-005~008 整合の README rewrite + Universe Index への pointer 化)
