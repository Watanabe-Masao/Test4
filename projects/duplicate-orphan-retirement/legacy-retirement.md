# legacy-retirement — duplicate-orphan-retirement

> 役割: 本 project が撤退する legacy item の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md`
> の **LEG-010〜LEG-015** が正本。本文書はその local view。

## 撤退対象

| LEG ID | 対象 | 撤退内容 | ADR | sunsetCondition |
|---|---|---|---|---|
| **LEG-010** | `features/category/ui/widgets.tsx` | byte-identical 複製を barrel re-export 化 or 削除 | ADR-C-001 | import 経路 0 で削除完了 |
| **LEG-011** | `features/cost-detail/ui/widgets.tsx` | 同上 | ADR-C-001 | 同上 |
| **LEG-012** | `features/reports/ui/widgets.tsx` | 同上 | ADR-C-001 | 同上 |
| **LEG-013** | `useCostDetailData` pages 版 | features 版単一正本化、pages 版削除 | ADR-C-002 | 全 consumer が features 版 import に切替後削除 |
| **LEG-014** | Tier D orphan 3 件 | 物理削除（BC-5） | ADR-C-003 | 3 file 削除 + guard baseline=0 到達 |
| **LEG-015** | barrel re-export metadata 未設定群 | `@sunsetCondition` + `@expiresAt` + `@reason` JSDoc bulk 追記 | ADR-C-004 | 全 barrel に metadata 付与 + guard baseline=0 |

## 呼び出し元

各 LEG の呼び出し元 grep 結果は各 ADR の PR description に添付する
（umbrella plan.md §2 #9 出口まで詰める原則）。

## 移行先

| LEG | 移行先 |
|---|---|
| LEG-010-012 | `@/presentation/pages/<Page>/widgets` が正本 |
| LEG-013 | `features/cost-detail/application/hooks/useCostDetailData` が正本 |
| LEG-014 | 移行先なし（純粋な削除） |
| LEG-015 | 既存 barrel 自体は維持、metadata を追記するだけ |

## 撤退順序（各 ADR 内の 4 step pattern）

```
PR1: guard 追加 (baseline=current)
  ↓
PR2: barrel re-export 化 or metadata 追記 (新実装)
  ↓
PR3: consumer grep 0 確認 → 旧実装削除
  ↓
PR4: guard baseline=0 fixed mode
```

ADR-C-003 は 3 step（barrel 化が発生しないため PR2 で削除実施、PR3 で guard fixed mode）。

## rollback plan

- 各 ADR の PR3（削除）を revert すれば該当 file 復帰
- guard baseline は PR4 commit のため、PR3 revert 時は別途手動で baseline を戻す

詳細は umbrella `inquiry/17-legacy-retirement.md §LEG-010` 〜 `§LEG-015` を参照。
