# calculations — Domain Calculation 仕様書カタログ

> 役割: `app/src/domain/calculations/` 配下の **業務計算正本** + **WASM 移行候補（candidate）** の現状把握台帳。
> 改修前の前提資料として、各 calc の入出力契約 / 不変条件 / lifecycle 状態 / current ↔ candidate 双方向リンクを 1 ファイルにまとめる。
>
> **本カテゴリの位置付けは親 README（`../README.md`）参照**。
> ユーザー向け機能説明ではない。学習用解説ではない。改修者のための事実台帳。

## 型番体系

- 形式: `CALC-NNN`（3 桁ゼロ埋め）
- **一度割り当てたら再利用しない**。廃止時は欠番のまま保持
- source 側は `@calc-id CALC-NNN` JSDoc で宣言（generator が機械検証）
- spec doc ファイル名 = 型番 `.md`（例: `CALC-001.md`）

## Lifecycle State Machine（Phase D で institutionalize）

`calculationCanonRegistry.ts` の `runtimeStatus` (`current` / `candidate` / `non-target`) +
spec frontmatter の `lifecycleStatus` (`proposed` / `active` / `deprecated` / `sunsetting` / `retired` / `archived`)
の **両軸** で計算の状態を管理する。

```
proposed ──→ active ──→ deprecated ──→ sunsetting ──→ retired ──→ archived
              ↑              │
              │ Promote      │ replacedBy → 後継 calc
              │ Ceremony     │
              │              ▼
        candidate-authoritative（registry）
```

### 必須 field 表

| `lifecycleStatus` | 必須 frontmatter field |
|---|---|
| `proposed` | （source 不在許容） |
| `active` | exportName / sourceRef / sourceLine |
| `deprecated` | + `replacedBy: CALC-NNN`（後継 spec ID）|
| `sunsetting` | + `replacedBy` + `sunsetCondition` + `deadline` |
| `retired` | + `replacedBy` + active consumer = 0 |
| `archived` | （source 削除済、ID は欠番保持）|

### Promote Ceremony（candidate → current 昇格）

`candidate-authoritative` の calc を `business-authoritative` に昇格させる際、**1 PR で次がすべて揃う**ことを guard が要求する:

1. `calculationCanonRegistry.ts` の `runtimeStatus: candidate → current`
2. 旧 current spec の `lifecycleStatus: active → deprecated`、`replacedBy: <new>` 追記
3. 新 current spec の `lifecycleStatus: proposed/active`、`supersedes: <old>` 追記
4. 旧 current の `sunsetCondition` + `deadline` を記載
5. ADR 記録（`projects/<active>/adr/` または同等）

詳細: `references/03-guides/promote-ceremony-pr-template.md`

## Candidate Slot の二状態モデル（Phase D Step 7 institutionalize）

`calculationCanonRegistry` の `runtimeStatus: 'candidate'` slot は次の 2 状態を取る:

| 状態 | physical .ts file | 必要 spec | guard 扱い |
|---|---|---|---|
| **planning-only** | 未 landing（WASM module は存在） | 不要（exempt） | informational counter のみ |
| **active candidate** | landing 済（dual-run 中） | 必須（baseline=0、+1 で hard fail） | spec coverage に算入 |

**設計理由**: spec は「物理実装の事実台帳」（`references/05-contents/README.md`）。
planning-only slot は registry の anticipation であり実装ではないため spec 化しない。
physical landing が起きた瞬間に active candidate 化し本 guard が hard fail させる
ことで、Promote Ceremony 着手 PR が spec 同梱を強制される（1 PR 5 同期の機械強制）。

**Promote Ceremony 着手手順**:

1. candidate file（`app/src/domain/calculations/candidate/<name>.ts`）を physical landing
2. 同 PR で対応 CALC spec（`lifecycleStatus: proposed` → 数値同等性検証完了で `active`）を生成
3. 数値同等性検証完了 → current 昇格（旧 spec deprecated + replacedBy / 新 spec supersedes / sunsetCondition / ADR）

planning-only から physical landing への遷移点で本 guard が機械的に spec 同梱を強制するため、
「先行 spec 化フェーズ」を別途設ける必要はない。

## 初期割当表（Phase D Step 6 完遂段階、24 件 — current 全件 cover 完了）

`calculationCanonRegistry.ts` の `business-authoritative + current + maintenance` (tier1) と
analytic-authoritative / 業務 critical (tier2) を起点に優先 spec 化する。

| ID | export | 配置 | contractId / semanticClass / authorityKind | runtimeStatus | tier / WASM 候補 |
|---|---|---|---|---|---|
| CALC-001 | `calculateCustomerGap` | `customerGap.ts` | BIZ-013 / business / business-authoritative | current | tier1 / wasm/customer-gap/ (未物理化)|
| CALC-002 | `calculatePIValues` | `piValue.ts` | BIZ-012 / business / business-authoritative | current | tier1 / wasm/pi-value/ (未物理化)|
| CALC-003 | `computeEstimatedInventory` | `inventoryCalc.ts` | BIZ-009 / business / business-authoritative | current | tier1 / wasm/inventory-calc/ (FFI 6 列 flat、未物理化)|
| CALC-004 | `calculatePinIntervals` | `pinIntervals.ts` | BIZ-011 / business / business-authoritative | current | tier1 / wasm/pin-intervals/ (rateOwnership: engine、未物理化)|
| CALC-005 | `evaluateObservationPeriod` | `observationPeriod.ts` | BIZ-010 / business / business-authoritative | current | tier1 / wasm/observation-period/ (FFI bitmask、未物理化)|
| CALC-006 | `calculateRemainingBudgetRate` | `remainingBudgetRate.ts` | BIZ-008 / business / business-authoritative | current | tier1 / wasm/remaining-budget-rate/ (rateOwnership: engine、未物理化)|
| CALC-007 | `decompose5` | `factorDecomposition.ts` | BIZ-004 / business / business-authoritative | current | tier2 / wasm/factor-decomposition/ (WASM bridge 部分稼働、RM-006 が wrap)|
| CALC-008 | `calculateForecast` | `forecast.ts` | ANA-006 / analytic / analytic-authoritative | current | tier2 / wasm/forecast/ (forecastBridge WASM 部分稼働)|
| CALC-009 | `calculateInvMethod` | `invMethod.ts` | BIZ-001 / business / business-authoritative | current | tier2 / wasm/gross-profit/ (WASM bridge 稼働、RM-002 が wrap、4 種粗利のうち 2 種)|
| CALC-010 | `calculateEstMethod` | `estMethod.ts` | BIZ-002 / business / business-authoritative | current | tier2 / wasm/gross-profit/ (RM-002 が wrap、4 種粗利のうち 2 種)|
| CALC-011 | `calculateBudgetAnalysis` | `budgetAnalysis.ts` | BIZ-003 / business / business-authoritative | current | tier2 / wasm/budget-analysis/ (WASM bridge 稼働、StoreResult 統合)|
| CALC-012 | `analyzeDowGap` | `dowGapAnalysis.ts` | ANA-007 / analytic / analytic-authoritative | current | tier3 / 曜日 mix 差分、calendar_effect family|
| CALC-013 | `calculateDiscountImpact` | `discountImpact.ts` | BIZ-005 / business / business-authoritative | current | tier3 / 売変ロス原価、CALC-010 markupRate と協調|
| CALC-014 | `buildPrevYearCostApprox` | `prevYearCostApprox.ts` | ANA-005 / analytic / analytic-authoritative | current | tier3 / SP-B 由来、CHART-005 が registry 行で参照|
| CALC-015 | `calculateTransferTotals` | `costAggregation.ts` | BIZ-006 / business / business-authoritative | current | tier3 / 移動入出 + 在庫仕入原価、RM-001 と協調|
| CALC-016 | `calculateMarkupRates` | `markupRate.ts` | BIZ-007 / business / business-authoritative | current | tier3 / 値入率、CALC-010 推定法 markupRate 供給元|
| CALC-017 | `findCoreTime` | `timeSlotCalculations.ts` | ANA-001 / analytic / analytic-authoritative | current | tier3 / time_pattern、補助 findTurnaroundHour/buildHourlyMap|
| CALC-018 | `computeKpis` | `budgetSimulator.ts` | ANA-010 / analytic / analytic-authoritative | current | tier3 / budget_simulation、budgetAnalysis 部品の orchestration|
| CALC-019 | `aggregateDowAverages` | `budgetSimulatorAggregations.ts` | ANA-010 / analytic / analytic-authoritative | current | tier3 / CALC-018 と協調、曜日別/週別 drill-down|
| CALC-020 | `calculateMonthEndProjection` | `algorithms/advancedForecast.ts` | ANA-002 / analytic / analytic-authoritative | current | tier3 / forecasting、複数手法+95%信頼区間|
| CALC-021 | `pearsonCorrelation` | `algorithms/correlation.ts` | ANA-005 / analytic / analytic-authoritative | current | tier3 / statistical、相関マトリクス/正規化/divergence、candidate 並走|
| CALC-022 | `calculateSensitivity` | `algorithms/sensitivity.ts` | ANA-003 / analytic / analytic-authoritative | current | tier3 / what_if、4 種 delta 粗利インパクト、candidate 並走|
| CALC-023 | `analyzeTrend` | `algorithms/trendAnalysis.ts` | ANA-004 / analytic / analytic-authoritative | current | tier3 / temporal_pattern、MoM/YoY/MA/季節性、candidate 並走|
| CALC-024 | `computeMovingAverage` | `temporal/computeMovingAverage.ts` | ANA-009 / analytic / analytic-authoritative | current | tier3 / time_series、strict/partial missingness、candidate 並走|

> **current 全件 cover 完了** (24 件)。残 11 件は **planning-only candidate slot** で、
> registry には登録済みだが対応 `.ts` file は **未 landing**（WASM module は存在）。
> spec は「物理実装の事実台帳」原則に従い planning-only slot を coverage 要件から exempt
> し、AR-CONTENT-SPEC-CANONICAL-REGISTRATION-SYNC の baseline は **0** に到達済み。
> Promote Ceremony 着手 = candidate file の physical landing。その瞬間 active candidate
> 化し guard が「+1 over baseline」で hard fail させる（同 PR で spec 同梱を機械強制）。
> 詳細: 本 README §「Candidate Slot の二状態モデル」

## spec doc フォーマット

各 `CALC-NNN.md` は以下の構造を持つ。frontmatter が機械検証対象、prose は「**source から読み取れない設計意図と契約**」のみ。

### YAML frontmatter（generator が上書き管理 + lifecycle 手書き）

```yaml
---
id: CALC-001
kind: calculation
exportName: calculateCustomerGap
sourceRef: app/src/domain/calculations/customerGap.ts
sourceLine: 77

# 業務意味の正本リンク
definitionDoc: references/01-principles/customer-gap-definition.md

# calculationCanonRegistry との同期軸（手書き、sync guard で双方向検証）
contractId: BIZ-013
semanticClass: business
authorityKind: business-authoritative
methodFamily: behavioral
canonicalRegistration: current        # registry.runtimeStatus と一致

# Lifecycle State Machine（手書き、guard で必須 field を強制）
lifecycleStatus: active                # proposed | active | deprecated | sunsetting | retired | archived
replacedBy: null                       # deprecated/sunsetting で後継 CALC-NNN を必須
supersedes: null                       # candidate→current 昇格時に旧 CALC-NNN を記録
sunsetCondition: null                  # sunsetting で必須
deadline: null                         # sunsetting で必須 (YYYY-MM-DD)

# 構造 drift 防御
lastSourceCommit: <sha>

# 時間 drift 防御
owner: architecture

# spec schema
specVersion: 1
---
```

### prose セクション（手書き、短く）

| セクション | 書く内容 |
|---|---|
| 1. 概要（1 文） | 振る舞いを構造的に 1 文（C8） |
| 2. Input Contract | 引数 / Zod schema / 前提 invariant |
| 3. Output Contract | 戻り値 / 結果 schema / 不変条件 |
| 4. Invariants | 数学的・業務的不変条件（`invariant-catalog.md` リンク）|
| 5. Migration Plan | candidate（WASM 等）の有無、`replacedBy` 計画、Promote Ceremony 着手条件 |
| 6. Consumers | 主要 consumer（widget / chart / readModel）|
| 7. Co-Change Impact | 型 / schema / 不変条件のどれが変わると壊れるか |
| 8. Guard / Rule References | 関連する既存 guard / AR rule の ID |

## 3 軸 drift 防御

### 存在軸: `AR-CONTENT-SPEC-EXISTS`（calculation 版）

- `calculationCanonRegistry` の `current` / `candidate` 全 entry に対応する `CALC-NNN.md` が存在
- source 側 `@calc-id CALC-NNN` JSDoc が export 行直前に付与されていること

### 構造軸: `AR-CONTENT-SPEC-FRONTMATTER-SYNC`

- generator が source AST から `sourceLine` / `exportName` を再生成
- `canonicalRegistration` ↔ `calculationCanonRegistry.runtimeStatus` の双方向 sync（後続 commit で sync guard 追加）

### commit-pin 軸: `AR-CONTENT-SPEC-LAST-SOURCE-COMMIT` + `AR-CONTENT-SPEC-LIFECYCLE-DEADLINE`

- `lastSourceCommit` (full SHA) が `git log -1 --format=%H -- <sourceRef>` と完全一致しないと fail
- `sunsetting` の `deadline` 超過で hard fail（temporal governance）

> **Phase K Option 1 (2026-04-29) で撤退済**: `AR-CONTENT-SPEC-FRESHNESS` (date-based cadence) は儀式と判定して撤退。commit-pin (`AR-CONTENT-SPEC-LAST-SOURCE-COMMIT`) で構造的に置換。

### Lifecycle 軸: `AR-CONTENT-SPEC-LIFECYCLE-FIELDS`

- `lifecycleStatus` の値ごとに必須 field を強制（上記「必須 field 表」）
- `replacedBy` / `supersedes` の双方向対称性（後続 commit で対称性 guard 追加）
