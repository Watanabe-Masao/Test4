# HANDOFF — responsibility-taxonomy-v2

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 Inventory 完遂（2026-04-26）。Phase 1 Schema 設計に進める状態。**

> **Phase 0 で landing したもの:**
>
> - `tools/scripts/responsibility-taxonomy-inventory.ts` — Inventory 生成 script
>   （再現可能、`cd app && npx tsx ../tools/scripts/responsibility-taxonomy-inventory.ts` で再生成）
> - `projects/responsibility-taxonomy-v2/derived/inventory/responsibility-taxonomy-inventory.yaml`
>   — 親 plan §Common Inventory Schema (CanonEntry shape) 準拠の Phase 0 baseline 1370 entry
>
> **作業 branch:** `claude/responsibility-taxonomy-v2-phase0-inventory`
> **scope:** project-internal のみ（`references/` 一切触らず）
> 親 Phase 4 統合 branch で derived → references/02-status/ に正本配置 + Origin Journal §R 転記。

### Phase 0 集計結果（baseline）

| 指標                                 | 値                                         |
| ------------------------------------ | ------------------------------------------ |
| total entries（5 directories scope） | 1370                                       |
| Anchor Slice 内 entry                | 299 (22%)                                  |
| ├ R:guard                            | 102                                        |
| ├ R:presentation                     | 112                                        |
| ├ R:calculation                      | 38                                         |
| ├ R:read-model                       | 31                                         |
| └ R:bridge                           | 16                                         |
| Drift Budget: untagged               | 1055 (77%)                                 |
| Drift Budget: unknownVocabulary      | 20 (R:guard 16 / R:model 3 / R:selector 1) |
| Drift Budget: missingOrigin          | 1370（v1 全タグ Origin unknown）           |

> **scope 注記:** 旧 v1 guard `responsibilityTagGuard` の TARGET_DIRS 5 件
> （application/hooks / presentation/\* / features/）は subset。本 inventory は
> v2 vocabulary 設計に必要な全 anchor 候補をカバーするため scope を拡大している。
> 旧 baseline 401 untagged は新 scope では 1055 untagged に変わる（同じ untagged ファイルが
> 多くカウントされる）。Phase 1 Schema で v2 vocabulary 設計時に scope 縮退も検討。

### Phase 0 着手承認の根拠（2026-04-26）

- 親 `projects/taxonomy-v2/checklist.md` Phase 3 §子 project キックオフ で
  本 project の Phase 0 着手が承認された
- 親 plan.md §Common Inventory Schema（CanonEntry shape）が確定（Phase 0 出力 shape）
- 親 plan.md §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` /
  `R:read-model` / `R:guard` / `R:presentation`）が確定（Phase 0 baseline 対象）
- 親 plan.md §OCS.6 Drift Budget の baseline 計測（責務軸 untagged /
  unknownVocabulary / missingOrigin）が本 plan.md Phase 0 成果物に記載済

### Phase 体系

```
Phase 0: Inventory（現行 v1 の全タグ棚卸し）
Phase 1: Schema 設計（R:tag vocabulary / Antibody Pairs）
Phase 2: Migration Path（v1 → v2 対応表 + R:unclassified 段階導入）
Phase 3: Guard 実装（responsibilityTagGuardV2 + interlock 検証）
Phase 4: Pilot（少数ファイルで試験運用）
Phase 5: Operations（review window の軸固有部分）
Phase 6: Migration Rollout（全ファイル段階移行）
Phase 7: v1 Deprecation
Phase 8: v1 Retirement（old guard 削除 + old tag 禁止 guard 化）
Phase 9: Legacy Collection（旧コメント / registry / 文書の掃除）
```

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先（次セッション = Phase 1 Schema 設計）

- Phase 0 inventory（1370 entry, Anchor 299 件）を読みながら v2 R:tag vocabulary 設計
- Cognitive Load Ceiling ≤ 15 に収まる vocabulary 配分（軸分離 + Antibody Pair）
- v2 R:tag frontmatter に親 plan §OCS.2 Evidence Level + §OCS.5 Promotion Gate L1 + §OCS.4 Lifecycle status を登録
- 対応 T:kind は TBD（test-taxonomy-v2 Phase 1 + 親 review window で同期裁定）
- `app/src/test/responsibilityTaxonomyRegistryV2.ts`（v1 併存）

### 中優先（親 Phase 4 統合時）

- `projects/responsibility-taxonomy-v2/derived/inventory/responsibility-taxonomy-inventory.yaml`
  を `references/02-status/responsibility-taxonomy-inventory.yaml` に正本配置
- 既存 v1 20 タグの Origin を `references/01-principles/taxonomy-origin-journal.md` §R に転記
  （親 Phase 1 残 2 checkbox の解消 — Origin 採取 + L2 到達）
- docs:generate で taxonomy-health.json に baseline を反映

### 中優先（Phase 1 以降）

- 軸分離スキーマの設計（responsibility × purity × layer）
- Antibody Pair の列挙（authoritative ↔ bridge 等）
- Cognitive Load 15 に収まる vocabulary 配分

### 低優先（Phase 5 以降）

- v1 deprecation 計画
- Legacy Collection の掃除対象リスト作成

## 3. ハマりポイント

### 3.1. 未分類 400 件を "削減" しようとしてはいけない

原則 1: 未分類は能動タグ。400 件を正しく `R:unclassified` にすることが Phase 2 のゴール
であり、「タグをつけて未分類を減らす」のは Phase 6 以降の話。Phase 2 で無理に分類すると
「嘘の単一責務」が大量発生する（AAG 原則 C9 違反）。

**対策:** Phase 2 では v1 のタグなし → v2 の `R:unclassified` 明示付与を優先。
分類を増やすのは Phase 6 Migration Rollout で review window を経由してから。

### 3.2. `R:utility` の捨て場化を繰り返さない

v1 では分類に迷ったら `R:utility` に押し込まれていた（33 件）。v2 で同じ罠を作らない。

**対策:** v2 では `R:utility` を廃止 or 厳密定義する。Phase 1 Schema 設計で
「最後の逃げ場」タグを作らない。迷ったら `R:unclassified` に。

### 3.3. Cognitive Load Ceiling（15）を超過する誘惑

軸分離（責務 × 純粋性 × 層）するとタグ数が膨らみやすい。

**対策:**

- 軸ごとに別 namespace（R: = 責務のみ。純粋性は Purity:\*、層は Layer:\* 等、別 axis）
- Phase 1 で責務軸の vocabulary を ≤ 15 に絞る
- 超過した場合は統廃合 or 親 Constitution 変更の 2 択を親 Discovery Review で裁定

### 3.4. test 軸（T:kind）を勝手に決めない

interlock 仕様（R ⇔ T マトリクス）は親の所掌。本 project で R:tag を決める際、
対応する T:kind を仮置きしてはいけない（test-taxonomy-v2 との同期 review window で決定）。

**対策:** 本 project の R:tag 提案時、対応 T:kind は "TBD: see test-taxonomy-v2
Phase 1" と記録し、実際の値は親 Phase 2 review window で両軸同時裁定。

### 3.5. v1 guard を Phase 3 で消してはいけない

新 guard (v2) と旧 guard (v1) の並行運用期間が Phase 3-7。Phase 3 で v1 を止めると
未分類 400 件が roll back する。

**対策:** Phase 3-7 は v1 + v2 両方の guard を動かす。v1 sunset は Phase 7、
撤去は Phase 8。pure-calculation-reorg と同じ「定義した Phase で即導入、撤去は最後」原則。

## 4. 関連文書

| ファイル                                             | 役割                                    |
| ---------------------------------------------------- | --------------------------------------- |
| `AI_CONTEXT.md`                                      | プロジェクト意味空間の入口              |
| `plan.md`                                            | 10 Phase 構造 + Phase 別禁止事項        |
| `checklist.md`                                       | Phase 完了条件                          |
| 親: `projects/taxonomy-v2/plan.md`                   | 7 不可侵原則 + interlock 仕様（制約元） |
| `app/src/test/responsibilityTagRegistry.ts`          | 現行 v1 正本                            |
| `app/src/test/guards/responsibilityTagGuard.test.ts` | 現行 v1 guard                           |
| 兄弟: `projects/test-taxonomy-v2/HANDOFF.md`         | テスト軸（同期 window 運用）            |
