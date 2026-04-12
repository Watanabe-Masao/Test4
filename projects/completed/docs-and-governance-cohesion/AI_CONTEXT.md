# AI_CONTEXT — docs-and-governance-cohesion

## Project

ドキュメントと課題の分離 — projects/ 一元化と AAG 統合
（docs-and-governance-cohesion）

## Purpose

> **ドキュメントはその機能を説明するためにある。そこに課題が紛れるとノイズになる。**

repo 全体で、ドキュメント（機能説明）と課題（live 作業項目）を構造的に分離する。
具体的には:

1. live な作業項目の正本を `projects/<id>/checklist.md` だけに集約する
2. `references/` を機能説明・背景・歴史だけに縮退する
3. completion 判定を AAG が checklist から動的に導出する仕組みを作る
4. 新しい課題が出たときの format を統一し、AI を用いた開発がスムーズに進む基盤を作る
5. completed project の archive 手順を固定する

本 project 自体が、上記の仕組みを repo に適用する作業である。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力）
5. `references/03-guides/project-checklist-governance.md`（規約の正本）

## Why this project exists

3 つの動機:

1. **手付かずの課題が docs に埋もれて見つけられない問題** — references/ の複数文書に
   live task が散在しており「次に何をすればよいか」を把握するのに時間がかかる
2. **既に完了した課題が docs に残り続ける問題** — 完了済みの項目が live と混在し、
   ドキュメントの信頼性を毀損する
3. **AI を用いた開発で課題発見が遅れる問題** — AI セッション開始時に「課題は
   どこにあるか」を毎回探さねばならず、format が文書ごとにバラバラだった

これらは単なる整理ではなく、repo の品質基盤の構造的問題である。

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project が確立する規約の正本 |
| `references/02-status/open-issues.md` | 縮退後は active project の索引のみ |
| `references/02-status/technical-debt-roadmap.md` | 縮退後は判断理由・優先順位のみ |
| `tools/architecture-health/src/collectors/` | 本 project が追加する collector の置き場 |
| `app/src/test/guards/` | 本 project が追加する guard の置き場 |
