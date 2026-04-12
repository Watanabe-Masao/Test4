# AI_CONTEXT — data-load-idempotency-hardening

## Project

データロード冪等化 — 残存防御の固定化（data-load-idempotency-hardening）

## Purpose

idempotent load contract Phase 0-3 で本体スコープがクローズした後の
**残存防御** を 1 つの project に集約する。FRAGILE クエリへの回帰テスト追加、
purchaseComparison.ts / freePeriodFactQueries.ts の pre-aggregate 化、
FRAGILE / PARTIAL クエリへの JSDoc 前提明示が対象。

本 project の live task は `checklist.md` のみが正本。`references/03-guides/`
配下の plan / handoff / audit は **背景文書** であり、live task table は持たない。

## Read Order

1. 本ファイル（project の意味と read order）
2. `HANDOFF.md`（完了済みと次にやること）
3. `plan.md`（原則と Phase 定義）
4. `checklist.md`（completion 判定の入力 — required checkbox の集合）
5. 必要に応じて `references/03-guides/data-load-idempotency-plan.md`（背景・歴史）
6. 必要に応じて `references/03-guides/read-path-duplicate-audit.md`（FRAGILE 分類根拠）

## Why this project exists

idempotent load contract Phase 0-3 までで:

- ロード境界の冪等性が機械的にロックされた（`dataLoaderPureFunctions.test.ts` 4 件）
- read-path 重複耐性 spot audit で FRAGILE 6 / PARTIAL 3 / SAFE が分類された
- 共有 helper / @risk JSDoc / 防御コメントが入った（PR A-C, 2026-04-12）
- FRAGILE 1, 2, 6 は pre-aggregate refactor 済み（PR D, E, 2026-04-12）

残るのは:

- FRAGILE 3, 4, 5 (querySpecialSalesDaily / queryTransfersDaily / querySalesTotal)
  の `.fails` テストを永続的に管理するか refactor するかの方針確定
- 既存 plan/handoff/audit の docs と project の境界を整える運用

これらの live 項目を pure-calculation-reorg や他の docs に分散させず、
本 project の checklist にのみ書く。

## 関連文書（背景）

| 文書 | 役割 |
|---|---|
| `references/03-guides/data-load-idempotency-plan.md` | 背景・Phase 履歴 |
| `references/03-guides/data-load-idempotency-handoff.md` | 旧 handoff（本 project AI_CONTEXT に置き換わる） |
| `references/03-guides/read-path-duplicate-audit.md` | FRAGILE 分類根拠 |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
