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
* [x] archive 手順を §6 で明文化した

## Phase 2: 5 live project スケルトン作成

* [x] `projects/data-load-idempotency-hardening/` 一式 (AI_CONTEXT / HANDOFF / plan / checklist / config) を作成した
* [x] `projects/presentation-quality-hardening/` 一式を作成した
* [x] `projects/docs-and-governance-cohesion/` 一式を作成した
* [ ] `projects/architecture-decision-backlog/` 一式を作成する
* [ ] `projects/aag-rule-splitting-execution/` 一式を作成する

## Phase 3: 既存 docs から live task を 5 project に移管

* [x] verification (2026-04-12) で各 task が LIVE / DONE / STALE / PARTIAL であることを確定する
* [x] data-load-idempotency-hardening の checklist に LIVE 項目だけを転記する
* [x] presentation-quality-hardening の checklist に LIVE 項目だけを転記する (Phase 1: WeatherPage / Phase 2: 3 component / Phase 3: coverage + E2E)
* [ ] architecture-decision-backlog の checklist に R-9 (roles 軽量化) を追加する
* [ ] aag-rule-splitting-execution の checklist に AR-RESP-* 7 ルール分割を追加する

## Phase 4: references/ を機能説明だけに縮退

* [ ] `references/03-guides/data-load-idempotency-plan.md` から live Done 定義を削除し、背景・歴史だけを残す
* [ ] `references/03-guides/data-load-idempotency-handoff.md` から「次にやること」を削除し、`projects/data-load-idempotency-hardening/` への導線だけを残す
* [ ] `references/03-guides/read-path-duplicate-audit.md` から「推奨事項」優先順位を削除し、分類根拠だけを残す
* [ ] `references/03-guides/active-debt-refactoring-plan.md` を「歴史的計画書」に縮退し冒頭に「live は projects/presentation-quality-hardening を参照」を追加
* [ ] 縮退後の各文書冒頭に「live task は projects/<id>/checklist.md を参照」の導線を入れる

## Phase 5: open-issues.md の縮退

* [ ] 「現在の課題」「将来のリスク」「次に取り組むべきこと」セクションを削除する
* [ ] 「active project 索引」セクションを新設し、5 project へのリンク表だけを残す
* [ ] 「解決済み」セクションは履歴として残置する

## Phase 6: technical-debt-roadmap.md の縮退

* [ ] live な改善 project 表 (P1-P9 等) を削除する
* [ ] judgment rationale (どの優先順位で何をやる/やらないか) だけを残す
* [ ] generated section (architecture-health-summary) は残置する

## Phase 7: project checklist collector 追加

* [ ] `tools/architecture-health/src/collectors/project-checklist-collector.ts` を新設する
* [ ] `projects/**/config/project.json` を列挙して checklist を読む
* [ ] checked / total / derivedStatus を per-project KPI として返す
* [ ] 既存 collector (obligation-collector 等) の lib を流用して整合させる
* [ ] collector の単体テスト `project-checklist-collector.test.ts` を追加する

## Phase 8: checklist format guard 追加

* [ ] `app/src/test/guards/checklistFormatGuard.test.ts` を新設する
* [ ] ネスト checkbox を検出する
* [ ] 「やってはいけないこと」セクション内の checkbox を検出する
* [ ] 「常時チェック」セクション内の checkbox を検出する
* [ ] `* [x]` / `* [ ]` 以外の形式を検出する
* [ ] `pure-calculation-reorg/checklist.md` の現状形式と互換するよう exempt list を入れる

## Phase 9: completion consistency guard 追加

* [ ] `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` を新設する
* [ ] CURRENT_PROJECT.md の `active` が実在 project を指すことを検証する
* [ ] active project が `projects/completed/` 配下にないことを検証する
* [ ] collector が completed と判定した project は `projects/completed/` に配置されていることを検証する
* [ ] consistency guard が CI で PASS することを確認する

## Phase 10: generated project-health 追加

* [ ] `references/02-status/generated/project-health.json` の生成器を追加する
* [ ] `references/02-status/generated/project-health.md` の view を追加する
* [ ] `npm run docs:generate` で再生成されることを確認する

## Phase 11: architecture-health に project KPI 統合

* [ ] architecture-health.md に project KPI セクションを追加する
* [ ] architecture-health.json に project metrics を追加する
* [ ] hard gate に「inconsistent active = 0」「未配置 completed = 0」を含める

## Phase 12: projects/completed/ 導入

* [ ] `projects/completed/.keep` を作成する
* [ ] `references/03-guides/project-checklist-governance.md` §6 を参照する形で archive 先として明示する

## Phase 13: archive 手順固定

* [ ] `references/03-guides/project-checklist-governance.md` §6 の archive 手順を runbook として完成させる
* [ ] CURRENT_PROJECT.md 更新 / open-issues.md 索引更新 / HANDOFF 末尾追記 のステップを明記する
