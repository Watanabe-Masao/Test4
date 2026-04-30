# AI_CONTEXT — aag-legacy-retirement

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG legacy doc archive 拡張案件 (Project A Phase 5 で完遂しない doc) (`aag-legacy-retirement`)

## Status

**active (2026-04-30 spawn、Project D bootstrap 完了)**。

- **2026-04-30 spawn**: 親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate B 確定 (Project A〜D 分割) を受けて、**Project A の Phase 5 で完遂しない複雑 archive 案件** を Project D として独立 spawn
- **依存関係**: Project A (AAG Core doc refactor) の Phase 5 完了後に発火 (= 単純 archive 案件は Project A で完遂、複雑案件のみ本 project が継承)
- **次工程**: Project A Phase 5 完了後に着手判定 (本 project が必要かどうかは Project A Phase 5 進捗に依存、不要なら本 project は archive 候補に migrate)

canonical 計画 doc は本 project の `plan.md`。親 project: `projects/aag-bidirectional-integrity/`。

## Purpose

Project A (`aag-core-doc-refactor`) の Phase 5 (= AAG Core 旧 doc archive) で **完遂しない複雑 archive 案件**
を継承する。具体例:

- `adaptive-architecture-governance.md` の **Split + 部分 Archive** (戦略マスター + 文化論 + 旧 4 層 +
  バージョン履歴が同居しているため、複数 doc に Split した上で旧 doc を archive する案件)
- 複数 doc 横断の inbound migration が複雑で、Project A Phase 5 単独で完遂しないケース
- breakingChange × 複数 path × inbound 60+ 件のような scope 過大ケース

主要 deliverable:
1. Project A Phase 5 で完遂しなかった archive 案件を identify (本 project Phase 1 で確定)
2. 各複雑案件の inbound migration + archive 移管 (Project A の不可侵原則を継承)
3. 物理削除は人間判断後にのみ実施

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力）
5. 親 project の `projects/aag-bidirectional-integrity/plan.md` §Phase 5 + §3.5 操作順序原則 + §1.5 archive 前 mapping 義務
6. Project A (`projects/completed/aag-core-doc-refactor/`) の plan + legacy-retirement.md (= 単純案件と複雑案件の境界 articulation)

## Why this project exists

親 project の Phase 3 hard gate (= 「Phase 4〜10 を単一 project で継続するか分割するか」) で、**B (sub-project / follow-up project 分割) が確定** (AI 推奨 + ユーザー確認、2026-04-30):

- Project A の Phase 5 単独では完遂しない複雑案件を分離することで、Project A の MVP scope を明確化
- 複雑案件は scope creep の risk が高く、独立 project として運用する方が clean
- 物理削除は人間判断必須のため、Level 2 として独立 project lifecycle で管理

本 project は **Project A Phase 5 拡張** に scope を絞った Level 2 project。
**本 project が必要かどうかは Project A Phase 5 進捗に依存する** (不要なら本 project は archive 候補に migrate)。

## Scope

**含む** (Project A Phase 5 で完遂しなかった案件のみ、Phase 1 で確定):
- `adaptive-architecture-governance.md` の Split + 部分 Archive (複雑 archive 案件の典型例)
- 複数 doc 横断の inbound migration が複雑なケース
- 物理削除 trigger の人間判断 gate (anti-ritual と orthogonal な安全装置)

**含まない** (= nonGoals):
- AAG Core doc content refactor / 新 doc Create → **Project A 所掌**
- AR-rule schema 拡張 / meta-guard 実装 → **Project B 所掌**
- DFR registry 構築 → **Project C 所掌**
- 業務ロジック / domain calculation の変更
- **Project A の Phase 5 で完遂可能な単純 archive 案件** → 本 project に持ち込まない (Project A で完遂)
- 期間 buffer (30 日待機等) を archive trigger として導入 → anti-ritual、絶対禁止

## 関連文書

| 文書 | 役割 |
|---|---|
| `projects/aag-bidirectional-integrity/plan.md` | 親 project の正本 (§Phase 5 / §3.5 操作順序原則 / §1.5 archive 前 mapping 義務) |
| `projects/completed/aag-core-doc-refactor/plan.md` | Project A 正本 (Phase 5 で完遂する範囲の定義 = 単純案件と複雑案件の境界) |
| `projects/completed/aag-core-doc-refactor/legacy-retirement.md` | Project A の legacy-retirement (単純案件の articulate) |
| `references/99-archive/adaptive-architecture-governance.md` | 複雑 archive 候補の典型例 (Split + 部分 Archive) |
| `references/99-archive/` | archive 配下 (本 project の物理移管先) |
| `references/02-status/legacy-retirement-extended.md` | 拡張案件の articulate doc (本 project Phase 1 で landing 想定) |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール |
