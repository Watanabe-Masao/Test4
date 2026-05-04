# discovery-log — operational-protocol-system

> **役割**: implementation 中に発見した **scope 外** / **改善必要** / **詳細調査要** 事項の蓄積 artifact (= DA-β-003 で institute)。
> AAG 4 系統 lens (= ログ / メトリクス / 手順書 / チェックリスト) に直交する **5 系統目: 発見蓄積**。
>
> **scope 含む**: 本 project の plan 範囲外で発見した事項 / 改善 candidate / 詳細調査要事項。
> **scope 外 (= 別 doc)**: 本 project plan 範囲内事項 (= `checklist.md` / `plan.md`)、判断履歴 (= `decision-audit.md`)。
>
> 機械検証: `projectizationPolicyGuard` PZ-14 (= file 存在 + schema 軽量 check)。
> entry 内容妥当性は AI session 責任 (= 機械検証 scope 外、AAG philosophy「製本されないものを guard 化しない」と整合)。
>
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.3 + DA-β-003。

## priority

| priority | 性質 | 解消 timing |
|---|---|---|
| **P1 (high)** | 本 program 内吸収可能 | 該当 phase で batch 解消 |
| **P2 (med)** | post-archive 別 program candidate | archive 後、別 program 起動判断 (= user) |
| **P3 (low)** | 揮発 / 不要判定可 | 棚卸 phase で削除判定 |

## 発見済 entry

> entry template は `projects/_template/discovery-log.md` を参照。

### 2026-05-04 P3: KPI drift after `[x]` flip — commit pattern 学習化

- **場所**: 本 project M1-M5 全 Phase で観測 (= PR 4 後 / PR 6 後 / M2 後 / M5 後 計 4 回)
- **観測事象**: checkbox `[x]` flip 後、`docs:check` が KPI drift (= `project.checklist.checkedCheckboxes`) で fail、`docs:generate` regen + 別 commit で解消必要。
- **性質**: checkbox flip → checkedCheckboxes 増加 → `architecture-health.json` committed value と live recalc の drift。事前回避は **困難** (= flip 自体が data 変更)。
- **後続 program 適用 candidate pattern**:
  - **Pattern A** (= 採用): `commit (= flip 含む) → docs:generate → 別 regen commit → push`。drawer Pattern 1 (commit-bound rollback) 整合、各 commit が rollback unit
  - **Pattern B** (= 不採用): `flip 前に docs:generate → flip + 同 commit → push`。事前 regen は flip 前提で計算不能、不可
  - **Pattern C** (= 不採用): `flip + commit + amend で regen 統合 → push`。amend は drawer Pattern 1 違反 (= rollback unit 破壊)、AAG-REQ-NO-AMEND 準拠で不採用
- **trigger**: 本 program M1 で初観測、以降 4 回再現 (= 確実な再現性)
- **解消 timing**: pattern として認識・記録、以降の AI session が同 pattern を採用すれば事前回避可
- **影響**: 後続 program (= operational-protocol-system 完遂後の任意 project) で commit pattern 適用可

### 2026-05-04 P3: doc-registry obligation 事前 check — pre-flight pattern 学習化

- **場所**: 本 project M1 (= push fail × 2 発生) → M4 (= 学習適用で 0 件) で観測
- **観測事象**: `references/` 配下に新 .md doc を追加した PR では、以下を **同 commit に統合** しないと pre-push hook で fail:
  - `docs/contracts/doc-registry.json` に entry 追加
  - `references/README.md` の索引 section に entry 追加 (= `docRegistryGuard` 整合)
- **発生機序**:
  - M1 (= 4 protocol doc landing) で push fail × 2 発生 (= doc-registry 漏れ + README 索引漏れ)
  - 各 fail は follow-up commit (= `f4acd1ac7`) で解消
- **学習適用** (= M4 で再発回避):
  - M4 で 4 sub-doc landing (= planning / refactor / bug-fix / new-capability protocol) を **doc-registry + README + 4 doc + DA + checklist + HANDOFF** すべて同 atomic commit (= `921740167`) で landing
  - 結果: M4 で push fail 0 件
  - M5 でも同 pattern 適用、再発なし
- **後続 program 適用 candidate pattern**:
  - 新 references/ 配下 .md doc 追加時の **pre-flight check list**:
    1. `docs/contracts/doc-registry.json` に entry 追加 (= category 適切選択)
    2. `references/README.md` 索引 section に entry 追加
    3. (該当時) `CLAUDE.md` から該当 doc への link 追加
    4. すべてを **本 commit に統合** (= 別 commit 化禁止、push fail で follow-up が必要になる)
- **trigger**: 本 program M1 で初観測 (= 2 回連続 push fail)、M4 で学習適用成功
- **解消 timing**: M4 で学習適用済、本 entry は後続 program への伝承
- **影響**: 後続 program (= 任意 references/ 追加 task) で pre-flight check pattern 適用可

## 別 program candidate (= P2、post-archive)

### 2026-05-04 P2: TC-5 Incident Discovery 独立 protocol doc 化 — 再起動 trigger 観察待ち

- **場所**: `references/05-aag-interface/protocols/task-class-catalog.md` §6 (= drawer Pattern 5 意図的 skip + rationale articulate)
- **現状**: TC-5 は task として完結せず TC-3/TC-2/TC-4 へ分岐、本 catalog §6 articulate で十分と判定
- **再起動 trigger**: 究明 phase 自体が複数 session に渡る + 既存 catalog articulate で reach 不能と判明
- **解消 timing**: 観察期間で trigger 発生時に独立 program candidate 化 (= AAG-COA + AI-COA 適用)

### 2026-05-04 P2: seam-integration §4 guard 化 (GP-1〜GP-4) — 再起動 trigger 観察待ち

- **場所**: `references/05-aag-interface/protocols/seam-integration.md` §4 (= drawer Pattern 4 + 5 application instance)
- **現状**: 4 候補 (GP-1〜GP-4) すべて value < cost で **No 結論**
- **再起動 trigger**:
  - A: 同種 protocol violation 2 回以上発生 (= G8 整合)
  - B: AAG framework 側 commit message convention articulate update (= 候補 GP-4 の cost 劇減)
  - C: AI session monitor infrastructure が AAG drawer 統合 (= 候補 GP-1/GP-2 の cost 劇減)
- **解消 timing**: trigger 観察待ち、発生時に再評価

### 2026-05-04 P2: AI Role Catalog institute (= post-Pilot AI Role Layer charter)

- **場所**: 本 project plan §3 Phase M5 §scope 外 articulate
- **現状**: 本 project は **Task Class lens** で articulate、Role identity (= AI Role Catalog) は別 program scope
- **再起動 trigger**: Task Protocol System 運用で Role identity が必要と判明 (= 例: 同 Task Class 内で Role 別の routing が必要 / Role 別 context bundle が必要)
- **解消 timing**: 観察期間で trigger 発生時に AI Role Layer charter 起動 (= AAG-COA Level 2+ 想定)

## status

- 2026-05-03 (DA-β-003 institute): 本 discovery-log landing (= retroactive bootstrap)
- 2026-05-04: M1-M5 完遂後の retrospective で 5 entry articulate
  - P3 × 2 件: 後続 program 適用 candidate pattern (= KPI drift commit pattern + doc-registry pre-flight check)
  - P2 × 3 件: post-archive 別 program candidate (= TC-5 独立 doc / seam guard 化 / AI Role Catalog)
