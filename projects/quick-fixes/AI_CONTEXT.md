# AI_CONTEXT — quick-fixes

## Project

Quick Fixes — 文脈を必要としない単発作業の集約（quick-fixes）

## Purpose

複数 phase の文脈や独立した plan を必要としない、**単発の小さな fix** を集約する
collection project。typo 修正、ファイル分割、リネーム、軽微な refactor、
コメント追加、廃止コードの削除、依存パッケージのバージョン bump 等の受け皿。

「これは独立した project にするほどの文脈を持たない」と判断したものは
全てここに入れる。逆に「複数 phase が必要」「独自の不可侵原則がある」「他の
作業者に context を引き継ぐ必要がある」ものは独立 project にする。

判断基準は `references/03-guides/project-checklist-governance.md` §11 を参照。

## kind = collection

本 project の `config/project.json` には `kind: "collection"` が設定されている。
通常の project と異なり:

- 1 checkbox = 1 単発 fix（再利用しない）
- 完了したら checked にする（archive 不要 — collection は終わらない）
- 100% にならない（continuous）

collector の derivedStatus 判定では `in_progress` のままになる（completed
にならず archive プロセスは発火しない）。本 collection は repo が存在する限り
active であり続ける。

## Read Order

1. 本ファイル
2. `checklist.md`（受け皿の本体）
3. 必要に応じて `plan.md`（書き方ルール）

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 規約の正本（§11 で large vs small の判断基準） |
