# Architecture Health Report

> Generated: 2026-04-04T08:03:52.719Z
> Schema: v1.0.0
> 正本: `references/02-status/generated/architecture-health.json`

## Summary

| 指標 | 値 |
|---|---|
| Total KPIs | 19 |
| OK | 18 |
| WARN | 1 |
| FAIL | 0 |
| Hard Gate | PASS |

## 許可リスト

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| allowlist.total | 許可リスト総エントリ数 | 15 / 20 | OK |
| allowlist.frozen.nonZero | Frozen リスト非ゼロ | 0 / 0 | OK |
| allowlist.active.count | Active リスト数 | 7 / 10 | OK |

## 後方互換負債

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| compat.bridge.count | Active Bridge 数 | 5 / 3 | WARN |
| compat.reexport.count | 後方互換 re-export 数 | 2 / 3 | OK |

## 複雑性

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| complexity.hotspot.count | 複雑性ホットスポット数 | 10 / 10 | OK |
| complexity.nearLimit.count | 上限間近ファイル数 | 2 / 5 | OK |
| complexity.vm.count | ViewModel ファイル数 | 27 / 30 | OK |

## 層境界

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| boundary.presentationToInfra | Presentation→Infrastructure 違反 | 0 / 0 | OK |
| boundary.infraToApplication | Infrastructure→Application 違反 | 0 / 0 | OK |

## ガードテスト

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| guard.files.count | ガードテストファイル数 | 31 / 30 | OK |
| guard.reviewOnlyTags.count | レビュー専用タグ数 | 0 / 5 | OK |

## ドキュメント整合

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| docs.obsoleteTerms.count | 廃止用語残存数 | 0 / 0 | OK |
| docs.generatedSections.stale | Generated section 未更新 | 0 / 0 | OK |
| docs.obligation.violations | Doc 更新義務違反数 | 0 / 0 | OK |

## バンドル性能

| ID | 指標 | 値 | 状態 |
|---|---|---|---|
| perf.bundle.totalJsKb | JS バンドル合計サイズ | 6443 / 7000 | OK |
| perf.bundle.mainJsKb | メインバンドルサイズ | 2214 / 2500 | OK |
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
| docs.obsoleteTerms.count | source | docs/contracts/principles.json #obsoleteTerms |
| docs.obsoleteTerms.count | guard | app/src/test/documentConsistency.test.ts |
| docs.generatedSections.stale | guard | app/src/test/documentConsistency.test.ts |
| perf.bundle.totalJsKb | source | app/dist/assets/ #*.js |
| perf.bundle.mainJsKb | source | app/dist/assets/ #index-*.js |
| perf.bundle.vendorEchartsKb | source | app/dist/assets/ #vendor-echarts-*.js |
| docs.obligation.violations | definition | tools/architecture-health/src/collectors/obligation-collector.ts |

</details>
