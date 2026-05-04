# legacy-retirement — taxonomy-v2 (umbrella)

> 役割: umbrella level で撤退する legacy item の一覧。
>
> **正本**: `projects/active/taxonomy-v2/plan.md` の 7 不可侵原則 + Sunset 要件。本文書は
> AAG-COA 入口としての summary。

## 撤退対象

### v1 責務タグ体系（責任: responsibility-taxonomy-v2）

| 対象                                  | 撤退内容                                         |
| ------------------------------------- | ------------------------------------------------ |
| 未分類 400 件 baseline                | `R:unclassified` 能動タグ化 + tag なし = CI fail |
| タグ不一致 48 件 baseline             | schema 再設計 + 正確な軸分離で解消               |
| `R:utility` 捨て場化（33 件）         | 語彙設計の再構築で個別 R:tag に再分類            |
| 軸混在（責務 × 純粋性 × 層を 1 タグ） | 1 タグ = 1 軸（原則 2）に分解                    |
| Origin 不明タグ                       | Why/When/Who/Sunset 必須化（原則 5）             |

### v1 テストタグ不在（責任: test-taxonomy-v2）

| 対象                                                       | 撤退内容                                 |
| ---------------------------------------------------------- | ---------------------------------------- |
| global `TSIG-TEST-*` obligation                            | T:kind 別 obligation に分解              |
| 「R:calculation なのに T:unit-numerical 不在」の無検証状態 | interlock マトリクスで必須化（BC-TAX-3） |
| existence-only assertion の検出欠損                        | T:kind 別の品質基準で enforce            |

## umbrella level 運用規約

- **各タグに Sunset 条件** — Origin Journal に必須記録（原則 5）
- **review window 経由で撤退** — 日常作業では `R:unclassified` / `T:unclassified` に退避
- **Antibody Pair 維持** — 対概念タグが存在することを原則 6 で保証
- **Cognitive Load Ceiling = 15**（軸ごと）— 撤退により余裕を確保

## 撤退順序

```
親 Phase 1: 7 不可侵原則 + interlock 仕様 確定
  ↓
子 Phase 0-1: Inventory + Schema 設計
  ↓
子 Phase 2: Migration Path（v1 → v2 対応表 + unclassified 段階導入）
  ↓
子 Phase 3-5: Guard / Operations 実装
  ↓
子 Phase 6-9: Legacy 段階撤退（review window 経由）
  ↓
親 Phase 最終: interlock 成立確認 + Cognitive Load Ceiling 評価
```

## やってはいけないこと

- **片軸だけの撤退**（interlock 崩壊）
- **未分類タグを曖昧タグに退避**（`R:utility` を再度使う等）— `R:unclassified` のみ許可
- **review window 外での撤退判断**
- **baseline を段階後退させる**（ratchet-up）

## rollback plan

- 各子 project の PR を revert → 該当タグが復帰
- review window 内で撤退合意が崩れた場合 → Origin Journal に記録して中止

詳細は親の `plan.md` §7 不可侵原則 / §8 昇華メカニズム、および各 sub-project の
`legacy-retirement.md` を参照。
