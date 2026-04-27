# legacy-retirement — test-taxonomy-v2

> 役割: 本 project が撤退する legacy item の一覧と運用規約。
>
> **正本**: umbrella `projects/taxonomy-v2/legacy-retirement.md` のテスト軸セクション。
> 本文書はその local view。

## 撤退対象

| 対象                                                       | 撤退内容                                                                   | Phase               | sunsetCondition                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------- |
| **global `TSIG-TEST-*` obligation**（全テスト一律適用）    | T:kind 別 obligation に分解                                                | Phase 4-5           | 全 test file に T:kind タグ付与（または `T:unclassified`） |
| **T:kind vocabulary 不在**                                 | 新規導入（`T:unit-numerical` / `T:contract-parity` / `T:zod-contract` 等） | Phase 1 (Schema)    | vocabulary 確定 + Origin Journal 記録                      |
| **existence-only assertion**                               | T:kind 別の品質基準で検出 + 修正 / 削除                                    | Phase 6-7           | 無品質 test = 0                                            |
| **R:calculation への T:unit-numerical 不在**（無検証状態） | interlock マトリクスで必須化                                               | Phase 5（親と連動） | interlock guard fixed mode                                 |
| **snapshot-only テスト**                                   | T:kind 別に分類 → 主要挙動を T:kind 指定で検証                             | Phase 7-8           | 無意味 snapshot = 0                                        |
| **mock call count のみで満足するテスト**                   | T:kind 別の品質基準で検出 + 修正                                           | Phase 7-8           | 違反 = 0                                                   |

## 呼び出し元

- 既存 TSIG guard は `app/src/test/guards/testSignalIntegrityGuard.test.ts`
- 全 test file の `describe / it` ブロック
- `@test-kind T:*` annotation を JSDoc に追記

## 移行先

| 撤退対象                 | 移行先                                                              |
| ------------------------ | ------------------------------------------------------------------- |
| global TSIG-TEST-\*      | T:kind 別 obligation（`T:unit-numerical` / `T:contract-parity` 等） |
| タグなし test            | `T:unclassified` 能動タグ                                           |
| existence-only assertion | T:kind 別の品質基準で検証実装                                       |
| snapshot-only            | T:render-shape + 主要分岐の明示検証                                 |
| mock call count 偏重     | T:state-transition + 実副作用検証                                   |

## 撤退順序

```
Phase 0: Inventory（全 test file 棚卸し + 品質度評価）
  ↓
Phase 1: Schema（T:kind vocabulary / Antibody Pairs / Cognitive Load 配分）
  ↓
Phase 2: Migration Path（TSIG-TEST-* → T:kind 対応 + T:unclassified 段階導入）
  ↓
Phase 3: Origin Journal（全 T:kind に Why/When/Who/Sunset）
  ↓
Phase 4: Guard 実装（testTaxonomyGuard + TSIG 書き換え）
  ↓
Phase 5: interlock 連動（親 taxonomy-v2 側 R:tag との契約）
  ↓
Phase 6-8: Legacy 段階撤退（existence-only / snapshot-only / mock 偏重の是正）
  ↓
Phase 9: baseline=0 fixed mode（review window 経由のみ追加）
```

## やってはいけないこと

- `T:unknown` 等の曖昧タグへの退避（`T:unclassified` のみ許可）
- review window 外での T:kind 追加
- baseline ratchet-up（減少のみ許可）
- R:\* 側の整合性を無視した単独撤退（親の interlock で block）
- テスト削除時に該当ロジックの品質低下を放置（削除するなら代替検証を用意）

## rollback plan

- 各 Phase の PR を revert → 該当 T:kind の変更が戻る
- CI fail 化は別 commit のため独立 rollback
- 無品質 test 修正は個別 PR で独立 revert 可
- rollback 境界は **Phase 単位**

詳細は umbrella `projects/taxonomy-v2/legacy-retirement.md` と本 project の
`plan.md` §Phase 2 / §Phase 6-9 を参照。
