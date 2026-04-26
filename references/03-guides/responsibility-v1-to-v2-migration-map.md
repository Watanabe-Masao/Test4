---
schemaVersion: "1.0"
canonicalSource: "app/src/test/responsibilityTaxonomyRegistryV2.ts (v2 vocabulary) + app/src/test/responsibilityTagRegistry.ts (v1 vocabulary)"
inventorySource: "references/02-status/responsibility-taxonomy-inventory.yaml (Phase 0 baseline 1370 entry)"
status: draft
landingPhase: "responsibility-taxonomy-v2 Phase 2 (Migration Path)"
constitutionGate: "親 Phase 1 + 子 Phase 0 + 子 Phase 1 完遂 / 親 §OCS.4 Lifecycle State Machine 適用"
---

# Responsibility Taxonomy v1 → v2 Migration Map

> **役割**: 責務軸 v1 (20 R:tag) → v2 (10 R:tag) の **per-tag 移行表 + 退避方針 + Lifecycle 対応**。
>
> **位置付け**: 子 Phase 2 (Migration Path) の正本。Phase 0 inventory (1370 entry baseline) と Phase 1 schema (v2 10 R:tag vocabulary) の橋渡し。
>
> **設計原則**:
>
> - 原則 1（未分類は分類である）: タグなし / 1:1 マッピング不能なタグは **R:unclassified に明示退避**（Phase 6 Migration Rollout で能動付与）
> - 原則 2（1 タグ = 1 軸）: v1 で混在していた軸（責務 × 純粋性 × 層）は v2 で responsibility 軸のみに正規化
> - 原則 3（語彙生成は儀式）: v2 vocabulary は Phase 1 review window 通過済 — 本 map は再裁定しない
> - **Phase 1 禁止事項**: v1 → v2 の **強制 1:1 マッピング禁止**（曖昧は `R:unclassified` に）

## 1. v1 → v2 mapping table（全 v1 20 R:tag）

Phase 0 inventory 集計（responsibility-taxonomy-inventory.yaml header）から各 v1 タグの実測件数を引用。

|   # | v1 R:tag          |   実測件数 | v2 候補                                                      | 移行種別               | 移行根拠                                                                                                        |
| --: | ----------------- | ---------: | ------------------------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
|   1 | `R:calculation`   |         25 | `R:calculation`                                              | **1:1 keep**           | 同名・同責務（純粋計算）。domain/calculations/ archetype を v2 で保持                                           |
|   2 | `R:chart-view`    |         59 | `R:presentation`                                             | **N:1 統合**           | 描画系の archetype。v2 は描画を 1 タグに統合（cognitive load 削減）                                             |
|   3 | `R:chart-option`  |         24 | `R:presentation`                                             | **N:1 統合**           | 描画 option 構築は presentation の subset                                                                       |
|   4 | `R:widget`        |         26 | `R:presentation`                                             | **N:1 統合**           | widget = presentation の構成単位                                                                                |
|   5 | `R:page`          |          1 | `R:presentation`                                             | **N:1 統合**           | page = presentation の最上位 container                                                                          |
|   6 | `R:layout`        |          6 | `R:presentation`                                             | **N:1 統合**           | layout = presentation の構造化                                                                                  |
|   7 | `R:form`          |         12 | `R:presentation`                                             | **N:1 統合**           | form = 入力受付の presentation                                                                                  |
|   8 | `R:navigation`    |          0 | `R:presentation`                                             | **N:1 統合**           | 検出 0 だが定義は presentation 系                                                                               |
|   9 | `R:query-plan`    |         21 | `R:hook`                                                     | **N:1 統合**           | application/hooks の data orchestration の一形態                                                                |
|  10 | `R:query-exec`    |         17 | `R:hook`                                                     | **N:1 統合**           | 同上                                                                                                            |
|  11 | `R:data-fetch`    | 検出未確認 | `R:hook`                                                     | **N:1 統合**           | 同上                                                                                                            |
|  12 | `R:state-machine` |         10 | `R:hook`                                                     | **N:1 統合**           | hook 内 state-machine pattern は orchestration の一形態                                                         |
|  13 | `R:orchestration` |         13 | `R:hook`                                                     | **N:1 統合**           | 名称の差異のみ                                                                                                  |
|  14 | `R:transform`     |         18 | **context-dependent**: `R:read-model` または `R:calculation` | **N:M context-judged** | parse 系 → R:read-model / 純粋数値変換 → R:calculation。Phase 6 Migration Rollout で per-file 判定              |
|  15 | `R:context`       |         12 | `R:store`                                                    | **N:1 統合**           | React Context = mutable state container                                                                         |
|  16 | `R:reducer`       |          2 | `R:store`                                                    | **N:1 統合**           | reducer = state 遷移ロジック（store の subset）                                                                 |
|  17 | `R:persistence`   |          2 | `R:store`                                                    | **N:1 統合**           | persistence = state の永続化（store の variant）                                                                |
|  18 | `R:adapter`       |          4 | `R:adapter`                                                  | **1:1 keep**           | 同名・同責務（infrastructure 境界）                                                                             |
|  19 | `R:utility`       |         48 | `R:unclassified`（**退避**）                                 | **N:1 退避**           | v1 の捨て場 → v2 では禁止（Phase 1 禁則 / 原則 1）。Phase 6 で個別 review window 経由で適切な v2 R:tag に再分類 |
|  20 | `R:barrel`        |          5 | `R:unclassified`（**退避**）                                 | **N:1 退避**           | barrel file は責務を持たない（re-export のみ）→ R:unclassified                                                  |

### 集約: v1 → v2 削減

| 軸                  |                v1 |  v2 |                                                                                                          削減 |
| ------------------- | ----------------: | --: | ------------------------------------------------------------------------------------------------------------: |
| Vocabulary 数       |                20 |  10 |                                                                                           -10（**50% 削減**） |
| Anchor Slice カバー | 1 (R:calculation) |   5 | +4 (R:bridge / R:read-model / R:guard / R:presentation の追加 — Phase 0 で path pattern 機械検出済 299 entry) |
| 捨て場タグ          |     1 (R:utility) |   0 |                                                                                             -1（原則 1 適用） |

## 2. R:unclassified 退避方針（Phase 1 禁止事項適用）

### 2.1. 退避対象（mechanical 退避）

Phase 6 Migration Rollout で **無条件に R:unclassified に変換** するファイル群。

| 退避対象                                                           | 件数 | 退避理由                                                                                                             |
| ------------------------------------------------------------------ | ---: | -------------------------------------------------------------------------------------------------------------------- |
| `R:utility` 付与済 file                                            |   48 | 捨て場タグ（v2 禁止）、責務未確定として退避                                                                          |
| `R:barrel` 付与済 file                                             |    5 | barrel = 責務なし（re-export only）                                                                                  |
| **タグなし file**（inventory `untagged: 1055`）                    | 1055 | 原則 1: タグなしは禁止、能動的 R:unclassified として明示                                                             |
| **不明 vocabulary 使用 file**（inventory `unknownVocabulary: 20`） |   20 | R:guard 16 / R:model 3 / R:selector 1（v1 vocabulary に存在しない）→ Phase 6 review window で v2 vocabulary に再分類 |

**退避時点での合計**: 48 + 5 + 1055 + 20 = **1128 entry が R:unclassified**（baseline 値）。

### 2.2. 退避後の段階的能動付与（Phase 6 Migration Rollout）

R:unclassified からの脱出は **review window 経由のみ**:

1. 各 file の責務を re-judge（path pattern + content analysis）
2. v2 R:tag candidate を提案（review-journal.md）
3. 四半期 review window で承認
4. 1 PR あたり最大 50 file ずつ R:unclassified → 具体 v2 R:tag に変換
5. 各変換 PR で `responsibilityTagGuardV2` の `unclassifiedBaseline` を ratchet-down

> **原則**: **R:unclassified を "0 にする" ことが目的ではない**（原則 1）。判断保留が必要な file は恒久的に R:unclassified に留まる権利を持つ。Phase 6 完了基準は「全 file が能動的に分類されている（タグなしが 0）」であり、R:unclassified が 0 ではない。

### 2.3. 1:1 マッピング不能なケース（context-judged）

`R:transform` (18 件) は **per-file context judgment** が必要:

| パターン                                         | v2 R:tag         | 例                                                                                     |
| ------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------- |
| Zod parse 系 transform（IO 境界の最初の anchor） | `R:read-model`   | `parseDuckDBRow` 系                                                                    |
| 純粋数値変換（domain/calculations 級）           | `R:calculation`  | `formatPercent` のような小規模変換は `R:calculation` ではなく可変 — review window 判定 |
| state shape 変換（Redux selector 等）            | `R:store`        | reducer 系 selector                                                                    |
| 描画前の最終整形（chart data builder）           | `R:presentation` | `buildChartData` 系                                                                    |

**Phase 6 で per-file review window**で確定する。本 Phase 2 では **判定 deferral リスト** として `R:transform` 18 件全件を退避対象に含めない（Phase 6 直前に確定）。

## 3. §OCS.4 Lifecycle State Machine の Migration 各段階への対応

親 plan §OCS.4 は vocabulary の生命状態を 6 段階で管理する。Migration Path の各段階に対応付ける:

```text
proposed → active → deprecated → sunsetting → retired → archived
```

### 3.1. v1 vocabulary の lifecycle 遷移

| Migration Phase                 | v1 R:tag の lifecycle 状態                                            | 移行内容                                                               | 撤退条件                           |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| **Phase 1 (Schema 設計)**       | `active`（v1 / v2 並行運用前提）                                      | v2 vocabulary 確定、v1 は変更なし                                      | —                                  |
| **Phase 2 (Migration Path)**    | `active`（変更なし）                                                  | 本 map で v1 → v2 mapping を文書化                                     | —                                  |
| **Phase 3 (Guard 実装)**        | `active`（並行運用継続）                                              | v2 guard 即時導入、v1 guard と並行                                     | —                                  |
| **Phase 4 (Pilot)**             | `active`                                                              | Pilot file ≤ 20 で v2 タグ試験運用、v1 は無変更                        | —                                  |
| **Phase 5 (Operations)**        | `active`                                                              | review window 開始                                                     | —                                  |
| **Phase 6 (Migration Rollout)** | `active` → segments 単位で **`deprecated`**（新規 file での使用禁止） | 全 file に v2 タグ付与 + v1 タグ deprecated 化                         | v2 タグ付与完遂時に `deprecated`   |
| **Phase 7 (v1 Deprecation)**    | `deprecated` → `sunsetting`（撤退期限明示、`@expiresAt`）             | sunset 期限 + warning 発行                                             | 90 日以上の撤退期限                |
| **Phase 8 (v1 Retirement)**     | `sunsetting` → `retired`（registry / guard 物理削除、ID は欠番保持）  | `responsibilityTagRegistry.ts` + `responsibilityTagGuard.test.ts` 削除 | sunset 期限到達 + 全 consumer 0 件 |
| **Phase 9 (Legacy Collection)** | `retired` → `archived`（歴史参照のみ）                                | 旧コメント / 旧 doc / 旧 reference 全削除                              | 全 v1 grep が 0 件                 |

### 3.2. v2 vocabulary の lifecycle 状態

Phase 1 で **全 v2 R:tag が `active` で landing 済**（registry V2 frontmatter 参照）。Phase 1 完遂時点で `proposed` の vocabulary はない。

> **新規 v2 R:tag 追加** が必要になった場合は **review window 経由のみ**（原則 3）。提案時 `proposed`、採択後 `active` に遷移。

### 3.3. R:unclassified の lifecycle

R:unclassified は **恒久 sentinel** として `active`。撤退条件なし（原則 1: 未分類は分類である）。

## 4. Migration の per-Phase 実装計画（参考）

### Phase 3: Guard 実装

- `responsibilityTagGuardV2.test.ts` 新設（v2 vocabulary 対象）
- v1 guard と並行運用（baseline ratchet-down 開始）
- `interlock guard`（R:tag → 必須 T:kind 検証）を responsibility 軸側 active 化

### Phase 4: Pilot

- Pilot 対象 ≤ 20 file（Anchor Slice 5 R:tag を最低 1 件ずつ含む）
- 例: `domain/calculations/grossProfit.ts` (R:calculation) / `application/readModels/salesFact/readSalesFact.ts` (R:read-model) / `app/src/test/guards/responsibilityTagGuard.test.ts` (R:guard)

### Phase 6: Migration Rollout

- 段階移行（PR あたり最大 50 file）:
  1. `R:utility` (48) + `R:barrel` (5) → `R:unclassified` 一括変換
  2. `R:chart-view` (59) → `R:presentation` 一括変換
  3. `R:chart-option` (24) + `R:widget` (26) → `R:presentation` 一括変換
  4. `R:query-plan` (21) + `R:query-exec` (17) → `R:hook` 一括変換
  5. `R:state-machine` (10) + `R:orchestration` (13) → `R:hook` 一括変換
  6. `R:context` (12) + `R:reducer` (2) + `R:persistence` (2) → `R:store` 一括変換
  7. `R:transform` (18) → review window で per-file 確定後変換
  8. `R:adapter` (4) → `R:adapter` 確認のみ
  9. `R:calculation` (25) → `R:calculation` 確認のみ
  10. **タグなし 1055 file** → `R:unclassified` 一括変換（最大件数）

### Phase 7: v1 Deprecation

- `responsibilityTagRegistry.ts` の 20 v1 R:tag に `@deprecated since: <date>, remove: <date+90d>` JSDoc 追加
- 移行期限を CLAUDE.md / references/02-status/ で参照可能化

### Phase 8: v1 Retirement

- `responsibilityTagRegistry.ts` 削除
- `responsibilityTagGuard.test.ts` 削除
- v1 R:tag 使用を禁止する新 guard（`responsibilityTagV1ProhibitionGuard.test.ts` 仮称）追加
- 関連 allowlist / ratchet baseline 削除

### Phase 9: Legacy Collection

- `grep -rn "responsibilityTagRegistry[^V]"` が 0 件
- `responsibility-separation-catalog.md` を v2 版に更新
- `CLAUDE.md` §G8 参照を v2 統一

## 5. 関連文書

| 文書                                                          | 役割                                                |
| ------------------------------------------------------------- | --------------------------------------------------- |
| `references/01-principles/responsibility-taxonomy-schema.md`  | v2 vocabulary 仕様正本 (Phase 1 deliverable)        |
| `references/01-principles/taxonomy-constitution.md`           | 7 不可侵原則（原則 1 / 2 / 3 が本 map の根拠）      |
| `references/01-principles/taxonomy-interlock.md`              | R⇔T マトリクス（v2 R:tag → 必須 T:kind）            |
| `references/02-status/responsibility-taxonomy-inventory.yaml` | Phase 0 baseline (1370 entry / 5 directories scope) |
| `app/src/test/responsibilityTaxonomyRegistryV2.ts`            | v2 registry 実装 (Phase 1 deliverable)              |
| `app/src/test/responsibilityTagRegistry.ts`                   | v1 registry（Phase 8 で retirement）                |
| `projects/taxonomy-v2/plan.md` §OCS.4                         | Lifecycle State Machine 仕様正本                    |
| `projects/responsibility-taxonomy-v2/checklist.md`            | 子 Phase 2-9 完了条件                               |
