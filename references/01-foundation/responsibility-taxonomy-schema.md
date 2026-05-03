---
schemaVersion: "1.0"
schemaSource: "projects/completed/responsibility-taxonomy-v2/plan.md Phase 1"
canonicalSource: "app/src/test/responsibilityTaxonomyRegistryV2.ts"
status: draft
landingPhase: "responsibility-taxonomy-v2 Phase 1 (Schema 設計)"
constitutionGate: "親 Phase 1 完遂 + Phase 0 Inventory 完遂 (1370 entry baseline)"
---

# Responsibility Taxonomy Schema (v2)

> **役割**: 責務軸 (R:\*) の v2 vocabulary 仕様正本（≤ 15）。
>
> **位置付け**: `taxonomy-constitution.md` 7 不可侵原則 + `taxonomy-interlock.md` R⇔T マトリクスの実装根拠。本文書は **schema 文書**であり、**registry 実装** (`responsibilityTaxonomyRegistryV2.ts`) の双方向 canonical source。
>
> **Cognitive Load Ceiling 適用**: v1 = 20 → v2 = 10（5 スロット余裕）。原則 7 厳守。
>
> **Origin**: 各 R:tag の Why / When / Who / Sunset は `taxonomy-origin-journal.md` §2.2「v2 R:tag Origin」に記録（Phase 1 統合 branch で landing 済、Phase 6 Migration Rollout 時に v1 から transition）。

## 1. v2 R:tag vocabulary（10 件）

設計方針:

- **Anchor Slice 5 R:tag を含む**（親 plan §OCS.7 Anchor Slice 確定済）
- **Interlock マトリクスが要求する R:tag を全件含む**（matrix §2 が implied vocabulary）
- **R:utility / R:misc 等の捨て場タグなし**（plan Phase 1 禁止事項 + 原則 1: 未分類は能動タグ）
- **5 スロット余裕**（Phase 1 後の review window で慎重に追加）

|   # | R:tag            | 役割（責務の archetype）                                                                   | Anchor | Interlock 必須 T:kind                                           |
| --: | ---------------- | ------------------------------------------------------------------------------------------ | :----: | --------------------------------------------------------------- |
|   1 | `R:calculation`  | 純粋計算（数値契約 + 不変条件）。domain/calculations/ archetype                            |   ✅   | T:unit-numerical, T:boundary                                    |
|   2 | `R:bridge`       | current ⇔ candidate 境界（移行中の両側 keep）。\*Bridge.ts archetype                       |   ✅   | T:contract-parity                                               |
|   3 | `R:read-model`   | application/readModels/ の Zod parse + ヘルパー                                            |   ✅   | T:zod-contract, T:null-path                                     |
|   4 | `R:guard`        | test/guards/ の構造制約検証（meta-guard が必要）                                           |   ✅   | T:meta-guard                                                    |
|   5 | `R:presentation` | 描画形状のみ。副作用なし（chart-view / widget / page / layout / form / navigation の統合） |   ✅   | T:render-shape                                                  |
|   6 | `R:store`        | state container（Zustand / Context / reducer の統合）。state のみ保有                      |   —    | T:state-transition                                              |
|   7 | `R:hook`         | application/hooks の orchestration（data-fetch / state-machine / query-plan の統合）       |   —    | T:dependency-list, T:unmount-path                               |
|   8 | `R:adapter`      | infrastructure 境界 adapter（DuckDB / 外部 API / 永続化）                                  |   —    | （TBD: Phase 5 review window 検討。短期は T:unclassified 許容） |
|   9 | `R:registry`     | vocabulary / catalog / metadata 定義 file（registry / catalog 系）                         |   —    | （TBD: 短期 T:unclassified 許容）                               |
|  10 | `R:unclassified` | sentinel — review window 待ち。能動タグ                                                    |   —    | T:unclassified                                                  |

**合計 10 件 / Cognitive Load Ceiling 15 まで 5 スロット余裕**。

## 2. Antibody Pairs（原則 6: 対概念タグの相互制約）

各 R:tag は対概念タグと **双方向対称** に **意味的に排他** な関係を持つ（A ↔ B なら B ↔ A）。1 file が両方を持つと Constitutional Correctness 破綻 → review window で裁定。

> **Phase 3 統合 branch (2026-04-26) で `taxonomyInterlockGuard` INTERLOCK-4a が双方向非対称を検出し、対称化した**。当初設計の R:bridge ↔ R:hook / R:adapter ↔ R:bridge / R:registry ↔ R:calculation は片方向定義で双方向破綻していたため、対概念がない archetype は `null` として明示する設計に統一（responsibilityTaxonomyRegistryV2.ts に反映）。

### 2.1. 双方向対称 Antibody Pair（3 ペア）

| Antibody Pair                    | 排他理由                                                                   |
| -------------------------------- | -------------------------------------------------------------------------- |
| `R:calculation` ↔ `R:read-model` | 純粋計算 vs Zod parse（前者は副作用なし、後者は IO 境界の最初の anchor）   |
| `R:guard` ↔ `R:presentation`     | 検証 vs 描画（前者は static analyzer、後者は runtime DOM）                 |
| `R:store` ↔ `R:hook`             | state 保有 vs effect 駆動（store は read/write のみ、hook は side effect） |

### 2.2. Antibody Pair なし（4 archetype）

以下は **対概念が明確な vocabulary を持たない archetype** のため `antibodyPair: null` として登録。原則 6 は「対概念タグと相互制約」を要請するが、自然に対概念が成立しない archetype は強制 pair 化しない。

| R:tag            | null である理由                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `R:bridge`       | bridge 自身が両側 keep の archetype。対概念は migration 完了後の単一実装そのもの（vocabulary 化されない） |
| `R:adapter`      | infrastructure 境界 archetype。対概念は明確な vocabulary を持たない                                       |
| `R:registry`     | 宣言的 metadata の archetype。対概念は明確な vocabulary を持たない                                        |
| `R:unclassified` | sentinel（review window 待ち）。対概念は概念上存在しない                                                  |

> **原則**: Pair の片方を新規追加するときは、もう片方の境界が崩れないかを review window で同時審議する（Constitution 原則 6）。null の archetype に対概念候補が登場した場合は同 window で同時裁定。

## 3. v1 → v2 migration map（参考、Phase 2 で正式 landing）

> 本表は schema 設計時の **mapping 提案**。正本は `references/03-implementation/responsibility-v1-to-v2-migration-map.md`（子 Phase 2 deliverable）で確定する。

| v1 R:tag (件数)                                                                                                           | 候補 v2 R:tag                                        | 移行根拠                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| R:calculation (25)                                                                                                        | R:calculation                                        | 同名 keep                                                          |
| R:chart-view (59) / R:chart-option (24) / R:widget (26) / R:page (1) / R:layout (6) / R:form (12) / R:navigation (検出 0) | R:presentation                                       | 描画系の統合（cognitive load 削減）                                |
| R:query-plan (21) / R:query-exec (17) / R:data-fetch / R:state-machine (10) / R:orchestration (13)                        | R:hook                                               | application/hooks 系の統合                                         |
| R:transform (18)                                                                                                          | R:read-model（parse 系）or R:calculation（純粋変換） | context-dependent — Phase 2 で per-file 判定                       |
| R:context (12) / R:reducer (2) / R:persistence (2)                                                                        | R:store                                              | state container 系の統合                                           |
| R:adapter (4)                                                                                                             | R:adapter                                            | 同名 keep（infrastructure 境界）                                   |
| R:utility (48)                                                                                                            | R:unclassified                                       | 捨て場の正規化（Phase 1 禁止事項適用、Phase 6 で個別分類 review）  |
| R:barrel (5)                                                                                                              | R:unclassified                                       | barrel は責務を持たない（re-export のみ）                          |
| R:guard / R:presentation / R:bridge / R:read-model / R:store                                                              | （v2 で新設）                                        | Phase 0 inventory で path pattern 機械検出済み（Anchor 299 entry） |

**集約結果**: v1 20 → v2 10（10 件削減 / 50% 削減）。

## 4. Frontmatter 必須項目（OCS.2 / OCS.5 / OCS.4 統合）

各 R:tag entry は registry V2 で次の frontmatter を持つ:

```typescript
{
  tag: 'R:calculation',
  evidenceLevel: 'guarded',          // §OCS.2: generated | tested | guarded | reviewed | asserted | unknown
  promotionLevel: 'L1',              // §OCS.5: L0 (proposed) | L1 (Registered) | L2 (Origin-linked) | ... | L6 (Health-tracked)
  lifecycle: 'active',               // §OCS.4: proposed | active | deprecated | sunsetting | retired | archived
  origin: {                          // §OCS.5 L2 Origin-linked の入力
    why: '<なぜ採択したか>',
    when: '<採択日 YYYY-MM-DD or commit hash>',
    who: '<採択者>',
    sunsetCondition: '<撤退条件>'
  },
  interlock: {                       // §taxonomy-interlock.md §2.1 の引用
    requiredTKinds: ['T:unit-numerical', 'T:boundary'],
    optionalTKinds: ['T:invariant-math']
  },
  antibodyPair: 'R:read-model',     // 原則 6: 対概念タグ
  description: '<1 行説明>'
}
```

**初期 promotionLevel**:

- 全 v2 R:tag: **L1 (Registered)** — registry に entry 追加完了
- L2 (Origin-linked) 到達は Phase 1 完遂 + Origin Journal §3 transcription 完了 = **本 Phase 1 統合 branch 完遂 = L2**
- L3 (Interlock-bound) 到達は子 Phase 3 で `AR-TAXONOMY-INTERLOCK` active 化時
- L4 (Guarded) 到達は同上 + matrix violations baseline=current 値で凍結時

**初期 lifecycle**: 全 v2 R:tag は **`active`**（Constitution Phase 1 で承認済 vocabulary として）。

## 5. Cognitive Load Ceiling 余裕枠（5 スロット）の運用

v2 = 10 / Ceiling = 15 → **5 スロット余裕**。

> **原則**: 余裕枠は「すぐ使う」ためでなく、**review window で熟議する余裕**を持つため。Phase 5 Operations で観測される v1→v2 migration の困難パターンが 1 ヶ所に集中したら、そこで初めて新タグを提案する。

候補（Phase 5 以降の review window 検討対象、現時点では追加しない）:

- `R:contract` — 型のみの interface file（現状は R:unclassified or R:read-model）
- `R:plan` — Screen Plan 等の動作計画 file（現状は R:hook）
- `R:projection` — pure projection 関数（現状は R:read-model or R:calculation）

## 6. 改訂手続き

新 R:tag 追加 / 既存 R:tag retirement / Antibody Pair 組み換え は **review window 経由のみ**:

- 提案: `references/04-tracking/taxonomy-review-journal.md` に entry 追加
- 裁定: 四半期 review window でuser 判断
- 連動: 対応 T:kind が必要なら test-taxonomy-v2 と同期 review window で同時裁定（原則 4）

詳細は `references/03-implementation/taxonomy-review-window.md` を参照。

## 7. 関連文書

| 文書                                                            | 役割                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `references/01-foundation/taxonomy-constitution.md`             | 7 不可侵原則（本 schema は原則 1, 2, 6, 7 の実装）               |
| `references/01-foundation/taxonomy-interlock.md`                | R⇔T 完全マトリクス（本 schema § Interlock 必須 T:kind 列の正本） |
| `references/01-foundation/taxonomy-origin-journal.md`           | 各 R:tag の Origin (Why/When/Who/Sunset)（§3 で landing）        |
| `app/src/test/responsibilityTaxonomyRegistryV2.ts`              | 本 schema の TypeScript 実装（registry 正本）                    |
| `app/src/test/responsibilityTagRegistry.ts`                     | 現行 v1 正本（子 Phase 8 で retirement 予定）                    |
| `references/04-tracking/responsibility-taxonomy-inventory.yaml`   | Phase 0 baseline（CanonEntry 1370 entry / Anchor 299）           |
| `references/03-implementation/responsibility-v1-to-v2-migration-map.md` | v1→v2 移行詳細（子 Phase 2 で landing）                          |
| `projects/active/taxonomy-v2/plan.md` §AR-TAXONOMY-\*                  | rule 仕様正本（子 Phase 3 で active 化）                         |
