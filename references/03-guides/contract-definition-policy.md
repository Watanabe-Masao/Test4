# 契約定義ポリシー（Contract Definition Policy）

> Phase 3: 契約固定と bridge 境界定義

## 1. 目的

JS から分離対象となる pure 計算について、**I/O 契約と runtime 境界を固定する**。
Rust 実装を増やす Phase ではない。「どう呼ぶか」「何を返すか」を先に固定する Phase。

## 2. 原則

1. **契約はロジックより先に固定する** — 置換失敗の多くは入力形状・null・率・期間解釈の曖昧さで起きる
2. **bridge は runtime の唯一入口** — direct import 禁止
3. **Business と Analytic で契約様式を分ける**
4. **率は engine 側で算出** — UI / VM / SQL で率を再計算しない（`rateOwnership: 'engine'`）
5. **current/candidate 切替は bridge の責務** — UI の責務ではない

## 3. Business Contract テンプレート（BIZ-XXX）

業務値を確定する計算に付与する。出力が UI で「正式な業務値」として表示される。

```yaml
contractId: BIZ-XXX
semanticClass: business
authorityKind: business-authoritative
bridgeKind: business

# === 業務意味 ===
businessMeaning: |
  （この計算が確定する業務値を 1-2 文で説明）

# === I/O 契約 ===
inputSchema:
  description: |
    額・数量・件数を入力。率は engine が算出するため入力に含めない。
  fields:
    - name: ...
      type: number
      nullable: true  # null = データ未取得

outputSchema:
  description: |
    value + unit + methodUsed + usedFallback + warnings + scope
  fields:
    - name: value
      type: number | null
      description: 計算結果。null = 計算不能
    - name: methodUsed
      type: string
      description: 使用した計算手法（inv/est/wasm/ts-fallback 等）
    - name: usedFallback
      type: boolean
      description: fallback を使用したか
    - name: warnings
      type: string[]
      description: 計算時の警告
    - name: scope
      type: string
      description: 対象期間・店舗スコープ

# === null ポリシー ===
nullPolicy: |
  入力 null → 出力 null（伝播）。0 と null は区別する。

# === 率の所有権 ===
rateOwnership: engine
  # engine 側で率を算出。UI / VM / SQL で率を再計算してはならない。

# === fallback 方針 ===
fallbackPolicy:
  allowed: true
  target: current
  # WASM 未 ready / 失敗時は TS current 実装にフォールバック
```

### BIZ 契約一覧

| contractId | 対象ファイル | businessMeaning |
|-----------|------------|----------------|
| BIZ-001 | invMethod.ts | 在庫法による粗利計算。確定仕入高と売上から荒利を算出する |
| BIZ-002 | estMethod.ts | 推定法によるマージン計算。売価値入率から荒利を推定する |
| BIZ-003 | budgetAnalysis.ts | 予算分析。予算と実績の差異・達成率・進捗を算出する |
| BIZ-004 | factorDecomposition.ts | 売上差異の要因分解。Shapley 値により客数・単価・点数の寄与を算出する |
| BIZ-005 | discountImpact.ts | 売変ロス原価。値引きが粗利に与える影響を算出する |
| BIZ-006 | costAggregation.ts | 移動合計・在庫仕入原価の集計。3 独立正本を統合する |
| BIZ-007 | markupRate.ts | 値入率。仕入原価と売価から値入率を算出する |
| BIZ-008 | remainingBudgetRate.ts | 残予算必要達成率。残り期間で必要な売上達成率を逆算する |
| BIZ-009 | inventoryCalc.ts | 日別推定在庫推移。仕入・売上から日別の推定在庫を計算する |
| BIZ-010 | observationPeriod.ts | 観測期間ステータス。在庫法 / 推定法の選択を決定するデータ品質評価 |
| BIZ-011 | pinIntervals.ts | 在庫確定区間の粗利。棚卸確定区間ごとの粗利を計算する |
| BIZ-012 | piValue.ts | PI 値（点数 PI 値・金額 PI 値）。客数あたりの購買指標を算出する |
| BIZ-013 | customerGap.ts | 前年比客数 GAP。客数・点数・金額の前年差異を算出する |

## 4. Analytic Contract テンプレート（ANA-XXX）

分析基盤計算に付与する。出力は業務値ではなく分析素材。

```yaml
contractId: ANA-XXX
semanticClass: analytic
authorityKind: analytic-authoritative
bridgeKind: analytics

# === 技法定義 ===
methodFamily: ...  # time_pattern, forecasting, what_if, temporal_pattern, statistical, anomaly_detection, calendar_effect, time_series

# === I/O 契約 ===
inputSchema:
  description: |
    時系列データ・数値配列を入力。
  fields:
    - name: ...
      type: number[]
      nullable: false

outputSchema:
  description: |
    series/components + methodFamily + invariantsSatisfied + warnings
  fields:
    - name: result
      type: number | number[] | object
      description: 分析結果
    - name: methodFamily
      type: string
      description: 使用した分析技法
    - name: invariantsSatisfied
      type: boolean
      description: 数学的不変条件を満たしたか
    - name: warnings
      type: string[]
      description: 分析時の警告

# === 不変条件 ===
invariantSet:
  - description: ...
    formula: ...

# === fallback 方針 ===
fallbackPolicy:
  allowed: true
  target: current
```

### ANA 契約一覧

| contractId | 対象ファイル | methodFamily | invariant 例 |
|-----------|------------|-------------|-------------|
| ANA-001 | timeSlotCalculations.ts | time_pattern | コアタイム ⊂ 営業時間 |
| ANA-002 | algorithms/advancedForecast.ts | forecasting | WMA 重み合計 = 1.0 |
| ANA-003 | algorithms/sensitivity.ts | what_if | 感度 ∈ [0, ∞) |
| ANA-004 | algorithms/trendAnalysis.ts | temporal_pattern | MoM/YoY 比較基準の一致 |
| ANA-005 | algorithms/correlation.ts | statistical | pearson ∈ [-1, 1] |
| ANA-006 | forecast.ts | anomaly_detection | 異常値閾値 > 0 |
| ANA-007 | dowGapAnalysis.ts | calendar_effect | 曜日合計 = 週合計 |
| ANA-008 | dowGapActualDay.ts | calendar_effect | 実日数 ≥ 0 |
| ANA-009 | temporal/computeMovingAverage.ts | time_series | 窓幅 ≥ 1、出力長 = 入力長 - 窓幅 + 1 |

## 5. Bridge 境界

### 5.1 Bridge の役割

bridge は pure 計算の **runtime 唯一入口**。以下の責務を持つ:

1. WASM ready 判定と TS fallback 切替
2. current/candidate 切替（Phase 5-6 で実装）
3. dual-run compare（Phase 5-6 で実装）
4. 入力のバリデーション / 正規化
5. 出力の型保証

### 5.2 Bridge モード

| モード | 説明 | 導入時期 |
|-------|------|---------|
| `current-only` | 通常運用。WASM ready なら WASM、そうでなければ TS | Phase 3（現在） |
| `candidate-only` | 試験検証。candidate 実装のみ使用 | Phase 5-6 |
| `dual-run-compare` | 昇格前観測。current + candidate を両方実行して比較 | Phase 5-6 |
| `fallback-to-current` | candidate 失敗時に current に戻す | Phase 5-6 |

### 5.3 Bridge 意味分類

| ファイル | bridgeKind | semanticClass | contractId |
|---------|-----------|--------------|-----------|
| factorDecompositionBridge.ts | business | business | BIZ-004 |
| grossProfitBridge.ts | business | business | BIZ-001, BIZ-002, BIZ-005, BIZ-006 |
| budgetAnalysisBridge.ts | business | business | BIZ-003 |
| forecastBridge.ts | analytics | analytic | ANA-002, ANA-004, ANA-005, ANA-006 |
| timeSlotBridge.ts | analytics | analytic | ANA-001 |

### 5.4 Direct import 禁止方針

runtime（application / presentation 層）から以下の direct import を禁止する:

- `domain/calculations/*` の pure 関数（型参照・テスト除く）
- `wasm/current/*`
- `wasm/candidate/*`

呼び出しは bridge 一点に集約する。既存の direct import は `AR-BRIDGE-DIRECT-IMPORT` で
ratchet 管理し、新規追加を禁止する。

## 6. WASM Engine メタデータ

`wasmEngine.ts` の各モジュールに意味分類メタデータを追加する:

| Module | semanticClass | bridgeKind |
|--------|--------------|-----------|
| factorDecomposition | business | business |
| grossProfit | business | business |
| budgetAnalysis | business | business |
| forecast | analytic | analytics |
| timeSlot | analytic | analytics |

## 7. Utility エントリの契約

`semanticClass: 'utility'` のエントリは契約対象外:
- `contractId` / `bridgeKind` / `rateOwnership` / `fallbackPolicy` は設定しない
- bridge を持たない
- 率の所有権は `n/a`

## 8. Phase 3 Guard

| Guard ID | severity | 内容 |
|----------|----------|------|
| AR-CONTRACT-SEMANTIC-REQUIRED | hard | semanticClass 未設定で contract 追加禁止 |
| AR-CONTRACT-BUSINESS-MEANING | hard | Business Contract に businessMeaning 相当の reason 未記載禁止 |
| AR-CONTRACT-ANALYTIC-METHOD | hard | Analytic Contract に methodFamily 未記載禁止 |
| AR-BRIDGE-RATE-OWNERSHIP | hard | rate を UI / VM / SQL で再計算する実装禁止 |
| AR-BRIDGE-DIRECT-IMPORT | ratchet | bridge を通さない pure 計算呼び出し禁止（既存を baseline、新規追加禁止） |
| AR-BRIDGE-CANDIDATE-DEFAULT | hard | candidate-only を UI の既定経路にする変更禁止 |

## 9. 関連文書

- `references/01-principles/semantic-classification-policy.md` — 意味分類ポリシー（5 原則）
- `references/01-principles/engine-boundary-policy.md` — 3 エンジン境界
- `references/03-guides/directory-registry-ownership-policy.md` — レジストリ所有権
- `app/src/test/calculationCanonRegistry.ts` — Master Registry
- `app/src/test/architectureRules.ts` — Architecture Rules（Phase 3 guard 含む）
