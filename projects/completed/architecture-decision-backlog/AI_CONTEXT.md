# AI_CONTEXT — architecture-decision-backlog

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

アーキテクチャ判断 backlog — 未決定の設計判断
（architecture-decision-backlog）

## Purpose

「実装はまだ着手していないが、設計判断が必要な項目」を集約する decision queue。
他 project と異なり、本 project の checklist は「決定する」ことを各 item の完了
条件とする（実装ではなく judgement 作業）。

決定後の実装は別 project に分離される。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在の決定対象一覧）
3. `plan.md`（判断基準と禁止事項）
4. `checklist.md`（決定すべき項目）

## Why this project exists

新しいリスクや課題が発見されたとき、すぐに実装に入るのではなく
まず方針判断が必要なケースが定期的に発生する。それらが他 project に紛れ込むと
実装作業と判断作業が混ざって優先順位がぶれる。本 project はそれを切り分ける
ための受け皿。

## Scope

含む（verified LIVE 2026-04-12）:
- R-9: ロールシステム軽量化（`roles/` 配下 16 ファイルの AI セッション読み込みコスト改善）

含まない:
- 既に決定済みでスケジュール待ちの実装作業（→ 該当 implementation project へ）
- 議論レベルの speculative item（→ docs-and-governance-cohesion でガードを追加して投入を防ぐ）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/02-status/open-issues.md` | R-9 の元出典（背景） |
| `roles/` | R-9 の対象範囲 |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
