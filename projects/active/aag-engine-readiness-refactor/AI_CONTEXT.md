# AI_CONTEXT — aag-engine-readiness-refactor

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Engine Readiness Refactor — Go/Rust engine 実装前の TS 構造事前整備
（aag-engine-readiness-refactor）

## Purpose

将来 AAG governance を Go/Rust engine に移すことを前提に、**engine 実装には
入らず**、TypeScript 側の構造を engine 移行可能な形へ事前整備する。
具体的には input / output / path / fixture / pure detector の境界を articulate し、
engine 実装時に「何を再実装すべきか」「何を TS 側に残すか」「どの output が
正しいか」を明確にする。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位と現在地）
3. `plan.md`（不可侵原則 + Phase 0〜7 構造 + commit pattern）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. `projectization.md`（AAG-COA 判定結果 = L3 / architecture-refactor）
6. `decision-audit.md`（DA-α 系 lineage articulation）
7. `discovery-log.md`（scope 外発見蓄積）
8. 必要に応じて `references/05-aag-interface/operations/project-checklist-governance.md` §13（Phase landing 二段 commit pattern 等）

## Why this project exists

repo の AAG framework は現状 100% TypeScript で実装されている（collector /
detector / renderer / hard gate / KPI / generated artifact）。将来 Go/Rust
engine に一部 (= Archive v2 / project lifecycle / doc registry / generated
metadata 等の app-agnostic 部分) を移す候補があるが、**現実装には engine
移行を阻害する暗黙前提が多数埋まっている**:

- collector / detector / renderer が混在（fs / glob / Vitest を直接呼ぶ）
- 失敗出力が文字列ベースで machine-readable な DetectorResult 構造になっていない
- path 正規化が detector 内に散在
- pure detector と Vitest wrapper が分離されておらず、parity test が書きづらい
- fixture corpus が存在せず、Go/Rust engine が同じ input/output を再現できることを保証する手段がない

これらを engine 実装前に解消する事前リファクタリングがなければ、engine 実装
project が start した瞬間に「TS 側を直す」「engine 側を実装する」「parity
test を書く」が同時並行となり、責務分離が崩れる。**engine 実装に入る前に
TS 側を engine 移行可能形に整える**ことが本 project の単一の目的。

## Scope

含む（implementationScope）:

- `tools/architecture-health/` — collector / detector / evaluator / renderer 分離
- `app/src/test/guards/` — pure detector 抽出対象（archive / project lifecycle / doc-registry / generated metadata 系のみ）
- `references/03-implementation/aag-engine-readiness-inventory.md` — engine input 棚卸し（Phase 1 で landing）
- `fixtures/aag/` — Archive v2 / project lifecycle / doc-registry の pass/fail fixture corpus（Phase 5 で landing）

含まない（nonGoals — `config/project.json` 参照）:

- Go engine / Rust engine 実装そのもの（本 project archive 後に別 program として起票）
- 既存 guard の意味変更 / hard gate 追加 / KPI 閾値変更（不可侵原則 2 で禁止）
- app-specific TS guard（calculation / presentation / domain 系）の engine 化
- 実装 AI による自己承認（最終レビュー = user 承認 必須、L3 規約）

## Phase 構造（要約）

詳細は `plan.md` を参照。

| Phase | 名称 | 目的 |
|---|---|---|
| 0 | Bootstrap / Scope Lock | project 起票 + scope / non-goals / authority / commit pattern 固定 |
| 1 | AAG Input Inventory | engine が将来読む input boundary を inventory 化 |
| 2 | DetectorResult / AagResponse Normalization | 失敗出力を machine-readable 構造に寄せる |
| 3 | Collector / Detector / Renderer 分離 | 責務分離、pure detector 抽出可能性を上げる |
| 4 | Path Normalization / RepoFileIndex | path 前提統一、engine 移行で壊れやすい部分の局所化 |
| 5 | Archive v2 / Project Lifecycle Fixture Corpus | parity test 用 fixture を整備 |
| 6 | Pure Detector Extraction | Vitest wrapper と pure logic を分離（最低 3 系統） |
| 7 | Engine Readiness Report / No-Go Boundary | Go engine MVP scope と移植禁止領域を articulate、user 承認 |

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/05-aag-interface/operations/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A）、特に §13.1〜§13.3 の Phase 進行 commit pattern |
| `references/05-aag-interface/operations/projectization-policy.md` | AAG-COA 判定基準、L3 required artifacts |
| `references/05-aag-interface/protocols/complexity-policy.md` §3.4 | L3 重変更 routing（DA institute + judgement commit + 振り返り判定） |
| `aag/_internal/architecture.md` | 5 層構造（本 project は Layer 3 Execution の structural refactor） |
| `aag/_internal/source-of-truth.md` | engine 移行で守るべき正本ポリシー |
| `tools/architecture-health/` | 本 project の主な refactor 対象 |
| `app/src/test/guards/` | pure detector 抽出元 |
