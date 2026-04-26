# legacy-retirement — widget-registry-simplification（SP-B）

> 役割: 本 project が撤退する legacy item の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md`
> の **LEG-009** が正本。本文書はその local view。

## 撤退対象

| LEG ID | 対象 | 撤退内容 | ADR | sunsetCondition |
|---|---|---|---|---|
| **LEG-009** | `buildPrevYearCostMap` helper（`registryChartWidgets.tsx` 内 inline） | registry file 内 inline pure helper を `application/readModels/customerFact/selectors.ts` または `presentation/pages/Dashboard/widgets/` 配下の pure helper に抽出後、inline 削除 | ADR-B-003 / ADR-B-004 | inline pattern が registryInlineLogicGuard baseline=0 に到達 + sunset 確認 |

## 呼び出し元

各 LEG の呼び出し元 grep 結果は各 ADR の PR description に添付する
（umbrella plan.md §2 #9 出口まで詰める原則）。

## 移行先

| LEG | 移行先 |
|---|---|
| LEG-009 | `application/readModels/customerFact/selectors.ts` の `selectTotalCustomers` / `selectStoreCustomerMap` / `selectCustomerCountOrUndefined` selector 群、または `presentation/pages/Dashboard/widgets/` 配下の純関数 helper |

## 撤退順序（4 step pattern）

```text
PR1: registryInlineLogicGuard baseline=current で追加（既存 inline pattern 数を ratchet-down 監視）
  ↓
PR2: 新 selector / helper 実装（pure fn、test 付き）
  ↓
PR3: registry 行を新 path に切替（複数 batch 可）
  ↓
PR4: 旧 inline pattern 削除 + guard baseline=0 + LEG-009 sunsetCondition 達成
```

## 参照

- umbrella: `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md §LEG-009`
- ADR 計画: `plan.md §ADR-B-003` / `§ADR-B-004`
- 本 project の checklist: `checklist.md` Phase 3 / Phase 4
