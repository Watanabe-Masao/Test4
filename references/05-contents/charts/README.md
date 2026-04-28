# charts — Chart Component 仕様書カタログ

> 役割: `app/src/presentation/components/charts/` 配下の chart component の **現状把握台帳**。
> 改修前の前提資料として、各 chart の source / 入力 builder / logic / view model / option builder /
> styles / 状態カバレッジ (empty / loading / ready / error) / visual evidence を 1 ファイルにまとめる。
>
> **本カテゴリの位置付けは親 README（`../README.md`）参照**。

## 型番体系

- 形式: `CHART-NNN`（3 桁ゼロ埋め）
- **一度割り当てたら再利用しない**。廃止時は欠番のまま保持
- source 側は `@chart-id CHART-NNN` JSDoc で宣言（generator が機械検証）
- spec doc ファイル名 = 型番 `.md`（例: `CHART-001.md`）

## Chart Input Builder Pattern との関係

`references/03-guides/chart-input-builder-pattern.md` で定式化された **3 層構造** を frontmatter
に記録する:

```
chart component (.tsx) ←─ render
       ↑
viewModel (.vm.ts) または Logic (.logic.ts) ←─ 描画用 data 構築
       ↑
inputBuilder (.builders.ts) ←─ 入力契約変換 (BaseQueryInput / PairedQueryInput → chart input)
       ↑
optionBuilder (OptionBuilder.ts、optional) ←─ ECharts option 生成
```

各 chart の spec は **どの層を持っているか** を frontmatter で宣言し、
`chartInputBuilderGuard` / `chartRenderingStructureGuard` 等の既存 guard と整合させる。

## 初期割当表（Phase E 着手段階で 5 件、漸次拡大）

`SP-B で touch されたもの` + `Chart Input Builder Pattern 完備` + `WID から canonical 参照` を
selection rule として優先 spec 化する。

| ID | export | 配置 | builders / logic / vm | 主な consumer (WID) |
|---|---|---|---|---|
| CHART-001 | `SalesPurchaseComparisonChart` | `presentation/components/charts/SalesPurchaseComparisonChart.tsx` | builders 有 / logic - / vm - | WID-006 |
| CHART-002 | `PerformanceIndexChart` | `presentation/components/charts/PerformanceIndexChart.tsx` | builders 有 / logic - / vm - | WID-018 |
| CHART-003 | `BudgetVsActualChart` | `presentation/components/charts/BudgetVsActualChart.tsx` | builders 有 / logic - / vm 有 | (legacy 系、Daily/Insight 経由) |
| CHART-004 | `CustomerScatterChart` | `presentation/components/charts/CustomerScatterChart.tsx` | builders 有 / logic - / vm - | WID-017 |
| CHART-005 | `GrossProfitAmountChart` | `presentation/components/charts/GrossProfitAmountChart.tsx` | builders - / logic 有 / vm - | WID-003 |

> Phase E 後続 batch で残 chart（IntegratedSalesChart 含む 30+ chart）を段階的 spec 化。
> 全網羅ではなく selection rule に従う（plan.md §3.2「Phase F 以降は全網羅でなく selection rule」を Phase E にも準用）。

## spec doc フォーマット

各 `CHART-NNN.md` は以下の構造を持つ。

### YAML frontmatter（generator が機械フィールド管理）

```yaml
---
id: CHART-001
kind: chart
exportName: SalesPurchaseComparisonChart
sourceRef: app/src/presentation/components/charts/SalesPurchaseComparisonChart.tsx
sourceLine: 144

# Chart Input Builder Pattern triple (optional、手書き)
inputBuilder: app/src/presentation/components/charts/SalesPurchaseComparisonChart.builders.ts
logic: null
viewModel: null
optionBuilder: null
styles: app/src/presentation/components/charts/SalesPurchaseComparisonChart.styles.ts

# 状態カバレッジ (Phase G visual evidence と連動、optional)
states:
  - empty
  - ready
stories: []
visualTests: []

# 業務意味の正本リンク (optional)
definitionDoc: null

# Lifecycle State Machine (kind 横断、Phase D で active 化)
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
| 1. 概要（1 文） | この chart の振る舞いを構造的に 1 文（C8） |
| 2. Input Contract | builder が受け取る input 契約（BaseQueryInput / PairedQueryInput / props） |
| 3. Render Model | logic / vm 経由で構築される描画用 data 構造 |
| 4. State Coverage | empty / loading / ready / error の各状態の振る舞い |
| 5. Visual Evidence | story / visual test path（Phase G で機械検証）|
| 6. Consumers | 主要 widget / 上位コンポーネント |
| 7. Co-Change Impact | 入力契約 / render data / option builder のどれが変わると壊れるか |
| 8. Guard / Rule References | 関連既存 guard (chartInputBuilderGuard / chartRenderingStructureGuard 等) |

## 3 軸 drift 防御（親 README §「3 軸の drift 防御」の charts サブカテゴリでの具体化）

### 存在軸: `AR-CONTENT-SPEC-EXISTS`（charts 版）

- spec frontmatter の sourceRef が指す chart .tsx に当該 export が実在
- source の export 行直前に `@chart-id CHART-NNN` JSDoc が付与（generator が機械検証）

### 構造軸: `AR-CONTENT-SPEC-FRONTMATTER-SYNC` + `AR-CONTENT-SPEC-CO-CHANGE`

- generator が source AST から `sourceLine` / `exportName` を再生成、diff 0 を強制
- registry source 行が変わったら spec 更新義務（既存 obligation-collector と整合）

### 時間軸: `AR-CONTENT-SPEC-FRESHNESS` + `AR-CONTENT-SPEC-OWNER`

- 全 spec に `owner` / `reviewCadenceDays` / `lastReviewedAt` 必須
- cadence 超過で fail（× 0.8 で warn）

### Lifecycle 軸: `AR-CONTENT-SPEC-LIFECYCLE-FIELDS` + `LIFECYCLE-LINK-SYMMETRY`

- Phase D で institutionalize した lifecycle state machine を chart にも適用
- chart の置換・廃止は Promote Ceremony PR template 経由
