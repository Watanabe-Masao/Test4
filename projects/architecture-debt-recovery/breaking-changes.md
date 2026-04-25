# breaking-changes — architecture-debt-recovery (umbrella)

> 役割: umbrella level で実施する破壊的変更の一覧。
>
> **正本**: `projects/architecture-debt-recovery/inquiry/16-breaking-changes.md`
> が正本。本文書は root-level の summary（AAG-COA 入口としての pointer）。

## 対象破壊的変更（全 7 件）

| ID | 対象 | 破壊内容 | 実施 sub-project | ADR |
|---|---|---|---|---|
| **BC-1** | `UnifiedWidgetContext` | page-local optional 5 field 剥離 | widget-context-boundary | ADR-A-001 PR4 |
| **BC-2** | `UnifiedWidgetContext` | Dashboard 固有 20 field 削除 + DashboardWidgetContext 置換 | widget-context-boundary | ADR-A-002 PR4 |
| **BC-3** | `WidgetDef` | 同名 2 型を 2 つに分離 | widget-context-boundary | ADR-A-003 PR4 |
| **BC-4** | `StoreResult` / `PrevYearData` | discriminated union 化、旧 shape 削除 | widget-context-boundary | ADR-A-004 PR4 |
| **BC-5** | Tier D orphan 3 件 | 物理削除 | duplicate-orphan-retirement | ADR-C-003 PR2 |
| **BC-6** | `RuleOperationalState.reviewPolicy` | optional → required 昇格 | aag-temporal-governance-hardening | ADR-D-001 PR3 |
| **BC-7** | `AllowlistEntry` | metadata required 昇格 | aag-temporal-governance-hardening | ADR-D-002 PR3 |

（SP-B Budget の BC は Phase 6 Wave 2 以降で spawn 予定）

## umbrella level 運用規約

- **BC は必ず sub-project 内で実施**（umbrella 直接実装は Phase 6 では行わない）
- **同一 Wave 内で複数 BC の連続 merge を禁止**（各 sub-project plan.md §不可侵原則）
- **rollback 境界は sub-project 単位**（sub-project PR4 を revert → 該当 BC が戻る）
- **Phase 4 で確定した 7 BC 以外の破壊的変更は追加禁止**（新規発見は addendum 承認後）

## 参照

- `inquiry/16-breaking-changes.md` — 各 BC の影響範囲 / 移行先 / rollback plan 詳細
- `inquiry/15-remediation-plan.md` — ADR 全体像
- 各 sub-project の `breaking-changes.md` — 当該 sub-project で実施する BC の local view
