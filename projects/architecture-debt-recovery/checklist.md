# checklist — architecture-debt-recovery

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは `plan.md` に書く。
>
> 規約: `references/03-guides/project-checklist-governance.md` §3。
> 形式: `* [ ]` または `* [x]` の半角スペース。ネスト不可。
> 各 checkbox は単一の機械的に検証可能な達成条件を表す。
>
> **必須構造**: 最後の Phase は「最終レビュー (人間承認)」とし、
> 機能的な作業がすべて [x] になった後でも 1 つ以上 [ ] が残るようにする。

## Phase 0: Scaffold（bootstrap）

* [x] `projects/_template/` を `projects/architecture-debt-recovery/` にコピーした
* [x] `config/project.json` を実値に置換した（projectId / title / status=draft）
* [x] `AI_CONTEXT.md` を why / scope / lineage / read order で埋めた
* [x] `plan.md` を不可侵原則 / Phase 1-7 / 禁止事項で埋めた
* [x] `HANDOFF.md` を現在地 / 次にやること / ハマりポイントで埋めた
* [x] `aag/execution-overlay.ts` を初期状態で埋めた（空または最小 override）
* [x] `inquiry/` ディレクトリを作成し、Phase 1 成果物置き場を用意した

## Phase 1: Inquiry（棚卸し）

* [x] `inquiry/01-widget-registries.md` を作成した（9 registry × 全 widget の網羅台帳）
* [x] `inquiry/02-widget-ctx-dependency.md` を作成した（ctx field 使用 map）
* [x] `inquiry/03-ui-component-orphans.md` を作成した（registry 未登録 UI component 列挙）
* [x] `inquiry/04-type-asymmetry.md` を作成した（`WidgetDef` 2 型 + `UnifiedWidgetContext` page-local 棚卸し）
* [x] `inquiry/05-pure-fn-candidates.md` を作成した（hook / component 内の pure 計算候補）
* [x] `inquiry/06-data-pipeline-map.md` を作成した（`InsightData` / `costDetailData` / readModel 経路）
* [x] `inquiry/07-complexity-hotspots.md` を作成した（行数 / useMemo 数 / ctx touched 数 + Budget Simulator 7 項目）
* [x] `inquiry/08-ui-responsibility-audit.md` を作成した（UI 層の責務分離監査。`presentation/` + `features/*/ui/` に C8 1 文説明テストを適用 + P2-P18 分布）
* [x] inquiry 全ファイルに事実源（ファイルパス / 行番号 / commit hash）が付記されている
* [x] inquiry 全ファイルに意見 / recommendations / 改修案が書かれていないことを確認した
* [x] Phase 1 期間中にコード変更を一切行わなかったことを `git log` で確認した

## Phase 2: 真因分析

* [ ] `inquiry/09-symptom-to-hypothesis.md` を作成した（各症状 2 つ以上の仮説）
* [ ] `inquiry/10-hypothesis-interaction.md` を作成した（仮説間の相互作用）
* [ ] `inquiry/11-recurrence-pattern.md` を作成した（既存対策の回避経緯）
* [ ] 主要症状に対し単一原因への帰着解釈を明示的に拒否した
* [ ] 各仮説に検証可能な形（「X を変えると Y が起きるはず」等）が付与されている
* [ ] architecture ロール review 完了
* [ ] Phase 2 期間中にコード変更を一切行わなかったことを `git log` で確認した

## Phase 3: 原則制定

* [ ] `inquiry/12-principle-candidates.md` を作成した（設計原則 v2 候補）
* [ ] `inquiry/13-invariant-candidates.md` を作成した（新規不変条件候補 + guard 設計前書き）
* [ ] `inquiry/14-rule-retirement-candidates.md` を作成した（既存原則の廃止・統合候補）
* [ ] 各原則候補に対応する真因仮説（Phase 2）が紐付いている
* [ ] 各原則候補に既存 9 カテゴリとの差分（追加 / 上書き / 削除）が明記されている
* [ ] 各原則候補に機械検出方法の粗設計が記載されている
* [ ] 各原則候補に sunsetCondition が記載されている
* [ ] 本 Phase では `references/01-principles/` / `docs/contracts/principles.json` を一切 touch していないことを確認した
* [ ] architecture ロール review 完了

## Phase 4: 改修計画

* [ ] `inquiry/15-remediation-plan.md` を作成した（改修単位・依存順・影響範囲・4 ステップ pattern 記載）
* [ ] `inquiry/16-breaking-changes.md` を作成した（破壊的変更の完全 list）
* [ ] `inquiry/17-legacy-retirement.md` を作成した（レガシー撤退 list + 撤退期限）
* [ ] `inquiry/18-sub-project-map.md` を作成した（sub-project の scope / 成功条件 / 依存順）
* [ ] 全改修に「新実装 → 移行 → 削除 → guard」の 4 ステップが記載されている
* [ ] 全改修にレガシー撤退が紐付いている（「新実装のみ追加」が存在しない）
* [ ] 全破壊的変更に rollback 手順が記載されている
* [ ] sub-project 依存グラフが閉路を含まない
* [ ] pm-business + architecture ロール合意
* [ ] 人間承認: 破壊的変更 list と sub-project 立ち上げ順序

## Phase 5: 既存 project 整理

* [ ] `inquiry/19-predecessor-project-transition.md` を作成した（`budget-achievement-simulator` の扱い確定）
* [ ] `inquiry/20-current-project-switch-plan.md` を作成した（`CURRENT_PROJECT.md` 切替計画）
* [ ] `inquiry/21-spawn-sequence.md` を作成した（sub-project 立ち上げ順序）
* [ ] `budget-achievement-simulator` cleanup 7 項目の引き継ぎ先 sub-project が確定している
* [ ] 本 project の `config/project.json` の `status: "draft"` → `"active"` 変更承認済
* [ ] `open-issues.md` の active projects 表更新方針が確定している
* [ ] 人間承認: `budget-achievement-simulator` の扱い
* [ ] 人間承認: 本 project の `active` 昇格

## Phase 6: 実装 + レガシー撤退

> **注意**: 本 Phase は複数 sub-project が並列で進行する。以下の checkbox は
> umbrella 側の完了判定。各 sub-project の完了判定は sub-project 側の checklist で行う。

* [ ] Phase 4 の `18-sub-project-map.md` に載る全 sub-project が completed 昇格した
* [ ] Phase 4 の `16-breaking-changes.md` に載る全破壊的変更が実施された
* [ ] Phase 4 の `17-legacy-retirement.md` の**全項目が削除済み**（レガシー残存 0）
* [ ] Phase 3 の不変条件候補が `references/03-guides/invariant-catalog.md` に登録され guard test 実装済
* [ ] Phase 3 の原則候補が `references/01-principles/` に配置され `docs/contracts/principles.json` に登録済
* [ ] 各 sub-project で 4 ステップ pattern（新実装 / 移行 / 削除 / guard）が完遂されたことを確認した
* [ ] 各 sub-project の CI 全通過（test:guards / build / lint / test:visual / docs:check）を確認した
* [ ] runtime 回帰テスト（visual / E2E）で主要機能の無回帰を確認した
* [ ] `references/02-status/generated/architecture-health.json` の KPI が改善または不変であることを確認した
* [ ] 計画外の破壊的変更 / rename が混入していないことを `16-breaking-changes.md` との突合で確認した

## Phase 7: 完了 + handoff

* [ ] `projects/architecture-debt-recovery/SUMMARY.md` を作成した（後続 project 参照用。Phase 7 末尾の archive 移動で `projects/completed/architecture-debt-recovery/SUMMARY.md` に移る） 
* [ ] `references/02-status/open-issues.md` の active/completed projects 表を更新した
* [ ] `CLAUDE.md` の generated section を最新化した（`docs:generate` + `docs:check` PASS）
* [ ] `npm run test:guards` PASS
* [ ] `npm run build` PASS
* [ ] `npm run lint` PASS
* [ ] `npm run format:check` PASS
* [ ] 後続の未完タスクがあれば別 project として identify した（scope 外持ち越しなし）
* [ ] `projects/architecture-debt-recovery/` を `projects/completed/architecture-debt-recovery/` に移動した
* [ ] `config/project.json` の `status: "active"` → `"completed"` に更新した

## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/03-guides/project-checklist-governance.md` §3.1 / §6.2

* [ ] 全 Phase の成果物 (commit / PR / inquiry/ 全 21 ファイル / 昇格した原則 / archive 移動) を人間がレビューし、archive プロセスへの移行を承認する
