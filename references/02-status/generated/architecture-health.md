# Architecture Health Report

> Generated: 2026-04-30T14:54:41.183Z
> Schema: v1.0.0
> 正本: `references/02-status/generated/architecture-health.json`

## Summary

| 指標 | 値 |
|---|---|
| Total KPIs | 60 |
| OK | 60 |
| WARN | 0 |
| FAIL | 0 |
| Hard Gate | PASS |

## 許可リスト

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| allowlist.total | 許可リスト総エントリ数 | 14 / 20 | OK |
| allowlist.frozen.nonZero | Frozen リスト非ゼロ | 0 / 0 | OK |
| allowlist.active.count | Active リスト数 | 6 / 10 | OK |
| temporal.allowlist.activeDebt.count | active-debt 例外数 | 2 / 12 | OK |
| temporal.allowlist.activeDebt.withCreatedAt | active-debt で createdAt 設定済み | 2 / 1 | OK |
| efficacy.allowlist.renewalTotal | renewalCount 合計 | 0 / 10 | OK |

## 後方互換負債

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| compat.bridge.count | Active Bridge 数 | 0 / 3 | OK |
| compat.reexport.count | 後方互換 re-export 数 | 0 / 3 | OK |

## 複雑性

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| complexity.hotspot.count | 複雑性ホットスポット数 | 10 / 10 | OK |
| complexity.nearLimit.count | 上限間近ファイル数 | 1 / 5 | OK |
| complexity.vm.count | ViewModel ファイル数 | 25 / 30 | OK |

## 層境界

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| boundary.presentationToInfra | Presentation→Infrastructure 違反 | 0 / 0 | OK |
| boundary.infraToApplication | Infrastructure→Application 違反 | 0 / 0 | OK |

## ガードテスト

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| guard.files.count | ガードテストファイル数 | 120 / 30 | OK |
| guard.reviewOnlyTags.count | レビュー専用タグ数 | 0 / 5 | OK |
| guard.rules.total | 総 Architecture Rule 数 | 166 | OK |
| guard.rules.fixNow.now | fixNow=now ルール数（即修正） | 88 | OK |
| guard.rules.fixNow.debt | fixNow=debt ルール数（構造負債） | 57 | OK |
| guard.rules.fixNow.review | fixNow=review ルール数（観測） | 21 | OK |
| temporal.rules.reviewPolicy.count | reviewPolicy 設定済みルール数 | 166 / 92 | OK |
| temporal.rules.sunsetCondition.count | sunsetCondition 設定済みルール数 | 35 / 9 | OK |
| temporal.rules.reviewOverdue.count | review overdue ルール数 | 0 / 0 | OK |
| temporal.rules.heuristicGate.count | heuristic + gate ルール数 | 0 / 32 | OK |
| efficacy.rules.withProtectedHarm.count | protectedHarm 設定済みルール数 | 103 | OK |
| efficacy.rules.highNoise.count | 高例外圧ルール数（≥10 件） | 0 / 3 | OK |
| taxonomy.responsibility.unknownVocabulary | taxonomy 責務軸: unknown vocabulary 使用 file 数 | 0 | OK |
| taxonomy.test.unknownVocabulary | taxonomy テスト軸: unknown vocabulary 使用 test 数 | 1 | OK |
| taxonomy.vocabulary.responsibilityCount | taxonomy 責務軸: vocabulary 数 (Cognitive Load Ceiling 15 cap) | 10 | OK |
| taxonomy.vocabulary.testCount | taxonomy テスト軸: vocabulary 数 (Cognitive Load Ceiling 15 cap) | 15 | OK |
| integrity.violations.total | Integrity domain coverage 違反数 (Hard Gate) | 0 / 0 | OK |
| integrity.driftBudget | Integrity drift budget (deferred pair 数) | 1 / 2 | OK |
| integrity.expiredExceptions | Integrity 関連 file の @expiresAt 過去日 markers (Hard Gate) | 0 / 0 | OK |
| integrity.consolidationProgress | Integrity consolidation progress (migrated / total) | 92.3 / 90 | OK |
| contentGraph.nodes.count | Content Graph node 数 (= spec 総数) | 89 / 89 | OK |
| contentGraph.edges.count | Content Graph edge 数 (spec 間 reference) | 47 / 0 | OK |
| contentGraph.orphans.count | Content Graph orphan 数 (in / out edge ゼロ spec) | 47 / 100 | OK |

## ドキュメント整合

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| docs.obsoleteTerms.count | 廃止用語残存数 | 0 / 0 | OK |
| docs.generatedSections.stale | Generated section 未更新 | 0 / 0 | OK |
| docs.obligation.violations | Doc 更新義務違反数 | 0 / 0 | OK |
| docs.obligation.requiredReads.declaredCount | Required Reads マップ宣言数 | 9 | OK |
| docs.obligation.requiredReads.brokenLinks | Required Reads マップ broken link 数 | 0 / 0 | OK |
| project.checklist.activeCount | active project 数（archive 未実施を含む） | 9 / 20 | OK |
| project.checklist.archivedCount | archived project 数（projects/completed/ 配下） | 29 / 100 | OK |
| project.checklist.completedNotArchivedCount | checklist 完了済みだが archive 未実施の project 数 | 0 / 0 | OK |
| project.checklist.inProgressCount | in_progress な project 数（open required checkbox あり） | 8 / 20 | OK |
| project.checklist.emptyCount | checkbox 空の project 数（placeholder / 立ち上げ直後） | 0 / 10 | OK |
| project.checklist.totalCheckboxes | 全 project の required checkbox 総数 | 1184 | OK |
| project.checklist.checkedCheckboxes | 全 project の checked checkbox 総数 | 903 | OK |
| project.checklist.subprojectCount | サブ project 数（parent フィールドあり） | 8 | OK |
| docs.testContract.declared | CLAUDE.md テスト契約宣言数 | 6 | OK |
| docs.testContract.violations | CLAUDE.md テスト契約違反数 | 0 | OK |
| contentSpec.total | Content Spec 総数 (全 kind) | 89 | OK |
| contentSpec.missingOwner | Content Spec: owner 未設定数 | 0 | OK |
| contentSpec.stale | Content Spec: lastReviewedAt cadence 超過数 | 0 | OK |
| contentSpec.lifecycleViolation | Content Spec: lifecycle 必須 field 違反数 | 0 | OK |
| contentSpec.evidenceUncovered | Content Spec: chart/UIC visual evidence 未整備数 | 6 | OK |

## バンドル性能

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| perf.bundle.totalJsKb | JS バンドル合計サイズ | 6602 / 7000 | OK |
| perf.bundle.mainJsKb | メインバンドルサイズ | 2386 / 2500 | OK |
| perf.bundle.vendorEchartsKb | ECharts バンドルサイズ | 919 / 1000 | OK |
| perf.bundle.cssKb | CSS 合計サイズ | 0 | OK |

## Doc Links

<details>
<summary>KPI → ドキュメント対応表</summary>

| KPI | Kind | Path |
|---|---|---|
| allowlist.total | source | references/02-status/generated/architecture-state-snapshot.json #totalAllowlistEntries |
| allowlist.total | definition | references/03-guides/allowlist-management.md |
| allowlist.total | roadmap | references/02-status/technical-debt-roadmap.md |
| allowlist.frozen.nonZero | source | references/02-status/generated/architecture-state-snapshot.json #frozenLists |
| allowlist.frozen.nonZero | guard | app/src/test/guards/layerBoundaryGuard.test.ts |
| allowlist.active.count | source | references/02-status/generated/architecture-state-snapshot.json #activeLists |
| compat.bridge.count | definition | references/02-status/technical-debt-roadmap.md #後方互換負債 |
| compat.bridge.count | source | references/02-status/generated/architecture-state-snapshot.json #activeBridges |
| compat.bridge.count | roadmap | references/02-status/open-issues.md |
| compat.reexport.count | source | references/02-status/generated/architecture-state-snapshot.json #compatReexportCount |
| complexity.hotspot.count | source | references/02-status/generated/architecture-state-snapshot.json #complexityHotspots |
| complexity.hotspot.count | roadmap | references/02-status/open-issues.md #R-4 |
| complexity.nearLimit.count | source | references/02-status/generated/architecture-state-snapshot.json #nearLimitFiles |
| complexity.vm.count | source | references/02-status/generated/architecture-state-snapshot.json #vmFileCount |
| boundary.presentationToInfra | guard | app/src/test/guards/layerBoundaryGuard.test.ts |
| boundary.presentationToInfra | definition | references/01-principles/design-principles.md #A1 |
| boundary.infraToApplication | guard | app/src/test/guards/layerBoundaryGuard.test.ts |
| boundary.infraToApplication | definition | references/01-principles/design-principles.md #A1 |
| guard.files.count | definition | CLAUDE.md #ガードテスト |
| guard.files.count | guard | app/src/test/guards/ |
| guard.reviewOnlyTags.count | source | app/src/test/guardTagRegistry.ts #REVIEW_ONLY_TAGS |
| guard.rules.total | definition | references/03-guides/architecture-rule-system.md |
| docs.obsoleteTerms.count | source | docs/contracts/principles.json #obsoleteTerms |
| docs.obsoleteTerms.count | guard | app/src/test/documentConsistency.test.ts |
| docs.generatedSections.stale | guard | app/src/test/documentConsistency.test.ts |
| perf.bundle.totalJsKb | source | app/dist/assets/ #*.js |
| perf.bundle.mainJsKb | source | app/dist/assets/ #index-*.js |
| perf.bundle.vendorEchartsKb | source | app/dist/assets/ #vendor-echarts-*.js |
| docs.obligation.violations | definition | tools/architecture-health/src/collectors/obligation-collector.ts |
| docs.obligation.requiredReads.declaredCount | definition | tools/architecture-health/src/collectors/obligation-collector.ts #PATH_TO_REQUIRED_READS |
| docs.obligation.requiredReads.brokenLinks | definition | tools/architecture-health/src/collectors/obligation-collector.ts #PATH_TO_REQUIRED_READS |
| temporal.rules.reviewPolicy.count | definition | references/03-guides/architecture-rule-system.md |
| temporal.rules.sunsetCondition.count | definition | references/01-principles/architecture-rule-feasibility.md |
| efficacy.rules.withProtectedHarm.count | definition | references/01-principles/architecture-rule-feasibility.md |
| project.checklist.activeCount | definition | references/03-guides/project-checklist-governance.md |
| project.checklist.archivedCount | definition | references/03-guides/project-checklist-governance.md |
| project.checklist.completedNotArchivedCount | definition | references/03-guides/project-checklist-governance.md |
| project.checklist.inProgressCount | definition | references/03-guides/project-checklist-governance.md |
| project.checklist.emptyCount | definition | references/03-guides/project-checklist-governance.md |
| project.checklist.totalCheckboxes | definition | references/03-guides/project-checklist-governance.md |
| project.checklist.checkedCheckboxes | definition | references/03-guides/project-checklist-governance.md |
| project.checklist.subprojectCount | definition | references/03-guides/project-checklist-governance.md |
| docs.testContract.declared | definition | docs/contracts/test-contract.json |
| docs.testContract.violations | definition | docs/contracts/test-contract.json |
| taxonomy.responsibility.unknownVocabulary | definition | projects/taxonomy-v2/plan.md |
| taxonomy.responsibility.unknownVocabulary | definition | references/01-principles/responsibility-taxonomy-schema.md |
| taxonomy.test.unknownVocabulary | definition | projects/taxonomy-v2/plan.md |
| taxonomy.test.unknownVocabulary | definition | references/01-principles/test-taxonomy-schema.md |
| taxonomy.vocabulary.responsibilityCount | definition | projects/taxonomy-v2/plan.md |
| taxonomy.vocabulary.testCount | definition | projects/taxonomy-v2/plan.md |
| contentSpec.total | definition | references/05-contents/README.md |
| contentSpec.missingOwner | definition | app-domain/gross-profit/rule-catalog/base-rules.ts #AR-CONTENT-SPEC-OWNER |
| contentSpec.stale | definition | app-domain/gross-profit/rule-catalog/base-rules.ts #AR-CONTENT-SPEC-FRESHNESS |
| contentSpec.lifecycleViolation | definition | app-domain/gross-profit/rule-catalog/base-rules.ts #AR-CONTENT-SPEC-LIFECYCLE-FIELDS |
| contentSpec.lifecycleViolation | definition | references/03-guides/promote-ceremony-pr-template.md |
| contentSpec.evidenceUncovered | definition | app-domain/gross-profit/rule-catalog/base-rules.ts #AR-CONTENT-SPEC-VISUAL-EVIDENCE |
| integrity.violations.total | definition | references/03-guides/integrity-domain-architecture.md #8 |
| integrity.violations.total | definition | references/01-principles/canonicalization-principles.md #P9 |
| integrity.violations.total | guard | app/src/test/guards/integrityDomainCoverageGuard.test.ts |
| integrity.driftBudget | definition | references/03-guides/integrity-domain-architecture.md #8 |
| integrity.driftBudget | guard | app/src/test/guards/integrityDomainCoverageGuard.test.ts |
| integrity.expiredExceptions | definition | references/01-principles/canonicalization-principles.md #P9 |
| integrity.expiredExceptions | guard | app/src/test/guards/integrityDomainCoverageGuard.test.ts |
| integrity.consolidationProgress | definition | references/03-guides/integrity-domain-architecture.md #8 |
| integrity.consolidationProgress | roadmap | projects/completed/canonicalization-domain-consolidation/checklist.md |
| contentGraph.nodes.count | definition | references/02-status/generated/content-graph.json |
| contentGraph.edges.count | definition | references/02-status/generated/content-graph.json |
| contentGraph.orphans.count | definition | references/02-status/generated/content-graph.json |

</details>
