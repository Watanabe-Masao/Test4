# AI_CONTEXT — data-flow-unification

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

前年データフロー統合 — IndexedDB to DuckDB 経路の一本化（data-flow-unification）

## Purpose

前年データ（CTS、time_slots、flowers/customers）が DuckDB に確実にロードされない
問題を解決する。2 つの auto-load 機構（`useAutoLoadPrevYear` legacy +
`useLoadComparisonData` new）が共存しており、IndexedDB -> dataStore -> DuckDB の
データフローにギャップがある。本 project はこれを単一の信頼できる経路に統合し、
`is_prev_year=true` データの完全性を保証する。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 必要に応じて関連 references/ ドキュメント

## Why this project exists

前年比較チャートが空白になる事象の根本原因は、前年データのロード経路が
二重化・不完全であることにある。`useAutoLoadPrevYear`（legacy）と
`useLoadComparisonData`（new、ComparisonScope 対応）が併存し、
どちらが責任を持つか曖昧な状態になっている。
`data-load-idempotency-hardening`（archived）はロード境界の冪等性を保証したが、
「何をロードするか」の網羅性は scope 外だった。
`pure-calculation-reorg` は計算責務の再編であり、データ取得経路は scope 外。
本 project はデータフロー統合に閉じる。
根拠: `references/03-guides/project-checklist-governance.md` §0
（複数の動線・コンテキストを混ぜない原則）。

## Scope

含む:
- `useAutoLoadPrevYear` と `useLoadComparisonData` の統合判断・実施
- 前年データの DuckDB ロード網羅性の保証（全テーブル・全スライス）
- `is_prev_year=true` データの整合性検証
- fingerprint ベースのキャッシュ戦略の前年データ対応
- データフロー整合性のガードテスト追加

含まない:
- ロード境界の冪等性（`data-load-idempotency-hardening` で解決済み）
- Pure 計算責務の再編（`pure-calculation-reorg` の scope）
- UI コンポーネントの品質改善（`presentation-quality-hardening` の scope）
- DuckDB クエリ自体の最適化
- WASM engine の変更

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性の設計思想 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane の 2 系統経路 |
| `projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md` | 冪等性保証の先行 project（archived） |
