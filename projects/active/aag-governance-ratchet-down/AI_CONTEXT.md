# AI_CONTEXT — aag-governance-ratchet-down

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Governance Ratchet-down — aag-structural-control-plane で articulate 完成した advisory infrastructure を ratchet-down で実 guard / 実 cleanup に converted する Umbrella program (= aag-governance-ratchet-down)

## Purpose

`aag-structural-control-plane` (= 2026-05-10 archive、AAG 6.0 → 6.1) で **articulate 完成** した advisory infrastructure を **ratchet-down で実装に converted** する後段 program。

aag-scp は **articulate 中心** で完遂:
- 20 Document Kind articulate (AI Instruction Pack)
- 11 failure patterns articulate (Failure Learning Loop)
- 6 guard candidates auto-promote (= 5 ≥ threshold 到達)
- 17 artifact coverage rules articulate (= 86.2% unmanaged baseline)
- 5 Required Docs Matrix rules articulate
- 398 docs Reading Pass で disposition articulate

本 program は **「articulate された advisory を実 guard / 実 cleanup に converted」** が scope:
- C1 = Coverage rules 拡張 (= unmanaged 86.2% → reduction)
- C2 + C3 = 6 guard candidates の実 guard test articulate (= ratchet-down 完成、CLAUDE.md G8)
- C4 = Reading Pass disposition 残 19 件の実 execution (= move 12 + split 3 + archive 3 + generated-register 1)
- C5 = Failure Loop maturity progression (= observed → guardrail-shadow → guardrail-advisory)

## Scope の境界

**含む** (= ratchet-down 4 sub-scope):

- aag-scp で articulate された advisory checker の hard gate 化 (= 5 段階 maturity progression を経て)
- 既存 検出 mechanism の baseline 確立 + ratchet-down 開始
- Reading Pass disposition の実 execution (= 物理的 file move / split / archive / generator 登録)
- coverage rule の拡張 articulate (= app/src/ 等の zone を coverage に articulate)

**含まない** (= 不可侵 scope 外):

- 新 governance pattern の articulate (= aag-scp で完了済、本 program は articulate を ratchet-down するのみ)
- Reading Pass の new batch (= 398 docs articulate 100% 完遂済)
- 新 schema 追加 (= aag-scp で 4 schema landing 済)
- 即 Gate 化 (= AAG-SCP-DOC-LEARNING-002 整合、各 guard 昇格は user 判断 gate を含む)
- Separate Program candidate (= Phase 8a/8b/8c / Phase 10) は本 program scope 外 (= reposteward 系統に移譲)
- app/src/ 配下の business logic touch

## kind = umbrella (= Level 4 Umbrella)

本 project の `config/project.json` には `projectizationLevel: 4` (Umbrella) が設定されている。
taxonomy-v2 に続く Umbrella project 2 例目。4 sub-scope を sub-project map で articulate、
各 sub-scope は独立した sub-program として spawn 可能 (= 本 umbrella で全 sub の articulate のみ、
実 implementation は sub-program で扱う)。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 残作業の優先順位）
3. `projectization.md`（AAG-COA Level 4 判定根拠）
4. `plan.md`（不可侵原則 + Phase 構造 + sub-program articulate）
5. `sub-project-map.md`（4 sub-program 一覧と依存関係）
6. `checklist.md`（completion 判定の入力）
7. 必要に応じて `projects/completed/aag-structural-control-plane/HANDOFF.md`（前駆 program、advisory infrastructure articulate 完了状態の reference）

## 関連 program

| program | role | status |
|---|---|---|
| `projects/completed/aag-structural-control-plane/` | 前駆 (= advisory infrastructure articulate 完成) | archived 2026-05-10 |
| `projects/active/reposteward-ai-ops-platform/` | 並走 (= Substrate provider) | active |
| `projects/active/taxonomy-v2/` | parallel umbrella (= 1 例目 Level 4) | active (observation phase) |
