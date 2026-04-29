# breaking-changes — integrity-framework-evolution

> 役割: 本 project が破壊する公開契約 / 型 / API と移行方針を列挙。
>
> 規約: `references/03-guides/projectization-policy.md` §5。

## 1. 破壊対象の概要

本 project は **Phase Q (Meta-AAG layer 新設) + Phase R (AAG framework structural change)** を行うため、以下の領域で互換性のない schema 変更が発生する。

Phase Q 自体は principle 上 additive (新 layer 追加) だが、PR template 必須化 (Q.M-1) や全 rule への tier 必須化 (Q.O-2) は **既存 PR / 既存 rule に schema 変更を要求** するため、breaking change として扱う。

詳細:

| 領域 | 現状 | Phase Q/R 後 | 移行 path |
|---|---|---|---|
| **(Phase Q.O-2)** `BaseRule` schema | (現状) `tier` field なし | (Phase Q.O-2 後) 全 rule に `tier: 0 \| 1 \| 2 \| 3` 必須化 | architectureRuleGuard で tier 必須化、既存 162 rule に bulk add |
| **(Phase Q.M-2)** AAG invariant 適用 | (現状) 「気をつける」 prose | (Phase Q.M-2 後) 9 invariant の機械検証 | meta-guard を追加、既存 AAG file に invariant tag bulk add |
| **(Phase Q.M-1)** AAG 変更 PR | (現状) PR description は free-form | (Phase Q.M-1 後) `AAG_CHANGE_IMPACT` section 必須化 | PR template 拡張 + projectizationPolicyGuard 拡張 |
| `app-domain/integrity/types.ts` の type 定義 | `Registry / DriftReport / SyncDirection / EnforcementSeverity` (4 type) | + `CanonicalContract` / `DecisionRecord` / `LifecycleState` / `ZoneTag` | additive、既存 import は壊れない |
| `adoption-candidates.json` の archive schema | `existingPairs[]` / `horizontalCandidates[]` / `deferred[]` / `rejected[]` (各独自 shape) | 全 archive が `DecisionRecord` schema 準拠 (when / who / why / evidence / reversal / state) | Phase R-② で 1 PR 一括移行 (既存 entry を新 schema に migrate) |
| `COVERAGE_MAP` (`integrityDomainCoverageGuard.test.ts`) | `pairId` / `displayName` / `guardFiles` / `maxLines` / `status` / `deferReason` | `pairId` / `displayName` / `contract: CanonicalContract` / `lifecycleState: LifecycleState` / `zoneTags: ZoneTag[]` | Phase R-① で 1 PR 一括移行 |
| `integrity-collector.ts` の regex parse | `pairId` / `status` / `guardFiles` の string 抽出 | contract schema の TypedReader (構造化 parse) | Phase R-① で reimplementation、parser fragility 解消 |
| `references/01-principles/canonicalization-principles.md §P8/§P9` | prose のみ | 各 selection rule / 撤退規律に zone tag (`zone: 'mechanism' \| 'judgement' \| 'hybrid'`) を必須化 | Phase R-③ で 1 PR 一括追記 (内容変更なし、tag 追加のみ) |

## 2. 移行方針

### 2.1 additive な変更 (壊さない)

- type 定義の追加 (Phase R-①)
- archive schema の field 追加 (既存 field は保持)
- 3-zone tag の追加 (既存 prose は保持)

### 2.2 1 PR 一括移行 (壊して直す)

- `adoption-candidates.json` の既存 entry を `DecisionRecord` schema に migrate (Phase R-② 着手 PR)
- `COVERAGE_MAP` の各 entry を新 shape に migrate (Phase R-① 着手 PR)
- `integrity-collector.ts` を contract-aware parser に書き直し (Phase R-① 着手 PR)

### 2.3 後方互換性

- 前駆 project (`canonicalization-domain-consolidation`) が landed した時点の状態は **freeze**。本 project の Phase R は前駆 project archive 後の state を起点に変更
- 並行 active project (`pure-calculation-reorg`) は本 project の影響を受けない (別 domain)
- taxonomy / contentSpec domain は Phase R-② で同 schema を採用するが、移行は domain ごとに独立 PR

## 3. 影響を受ける外部 consumer

| consumer | 影響 |
|---|---|
| `tools/architecture-health/src/collectors/integrity-collector.ts` | Phase R-① で再実装、KPI 値は不変 |
| `app/src/test/guards/integrityDomain*Guard.test.ts` | Phase R-⑥ dogfooding refactor で integrity primitive 利用に書き直し |
| `references/03-guides/canonicalization-checklist.md` | Phase R-③ で 3-zone 表記に書き直し |
| `references/03-guides/integrity-domain-architecture.md` | Phase R-① で contract pattern 反映、Phase R-④ で APP_DOMAIN_INDEX template 適用 |
| 他 domain (taxonomy / contentSpec) の origin journal / archive | Phase R-② で同 schema 採用 (independent migration PR) |

## 4. rollback 戦略

各 Phase R reform は **独立 PR** で landing するため、後の reform で問題が発覚した場合は:

- additive (type 追加 / tag 追加) → revert で元に戻る (low risk)
- 1 PR 一括移行 (archive schema / COVERAGE_MAP / collector) → git revert で元に戻る (medium risk、移行直後の数日は CI で trend 観察)
- Phase R-③〜R-⑥ → 個別 revert 可能、依存性は R-① / R-② のみ

最も risky な R-① / R-② が先行 landing するので、後の reform で発覚した問題の rollback は限定的。

## 5. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版起草。Phase 0 bootstrap で landing。Phase R 各 reform 着手時に該当 section を更新する |
