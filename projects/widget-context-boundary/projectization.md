# projectization — widget-context-boundary

> 役割: AAG-COA 判定結果。
> 規約: `references/03-guides/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | architecture-refactor |
| `implementationScope` | `["app/src/application/context/", "app/src/application/registries/", "app/src/presentation/widgets/", "app/src/domain/models/", "app/src/test/guards/"]` |
| `breakingChange` | true |
| `requiresLegacyRetirement` | true |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

umbrella `architecture-debt-recovery` の **Lane A sub-project**。45 widget に影響する
最重量級の型境界再構築。UnifiedWidgetContext page-local 剥離 / Dashboard 固有集約 /
WidgetDef 2 型分離 / StoreResult・PrevYearData discriminated union 化を 4 ADR × 4 step =
16 PR で実施する。

- **Level 3** — 4 ADR × 4 step = 16 PR、複数層（application context / registries /
  presentation widgets / domain models）にまたがる architecture level の refactor。
  ただし単一 sub-project のため Level 4 ではない
- **changeType=architecture-refactor** — 型境界の再構築（振る舞い不変だが型 shape を破壊）
- **breakingChange=true** — BC-1 / BC-2 / BC-3 / BC-4 の 4 件すべて context / WidgetDef /
  core required shape の破壊的変更
- **requiresLegacyRetirement=true** — LEG-001〜LEG-008 の 8 legacy item（旧型 alias・
  optional fallback pattern 等）の撤退
- **requiresGuard=true** — 4 guard 新設（unifiedWidgetContextNoPageLocalOptionalGuard /
  unifiedWidgetContextNoDashboardSpecificGuard / sameInterfaceNameGuard /
  coreRequiredFieldNullCheckGuard）
- **requiresHumanApproval=true** — 45 widget 影響 + 複数 BC のため archive 前に人間承認必須

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | Level 3 必須 |
| `HANDOFF.md` | required | Level 3 必須 |
| `plan.md` | required | 4 ADR × 4 step の実行計画 |
| `checklist.md` | required | completion 判定入力 |
| `inquiry/` | forbidden | parent umbrella inquiry/ + WSS 45 widget spec に依存 |
| `breaking-changes.md` | required | BC-1〜BC-4 の運用 |
| `legacy-retirement.md` | required | LEG-001〜LEG-008 の撤退運用 |
| `sub-project-map.md` | forbidden | 本 project 自体が sub-project |
| guard 設計 (plan.md 内) | required | 4 guard の baseline 戦略 |
| 最終レビュー (人間承認) checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

- 他 Lane（SP-B / SP-C / SP-D）の item
- `@widget-id WID-NNN` JSDoc 注入（WSS 体系は Phase 6 別 project で扱う）
- Budget Simulator informed-by R4 の specific cleanup（関連 ADR に吸収済み）
- runtime 動作の変更（ユーザー可視の機能破壊を禁止）
- 新規 widget の追加

## 5. Escalation / De-escalation 条件

- 45 widget の consumer 移行 PR（PR3）で visual / E2E 回帰が発生 → rollback + plan 見直し
- WSS 仕様が大幅変更され影響範囲が広がる場合 → umbrella 側で scope 拡張承認
- 新たな型境界の破壊的変更が必要と判明した場合 → umbrella inquiry に addendum 追加承認後

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-23 | spawn（SP-A Wave 1） | umbrella Phase 6 Wave 1 |
| 2026-04-24 | AAG-COA 遡及判定 (Level 3) | projectization-policy 導入後の retroactive 付与 |
