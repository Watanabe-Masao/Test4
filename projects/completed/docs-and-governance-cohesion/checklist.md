# checklist — docs-and-governance-cohesion

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 常時チェック / 恒久ルールは plan.md に書く。

## Phase 1: 規約の正本ガイド作成

* [x] `references/03-guides/project-checklist-governance.md` を作成した
* [x] §0 で「ドキュメントはその機能を説明するためにある。そこに課題が紛れるとノイズになる」を基本思想として明記した
* [x] completed / archived / in_progress の定義を §2 で固定した
* [x] checklist に書いてよいもの / 書いてはいけないものを §3 で固定した
* [x] project ディレクトリ構造と config/project.json schema を §4 で定義した
* [x] CURRENT_PROJECT.md と active project の関係を §5 で定義した
* [x] archive 手順を §6 で明文化した（後に §6.2 に lifecycle 全体として拡張）

## Phase 2: live project スケルトン作成

* [x] `projects/data-load-idempotency-hardening/` 一式 (AI_CONTEXT / HANDOFF / plan / checklist / config) を作成した
* [x] `projects/presentation-quality-hardening/` 一式を作成した
* [x] `projects/docs-and-governance-cohesion/` 一式を作成した
* [x] `projects/architecture-decision-backlog/` 一式を作成した
* [x] `projects/aag-rule-splitting-execution/` 一式を作成した
* [x] `projects/quick-fixes/` 一式を `kind: collection` で作成した（small fix lane）
* [x] `projects/_template/` 一式を bootstrap テンプレートとして作成した

## Phase 3: 既存 docs から live task を各 project に移管

* [x] verification (2026-04-12) で各 task が LIVE / DONE / STALE / PARTIAL であることを確定する
* [x] data-load-idempotency-hardening の checklist に LIVE 項目だけを転記する
* [x] presentation-quality-hardening の checklist に LIVE 項目だけを転記する (Phase 1: WeatherPage / Phase 2: 3 component / Phase 3: coverage + E2E)
* [x] architecture-decision-backlog の checklist に R-9 (roles 軽量化) を追加する
* [x] aag-rule-splitting-execution の checklist に AR-RESP-* 7 ルール分割を追加する
* [x] DONE / STALE と確定した項目（active-debt 残 5 件 / IntegratedSalesChart / StorageManagementTab / ComparisonWindow 波及 / R-1 / dataVersion / store_day_summary / feature ownership / temporal Phase 4-5）を意図的に checklist に入れない方針を決定した

## Phase 4: references/ を機能説明だけに縮退

* [x] `references/03-guides/data-load-idempotency-plan.md` から live Done 定義を削除し、背景・歴史だけを残す
* [x] `references/03-guides/data-load-idempotency-handoff.md` から「次にやること」を削除し、`projects/data-load-idempotency-hardening/` への導線だけを残す
* [x] `references/03-guides/read-path-duplicate-audit.md` から「推奨事項」優先順位を削除し、分類根拠だけを残す
* [x] `references/03-guides/active-debt-refactoring-plan.md` を「歴史的計画書」に縮退し冒頭に「live は projects/presentation-quality-hardening を参照」を追加
* [x] `references/01-principles/aag-rule-splitting-plan.md` を「設計記録」に縮退し冒頭に projects/aag-rule-splitting-execution への導線を追加
* [x] 縮退後の各文書冒頭に「live task は projects/<id>/checklist.md を参照」の導線を入れる

## Phase 5: open-issues.md の縮退

* [x] 「現在の課題」「将来のリスク」「次に取り組むべきこと」セクションを削除する
* [x] 「active project 索引」セクションを新設し、6 project + quick-fixes へのリンク表だけを残す
* [x] 「解決済み」セクションは履歴として残置する
* [x] kind 列を追加し large project / collection を視覚的に区別する

## Phase 6: technical-debt-roadmap.md の縮退 + pure-calculation-reorg 文脈分離

* [x] technical-debt-roadmap.md の冒頭に「judgment rationale 文書」role を明示する
* [x] 「live task は本文書に書かない」banner を追加する
* [x] generated section (architecture-health-summary) は残置する
* [x] pure-calculation-reorg/AI_CONTEXT.md から「次の重心: データロード冪等化」誤導線を削除する
* [x] pure-calculation-reorg/AI_CONTEXT.md に「Scope の境界」セクションを追加し他 project との分離を明示する
* [x] pure-calculation-reorg/HANDOFF.md から「最優先: データロード層の根本改善」を削除する

## Phase 7: project checklist collector 追加

* [x] `tools/architecture-health/src/collectors/project-checklist-collector.ts` を新設する
* [x] `projects/**/config/project.json` を列挙して checklist を読む
* [x] checked / total / derivedStatus を per-project KPI として返す
* [x] `_template/` および `_` で始まる directory は自動 skip する
* [x] `projects/completed/` 配下も列挙して `derivedStatus = archived` を出力する
* [x] `kind: "collection"` を認識し `derivedStatus = collection` を出力する
* [x] 「やってはいけないこと」「常時チェック」「最重要項目」セクション内の checkbox を集計から除外する
* [x] 既存 collector の HealthKpi 型に整合させて 7 KPI を出力する

## Phase 8: checklist format guard 追加

* [x] `app/src/test/guards/checklistFormatGuard.test.ts` を新設する
* [x] F1: 必須ファイル欠落 (entrypoints.checklist が存在しない) を検出する
* [x] F2: `* [x]` / `* [ ]` 以外の形式を検出する
* [x] F3: 「やってはいけないこと」セクション内の checkbox を検出する
* [x] F4: 「常時チェック」セクション内の checkbox を検出する
* [x] F5: 「最重要項目」セクション内の checkbox を検出する
* [x] error message に projects/_template/ への誘導と governance §3 への参照を含める
* [x] `pure-calculation-reorg/checklist.md` を ratchet-down EXEMPT に登録する

## Phase 9: completion consistency guard 追加

* [x] `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` を新設する
* [x] C1: completed なのに archive 未実施 を検出し、error message に archive 7 ステップを完全列挙する
* [x] C2: CURRENT_PROJECT.md の active が実在 project を指すことを検証する
* [x] C3: CURRENT_PROJECT.md の active が archive 済みを指していないことを検証する
* [x] C4: references/ 文書中の `projects/<id>/...` 参照が dead-link になっていないことを検証する
* [x] kind: collection は C1 から除外する
* [x] consistency guard が CI で PASS することを確認する

## Phase 10: generated project-health 追加

* [x] `tools/architecture-health/src/renderers/project-health-renderer.ts` を新設する
* [x] `references/02-status/generated/project-health.json` の生成器を追加する
* [x] `references/02-status/generated/project-health.md` の view (人間可読) を追加する
* [x] サマリー表 + projects 表を出力する
* [x] `npm run docs:generate` で再生成されることを確認する
* [x] `npm run docs:check` の collector 一覧にも追加し 39 KPIs を計測する

## Phase 11: architecture-health に project KPI 統合

* [x] health-rules.ts に project.checklist.* のしきい値を追加する
* [x] `project.checklist.completedNotArchivedCount` を hard_gate (eq 0) で固定する
* [x] diagnostics.ts の INDICATOR_GROUPS に「Project Governance」カテゴリを追加する
* [x] architecture-health-certificate.md に Project Governance 行が出ることを確認する
* [x] consistency guard と health hard gate の二重防御が機能することを確認する

## Phase 12: projects/completed/ 導入

* [x] `projects/completed/.gitkeep` を作成する
* [x] `projects/completed/README.md` を作成し物理 archive 先として明示する
* [x] README に AAG 機械的保証の対応表 (collector / health KPI / consistency guard / health-rules) を記載する

## Phase 13: archive 手順固定

* [x] `references/03-guides/project-checklist-governance.md` §6.2 に archive 必須 8 ステップを明文化する
* [x] §6.2 に「関連正本の更新」table を追加し、project 種別別の更新義務を固定する
* [x] §6.3 に「立ち上げからクローズまでの一例」10 ステップを行為者・検証手段つきで記載する
* [x] CURRENT_PROJECT.md 更新 / open-issues.md 索引更新 / HANDOFF 末尾追記 のステップを明記する

## Phase 14: 大きな project と小さな fix の使い分け（補強）

* [x] governance ガイド §11 に「large vs small の判断基準」を 5 軸 + 5 質問で固定する
* [x] §11.2 で quick-fixes の置き場と書き方を定義する
* [x] §11.3 で `kind: collection` の特徴 (continuous / archive しない) を明文化する
* [x] §11.4 で「fix だったが依存関係が複雑で大掛かり」になった時の **昇格シグナル + 5 ステップ昇格手順** と降格手順 (可逆) を固定する
* [x] §10 bootstrap 手順の冒頭に「小さな fix は quick-fixes に 1 行追加するだけ」のショートカットを追加する
* [x] CLAUDE.md ドキュメント運用原則の冒頭に基本思想を追加する
* [x] CLAUDE.md Obligation Map に `projects/` 行を追加する
* [x] aag-5-constitution.md Layer 4A System Operations に project-checklist-governance.md と open-issues.md を追加する
