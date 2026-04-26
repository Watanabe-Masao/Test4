# HANDOFF — responsibility-taxonomy-v2

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 着手承認済（kicked off, 2026-04-26）。Phase 0 Inventory 作業を開始可能。**

親 `taxonomy-v2` の Phase 1（Constitution 起草）+ Phase 2（Review Window 仕様）が
完遂し、Phase 3 で本 project の Phase 0 着手が承認された。
親 plan.md §Common Inventory Schema（CanonEntry shape）+ §OCS.7 Anchor Slice
5 R:tag が確定したため、Inventory の出力 shape と対象範囲は決定済。

### 着手承認の根拠

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

### 高優先（Phase 0 キックオフ時）

- 親 Phase 1 の Constitution + interlock 仕様の確定を待つ
- 現行 v1 の 20 タグ + 未分類 400 件 + タグ不一致 48 件を Inventory 化
- `references/02-status/responsibility-taxonomy-inventory.yaml` に記録

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
