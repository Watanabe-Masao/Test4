# Pure 計算責務再編計画

## 4つの不可侵原則

この計画全体を通じて、以下の4原則は例外なく守る。
後続AIはこの4点を最初に読み、いかなる Phase でも違反してはならない。

### 原則 1: Promote Ceremony なしに current 編入しない

`promotion-ready` から `current` へ移す正式手順（Phase 8）を経ずに、
候補を current 群へ編入してはならない。
承認主体は人間であり、実装 AI は提案のみ。
昇格条件・registry 更新・bridge 切替・失敗時巻き戻しの全てが定義されている（Phase 8 参照）。

### 原則 2: Guard は定義した Phase で即導入する

Phase 7 を待たない。`authoritative` 単独使用禁止は Phase 0 で、
current/candidate 混線禁止は Phase 4 で、bridge 未経由禁止は Phase 3 で即入れる。
Phase 7 は統合整理のみ。基本防波堤は前倒しで設置する。

### 原則 3: 正本は calculationCanonRegistry の1つだけ

`calculationCanonRegistry` が master。
business / analytic / candidate の view は全て derived（master から自動導出）。
derived view の手編集は禁止。二重管理を始めない。
AI が「どれを信じるべきか」を迷う状態を作らない。

### 原則 4: Current と Candidate は絶対に混ぜない

既存 Rust/current 群は**保守対象**。新規移行対象は**candidate 群**。
同じ registry view に載せない。同じ KPI で評価しない。同じ review 導線を使わない。
current を staging area にしない。candidate を current 資産として扱わない。

---

## Context

粗利管理ツール（shiire-arari）の `domain/calculations/` に存在する pure 計算群を、
**意味責任ベース**で再分類し、AI が誤読・誤実装しにくい構造へ整備する。

### 問題

現行の `domain/calculations/` は 36 ファイルを `required/review/not-needed` の3分類で管理しているが、
「pure だから同じ棚」「authoritative だから同じ棚」という解釈を AI が取りやすい構造になっている。
Business Semantic Core（粗利、予算差異）と Analytic Kernel（移動平均、z-score）が
同じ registry、同じ責任タグ（R:calculation）、同じディレクトリに混在している。

### 目的

1. 意味空間の混線を防ぐ
2. AI が「pure = 同じ棚」と誤解できない構造にする
3. current と candidate を分離する
4. 既存運用（5 WASM authoritative modules、84 architecture rules、39 guards）を壊さない

### 主役

主役は **粗利管理ツール本体**。AAG は保護機構であり、目的ではない。

### 非ゴール

- hook / store / QueryHandler / ViewModel の置換
- パイプライン全体の再設計
- 性能最適化を主目的とした移行
- 既存 Rust 群の即時再実装

---

## 固定済みの判断

### 1. factorDecomposition = Business Semantic Core

- 意味責任は business（出力が業務 KPI として UI に直接表示される）
- 技法は analytic（Shapley 値分解）
- 表現: `semanticClass = business`, `methodFamily = analytic_decomposition`
- 棚は business、技法属性で analytic 性を別軸で表現する

### 2. Registry = Master + Derived View 方式

- `calculationCanonRegistry` を master registry として拡張（semanticClass 等追加）
- 運用用の3つの derived view を master から導出:
  - `business-semantic-registry`（business current + staging）
  - `analytic-kernel-registry`（analytic current + staging）
  - `migration-candidate-registry`（candidate/business + candidate/analytics）
- 正本は1つ（master）、運用ビューは複数
- derived view は手編集禁止、CI で master との一致を検証
- 「business と analytics を同じ registry に載せない」= 運用 view を分ける

### 3. 物理ディレクトリ分離は Phase 2 以降で段階的に

- Phase 0-1 では論理分離のみ（registry 拡張 + guard）
- Phase 2 で registry + guard が安定した後、必要な範囲で段階的に物理移動
- import 変更のノイズと意味修正を混ぜない

---

## Phase 0: 前提固定と用語の再定義 + authoritative 用語スイープ

### 目的

AI が最初から誤読しない状態を作る。コード変更は最小限。
**既存コード中の `authoritative` 単独使用を洗い出し、修正または ratchet 管理する。**

### ソース

ユーザー提供の Phase 0 定義書ドラフト。以下の修正を加えて配置:
- factorDecomposition を Business Semantic Core に更新
- 既存 engine-boundary-policy.md との整合記述を追加

### 成果物

#### 0-1. 意味分類ポリシー

- **ファイル**: `references/01-principles/semantic-classification-policy.md`（新規）
- **内容**: Phase 0 定義書ドラフト全体（用語定義、5原則、禁止事項、分離候補条件）
- **修正**: §10 の factorDecomposition 記述を Business Semantic Core に更新
- **修正**: §5.1 の例から5要素分解を削除し、§5.2 の例に「技法としての Shapley」を残す

#### 0-2. engine-boundary-policy.md の用語整合

- **ファイル**: `references/01-principles/engine-boundary-policy.md`
- **変更箇所**: 115-125行目の "Authoritative vs Pure Analytics Substrate" 区分表
- `Authoritative` → `Business Semantic Core (business-authoritative)`
- `Pure Analytics Substrate` → `Analytic Kernel (analytic-authoritative)`
- 162行目の "Authoritative の定義" → "business-authoritative の定義"
- `authoritative` 単独使用の禁止を §8.2 に追記

#### 0-3. CLAUDE.md 更新

- **ファイル**: `CLAUDE.md`
- 「3つの Execution Engine」セクションに意味分類ポリシーへの参照を追加
- 設計原則テーブルに意味分類カテゴリ（I カテゴリ）を追加
- `authoritative` 単独使用禁止をコーディング規約に追加

#### 0-4. authoritative 用語スイープ一覧

- **ファイル**: `references/02-status/authoritative-term-sweep.md`（新規）
- **内容**: 既存コード・コメント・テスト・文書・registry・rule 中の `authoritative` 単独使用を全件洗い出し
- **分類**: current/business を指す / current/analytics を指す / candidate を指す / 曖昧
- **対応**: すぐ修正可能 → 修正 / 修正不可 → `legacy-authoritative-usage` として ratchet 管理
- **新規追加禁止**: Phase 0 完了後、`authoritative` 単独使用の新規出現は guard で禁止

#### 0-5. Phase 0 の即時 guard

Phase 0 で定義した方針は Phase 7 を待たず即導入:
- `AR-TERM-AUTHORITATIVE-STANDALONE`: `authoritative` 単独使用を検出（ratchet: 既存件数を baseline、新規追加禁止）

### 受け入れ条件

1. `authoritative` 単独使用が定義上禁止されている
2. **既存コード中の `authoritative` 単独使用が全件洗い出されている**
3. Business Semantic Core と Analytic Kernel の定義が文書で固定されている
4. hook / store / QueryHandler が移行対象外であることが明文化されている
5. 既存 Rust 群が意味再分類対象であることが明文化されている
6. **`AR-TERM-AUTHORITATIVE-STANDALONE` guard が ratchet モードで導入されている**

### 検証

```bash
# 文書の存在とキーワード確認（読み取り専用）
grep -l "Business Semantic Core" references/01-principles/semantic-classification-policy.md
grep -l "business-authoritative" references/01-principles/engine-boundary-policy.md
# authoritative 単独使用の件数確認
cd app && npm run test:guards  # AR-TERM-AUTHORITATIVE-STANDALONE 通過
```

---

## Phase 1: 意味分類 inventory 作成

### 目的

全 pure 計算を意味責任で分類した inventory を作成する。実装ではなく分類。

### ソース

ユーザー提供の Phase 1 手順書ドラフト。以下の修正を加えて使用:
- ルール 1 を更新（factorDecomposition は Business Semantic Core）
- §4.B の例から5要素分解を削除

### 成果物

#### 1-1. 手順書の配置

- **ファイル**: `references/03-guides/semantic-inventory-procedure.md`（新規）
- **内容**: Phase 1 手順書ドラフト（判定質問セット Q1-Q8、重要ルール、出力フォーマット）

#### 1-2. inventory 一覧

- **ファイル**: `references/02-status/semantic-inventory.yaml`（新規）
- **フォーマット**: Phase 1 手順書 §9 の YAML 形式

#### 暫定分類（探索結果ベース — Phase 1 で精査）

**Business Semantic Core（13 ファイル）:**

| ファイル | 関数 | methodFamily | WASM |
|---------|------|-------------|------|
| invMethod.ts | calculateInvMethod | accounting | bridged |
| estMethod.ts | calculateEstMethod, calculateCoreSales | accounting | bridged |
| budgetAnalysis.ts | calculateBudgetAnalysis | budget | bridged |
| factorDecomposition.ts | decompose2/3/5 | analytic_decomposition | bridged |
| discountImpact.ts | calculateDiscountImpact | accounting | bridged |
| costAggregation.ts | calculateTransferTotals | accounting | bridged |
| markupRate.ts | calculateMarkupRates | pricing | bridged |
| remainingBudgetRate.ts | calculateRemainingBudgetRate | budget | TS-only |
| inventoryCalc.ts | computeEstimatedInventory | accounting | TS-only |
| observationPeriod.ts | evaluateObservationPeriod | data_quality | TS-only |
| pinIntervals.ts | calculatePinIntervals | accounting | TS-only |
| piValue.ts | calculateQuantityPI, calculateAmountPI | retail_kpi | TS-only |
| customerGap.ts | calculateCustomerGap | behavioral | TS-only |

**Analytic Kernel（9 ファイル）:**

| ファイル | 関数 | methodFamily | WASM |
|---------|------|-------------|------|
| timeSlotCalculations.ts | findCoreTime, findTurnaroundHour | time_pattern | bridged |
| algorithms/advancedForecast.ts | calculateWMA, linearRegression | forecasting | TS-only |
| algorithms/sensitivity.ts | calculateSensitivity | what_if | TS-only |
| algorithms/trendAnalysis.ts | analyzeTrend | temporal_pattern | TS-only |
| algorithms/correlation.ts | pearsonCorrelation | statistical | TS-only |
| forecast.ts | calculateForecast, detectAnomalies | anomaly_detection | bridged |
| dowGapAnalysis.ts | analyzeDowGap | calendar_effect | TS-only |
| dowGapActualDay.ts | (実日数マッピング) | calendar_effect | TS-only |
| temporal/computeMovingAverage.ts | computeMovingAverage | time_series | TS-only |

**Utilities / Not-needed（13 ファイル）:** 現行分類を維持

#### 1-3. WASM module の意味再分類

| WASM Module | 現行 | 意味分類 | 対応 |
|------------|------|---------|------|
| factor-decomposition | authoritative | business | 維持 |
| gross-profit | authoritative | business | 維持 |
| budget-analysis | authoritative | business | 維持 |
| forecast | authoritative | **analytic** | ラベル変更のみ |
| time-slot | authoritative | **analytic** | ラベル変更のみ |
| statistics | TS-only | analytic | 将来候補 |
| core-utils | TS-only | utility | 非対象 |

#### 1-4. 非対象一覧

Phase 1 手順書 §12 に従い、以下を `non-target` として固定:
QueryHandler / useQueryWithHandler / Screen Plan / Zustand store / ViewModel /
stale discard / retry / debounce / profiling / DuckDB query / presentation component

### 受け入れ条件

1. 全 36 ファイルの意味分類が inventory に記録されている
2. WASM 7 module の意味再分類が完了している
3. review-needed には理由が全件書かれている
4. non-target 一覧が固定されている

---

## Phase 2: CanonEntry 完全定義 + 派生 View + 互換移行

### 目的

Phase 1 の inventory を master registry に反映し、
derived view で運用分離し、guard で保護する。
**CanonEntry の最終形を Phase 2 で一括定義し、Phase 3 以降で型変更しない。**

### ソース

ユーザー提供の Phase 2 方針書ドラフト。
registry 方針を「Master + Derived View 方式」で実装。

### 互換移行戦略（3段階）

既存 guard テスト（39ファイル）を壊さないため、3段階で移行する:

**Phase 2A（型追加 — optional）**: 新フィールドを全て optional で追加。既存テストは fail しない。
**Phase 2B（移行警告）**: 新フィールド未設定は warning。新規追加時のみ必須。既存は ratchet。
**Phase 2C（必須化）**: 主要既存項目の埋め戻し後に hard fail 化。

### 変更対象ファイル

#### 2-1. Master registry: CanonEntry 最終形定義（Phase 3 の契約フィールド含む）

- **ファイル**: `app/src/test/calculationCanonRegistry.ts`
- 既存の `CanonTag` (`required/review/not-needed`) は維持
- **Phase 2 + Phase 3 のフィールドを一括追加**（Phase 2A では全て optional）:

```typescript
export type SemanticClass = 'business' | 'analytic' | 'presentation' | 'utility'
export type AuthorityKind =
  | 'business-authoritative'
  | 'analytic-authoritative'
  | 'candidate-authoritative'
  | 'non-authoritative'
export type RuntimeStatus = 'current' | 'candidate' | 'non-target'
export type OwnerKind = 'maintenance' | 'migration'

export interface CanonEntry {
  readonly tag: CanonTag
  readonly reason: string
  readonly zodAdded: boolean
  // ── 意味分類軸（Phase 2A: optional → Phase 2C: required for tag=required） ──
  readonly semanticClass?: SemanticClass      // Phase 2C で required 項目は必須化
  readonly authorityKind?: AuthorityKind
  readonly methodFamily?: string
  readonly runtimeStatus?: RuntimeStatus
  readonly ownerKind?: OwnerKind
  // ── 契約軸（Phase 3 で値を埋める。型は Phase 2 で先に定義） ──
  readonly contractId?: string                // BIZ-XXX or ANA-XXX
  readonly bridgeKind?: 'business' | 'analytics'
  readonly rateOwnership?: 'engine' | 'n/a'
  readonly fallbackPolicy?: 'current' | 'none'
  readonly migrationTier?: 'tier1' | 'tier2'
  readonly notes?: string
}
```

**重要**: Phase 3 は型を変えず「値を埋めるフェーズ」になる。型変更は Phase 2 に集約。

#### 2-2. 全 36 エントリに意味分類を追加

例:

```typescript
'factorDecomposition.ts': {
  tag: 'required',
  reason: 'シャープリー値分解（calculateFactorDecomposition）',
  zodAdded: true,
  semanticClass: 'business',
  authorityKind: 'business-authoritative',
  methodFamily: 'analytic_decomposition',
  runtimeStatus: 'current',
  ownerKind: 'maintenance',
},
'algorithms/correlation.ts': {
  tag: 'review',
  reason: '相関・類似度',
  zodAdded: true,
  semanticClass: 'analytic',
  authorityKind: 'analytic-authoritative',
  runtimeStatus: 'current',
  ownerKind: 'maintenance',
},
'utils.ts': {
  tag: 'not-needed',
  reason: 'safeDivide 等のプリミティブ',
  zodAdded: false,
  semanticClass: 'utility',
  authorityKind: 'non-authoritative',
  runtimeStatus: 'non-target',
  ownerKind: 'maintenance',
},
```

#### 2-3. Derived View 生成

- **ファイル**: `app/src/test/semanticViews.ts`（新規）
- master から filter して3つの derived view を生成:

```typescript
// master → filtered views (手編集禁止、master から導出)
export const BUSINESS_SEMANTIC_VIEW = deriveView('business')
export const ANALYTIC_KERNEL_VIEW = deriveView('analytic')
export const MIGRATION_CANDIDATE_VIEW = deriveCandidateView()
```

- guard テストで master と view の一致を CI 検証

#### 2-4. calculationCanonGuard.test.ts の拡張

- **ファイル**: `app/src/test/guards/calculationCanonGuard.test.ts`
- 新テスト:
  - `required` は `semanticClass` 必須
  - `semanticClass: 'business'` ⇔ `authorityKind: 'business-authoritative'` 整合
  - `semanticClass: 'presentation'` + `tag: 'required'` は明示理由必須
  - derived view が master と一致
  - business view に analytic エントリが含まれていない
  - candidate エントリが current view に含まれていない

#### 2-5. Phase 2 の即時 guard（定義した Phase で即導入）

- **ファイル**: `app/src/test/architectureRules.ts`

| ルール ID | detection.type | severity | 内容 |
|----------|---------------|----------|------|
| AR-CANON-SEMANTIC-REQUIRED | custom | ratchet→hard | required なのに semanticClass 未設定を禁止（Phase 2A: warning, 2C: hard） |
| AR-CANON-BUSINESS-ANALYTIC-MIX | custom | hard | analytic → business の import 方向を禁止 |
| AR-CANON-CANDIDATE-CURRENT-MIX | custom | hard | candidate を current view に混入禁止 |
| AR-CANON-OWNERSHIP-REQUIRED | custom | ratchet→hard | current/candidate に ownerKind 未設定を禁止 |
| AR-REGISTRY-MASTER-ONLY | custom | hard | master registry 以外の derived view 手編集禁止 |

注: `AR-TERM-AUTHORITATIVE-STANDALONE` は Phase 0 で先行導入済み。

#### 2-6. Phase 2 方針書の配置

- **ファイル**: `references/03-guides/directory-registry-ownership-policy.md`（新規）
- **内容**: Phase 2 方針書ドラフト（ディレクトリ目標構造、registry 原則、ownership 区分、maturity 定義）
- **修正**: registry 方針を Master + Derived View 方式に更新

### 受け入れ条件

1. 全 `required` エントリに `semanticClass` が設定されている
2. 3つの derived view が master から正しく導出されている
3. guard テストが business/analytic 混在、candidate/current 混在を検出する
4. `authoritative` 単独使用を検出する rule が追加されている
5. ownership に maintenance / migration の区別がある

### 検証

```bash
cd app && npm run test:guards    # 新 guard 含む全 guard 通過
cd app && npm run lint           # ESLint エラー0
cd app && npm run build          # 型チェック通過
cd app && npm run docs:generate  # health 更新
```

---

## Phase 3: 契約固定と bridge 境界定義

### 目的

JS から分離対象となる pure 計算について、**I/O 契約と runtime 境界を固定する**。
Rust 実装を増やす Phase ではない。「どう呼ぶか」「何を返すか」を先に固定する Phase。

### ソース

ユーザー提供の Phase 3 契約固定ドラフト。

### 原則

1. **契約はロジックより先に固定する** — 置換失敗の多くは入力形状・null・率・期間解釈の曖昧さで起きる
2. **bridge は runtime の唯一入口** — direct import 禁止
3. **Business と Analytic で契約様式を分ける**
4. **率は engine 側で算出** — UI / VM / SQL で率を再計算しない
5. **current/candidate 切替は bridge の責務** — UI の責務ではない

### 成果物

#### 3-1. 契約定義書

- **ファイル**: `references/03-guides/contract-definition-policy.md`（新規）
- **内容**: Phase 3 ドラフト全体（契約テンプレート、bridge 境界、direct import 禁止方針）

#### 3-2. Business Contract テンプレート

各 business 計算に以下の契約を定義:

```yaml
contractId: BIZ-XXX
semanticClass: business
authorityKind: business-authoritative
bridgeKind: business
businessMeaning: ...
inputSchema: ...  # JSON serializable, 額・数量・件数を入力、率は engine 算出
outputSchema: ...  # value + unit + methodUsed + usedFallback + warnings + scope
nullPolicy: ...
scopePolicy: ...
rateOwnership: engine
fallbackPolicy: { allowed: true, target: current }
```

#### 3-3. Analytic Contract テンプレート

各 analytic 計算に以下の契約を定義:

```yaml
contractId: ANA-XXX
semanticClass: analytic
authorityKind: analytic-authoritative
bridgeKind: analytics
methodFamily: ...
inputSchema: ...
outputSchema: ...  # series/components + methodFamily + invariantsSatisfied + warnings
invariantSet: [...]
fallbackPolicy: { allowed: true, target: current }
```

#### 3-4. Bridge 意味分類

| ファイル | bridgeKind | semanticClass |
|---------|-----------|--------------|
| `app/src/application/services/factorDecompositionBridge.ts` | business | business |
| `app/src/application/services/grossProfitBridge.ts` | business | business |
| `app/src/application/services/budgetAnalysisBridge.ts` | business | business |
| `app/src/application/services/forecastBridge.ts` | analytics | analytic |
| `app/src/application/services/timeSlotBridge.ts` | analytics | analytic |

各 bridge ファイルに JSDoc で意味分類 + 契約 ID を明記。

Bridge モード（各呼び出しが想定するもの）:
- `current-only` — 通常運用
- `candidate-only` — 試験検証
- `dual-run-compare` — 昇格前観測
- `fallback-to-current` — candidate 失敗時

#### 3-5. calculationCanonRegistry の契約値埋め

Phase 2 で先に定義した CanonEntry の契約フィールド（contractId, bridgeKind, rateOwnership, fallbackPolicy）に値を埋める。
**型変更は行わない**（Phase 2 で完了済み）。

#### 3-6. Direct import 禁止方針

runtime から以下の direct import を禁止:
- `domain/calculations/*`（型参照・テスト除く）
- `wasm/current/*`
- `wasm/candidate/*`

呼び出しは bridge 一点に集約する。

#### 3-7. WASM engine メタデータ拡張

- **ファイル**: `app/src/application/services/wasmEngine.ts`
- module 状態に semanticClass + bridgeKind を追加（破壊的変更なし）

### Phase 3 の即時 guard（定義した Phase で即導入）

| Guard | severity | 内容 |
|-------|----------|------|
| AR-CONTRACT-SEMANTIC-REQUIRED | hard | semanticClass 未設定で contract 追加禁止 |
| AR-CONTRACT-BUSINESS-MEANING | hard | Business Contract に businessMeaning 未記載禁止 |
| AR-CONTRACT-ANALYTIC-METHOD | hard | Analytic Contract に methodFamily 未記載禁止 |
| AR-BRIDGE-RATE-OWNERSHIP | hard | rate を UI / VM / SQL で再計算する実装禁止 |
| AR-BRIDGE-DIRECT-IMPORT | ratchet | bridge を通さない pure 計算呼び出し禁止（既存を baseline、新規追加禁止） |
| AR-BRIDGE-CANDIDATE-DEFAULT | hard | candidate-only を UI の既定経路にする変更禁止 |

### 受け入れ条件

1. 対象計算に contractId が付与されている
2. Business と Analytic の契約テンプレートが定義されている
3. bridge の論理境界が business / analytics で分かれている
4. direct import 禁止方針が固定されている
5. rate の ownership が engine 側へ固定されている
6. factorDecomposition が business / analytic_decomposition として正しく記述されている

---

## Phase 4: 既存 Rust/current 群の意味再分類・保守対象化

### 目的

既存 Rust/WASM current 群を「Rust にあるから同じ棚」ではなく意味責任で再分類し、
移行候補ではなく**保守対象**として固定する。

### ソース

ユーザー提供の Phase 4 方針書ドラフト。

### 原則

1. **current 群は運用資産であり、移行候補ではない**
2. **Rust にあることは意味分類の根拠にならない**
3. **意味再分類と物理移動は分ける**（metadata/registry/policy で再分類）
4. **current に promote 状態遷移を持たせない**（active/deprecated/review-needed のみ）
5. **境界事例は技法と意味責任を分離して記録する**

### 成果物

#### 4-1. current 群の意味再分類表

| WASM Module | 意味分類 | authorityKind | ownerKind | 備考 |
|------------|---------|--------------|-----------|------|
| factor-decomposition | current/business | business-authoritative | maintenance | methodFamily=analytic_decomposition |
| gross-profit | current/business | business-authoritative | maintenance | 8 numeric + 2 CalculationResult |
| budget-analysis | current/business | business-authoritative | maintenance | Type B hybrid |
| forecast | current/analytic | analytic-authoritative | maintenance | pure 5 WASM / Date-dependent 5 TS |
| time-slot | current/analytic | analytic-authoritative | maintenance | findCoreTime / findTurnaroundHour |
| statistics | TS-only/analytic | analytic-authoritative | maintenance | 未 bridge、将来候補 |
| core-utils | TS-only/utility | non-authoritative | maintenance | 非移行対象 |

#### 4-2. current 群の保守ポリシー

**current/business 保守観点:**
- 業務意味が変わっていないか
- 出力の解釈が変わっていないか
- business 契約を壊していないか
- 既存 UI の説明責任を壊していないか

**current/analytics 保守観点:**
- 数学的不変条件を壊していないか
- substrate としての再利用性を壊していないか
- business core と混線していないか
- analytics 契約を壊していないか

#### 4-3. current 群の状態制限

**許容状態**: active / deprecated / review-needed

**禁止状態**: proposed / extracted / bridged / dual-run / promotion-ready / retired-js
（これらは candidate 群だけが持つ）

#### 4-4. Cargo.toml メタデータ追加

各 crate の Cargo.toml に意味分類を追加（物理移動なし）:

```toml
[package.metadata.semantic]
class = "business"  # or "analytic" or "utility"
authority = "business-authoritative"
owner = "maintenance"
```

#### 4-5. current/candidate 分離ルール

- 同じ運用 view に載せない
- 同じ KPI で評価しない（current=安定性、candidate=parity/promote）
- 同じ review 導線を使わない
- current を staging area にしない

### Phase 4 の即時 guard（定義した Phase で即導入）

| Guard | severity | 内容 |
|-------|----------|------|
| AR-CURRENT-NO-CANDIDATE-STATE | hard | current に candidate 状態遷移追加禁止 |
| AR-CURRENT-SEMANTIC-REQUIRED | hard | current に semanticClass 未設定禁止 |
| AR-CURRENT-NO-STANDALONE-AUTH | hard | current に authoritative 単独禁止 |
| AR-CURRENT-VIEW-SEPARATION | hard | current/business と current/analytics の運用 view 混在禁止 |
| AR-CURRENT-NO-CANDIDATE-MIX | hard | current 群に candidate 実装を混入禁止 |
| AR-CURRENT-NO-DIRECT-IMPORT-GROWTH | ratchet | current 群の direct import を増やす変更禁止 |
| AR-CURRENT-FACTOR-BUSINESS-LOCK | hard | factorDecomposition の semanticClass 変更は businessMeaning 再定義なしで禁止 |

### やらないこと

- `wasm/current/business/*` への物理移動
- Cargo workspace 再構成
- 既存 CI パイプラインの変更

### 受け入れ条件

1. 全 current 項目に semanticClass + authorityKind が付与されている
2. factorDecomposition が current/business として固定されている
3. current/business と current/analytics の運用 view が分かれている
4. current に candidate 状態遷移を持たせないルールが guard 化されている
5. current 群の保守ポリシーが定義されている

---

## Phase 5-7: 将来フェーズ（概要のみ）

### Phase 5: Tier 1 Business Semantic Core 候補の移行

**ソース**: ユーザー提供の Phase 5 方針書ドラフト。

**原則**:
1. 対象は Tier 1 Business Semantic Core 候補だけ（Analytic は別 Phase）
2. current/business に最初から混ぜない（candidate/business として育成）
3. business 意味責任の確認が Rust 化可能性より先
4. bridge を唯一入口にする
5. dual-run と rollback を前提にする
6. current/business は保守対象のまま維持する

**対象条件**: semanticClass=business / migrationTier=tier1 / pure / deterministic / Business Contract 定義可能

**8ステップ移行プロセス**:
1. **候補確定** — inventory から Tier 1 business 候補を抽出、candidate ID 付与
2. **Business Contract 固定** — BIZ-XXX 形式で契約を埋める。businessMeaning を書けない候補は対象外
3. **JS current 参照固定** — 既存 JS を parity 比較の基準として固定（削除しない）
4. **candidate/business 実装追加** — current に混ぜず、candidate として管理
5. **business bridge 接続** — current-only / candidate-only / dual-run-compare / fallback-to-current の切替
6. **dual-run 比較** — 値一致 + null 一致 + warning 一致 + **業務解釈の一致**
7. **rollback 確認** — candidate 失敗時に current-only へ戻せることを検証
8. **promotion-ready 判定** — 全条件クリアで promotion-ready へ。**まだ current に編入しない**

**candidate の authorityKind**: `candidate-authoritative`（business-authoritative ではない。current ではないため）

**AAG guard 7件追加**: Business Contract なしで candidate 化禁止 / candidate→current registry 混入禁止 / analytics bridge 接続禁止 / rate UI 再計算禁止 / direct import 増加禁止 / rollback 不可追加禁止 / dual-run 未実装で promotion-ready 禁止

### Phase 6: Analytic Kernel 候補の移行

**ソース**: ユーザー提供の Phase 6 方針書ドラフト。

**原則**:
1. Analytic Kernel は Business Semantic Core と同じ棚に置かない（別トラック）
2. analysis 用の pure kernel だけを対象にする
3. 技法・数学的不変条件・再利用性を重視する（business の「業務意味一致」とは評価軸が異なる）
4. candidate/analytics として育て、current 群へ最初から混ぜない
5. bridge/analytics を唯一入口にする
6. 分析技法を使う business core と analytic kernel 自体を混同しない（factorDecomposition は対象外）

**対象条件**: semanticClass=analytic / pure / deterministic / Analytic Contract 定義可能 / methodFamily + invariantSet を書ける

**想定対象**: cumulative / movingAverage / stddevPop / zScore / yoyMerge / rankBy / categoryShare / rawAggregation kernel / 比較用系列 pure 整列 kernel / 汎用集約 substrate

**9ステップ移行プロセス**（Phase 5 の 8 ステップ + invariant 検証）:
1. **候補確定** — inventory から analytic 候補を抽出
2. **Analytic Contract 固定** — ANA-XXX 形式。methodFamily / invariantSet を書けないものは対象外
3. **JS current 参照固定** — parity 比較 + rollback の基準として固定
4. **candidate/analytics 実装追加** — current/business どちらにも入れない
5. **analytics bridge 接続** — current-only / candidate-only / dual-run-compare / fallback-to-current
6. **dual-run 比較** — 値一致 + shape 一致 + ordering 一致 + **数学的意味・不変条件一致**（業務意味一致ではない）
7. **invariant 検証** — 各候補に固有の不変条件を検証（cumulative=単調累積、zScore=平均分散関係、share=合計制約 等）
8. **rollback 確認** — candidate 失敗時に current reference へ戻せることを検証
9. **promotion-ready 判定** — Contract + methodFamily + invariantSet + bridge + dual-run + deterministic + rollback 全クリアで promotion-ready。**まだ current に編入しない**

**candidate の authorityKind**: `candidate-authoritative`（analytic-authoritative ではない）

**AAG guard 7件追加**: Analytic Contract なしで candidate 化禁止 / business bridge 接続禁止 / methodFamily 未設定禁止 / invariantSet 未定義禁止 / direct import 増加禁止 / candidate→current/business 混入禁止 / factorDecomposition を analytics 候補登録禁止

### Phase 7: Guard 統合整理 + JS 正本縮退方針 + 違反レスポンス標準化

**ソース**: ユーザー提供の Phase 7 方針書ドラフト。

**目的**: Phase 0-6 で各 Phase に前倒し導入した guard を統合整理し、JS 正本縮退方針と違反レスポンスを標準化する。
**注意**: Phase 7 は「guard 導入フェーズ」ではない。基本 guard は Phase 0-6 で既に導入済み。Phase 7 は以下を行う:
- guard の統合整理・重複排除
- violation message の標準化
- JS 正本縮退ポリシー確定
- rule sunset / ratchet 整理
- Phase 5/6 固有の追加 guard

#### Guard 3分類（全 Phase 共通の severity 定義）

| 種類 | 用途 | 例 |
|------|------|-----|
| **Hard** | 即 fail。破壊半径が大きい混線 | current/candidate 混在、authoritative 単独使用 |
| **Soft** | warning + 修正導線。境界未確定 | review-needed の増加 |
| **Ratchet** | 現状悪化禁止。legacy 移行途中 | direct import 件数 |

#### Phase 7 で追加する guard（Phase 5/6 完了後に必要になるもの）

**JS 正本縮退 guard (5件):**
1. TS に新規 pure authoritative logic 追加禁止（先に candidate 登録が必要）
2. JS reference の増築禁止（compare/fallback 用であり、新規正本ロジック追加禁止）
3. dual-run 未実装のまま promote-ready 禁止
4. rollback 不可の candidate 追加禁止
5. Presentation Helper の誤昇格禁止

**特記事項 guard (2件):**
6. factorDecomposition→analytics 再分類禁止（正式再定義プロセス除く）
7. review-needed のまま current 編入/candidate 化/物理移動禁止

注: 以下は Phase 0-6 で既に導入済み（Phase 7 では統合整理のみ）:
- authoritative 単独使用禁止（Phase 0）
- semanticClass 未設定禁止 / registry 手編集禁止 / view 混在禁止（Phase 2）
- direct import 禁止 / rate 再計算禁止 / bridge 経由必須（Phase 3）
- current/candidate 分離（Phase 4）
- business/analytics bridge 交差接続禁止（Phase 5/6）

#### JS 正本縮退ポリシー（4段階）

| Stage | 役割 | 制約 |
|-------|------|------|
| **A: current reference** | 比較基準 + fallback + 既存運用正本 | — |
| **B: compare reference** | candidate 比較対象 + fallback | 新規正本ロジック追加禁止 |
| **C: fallback-only** | candidate failure 時の戻り先のみ | 通常運用では primary でない |
| **D: retired-js** | JS reference 削除 | bridge は current engine のみ |

**JS 縮退条件（A→B）**: contract 固定 + bridge 接続 + dual-run 実施 + rollback 実装 + null/warning/shape/scope 一致 + guard 導入 + 混線なし + 観測期間中重大差分なし

**JS 撤去条件（C→D）**: current 昇格済み + 契約安定 + rollback 別途確保 + dual-run 観測完了 + 旧 path 禁止 guard あり + import 残存なし

#### 違反時レスポンス設計

AAG 違反時の必須レスポンス項目:
- violation code / title / 何が壊れたか / なぜ危険か
- どの Phase 原則に違反したか / まず見るべきファイル / まず直すべき場所
- allowed next action / forbidden shortcut / 再発防止候補

#### Rule 追加/不要化ルール

**追加条件**: 同種失敗再発 / 境界破壊 / CI failure だけでは修正先不明 / AI 誤読しやすいと判明
**追加禁止**: 単発 typo / 既存 rule で防げる / 実装都合の局所最適 / Phase 原則に紐づかない
**不要化条件**: 物理構造で誤読不可能 / 上位 rule に吸収 / 対象コード retired / ratchet 使命終了

### 受け入れ条件

1. Hard/Soft/Ratchet guard の区分がある
2. 必須 guard 22件が定義されている
3. direct import 禁止が制度化されている
4. business/analytics/current/candidate の混線 guard がある
5. JS 正本縮退の4段階が定義されている
6. JS 撤去条件が定義されている
7. master/derived registry 整合性 guard がある
8. 違反時レスポンス形式が定義されている
9. rule 追加/不要化ルールがある
10. 後続AIが「とりあえず JS に書けばよい」と読めない状態になっている

---

## 実施順序と依存関係

```
Phase 0 (文書整備)
    ↓ コード変更なし
Phase 1 (inventory)
    ↓ コード変更なし、分類のみ
Phase 2 (CanonEntry 完全定義 + derived view + 互換移行)
    ↓ 主要コード変更（2A: optional → 2B: warning → 2C: 必須化）
Phase 3 (契約固定 + bridge 境界)  ← Phase 2 に依存
Phase 4 (current 再分類 + 保守化) ← Phase 1 + Phase 2 に依存
    ↓ Phase 3, 4 は並列可
Phase 5 (business 移行)            ← Phase 2-4 完了後
Phase 6 (analytic 移行)            ← Phase 2-4 完了後
    ↓ Phase 5, 6 は並列可
Phase 7 (guard 統合整理 + JS 縮退) ← Phase 5-6 安定後
Phase 8 (Promote Ceremony)         ← Phase 7 + promotion-ready 達成後
Phase 9 (JS retired-js 化)         ← Phase 8 で昇格完了後
Phase 10 (物理構造の収束)          ← Phase 8-9 安定後
Phase 11 (意味拡張 + UI 進化)      ← Phase 9-10 安定後
    ↑ AAG 常時部分更新は全 Phase を通じて継続
    ↑ guard は各 Phase で即時導入（Phase 7 を待たない）
```

### Phase 8: Promote Ceremony / Current 編入

**目的**: promotion-ready の候補を正式に current へ編入する儀式。
**最大の構造的原則**: 実装 AI は promote を提案できるが、自己承認はできない。最終承認は人間。

#### 判定主体

- AAG が証拠（dual-run 結果、rollback 実証、guard 通過状況）を揃える
- 実装 AI が promote 提案書を作成する
- **人間が最終承認する**

#### 昇格条件チェックリスト

1. dual-run 安定期間クリア（差分が許容範囲内）
2. null / warning / methodUsed / scope の一致確認済み
3. rollback 実演確認済み
4. direct import 逸脱なし
5. current 群を壊していない
6. AAG guard 全通過
7. registry / contract / bridge metadata 更新準備完了
8. Business: 業務意味一致 / Analytics: 数学的不変条件一致

#### promote 実施手順

1. `runtimeStatus: candidate → current`
2. `authorityKind: candidate-authoritative → business-authoritative / analytic-authoritative`
3. current view へ編入、candidate view から除外
4. bridge モード: `dual-run-compare → current-only`
5. JS reference を `compare-reference（Stage B）` へ格下げ
6. docs:generate 実行 → health 更新

#### promote 失敗時の巻き戻し

1. bridge を `current-only`（旧 current）に戻す
2. registry を candidate 状態へ戻す
3. promote 実行ログを failure record 化
4. 失敗原因を分析 → 必要なら AAG rule / test 追加候補へ送る

### Phase 9: 昇格済み責務の JS reference 縮退・撤去

**目的**: 昇格済み責務の JS reference を retired-js にする（repo 全体一括削除ではなく責務単位）。

**やる条件**（責務ごとに判定）:
1. Phase 8 で candidate が current に昇格済み
2. dual-run が十分に安定
3. rollback 方針が固定済み
4. AAG に旧 JS path 禁止 guard がある
5. direct import が残っていない
6. current/candidate の意味分類が確定済み

### Phase 10: 物理構造の収束

**目的**: 意味空間単位の物理移動と、必要に応じた Cargo workspace 再構成。

**massive import 移動のやる条件**:
1. semanticClass の棚卸しが一巡
2. review-needed が主要対象で解消済み
3. master + derived view が安定
4. direct import guard が十分効いている
5. business/analytics/current/candidate の誤読が減っている

**Cargo workspace 再構成のやる条件**（import 移動よりさらに後寄り）:
1. wasm/current と wasm/candidate の論理分離が定着
2. business/analytics の境界が運用上も安定
3. crate 境界が意味責任と一致する
4. CI で current/candidate/parity/invariant の責務分離が回っている

### Phase 11: 意味拡張を伴う UI / プロダクト進化

**目的**: 意味空間の整理が完了した上で、新しい意味を導入する。

**やる条件**:
1. Business Semantic Core の境界が安定
2. Analytic Kernel の境界が安定
3. bridge/contract/fallback が十分安定
4. JS 正本縮退が主要対象で進んでいる
5. 「今の意味を守る」体制が先に完成している

**対象**: 新しい説明指標 / 新しい KPI / 新しい業務意味 / UI 上の新しい解釈導入

### 常時運用: AAG 部分更新

全面再設計はしない。以下を継続的に実施:
- 新しい guard の追加 / 不要 guard の sunset
- violation message 改善 / derived view の運用改善

### 原則やらないもの

**current/candidate の物理統合** — 統合ではなく promote + candidate 廃止で解消する

---

## Phase ゲート条件

各 Phase の開始条件（entry gate）を明示する。受け入れ条件（exit gate）は各 Phase セクションに記載済み。

| Phase | Entry Gate（開始条件） |
|-------|---------------------|
| 0 | なし（最初のフェーズ） |
| 1 | Phase 0 の文書が配置済み + authoritative スイープ完了 |
| 2 | Phase 1 inventory で主要 pure 計算の semanticClass が暫定確定 |
| 3 | Phase 2C 完了（CanonEntry 必須化 + derived view 安定 + guard 通過） |
| 4 | Phase 2 の CanonEntry 拡張済み + Phase 1 の WASM module 再分類済み |
| 5 | Phase 2-4 全完了 + business 候補に contractId 採番可能 + business bridge 論理境界定義済み |
| 6 | Phase 2-4 全完了 + analytic 候補に methodFamily + invariantSet 定義可能 |
| 7 | Phase 5/6 で promotion-ready 候補が存在する + 前倒し guard が安定稼働 |
| 8 | Phase 7 完了 + promotion-ready 判定表が埋まっている + dual-run 観測記録あり + rollback 実証済み |
| 9 | Phase 8 で対象責務の昇格完了 |
| 10 | Phase 9 の JS 撤去が主要対象で完了 + registry/view 安定 |
| 11 | Phase 10 の物理構造収束が安定 + 「今の意味を守る」体制が完成 |

---

## Observable Metrics（成功指標）

計画全体の成功を観測するための指標。各 Phase の受け入れ条件とは別に、継続的に計測する。

### 構造指標

| 指標 | 計測方法 | 目標方向 |
|------|---------|---------|
| direct import 違反件数 | AR-BRIDGE-DIRECT-IMPORT の baseline | ratchet-down |
| semanticClass 未設定件数 | AR-CANON-SEMANTIC-REQUIRED の violation 数 | → 0 |
| mixed view 違反件数 | AR-CANON-BUSINESS-ANALYTIC-MIX の violation 数 | = 0 |
| current/candidate 混線件数 | AR-CANON-CANDIDATE-CURRENT-MIX の violation 数 | = 0 |
| `authoritative` 単独使用件数 | AR-TERM-AUTHORITATIVE-STANDALONE の baseline | ratchet-down |

### 移行指標

| 指標 | 計測方法 | 目標方向 |
|------|---------|---------|
| contract 固定済み率 | contractId 設定済み / 対象 required 件数 | → 100% |
| bridge 経由率 | bridge 呼び出し / (bridge + direct import) | → 100% |
| dual-run 実施率 | dual-run 済み候補 / 全候補 | → 100% |
| retired-js 化済み責務数 | Stage D の責務数 | 増加 |

### 誤実装抑止指標

| 指標 | 計測方法 | 目標方向 |
|------|---------|---------|
| AAG pre-CI 修正成功件数 | violation → fix の記録 | 増加 |
| 同種違反の再発率 | 同じ rule ID の繰り返し violation | 減少 |
| review-needed 放置件数 | runtimeStatus=non-target 以外の review-needed | ratchet-down |

### 安定性指標

| 指標 | 計測方法 | 目標方向 |
|------|---------|---------|
| promote 失敗率 | promote 失敗 / promote 試行 | 減少 |
| promote 後 rollback 発生率 | rollback / promote 成功 | = 0 |
| current 群の互換破壊件数 | current guard violation | = 0 |

---

## 検証方法（全 Phase 共通）

```bash
cd app && npm run lint            # ESLint エラー0
cd app && npm run format:check    # Prettier 準拠
cd app && npm run build           # tsc -b + vite build
cd app && npm run test:guards     # ガードテスト全通過
cd app && npm test                # 全テスト通過
cd app && npm run docs:generate   # health 更新（guard/allowlist 変更時）
```

---

## 重要ファイル一覧

| ファイル | Phase | 変更内容 |
|---------|-------|---------|
| `references/01-principles/semantic-classification-policy.md` | 0 | 新規（定義書） |
| `references/01-principles/engine-boundary-policy.md` | 0 | 用語整合 |
| `references/02-status/authoritative-term-sweep.md` | 0 | 新規（用語スイープ結果） |
| `CLAUDE.md` | 0 | 参照追加 + authoritative 禁止 |
| `references/03-guides/semantic-inventory-procedure.md` | 1 | 新規（手順書） |
| `references/02-status/semantic-inventory.yaml` | 1 | 新規（inventory） |
| `references/03-guides/directory-registry-ownership-policy.md` | 2 | 新規（方針書） |
| `app/src/test/calculationCanonRegistry.ts` | 2(型)+3(値) | Phase 2 で完全定義（optional→必須化）、Phase 3 で契約値を埋める |
| `app/src/test/semanticViews.ts` | 2 | 新規（derived view 生成） |
| `app/src/test/guards/calculationCanonGuard.test.ts` | 2 | 新テスト追加 |
| `app/src/test/architectureRules.ts` | 2+3 | 新ルール 5件（Phase 2）+ 6件（Phase 3） |
| `references/03-guides/contract-definition-policy.md` | 3 | 新規（契約定義書） |
| `app/src/application/services/*Bridge.ts` (5 files) | 3 | JSDoc + contractId + bridgeKind |
| `app/src/application/services/wasmEngine.ts` | 3 | メタデータ拡張 |
| `references/03-guides/current-maintenance-policy.md` | 4 | 新規（current 保守方針） |
| `wasm/*/Cargo.toml` (7 files) | 4 | semantic metadata 追加 |
| `app/src/test/architectureRules.ts` | 0-7 | Ph0: 1件, Ph2: 5件, Ph3: 6件, Ph4: 7件, Ph5/6: 各7件, Ph7: 7件（即時導入） |

## Guard 導入の全体像（前倒し方式）

**原則**: guard は定義した Phase で即時導入する。Phase 7 を待たない。

| Phase | Guard 数 | severity | 主な検出対象 |
|-------|---------|----------|------------|
| Phase 0 | 1 | ratchet | authoritative 単独使用（既存 baseline、新規禁止） |
| Phase 2 | 5 | ratchet→hard | semantic 未設定、business/analytic 混在、candidate/current 混在、ownership 未設定、registry 手編集 |
| Phase 3 | 6 | hard/ratchet | contract 未設定、businessMeaning 未記載、methodFamily 未記載、rate UI 再計算、direct import、candidate default |
| Phase 4 | 7 | hard/ratchet | current candidate 状態禁止、current semantic 必須、current auth 単独禁止、view 分離、candidate 混入禁止、direct import 増加禁止、factor business lock |
| Phase 5/6 | 各7 | hard | Business/Analytic Contract 必須、bridge 交差接続禁止、rollback 必須、dual-run 必須 |
| Phase 7 | 7 | hard | JS 縮退(5) + 特記(2)。統合整理のみ、基本 guard は導入済み |
| **推定最終実装数** | **26-30** | | Phase 間の重複を統合した実数 |
