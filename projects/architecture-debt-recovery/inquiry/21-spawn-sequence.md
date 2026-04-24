# inquiry/21 — sub-project 立ち上げ順序（spawn sequence）

> 役割: Phase 5 inquiry 成果物 #3（最終）。inquiry/18 の Wave 1-3 立ち上げ順序に時系列 milestone と spawn PR template を付与し、Phase 6 実施の入口を固定する。
>
> plan.md §3 Phase 5 完了条件「人間承認: 破壊的変更 list と sub-project 立ち上げ順序」の最終段。
>
> 本ファイルは immutable。Phase 6 以降で追加情報が判明しても書き換えず、`21a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `7852361` 系列（Phase 4 完了後、Phase 5 進行中） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/18`（sub-project map + DAG）、`inquiry/19`（predecessor transition）、`inquiry/20`（CURRENT_PROJECT 切替計画）、`plan.md §3 Phase 6` |

## 立ち上げ全景

本 file は **3 つの Wave** に分けて 4 sub-project を spawn する。各 Wave の入口は plan.md §7 umbrella/sub-project active 切替規約に従う。

---

## 事前準備（Wave 0、Phase 5 → 6 移行）

| # | action | file |
|---|---|---|
| P-1 | Phase 5 人間承認取得 | inquiry/19, 20 |
| P-2 | 切替 PR（inquiry/20 §T0 → T1）merge | — |
| P-3 | `architecture-debt-recovery.status: draft → active` | config/project.json |
| P-4 | `CURRENT_PROJECT.md` を `architecture-debt-recovery` に切替 | — |
| P-5 | `projects/completed/budget-achievement-simulator/` を `projects/completed/` へ物理移動 | inquiry/19 archive 手順 |
| P-6 | `open-issues.md` の active / archived 欄更新 | inquiry/20 §open-issues |

Wave 0 完了後に Wave 1 spawn 可能。

---

## Wave 1: 並行 spawn 可能な 3 sub-project

Phase 5 承認直後に spawn 可能な 3 sub-project（dependsOn が満たされる）:

### W1-A. SP-A widget-context-boundary

| 項目 | 値 |
|---|---|
| projectId | `widget-context-boundary` |
| parent | `architecture-debt-recovery` |
| spawn 条件 | Wave 0 完了 |
| spawn PR 構成 | sub-project-spawn template（`inquiry/20 §テンプレート`） |
| CURRENT_PROJECT.md 切替 | **作業開始時**に `widget-context-boundary` へ（他 sub-project と同時進行時は作業対象に応じて切替）|
| 主要 deliverable | 4 ADR（A-001〜A-004）+ 7 legacy（LEG-001〜008）+ 4 guard 追加 |
| estimated PR 数 | 16（4 ADR × 4 step） |
| 完了条件 | 4 guard baseline=0 + 8 legacy の sunsetCondition 達成 |

### W1-C. SP-C duplicate-orphan-retirement

| 項目 | 値 |
|---|---|
| projectId | `duplicate-orphan-retirement` |
| parent | `architecture-debt-recovery` |
| spawn 条件 | Wave 0 完了。SP-A と**独立並行可** |
| 主要 deliverable | 4 ADR（C-001〜C-004）+ 6 legacy（LEG-010〜015）+ 4 guard + BC-5 |
| estimated PR 数 | 14 |
| 完了条件 | 4 guard baseline=0 + 6 legacy sunsetCondition 達成 |

### W1-D-partial. SP-D aag-temporal-governance-hardening（部分先行）

Wave 1 時点で spawn 可能な ADR は **D-001 / D-002 / D-005 / D-006**（Lane B 独立部分）。

| 項目 | 値 |
|---|---|
| projectId | `aag-temporal-governance-hardening` |
| parent | `architecture-debt-recovery` |
| spawn 条件 | Wave 0 完了。SP-A / SP-C と独立並行可 |
| Wave 1 で着手する ADR | D-001（reviewPolicy required + 92 件 bulk）/ D-002（allowlist metadata）/ D-005（generated remediation.{md,json}）/ D-006（projectDocConsistencyGuard） |
| Wave 2 以降に延期する ADR | D-003（P20/P21、SP-B 完了待ち）/ D-004（@deprecated metadata、SP-C ADR-C-004 follow-through） |
| estimated PR 数（Wave 1 分） | 約 12 |
| 完了条件（Wave 1 分） | D-001/002/005/006 の 4 guard baseline=0 + type required 昇格 |

---

## Wave 2: SP-A completed 後に spawn

### W2-B. SP-B widget-registry-simplification

| 項目 | 値 |
|---|---|
| projectId | `widget-registry-simplification` |
| parent | `architecture-debt-recovery` |
| spawn 条件 | SP-A が **completed 昇格**済み（inquiry/20 §sub-project completion 手順完了） |
| 主要 deliverable | 4 ADR（B-001〜B-004）+ 1 legacy（LEG-009）+ 3 guard |
| estimated PR 数 | 16（4 ADR × 4 step） |
| 完了条件 | 3 guard baseline=0 + LEG-009 sunsetCondition 達成 |
| 依存理由 | ADR-B-001 が SP-A の ctx 型分離完了後に type narrowing で null check 解消可能 |

### W2-D-continued. SP-D の ADR-D-004（SP-C 完了後 follow-through）

| 項目 | 値 |
|---|---|
| 着手する ADR | D-004（@deprecated に @expiresAt + @sunsetCondition 必須） |
| spawn 条件 | SP-C が **completed 昇格**済み（ADR-C-004 の barrel metadata 完了後） |
| estimated PR 数 | 4 |

---

## Wave 3: SP-B completed 後に spawn

### W3-D-final. SP-D の ADR-D-003（P20/P21 baseline 削減）

| 項目 | 値 |
|---|---|
| 着手する ADR | D-003（G8 に P20 useMemo 内行数 + P21 widget 直接子数） |
| spawn 条件 | SP-B が **completed 昇格**済み（Lane B の改修完了で baseline 削減原資が確定） |
| estimated PR 数 | 3 |

---

## 全体 milestone（時系列）

```text
Phase 5 承認
    ↓
【Wave 0】切替 PR（budget-achievement-simulator archive + CURRENT_PROJECT 切替 + active 昇格）
    ↓
【Wave 1】(並行 3 sub-project)
    ├─ SP-A spawn → 16 PR 実施 → completed
    ├─ SP-C spawn → 14 PR 実施 → completed
    └─ SP-D-partial spawn → 12 PR 実施（D-001/002/005/006）
    ↓ (SP-A completed)
【Wave 2】
    ├─ SP-B spawn → 16 PR 実施 → completed
    └─ SP-D-continued: ADR-D-004 の 4 PR (SP-C completed 後)
    ↓ (SP-B completed)
【Wave 3】
    └─ SP-D-final: ADR-D-003 の 3 PR
    ↓ (全 sub-project completed)
【Phase 7】architecture-debt-recovery archive
    ├─ SUMMARY.md 作成
    ├─ projects/architecture-debt-recovery/ を projects/completed/ へ移動
    ├─ CURRENT_PROJECT.md を次の project or 空に
    └─ open-issues.md 最終更新
```

## CURRENT_PROJECT.md の切替時系列

| milestone | CURRENT_PROJECT.md が指す project |
|---|---|
| T0（Phase 4 完了時） | `budget-achievement-simulator`（現在） |
| T1（Wave 0 切替 PR merge 直後） | `architecture-debt-recovery` |
| T2a（SP-A 作業開始） | `widget-context-boundary` |
| T2b（SP-C 作業開始） | `duplicate-orphan-retirement`（作業対象切替時） |
| T2c（SP-D partial 作業開始） | `aag-temporal-governance-hardening`（作業対象切替時） |
| T2-idle（どの sub-project も作業していない瞬間） | `architecture-debt-recovery`（umbrella に戻す、inquiry/20 rule） |
| T3（SP-B 作業開始） | `widget-registry-simplification` |
| T4（全 sub-project completed、Phase 7 入口） | `architecture-debt-recovery` |
| T5（Phase 7 archive 完了） | 次の active project or 空 |

同時並行で複数 sub-project が `status: "active"` でも、`CURRENT_PROJECT.md` は常に 1 project のみを指す（plan.md §7）。

---

## spawn PR テンプレート（sub-project ごとに適用）

```yaml
spawn-<sub-project-id>:
  pr-title: "chore(<sub-project-id>): Phase 6 spawn — scaffold + CURRENT_PROJECT 切替"
  steps:
    - step1: projects/<sub-project-id>/ を _template から scaffold
    - step2: config/project.json に status="active" / parent="architecture-debt-recovery" 設定
    - step3: AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md を本 umbrella の inquiry 参照を埋めて customize
    - step4: aag/execution-overlay.ts を initial 空 overlay で配置
    - step5: CURRENT_PROJECT.md を <sub-project-id> に切替
    - step6: references/02-status/open-issues.md の active 欄に追加
    - step7: 本 umbrella HANDOFF.md §1 の現在地に spawn 記録を追記
    - step8: docs:check + test:guards 全 PASS を確認
  verification:
    - projectStructureGuard PASS
    - projectCompletionConsistencyGuard PASS
    - checklistFormatGuard PASS
  rollback:
    - git revert で 7 step 全てを戻す
```

## spawn 後の runtime 規律

### sub-project 内部の PR 分離（plan.md §2 不可侵 #3）

- **1 PR = 1 破壊的変更** を厳守
- 4 step pattern（新実装 / 移行 / 削除 / guard）をそれぞれ独立 PR
- guard baseline 変更は独立 PR
- 対応する commit message に ADR id + step 番号を明示（例: `feat(widget-context-boundary): ADR-A-001 step2 — page-specific ctx 3 本を新設`）

### sub-project completion 判定

inquiry/17 §再発防止規約 5 に基づく 4 条件を全て満たす:

1. 4 step pattern 完遂
2. 対応 legacy item の sunsetCondition 達成
3. 対応 legacy item の `consumerMigrationStatus: migrated` 到達
4. 対応 guard baseline=0 到達

上記 4 条件を満たしたら、sub-project completion PR を実施（inquiry/20 §sub-project completion テンプレート）。

## 並行着手時の作業規律

Wave 1 では最大 3 sub-project が並行 active 状態になる。並行作業時の規律:

1. **PR は sub-project ごとに独立**（他 sub-project の branch に commit しない）
2. **CURRENT_PROJECT.md は 1 人 1 作業セッションで 1 切替のみ**（セッション中に切替が必要なら別セッションに分離）
3. **branch 命名**: `claude/<sub-project-id>-<slug>` で sub-project と紐付け
4. **Cross-sub-project の整合性チェック**: 本 umbrella HANDOFF.md §1 の進捗サマリを sub-project completion ごとに更新
5. **conflict 対応**: sub-project 間で file 競合が発生した場合、本 inquiry/18 の依存グラフを参照して先行 sub-project に統合（SP-A → SP-B 等）

## 人間承認のスコープ（本 Phase 5 完了条件 #3）

plan.md Phase 5 完了条件「人間承認: 破壊的変更 list と sub-project 立ち上げ順序」の**立ち上げ順序**部分に対応（破壊的変更 list は inquiry/16 で承認済）。

承認対象:
1. Wave 0（切替 PR）→ Wave 1（SP-A/C/D 部分並行）→ Wave 2（SP-B + SP-D D-004）→ Wave 3（SP-D D-003）の順序
2. 各 Wave の spawn 条件（前 Wave の sub-project completion）
3. spawn PR テンプレート（本 file §spawn PR テンプレート）
4. sub-project 並行時の作業規律（§並行着手時の作業規律 5 項）
5. CURRENT_PROJECT.md の T0〜T5 切替時系列
6. Phase 7 archive 入口条件（全 sub-project completed）

## 非承認スコープの扱い

本 inquiry に記載のない spawn / 順序は Phase 6 で実施禁止（plan.md §8 禁止事項 #17）。

新たな spawn が必要と判明した場合:

1. `21a-<slug>.md` addendum 作成
2. inquiry/18 の依存グラフ更新 + 閉路再検証
3. 改めて人間承認
4. 承認後に Phase 6 で spawn

## 付記

- 本 file は immutable。追加は `21a-*.md` として addend
- 関連: `inquiry/18`（sub-project map）、`inquiry/19`（predecessor transition）、`inquiry/20`（CURRENT_PROJECT 切替計画）、`plan.md §3 Phase 6`
