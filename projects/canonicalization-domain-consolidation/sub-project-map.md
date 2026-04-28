# sub-project-map — canonicalization-domain-consolidation

> 役割: Level 4 (Umbrella) project の sub-project 一覧 + 依存関係を集約する。各 Phase が独立した sub-project として実行可能であることを示し、wave 単位の段階展開を可視化する。
>
> 規約: `references/03-guides/projectization-policy.md §3 Level 4`。

## 1. 全体構造

本 project は **Umbrella Level 4** であり、Phase 単位で **実質 Level 3 sub-project** として運用する。
sub-project 化判断は以下の基準で行う:

- 1 Phase が 5+ commits を超える見込み
- 独立した review-gate / human-approval を要する
- 並行進行可能（依存 Phase 完了後）

現時点（draft）では **論理 sub-project**（Phase 単位）のみで、物理 directory の分割は行わない。
将来 sub-project を `projects/<sub-id>/` として切り出す場合は本 map を更新する。

## 2. Phase = 論理 sub-project 一覧

| sub-project (Phase) | レベル相当 | 主成果物 | 依存 |
|---|---|---|---|
| **A: Inventory + Selection Rule** | Level 2 | `references/03-guides/integrity-pair-inventory.md` + selection rule 拡張 | Phase 0 |
| **B: Domain Skeleton** | Level 3 | `app-domain/integrity/` + spec-state 系の adapter 化 | A |
| **C: First Migration (doc-registry)** | Level 3 | doc-registry guard の domain 経由化 + 観察 | B |
| **D: Bulk Migration (3 waves)** | Level 3 | 既存 11 ペアの dual-emit + @deprecated 化 | C |
| **E: Legacy Retirement** | Level 3 (breaking) | 旧 guard / 旧 parser / 重複 logic の物理削除 | D |
| **F: Domain Invariant Test** | Level 2 | domain 純粋性 + 完全性 test、coverage matrix | E |
| **G: Architecture-Health KPI** | Level 2 | `integrity.*` KPI 4 種、Hard Gate 連動 | F |
| **H: Horizontal Expansion** | Level 3 | tier1 候補（hooks 系等）への正本化 | G |
| **I: 制度文書化 + Handoff** | Level 2 | `integrity-domain.md` 原則 + canonicalization-checklist.md | H |

## 3. 依存グラフ

```
Phase 0 (bootstrap)
    │
    ▼
A (inventory) ─→ B (skeleton) ─→ C (first migration)
                                       │
                                       ▼
                                  D (bulk migration, 3 waves)
                                       │
                                       ▼
                                  E (legacy retirement)
                                       │
                                       ▼
                                  F (domain test) ─→ G (KPI)
                                                       │
                                                       ▼
                                                   H (horizontal)
                                                       │
                                                       ▼
                                                   I (institutional doc)
```

### 3.1. 並行可能性

- D の 3 waves は **互いに独立**（Wave 1 の 4 ペア / Wave 2 の 3 ペア / Wave 3 の 4 ペア が独立して進められる）
- F と G は依存関係薄く並行可能
- H は G の KPI が出てから（tier1 候補の優先度判断のため）

## 4. 物理 sub-project 化の判断基準（将来）

以下のいずれかに該当した場合、Phase を独立 project（`projects/<sub-id>/`）に切り出す:

- 観察期間（dual-emit）で 1 ヶ月超を要する見込み
- 別 ロール owner が main driver になる
- Phase 単独で archive 候補になり得る完結性を持つ
- breaking-changes / legacy-retirement の独立記録が必要

切り出し時は本 map の表に `→ projects/<sub-id>/` 列を追加し、umbrella 側は参照のみにする。

## 5. 並行 active project との関係

| 並行 project | 関係 |
|---|---|
| `phased-content-specs-rollout` | spec-state 系を Phase B の reference 実装として参照、phased 側の進行（Phase D Step 2-）は独立継続 |
| `pure-calculation-reorg` | 現 active overlay。Phase D Wave 1 で `calculationCanonRegistry` 周辺を touch する際は本 project と PR タイミング協調 |

並行 project は **本 umbrella の sub-project ではない**。あくまで独立 active project であり、
本 project の Phase 進行と協調するのみ。

## 6. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-27 | 初版（draft）。Phase 0 bootstrap で Phase A〜I を論理 sub-project として整理 |
