# read-models — ReadModel 仕様書カタログ

> 役割: `app/src/application/readModels/` に配置された正本 readModel の **現状把握台帳**。
> 改修前の前提資料として、各 readModel の source / 入出力契約 / 依存 source / consumer / fallback 戦略を 1 ファイルにまとめる。
>
> **本カテゴリの位置付けは親 README（`../README.md`）参照**。
> ユーザー向け機能説明ではない。学習用解説ではない。改修者のための事実台帳。

## 型番体系

- 形式: `RM-NNN`（3 桁ゼロ埋め）
- **一度割り当てたら再利用しない**。廃止時は欠番のまま保持
- source 側は `@rm-id RM-NNN` JSDoc で宣言（Phase C で導入、generator が機械検証）
- spec doc ファイル名 = 型番 `.md`（例: `RM-001.md`）

### 初期割当表（2026-04-27 時点、Phase C 着手段階で 10 件）

`canonicalizationSystemGuard.test.ts` が監視する正本 readModel 群を起点に、
複数 widget 参照 / fallback / readiness / 業務意味 (CLAUDE.md「正本化体系」表)
の 4 観点から優先度付けして選定する。

| ID | export | 配置 | 業務意味 | 定義書 |
|---|---|---|---|---|
| RM-001 | `readPurchaseCost` | `app/src/application/readModels/purchaseCost/readPurchaseCost.ts` | 仕入原価（3 系統 typeIn / typeOut / costInclusion を統合） | `references/01-foundation/purchase-cost-definition.md` |
| RM-002 | `calculateGrossProfit` | `app/src/application/readModels/grossProfit/calculateGrossProfit.ts` | 粗利（4 種: 在庫法×2 / 推定法×2） | `references/01-foundation/gross-profit-definition.md` |
| RM-003 | `buildSalesFactReadModel` | `app/src/application/readModels/salesFact/readSalesFact.ts` | 売上・販売点数（grand 合計 + dept / store / daily / hourly 5 view） | `references/01-foundation/sales-definition.md` |
| RM-004 | `buildDiscountFactReadModel` | `app/src/application/readModels/discountFact/readDiscountFact.ts` | 値引き（71-74 typeCode 内訳 + grand 整合不変） | `references/01-foundation/discount-definition.md` |
| RM-005 | `buildCustomerFactReadModel` | `app/src/application/readModels/customerFact/readCustomerFact.ts` | 客数（StoreResult.totalCustomers の正本上書き先） | `references/01-foundation/customer-definition.md` |
| RM-006 | `calculateFactorDecomposition` | `app/src/application/readModels/factorDecomposition/calculateFactorDecomposition.ts` | 要因分解（Shapley 5 要素恒等式） | `references/01-foundation/authoritative-calculation-definition.md` |
| RM-007 | `buildFreePeriodReadModel` | `app/src/application/readModels/freePeriod/readFreePeriodFact.ts` | 自由期間分析（任意 dateRange、月境界非依存） | `references/01-foundation/free-period-analysis-definition.md` |
| RM-008 | `buildFreePeriodBudgetReadModel` | `app/src/application/readModels/freePeriod/readFreePeriodBudgetFact.ts` | 自由期間予算（月予算の期間按分） | `references/01-foundation/free-period-budget-kpi-contract.md` |
| RM-009 | `buildFreePeriodDeptKPIReadModel` | `app/src/application/readModels/freePeriod/readFreePeriodDeptKPI.ts` | 自由期間部門 KPI（加重平均率） | `references/01-foundation/free-period-budget-kpi-contract.md` |
| RM-010 | `selectMonthlyPrevYearSales` | `app/src/application/readModels/prevYear/selectMonthlyPrevYearSales.ts` | 月次前年売上（sameDate / sameDow 2 mode） | `references/01-foundation/sales-definition.md` |

> Phase C 後続 batch で QH-NNN（QueryHandler）/ PIPE-NNN（Pipeline）/ PROJ-NNN（Projection）の追加を予定。

## spec doc フォーマット

各 `RM-NNN.md` は以下の構造を持つ。frontmatter が機械検証対象、prose は「**source から読み取れない設計意図と契約**」のみ。

### YAML frontmatter（generator が上書き管理）

```yaml
---
# 識別
id: RM-001
kind: read-model
exportName: readPurchaseCost                  # source 側の export literal と一致必須

# source 参照
sourceRef: app/src/application/readModels/purchaseCost/readPurchaseCost.ts
sourceLine: 242                               # export 宣言の開始行

# 業務意味の正本リンク
definitionDoc: references/01-foundation/purchase-cost-definition.md

# 構造 drift 防御
lastSourceCommit: <sha>                     # source と突合した直近 commit

# 時間 drift 防御（freshness）
owner: implementation

# spec schema
specVersion: 1
---
```

### prose セクション（手書き、短く）

**大原則: 使い方（usage）ではなく振る舞い（behavior）を書く**。

| セクション | 書く内容（振る舞い側） |
|---|---|
| 1. 概要（1 文） | この readModel の**振る舞い**を構造的に 1 文で（C8 準拠） |
| 2. Input Contract | 受け取る引数 / 期待 invariant（pure 関数の前提条件） |
| 3. Output Contract | 返す readModel の構造 / grand 合計などの不変条件 |
| 4. Upstream Dependencies | source query / handler / 他 readModel への依存（content graph 用） |
| 5. Consumers | 主要な consumer（widget / hook / chart）— Phase C-graph で自動生成 |
| 6. Fallback / Readiness | status discrimination / fallback 戦略（あれば） |
| 7. Invariants | 業務的不変条件（定義書側に正本がある場合は参照のみ） |
| 8. Co-Change Impact | どの型 / 契約が変わったら本 readModel が壊れるか |
| 9. Guard / Rule References | 関連する既存 guard / AR rule の ID |

## 3 軸 drift 防御（親 README §「3 軸の drift 防御」の read-models サブカテゴリでの具体化）

### 存在軸: `AR-CONTENT-SPEC-EXISTS`（read-models 版）

- `application/readModels/<dir>/` の正本 entry に対応する `RM-NNN.md` が存在
- source 側 `@rm-id RM-NNN` JSDoc が export 行直前に付与されていること

### 構造軸: `AR-CONTENT-SPEC-FRONTMATTER-SYNC` + `AR-CONTENT-SPEC-CO-CHANGE`

- generator が source AST から `sourceLine` / `exportName` を再生成
- 再生成後 diff が発生 → `docs:check` fail
- source export 行が変更されたのに `lastSourceCommit` が更新されていない → fail（Phase A から共通機構）

### commit-pin 軸: `AR-CONTENT-SPEC-LAST-SOURCE-COMMIT` + `AR-CONTENT-SPEC-OWNER`

- 全 spec に `owner` / `lastSourceCommit` (full 40-char SHA) 必須
- `git log -1 --format=%H -- <sourceRef>` と完全一致しないと fail

> **Phase K Option 1 (2026-04-29) で撤退済**: `AR-CONTENT-SPEC-FRESHNESS` (date-based cadence) は儀式と判定して撤退。commit-pin で構造的に置換。

### enforcement phase

| AR rule | 状態 |
|---|---|
| 5 件 `AR-CONTENT-SPEC-*` | Phase A 着手時に widget 軸で active 化 → Phase C で read-model 軸に拡大（同一 rule、同一 guard、kind 別 dispatch） |
