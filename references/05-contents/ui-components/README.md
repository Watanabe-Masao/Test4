# ui-components — Selected UI Component 仕様書カタログ

> 役割: `app/src/presentation/components/` 配下の **selection rule 通過 UI component** の現状把握台帳。
> 全網羅ではなく、複数 widget / page から再利用される「公開契約」を持つ UI 部品のみを対象とする。
>
> **本カテゴリの位置付けは親 README（`../README.md`）参照**。

## 型番体系

- 形式: `UIC-NNN`（3 桁ゼロ埋め）
- **一度割り当てたら再利用しない**
- source 側は `@uic-id UIC-NNN` JSDoc で宣言（generator が機械検証）
- spec doc ファイル名 = 型番 `.md`

## Selection Rule（plan.md §Phase F）

次の **いずれか 2 つ以上**を満たす component のみを spec 化対象とする:

1. **複数 widget / page から使われる** — registry / page で 2+ 箇所から import
2. **props contract が重い** — 5+ props or generic / Pick<> pattern を持つ
3. **readModel / pipeline に依存する** — ctx 経由でなく、直接 readModel / hook を内部呼出
4. **guard 対象** — `responsibilitySeparationGuard` / `presentationIsolationGuard` 等で hotspot
5. **責務分離違反リスクが高い** — `responsibility-separation` allowlist に残数あり / G8 P20 useMemo + useCallback 上限

> **過剰網羅は drift コストを上げる**（plan.md §3.2 + §C9 「現実把握優先」）。
> 「なんとなく共通」レベルの component は spec 化しない。

## 初期割当表（Phase F 着手段階で 5 件、漸次拡大）

| ID | export | 配置 | category | 該当 selection rule |
|---|---|---|---|---|
| UIC-001 | `ConditionSummaryEnhanced` | `presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx` | dashboard-summary | 1 (4 widget 参照) + 2 (Pick<> 重 props) + 4 (responsibilityTagGuard 対象) |
| UIC-002 | `KpiCard` | `presentation/components/common/KpiCard.tsx` | kpi-display | 1 (5+ pages) + 2 (KpiWarningInfo / KpiDisplayMode 重 props) + Storybook あり |
| UIC-003 | `KpiGrid` | `presentation/components/common/KpiCard.styles.ts` | kpi-layout | 1 (KpiCard と pair で多用) |
| UIC-004 | `ChartCard` | `presentation/components/charts/ChartCard.tsx` | chart-shell | 1 (全 chart 共通 wrapper) + 2 (header / toolbar / state slot) |
| UIC-005 | `ChartLoading` | `presentation/components/charts/ChartState.tsx` | chart-state | 1 (loading 共通) + 同 module の `ChartError` / `ChartEmpty` と pair |

> Phase F 後続 batch で残 component を段階展開（全網羅しない、selection rule 通過のみ）。

## spec doc フォーマット

### YAML frontmatter（generator が機械フィールド管理）

```yaml
---
id: UIC-001
kind: ui-component
exportName: ConditionSummaryEnhanced
sourceRef: app/src/presentation/pages/Dashboard/widgets/ConditionSummaryEnhanced.tsx
sourceLine: 97

# 用途分類（手書き、parent README §「Selection Rule」と整合）
category: dashboard-summary

# hooks 使用（state ownership 透明化、手書き）
hooks:
  - useState
  - useMemo

# children に渡す主な component 名
children:
  - ConditionSummaryEnhancedRows

# side effects (DOM access / portal / global state 等)
sideEffects: []

# 状態カバレッジ
states:
  - empty
  - ready
stories: []
visualTests: []

# Lifecycle
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null

# 構造 drift 防御
lastVerifiedCommit: <sha>

# 時間 drift 防御
owner: implementation
reviewCadenceDays: 90
lastReviewedAt: 2026-04-28

specVersion: 1
---
```

### prose セクション（手書き、短く）

| セクション | 書く内容 |
|---|---|
| 1. 概要（1 文） | この component の振る舞いを構造的に 1 文（C8） |
| 2. Props Contract | props 型 / required / optional / default の重要な設計判断 |
| 3. State Ownership | 内部 state（useState 等）の有無と、外部から制御される範囲の境界 |
| 4. Hook Dependencies | useReadModel / useFeature flag / useToast 等の依存 hook |
| 5. Side Effects | DOM access / portal / focus management / global store 等 |
| 6. State Coverage | empty / loading / ready / error の振る舞い |
| 7. Visual Evidence | story / visual test path |
| 8. Consumers | 主要 widget / page |
| 9. Co-Change Impact | 何が変わると壊れるか |
| 10. Guard / Rule References | 関連既存 guard |

## 3 軸 drift 防御

3 軸は他カテゴリと同じ（plan.md / parent README 参照）:
- 存在軸: AR-CONTENT-SPEC-EXISTS（`@uic-id UIC-NNN` JSDoc 必須）
- 構造軸: AR-CONTENT-SPEC-FRONTMATTER-SYNC + AR-CONTENT-SPEC-CO-CHANGE
- 時間軸: AR-CONTENT-SPEC-FRESHNESS + AR-CONTENT-SPEC-OWNER
- Lifecycle 軸: AR-CONTENT-SPEC-LIFECYCLE-FIELDS + LIFECYCLE-LINK-SYMMETRY
