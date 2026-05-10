# AI_CONTEXT — aag-coverage-rule-expansion

> 役割: project 意味空間の入口（why / scope / read order）。
> 親 umbrella: `projects/active/aag-governance-ratchet-down/`

## Project

AAG Coverage Rule Expansion (= Sub-1 of aag-governance-ratchet-down umbrella)

## Purpose

aag-structural-control-plane (= 2026-05-10 archive、AAG 6.1 institute) で landed した
artifact-coverage advisory checker は **86.2% unmanaged** baseline を articulate。本 program は
coverage rule の content 拡張で unmanaged を ratchet-down する。

**target reduction**: 86.2% → ~50% (= app/src/ + wasm/ + aag-engine/ 等の主要 zone を
declared/external/ignored category に articulate)

## Scope

**含む**:
- artifact-coverage.yaml に新規 coverage rule 追加 (= existing 17 rules への append)
- 各 rule に rationale + owner articulate
- generator 再実行で reduction 検証

**含まない**:
- 新 category 追加 (= 6 category articulate 維持)
- 新 schema 追加
- 新 generator 追加
- advisory → hard gate 昇格 (= Sub-2 scope)

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 次にやること）
3. 親 umbrella `projects/active/aag-governance-ratchet-down/HANDOFF.md`（共有 context）
4. 親 umbrella `sub-project-map.md`（依存関係）
5. `projects/completed/aag-structural-control-plane/` の artifact-coverage 関連 deliverables
