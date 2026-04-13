# AI_CONTEXT — test-signal-integrity

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Test Signal Integrity（test-signal-integrity）
品質シグナル保全 — 無価値テストと警告黙らせの機械的防止

## Purpose

品質シグナル（test / coverage / compile / lint）が、本当に品質が上がった結果を
表すようにする。AAG 側で以下を防ぐ:

- coverage 閾値達成だけを目的にした無価値テスト
- 実装の存在確認だけで終わる浅い assertion
- 問題を解決せず `@ts-ignore` / `eslint-disable` などで検知シグナルだけを消す行為
- 「Green だが安心できない」状態を生む品質シグナルの水増し・隠蔽

数値目標（coverage 70 等）を否定するのではなく、**数値を歪める達成手段を
先に禁止する** ことで、application-side project（presentation-quality-hardening 等）が
安心して数値目標に向かえる前提を AAG 側に整える。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則・Signal Integrity 思想・Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. 必要に応じて `references/03-guides/architecture-rule-system.md`（Architecture Rule 運用）
6. 必要に応じて `references/01-principles/adaptive-architecture-governance.md`（AAG 4 層構造）

## Why this project exists

coverage を上げること自体は正しい。しかし coverage を上げるために品質のない
テストを書くなら、数字だけが上がり、実際の保守性や信頼性は上がらない。compile /
lint の `@ts-ignore` / `eslint-disable` も同じで、**問題を解決せず「問題がない
ように見せる」行為** である。

これは application-side project（`presentation-quality-hardening` 等）が個別に
気をつけて済む話ではなく、AAG Core 側で「達成手段を歪めるパターン」を機械的に
止める制度がいる。本 project は、AAG Core の **Signal Integrity** という新原則を
立てて、そのための rule / guard / advisory / response を整備する。

`presentation-quality-hardening` の Phase 3 で残っている `lines: 55 → 70` 引き上げ
の **前提条件** として位置づけられる。本 project が完了すると、application-side が
品質シグナル劣化を心配せずに数値目標を追える。

## Scope

含む:

- Signal Integrity の思想定義（`references/01-principles/`）
- 品質劣化テストパターン（TSIG-TEST-01〜03）の定義
- compiler / linter silencing パターン（TSIG-COMP-01〜03）の定義
- 機械検知できるパターンの guard 化（hard gate 1st batch）
- 新規テスト追加時の advisory 設計
- 固定フォーマットの AAG response 設計（`renderAagResponse` 統合）
- 例外条件 / review-only 条件 / hard gate 条件の明文化
- guide / guard / fix hint / generated doc / guard-test-map.md の整備

含まない:

- coverage 閾値自体の引き上げ → `presentation-quality-hardening` Phase 3 の所掌
- application-side のテスト追加そのもの → 各 application project の所掌
- `roles/` の運用やロールシステムとの統合 → 別 project（必要なら）
- test strategy 全体の包括的再設計
- 「意味があるテスト」を意味論的に完全判定すること（advisory / Discovery Review に逃がす）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule の運用ガイド（追加する rule の正本配置先） |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 4 層構造（Principles / Judgment / Detection / Response） |
| `projects/presentation-quality-hardening/checklist.md` | 本 project の Phase 5 が前提条件として参照する application-side 動線 |
