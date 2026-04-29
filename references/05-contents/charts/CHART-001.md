---
id: CHART-001
kind: chart
exportName: SalesPurchaseComparisonChart
sourceRef: app/src/presentation/components/charts/SalesPurchaseComparisonChart.tsx
sourceLine: 145
inputBuilder: app/src/presentation/components/charts/SalesPurchaseComparisonChart.builders.ts
logic: null
viewModel: null
optionBuilder: null
styles: null
states:
  - empty
  - ready
stories: []
visualTests: []
definitionDoc: null
lifecycleStatus: active
replacedBy: null
supersedes: null
sunsetCondition: null
deadline: null
lastVerifiedCommit: db443c4da02705e4b7924933579ee92ebfe527c6
owner: implementation
specVersion: 1
---

# CHART-001 — 売上・仕入 店舗比較

## 1. 概要

`SalesPurchaseComparisonChart` は **memo 化された React component** で、複数店舗の売上 / 仕入を横並び棒チャートで比較する。SP-B Phase 6.5-5a で `storeDailyLane.bundle.currentSeries` を直接消費する形に refactor 済み（`storeDailyLaneSurfaceGuard` baseline 2 → 1 縮退、残 1 は `computeEstimatedInventory` 由来の permanent floor）。

## 2. Input Contract

- `comparisonResults: StoreResult[]`（2 店舗以上、registry 行で `length < 2` 早期 null return）
- `stores: readonly Store[]`
- `daysInMonth: number`
- `storeDailySeries: StoreDailySeries | null`（lane 経由、null なら markup/discount は表示縮退）
- `rangeStart` / `rangeEnd`（chartPeriodProps、optional）

派生入力 builder（`SalesPurchaseComparisonChart.builders.ts`）:
- `buildSalesPurchaseComparisonInput()` — props → chart input 変換

## 3. Render Model

- 横並び棒チャート（store × {sales, purchase}）
- `storeDailyLane.bundle.currentSeries` から sales/purchase を取得
- 比較順序は `Array.from(allStoreResults.values())` の Map 挿入順（registry 行の inline logic、INV-WID-006）

## 4. State Coverage

| state | 振る舞い |
|---|---|
| empty | `comparisonResults.length < 2` で null return（registry 行の早期 return）|
| ready | 2 店舗以上で正常描画 |
| loading | 専用 state なし（lane が pending なら storeDailySeries=null で markup/discount 縮退）|
| error | lane が error status の場合は registry 経由で fallback |

## 5. Visual Evidence

- 現状: visual test 未連携（Phase G で landing 予定）
- Storybook story 未整備（Phase G）

### Behavior Claims (Phase J Evidence Level)

| ID | claim | evidenceLevel | riskLevel | tests | guards | verificationNote |
|---|---|---|---|---|---|---|
| CLM-001 | `comparisonResults.length < 2` で null return（empty 状態は registry 行の早期 return で chart 描画前に skip） | reviewed | medium | - | - | 空状態の早期 return は registry 行で chart 描画前に skip する宣言的経路。chart layer の test は raw 計算 / fetch の不在を前提とし当該 condition は registry 側責務 |
| CLM-002 | storeDailyLane 経由で markup/discount 系列を取得（SP-B Phase 6.5-5a 移行済、raw `result.daily` 走査禁止） | guarded | high | - | app/src/test/guards/storeDailyLaneSurfaceGuard.test.ts | - |
| CLM-003 | lane pending → `storeDailySeries=null` で縮退描画（loading 状態の専用 spinner なし、空系列で chart は表示） | reviewed | medium | - | - | lane pending は infrastructure load 時の中間状態で、専用 spinner なしの縮退描画は UX 設計判断。chart layer test より infrastructure load test で構造的保証 |
| CLM-004 | lane error → registry 経由で fallback（ChartCard 通知のみ、chart 内部 error UI 禁止 = H6） | guarded | high | - | app/src/test/guards/topologyGuard.test.ts | - |

## 6. Consumers

- **WID-006** `chart-sales-purchase-comparison` — 唯一の registry consumer
- 他 page からの直接 import なし（widget registry 経由のみ）

## 7. Co-Change Impact

以下が変わると本 chart が壊れうる:

- `StoreResult` 型変更 → `comparisonResults` props の型エラー
- `Store` 型変更 → `stores` props 破壊
- `StoreDailySeries` 構造変更 → `storeDailySeries` lane 契約の修正必要
- `chartPeriodProps` 型変更 → range optional 転送の修正
- `SalesPurchaseComparisonChart.builders.ts` の signature 変更 → input 構築経路破壊
- `storeDailyLane.bundle.currentSeries` の lane 契約変更 → bundle 経由 chart 全体に影響

## 8. Guard / Rule References

- `chartInputBuilderGuard.test.ts` — chart 配下の `dateRangeToKeys` 直接呼び出し禁止 (本 chart は builder 経由で準拠)
- `chartRenderingStructureGuard.test.ts` — chart component 内 inline `build*Data` 禁止
- `storeDailyLaneSurfaceGuard.test.ts` — `result.daily` 直接 iterate を ratchet-down 管理（本 chart は lane 経由で準拠、SP-B Phase 6.5-5a で達成）
- `presentationIsolationGuard.test.ts` — presentation isolation
- `responsibilityTagGuard.test.ts` — R:component
- AR-CONTENT-SPEC-LIFECYCLE-FIELDS — 本 spec の lifecycle 整合
