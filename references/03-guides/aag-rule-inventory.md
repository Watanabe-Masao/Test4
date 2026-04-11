# AAG Rule Inventory

> Phase 1-A 成果物。全 140 ルールの所属先・バインディング種別・移設リスクを正本化する。

## 目的

物理移動（physical move）の前に、各ルールが Core / App Domain / Project Overlay の
どこに属するかを棚卸しし、移動可能性を可視化する。

## 統計サマリ

| 指標 | 値 |
|---|---|
| 総ルール数 | 140 |
| スライス数 | 5（canonicalization: 62, responsibility-separation: 36, governance-ops: 23, layer-boundary: 12, query-runtime: 7）|
| バインディング種別 | doc-ref: 87, imports: 18, code-signals: 17, example: 10, multi-binding: 8, none: 0 |
| ルール分類 | invariant: 54, default: 51, heuristic: 35 |
| 検出方式 | custom: 49, count: 31, import: 27, regex: 20, co-change: 4, must-not-coexist: 4, must-include: 3, must-only: 2 |
| doc 参照あり | 140/140 |
| 移設リスク | low: 122, medium: 18, high: 0 |

## Owner 分類

### 層別の所属先

| 層 | owner | targetHome | 理由 |
|---|---|---|---|
| semantics | app-domain | app-domain/rule-catalog | what/why はアプリ固有の業務概念を参照する |
| detection | core | — (型定義のみ) | detection.type/severity は再利用可能な検出スキーマ |
| binding | app-domain | app-domain/bindings | imports/codeSignals/example/doc は全てアプリ固有 |

### Governance の所属先（3 層に分割）

Governance フィールドは一律に同じ層に属さない。
安定した業務知識と案件運用状態を区別する。

| governance フィールド | 性質 | 所属先 | 理由 |
|---|---|---|---|
| `decisionCriteria` | ルールの安定した判断基準 | **App Domain** | when/exceptions/escalation は業務知識。案件が変わっても同じ |
| `migrationPath.steps` | 修正手順の手順記述 | **App Domain** | 「何をどう直すか」は安定した知識 |
| `sunsetCondition` | ルールが不要になる条件 | **App Domain** | 反証可能性の定義。案件に依存しない |
| `fixNow` | 今この案件でどう扱うか | **Project Overlay** | now/debt/review は案件の運用判断 |
| `migrationPath.priority` | 案件固有の実行優先度 | **Project Overlay** | 「いつやるか」は進行状態 |
| `migrationPath.effort` | 案件固有の工数見積 | **Project Overlay** | リソース配分は案件判断 |
| `reviewPolicy` | レビュー周期・最終レビュー日 | **Project Overlay** | owner/lastReviewedAt/cadence は案件運用 |
| `lifecyclePolicy` | experimental の出口タイミング | **Project Overlay** | introducedAt/observeForDays は案件の時計 |

**重要な判断**:
- ルール **意味**（semantics + binding）は App Domain
- ルール **判断基準**（decisionCriteria, steps, sunsetCondition）は App Domain
- ルール **運用状態**（fixNow, priority, effort, reviewPolicy, lifecyclePolicy）は Project Overlay
- Core に属するのは型定義（RuleSemantics, RuleGovernance, RuleDetectionSpec）と検出スキーマのみ

## 移設リスク判定基準

| リスク | 判定基準 | 件数 |
|---|---|---|
| **low** | binding が薄い（doc-ref / example / code-signals のみ）。guard が getRuleById() 経由でアクセス | 122 |
| **medium** | imports/multi-binding あり。guard が outdatedPattern.imports を検出ロジックに使用 | 18 |
| **high** | 複数 consumer が暗黙に依存し、物理移動で ripple が大きい | 0 |

high が 0 の理由: 43 の guard test は全て `getRuleById()` 関数経由。
ARCHITECTURE_RULES を直接走査するのは 2 ファイル（architectureRuleGuard.test.ts, guardMetadataView.ts）のみで、
barrel re-export で吸収可能。

## Inventory 全件

凡例:
- **OI**: outdatedPattern.imports あり
- **OCS**: outdatedPattern.codeSignals あり
- **CE**: correctPattern.example あり
- **CI**: correctPattern.imports あり

### canonicalization (62 rules)

| ruleId | principleRefs | bindingKind | OI | OCS | CE | CI | ruleClass | detection | moveRisk |
|---|---|---|---|---|---|---|---|---|---|
| AR-PATH-SALES | B1,F8 | imports | Y |  |  | Y | invariant | import | medium |
| AR-PATH-DISCOUNT | B1,F8 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-GROSS-PROFIT | B1,B3 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-PURCHASE-COST | B1,F8 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-CUSTOMER | B1,F8 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-CUSTOMER-GAP | B1,D1 | multi-binding |  | Y |  | Y | invariant | regex | medium |
| AR-PATH-PI-VALUE | B1 | multi-binding |  | Y |  | Y | invariant | regex | medium |
| AR-PATH-FREE-PERIOD | B1 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-FREE-PERIOD-BUDGET | B1 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-FREE-PERIOD-DEPT-KPI | B1 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-FACTOR-DECOMPOSITION | B1,D1,D2 | imports |  |  |  | Y | invariant | import | low |
| AR-PATH-GROSS-PROFIT-CONSISTENCY | B1,D3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-STRUCT-CALC-CANON | B1 | doc-ref |  |  |  |  | default | must-include | low |
| AR-CANON-ZOD-REQUIRED | E1,F5 | doc-ref |  |  |  |  | default | must-include | low |
| AR-CANON-ZOD-REVIEW | E1 | doc-ref |  |  |  |  | default | count | low |
| AR-STRUCT-CANONICAL-INPUT | B1,E1 | doc-ref |  |  |  |  | default | regex | low |
| AR-STRUCT-CANONICALIZATION | B1,E1,F5 | doc-ref |  |  |  |  | default | custom | low |
| AR-STRUCT-FALLBACK-METADATA | E3 | doc-ref |  |  |  |  | default | must-include | low |
| AR-STRUCT-STORE-RESULT-INPUT | B1 | doc-ref |  |  |  |  | default | regex | low |
| AR-SAFETY-SILENT-CATCH | G2,G3 | code-signals |  | Y |  |  | default | regex | low |
| AR-SAFETY-FIRE-FORGET | G2 | code-signals |  | Y |  |  | default | regex | low |
| AR-SAFETY-NULLABLE-ASYNC | G2,E4 | multi-binding |  | Y | Y |  | invariant | regex | medium |
| AR-SAFETY-VALIDATION-ENFORCE | E1,G2 | code-signals |  | Y |  |  | invariant | custom | low |
| AR-SAFETY-INSERT-VERIFY | G2,D3 | code-signals |  | Y |  |  | default | custom | low |
| AR-SAFETY-PROD-VALIDATION | E1,G2 | code-signals |  | Y |  |  | default | regex | low |
| AR-SAFETY-WORKER-TIMEOUT | G2 | code-signals |  | Y |  |  | default | custom | low |
| AR-SAFETY-STALE-STORE | G2 | code-signals |  | Y |  |  | default | custom | low |
| AR-COCHANGE-READMODEL-PARSE | G1,E1 | code-signals |  | Y |  |  | default | co-change | low |
| AR-CANON-SEMANTIC-REQUIRED | I2,I4 | example |  |  | Y |  | default | custom | low |
| AR-SEMANTIC-BUSINESS-ANALYTIC-SEPARATION | I2 | doc-ref |  |  |  |  | heuristic | custom | low |
| AR-CURRENT-CANDIDATE-SEPARATION | I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CONTRACT-SEMANTIC-REQUIRED | I1,I2 | example |  |  | Y |  | invariant | custom | low |
| AR-CONTRACT-BUSINESS-MEANING | I2 | example |  |  | Y |  | invariant | custom | low |
| AR-CONTRACT-ANALYTIC-METHOD | I2 | example |  |  | Y |  | invariant | custom | low |
| AR-BRIDGE-RATE-OWNERSHIP | I1 | multi-binding |  | Y | Y |  | invariant | custom | medium |
| AR-BRIDGE-DIRECT-IMPORT | I1,I2 | multi-binding | Y |  | Y |  | default | import | medium |
| AR-BRIDGE-CANDIDATE-DEFAULT | I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CURRENT-NO-CANDIDATE-STATE | I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CURRENT-SEMANTIC-REQUIRED | I2 | example |  |  | Y |  | invariant | custom | low |
| AR-CURRENT-NO-STANDALONE-AUTH | I1 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CURRENT-VIEW-SEPARATION | I2,I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CURRENT-NO-CANDIDATE-MIX | I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CURRENT-NO-DIRECT-IMPORT-GROWTH | I1,I2 | doc-ref |  |  |  |  | default | import | low |
| AR-CURRENT-FACTOR-BUSINESS-LOCK | I2 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-BIZ-CONTRACT-REQUIRED | I2 | example |  |  | Y |  | invariant | custom | low |
| AR-CAND-BIZ-NO-CURRENT-MIX | I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-BIZ-NO-ANALYTICS-BRIDGE | I2 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-BIZ-NO-RATE-UI | I1 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-BIZ-NO-DIRECT-IMPORT | I1,I2 | doc-ref |  |  |  |  | default | import | low |
| AR-CAND-BIZ-NO-ROLLBACK-SKIP | I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-BIZ-NO-PROMOTE-WITHOUT-DUALRUN | I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-ANA-CONTRACT-REQUIRED | I2 | example |  |  | Y |  | invariant | custom | low |
| AR-CAND-ANA-NO-BUSINESS-BRIDGE | I2 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-ANA-METHOD-REQUIRED | I2 | example |  |  | Y |  | invariant | custom | low |
| AR-CAND-ANA-INVARIANT-REQUIRED | I2 | example |  |  | Y |  | invariant | custom | low |
| AR-CAND-ANA-NO-DIRECT-IMPORT | I1,I2 | doc-ref |  |  |  |  | default | import | low |
| AR-CAND-ANA-NO-CURRENT-BIZ-MIX | I2,I3 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-CAND-ANA-NO-FACTOR-DECOMP | I2 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-JS-NO-NEW-AUTHORITATIVE | I1,I2 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-JS-NO-REFERENCE-GROWTH | I1 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-JS-NO-PRES-HELPER-PROMOTE | I2 | doc-ref |  |  |  |  | invariant | custom | low |
| AR-REVIEW-NEEDED-BLOCK | I2,I3 | doc-ref |  |  |  |  | invariant | custom | low |

### governance-ops (23 rules)

| ruleId | principleRefs | bindingKind | OI | OCS | CE | CI | ruleClass | detection | moveRisk |
|---|---|---|---|---|---|---|---|---|---|
| AR-001 | G1 | code-signals |  | Y |  |  | invariant | regex | low |
| AR-003 | C1,A5 | doc-ref |  |  |  |  | default | count | low |
| AR-004 | G1 | code-signals |  | Y |  |  | default | count | low |
| AR-005 | H1 | doc-ref |  |  |  |  | default | count | low |
| AR-G4-INTERNAL | G4 | code-signals |  | Y |  |  | default | regex | low |
| AR-C3-STORE | C3 | doc-ref |  |  |  |  | default | regex | low |
| AR-G3-SUPPRESS | G3,E2 | code-signals |  | Y |  |  | default | regex | low |
| AR-E4-TRUTHINESS | E4 | multi-binding |  | Y | Y |  | default | regex | medium |
| AR-C5-SELECTOR | C5 | multi-binding |  | Y | Y |  | default | regex | medium |
| AR-G2-EMPTY-CATCH | G2 | code-signals |  | Y |  |  | default | regex | low |
| AR-STRUCT-DATA-INTEGRITY | D3,E1 | doc-ref |  |  |  |  | default | custom | low |
| AR-STRUCT-DUAL-RUN-EXIT | B1 | doc-ref |  |  |  |  | default | custom | low |
| AR-MIG-OLD-PATH | F4 | doc-ref |  |  |  |  | default | import | low |
| AR-STRUCT-PAGE-META | F4 | doc-ref |  |  |  |  | default | co-change | low |
| AR-CONVENTION-BARREL | F1,F9 | doc-ref |  |  |  |  | default | must-only | low |
| AR-CONVENTION-FEATURE-BOUNDARY | F4 | doc-ref |  |  |  |  | default | import | low |
| AR-CONVENTION-CONTEXT-SINGLE-SOURCE | F2,F3,F6 | doc-ref |  |  |  |  | default | regex | low |
| AR-C7-NO-DUAL-API | C7 | doc-ref |  |  |  |  | default | custom | low |
| AR-DOC-STATIC-NUMBER | G1 | code-signals |  | Y |  |  | default | regex | low |
| AR-COCHANGE-VALIDATION-SEVERITY | G1,D3 | code-signals |  | Y |  |  | default | co-change | low |
| AR-COCHANGE-DUCKDB-MOCK | G1,D3 | code-signals |  | Y |  |  | default | co-change | low |
| AR-TERM-AUTHORITATIVE-STANDALONE | I1 | multi-binding |  | Y | Y |  | default | regex | medium |
| AR-REGISTRY-SINGLE-MASTER | I4 | doc-ref |  |  |  |  | invariant | custom | low |

### layer-boundary (12 rules)

| ruleId | principleRefs | bindingKind | OI | OCS | CE | CI | ruleClass | detection | moveRisk |
|---|---|---|---|---|---|---|---|---|---|
| AR-002 | A1,B1 | imports | Y |  |  |  | invariant | import | medium |
| AR-A1-DOMAIN | A1,A2 | imports | Y |  |  |  | invariant | import | medium |
| AR-A1-APP-INFRA | A1 | imports | Y |  |  |  | invariant | import | medium |
| AR-A1-APP-PRES | A1 | imports | Y |  |  |  | invariant | import | medium |
| AR-A1-PRES-INFRA | A1,A3 | imports | Y |  |  | Y | invariant | import | medium |
| AR-A1-PRES-USECASE | A1 | imports | Y |  |  |  | invariant | import | medium |
| AR-A1-INFRA-APP | A1 | imports | Y |  |  |  | invariant | import | medium |
| AR-A1-INFRA-PRES | A1 | imports | Y |  |  |  | invariant | import | medium |
| AR-STRUCT-PRES-ISOLATION | A3,H4,B2 | doc-ref |  |  |  |  | default | import | low |
| AR-STRUCT-PURITY | A2,C2,A6 | doc-ref |  |  |  |  | invariant | must-not-coexist | low |
| AR-STRUCT-RENDER-SIDE-EFFECT | A3 | code-signals |  | Y |  |  | default | regex | low |
| AR-STRUCT-TOPOLOGY | A1 | doc-ref |  |  |  |  | invariant | custom | low |

### query-runtime (7 rules)

| ruleId | principleRefs | bindingKind | OI | OCS | CE | CI | ruleClass | detection | moveRisk |
|---|---|---|---|---|---|---|---|---|---|
| AR-STRUCT-ANALYSIS-FRAME | H1 | doc-ref |  |  |  |  | default | custom | low |
| AR-STRUCT-COMPARISON-SCOPE | H2 | doc-ref |  |  |  |  | default | import | low |
| AR-STRUCT-QUERY-PATTERN | H1,H3,H5 | doc-ref |  |  |  |  | default | custom | low |
| AR-STRUCT-TEMPORAL-ROLLING | H1 | doc-ref |  |  |  |  | default | import | low |
| AR-STRUCT-TEMPORAL-SCOPE | H1 | doc-ref |  |  |  |  | default | custom | low |
| AR-Q3-CHART-NO-DUCKDB | Q3,A3 | imports | Y |  |  |  | default | import | medium |
| AR-Q4-ALIGNMENT-HANDLER | Q4 | doc-ref |  |  |  |  | default | custom | low |

### responsibility-separation (36 rules)

| ruleId | principleRefs | bindingKind | OI | OCS | CE | CI | ruleClass | detection | moveRisk |
|---|---|---|---|---|---|---|---|---|---|
| AR-G5-HOOK-MEMO | G5,C8 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-G5-HOOK-STATE | G5,C8 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-G5-HOOK-LINES | G5 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-G6-COMPONENT | G6 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-G5-DOMAIN-LINES | G5 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-G5-INFRA-LINES | G5 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-G5-USECASE-LINES | G5 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-C6-FACADE | C6 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-RESP-STORE-COUPLING | A3,C1 | doc-ref |  |  |  |  | default | custom | low |
| AR-RESP-MODULE-STATE | C1,G8 | doc-ref |  |  |  |  | default | custom | low |
| AR-RESP-HOOK-COMPLEXITY | C1,C8,G5 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-RESP-FEATURE-COMPLEXITY | C1,G5 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-RESP-EXPORT-DENSITY | C1,C8 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-RESP-NORMALIZATION | C1,G8 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-RESP-FALLBACK-SPREAD | C1,G8 | doc-ref |  |  |  |  | heuristic | regex | low |
| AR-C9-HONEST-UNCLASSIFIED | C9 | doc-ref |  |  |  |  | heuristic | custom | low |
| AR-G7-CACHE-BODY | G7 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-SELECTION-GUIDE | C8 | example |  |  | Y |  | heuristic | custom | low |
| AR-TAG-CHART-VIEW | C1,C8,C4,F7 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-CHART-OPTION | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-CALCULATION | A2,C2 | doc-ref |  |  |  |  | heuristic | must-not-coexist | low |
| AR-TAG-TRANSFORM | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-STATE-MACHINE | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-QUERY-PLAN | H1,C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-QUERY-EXEC | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-WIDGET | C1,H6 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-PAGE | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-FORM | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-LAYOUT | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-ORCHESTRATION | C6 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-UTILITY | A2 | doc-ref |  |  |  |  | heuristic | must-not-coexist | low |
| AR-TAG-CONTEXT | C1,F6 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-PERSISTENCE | C1 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-ADAPTER | C1,A4 | doc-ref |  |  |  |  | heuristic | count | low |
| AR-TAG-REDUCER | C2 | doc-ref |  |  |  |  | heuristic | must-not-coexist | low |
| AR-TAG-BARREL | F1 | doc-ref |  |  |  |  | heuristic | must-only | low |
