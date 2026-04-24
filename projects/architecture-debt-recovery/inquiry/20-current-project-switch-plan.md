# inquiry/20 — CURRENT_PROJECT.md 切替計画

> 役割: Phase 5 inquiry 成果物 #2。`CURRENT_PROJECT.md`（単一作業対象を指す marker）の切替手順を確定する。`status`（config/project.json の永続フィールド）と `CURRENT_PROJECT.md`（短命な作業 marker）を区別した運用を計画する。
>
> plan.md §3 Phase 5 完了条件「本 project の `config/project.json` の `status: "draft"` → `"active"` 変更承認済」「`open-issues.md` の active projects 表更新方針が確定している」「人間承認: 本 project の `active` 昇格」に対応。
>
> 本ファイルは immutable。Phase 6 以降で追加情報が判明しても書き換えず、`20a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `7852361`（inquiry/18 push 後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `CURRENT_PROJECT.md`、`projects/architecture-debt-recovery/config/project.json`、`projects/budget-achievement-simulator/config/project.json`、`inquiry/19`、`plan.md §7` |

## 現状の 2 軸状態

### 軸 1: `config/project.json` の `status`（永続）

| project | 現 status |
|---|---|
| architecture-debt-recovery | `draft` |
| budget-achievement-simulator | `active` |

### 軸 2: `CURRENT_PROJECT.md` の指す project（短命作業 marker）

`CURRENT_PROJECT.md` は現在 `budget-achievement-simulator` を指している。

### 2 軸の意味論（plan.md §7 より）

plan.md §7 の改訂（CodeRabbit 修正で明確化済み）:

> - `status: "active"` と `CURRENT_PROJECT.md` の指す作業対象を分けて扱う
> - umbrella は `status: "active"` のまま track owner として残る（sub-project が複数 spawn されても維持）
> - sub-project も立ち上げ時に `status: "active"` となる（umbrella と共存可）
> - **`CURRENT_PROJECT.md` は同時に 1 project のみ**を指す — sub-project 作業中は sub へ切り替え
> - sub-project 完了時: `CURRENT_PROJECT.md` を umbrella に戻す（umbrella の `status` は変更しない）

## 切替の全体シナリオ

Phase 5 人間承認 → Phase 6 sub-project spawn までの切替手順を時系列で記述する。

### T0（現在、Phase 4 完了）

| 軸 | 値 |
|---|---|
| architecture-debt-recovery.status | `draft` |
| budget-achievement-simulator.status | `active` |
| CURRENT_PROJECT.md | `budget-achievement-simulator` |

### T1（Phase 5 人間承認直後 = 切替 PR merge 完了）

| 軸 | 値 |
|---|---|
| architecture-debt-recovery.status | `active`（昇格） |
| budget-achievement-simulator.status | `completed`（archive 済み） |
| CURRENT_PROJECT.md | `architecture-debt-recovery` |

### T2（SP-A / SP-C / SP-D 部分 spawn、Phase 6 Wave 1）

| 軸 | 値 |
|---|---|
| architecture-debt-recovery.status | `active`（track owner 継続） |
| SP-A.status | `active`（新規 spawn） |
| SP-C.status | `active`（新規 spawn） |
| SP-D.status | `active`（新規 spawn、D-001/002/005/006 先行） |
| CURRENT_PROJECT.md | 作業対象の sub-project（例: 今 SP-A を作業中なら `widget-context-boundary`） |

### T3（SP-A completed、SP-B spawn、Phase 6 Wave 2）

| 軸 | 値 |
|---|---|
| architecture-debt-recovery.status | `active` |
| SP-A.status | `completed`（archive） |
| SP-B.status | `active`（新規 spawn） |
| SP-C.status | 進行中 or `completed` |
| SP-D.status | 進行中（D-003 / D-004 が SP-B/C 待ちで後ろ倒し） |
| CURRENT_PROJECT.md | 作業中の sub-project |

### T4（Phase 6 全 sub-project completed → Phase 7 archive）

| 軸 | 値 |
|---|---|
| architecture-debt-recovery.status | `completed`（archive 直前） |
| 全 sub-project | `completed`（archive 済み） |
| CURRENT_PROJECT.md | `architecture-debt-recovery`（archive 手続き中）→ archive 後に次の active project へ |

## T0 → T1 切替 PR の構造

Phase 5 完了の要として、**単一 PR** で以下を全て実施する。この PR が本 Phase 5 の成果物の最終形。

### PR 構成

```yaml
pr-title: "chore(architecture-debt-recovery): Phase 5 完了 — status active 昇格 + predecessor archive + CURRENT_PROJECT 切替"
breakingChange: true  # project 運用状態の変更として破壊的
steps:
  - step1:
      action: projects/budget-achievement-simulator/SUMMARY.md を作成
      内容: |
        - 完了日
        - reboot 成果サマリ
        - 後続引き継ぎ 3 件（inquiry/19 R4）の SP-A/B/C 先を明記
        - 本 umbrella への lineage
  - step2:
      action: budget-achievement-simulator/config/project.json
      変更: status: "active" → "completed"
  - step3:
      action: 物理移動
      from: projects/budget-achievement-simulator/
      to: projects/completed/budget-achievement-simulator/
  - step4:
      action: architecture-debt-recovery/config/project.json
      変更: status: "draft" → "active"
  - step5:
      action: CURRENT_PROJECT.md を書き換え
      from: budget-achievement-simulator
      to: architecture-debt-recovery
  - step6:
      action: references/02-status/open-issues.md の active/completed 表を更新
      内容: |
        - active: architecture-debt-recovery を追加
        - completed: budget-achievement-simulator を移動（archived 欄）
  - step7:
      action: HANDOFF.md §1 現在地を同期
      内容: status を active に更新、T1 状態を明記
verification:
  - docs:check PASS
  - projectCompletionConsistencyGuard PASS（archive prefix 整合）
  - projectStructureGuard PASS
  - test:guards 全 PASS
rollback:
  - git revert で 7 step 全てを戻す
  - 旧 path 復元 + status を "active" / "draft" に戻す
  - CURRENT_PROJECT.md を budget-achievement-simulator に戻す
```

## projectCompletionConsistencyGuard との整合

本 project の checklist Phase 5 の既知観察（Step 0 scaffold fix 時に CodeRabbit 指摘で修正済み）:

- active project が `projects/completed/` prefix 付き path を参照する記述は guard 違反
- archived 後は逆に、`projects/architecture-debt-recovery/` 直下の参照が違反となる
- 切替 PR の step6（open-issues.md 更新）と step7（HANDOFF 同期）で、guard が常に通る状態を保つ

## open-issues.md の更新方針

plan.md §3 Phase 5 完了条件「`open-issues.md` の active projects 表更新方針が確定している」に対応。

### 方針

1. **active 欄**から `budget-achievement-simulator` を削除
2. **archived（completed）欄**に `budget-achievement-simulator` を追加（archive 日付付記）
3. **active 欄**に `architecture-debt-recovery` を追加（`status: "active"` / `Phase 6 実施中` の表記）
4. 本 umbrella の sub-project 4 本（SP-A/B/C/D）は Phase 6 で spawn される際に individual に active 欄に追加

### 更新 PR

切替 PR（T0 → T1）の step6 で一括更新。sub-project の open-issues 登録は各 sub-project spawn PR（Phase 6）で実施。

## CURRENT_PROJECT.md 切替のルール

### 基本ルール

| 状況 | CURRENT_PROJECT.md が指す project |
|---|---|
| umbrella のみ active、sub-project なし | umbrella（`architecture-debt-recovery`） |
| umbrella active + sub-project 作業中 | 作業中の sub-project |
| sub-project 完了直後（次の sub-project 未 spawn） | umbrella（`architecture-debt-recovery`） |
| 全 sub-project completed、umbrella archive 手続き中 | umbrella（`architecture-debt-recovery`） |
| umbrella archive 完了 | 次の active project or 空（無 active 期間は許容） |

### 切替 PR の要件

CURRENT_PROJECT.md を書き換える PR は以下を満たす:

1. **1 PR で 1 切替のみ**（複数 project を同時切替しない）
2. 対応する sub-project の `config/project.json.status` と整合
3. HANDOFF.md §1 の現在地記述を同期
4. 本 `inquiry/20` または Phase 6 の sub-project side の spawn 計画に記載されている切替のみ

### sub-project spawn 時の切替手順（Phase 6 テンプレート）

```yaml
sub-project-spawn:
  steps:
    - step1: 対象 sub-project の config/project.json を作成（status: "active", parent: "architecture-debt-recovery"）
    - step2: sub-project 用の AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md を _template ベースで作成
    - step3: CURRENT_PROJECT.md を sub-project に切替
    - step4: open-issues.md の active 欄に sub-project を追加
    - step5: projectStructureGuard / projectCompletionConsistencyGuard PASS
  rollback: git revert で 5 step 全てを戻す
```

### sub-project completed 時の切替手順（Phase 6 テンプレート）

```yaml
sub-project-completion:
  steps:
    - step1: sub-project の SUMMARY.md 作成
    - step2: sub-project 配下を projects/completed/<id>/ に物理移動
    - step3: sub-project の config/project.json.status を "active" → "completed"
    - step4: CURRENT_PROJECT.md を umbrella（architecture-debt-recovery）に戻す
    - step5: open-issues.md の active → archived 欄へ sub-project を移動
    - step6: umbrella HANDOFF.md の進捗サマリを更新
    - step7: projectCompletionConsistencyGuard PASS
```

## 本 umbrella の `active` 昇格条件

`architecture-debt-recovery.status: "draft" → "active"` の条件:

1. Phase 1-4 の全 architecture review が完了（本 Phase 5 承認前に満たされる）
2. Phase 5 inquiry/19 の budget-achievement-simulator 引き継ぎが確定（本 commit で完了）
3. Phase 5 inquiry/20（本 file）の切替計画が確定
4. Phase 5 inquiry/21 の spawn sequence が確定
5. 人間承認: 本 project の active 昇格
6. 人間承認: budget-achievement-simulator の扱い（inquiry/19）

1-4 は本 Phase 5 commit で満たされる。5-6 は Phase 5 人間承認の対象。

## 人間承認のスコープ（本 Phase 5 完了条件 #2）

plan.md §3 Phase 5 完了条件「人間承認: 本 project の `active` 昇格」に対応。

承認対象:
1. T0 → T1 切替 PR の 7 step 実施
2. CURRENT_PROJECT.md を `architecture-debt-recovery` に切替
3. `architecture-debt-recovery.status` を `draft` → `active` に昇格
4. budget-achievement-simulator を `projects/completed/` に archive
5. open-issues.md 更新方針（active / completed 欄の変更）
6. sub-project spawn 時 / completion 時の CURRENT_PROJECT 切替テンプレートの Phase 6 採用

## 非承認スコープの扱い

本 inquiry に記載のない CURRENT_PROJECT.md 切替は Phase 6 で実施禁止。新たな切替パターンが必要と判明した場合:

1. `20a-<slug>.md` addendum 作成
2. 改めて人間承認
3. 承認後に Phase 6 で実施

## 付記

- 本 file は immutable。追加は `20a-*.md` として addend
- 関連: `inquiry/18`（sub-project map と依存順）、`inquiry/19`（budget-achievement-simulator 扱い）、`inquiry/21`（spawn sequence）、`CURRENT_PROJECT.md`、`plan.md §7` umbrella/sub-project active 切替規約
