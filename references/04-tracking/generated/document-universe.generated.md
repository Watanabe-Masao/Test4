# Document Universe Index (generated)

> **役割**: AAG SCP Wave 2 / Phase 2.5 simple version。repo 内 Markdown を 1 枚で articulate した分類済み索引。Reading Pass 未実施前は observed-only / unreviewed 中心、`promotionAllowed: false` 維持 (= 索引掲載 ≠ contract 化、AAG-SCP-DOC-INDEX-002 整合)。
>
> 正本: `docs/contracts/generated/document-universe.generated.json` (= machine truth、本ファイルは projection)

**generated**: 2026-05-11T13:54:35.036Z — sourceSha: `f23062a46fcecaa6479a7f73fe5c4b9ba2bf1819`

## Summary

- Total entries: **768**

### By Index Section

| Section | Count |
|---|---|
| aag-framework | 5 |
| aag-framework-internal | 9 |
| aag-interface | 16 |
| active-projects | 80 |
| archive | 14 |
| completed-projects | 325 |
| design-system | 14 |
| foundation | 42 |
| generated-other | 16 |
| implementation | 77 |
| project-templates | 15 |
| repository-entrypoints | 4 |
| roles | 16 |
| tools | 1 |
| tracking | 113 |
| tracking-generated | 14 |
| tree-readers | 2 |
| unmanaged | 5 |

### By Kind (heuristic、Reading Pass 後段で articulate に更新)

| Kind | Count |
|---|---|
| archive-doc | 339 |
| canonical-doc | 267 |
| generated-report | 30 |
| project-plan | 57 |
| repo-entrypoint | 3 |
| unknown | 72 |

### By Document Status

| Status | Count |
|---|---|
| archive | 339 |
| declared | 267 |
| generated | 30 |
| observed-only | 132 |

### By Contract Status

| Status | Count |
|---|---|
| declared | 288 |
| unreviewed | 480 |

## Entries

> **注**: 各 entry の `kind` / `temporalScope` / `meaningStatus` / `intentStatus` / `continuityStatus` は Phase 2.5 simple version では heuristic / unknown / unreviewed が中心。Reading Pass 後段 (Wave 2 内) で articulate に更新される。

### aag-framework (5)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`aag/_framework/README.md`](../../../aag/_framework/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`aag/CHANGELOG.md`](../../../aag/CHANGELOG.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`aag/core/AAG_CORE_INDEX.md`](../../../aag/core/AAG_CORE_INDEX.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`aag/core/principles/core-boundary-policy.md`](../../../aag/core/principles/core-boundary-policy.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`aag/README.md`](../../../aag/README.md) | unknown | observed-only | unreviewed | markdown-inventory |

### aag-framework-internal (9)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`aag/_internal/architecture.md`](../../../aag/_internal/architecture.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/display-rule-registry.md`](../../../aag/_internal/display-rule-registry.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/evolution.md`](../../../aag/_internal/evolution.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/layer-map.md`](../../../aag/_internal/layer-map.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/meta.md`](../../../aag/_internal/meta.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/operational-classification.md`](../../../aag/_internal/operational-classification.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/README.md`](../../../aag/_internal/README.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/source-of-truth.md`](../../../aag/_internal/source-of-truth.md) | canonical-doc | declared | declared | doc-registry |
| [`aag/_internal/strategy.md`](../../../aag/_internal/strategy.md) | canonical-doc | declared | declared | doc-registry |

### aag-interface (16)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/05-aag-interface/drawer/decision-articulation-patterns.md`](../../05-aag-interface/drawer/decision-articulation-patterns.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/operations/deferred-decision-pattern.md`](../../05-aag-interface/operations/deferred-decision-pattern.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/operations/new-project-bootstrap-guide.md`](../../05-aag-interface/operations/new-project-bootstrap-guide.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/operations/project-checklist-governance.md`](../../05-aag-interface/operations/project-checklist-governance.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/operations/projectization-policy.md`](../../05-aag-interface/operations/projectization-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/bug-fix-protocol.md`](../../05-aag-interface/protocols/bug-fix-protocol.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/complexity-policy.md`](../../05-aag-interface/protocols/complexity-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/new-capability-protocol.md`](../../05-aag-interface/protocols/new-capability-protocol.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/planning-protocol.md`](../../05-aag-interface/protocols/planning-protocol.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/README.md`](../../05-aag-interface/protocols/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/05-aag-interface/protocols/refactor-protocol.md`](../../05-aag-interface/protocols/refactor-protocol.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/seam-integration.md`](../../05-aag-interface/protocols/seam-integration.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/session-protocol.md`](../../05-aag-interface/protocols/session-protocol.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/task-class-catalog.md`](../../05-aag-interface/protocols/task-class-catalog.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/protocols/task-protocol-system.md`](../../05-aag-interface/protocols/task-protocol-system.md) | canonical-doc | declared | declared | doc-registry |
| [`references/05-aag-interface/README.md`](../../05-aag-interface/README.md) | unknown | observed-only | unreviewed | markdown-inventory |

### active-projects (80)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`projects/active/aag-coverage-rule-expansion/AI_CONTEXT.md`](../../../projects/active/aag-coverage-rule-expansion/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-coverage-rule-expansion/checklist.md`](../../../projects/active/aag-coverage-rule-expansion/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-coverage-rule-expansion/decision-audit.md`](../../../projects/active/aag-coverage-rule-expansion/decision-audit.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-coverage-rule-expansion/discovery-log.md`](../../../projects/active/aag-coverage-rule-expansion/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-coverage-rule-expansion/HANDOFF.md`](../../../projects/active/aag-coverage-rule-expansion/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-coverage-rule-expansion/plan.md`](../../../projects/active/aag-coverage-rule-expansion/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-coverage-rule-expansion/projectization.md`](../../../projects/active/aag-coverage-rule-expansion/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-disposition-execution/AI_CONTEXT.md`](../../../projects/active/aag-disposition-execution/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-disposition-execution/checklist.md`](../../../projects/active/aag-disposition-execution/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-disposition-execution/decision-audit.md`](../../../projects/active/aag-disposition-execution/decision-audit.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-disposition-execution/discovery-log.md`](../../../projects/active/aag-disposition-execution/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-disposition-execution/HANDOFF.md`](../../../projects/active/aag-disposition-execution/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-disposition-execution/plan.md`](../../../projects/active/aag-disposition-execution/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-disposition-execution/projectization.md`](../../../projects/active/aag-disposition-execution/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-failure-pattern-guards/AI_CONTEXT.md`](../../../projects/active/aag-failure-pattern-guards/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-failure-pattern-guards/checklist.md`](../../../projects/active/aag-failure-pattern-guards/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-failure-pattern-guards/decision-audit.md`](../../../projects/active/aag-failure-pattern-guards/decision-audit.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-failure-pattern-guards/discovery-log.md`](../../../projects/active/aag-failure-pattern-guards/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-failure-pattern-guards/HANDOFF.md`](../../../projects/active/aag-failure-pattern-guards/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-failure-pattern-guards/plan.md`](../../../projects/active/aag-failure-pattern-guards/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-failure-pattern-guards/projectization.md`](../../../projects/active/aag-failure-pattern-guards/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/AI_CONTEXT.md`](../../../projects/active/aag-governance-ratchet-down/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/checklist.md`](../../../projects/active/aag-governance-ratchet-down/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/decision-audit.md`](../../../projects/active/aag-governance-ratchet-down/decision-audit.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/discovery-log.md`](../../../projects/active/aag-governance-ratchet-down/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/HANDOFF.md`](../../../projects/active/aag-governance-ratchet-down/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/plan.md`](../../../projects/active/aag-governance-ratchet-down/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/projectization.md`](../../../projects/active/aag-governance-ratchet-down/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/aag-governance-ratchet-down/sub-project-map.md`](../../../projects/active/aag-governance-ratchet-down/sub-project-map.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/presentation-quality-hardening/AI_CONTEXT.md`](../../../projects/active/presentation-quality-hardening/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/presentation-quality-hardening/checklist.md`](../../../projects/active/presentation-quality-hardening/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/presentation-quality-hardening/discovery-log.md`](../../../projects/active/presentation-quality-hardening/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/presentation-quality-hardening/HANDOFF.md`](../../../projects/active/presentation-quality-hardening/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/presentation-quality-hardening/plan.md`](../../../projects/active/presentation-quality-hardening/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/presentation-quality-hardening/projectization.md`](../../../projects/active/presentation-quality-hardening/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/AI_CONTEXT.md`](../../../projects/active/pure-calculation-reorg/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/breaking-changes.md`](../../../projects/active/pure-calculation-reorg/breaking-changes.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/checklist.md`](../../../projects/active/pure-calculation-reorg/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/discovery-log.md`](../../../projects/active/pure-calculation-reorg/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/HANDOFF.md`](../../../projects/active/pure-calculation-reorg/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/legacy-retirement.md`](../../../projects/active/pure-calculation-reorg/legacy-retirement.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/phase-8/promotion-readiness-table.md`](../../../projects/active/pure-calculation-reorg/phase-8/promotion-readiness-table.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/phase-8/proposals/ANA-003-sensitivity.md`](../../../projects/active/pure-calculation-reorg/phase-8/proposals/ANA-003-sensitivity.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/phase-8/proposals/ANA-004-trendAnalysis.md`](../../../projects/active/pure-calculation-reorg/phase-8/proposals/ANA-004-trendAnalysis.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/phase-8/proposals/ANA-007-dowGapAnalysis.md`](../../../projects/active/pure-calculation-reorg/phase-8/proposals/ANA-007-dowGapAnalysis.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/phase-8/proposals/ANA-009-computeMovingAverage.md`](../../../projects/active/pure-calculation-reorg/phase-8/proposals/ANA-009-computeMovingAverage.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-correlation.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-correlation.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-customerGap.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-customerGap.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-dowGapAnalysis.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-dowGapAnalysis.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-inventoryCalc.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-inventoryCalc.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-movingAverage.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-movingAverage.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-observationPeriod.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-observationPeriod.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-pinIntervals.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-pinIntervals.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-piValue.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-piValue.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-remainingBudgetRate.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-remainingBudgetRate.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-sensitivity.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-sensitivity.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-trendAnalysis.md`](../../../projects/active/pure-calculation-reorg/phase-8/readiness/promotion-readiness-trendAnalysis.md) | canonical-doc | declared | declared | doc-registry |
| [`projects/active/pure-calculation-reorg/phase-8/README.md`](../../../projects/active/pure-calculation-reorg/phase-8/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/plan.md`](../../../projects/active/pure-calculation-reorg/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/pure-calculation-reorg/projectization.md`](../../../projects/active/pure-calculation-reorg/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/quick-fixes/AI_CONTEXT.md`](../../../projects/active/quick-fixes/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/quick-fixes/checklist.md`](../../../projects/active/quick-fixes/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/quick-fixes/HANDOFF.md`](../../../projects/active/quick-fixes/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/quick-fixes/plan.md`](../../../projects/active/quick-fixes/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md`](../../../projects/active/reposteward-ai-ops-platform/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/reposteward-ai-ops-platform/checklist.md`](../../../projects/active/reposteward-ai-ops-platform/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/reposteward-ai-ops-platform/decision-audit.md`](../../../projects/active/reposteward-ai-ops-platform/decision-audit.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/reposteward-ai-ops-platform/discovery-log.md`](../../../projects/active/reposteward-ai-ops-platform/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/reposteward-ai-ops-platform/HANDOFF.md`](../../../projects/active/reposteward-ai-ops-platform/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/reposteward-ai-ops-platform/plan.md`](../../../projects/active/reposteward-ai-ops-platform/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/reposteward-ai-ops-platform/projectization.md`](../../../projects/active/reposteward-ai-ops-platform/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/AI_CONTEXT.md`](../../../projects/active/taxonomy-v2/AI_CONTEXT.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/breaking-changes.md`](../../../projects/active/taxonomy-v2/breaking-changes.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/checklist.md`](../../../projects/active/taxonomy-v2/checklist.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/discovery-log.md`](../../../projects/active/taxonomy-v2/discovery-log.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/HANDOFF.md`](../../../projects/active/taxonomy-v2/HANDOFF.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/legacy-retirement.md`](../../../projects/active/taxonomy-v2/legacy-retirement.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/plan.md`](../../../projects/active/taxonomy-v2/plan.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/projectization.md`](../../../projects/active/taxonomy-v2/projectization.md) | project-plan | observed-only | unreviewed | markdown-inventory |
| [`projects/active/taxonomy-v2/sub-project-map.md`](../../../projects/active/taxonomy-v2/sub-project-map.md) | unknown | observed-only | unreviewed | markdown-inventory |

### archive (14)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/99-archive/aag-5-constitution.md`](../../99-archive/aag-5-constitution.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/aag-5-layer-map.md`](../../99-archive/aag-5-layer-map.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/aag-5-source-of-truth-policy.md`](../../99-archive/aag-5-source-of-truth-policy.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/aag-doc-audit-report.md`](../../99-archive/aag-doc-audit-report.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/aag-four-layer-architecture.md`](../../99-archive/aag-four-layer-architecture.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/aag-operational-classification.md`](../../99-archive/aag-operational-classification.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/aag-rule-splitting-plan.md`](../../99-archive/aag-rule-splitting-plan.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/adaptive-architecture-governance.md`](../../99-archive/adaptive-architecture-governance.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/adaptive-governance-evolution.md`](../../99-archive/adaptive-governance-evolution.md) | archive-doc | archive | declared | doc-registry |
| [`references/99-archive/authoritative-term-sweep.md`](../../99-archive/authoritative-term-sweep.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`references/99-archive/old-plans-summary.md`](../../99-archive/old-plans-summary.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`references/99-archive/plan.md`](../../99-archive/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`references/99-archive/PLAN.md`](../../99-archive/PLAN.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`references/99-archive/principle-migration-map.md`](../../99-archive/principle-migration-map.md) | archive-doc | archive | unreviewed | markdown-inventory |

### completed-projects (325)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`projects/completed/aag-bidirectional-integrity/AI_CONTEXT.md`](../../../projects/completed/aag-bidirectional-integrity/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-bidirectional-integrity/breaking-changes.md`](../../../projects/completed/aag-bidirectional-integrity/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-bidirectional-integrity/checklist.md`](../../../projects/completed/aag-bidirectional-integrity/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-bidirectional-integrity/HANDOFF.md`](../../../projects/completed/aag-bidirectional-integrity/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-bidirectional-integrity/legacy-retirement.md`](../../../projects/completed/aag-bidirectional-integrity/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-bidirectional-integrity/plan.md`](../../../projects/completed/aag-bidirectional-integrity/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-bidirectional-integrity/projectization.md`](../../../projects/completed/aag-bidirectional-integrity/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-collector-purification/AI_CONTEXT.md`](../../../projects/completed/aag-collector-purification/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-collector-purification/checklist.md`](../../../projects/completed/aag-collector-purification/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-collector-purification/HANDOFF.md`](../../../projects/completed/aag-collector-purification/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-collector-purification/plan.md`](../../../projects/completed/aag-collector-purification/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-core-doc-refactor/AI_CONTEXT.md`](../../../projects/completed/aag-core-doc-refactor/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-core-doc-refactor/breaking-changes.md`](../../../projects/completed/aag-core-doc-refactor/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-core-doc-refactor/checklist.md`](../../../projects/completed/aag-core-doc-refactor/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-core-doc-refactor/HANDOFF.md`](../../../projects/completed/aag-core-doc-refactor/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-core-doc-refactor/legacy-retirement.md`](../../../projects/completed/aag-core-doc-refactor/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-core-doc-refactor/plan.md`](../../../projects/completed/aag-core-doc-refactor/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-core-doc-refactor/projectization.md`](../../../projects/completed/aag-core-doc-refactor/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-decision-traceability/AI_CONTEXT.md`](../../../projects/completed/aag-decision-traceability/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-decision-traceability/checklist.md`](../../../projects/completed/aag-decision-traceability/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-decision-traceability/HANDOFF.md`](../../../projects/completed/aag-decision-traceability/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-decision-traceability/plan.md`](../../../projects/completed/aag-decision-traceability/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-decision-traceability/projectization.md`](../../../projects/completed/aag-decision-traceability/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-display-rule-registry/AI_CONTEXT.md`](../../../projects/completed/aag-display-rule-registry/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-display-rule-registry/checklist.md`](../../../projects/completed/aag-display-rule-registry/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-display-rule-registry/HANDOFF.md`](../../../projects/completed/aag-display-rule-registry/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-display-rule-registry/plan.md`](../../../projects/completed/aag-display-rule-registry/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-display-rule-registry/projectization.md`](../../../projects/completed/aag-display-rule-registry/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-doc-responsibility-separation/AI_CONTEXT.md`](../../../projects/completed/aag-doc-responsibility-separation/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-doc-responsibility-separation/checklist.md`](../../../projects/completed/aag-doc-responsibility-separation/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-doc-responsibility-separation/HANDOFF.md`](../../../projects/completed/aag-doc-responsibility-separation/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-doc-responsibility-separation/plan.md`](../../../projects/completed/aag-doc-responsibility-separation/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-doc-responsibility-separation/projectization.md`](../../../projects/completed/aag-doc-responsibility-separation/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-engine-go-mvp/ARCHIVE.md`](../../../projects/completed/aag-engine-go-mvp/ARCHIVE.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-engine-readiness-refactor/ARCHIVE.md`](../../../projects/completed/aag-engine-readiness-refactor/ARCHIVE.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/AI_CONTEXT.md`](../../../projects/completed/aag-format-redesign/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/checklist.md`](../../../projects/completed/aag-format-redesign/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/current-state-survey.md`](../../../projects/completed/aag-format-redesign/current-state-survey.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/HANDOFF.md`](../../../projects/completed/aag-format-redesign/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/migration-guide.md`](../../../projects/completed/aag-format-redesign/migration-guide.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/new-format-design.md`](../../../projects/completed/aag-format-redesign/new-format-design.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/overlay-bootstrap-design.md`](../../../projects/completed/aag-format-redesign/overlay-bootstrap-design.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/pain-points.md`](../../../projects/completed/aag-format-redesign/pain-points.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/plan.md`](../../../projects/completed/aag-format-redesign/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/strengths.md`](../../../projects/completed/aag-format-redesign/strengths.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-format-redesign/subproject-design.md`](../../../projects/completed/aag-format-redesign/subproject-design.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-legacy-retirement/AI_CONTEXT.md`](../../../projects/completed/aag-legacy-retirement/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-legacy-retirement/breaking-changes.md`](../../../projects/completed/aag-legacy-retirement/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-legacy-retirement/checklist.md`](../../../projects/completed/aag-legacy-retirement/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-legacy-retirement/HANDOFF.md`](../../../projects/completed/aag-legacy-retirement/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-legacy-retirement/legacy-retirement.md`](../../../projects/completed/aag-legacy-retirement/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-legacy-retirement/plan.md`](../../../projects/completed/aag-legacy-retirement/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-legacy-retirement/projectization.md`](../../../projects/completed/aag-legacy-retirement/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-platformization/ARCHIVE.md`](../../../projects/completed/aag-platformization/ARCHIVE.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-schema-meta-guard/AI_CONTEXT.md`](../../../projects/completed/aag-rule-schema-meta-guard/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-schema-meta-guard/checklist.md`](../../../projects/completed/aag-rule-schema-meta-guard/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-schema-meta-guard/HANDOFF.md`](../../../projects/completed/aag-rule-schema-meta-guard/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-schema-meta-guard/plan.md`](../../../projects/completed/aag-rule-schema-meta-guard/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-schema-meta-guard/projectization.md`](../../../projects/completed/aag-rule-schema-meta-guard/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md`](../../../projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-splitting-execution/checklist.md`](../../../projects/completed/aag-rule-splitting-execution/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-splitting-execution/HANDOFF.md`](../../../projects/completed/aag-rule-splitting-execution/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-rule-splitting-execution/plan.md`](../../../projects/completed/aag-rule-splitting-execution/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-self-hosting-completion/ARCHIVE.md`](../../../projects/completed/aag-self-hosting-completion/ARCHIVE.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/AI_CONTEXT.md`](../../../projects/completed/aag-structural-control-plane/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/checklist.md`](../../../projects/completed/aag-structural-control-plane/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/decision-audit.md`](../../../projects/completed/aag-structural-control-plane/decision-audit.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/derived/README.md`](../../../projects/completed/aag-structural-control-plane/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/discovery-log.md`](../../../projects/completed/aag-structural-control-plane/discovery-log.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/HANDOFF.md`](../../../projects/completed/aag-structural-control-plane/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/01-existing-contract-assets.md`](../../../projects/completed/aag-structural-control-plane/inquiry/01-existing-contract-assets.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/02-existing-yaml-inventory.md`](../../../projects/completed/aag-structural-control-plane/inquiry/02-existing-yaml-inventory.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/03-doc-registry-extension-strategy.md`](../../../projects/completed/aag-structural-control-plane/inquiry/03-doc-registry-extension-strategy.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/04-self-check-substrate-sync.md`](../../../projects/completed/aag-structural-control-plane/inquiry/04-self-check-substrate-sync.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/05-obligation-migration-strategy.md`](../../../projects/completed/aag-structural-control-plane/inquiry/05-obligation-migration-strategy.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/06-temporal-scope-shadow-policy.md`](../../../projects/completed/aag-structural-control-plane/inquiry/06-temporal-scope-shadow-policy.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/07-phase0-acceptance-criteria.md`](../../../projects/completed/aag-structural-control-plane/inquiry/07-phase0-acceptance-criteria.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/inquiry/08-wave-restructuring.md`](../../../projects/completed/aag-structural-control-plane/inquiry/08-wave-restructuring.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/plan.md`](../../../projects/completed/aag-structural-control-plane/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-structural-control-plane/projectization.md`](../../../projects/completed/aag-structural-control-plane/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/AI_CONTEXT.md`](../../../projects/completed/aag-temporal-governance-hardening/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/breaking-changes.md`](../../../projects/completed/aag-temporal-governance-hardening/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/checklist.md`](../../../projects/completed/aag-temporal-governance-hardening/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/DERIVED.md`](../../../projects/completed/aag-temporal-governance-hardening/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/derived/acceptance-suite.md`](../../../projects/completed/aag-temporal-governance-hardening/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/derived/inventory/00-example.md`](../../../projects/completed/aag-temporal-governance-hardening/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/derived/inventory/README.md`](../../../projects/completed/aag-temporal-governance-hardening/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/derived/pr-breakdown.md`](../../../projects/completed/aag-temporal-governance-hardening/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/derived/README.md`](../../../projects/completed/aag-temporal-governance-hardening/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/derived/review-checklist.md`](../../../projects/completed/aag-temporal-governance-hardening/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/derived/test-plan.md`](../../../projects/completed/aag-temporal-governance-hardening/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/HANDOFF.md`](../../../projects/completed/aag-temporal-governance-hardening/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/plan.md`](../../../projects/completed/aag-temporal-governance-hardening/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/projectization.md`](../../../projects/completed/aag-temporal-governance-hardening/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/aag-temporal-governance-hardening/SUMMARY.md`](../../../projects/completed/aag-temporal-governance-hardening/SUMMARY.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/AI_CONTEXT.md`](../../../projects/completed/architecture-debt-recovery/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/breaking-changes.md`](../../../projects/completed/architecture-debt-recovery/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/checklist.md`](../../../projects/completed/architecture-debt-recovery/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/DERIVED.md`](../../../projects/completed/architecture-debt-recovery/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/derived/acceptance-suite.md`](../../../projects/completed/architecture-debt-recovery/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/derived/inventory/00-example.md`](../../../projects/completed/architecture-debt-recovery/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/derived/inventory/README.md`](../../../projects/completed/architecture-debt-recovery/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/derived/pr-breakdown.md`](../../../projects/completed/architecture-debt-recovery/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/derived/README.md`](../../../projects/completed/architecture-debt-recovery/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/derived/review-checklist.md`](../../../projects/completed/architecture-debt-recovery/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/derived/test-plan.md`](../../../projects/completed/architecture-debt-recovery/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/HANDOFF.md`](../../../projects/completed/architecture-debt-recovery/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/01-widget-registries.md`](../../../projects/completed/architecture-debt-recovery/inquiry/01-widget-registries.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md`](../../../projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/02-widget-ctx-dependency.md`](../../../projects/completed/architecture-debt-recovery/inquiry/02-widget-ctx-dependency.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/03-ui-component-orphans.md`](../../../projects/completed/architecture-debt-recovery/inquiry/03-ui-component-orphans.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/04-type-asymmetry.md`](../../../projects/completed/architecture-debt-recovery/inquiry/04-type-asymmetry.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/05-pure-fn-candidates.md`](../../../projects/completed/architecture-debt-recovery/inquiry/05-pure-fn-candidates.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/06-data-pipeline-map.md`](../../../projects/completed/architecture-debt-recovery/inquiry/06-data-pipeline-map.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/07-complexity-hotspots.md`](../../../projects/completed/architecture-debt-recovery/inquiry/07-complexity-hotspots.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/08-ui-responsibility-audit.md`](../../../projects/completed/architecture-debt-recovery/inquiry/08-ui-responsibility-audit.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/09-symptom-to-hypothesis.md`](../../../projects/completed/architecture-debt-recovery/inquiry/09-symptom-to-hypothesis.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/10-hypothesis-interaction.md`](../../../projects/completed/architecture-debt-recovery/inquiry/10-hypothesis-interaction.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/10a-wss-concern-link.md`](../../../projects/completed/architecture-debt-recovery/inquiry/10a-wss-concern-link.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/11-recurrence-pattern.md`](../../../projects/completed/architecture-debt-recovery/inquiry/11-recurrence-pattern.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/12-principle-candidates.md`](../../../projects/completed/architecture-debt-recovery/inquiry/12-principle-candidates.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/13-invariant-candidates.md`](../../../projects/completed/architecture-debt-recovery/inquiry/13-invariant-candidates.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/14-rule-retirement-candidates.md`](../../../projects/completed/architecture-debt-recovery/inquiry/14-rule-retirement-candidates.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/15-remediation-plan.md`](../../../projects/completed/architecture-debt-recovery/inquiry/15-remediation-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/16-breaking-changes.md`](../../../projects/completed/architecture-debt-recovery/inquiry/16-breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/17-legacy-retirement.md`](../../../projects/completed/architecture-debt-recovery/inquiry/17-legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/17a-orphan-scope-extension.md`](../../../projects/completed/architecture-debt-recovery/inquiry/17a-orphan-scope-extension.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/18-sub-project-map.md`](../../../projects/completed/architecture-debt-recovery/inquiry/18-sub-project-map.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/19-predecessor-project-transition.md`](../../../projects/completed/architecture-debt-recovery/inquiry/19-predecessor-project-transition.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/20-current-project-switch-plan.md`](../../../projects/completed/architecture-debt-recovery/inquiry/20-current-project-switch-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/inquiry/21-spawn-sequence.md`](../../../projects/completed/architecture-debt-recovery/inquiry/21-spawn-sequence.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/legacy-retirement.md`](../../../projects/completed/architecture-debt-recovery/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/plan.md`](../../../projects/completed/architecture-debt-recovery/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/projectization.md`](../../../projects/completed/architecture-debt-recovery/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/sub-project-map.md`](../../../projects/completed/architecture-debt-recovery/sub-project-map.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-debt-recovery/SUMMARY.md`](../../../projects/completed/architecture-debt-recovery/SUMMARY.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-decision-backlog/AI_CONTEXT.md`](../../../projects/completed/architecture-decision-backlog/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-decision-backlog/checklist.md`](../../../projects/completed/architecture-decision-backlog/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-decision-backlog/HANDOFF.md`](../../../projects/completed/architecture-decision-backlog/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/architecture-decision-backlog/plan.md`](../../../projects/completed/architecture-decision-backlog/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/budget-achievement-simulator/AI_CONTEXT.md`](../../../projects/completed/budget-achievement-simulator/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/budget-achievement-simulator/checklist.md`](../../../projects/completed/budget-achievement-simulator/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/budget-achievement-simulator/HANDOFF.md`](../../../projects/completed/budget-achievement-simulator/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/budget-achievement-simulator/plan.md`](../../../projects/completed/budget-achievement-simulator/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/budget-achievement-simulator/SUMMARY.md`](../../../projects/completed/budget-achievement-simulator/SUMMARY.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-bundle-migration/AI_CONTEXT.md`](../../../projects/completed/calendar-modal-bundle-migration/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-bundle-migration/checklist.md`](../../../projects/completed/calendar-modal-bundle-migration/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-bundle-migration/HANDOFF.md`](../../../projects/completed/calendar-modal-bundle-migration/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-bundle-migration/plan.md`](../../../projects/completed/calendar-modal-bundle-migration/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-route-unification/AI_CONTEXT.md`](../../../projects/completed/calendar-modal-route-unification/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-route-unification/checklist.md`](../../../projects/completed/calendar-modal-route-unification/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-route-unification/HANDOFF.md`](../../../projects/completed/calendar-modal-route-unification/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/calendar-modal-route-unification/plan.md`](../../../projects/completed/calendar-modal-route-unification/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/AI_CONTEXT.md`](../../../projects/completed/canonicalization-domain-consolidation/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/breaking-changes.md`](../../../projects/completed/canonicalization-domain-consolidation/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/checklist.md`](../../../projects/completed/canonicalization-domain-consolidation/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/derived/README.md`](../../../projects/completed/canonicalization-domain-consolidation/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/HANDOFF.md`](../../../projects/completed/canonicalization-domain-consolidation/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/legacy-retirement.md`](../../../projects/completed/canonicalization-domain-consolidation/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/plan.md`](../../../projects/completed/canonicalization-domain-consolidation/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/projectization.md`](../../../projects/completed/canonicalization-domain-consolidation/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/canonicalization-domain-consolidation/sub-project-map.md`](../../../projects/completed/canonicalization-domain-consolidation/sub-project-map.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-entry-shape-break/AI_CONTEXT.md`](../../../projects/completed/category-leaf-daily-entry-shape-break/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-entry-shape-break/checklist.md`](../../../projects/completed/category-leaf-daily-entry-shape-break/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-entry-shape-break/HANDOFF.md`](../../../projects/completed/category-leaf-daily-entry-shape-break/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-entry-shape-break/plan.md`](../../../projects/completed/category-leaf-daily-entry-shape-break/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-series/AI_CONTEXT.md`](../../../projects/completed/category-leaf-daily-series/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-series/checklist.md`](../../../projects/completed/category-leaf-daily-series/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-series/HANDOFF.md`](../../../projects/completed/category-leaf-daily-series/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/category-leaf-daily-series/plan.md`](../../../projects/completed/category-leaf-daily-series/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/chart-color-alignment/AI_CONTEXT.md`](../../../projects/completed/chart-color-alignment/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/chart-color-alignment/checklist.md`](../../../projects/completed/chart-color-alignment/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/chart-color-alignment/HANDOFF.md`](../../../projects/completed/chart-color-alignment/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/chart-color-alignment/plan.md`](../../../projects/completed/chart-color-alignment/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-flow-unification/AI_CONTEXT.md`](../../../projects/completed/data-flow-unification/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-flow-unification/checklist.md`](../../../projects/completed/data-flow-unification/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-flow-unification/HANDOFF.md`](../../../projects/completed/data-flow-unification/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-flow-unification/plan.md`](../../../projects/completed/data-flow-unification/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md`](../../../projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-load-idempotency-hardening/checklist.md`](../../../projects/completed/data-load-idempotency-hardening/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-load-idempotency-hardening/HANDOFF.md`](../../../projects/completed/data-load-idempotency-hardening/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/data-load-idempotency-hardening/plan.md`](../../../projects/completed/data-load-idempotency-hardening/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/day-detail-modal-prev-year-investigation/AI_CONTEXT.md`](../../../projects/completed/day-detail-modal-prev-year-investigation/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/day-detail-modal-prev-year-investigation/checklist.md`](../../../projects/completed/day-detail-modal-prev-year-investigation/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/day-detail-modal-prev-year-investigation/HANDOFF.md`](../../../projects/completed/day-detail-modal-prev-year-investigation/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/day-detail-modal-prev-year-investigation/plan.md`](../../../projects/completed/day-detail-modal-prev-year-investigation/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/design-system-v2-1-asset/AI_CONTEXT.md`](../../../projects/completed/design-system-v2-1-asset/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/design-system-v2-1-asset/checklist.md`](../../../projects/completed/design-system-v2-1-asset/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/design-system-v2-1-asset/HANDOFF.md`](../../../projects/completed/design-system-v2-1-asset/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/design-system-v2-1-asset/plan.md`](../../../projects/completed/design-system-v2-1-asset/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md`](../../../projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/docs-and-governance-cohesion/checklist.md`](../../../projects/completed/docs-and-governance-cohesion/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/docs-and-governance-cohesion/HANDOFF.md`](../../../projects/completed/docs-and-governance-cohesion/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/docs-and-governance-cohesion/plan.md`](../../../projects/completed/docs-and-governance-cohesion/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/AI_CONTEXT.md`](../../../projects/completed/duplicate-orphan-retirement/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/breaking-changes.md`](../../../projects/completed/duplicate-orphan-retirement/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/checklist.md`](../../../projects/completed/duplicate-orphan-retirement/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/DERIVED.md`](../../../projects/completed/duplicate-orphan-retirement/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/derived/acceptance-suite.md`](../../../projects/completed/duplicate-orphan-retirement/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/derived/inventory/00-example.md`](../../../projects/completed/duplicate-orphan-retirement/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/derived/inventory/README.md`](../../../projects/completed/duplicate-orphan-retirement/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/derived/pr-breakdown.md`](../../../projects/completed/duplicate-orphan-retirement/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/derived/README.md`](../../../projects/completed/duplicate-orphan-retirement/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/derived/review-checklist.md`](../../../projects/completed/duplicate-orphan-retirement/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/derived/test-plan.md`](../../../projects/completed/duplicate-orphan-retirement/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/HANDOFF.md`](../../../projects/completed/duplicate-orphan-retirement/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/legacy-retirement.md`](../../../projects/completed/duplicate-orphan-retirement/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/plan.md`](../../../projects/completed/duplicate-orphan-retirement/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/projectization.md`](../../../projects/completed/duplicate-orphan-retirement/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/duplicate-orphan-retirement/SUMMARY.md`](../../../projects/completed/duplicate-orphan-retirement/SUMMARY.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/AI_CONTEXT.md`](../../../projects/completed/integrity-framework-evolution/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/breaking-changes.md`](../../../projects/completed/integrity-framework-evolution/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/checklist.md`](../../../projects/completed/integrity-framework-evolution/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/derived/quality-review.md`](../../../projects/completed/integrity-framework-evolution/derived/quality-review.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/HANDOFF.md`](../../../projects/completed/integrity-framework-evolution/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/legacy-retirement.md`](../../../projects/completed/integrity-framework-evolution/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/plan.md`](../../../projects/completed/integrity-framework-evolution/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/projectization.md`](../../../projects/completed/integrity-framework-evolution/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/integrity-framework-evolution/sub-project-map.md`](../../../projects/completed/integrity-framework-evolution/sub-project-map.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/operational-protocol-system/ARCHIVE.md`](../../../projects/completed/operational-protocol-system/ARCHIVE.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phase-6-optional-comparison-projection/AI_CONTEXT.md`](../../../projects/completed/phase-6-optional-comparison-projection/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phase-6-optional-comparison-projection/checklist.md`](../../../projects/completed/phase-6-optional-comparison-projection/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phase-6-optional-comparison-projection/HANDOFF.md`](../../../projects/completed/phase-6-optional-comparison-projection/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phase-6-optional-comparison-projection/plan.md`](../../../projects/completed/phase-6-optional-comparison-projection/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/AI_CONTEXT.md`](../../../projects/completed/phased-content-specs-rollout/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/checklist.md`](../../../projects/completed/phased-content-specs-rollout/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/DERIVED.md`](../../../projects/completed/phased-content-specs-rollout/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/derived/acceptance-suite.md`](../../../projects/completed/phased-content-specs-rollout/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/derived/inventory/00-example.md`](../../../projects/completed/phased-content-specs-rollout/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/derived/inventory/README.md`](../../../projects/completed/phased-content-specs-rollout/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/derived/pr-breakdown.md`](../../../projects/completed/phased-content-specs-rollout/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/derived/README.md`](../../../projects/completed/phased-content-specs-rollout/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/derived/review-checklist.md`](../../../projects/completed/phased-content-specs-rollout/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/derived/test-plan.md`](../../../projects/completed/phased-content-specs-rollout/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/HANDOFF.md`](../../../projects/completed/phased-content-specs-rollout/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/plan.md`](../../../projects/completed/phased-content-specs-rollout/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/phased-content-specs-rollout/projectization.md`](../../../projects/completed/phased-content-specs-rollout/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/presentation-cts-surface-ratchetdown/AI_CONTEXT.md`](../../../projects/completed/presentation-cts-surface-ratchetdown/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/presentation-cts-surface-ratchetdown/checklist.md`](../../../projects/completed/presentation-cts-surface-ratchetdown/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md`](../../../projects/completed/presentation-cts-surface-ratchetdown/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/presentation-cts-surface-ratchetdown/plan.md`](../../../projects/completed/presentation-cts-surface-ratchetdown/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/README.md`](../../../projects/completed/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/AI_CONTEXT.md`](../../../projects/completed/responsibility-taxonomy-v2/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/breaking-changes.md`](../../../projects/completed/responsibility-taxonomy-v2/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/checklist.md`](../../../projects/completed/responsibility-taxonomy-v2/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/DERIVED.md`](../../../projects/completed/responsibility-taxonomy-v2/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/derived/acceptance-suite.md`](../../../projects/completed/responsibility-taxonomy-v2/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/derived/inventory/00-example.md`](../../../projects/completed/responsibility-taxonomy-v2/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/derived/inventory/README.md`](../../../projects/completed/responsibility-taxonomy-v2/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/derived/pr-breakdown.md`](../../../projects/completed/responsibility-taxonomy-v2/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/derived/README.md`](../../../projects/completed/responsibility-taxonomy-v2/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/derived/review-checklist.md`](../../../projects/completed/responsibility-taxonomy-v2/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/derived/test-plan.md`](../../../projects/completed/responsibility-taxonomy-v2/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/HANDOFF.md`](../../../projects/completed/responsibility-taxonomy-v2/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/legacy-retirement.md`](../../../projects/completed/responsibility-taxonomy-v2/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/plan.md`](../../../projects/completed/responsibility-taxonomy-v2/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/responsibility-taxonomy-v2/projectization.md`](../../../projects/completed/responsibility-taxonomy-v2/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-signal-integrity/AI_CONTEXT.md`](../../../projects/completed/test-signal-integrity/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-signal-integrity/checklist.md`](../../../projects/completed/test-signal-integrity/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-signal-integrity/HANDOFF.md`](../../../projects/completed/test-signal-integrity/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-signal-integrity/plan.md`](../../../projects/completed/test-signal-integrity/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/AI_CONTEXT.md`](../../../projects/completed/test-taxonomy-v2/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/breaking-changes.md`](../../../projects/completed/test-taxonomy-v2/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/checklist.md`](../../../projects/completed/test-taxonomy-v2/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/DERIVED.md`](../../../projects/completed/test-taxonomy-v2/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/derived/acceptance-suite.md`](../../../projects/completed/test-taxonomy-v2/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/derived/inventory/00-example.md`](../../../projects/completed/test-taxonomy-v2/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/derived/inventory/README.md`](../../../projects/completed/test-taxonomy-v2/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/derived/pr-breakdown.md`](../../../projects/completed/test-taxonomy-v2/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/derived/README.md`](../../../projects/completed/test-taxonomy-v2/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/derived/review-checklist.md`](../../../projects/completed/test-taxonomy-v2/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/derived/test-plan.md`](../../../projects/completed/test-taxonomy-v2/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/HANDOFF.md`](../../../projects/completed/test-taxonomy-v2/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/legacy-retirement.md`](../../../projects/completed/test-taxonomy-v2/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/plan.md`](../../../projects/completed/test-taxonomy-v2/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/test-taxonomy-v2/projectization.md`](../../../projects/completed/test-taxonomy-v2/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/acceptance-suite.md`](../../../projects/completed/unify-period-analysis/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/AI_CONTEXT.md`](../../../projects/completed/unify-period-analysis/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/checklist.md`](../../../projects/completed/unify-period-analysis/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/HANDOFF.md`](../../../projects/completed/unify-period-analysis/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/inventory/01-comparison-math-in-presentation.md`](../../../projects/completed/unify-period-analysis/inventory/01-comparison-math-in-presentation.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/inventory/02-non-handler-free-period-access.md`](../../../projects/completed/unify-period-analysis/inventory/02-non-handler-free-period-access.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/inventory/03-rate-in-sql.md`](../../../projects/completed/unify-period-analysis/inventory/03-rate-in-sql.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/inventory/04-header-filter-state-direct-refs.md`](../../../projects/completed/unify-period-analysis/inventory/04-header-filter-state-direct-refs.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/inventory/05-phase6-widget-consumers.md`](../../../projects/completed/unify-period-analysis/inventory/05-phase6-widget-consumers.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/inventory/06-phase7-phase8-audit.md`](../../../projects/completed/unify-period-analysis/inventory/06-phase7-phase8-audit.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/inventory/README.md`](../../../projects/completed/unify-period-analysis/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/phase-6-5-step-b-design.md`](../../../projects/completed/unify-period-analysis/phase-6-5-step-b-design.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/plan.md`](../../../projects/completed/unify-period-analysis/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/pr-breakdown.md`](../../../projects/completed/unify-period-analysis/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/review-checklist.md`](../../../projects/completed/unify-period-analysis/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/step-c-timeslot-lane-policy.md`](../../../projects/completed/unify-period-analysis/step-c-timeslot-lane-policy.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/unify-period-analysis/test-plan.md`](../../../projects/completed/unify-period-analysis/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/AI_CONTEXT.md`](../../../projects/completed/widget-context-boundary/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/breaking-changes.md`](../../../projects/completed/widget-context-boundary/breaking-changes.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/checklist.md`](../../../projects/completed/widget-context-boundary/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/DERIVED.md`](../../../projects/completed/widget-context-boundary/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/derived/acceptance-suite.md`](../../../projects/completed/widget-context-boundary/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/derived/inventory/00-example.md`](../../../projects/completed/widget-context-boundary/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/derived/inventory/README.md`](../../../projects/completed/widget-context-boundary/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/derived/pr-breakdown.md`](../../../projects/completed/widget-context-boundary/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/derived/README.md`](../../../projects/completed/widget-context-boundary/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/derived/review-checklist.md`](../../../projects/completed/widget-context-boundary/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/derived/test-plan.md`](../../../projects/completed/widget-context-boundary/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/HANDOFF.md`](../../../projects/completed/widget-context-boundary/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/legacy-retirement.md`](../../../projects/completed/widget-context-boundary/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/next-phase-plan.md`](../../../projects/completed/widget-context-boundary/next-phase-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/plan.md`](../../../projects/completed/widget-context-boundary/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/projectization.md`](../../../projects/completed/widget-context-boundary/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-context-boundary/SUMMARY.md`](../../../projects/completed/widget-context-boundary/SUMMARY.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/AI_CONTEXT.md`](../../../projects/completed/widget-registry-simplification/AI_CONTEXT.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/checklist.md`](../../../projects/completed/widget-registry-simplification/checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/DERIVED.md`](../../../projects/completed/widget-registry-simplification/DERIVED.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/derived/acceptance-suite.md`](../../../projects/completed/widget-registry-simplification/derived/acceptance-suite.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/derived/inventory/00-example.md`](../../../projects/completed/widget-registry-simplification/derived/inventory/00-example.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/derived/inventory/README.md`](../../../projects/completed/widget-registry-simplification/derived/inventory/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/derived/pr-breakdown.md`](../../../projects/completed/widget-registry-simplification/derived/pr-breakdown.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/derived/README.md`](../../../projects/completed/widget-registry-simplification/derived/README.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/derived/review-checklist.md`](../../../projects/completed/widget-registry-simplification/derived/review-checklist.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/derived/test-plan.md`](../../../projects/completed/widget-registry-simplification/derived/test-plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/HANDOFF.md`](../../../projects/completed/widget-registry-simplification/HANDOFF.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/legacy-retirement.md`](../../../projects/completed/widget-registry-simplification/legacy-retirement.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/plan.md`](../../../projects/completed/widget-registry-simplification/plan.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/projectization.md`](../../../projects/completed/widget-registry-simplification/projectization.md) | archive-doc | archive | unreviewed | markdown-inventory |
| [`projects/completed/widget-registry-simplification/SUMMARY.md`](../../../projects/completed/widget-registry-simplification/SUMMARY.md) | archive-doc | archive | unreviewed | markdown-inventory |

### design-system (14)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/02-design-system/docs/category-gradients.md`](../../02-design-system/docs/category-gradients.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/chart-semantic-colors.md`](../../02-design-system/docs/chart-semantic-colors.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/content-and-voice.md`](../../02-design-system/docs/content-and-voice.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/echarts-integration.md`](../../02-design-system/docs/echarts-integration.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/iconography.md`](../../02-design-system/docs/iconography.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/route-b-guide.md`](../../02-design-system/docs/route-b-guide.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/theme-object.md`](../../02-design-system/docs/theme-object.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/tokens.md`](../../02-design-system/docs/tokens.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/trend-helpers.md`](../../02-design-system/docs/trend-helpers.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/v2-to-v2.1-changes.md`](../../02-design-system/docs/v2-to-v2.1-changes.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/docs/visual-foundations.md`](../../02-design-system/docs/visual-foundations.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/README.md`](../../02-design-system/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/SKILL.md`](../../02-design-system/SKILL.md) | canonical-doc | declared | declared | doc-registry |
| [`references/02-design-system/ui_kits/app/README.md`](../../02-design-system/ui_kits/app/README.md) | unknown | observed-only | unreviewed | markdown-inventory |

### foundation (42)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/01-foundation/app-lifecycle-principles.md`](../../01-foundation/app-lifecycle-principles.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/architecture-rule-feasibility.md`](../../01-foundation/architecture-rule-feasibility.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/authoritative-calculation-definition.md`](../../01-foundation/authoritative-calculation-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/budget-definition.md`](../../01-foundation/budget-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/cache-responsibility.md`](../../01-foundation/cache-responsibility.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/calculation-canonicalization-map.md`](../../01-foundation/calculation-canonicalization-map.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/canonical-input-sets.md`](../../01-foundation/canonical-input-sets.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/canonical-value-ownership.md`](../../01-foundation/canonical-value-ownership.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/canonicalization-principles.md`](../../01-foundation/canonicalization-principles.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/critical-path-safety-map.md`](../../01-foundation/critical-path-safety-map.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/customer-definition.md`](../../01-foundation/customer-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/customer-gap-definition.md`](../../01-foundation/customer-gap-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/data-flow.md`](../../01-foundation/data-flow.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/data-pipeline-integrity.md`](../../01-foundation/data-pipeline-integrity.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/decisions/README.md`](../../01-foundation/decisions/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/01-foundation/design-principles.md`](../../01-foundation/design-principles.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/discount-definition.md`](../../01-foundation/discount-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/domain-ratio-primitives.md`](../../01-foundation/domain-ratio-primitives.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/dual-period-definition.md`](../../01-foundation/dual-period-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/engine-boundary-policy.md`](../../01-foundation/engine-boundary-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/engine-responsibility.md`](../../01-foundation/engine-responsibility.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/free-period-analysis-definition.md`](../../01-foundation/free-period-analysis-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/free-period-budget-kpi-contract.md`](../../01-foundation/free-period-budget-kpi-contract.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/gross-profit-definition.md`](../../01-foundation/gross-profit-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/kpi-definition.md`](../../01-foundation/kpi-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/modular-monolith-evolution.md`](../../01-foundation/modular-monolith-evolution.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/monthly-data-architecture.md`](../../01-foundation/monthly-data-architecture.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/observation-period-spec.md`](../../01-foundation/observation-period-spec.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/pi-value-definition.md`](../../01-foundation/pi-value-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/platformization-standard.md`](../../01-foundation/platformization-standard.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/purchase-cost-definition.md`](../../01-foundation/purchase-cost-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/responsibility-taxonomy-schema.md`](../../01-foundation/responsibility-taxonomy-schema.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/safe-performance-principles.md`](../../01-foundation/safe-performance-principles.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/sales-definition.md`](../../01-foundation/sales-definition.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/semantic-classification-policy.md`](../../01-foundation/semantic-classification-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/taxonomy-constitution.md`](../../01-foundation/taxonomy-constitution.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/taxonomy-interlock.md`](../../01-foundation/taxonomy-interlock.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/taxonomy-origin-journal.md`](../../01-foundation/taxonomy-origin-journal.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/temporal-scope-semantics.md`](../../01-foundation/temporal-scope-semantics.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/test-signal-integrity.md`](../../01-foundation/test-signal-integrity.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/test-taxonomy-schema.md`](../../01-foundation/test-taxonomy-schema.md) | canonical-doc | declared | declared | doc-registry |
| [`references/01-foundation/uiux-principles.md`](../../01-foundation/uiux-principles.md) | canonical-doc | declared | declared | doc-registry |

### generated-other (16)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/04-tracking/dashboards/boundary-health.generated.md`](../dashboards/boundary-health.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/dashboards/element-coverage.generated.md`](../dashboards/element-coverage.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/dashboards/migration-progress.generated.md`](../dashboards/migration-progress.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/dashboards/quality-dashboard.generated.md`](../dashboards/quality-dashboard.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-001/open-issues.generated.md`](../elements/charts/CHART-001/open-issues.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-001/quality-status.generated.md`](../elements/charts/CHART-001/quality-status.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-002/open-issues.generated.md`](../elements/charts/CHART-002/open-issues.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-002/quality-status.generated.md`](../elements/charts/CHART-002/quality-status.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-003/open-issues.generated.md`](../elements/charts/CHART-003/open-issues.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-003/quality-status.generated.md`](../elements/charts/CHART-003/quality-status.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-004/open-issues.generated.md`](../elements/charts/CHART-004/open-issues.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-004/quality-status.generated.md`](../elements/charts/CHART-004/quality-status.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-005/open-issues.generated.md`](../elements/charts/CHART-005/open-issues.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-005/quality-status.generated.md`](../elements/charts/CHART-005/quality-status.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/element-index.generated.md`](../elements/element-index.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/recent-changes.generated.md`](../recent-changes.generated.md) | generated-report | generated | declared | doc-registry |

### implementation (77)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/03-implementation/aag-articulation-map.md`](../../03-implementation/aag-articulation-map.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/aag-change-impact-template.md`](../../03-implementation/aag-change-impact-template.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/aag-engine-readiness-inventory.md`](../../03-implementation/aag-engine-readiness-inventory.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/aag-onboarding-path.md`](../../03-implementation/aag-onboarding-path.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/aag-phase4-6-plan.md`](../../03-implementation/aag-phase4-6-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/aag-physical-move-impact-matrix.md`](../../03-implementation/aag-physical-move-impact-matrix.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/aag-rule-inventory.md`](../../03-implementation/aag-rule-inventory.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/active-debt-refactoring-plan.md`](../../03-implementation/active-debt-refactoring-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/allowlist-management.md`](../../03-implementation/allowlist-management.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/analytic-kernel-migration-plan.md`](../../03-implementation/analytic-kernel-migration-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/api.md`](../../03-implementation/api.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/app-lifecycle-implementation.md`](../../03-implementation/app-lifecycle-implementation.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/ar-rule-binding-protocol.md`](../../03-implementation/ar-rule-binding-protocol.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/architecture-rule-system.md`](../../03-implementation/architecture-rule-system.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/authoritative-display-rules.md`](../../03-implementation/authoritative-display-rules.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/calculation-engine.md`](../../03-implementation/calculation-engine.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/canonicalization-checklist.md`](../../03-implementation/canonicalization-checklist.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/chart-data-flow-map.md`](../../03-implementation/chart-data-flow-map.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/chart-input-builder-pattern.md`](../../03-implementation/chart-input-builder-pattern.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/chart-rendering-three-stage-pattern.md`](../../03-implementation/chart-rendering-three-stage-pattern.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/cloudflare-worker-setup.md`](../../03-implementation/cloudflare-worker-setup.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/coding-conventions.md`](../../03-implementation/coding-conventions.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/compare-conventions.md`](../../03-implementation/compare-conventions.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/contract-definition-policy.md`](../../03-implementation/contract-definition-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/current-maintenance-policy.md`](../../03-implementation/current-maintenance-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/data-load-idempotency-handoff.md`](../../03-implementation/data-load-idempotency-handoff.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/data-load-idempotency-plan.md`](../../03-implementation/data-load-idempotency-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/data-model-layers.md`](../../03-implementation/data-model-layers.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/data-models.md`](../../03-implementation/data-models.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/detection-inventory-v2.md`](../../03-implementation/detection-inventory-v2.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/directory-registry-ownership-policy.md`](../../03-implementation/directory-registry-ownership-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/discovery-review-checklist.md`](../../03-implementation/discovery-review-checklist.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/duckdb-architecture.md`](../../03-implementation/duckdb-architecture.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/duckdb-data-loading-sequence.md`](../../03-implementation/duckdb-data-loading-sequence.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/duckdb-type-boundary-contract.md`](../../03-implementation/duckdb-type-boundary-contract.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/explanation-architecture.md`](../../03-implementation/explanation-architecture.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/extension-playbook.md`](../../03-implementation/extension-playbook.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/faq.md`](../../03-implementation/faq.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/file-import-guide.md`](../../03-implementation/file-import-guide.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/governance-final-placement-plan.md`](../../03-implementation/governance-final-placement-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/guard-consolidation-and-js-retirement.md`](../../03-implementation/guard-consolidation-and-js-retirement.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/guard-failure-playbook.md`](../../03-implementation/guard-failure-playbook.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/guard-test-map.md`](../../03-implementation/guard-test-map.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/integrity-domain-architecture.md`](../../03-implementation/integrity-domain-architecture.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/integrity-pair-inventory.md`](../../03-implementation/integrity-pair-inventory.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/invariant-catalog.md`](../../03-implementation/invariant-catalog.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/legacy-governance-retirement.md`](../../03-implementation/legacy-governance-retirement.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/metric-id-registry.md`](../../03-implementation/metric-id-registry.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/migration-tag-policy.md`](../../03-implementation/migration-tag-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/new-page-checklist.md`](../../03-implementation/new-page-checklist.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/operations.md`](../../03-implementation/operations.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/pr-review-checklist.md`](../../03-implementation/pr-review-checklist.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/promote-ceremony-pr-template.md`](../../03-implementation/promote-ceremony-pr-template.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/promote-ceremony-template.md`](../../03-implementation/promote-ceremony-template.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/purchase-cost-unification-plan.md`](../../03-implementation/purchase-cost-unification-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/read-path-duplicate-audit.md`](../../03-implementation/read-path-duplicate-audit.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/reposteward-command-surface.md`](../../03-implementation/reposteward-command-surface.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/responsibility-separation-catalog.md`](../../03-implementation/responsibility-separation-catalog.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/responsibility-taxonomy-operations.md`](../../03-implementation/responsibility-taxonomy-operations.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/responsibility-v1-to-v2-migration-map.md`](../../03-implementation/responsibility-v1-to-v2-migration-map.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/rollback-policy.md`](../../03-implementation/rollback-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/runtime-data-path.md`](../../03-implementation/runtime-data-path.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/safety-first-architecture-plan.md`](../../03-implementation/safety-first-architecture-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/security.md`](../../03-implementation/security.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/semantic-inventory-procedure.md`](../../03-implementation/semantic-inventory-procedure.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/taxonomy-review-window.md`](../../03-implementation/taxonomy-review-window.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/temporal-analysis-policy.md`](../../03-implementation/temporal-analysis-policy.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/test-signal-integrity-advisory.md`](../../03-implementation/test-signal-integrity-advisory.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/test-taxonomy-operations.md`](../../03-implementation/test-taxonomy-operations.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/test-tsig-to-v2-migration-map.md`](../../03-implementation/test-tsig-to-v2-migration-map.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/tier1-business-migration-plan.md`](../../03-implementation/tier1-business-migration-plan.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/ui-components.md`](../../03-implementation/ui-components.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/wasm-candidate-eligibility.md`](../../03-implementation/wasm-candidate-eligibility.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/wasm-dual-run-runbook.md`](../../03-implementation/wasm-dual-run-runbook.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/weather-architecture.md`](../../03-implementation/weather-architecture.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/widget-coordination-architecture.md`](../../03-implementation/widget-coordination-architecture.md) | canonical-doc | declared | declared | doc-registry |
| [`references/03-implementation/widget-readmodel-migration.md`](../../03-implementation/widget-readmodel-migration.md) | canonical-doc | declared | declared | doc-registry |

### project-templates (15)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`projects/_template/AI_CONTEXT.md`](../../../projects/_template/AI_CONTEXT.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/checklist.md`](../../../projects/_template/checklist.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/decision-audit.md`](../../../projects/_template/decision-audit.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/DERIVED.md`](../../../projects/_template/DERIVED.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/derived/acceptance-suite.md`](../../../projects/_template/derived/acceptance-suite.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/derived/inventory/00-example.md`](../../../projects/_template/derived/inventory/00-example.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/derived/inventory/README.md`](../../../projects/_template/derived/inventory/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/derived/pr-breakdown.md`](../../../projects/_template/derived/pr-breakdown.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/derived/README.md`](../../../projects/_template/derived/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/derived/review-checklist.md`](../../../projects/_template/derived/review-checklist.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/derived/test-plan.md`](../../../projects/_template/derived/test-plan.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/discovery-log.md`](../../../projects/_template/discovery-log.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/HANDOFF.md`](../../../projects/_template/HANDOFF.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/plan.md`](../../../projects/_template/plan.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`projects/_template/projectization.md`](../../../projects/_template/projectization.md) | unknown | observed-only | unreviewed | markdown-inventory |

### repository-entrypoints (4)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`CHANGELOG.md`](../../../CHANGELOG.md) | repo-entrypoint | observed-only | unreviewed | markdown-inventory |
| [`CLAUDE.md`](../../../CLAUDE.md) | repo-entrypoint | observed-only | unreviewed | markdown-inventory |
| [`CURRENT_PROJECT.md`](../../../CURRENT_PROJECT.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`README.md`](../../../README.md) | repo-entrypoint | observed-only | unreviewed | markdown-inventory |

### roles (16)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`roles/line/architecture/ROLE.md`](../../../roles/line/architecture/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/architecture/SKILL.md`](../../../roles/line/architecture/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/implementation/ROLE.md`](../../../roles/line/implementation/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/implementation/SKILL.md`](../../../roles/line/implementation/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/specialist/duckdb-specialist/ROLE.md`](../../../roles/line/specialist/duckdb-specialist/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/specialist/duckdb-specialist/SKILL.md`](../../../roles/line/specialist/duckdb-specialist/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/specialist/explanation-steward/ROLE.md`](../../../roles/line/specialist/explanation-steward/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/specialist/explanation-steward/SKILL.md`](../../../roles/line/specialist/explanation-steward/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/specialist/invariant-guardian/ROLE.md`](../../../roles/line/specialist/invariant-guardian/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/line/specialist/invariant-guardian/SKILL.md`](../../../roles/line/specialist/invariant-guardian/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/staff/documentation-steward/ROLE.md`](../../../roles/staff/documentation-steward/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/staff/documentation-steward/SKILL.md`](../../../roles/staff/documentation-steward/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/staff/pm-business/ROLE.md`](../../../roles/staff/pm-business/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/staff/pm-business/SKILL.md`](../../../roles/staff/pm-business/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/staff/review-gate/ROLE.md`](../../../roles/staff/review-gate/ROLE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`roles/staff/review-gate/SKILL.md`](../../../roles/staff/review-gate/SKILL.md) | unknown | observed-only | unreviewed | markdown-inventory |

### tools (1)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`tools/architecture-health/src/detectors/README.md`](../../../tools/architecture-health/src/detectors/README.md) | unknown | observed-only | unreviewed | markdown-inventory |

### tracking (113)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/04-tracking/dashboards/README.md`](../dashboards/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/calculations/CALC-001.md`](../elements/calculations/CALC-001.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-002.md`](../elements/calculations/CALC-002.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-003.md`](../elements/calculations/CALC-003.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-004.md`](../elements/calculations/CALC-004.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-005.md`](../elements/calculations/CALC-005.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-006.md`](../elements/calculations/CALC-006.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-007.md`](../elements/calculations/CALC-007.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-008.md`](../elements/calculations/CALC-008.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-009.md`](../elements/calculations/CALC-009.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-010.md`](../elements/calculations/CALC-010.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-011.md`](../elements/calculations/CALC-011.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-012.md`](../elements/calculations/CALC-012.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-013.md`](../elements/calculations/CALC-013.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-014.md`](../elements/calculations/CALC-014.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-015.md`](../elements/calculations/CALC-015.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-016.md`](../elements/calculations/CALC-016.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-017.md`](../elements/calculations/CALC-017.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-018.md`](../elements/calculations/CALC-018.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-019.md`](../elements/calculations/CALC-019.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-020.md`](../elements/calculations/CALC-020.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-021.md`](../elements/calculations/CALC-021.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-022.md`](../elements/calculations/CALC-022.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-023.md`](../elements/calculations/CALC-023.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/CALC-024.md`](../elements/calculations/CALC-024.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/calculations/README.md`](../elements/calculations/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/charts/CHART-001/implementation-ledger.md`](../elements/charts/CHART-001/implementation-ledger.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-001/README.md`](../elements/charts/CHART-001/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/charts/CHART-002/implementation-ledger.md`](../elements/charts/CHART-002/implementation-ledger.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-002/README.md`](../elements/charts/CHART-002/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/charts/CHART-003/implementation-ledger.md`](../elements/charts/CHART-003/implementation-ledger.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-003/README.md`](../elements/charts/CHART-003/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/charts/CHART-004/implementation-ledger.md`](../elements/charts/CHART-004/implementation-ledger.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-004/README.md`](../elements/charts/CHART-004/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/charts/CHART-005/implementation-ledger.md`](../elements/charts/CHART-005/implementation-ledger.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/charts/CHART-005/README.md`](../elements/charts/CHART-005/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/charts/README.md`](../elements/charts/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/element-taxonomy.md`](../elements/element-taxonomy.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/elements/read-models/README.md`](../elements/read-models/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-001.md`](../elements/read-models/RM-001.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-002.md`](../elements/read-models/RM-002.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-003.md`](../elements/read-models/RM-003.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-004.md`](../elements/read-models/RM-004.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-005.md`](../elements/read-models/RM-005.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-006.md`](../elements/read-models/RM-006.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-007.md`](../elements/read-models/RM-007.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-008.md`](../elements/read-models/RM-008.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-009.md`](../elements/read-models/RM-009.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/read-models/RM-010.md`](../elements/read-models/RM-010.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/README.md`](../elements/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/ui-components/README.md`](../elements/ui-components/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/ui-components/UIC-001.md`](../elements/ui-components/UIC-001.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/ui-components/UIC-002.md`](../elements/ui-components/UIC-002.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/ui-components/UIC-003.md`](../elements/ui-components/UIC-003.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/ui-components/UIC-004.md`](../elements/ui-components/UIC-004.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/ui-components/UIC-005.md`](../elements/ui-components/UIC-005.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/README.md`](../elements/widgets/README.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-001.md`](../elements/widgets/WID-001.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-002.md`](../elements/widgets/WID-002.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-003.md`](../elements/widgets/WID-003.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-004.md`](../elements/widgets/WID-004.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-005.md`](../elements/widgets/WID-005.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-006.md`](../elements/widgets/WID-006.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-007.md`](../elements/widgets/WID-007.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-008.md`](../elements/widgets/WID-008.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-009.md`](../elements/widgets/WID-009.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-010.md`](../elements/widgets/WID-010.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-011.md`](../elements/widgets/WID-011.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-012.md`](../elements/widgets/WID-012.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-013.md`](../elements/widgets/WID-013.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-014.md`](../elements/widgets/WID-014.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-015.md`](../elements/widgets/WID-015.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-016.md`](../elements/widgets/WID-016.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-017.md`](../elements/widgets/WID-017.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-018.md`](../elements/widgets/WID-018.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-019.md`](../elements/widgets/WID-019.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-020.md`](../elements/widgets/WID-020.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-021.md`](../elements/widgets/WID-021.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-022.md`](../elements/widgets/WID-022.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-023.md`](../elements/widgets/WID-023.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-024.md`](../elements/widgets/WID-024.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-025.md`](../elements/widgets/WID-025.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-026.md`](../elements/widgets/WID-026.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-027.md`](../elements/widgets/WID-027.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-028.md`](../elements/widgets/WID-028.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-029.md`](../elements/widgets/WID-029.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-030.md`](../elements/widgets/WID-030.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-031.md`](../elements/widgets/WID-031.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-032.md`](../elements/widgets/WID-032.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-033.md`](../elements/widgets/WID-033.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-034.md`](../elements/widgets/WID-034.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-035.md`](../elements/widgets/WID-035.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-036.md`](../elements/widgets/WID-036.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-037.md`](../elements/widgets/WID-037.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-038.md`](../elements/widgets/WID-038.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-039.md`](../elements/widgets/WID-039.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-040.md`](../elements/widgets/WID-040.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-041.md`](../elements/widgets/WID-041.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-042.md`](../elements/widgets/WID-042.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-043.md`](../elements/widgets/WID-043.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-044.md`](../elements/widgets/WID-044.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/elements/widgets/WID-045.md`](../elements/widgets/WID-045.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/engine-maturity-matrix.md`](../engine-maturity-matrix.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/engine-promotion-matrix.md`](../engine-promotion-matrix.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/features-migration-status.md`](../features-migration-status.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/frozen-list.md`](../frozen-list.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/generated/architecture-state-snapshot.md`](architecture-state-snapshot.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/observation-evaluation-guide.md`](../observation-evaluation-guide.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/open-issues.md`](../open-issues.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/project-structure.md`](../project-structure.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/promotion-criteria.md`](../promotion-criteria.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/04-tracking/taxonomy-review-journal.md`](../taxonomy-review-journal.md) | canonical-doc | declared | declared | doc-registry |
| [`references/04-tracking/technical-debt-roadmap.md`](../technical-debt-roadmap.md) | canonical-doc | declared | declared | doc-registry |

### tracking-generated (14)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`references/04-tracking/generated/aag-size-statistics.generated.md`](aag-size-statistics.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/ai-doc-instructions.generated.md`](ai-doc-instructions.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/architecture-debt-recovery-remediation.generated.md`](architecture-debt-recovery-remediation.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/architecture-health-certificate.generated.md`](architecture-health-certificate.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/architecture-health.generated.md`](architecture-health.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/architecture-state-snapshot.generated.md`](architecture-state-snapshot.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/generated/artifact-coverage.generated.md`](artifact-coverage.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/doc-postwrite-findings.generated.md`](doc-postwrite-findings.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/document-failure-taxonomy.generated.md`](document-failure-taxonomy.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/document-universe.generated.md`](document-universe.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/project-health.generated.md`](project-health.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/query-access-audit.generated.md`](query-access-audit.generated.md) | generated-report | generated | unreviewed | markdown-inventory |
| [`references/04-tracking/generated/required-docs-matrix.generated.md`](required-docs-matrix.generated.md) | generated-report | generated | declared | doc-registry |
| [`references/04-tracking/generated/test-signal-baseline.generated.md`](test-signal-baseline.generated.md) | generated-report | generated | unreviewed | markdown-inventory |

### tree-readers (2)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`projects/README.md`](../../../projects/README.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/README.md`](../../README.md) | unknown | observed-only | unreviewed | markdown-inventory |

### unmanaged (5)

| Path | Kind | Status | Contract | Source |
|---|---|---|---|---|
| [`.claude/plans/archive/2026-04-09-session-report.md`](../../../.claude/plans/archive/2026-04-09-session-report.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`.github/PULL_REQUEST_TEMPLATE.md`](../../../.github/PULL_REQUEST_TEMPLATE.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`CONTRIBUTING.md`](../../../CONTRIBUTING.md) | unknown | observed-only | unreviewed | markdown-inventory |
| [`references/AAG_CRITICAL_RULES.md`](../../AAG_CRITICAL_RULES.md) | canonical-doc | declared | declared | doc-registry |
| [`references/AAG_OVERVIEW.md`](../../AAG_OVERVIEW.md) | canonical-doc | declared | declared | doc-registry |

