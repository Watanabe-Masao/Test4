# legacy-retirement — widget-registry-simplification（SP-B）

> 役割: 本 project が撤退する legacy item の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md`
> の **LEG-009** が正本。本文書はその local view。

## 撤退対象

| LEG ID | 対象 | 撤退内容 | ADR | sunsetCondition |
|---|---|---|---|---|
| **LEG-009** | `registryAnalysisWidgets.tsx` 内 customerFact IIFE 群（旧: `(() => { const cf = ctx.readModels?.customerFact; return cf?.status === 'ready' ? ... })()`） | inline IIFE を `application/readModels/customerFact/selectors.ts` の pure selector (`selectTotalCustomers` / `selectCustomerCountOrUndefined` / `selectStoreCustomerMap`) に抽出後、call site 4 箇所を selector call に置換 | ADR-B-003 | ✅ 2026-04-26 sunsetCondition 達成（registryInlineLogicGuard baseline=0 fixed mode + ALLOWLIST 空 + 4 call site 全置換完了）|

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
