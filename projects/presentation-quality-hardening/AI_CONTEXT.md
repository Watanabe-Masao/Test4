# AI_CONTEXT — presentation-quality-hardening

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

Presentation 品質強化（presentation-quality-hardening）

## Purpose

Presentation 層のテストカバレッジ・E2E 業務フロー・コンポーネント複雑性に
関する live 課題を 1 つの project に集約する。これまで `open-issues.md` /
`technical-debt-roadmap.md` / `active-debt-refactoring-plan.md` に分散していた
作業項目を本 project の `checklist.md` だけに正本化する。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（Phase 構造と判断基準）
4. `checklist.md`（completion 判定の入力）
5. 必要に応じて `references/03-guides/active-debt-refactoring-plan.md`（背景・Phase H/I/J 詳細）
6. 必要に応じて `references/02-status/open-issues.md`（active project 索引）

## Why this project exists

repo の品質基盤に関する live 課題が 3 つの文書に散らばっていた:

- `open-issues.md`: C-1 (Presentation テスト不足), R-4 (500 行超), 次に取り組む 5 (Phase 6)
- `technical-debt-roadmap.md`: 改善 project P5 / P6 等
- `active-debt-refactoring-plan.md`: Phase H/I/J 残 7 件

これらは全て「Presentation 層の複雑性 / テスト不足」という同根の課題で、
project として 1 本にまとめるほうが優先順位を一元管理できる。

## Scope

含む:
- active-debt 残 7 件 (Phase H/I/J: WeatherPage / InventorySettings / useCostDetailData / useMonthDataManagement)
- 500 行超コンポーネントの `.vm.ts` 抽出（IntegratedSalesChart / StorageManagementTab / HourlyChart / InsightTabBudget/Forecast 等）
- Presentation 層のコンポーネントテスト追加
- coverage 閾値 55→70%
- E2E 業務フロー拡充（現在 5 spec のみ）
- ComparisonWindow 契約の波及（useClipExportPlan 等の他 plan hook に comparisonProvenance 追加）

含まない:
- domain/ や application/ の純粋関数のテスト追加（別 project）
- DuckDB クエリ層（data-load-idempotency-hardening 配下）
- AAG ルール / guard の追加（aag-rule-splitting-execution 等）
