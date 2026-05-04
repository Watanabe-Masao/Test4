# breaking-changes — taxonomy-v2 (umbrella)

> 役割: umbrella level で実施する破壊的変更の一覧。
>
> **正本**: `projects/active/taxonomy-v2/plan.md` の 7 不可侵原則 + interlock 仕様。
> 本文書は AAG-COA 入口としての summary。

## 対象破壊的変更

| ID           | 対象                                                     | 破壊内容                                                                         | 実施 sub-project           |
| ------------ | -------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- |
| **BC-TAX-1** | 責務タグ vocabulary (R:\*)                               | v1 vocabulary 全入替 + `R:unclassified` の能動導入（タグなし → CI fail）         | responsibility-taxonomy-v2 |
| **BC-TAX-2** | テストタグ vocabulary (T:\*)                             | v1 にそもそも T:\* が存在しない → 新規導入（必須化で CI fail）                   | test-taxonomy-v2           |
| **BC-TAX-3** | R ⇔ T interlock 契約                                     | R:tag が T:kind obligation を発行。マトリクス未登録の組み合わせを guard で block | 親（本 project）           |
| **BC-TAX-4** | Origin Journal / Antibody Pairs / Cognitive Load Ceiling | 全タグに Why/When/Who/Sunset + 対概念タグ + 運用上限（15）を必須化               | 親（本 project）+ 両子     |

## umbrella level 運用規約

- **片軸だけの追加は禁止**（原則違反で block）— R / T は同じ review window で裁定
- **原則違反は全て AAG guard で hard fail**（ratchet も設けない。例外なし）
- **1 Phase = 1 不可侵原則**（親の Phase 構造で原則確定 → 子が実装）
- **BC-TAX-1 と BC-TAX-2 は同時昇格**（interlock 崩壊を防ぐため）

## 想定影響範囲

- **runtime 動作**: 影響 **なし**（AAG framework のみ、本体アプリのコードには触れない）
- **guard インフラ**: 新規 interlock guard 追加、既存 `responsibilityTagGuard` は v2 対応に書き換え
- **review window**: 全タグ追加・撤退は review window 経由（Cognitive Load Ceiling 維持）

## rollback plan

- 各 BC の sub-project PR を revert → 子単位で rollback 可
- interlock 契約（BC-TAX-3）の revert は親単位で実施（マトリクス戻し）
- Cognitive Load Ceiling 越えを発見した場合、該当タグの Sunset を前倒し

詳細は親の `plan.md` §7 不可侵原則 / §Interlock 仕様 / §8 昇華メカニズム、および
各 sub-project の `breaking-changes.md` を参照。
