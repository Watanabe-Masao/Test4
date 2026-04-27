# AI_CONTEXT — responsibility-taxonomy-v2

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

責務分類 v2（子: 責務軸の Schema / Guard / Operations / Legacy 撤退）（responsibility-taxonomy-v2）

**親:** `taxonomy-v2`

## Purpose

本 project は taxonomy-v2 親が確定した 7 不可侵原則と interlock 仕様のもとで、
**責務軸 (R:\*) の vocabulary / schema / guard / operations / legacy 撤退**を
10 Phase で実装する。

### 現行 v1 の課題（本 project で解決する）

- **未分類 400 件 / タグ不一致 48 件**が baseline 化（原則 1: 未分類は能動タグとして扱う）
- **軸の混在**: 責務 × 純粋性 × 層が 1 タグに押し込まれている（原則 2: 1 タグ = 1 軸）
- **`R:utility` の捨て場化**（33 件）→ 語彙設計の不在（原則 3: 語彙生成は儀式）
- **タグなし ≠ `R:unclassified`** の区別がない（原則 1 の再現）
- **test obligation が global**（原則 4: tag ↔ test 双方向契約に違反）

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 次のアクション）
3. 親 `projects/taxonomy-v2/plan.md`（7 不可侵原則 + interlock 仕様）
4. 本 project の `plan.md`（10 Phase 構造）
5. 本 project の `checklist.md`

## Scope

### 含む（本 project の所掌）

- Phase 0: Inventory（現行 v1 の全タグ棚卸し + Origin Journal 記入）
- Phase 1: Schema 設計（R:tag vocabulary / Antibody Pairs / Cognitive Load 配分）
- Phase 2: Migration Path（v1 → v2 の対応表 + `R:unclassified` の段階導入）
- Phase 3: Guard 実装（`responsibilityTagGuardV2.test.ts` + interlock 検証）
- Phase 4: Pilot（少数ファイルで v2 タグを試験運用）
- Phase 5: Operations（review window 手続きの軸固有部分）
- Phase 6: Migration Rollout（全ファイル段階移行）
- Phase 7: v1 Deprecation（v1 guard の sunset 予告）
- Phase 8: v1 Retirement（v1 guard 削除 + old tag 禁止 guard 化）
- Phase 9: Legacy Collection（旧コメント / registry / 文書の掃除）

### 含まない（親の所掌 / 別 project）

- 7 不可侵原則の文書化（→ 親 Phase 1）
- interlock マトリクス仕様（→ 親 Phase 1）
- 四半期 review window 手続き（→ 親 Phase 2）
- test 軸 (T:kind) の実装（→ test-taxonomy-v2）

## Why this project exists

### 直接のきっかけ

親 `taxonomy-v2` HANDOFF.md §1 参照。
2026-04-21 の設計対話で現行責務タグ制度の構造的課題が判明し、
親 + 子 2 件の 3 project 体制で制度化することが決定した。

### 責務軸を独立 project にする理由

- **軸ごとに実装粒度が大きい**: 35+ ファイルの再タグ付け + guard 書き換えは 1 project 分の作業量
- **テスト軸と並行進行可能**: Schema / Guard / Operations の設計は軸間独立
- **Legacy 撤退が軸固有**: v1 registry 掃除・旧 guard sunset は責務軸にのみ存在

## 関連文書

| 文書 | 役割 |
|---|---|
| 親: `projects/taxonomy-v2/plan.md` | 7 不可侵原則 + interlock 仕様（本 project の制約） |
| 親: `projects/taxonomy-v2/checklist.md` | 親 Phase 完了条件 |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 5.2 Constitution |
| `references/03-guides/responsibility-separation-catalog.md` | 現行 v1 の 24 パターン（移行対象） |
| `app/src/test/responsibilityTagRegistry.ts` | 現行 v1 正本（v2 で置換） |
| `app/src/test/guards/responsibilityTagGuard.test.ts` | 現行 v1 guard（Phase 8 で撤去） |
| 兄弟: `projects/test-taxonomy-v2/AI_CONTEXT.md` | テスト軸（同期進行） |
| `projects/pure-calculation-reorg/plan.md` | 姉妹 project（10 Phase + 前倒し guard の参考） |
