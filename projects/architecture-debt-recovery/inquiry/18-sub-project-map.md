# inquiry/18 — sub-project map + 依存グラフ + 立ち上げ順序

> 役割: Phase 4 inquiry 成果物 #4（最終）。inquiry/15 の 18 改修 item / inquiry/16 の 7 破壊的変更 / inquiry/17 の 15 legacy item を、**4 sub-project** に束ねて Phase 6 立ち上げ順序を確定する。
>
> plan.md §3 Phase 4 完了条件:
> - 全 sub-project に 4 ステップ pattern が記載
> - 全 sub-project にレガシー撤退が紐付いている
> - 全破壊的変更に rollback 手順が記載
> - **sub-project 依存グラフが閉路を含まない**
> - pm-business + architecture ロール合意
> - 人間承認: 破壊的変更 list と sub-project 立ち上げ順序
>
> 本ファイルは immutable。Phase 5 以降で追加情報が判明しても書き換えず、`18a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `882e285`（inquiry/17 push 直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/15`（18 ADR）、`inquiry/16`（7 BC）、`inquiry/17`（15 LEG） |

## sub-project 設計原則（本 project 固有）

### 原則 1. 1 sub-project = 1 lane

inquiry/15 の Lane A-D を sub-project 4 本に対応させる。**Lane 横断 sub-project は作らない**。各 sub-project は独立に 4 ステップ pattern を完遂できる shape。

### 原則 2. parent: architecture-debt-recovery 必須

全 sub-project の `config/project.json` に `parent: "architecture-debt-recovery"` を必ず記入（plan.md §8 禁止事項 #15）。

### 原則 3. completion 条件は本 project で確定

各 sub-project の completion 条件は、`inquiry/17 §再発防止規約 5` の 4 条件を全て満たすこと:
1. 4 step pattern 完遂（新実装 / consumer 移行 / 旧実装削除 / guard）
2. 対応 legacy item の sunsetCondition 達成
3. 対応 legacy item の consumerMigrationStatus: migrated
4. 対応 guard baseline=0 到達

### 原則 4. 依存閉路の機械的検証

sub-project 間依存は有向グラフで表現。DAG（閉路なし）であることを本 inquiry で明示的に検証する。

---

## 4 sub-project 定義

### SP-A: widget-context-boundary

```yaml
projectId: widget-context-boundary
parent: architecture-debt-recovery
lane: A
status: planned
scope:
  - UnifiedWidgetContext の page-local optional 剥離
  - Dashboard 固有 optional を DashboardWidgetContext に required 集約
  - WidgetDef 同名 2 型を DashboardWidgetDef / UnifiedWidgetDef に分離
  - StoreResult / PrevYearData の discriminated union 化
adrItems: [ADR-A-001, ADR-A-002, ADR-A-003, ADR-A-004]
breakingChanges: [BC-1, BC-2, BC-3, BC-4]
legacyItems: [LEG-001, LEG-002, LEG-003, LEG-004, LEG-005, LEG-006, LEG-007, LEG-008]
guards:
  - unifiedWidgetContextNoPageLocalOptionalGuard
  - unifiedWidgetContextNoDashboardSpecificGuard
  - sameInterfaceNameGuard
  - coreRequiredFieldNullCheckGuard
successCriteria:
  step1: 4 guard を baseline 付きで追加
  step2: 新型 3 本（DashboardWidgetContext / 3 page-specific ctx）+ discriminated union 2 型を実装
  step3: 全 45 widget registry + readModel / hook consumer が新型に移行
  step4: 8 legacy item の sunsetCondition 達成、全 guard baseline=0
dependsOn: []
blocks: [SP-B, SP-D]
estimatedPRCount: 16 (4 ADR × 4 step)
risks:
  - 45 widget 全件に影響するため migration 工数大
  - discriminated union 化で consumer 側の type narrowing が広範
mitigations:
  - step ごとに PR 分離
  - 旧 shape alias を一時保持して段階移行
```

### SP-B: widget-registry-simplification

```yaml
projectId: widget-registry-simplification
parent: architecture-debt-recovery
lane: B
status: planned
scope:
  - 二重 null check 10 widget 解消
  - full ctx passthrough 12 widget を明示 props 化
  - IIFE 3 件を readModel selector に抽出
  - registry 行 inline logic 5 箇所解消
adrItems: [ADR-B-001, ADR-B-002, ADR-B-003, ADR-B-004]
breakingChanges: []
legacyItems: [LEG-009]
guards:
  - shortcutPatternGuard
  - fullCtxPassthroughGuard
  - registryInlineLogicGuard
successCriteria:
  step1: 3 guard baseline 付きで追加
  step2: selector 3 本 + helper 5 本を実装
  step3: 10+12+5 箇所の registry 行を新 path に切替
  step4: 全 guard baseline=0
dependsOn: [SP-A]
blocks: [SP-D (ADR-D-003 のみ)]
estimatedPRCount: 16 (4 ADR × 4 step)
risks:
  - Lane A 完了待ちで着手時期が後ずれ
  - 全 widget に及ぶ修正で QA 工数大
mitigations:
  - SP-A 完了前に PR1（guard 追加）のみ先行可能
  - 重量級 widget（WID-001/002/018）を最後に分離
```

### SP-C: duplicate-orphan-retirement

```yaml
projectId: duplicate-orphan-retirement
parent: architecture-debt-recovery
lane: C
status: planned
scope:
  - features/*/ui/widgets.tsx 3 件 byte-identical 解消
  - useCostDetailData 2 箇所並存解消
  - Tier D orphan 3 件削除
  - barrel re-export metadata 必須化
adrItems: [ADR-C-001, ADR-C-002, ADR-C-003, ADR-C-004]
breakingChanges: [BC-5]
legacyItems: [LEG-010, LEG-011, LEG-012, LEG-013, LEG-014, LEG-015]
guards:
  - duplicateFileHashGuard
  - hookCanonicalPathGuard
  - orphanUiComponentGuard
  - barrelReexportMetadataGuard
successCriteria:
  step1: 4 guard baseline 付きで追加
  step2: barrel re-export 化 / canonical 明示 / metadata bulk 追記
  step3: 物理削除（LEG-010/011/012/013/014）
  step4: 全 guard baseline=0 / barrel metadata fixed mode
dependsOn: []
blocks: [SP-D (ADR-D-004 のみ)]
estimatedPRCount: 14 (4 ADR × 約 3.5 step、ADR-C-003 は 3 step)
risks:
  - features/ 複製の consumer が未検出で残る
mitigations:
  - step2 で consumer grep を徹底（全 TypeScript + Markdown）
  - step3 前に再度 grep で 0 件を確認
```

### SP-D: aag-temporal-governance-hardening

```yaml
projectId: aag-temporal-governance-hardening
parent: architecture-debt-recovery
lane: D
status: planned
scope:
  - reviewPolicy required 昇格 + 92 件 bulk 整備
  - allowlist entry metadata 必須化
  - G8 に P20 / P21 追加
  - @deprecated に @expiresAt + @sunsetCondition 必須
  - generated architecture-debt-recovery-remediation.{md,json} 追加
  - projectDocConsistencyGuard 追加
adrItems: [ADR-D-001, ADR-D-002, ADR-D-003, ADR-D-004, ADR-D-005, ADR-D-006]
breakingChanges: [BC-6, BC-7]
legacyItems: [] (legacy 不在、governance 強化のみ)
guards:
  - reviewPolicyRequiredGuard
  - allowlistMetadataGuard
  - responsibilitySeparationGuard (P20/P21 統合)
  - deprecatedMetadataGuard
  - projectDocConsistencyGuard
successCriteria:
  step1: 5 guard baseline 付きで追加 + collector 実装（ADR-D-005）
  step2: 92 rule + allowlist 全 entry に metadata bulk 追記 + @deprecated metadata
  step3: type required 昇格（reviewPolicy / allowlist metadata）
  step4: 全 guard baseline=0（reviewPolicy）/ fixed mode（その他）
dependsOn:
  - SP-B (ADR-D-003 の P20/P21 baseline 削減が SP-B 完了に依存する部分のみ。
    ただし ADR-D-001/D-002/D-004/D-005/D-006 は SP-A/B/C 独立で実施可能)
  - SP-C (ADR-D-004 が ADR-C-004 の barrel metadata に follow-through)
blocks: []
estimatedPRCount: 19 (6 ADR、各 3-4 step、ADR-D-005 は 3 step、ADR-D-006 は 4 step)
risks:
  - 92 rule bulk 整備の owner 割当が人間判断を要する
  - SP-B との部分依存でタイミング調整が必要
mitigations:
  - ADR-D-001/002/005/006 は並行着手可能、D-003/004 は依存 sub-project 待ち
  - rule owner 割当は Phase 5 の人間承認時に合意
```

---

## 依存グラフ

### 有向グラフ（概念図）

```text
     ┌──────────────────────────────────┐
     │  SP-A: widget-context-boundary    │
     │  (ADR-A-001〜A-004)               │
     │  BC-1, BC-2, BC-3, BC-4           │
     │  LEG-001〜008                     │
     │  dependsOn: []                    │
     └───────────────┬──────────────────┘
                     │
                     ▼
     ┌──────────────────────────────────┐
     │  SP-B: widget-registry-simplify   │
     │  (ADR-B-001〜B-004)               │
     │  LEG-009                          │
     │  dependsOn: [SP-A]                │
     └────────────────┬─────────────────┘
                      │
                      ▼
                      │ (ADR-D-003 の P20/P21 baseline 削減のみ)
                      │
     ┌────────────────┴────────────────────┐
     │                                      │
     │  SP-C: duplicate-orphan-retirement   │──┐
     │  (ADR-C-001〜C-004)                  │  │ (ADR-C-004 ↔ ADR-D-004 follow-through)
     │  BC-5                                │  │
     │  LEG-010〜015                        │  │
     │  dependsOn: []                       │  │
     └──────────────────────────────────────┘  │
                                               │
                                               ▼
     ┌──────────────────────────────────────────────┐
     │  SP-D: aag-temporal-governance-hardening     │
     │  (ADR-D-001〜D-006)                          │
     │  BC-6, BC-7                                  │
     │  dependsOn: [SP-B 部分, SP-C 部分]           │
     └──────────────────────────────────────────────┘
```

### 依存辺（edges）完全列挙

| from | to | 種別 | 詳細 |
|---|---|---|---|
| SP-A | SP-B | hard | ADR-A-001/A-002 の ctx 型分離が完了してから SP-B の null check 解消が可能（type narrowing 依存） |
| SP-B | SP-D | partial | ADR-D-003（G8 P20/P21 baseline 削減）のみ SP-B 完了に依存。SP-D の他 ADR は独立着手可能 |
| SP-C | SP-D | partial | ADR-C-004（barrel metadata）と ADR-D-004（@deprecated metadata）が metadata 規約として連動。SP-C 先行後に SP-D の D-004 が follow-through |
| SP-A ↔ SP-C | — | independent | 独立。並行着手可能 |
| SP-A ↔ SP-D（部分） | — | independent | SP-D の D-001/D-002/D-005/D-006 は SP-A と独立 |

### 閉路検証

**閉路なし（DAG）を確認**:

- SP-A に in-edge なし（起点ノード）
- SP-B の in-edge: SP-A のみ
- SP-C に in-edge なし（起点ノード、SP-A と独立並行可能）
- SP-D の in-edge: SP-B（部分）+ SP-C（部分）
- SP-A / SP-C → SP-D の経路が複数あるが、全て単方向

トポロジカル順序（可能な 1 順序）:
1. SP-A または SP-C（並行可）
2. SP-B（SP-A 完了後）
3. SP-D（SP-B / SP-C 部分完了後に残 ADR 着手）

---

## 立ち上げ順序（推奨、人間承認待ち）

### Wave 1（並行着手可能）

| sub-project | 開始条件 | 主要 deliverable |
|---|---|---|
| SP-A | Phase 5 承認後 | ctx 型分離 4 件 + BC-1〜BC-4 |
| SP-C | Phase 5 承認後 | 複製 / orphan 削除 + BC-5 |
| SP-D（部分）| Phase 5 承認後 | ADR-D-001/002/005/006 を先行（ADR-D-003/004 は待機） |

### Wave 2

| sub-project | 開始条件 | 主要 deliverable |
|---|---|---|
| SP-B | SP-A completed 昇格後 | registry simplification |
| SP-D（続き）| SP-C completed 昇格後 | ADR-D-004（barrel metadata と connect） |

### Wave 3

| sub-project | 開始条件 | 主要 deliverable |
|---|---|---|
| SP-D（残）| SP-B completed 昇格後 | ADR-D-003（P20/P21 baseline 削減） |

### 全 sub-project completion

全 4 sub-project が completion 条件を満たすと、architecture-debt-recovery（本 umbrella）が Phase 7 completion へ進む（plan.md §3 Phase 7）。

---

## 集計サマリ

| 指標 | 値 |
|---|---|
| sub-project 数 | 4（SP-A / SP-B / SP-C / SP-D） |
| ADR item 総数 | 18（A: 4 / B: 4 / C: 4 / D: 6） |
| 破壊的変更総数 | 7（BC-1〜BC-7） |
| legacy item 総数 | 15（LEG-001〜LEG-015） |
| 新 guard 総数 | 約 14（sub-project 別は上記参照） |
| 概算 PR 総数 | 65（16 + 16 + 14 + 19） |
| 依存辺の数 | 3（閉路なし検証済み） |
| 並行着手可能 Wave 1 数 | 3（SP-A / SP-C / SP-D 部分） |

## 人間承認のスコープ（Phase 4 完了条件）

plan.md Phase 4 完了条件「人間承認: 破壊的変更 list と sub-project 立ち上げ順序」に対応。

承認対象:
1. 4 sub-project 定義（SP-A/B/C/D）の scope / adr / legacy / guards / success criteria
2. 7 破壊的変更（BC-1〜BC-7、inquiry/16 参照）
3. 15 legacy item（LEG-001〜LEG-015、inquiry/17 参照）
4. 依存グラフ（DAG、閉路なし検証済み）
5. Wave 1-3 の立ち上げ順序
6. 各 legacy の deadline 確定（本 inquiry では TBD）
7. rule owner 割当（ADR-D-001 の 92 件 bulk 整備時、reviewPolicy.owner の決定）

## 非承認スコープの扱い

本 sub-project map に載らない sub-project 化は Phase 6 で禁止（plan.md §8 禁止事項 #17）。

新たな sub-project が必要と判明した場合:
1. `18a-<slug>.md` addendum 作成
2. 依存グラフ更新 + 閉路再検証
3. 改めて人間承認
4. 承認後に Phase 6 で spawn

## 付記

- 本 file は immutable。追加は `18a-*.md` として addend
- Phase 5 の `inquiry/19-21` で `budget-achievement-simulator` 扱い / `CURRENT_PROJECT.md` 切替計画 / spawn sequence を確定する。本 inquiry はその入力
- 関連: `inquiry/15-17`（計画 input）、`plan.md §7 sub-project 文脈継承`、`references/03-guides/project-checklist-governance.md §3 project 運用規約`
