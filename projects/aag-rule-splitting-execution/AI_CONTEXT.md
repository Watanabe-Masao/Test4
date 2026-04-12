# AI_CONTEXT — aag-rule-splitting-execution

## Project

AAG ルール分割実行 — AR-STRUCT-RESP-SEPARATION 7 分割
（aag-rule-splitting-execution）

## Purpose

`references/01-principles/aag-rule-splitting-plan.md` で計画されている
AR-STRUCT-RESP-SEPARATION (G8: P2/P7/P8/P10/P12/P17/P18) の 7 分割を実装する。
plan は完成済み (2026-04 時点)、実装は **未着手** (verification: `grep AR-RESP-` = 0)。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力）
5. `references/01-principles/aag-rule-splitting-plan.md`（背景・分割案）

## Why this project exists

AR-STRUCT-RESP-SEPARATION は 7 種類の責務分離パターンを 1 ルールに束ねており、
例外圧 4 件が「どのパターンに属するか」が rule レベルで見えない。分割すれば:
- 例外が AR-RESP-MODULE-STATE に集中していることが明確になる
- 他 6 パターンの健全度が可視化される
- migrationPath をパターンごとに具体化できる

詳細: `references/01-principles/aag-rule-splitting-plan.md` §分割候補 1。

## Scope

含む:
- AR-RESP-STORE-COUPLING (P2)
- AR-RESP-MODULE-STATE (P7)
- AR-RESP-HOOK-COMPLEXITY (P8)
- AR-RESP-FEATURE-COMPLEXITY (P10)
- AR-RESP-EXPORT-DENSITY (P12)
- AR-RESP-NORMALIZATION (P17)
- AR-RESP-FALLBACK-SPREAD (P18)

含まない:
- AR-STRUCT-CONVENTION (F1/F2/F3/F4/F6/F9) の分割 — 別 project（必要なら）
- AR-STRUCT-CANONICALIZATION (G1/E3/F5/F8) の分割 — 同上
- AR-G5-* の分割 — plan で「低優先」と判定済

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/01-principles/aag-rule-splitting-plan.md` | 分割案の正本（背景） |
| `app/src/test/architectureRules/rules.ts` | ルール定義の置き場 |
| `app/src/test/guards/responsibilitySeparationGuard.test.ts` | G8 の現行実装 |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
