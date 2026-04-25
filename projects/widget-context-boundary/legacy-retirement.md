# legacy-retirement — widget-context-boundary

> 役割: 本 project が撤退する legacy item の一覧と運用規約。
>
> **正本**: umbrella `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md`
> の **LEG-001〜LEG-008** が正本。本文書はその local view。

## 撤退対象

| LEG ID | 対象 | 撤退内容 | ADR | sunsetCondition |
|---|---|---|---|---|
| **LEG-001** | `UnifiedWidgetContext` page-local 5 field | field 削除（BC-1） | ADR-A-001 | page-specific ctx 移行完了 + guard baseline=0 |
| **LEG-002** | `UnifiedWidgetContext` Dashboard 固有 20 field | field 削除（BC-2） | ADR-A-002 | DashboardWidgetContext 移行完了 + guard baseline=0 |
| **LEG-003** | legacy `WidgetContext` alias | alias 削除 | ADR-A-002 PR4 | Dashboard registry 5 本が DashboardWidgetContext 直接使用 |
| **LEG-004** | 旧 `WidgetDef` | 2 型分離後の alias 削除（BC-3） | ADR-A-003 | 45 registry entry が新名に切替完了 |
| **LEG-005** | `StoreResult` 旧 shape | discriminated union 化後の削除（BC-4 part 1） | ADR-A-004 | 全 consumer が新型に移行完了 |
| **LEG-006** | `PrevYearData` 旧 shape | discriminated union 化後の削除（BC-4 part 2） | ADR-A-004 | 同上 |
| **LEG-007** | core required field への null check pattern | WID-031 / WID-033 の null check 除去 | ADR-A-004 PR3 | 2 widget で null check が型レベルで不要化 |
| **LEG-008** | optional fallback pattern（UnifiedWidgetContext に含まれる 17 field の optional 化）| BC-1 / BC-2 で必要 field を required 化 | ADR-A-001 / A-002 | 17 field が required or page-specific に集約 |

## 呼び出し元

各 LEG の呼び出し元は 45 widget の registry file + ctx 消費箇所。
grep 結果は各 ADR の PR description に添付する（umbrella plan.md §2 #9）。

## 移行先

| LEG | 移行先 |
|---|---|
| LEG-001 | `InsightWidgetContext` / `CostDetailWidgetContext` / `CategoryWidgetContext` の page-specific ctx |
| LEG-002 | `DashboardWidgetContext` |
| LEG-003 | `DashboardWidgetContext`（alias 不要） |
| LEG-004 | `DashboardWidgetDef` / `UnifiedWidgetDef` の 2 型 |
| LEG-005-006 | `StoreResult` / `PrevYearData` discriminated union |
| LEG-007 | 新 discriminated union により型レベルで null 除去 |
| LEG-008 | required field への昇格 or page-specific ctx への移動 |

## 撤退順序（各 ADR 内の 4 step pattern）

```
PR1: guard 追加 (baseline=current)
  ↓
PR2: 新型 / 新 ctx 並行導入（旧 alias 残置）
  ↓
PR3: consumer 移行（複数 batch, visual/E2E 検証）
  ↓
PR4: 旧 alias / 旧 shape 削除 + guard baseline=0
```

## rollback plan

- 各 ADR の PR4 を revert → 旧 alias 復帰
- PR3 batch を部分 revert する場合は、該当 widget だけ旧型に戻し、新 ctx との混在を型で弾く
- rollback 境界は **1 ADR 単位**

詳細は umbrella `inquiry/17-legacy-retirement.md §LEG-001〜§LEG-008` を参照。
