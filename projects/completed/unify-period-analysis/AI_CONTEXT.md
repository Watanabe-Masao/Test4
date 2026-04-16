# AI_CONTEXT — unify-period-analysis

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

期間分析統合（固定期間を自由期間プリセットに）（unify-period-analysis）

## Purpose

固定期間ヘッダと自由期間分析を、内部契約レベルで 1 本のレーンに統合する。
UI は固定期間ヘッダを残しつつ、内部では `FreePeriodAnalysisFrame` +
`ComparisonScope` + `readFreePeriodFact()` + `computeFreePeriodSummary()` +
`FreePeriodReadModel` を唯一の経路とする。`StoreResult` 系（単月確定値）
と `FreePeriodReadModel` 系の完全統合は非スコープ。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. `test-plan.md`（AAG 連結前提のテスト計画 — G0〜G6 + L0〜L4）
6. 関連 references/
   - `references/01-principles/free-period-analysis-definition.md`
   - `references/01-principles/data-pipeline-integrity.md`
   - `references/01-principles/temporal-scope-semantics.md`
   - `references/01-principles/critical-path-safety-map.md`
   - `references/03-guides/runtime-data-path.md`

## Why this project exists

固定期間画面と自由期間分析で、比較先日付解決・取得経路・集計ロジックが
二重化する構造的リスクがある。UI を先に変えると比較意味論が漏れて
事故が増えるため、「比較意味論と取得経路を先に固定し、UI を後で載せ替える」
方針を 1 project にまとめる。`pure-calculation-reorg`（Pure 計算責務再編）
や `presentation-quality-hardening`（UI 品質）とは scope を混ぜない。
根拠: `references/03-guides/project-checklist-governance.md` §0
（複数の動線・コンテキストを混ぜない原則）。

## Scope

含む:
- 固定期間ヘッダ状態 → `FreePeriodAnalysisFrame` adapter の導入
- 比較先解決を `ComparisonScope` に一本化（presentation 層から剥がす）
- 自由期間取得経路を `readFreePeriodFact()` / `freePeriodHandler` に統一
- 期間サマリー計算を `computeFreePeriodSummary()` に統一
- `FreePeriodReadModel` を chart 共通入力にするための ViewModel 整理
- SQL と JS の同一集約二重実装の排除（額のみ SQL、率は domain/calculations）
- 本 project 用のガード追加（比較先解決・自由期間取得経路・率計算位置）

含まない:
- `StoreResult` 系と `FreePeriodReadModel` 系の完全統合
- 既存全画面の一括移行（段階的載せ替え）
- 週・月粒度などの自由期間集計拡張
- chart デザイン刷新
- WASM engine の変更

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/01-principles/free-period-analysis-definition.md` | 自由期間分析の正本定義（DuckDB 取得 + pure JS summary） |
| `references/01-principles/data-pipeline-integrity.md` | 額で持ち回し、率は使用直前に domain/calculations で算出 |
| `references/01-principles/temporal-scope-semantics.md` | 期間スコープの分離ルール |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane の 2 系統経路 |
