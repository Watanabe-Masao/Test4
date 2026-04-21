# AI_CONTEXT — test-taxonomy-v2

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

テスト分類 v2（子: テスト軸の Schema / Guard / Operations / Legacy 撤退）（test-taxonomy-v2）

**親:** `taxonomy-v2`

## Purpose

本 project は taxonomy-v2 親が確定した 7 不可侵原則と interlock 仕様のもとで、
**テスト軸 (T:\*) の vocabulary / schema / guard / operations / legacy 撤退**を
10 Phase で実装する。

### 現行 TSIG の課題（本 project で解決する）

- **test obligation が global**（TSIG-TEST-01 は全テスト対象）→ 原則 4 違反（tag ↔ test 双方向契約）
- **テスト品質がタグと無関係** → `R:calculation` が `T:unit-numerical` を持つべきなのに強制されていない
- **existence-only assertion の検出が部分的**（TSIG-TEST-04）→ T:kind 別 obligation 未定義
- **T:kind 自体が存在しない** → テストの種類（unit / contract / invariant / parity 等）を明示する語彙がない

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 次のアクション）
3. 親 `projects/taxonomy-v2/plan.md`（7 不可侵原則 + interlock 仕様）
4. 本 project の `plan.md`（10 Phase 構造）
5. 本 project の `checklist.md`

## Scope

### 含む（本 project の所掌）

- Phase 0: Inventory（現行 TSIG + テストの種類分類の棚卸し）
- Phase 1: Schema 設計（T:kind vocabulary / Antibody Pairs / obligation の種類定義）
- Phase 2: Migration Path（TSIG-TEST-\* → T:kind 対応 + `T:unclassified` 段階導入）
- Phase 3: Guard 実装（`testTaxonomyGuard.test.ts` + interlock 検証）
- Phase 4: Pilot（少数テストで T:kind を試験運用）
- Phase 5: Operations（review window 手続きの軸固有部分）
- Phase 6: Migration Rollout（全テスト段階移行）
- Phase 7: TSIG Global Rule Deprecation（global obligation の sunset 予告）
- Phase 8: TSIG Retirement（global rule 撤去 + T:kind ベース obligation に置換）
- Phase 9: Legacy Collection（旧コメント / guard / 文書の掃除）

### 含まない（親の所掌 / 別 project）

- 7 不可侵原則の文書化（→ 親 Phase 1）
- interlock マトリクス仕様（→ 親 Phase 1）
- 四半期 review window 手続き（→ 親 Phase 2）
- responsibility 軸 (R:tag) の実装（→ responsibility-taxonomy-v2）

## Why this project exists

### 直接のきっかけ

親 `taxonomy-v2` HANDOFF.md §1 参照。
2026-04-21 の設計対話で現行テスト品質制度の構造的課題が判明し、
親 + 子 2 件の 3 project 体制で制度化することが決定した。

### テスト軸を独立 project にする理由

- **軸ごとに実装粒度が大きい**: 既存テスト全件への T:kind 付与は responsibility 軸と同等規模
- **責務軸と並行進行可能**: Schema / Guard / Operations の設計は軸間独立
- **TSIG 撤退が軸固有**: global obligation の分解・置換はテスト軸にのみ存在

## 関連文書

| 文書 | 役割 |
|---|---|
| 親: `projects/taxonomy-v2/plan.md` | 7 不可侵原則 + interlock 仕様（本 project の制約） |
| 親: `projects/taxonomy-v2/checklist.md` | 親 Phase 完了条件 |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 5.2 Constitution |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | 現行 TSIG（v2 で T:kind 認識化） |
| `app/src/test/calculationCanonRegistry.ts` | 計算ファイルの分類（T:unit-numerical 対象の母集団） |
| 兄弟: `projects/responsibility-taxonomy-v2/AI_CONTEXT.md` | 責務軸（同期進行） |
| `projects/pure-calculation-reorg/plan.md` | 姉妹 project（10 Phase + 前倒し guard の参考） |
