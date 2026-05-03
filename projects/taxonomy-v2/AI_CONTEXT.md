# AI_CONTEXT — taxonomy-v2

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

分類体系 v2（責務軸 + テスト軸の制度化: 親）（taxonomy-v2）

## Purpose

本 project は **responsibility-taxonomy-v2 / test-taxonomy-v2 の 2 軸を束ねる親**。
責務タグとテスト分類を同一の 7 不可侵原則で制度化し、両軸が相互に contract を
持つ（タグ = test obligation / テスト = code contract）ことを AAG 第 3 の柱
として恒久化する。

**親の所掌:** Constitution（7 原則）、両軸の interlock 仕様、review window 運用、
制度成立要件。

**子の所掌:** 各軸の Schema / Guard / Operations / Legacy 撤退。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 次のアクション）
3. `plan.md`（7 不可侵原則 + 親 Phase 構造 + interlock 仕様）
4. `checklist.md`（親 Phase 完了条件）
5. 子 project の `AI_CONTEXT.md`:
   - `projects/completed/responsibility-taxonomy-v2/AI_CONTEXT.md`
   - `projects/completed/test-taxonomy-v2/AI_CONTEXT.md`

## Why this project exists

### 直接のきっかけ

2026-04-21 の設計対話で、現行責務タグ制度の構造的課題が判明:

- 未分類 400 件 / タグ不一致 48 件が baseline 化（放置の状態）
- 軸の混在（責務 × 純粋性 × 層を 1 タグに押し込み）
- `R:utility` の捨て場化（33 件）
- タグなし ≠ `R:unclassified` の区別がない
- テスト品質の義務がタグと無関係（TSIG-TEST-01 は global）

### 2 軸を親で束ねる理由

- **同一原則を共有**: 7 不可侵原則が両軸に適用される
- **interlock 契約が親にある**: `R:calculation → T:unit-numerical + T:boundary` のような
  タグ間契約は親のみが保有
- **同時 review window**: 両軸の追加・撤退は同一 window で裁定
- **1 project = 1 一貫した task scope 原則** に準拠: 親は "制度設計" のみ、
  子が軸の実装を担う（§0）

## Scope

### 含む（親の所掌）

- 7 不可侵原則の文書化（Constitution）
- 責務軸 × テスト軸の interlock マトリクス定義
- 共通 review window 仕様（vocabulary 追加・撤退の双方向ワークフロー）
- 8 つの昇華メカニズム（Origin Journal / Antibody Pairs / Cognitive Load Ceiling /
  Bidirectional Contract / Entropy Monitoring / Review Journal /
  AI Vocabulary Binding / Constitution Bootstrap Test）
- 制度成立 5 要件 + レガシー撤退 / 回収フェーズ

### 含まない（子の所掌）

- 各軸の具体 Schema / tag vocabulary（→ 子 project）
- 各軸の guard 実装（→ 子 project）
- 各軸の Legacy 撤退 / Collection 作業（→ 子 project）
- 個別ファイルのタグ書き換え（→ 子 project の Phase 3+）

## 関連文書

| 文書                                                           | 役割                                           |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `references/05-aag-interface/operations/project-checklist-governance.md`         | 本 project の運用ルール（AAG Layer 4A）        |
| `references/99-archive/adaptive-architecture-governance.md` | AAG 5.2 Constitution — 制度化の思想的根拠      |
| `references/03-implementation/responsibility-separation-catalog.md`    | 現行 v1 の 24 パターン（移行対象）             |
| `app/src/test/responsibilityTagRegistry.ts`                    | 現行 v1 の正本（v2 で統合的に拡張）            |
| `app/src/test/guards/responsibilityTagGuard.test.ts`           | 現行 v1 guard                                  |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts`         | 現行 TSIG（テスト品質）guard — v2 でタグ認識化 |
| `projects/pure-calculation-reorg/HANDOFF.md`                   | 姉妹 project。同じ Phase 体系を踏襲            |

## 子 project の現状

| 子 project                             | 現在地                                                  | 着手承認            | 関連リンク                                                                                                                                                                                                                        |
| -------------------------------------- | ------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `responsibility-taxonomy-v2`（責務軸） | **Phase 0 Inventory 着手可能**（2026-04-26 kicked off） | 親 Phase 3 で承認済 | [`AI_CONTEXT`](../responsibility-taxonomy-v2/AI_CONTEXT.md) / [`HANDOFF`](../responsibility-taxonomy-v2/HANDOFF.md) / [`plan`](../responsibility-taxonomy-v2/plan.md) / [`checklist`](../responsibility-taxonomy-v2/checklist.md) |
| `test-taxonomy-v2`（テスト軸）         | **Phase 0 Inventory 着手可能**（2026-04-26 kicked off） | 親 Phase 3 で承認済 | [`AI_CONTEXT`](../test-taxonomy-v2/AI_CONTEXT.md) / [`HANDOFF`](../test-taxonomy-v2/HANDOFF.md) / [`plan`](../test-taxonomy-v2/plan.md) / [`checklist`](../test-taxonomy-v2/checklist.md)                                         |

両子の Phase 0 出力（`responsibility-taxonomy-inventory.yaml` /
`test-taxonomy-inventory.yaml`）は親 plan.md §Common Inventory Schema の
**CanonEntry shape** に適合する。同期 review window は親 Phase 2 仕様
（`references/03-implementation/taxonomy-review-window.md`）に従う。
