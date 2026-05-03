# AI_CONTEXT — operational-protocol-system

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Operational Protocol System（operational-protocol-system）

## Purpose

AAG Platformization Pilot 完遂後 (2026-05-02 archive)、AAG framework は articulate complete に到達した。本 project は **AAG を日常作業で使う側の運用プロトコル** を articulate する: Task Protocol / Session Protocol / Complexity Policy。

軽い修正で制度が重くなりすぎず、重い変更で制度が間に合うようにし、セッション開始 / 終了 / 引き継ぎ の ad-hoc を解消する。**AAG Core / 主アプリ code は touch しない**、上に薄く載せる operational layer。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase M1-M5 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. `decision-audit.md`（重判断の institution、DA-α-000 進行モデル）
6. 必要に応じて関連 references/ ドキュメント (= AAG drawer / AAG-COA / role)

## Why this project exists

AAG Platformization Pilot で AAG framework articulate が完了したが、**AAG を使う側の操作プロトコル** が未明文化:

- 軽い修正で制度が重くなりすぎる risk (= over-ritual)
- 重い変更で制度が間に合わない risk (= under-ritual)
- セッションの開始 / 終了 / 引き継ぎ が ad-hoc
- AI が毎回必要な文脈に最短到達できない
- 途中で重さが変わったときの昇格・降格が articulate されていない

AAG framework の改変ではなく、**運用層** の articulate が独立 project として scope 切り分け可能であるため、別 project として立ち上げる (= 不可侵原則 1「AAG framework を破壊的変更しない」整合)。

## Scope

含む:

- Task Protocol System の articulation (= Task Class Catalog + Session Protocol + Complexity Policy)
- 既存 5 文書 (AI_CONTEXT / HANDOFF / plan / checklist / decision-audit) の **使い方** 固定 (= read order routing per L1/L2/L3)
- 動的昇格・降格ルール articulation
- 5 Task Class protocol (Planning / Refactor / Bug Fix / New Capability / Handoff)
- AAG drawer `_seam` を使った最小統合 (= taskHint / consumerKind / sourceRefs の意味固定)

含まない:

- AAG framework / Standard / drawer / 5 文書 / role / AAG-COA の articulate 内容変更
- 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) の touch
- AI Role Catalog / role-scoped context bundle (= post-Pilot AI Role Layer charter scope、別 program)
- 自動昇格判定 (= AI が機械的に昇格判断、AI judgement に委ねる)
- 新概念 (= 既存 vocabulary 外) の追加

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/decision-articulation-patterns.md` | drawer (= 本 project が引用する Pattern 1-6 集) |
| `references/03-guides/projectization-policy.md` | AAG-COA (= bootstrap 前判定、本 project = Level 2 + governance-hardening) |
| `references/03-guides/new-project-bootstrap-guide.md` | bootstrap 手順 (= 本 project の bootstrap で適用) |
| `references/01-principles/aag/README.md` | AAG framework articulate (= 本 project は touch しない、参照のみ) |
| `references/01-principles/platformization-standard.md` | Standard (= 本 project は引用、改変しない) |
| `projects/completed/aag-platformization/` | AAG Pilot (= 本 project の trigger source、Pilot 過程で identify された pattern を運用層として articulate) |
