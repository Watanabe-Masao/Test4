# AI_CONTEXT — calendar-modal-route-unification

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

カレンダーモーダル正規ルート統一 — `useDayDetailPlan` のデータ取得経路を
ダッシュボードと同じ正本 lane に集約する（calendar-modal-route-unification）

## Purpose

カレンダーモーダル（`useDayDetailPlan`）は `categoryTimeRecordsHandler` を直接呼び、
前年データ取得に独自フォールバック（`selectCtsWithFallback`）を持つ。
ダッシュボードは `categoryDailyLane.bundle` 経由の正本経路。
この二重経路が「モーダルでは動くがダッシュボードでは動かない」（あるいは逆の）
バグの構造的原因となるため、handler / bundle 経由に一本化して経路を 1 本に集約する。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 必要に応じて関連 references/ ドキュメント

## Why this project exists

`data-flow-unification` は IndexedDB → DuckDB の前年データロード経路を
1 本に統合し、`is_prev_year=true` 行の完全性を保証した。
しかし read 側のモーダル経路（`useDayDetailPlan`）は依然として独自経路を持ち、
ダッシュボードと同じ正本経路（`categoryDailyLane.bundle` / `timeSlotLane.bundle`）を
通っていない。「モーダルでは動くがダッシュボードでは動かない」あるいはその逆の
構造的バグ温床になるため、本 project はモーダル read path の統一に閉じる。
根拠: `references/03-guides/project-checklist-governance.md` §0
（複数の動線・コンテキストを混ぜない原則）。

## Scope

含む:
- カレンダーモーダル（`useDayDetailPlan`）の handler 一本化（Phase A）
- 数量・時間帯データの bundle 経由化（Phase B）
- `selectCtsWithFallback` の独自フォールバック機構の廃止
- 統一後の旧経路撤退判定（`categoryDailyLaneSurfaceGuard` baseline 検証）
- 経路統一を保証するガードテスト追加

含まない:
- leaf-grain CTS（5要素分解）の正本化（Phase C: 別 project として計画）
- IndexedDB → DuckDB のロード経路（`data-flow-unification` で完了）
- pure 計算責務の再編（`pure-calculation-reorg` の scope）
- Presentation 層の品質改善（`presentation-quality-hardening` の scope）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane の 2 系統経路 |
| `references/01-principles/data-pipeline-integrity.md` | データパイプライン整合性の設計思想 |
| `projects/completed/data-flow-unification/HANDOFF.md` | 先行 project（archive 後パスは completed/ 配下を想定）。§5 に Phase A/B/C の原計画 |
