# plan — widget-context-boundary（SP-A）

> umbrella `architecture-debt-recovery` の `inquiry/15 §Lane A` の詳細実行版。

## 不可侵原則

1. umbrella plan.md §2 不可侵原則 16 項を全て継承
2. 1 PR = 1 ADR step、4 ADR × 4 step = **16 PR**
3. 45 widget 影響の consumer 移行 PR（PR3）は**複数 batch**に分け、各 batch で visual / E2E 回帰検証
4. BC-1〜BC-4 は連続 merge 禁止、間に他作業を挟む
5. 45 widget の `lastVerifiedCommit` を各 PR で手動更新（WSS generator 実装まで）
6. 旧型 alias は PR4 までに必ず削除（plan.md §2 #10 レガシー撤退）

## 4 ADR 実行計画

### ADR-A-001. UnifiedWidgetContext page-local optional 5 剥離（BC-1）

| step | 内容 |
|---|---|
| PR1 | `unifiedWidgetContextNoPageLocalOptionalGuard` baseline=5 で追加 |
| PR2 | `InsightWidgetContext` / `CostDetailWidgetContext` / `CategoryWidgetContext` を新設、各 page registry で使用 |
| PR3（複数 batch） | INSIGHT 6 widget / COST_DETAIL 4 widget / CATEGORY 2 widget を page-specific ctx に切替 |
| PR4 | UnifiedWidgetContext から 5 field 削除、guard baseline=0 |

### ADR-A-002. Dashboard 固有 20 field 集約（BC-2）

| step | 内容 |
|---|---|
| PR1 | `DashboardWidgetContext` を新設、既存 `WidgetContext` を alias として残置 |
| PR2 | `unifiedWidgetContextNoDashboardSpecificGuard` baseline=20 で追加 |
| PR3（複数 batch） | Dashboard registry 5 本（KPI/CHART/EXEC/ANALYSIS/DUCKDB）の 29 widget を DashboardWidgetContext に接続 |
| PR4 | UnifiedWidgetContext から Dashboard 固有 20 field 削除、guard baseline=0、legacy WidgetContext alias 削除 |

### ADR-A-003. WidgetDef 2 型分離（BC-3）

| step | 内容 |
|---|---|
| PR1 | `sameInterfaceNameGuard` baseline=1（WidgetDef のみ allowlist）で追加 |
| PR2 | `DashboardWidgetDef` / `UnifiedWidgetDef` を新設、既存 WidgetDef を両 file で alias |
| PR3 | 全 45 registry entry を新名に切替 |
| PR4 | 旧 WidgetDef alias 削除、guard baseline=0 |

### ADR-A-004. StoreResult / PrevYearData discriminated union 化（BC-4）

| step | 内容 |
|---|---|
| PR1 | `coreRequiredFieldNullCheckGuard` baseline=2（WID-031, WID-033）で追加 |
| PR2 | `StoreResult` / `PrevYearData` の discriminated union 型を並行導入（旧 shape alias 残置） |
| PR3 | 全 consumer を新型に移行 |
| PR4 | 旧 shape 削除、guard baseline=0 |

## 依存関係

```text
SP-A Start (Wave 1)
    ├─ ADR-A-001 PR1 (guard baseline=5 追加)
    ├─ ADR-A-002 PR1 (DashboardWidgetContext 新設)
    ├─ ADR-A-003 PR1 (sameInterfaceNameGuard 追加)
    └─ ADR-A-004 PR1 (coreRequiredFieldNullCheckGuard 追加)
    ↓
    ├─ ADR-A-001 PR2-4 (page-specific ctx 導入 → 移行 → 削除)
    ├─ ADR-A-002 PR2-4 (Dashboard 固有集約 → 移行 → 削除)
    └─ ADR-A-003 PR2-4 (WidgetDef rename → 移行 → alias 削除)
    ↓ (A-001/002/003 PR4 完了)
    └─ ADR-A-004 PR2-4 (discriminated union 導入 → 移行 → 旧 shape 削除)
    ↓
SP-A completion
    ↓ (unlocks SP-B)
```

## 破壊的変更

- BC-1 (A-001): UnifiedWidgetContext 5 field 削除
- BC-2 (A-002): UnifiedWidgetContext 20 field 削除 + DashboardWidgetContext 導入
- BC-3 (A-003): WidgetDef rename（同名並存解消）
- BC-4 (A-004): core required shape 変更（discriminated union）

各 BC は独立 PR で実施（umbrella plan.md §2 #3）。

## 禁止事項

1. 45 widget 全件を 1 PR で migration（複数 batch 必須）
2. BC-1〜BC-4 を 1 PR に混ぜる
3. 旧 shape / 旧 alias を PR4 後も残す
4. WSS spec の `lastVerifiedCommit` 更新を forget
5. visual / E2E 回帰検証を skip

## 参照

- umbrella: `projects/architecture-debt-recovery/plan.md`
- umbrella inquiry: `inquiry/15 §Lane A` / `inquiry/16 §BC-1〜BC-4` / `inquiry/17 §LEG-001〜LEG-008` / `inquiry/10a §C-02/C-05/C-10/C-11`
- WSS: `references/05-contents/widgets/WID-001〜WID-045.md`
- 運用規約: `references/03-guides/project-checklist-governance.md`
