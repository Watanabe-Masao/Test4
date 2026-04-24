# inquiry/19 — budget-achievement-simulator の扱い（predecessor project transition）

> 役割: Phase 5 inquiry 成果物 #1。先行 project `budget-achievement-simulator` の残タスクを確認し、**完了（completed 昇格）**か**本 umbrella の sub-project に引き継ぎ**かを確定する。
>
> plan.md §3 Phase 5 完了条件「budget-achievement-simulator cleanup 7 項目の引き継ぎ先 sub-project が確定している」「人間承認: budget-achievement-simulator の扱い」に対応。
>
> 本ファイルは immutable。Phase 6 以降で追加情報が判明しても書き換えず、`19a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `7852361`（Phase 4 完了直後。inquiry/18 push 済み） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `projects/budget-achievement-simulator/HANDOFF.md` / `AI_CONTEXT.md` / `plan.md` / `checklist.md` / `config/project.json` |
| 対象 project 状態 | `status: "active"`、HANDOFF §1 「残り」および §2 「次にやること」参照 |

## budget-achievement-simulator の現状

### 基本属性

| 項目 | 値 |
|---|---|
| projectId | `budget-achievement-simulator` |
| status | `active`（`config/project.json`） |
| CURRENT_PROJECT.md | 現在も同 project を指す |
| 役割 | Claude Design でプロトタイプ化した予算達成シミュレーターを本体に移植する reboot project |
| 本 umbrella との関係 | **informed-by**（本 project の契機となった先行 project）。Phase 5 まで touch 禁止（本 umbrella plan.md §2 不可侵 #14） |

### 完了済み内容（HANDOFF §1 より）

- Budget Simulator widget (`BudgetSimulatorWidget`) を `features/budget/ui/` に実装
- `DayDetailModal` / `PeriodDetailModal` を `components/day-detail/` に shared 化
- Dashboard 既存 widget `MonthlyCalendar` / `MonthlyCalendarFC` 撤去
- モック HTML (`_.standalone.html`) 削除
- registry / ownership manifest / layout preset から該当 widget 除去
- `domain/calculations/budgetSimulator.ts` の pure 計算再利用

### 残タスク（HANDOFF §1「残り」+ §2「次にやること」より）

#### R1. 人間による最終レビュー

HANDOFF §1: 「人間による最終レビュー (plan / checklist / HANDOFF / 実装差分)」

本 umbrella の Phase 5 人間承認に吸収可能 → 本 inquiry にて同時確定。

#### R2. 承認後の activate 切替

HANDOFF §1: 「承認後の activate 切替 (`CURRENT_PROJECT.md`)」

本 umbrella の Phase 5 `inquiry/20-current-project-switch-plan.md` の対象。

#### R3. test:visual

HANDOFF §1: 「`test:visual` は Storybook + WASM 依存のため CI で検証」

既に CI ジョブで走る前提。本 inquiry での引き継ぎ不要。

#### R4. 後続 cleanup 3 件（HANDOFF §2.3 より）

```text
- components/day-detail/ の sales/hourly tab が Dashboard widget
  (HourlyChart / DrilldownWaterfall / CategoryDrilldown) を absolute import している
  上向き依存の解消
- compat shim Dashboard/widgets/DayDetailModal.styles.ts の解消
  (HourlyWeatherOverlay / HourlyYoYSummary / CategoryDrilldown を新 path に直す)
- RemainingInputPanel.tsx / DrilldownPanel.tsx のさらなる分割で
  responsibilityTag baseline を下げる
```

これらは本 umbrella の sub-project に引き継ぐ対象。

## 扱いの確定

### 結論

**budget-achievement-simulator は以下の手順で完了扱いとする**:

1. 本 Phase 5 の人間承認（R1 吸収）で `完了` 扱いに移行
2. `config/project.json` の `status: "active" → "completed"` に更新（Phase 6 の initial PR で実施）
3. `projects/budget-achievement-simulator/` を `projects/completed/budget-achievement-simulator/` に物理移動（Phase 6 の initial PR）
4. HANDOFF §2「次にやること」は本 umbrella の承認で上書き：
   - R1 人間レビュー → 本 Phase 5 で完了
   - R2 `CURRENT_PROJECT.md` 切替 → 本 umbrella `inquiry/20`
   - R4 cleanup 3 件 → 本 umbrella sub-project に引き継ぎ（下記 mapping）

### R4 cleanup 3 件の sub-project 引き継ぎ mapping

| 後続 cleanup item | 引き継ぎ先 sub-project（inquiry/18） | 対応 ADR / LEG |
|---|---|---|
| components/day-detail → Dashboard widget への上向き依存解消 | **SP-A widget-context-boundary** | ADR-A-002（Dashboard 固有 ctx 分離で依存解消）/ 新 ADR 候補として `ADR-A-005` 追加検討 |
| compat shim DayDetailModal.styles.ts 解消（HourlyWeatherOverlay / HourlyYoYSummary / CategoryDrilldown 新 path 化） | **SP-C duplicate-orphan-retirement** | ADR-C-004（barrel re-export metadata）拡張対象 / LEG-015（barrel metadata 未設定群）の具体候補 |
| RemainingInputPanel.tsx / DrilldownPanel.tsx の分割（responsibilityTag baseline 削減） | **SP-B widget-registry-simplification** | ADR-B-003 / B-004（presentation 層 pure 抽出）の延長 / `responsibilityTagBaseline` 削減 target に追加 |

### inquiry/07 §E の Budget Simulator reboot 継承 7 項目との対応

inquiry/07 §E で整理した Budget Simulator reboot 継承 7 項目のうち、本 inquiry で対応確定する範囲:

| # | 7 項目（inquiry/07 §E） | 本 umbrella での扱い |
|---|---|---|
| 1 | 2 つの `WidgetDef` 型並存 | SP-A / ADR-A-003（`inquiry/18`） |
| 2 | `UnifiedWidgetContext` の universal / page-coupled 非対称 | SP-A / ADR-A-001 + ADR-A-002 |
| 3 | registry 未登録 UI component の機械検出仕組み不在 | SP-C / ADR-C-003（orphan guard）+ SP-A ADR-A-003（interface 重複 guard） |
| 4 | widget 登録の 2 registry 系統分岐 | SP-A / ADR-A-003（分離）の副産物として解消 |
| 5 | pure 関数が hook/component に埋没 | SP-B / ADR-B-003 + ADR-B-004（95 候補が対象） |
| 6 | `features/*/ui/widgets.tsx` 3 件 byte-identical | SP-C / ADR-C-001（LEG-010/011/012） |
| 7 | G5 超過 3 ファイル + DOW 重複 5 箇所 | 上記 R4 の RemainingInputPanel / DrilldownPanel 分割と併せて SP-B に引き継ぎ / DOW 重複は ADR-B-003（pure fn 抽出）の延長で対応 |

本 umbrella sub-project 4 本（SP-A/B/C/D）で **7 項目全て**を cover することを確認。

## budget-achievement-simulator 側の archive 手順

Phase 6 着手時に以下を 1 つの PR で実施する（不可侵 #14 の「Phase 5 まで touch 禁止」が Phase 5 完了で解除される）:

```yaml
archive-budget-achievement-simulator:
  steps:
    - step1: 本 umbrella Phase 5 人間承認を取得
    - step2: budget-achievement-simulator/SUMMARY.md を作成（後続 project 参照用）
    - step3: config/project.json の status を "active" → "completed" に変更
    - step4: projects/budget-achievement-simulator/ を projects/completed/budget-achievement-simulator/ に物理移動
    - step5: CURRENT_PROJECT.md を architecture-debt-recovery に切替（inquiry/20 準拠）
    - step6: references/02-status/open-issues.md の active/completed 表を更新
    - step7: projectCompletionConsistencyGuard で archive 配置の整合性を検証
  guard:
    - projectCompletionConsistencyGuard (既存)
  breakingChange: true (project 物理移動 + CURRENT_PROJECT.md 切替は運用上の破壊的変更)
  rollback:
    - 物理パスを戻す + status を "active" に復元 + CURRENT_PROJECT.md を budget-achievement-simulator に戻す
  deadline: Phase 6 着手時
```

詳細手順の前段（CURRENT_PROJECT.md 切替と guard 運用）は `inquiry/20-current-project-switch-plan.md` で確定。

## 人間承認のスコープ（本 Phase 5 完了条件 #1）

plan.md §3 Phase 5 完了条件「人間承認: budget-achievement-simulator の扱い」に対応。

承認対象:
1. budget-achievement-simulator を **完了扱い**にすること
2. R4 cleanup 3 件を **本 umbrella の SP-A/B/C に引き継ぐ** mapping（上記 §R4 cleanup 3 件 の 3 行）
3. `inquiry/07 §E` の 7 項目全てを SP-A/B/C/D で cover することの確認
4. archive 手順（step1-7）を Phase 6 着手時の最初の PR で実施すること
5. archive 手順内の CURRENT_PROJECT.md 切替タイミングの確定（`inquiry/20` で詳細）

## 非承認スコープの扱い

本 inquiry に記載のない budget-achievement-simulator 関連作業は Phase 6 で実施禁止。新たな引き継ぎが必要と判明した場合:

1. `19a-<slug>.md` addendum 作成
2. 新 ADR or 既存 ADR 拡張で対応先 sub-project を明示
3. 改めて人間承認
4. 承認後に Phase 6 で実施

## 付記

- 本 file は immutable。追加は `19a-*.md` として addend
- 関連: `inquiry/18`（sub-project map）、`inquiry/20`（CURRENT_PROJECT 切替計画）、`inquiry/21`（spawn sequence）、`projects/budget-achievement-simulator/HANDOFF.md`
