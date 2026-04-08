# AAG 運用区分表 — 84 ルールの 3 分類

## 運用方針

| 区分 | 方針 | 対象の性質 |
|------|------|-----------|
| **即修正** | hard gate。違反したら今の diff で直す | 局所修正で閉じる。正否が明確。放置すると害が増える |
| **構造負債** | 新規悪化は止める。既存分は allowlist + ratchet-down で計画的に返す | 解消に設計変更を伴う。波及が大きい。allowlist lifecycle で管理 |
| **観測** | 即 fail にしない。Discovery Review の入力とする | コードではなく AAG 制度の健全性を示す兆候 |

---

## 即修正（31 ルール）

### 層境界・依存方向（7 ルール — invariant）

壊すと設計の根幹が崩れる。例外なし。

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-A1-DOMAIN | invariant | domain/ は外部層に依存しない |
| AR-A1-APP-INFRA | invariant | application/ は infrastructure/ に直接依存しない |
| AR-A1-APP-PRES | invariant | application/ は presentation/ に依存しない |
| AR-A1-PRES-INFRA | invariant | presentation/ は infrastructure/ に直接依存しない |
| AR-A1-PRES-USECASE | invariant | presentation/ は application/usecases/ を直接 import しない |
| AR-A1-INFRA-APP | invariant | infrastructure/ は application/ に依存しない |
| AR-A1-INFRA-PRES | invariant | infrastructure/ は presentation/ に依存しない |

### 明確な禁止パターン（8 ルール）

「今この diff で直せる」性質。放置する合理性が薄い。

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-G3-SUPPRESS | default | コンパイラ警告を黙殺しない |
| AR-E4-TRUTHINESS | default | 数値フィールドの truthiness チェック禁止 |
| AR-C5-SELECTOR | default | Zustand store はセレクタ付きで呼ぶ |
| AR-G2-EMPTY-CATCH | default | 空の catch ブロック禁止 |
| AR-G4-INTERNAL | default | hooks/ に @internal export を作らない |
| AR-002 | invariant | presentation → wasmEngine 直接 import 禁止 |
| AR-004 | default | 新規 @deprecated wrapper 禁止 |
| AR-C3-STORE | default | store action 内に業務ロジック禁止 |

### 正本経路・唯一経路（14 ルール — 主に invariant）

「今直さないと別経路が増える」。放置コストが日々増加。

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-PATH-SALES | invariant | 売上は readSalesFact 経由 |
| AR-PATH-DISCOUNT | invariant | 値引きは readDiscountFact 経由 |
| AR-PATH-GROSS-PROFIT | invariant | 粗利は calculateGrossProfit 経由 |
| AR-PATH-PURCHASE-COST | invariant | 仕入原価は readPurchaseCost 経由 |
| AR-PATH-CUSTOMER | invariant | 客数は readCustomerFact 経由 |
| AR-PATH-CUSTOMER-GAP | invariant | 客数 GAP は calculateCustomerGap 経由 |
| AR-PATH-PI-VALUE | invariant | PI 値は calculateQuantityPI/AmountPI 経由 |
| AR-PATH-FREE-PERIOD | invariant | 自由期間は readFreePeriodFact 経由 |
| AR-PATH-FREE-PERIOD-BUDGET | invariant | 自由期間予算は readFreePeriodBudgetFact 経由 |
| AR-PATH-FREE-PERIOD-DEPT-KPI | invariant | 自由期間部門 KPI は readFreePeriodDeptKPI 経由 |
| AR-PATH-FACTOR-DECOMPOSITION | invariant | 要因分解は calculateFactorDecomposition 経由 |
| AR-PATH-GROSS-PROFIT-CONSISTENCY | invariant | 粗利の一貫性保証 |
| AR-STRUCT-PURITY | invariant | domain/ は純粋（副作用なし） |
| AR-STRUCT-TOPOLOGY | invariant | src/ 直下は承認済みディレクトリのみ |

### その他即修正（2 ルール）

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-001 | invariant | bridge に dual-run コード再導入禁止 |
| AR-C7-NO-DUAL-API | default | 同義 API 併存禁止 |

---

## 構造負債（33 ルール）

新規悪化は gate で止める。既存分は allowlist + ratchet-down で計画的に返す。

### 複雑性・サイズ上限（7 ルール — heuristic）

違反の修正が局所で閉じない場合が多い。allowlist で structural / active-debt 管理。

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-G5-HOOK-MEMO | heuristic | hooks/ の useMemo 上限 |
| AR-G5-HOOK-STATE | heuristic | hooks/ の useState 上限 |
| AR-G5-HOOK-LINES | heuristic | hooks/ の行数上限 (300) |
| AR-G6-COMPONENT | heuristic | .tsx コンポーネント行数上限 (600) |
| AR-G5-DOMAIN-LINES | heuristic | domain/ 行数上限 (300) |
| AR-G5-INFRA-LINES | heuristic | infrastructure/ 行数上限 (400) |
| AR-G5-USECASE-LINES | heuristic | usecases/ 行数上限 (400) |

### 責務分離の数値制約（20 ルール — heuristic/default）

品質上有用だが、修正が分割・抽出・責務再設計を伴う。

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-STRUCT-RESP-SEPARATION | default | 責務分離 7 種の数値制約 |
| AR-C6-FACADE | heuristic | facade の分岐上限 |
| AR-TAG-CHART-VIEW | heuristic | chart-view の状態・計算上限 |
| AR-TAG-CHART-OPTION | heuristic | chart-option は hooks 禁止 |
| AR-TAG-CALCULATION | heuristic | calculation は純粋関数 |
| AR-TAG-TRANSFORM | heuristic | transform は状態禁止 |
| AR-TAG-STATE-MACHINE | heuristic | state-machine は短く保つ |
| AR-TAG-QUERY-PLAN | heuristic | query-plan は実行しない |
| AR-TAG-QUERY-EXEC | heuristic | query-exec は実行とキャッシュのみ |
| AR-TAG-WIDGET | heuristic | widget は状態を持ちすぎない |
| AR-TAG-PAGE | heuristic | page は統合点。行数は抑える |
| AR-TAG-FORM | heuristic | form は入力処理のみ |
| AR-TAG-LAYOUT | heuristic | layout にロジック禁止 |
| AR-TAG-ORCHESTRATION | heuristic | orchestration は組み立てのみ |
| AR-TAG-UTILITY | heuristic | utility は純粋関数 |
| AR-TAG-CONTEXT | heuristic | context は値の提供のみ |
| AR-TAG-PERSISTENCE | heuristic | persistence は永続化のみ |
| AR-TAG-ADAPTER | heuristic | adapter は変換のみ |
| AR-TAG-REDUCER | heuristic | reducer は純粋な状態遷移 |
| AR-TAG-BARREL | heuristic | barrel は re-export のみ |

### 構造的移行ルール（6 ルール — default）

「今の構造をどう進化させるか」。新規逆流は gate、既存は active-debt。

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-005 | default | shared plan hook 数凍結 |
| AR-003 | default | UnifiedWidgetContext 肥大化防止 |
| AR-STRUCT-STORE-RESULT-INPUT | default | totalCustomers は CustomerFact 経由 |
| AR-STRUCT-QUERY-PATTERN | default | クエリ正規化・pair/bundle 契約 |
| AR-MIG-OLD-PATH | default | 旧パス新規 import 禁止 |
| AR-STRUCT-PRES-ISOLATION | default | presentation 描画専用 |

---

## 観測（20 ルール）

コードを直す対象ではなく、AAG 制度の健全性を示す兆候。
Discovery Review の入力として使う。

### 構造品質の観測（12 ルール — default）

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-STRUCT-ANALYSIS-FRAME | default | AnalysisFrame が分析の唯一入口 |
| AR-STRUCT-CALC-CANON | default | calculations/ 全ファイルが REGISTRY 登録 |
| AR-CANON-ZOD-REQUIRED | default | required 分類ファイルに Zod 契約 |
| AR-CANON-ZOD-REVIEW | default | review 分類の Zod 未済を段階的に解消 |
| AR-STRUCT-CANONICAL-INPUT | default | PI/GAP は正本 input builder 経由 |
| AR-STRUCT-CANONICALIZATION | default | readModel と calculation が正本化原則に従う |
| AR-STRUCT-COMPARISON-SCOPE | default | ComparisonScope 生成の唯一経路 |
| AR-STRUCT-DATA-INTEGRITY | default | 既知バグパターン防止 |
| AR-STRUCT-DUAL-RUN-EXIT | default | dual-run 退役済み |
| AR-STRUCT-FALLBACK-METADATA | default | readModel に usedFallback |
| AR-STRUCT-PAGE-META | default | PAGE_REGISTRY 整合性 |
| AR-STRUCT-RENDER-SIDE-EFFECT | default | presentation の localStorage 禁止 |

### Temporal Governance の観測（4 ルール — default）

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-STRUCT-TEMPORAL-SCOPE | default | 期間スコープ分離 |
| AR-STRUCT-TEMPORAL-ROLLING | default | ローリング計算パス逆流禁止 |
| AR-STRUCT-CONVENTION | default | バレル・feature slice・ctx 重複禁止 |
| AR-Q3-CHART-NO-DUCKDB | default | Chart の DuckDB 直接 import 禁止 |

### メタルール（4 ルール — heuristic/default）

| ruleId | ruleClass | what |
|--------|-----------|------|
| AR-Q4-ALIGNMENT-HANDLER | default | alignment-aware は handler に閉じる |
| AR-C9-HONEST-UNCLASSIFIED | heuristic | 嘘の分類より正直な未分類 |
| AR-G7-CACHE-BODY | heuristic | キャッシュ ≤ 本体 |
| AR-TAG-SELECTION-GUIDE | heuristic | @responsibility タグの選択ガイド |

---

## 集計

| 区分 | ルール数 | ruleClass 内訳 |
|------|---------|---------------|
| **即修正** | 31 | invariant 23 + default 8 |
| **構造負債** | 33 | default 7 + heuristic 26 |
| **観測** | 20 | default 16 + heuristic 4 |
| **合計** | **84** | invariant 23 / default 31 / heuristic 30 |

---

## ruleClass との対応

| ruleClass | 即修正 | 構造負債 | 観測 |
|-----------|--------|---------|------|
| **invariant** | 23 (100%) | 0 | 0 |
| **default** | 8 (26%) | 7 (23%) | 16 (52%) |
| **heuristic** | 0 | 26 (87%) | 4 (13%) |

- **invariant は全て即修正**。例外なし
- **heuristic は構造負債が中心**。即修正には使わない
- **default は 3 区分に分散**。ルールの性質で個別判断
