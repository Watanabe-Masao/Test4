# legacy-retirement — architecture-debt-recovery (umbrella)

> 役割: umbrella level で撤退する legacy item の一覧。
>
> **正本**: `projects/architecture-debt-recovery/inquiry/17-legacy-retirement.md`
> が正本。本文書は root-level の summary（AAG-COA 入口としての pointer）。

## 撤退対象（全 15 件）

### Lane A (widget-context-boundary) — LEG-001〜LEG-008

| LEG ID | 対象 |
|---|---|
| LEG-001 | `UnifiedWidgetContext` page-local 5 field |
| LEG-002 | `UnifiedWidgetContext` Dashboard 固有 20 field |
| LEG-003 | legacy `WidgetContext` alias |
| LEG-004 | 旧 `WidgetDef` |
| LEG-005 | `StoreResult` 旧 shape |
| LEG-006 | `PrevYearData` 旧 shape |
| LEG-007 | core required field への null check pattern |
| LEG-008 | optional fallback pattern 17 field |

### Lane B (SP-B Budget, TBD — Phase 6 Wave 2+) — LEG-009

| LEG ID | 対象 |
|---|---|
| LEG-009 | Budget-related legacy items（SP-B spawn 時に詳細化） |

### Lane C (duplicate-orphan-retirement) — LEG-010〜LEG-015

| LEG ID | 対象 |
|---|---|
| LEG-010 | `features/category/ui/widgets.tsx` byte-identical 複製 |
| LEG-011 | `features/cost-detail/ui/widgets.tsx` byte-identical 複製 |
| LEG-012 | `features/reports/ui/widgets.tsx` byte-identical 複製 |
| LEG-013 | `useCostDetailData` pages 版 |
| LEG-014 | Tier D orphan 3 件 |
| LEG-015 | barrel re-export metadata 未設定群 |

### Lane D (aag-temporal-governance-hardening)

なし（本 Lane は governance 強化のみで legacy 撤退を含まない）。

## umbrella level 運用規約

- **各 LEG は該当 sub-project で撤退**（umbrella 直接撤退は行わない）
- **4 step pattern 完遂**（umbrella plan.md §2 #9: 新実装 → 移行 → 削除 → guard）
- **期限付き shim 禁止**（umbrella plan.md §2 #10）— `sunsetCondition` + `reviewPolicy` を
  必須とする（BC-7 で required 昇格後は型で強制）
- **deletion 前に consumer 0 確認**（各 sub-project plan.md）

## 参照

- `inquiry/17-legacy-retirement.md` — 各 LEG の詳細（撤退内容 / 呼び出し元 / 移行先 /
  sunsetCondition / rollback）
- 各 sub-project の `legacy-retirement.md` — 当該 sub-project で撤退する LEG の local view
