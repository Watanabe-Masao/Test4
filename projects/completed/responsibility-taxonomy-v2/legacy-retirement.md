# legacy-retirement — responsibility-taxonomy-v2

> 役割: 本 project が撤退する legacy item の一覧と運用規約。
>
> **正本**: umbrella `projects/taxonomy-v2/legacy-retirement.md` の責務軸セクション。
> 本文書はその local view。

## 撤退対象

| 対象                                                     | 撤退内容                                             | Phase                                  | sunsetCondition                                        |
| -------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| **未分類 400 件 baseline**                               | `R:unclassified` 能動タグ化 + タグなし = CI fail     | Phase 2 (Migration)                    | 全 source file に R:tag（または `R:unclassified`）明示 |
| **タグ不一致 48 件 baseline**                            | schema 再設計 + 正確な軸分離で解消                   | Phase 1 (Schema) → Phase 2 (Migration) | 不一致 0 到達                                          |
| **`R:utility` 捨て場化（33 件）**                        | 語彙設計の再構築で個別 R:tag に再分類                | Phase 6-8                              | `R:utility` 利用 = 0                                   |
| **軸混在タグ（責務 × 純粋性 × 層を 1 タグに押し込み）**  | 1 タグ = 1 軸に分解（原則 2）                        | Phase 1 (Schema)                       | 全タグが軸 namespace 下                                |
| **Origin 不明タグ**                                      | Why/When/Who/Sunset メタデータ required 化（原則 5） | Phase 3 (Journal)                      | Origin Journal に全タグ記録                            |
| **global test obligation（TSIG-TEST-\*）**（※ 影響のみ） | test-taxonomy-v2 側で T:kind 別 obligation に分解    | —                                      | interlock マトリクスで保証                             |

## 呼び出し元

- v1 R:tag は `app/src/test/responsibilityTagRegistry.ts` + 全 source file の JSDoc
- `@responsibility-tag R:*` annotation は全 feature / application / presentation / domain に分散

## 移行先

| 撤退対象             | 移行先                                                                      |
| -------------------- | --------------------------------------------------------------------------- |
| 未分類 / タグなし    | `R:unclassified` 能動タグ                                                   |
| `R:utility`（33 件） | 個別 R:tag（`R:calculation` / `R:hook` / `R:guard` 等）の適切分類           |
| 軸混在タグ           | 軸 namespace 下の専用タグ（責務軸のみ）、他軸は別 namespace に分離          |
| Origin 不明          | Origin Journal（`references/01-principles/taxonomy-origin-journal.md`）記録 |

## 撤退順序

```
Phase 0: Inventory（全 R:tag 棚卸し + Origin 仮記録）
  ↓
Phase 1: Schema（R:tag vocabulary / Antibody Pairs / Cognitive Load 配分）
  ↓
Phase 2: Migration Path（v1 → v2 対応表 + R:unclassified 段階導入）
  ↓
Phase 3: Origin Journal（全タグに Why/When/Who/Sunset）
  ↓
Phase 4: Guard 実装（responsibilityTaxonomyGuard）
  ↓
Phase 5: interlock 連動（親 taxonomy-v2 側との契約）
  ↓
Phase 6-8: Legacy 段階撤退（R:utility 撤退、軸混在解消、未分類削減）
  ↓
Phase 9: baseline=0 fixed mode（review window 経由のみ追加）
```

## やってはいけないこと

- `R:utility` 以外の曖昧タグへの再退避（`R:unclassified` のみ許可）
- review window 外での R:tag 追加
- baseline ratchet-up（減少のみ許可）
- T:\* 側の整合性を無視した単独撤退（親の interlock で block）

## rollback plan

- 各 Phase の PR を revert → 該当 R:tag が復帰
- CI fail 化は別 commit のため独立 rollback
- rollback 境界は **Phase 単位**

詳細は umbrella `projects/taxonomy-v2/legacy-retirement.md` と本 project の
`plan.md` §Phase 2 / §Phase 6-9 を参照。
