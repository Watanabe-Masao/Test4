# AAG Operational Classification — now / debt / review 運用区分

> **位置付け**: AAG architecture pattern の **Layer 2 reference doc** (governance-ops 縦スライス)。AR-rule (architecture rule) を **運用 axis** で 3 分類し、各分類の運用方針を articulate。
>
> **役割**: AR-rule を「即修正 (now) / 構造負債 (debt) / 観測 (review)」に分類し、各分類の運用方針 + ratchet-down 戦略を articulate。`evolution.md` (進化動学) の Accumulation phase で蓄積された rule を本 doc の運用区分に従って運用する mechanism。
>
> **drill-down pointer**:
> - 上位 (back-pointer): [`architecture.md`](./architecture.md) (5 層構造定義) / [`evolution.md`](./evolution.md) (Accumulation 後の rule 運用)
> - 下位 (drill-down): `references/03-guides/architecture-rule-system.md` (AR-rule 運用ガイド) / `references/03-guides/allowlist-management.md` (allowlist 管理手順) / `app-domain/gross-profit/rule-catalog/base-rules.ts` (BaseRule 物理正本)
>
> **5 層位置付け** (本 doc 自身): Layer 2 (設計 reference、governance-ops スライス、orthogonal axis = 運用区分)
>
> **§1.5 archive 前 mapping 義務**: 旧 `aag-operational-classification.md` の archive 前提は本 doc に「旧 → 新 mapping」が landed 済 (= 本 doc §6)。
>
> **件数を書かない原則**: 各分類の件数 (`N rule` / `N invariant` / `N default`) は **generated section に寄せる** (`docStaticNumberGuard` 適用)。本 doc では rule ID + ruleClass + what (短文) のみ articulate、件数は `references/02-status/generated/architecture-health.md` 参照。

## §1 3 分類の運用方針

| 区分 | 運用方針 | 対象の性質 |
|---|---|---|
| **now** (即修正) | hard gate。違反したら今の diff で直す | 局所修正で閉じる。正否が明確。放置すると害が増える |
| **debt** (構造負債) | 新規悪化は止める。既存分は allowlist + ratchet-down で計画的に返す | 解消に設計変更を伴う。波及が大きい。allowlist lifecycle で管理 |
| **review** (観測) | 即 fail にしない。Discovery Review の入力とする | コードではなく AAG 制度の健全性を示す兆候 |

各分類は **orthogonal axis** で、Layer 2 設計 doc の 5 層位置付けとは別軸。同一 rule が「Layer 3 実装」かつ「now 区分」のように両 axis に articulate される。

## §2 now (即修正)

> **方針**: hard gate。違反したら今の diff で直す。

### §2.1 層境界・依存方向 (invariant)

壊すと設計の根幹が崩れる。例外なし。

| ruleId | ruleClass | what |
|---|---|---|
| AR-A1-DOMAIN | invariant | domain/ は外部層に依存しない |
| AR-A1-APP-INFRA | invariant | application/ は infrastructure/ に直接依存しない |
| AR-A1-APP-PRES | invariant | application/ は presentation/ に依存しない |
| AR-A1-PRES-INFRA | invariant | presentation/ は infrastructure/ に直接依存しない |
| AR-A1-PRES-USECASE | invariant | presentation/ は application/usecases/ を直接 import しない |
| AR-A1-INFRA-APP | invariant | infrastructure/ は application/ に依存しない |
| AR-A1-INFRA-PRES | invariant | infrastructure/ は presentation/ に依存しない |

### §2.2 明確な禁止パターン

「今この diff で直せる」性質。放置する合理性が薄い。

| ruleId | ruleClass | what |
|---|---|---|
| AR-G3-SUPPRESS | default | コンパイラ警告を黙殺しない |
| AR-E4-TRUTHINESS | default | 数値フィールドの truthiness チェック禁止 |
| AR-C5-SELECTOR | default | Zustand store はセレクタ付きで呼ぶ |
| AR-G2-EMPTY-CATCH | default | 空の catch ブロック禁止 |
| AR-G4-INTERNAL | default | hooks/ に @internal export を作らない |
| AR-002 | invariant | presentation → wasmEngine 直接 import 禁止 |
| AR-004 | default | 新規 @deprecated wrapper 禁止 |
| AR-C3-STORE | default | store action 内に業務ロジック禁止 |

### §2.3 正本経路・唯一経路 (主に invariant)

「今直さないと別経路が増える」。放置コストが日々増加。

| ruleId | ruleClass | what |
|---|---|---|
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
| AR-STRUCT-PURITY | invariant | domain/ は純粋 (副作用なし) |
| AR-STRUCT-TOPOLOGY | invariant | src/ 直下は承認済みディレクトリのみ |

### §2.4 その他即修正

| ruleId | ruleClass | what |
|---|---|---|
| AR-001 | invariant | bridge に dual-run コード再導入禁止 |
| AR-C7-NO-DUAL-API | default | 同義 API 併存禁止 |

## §3 debt (構造負債)

> **方針**: 新規悪化は gate で止める。既存分は allowlist + ratchet-down で計画的に返す。

### §3.1 複雑性・サイズ上限 (heuristic)

違反の修正が局所で閉じない場合が多い。allowlist で structural / active-debt 管理。

代表 rule: `AR-G5-FILE-LINES` / `AR-G6-FUNCTION-LINES` / `AR-G7-CACHE-SIZE` / `AR-C5-USEMEMO` / `AR-C8-SINGLE-SENTENCE` ほか。

詳細 inventory は `app-domain/gross-profit/rule-catalog/base-rules.ts` + `references/02-status/generated/architecture-health.md` 参照 (件数は generated section)。

### §3.2 責務分離 (heuristic / default)

責務混在の解消に設計変更を伴う。

代表 rule: `AR-C1-SINGLE-RESPONSIBILITY` / `AR-C2-PURE-AXIS` / `AR-G8-RESPONSIBILITY` / `AR-RESP-* (taxonomy v2)` ほか。

### §3.3 正本化負債 (default)

calculation canonicalization の進行中分。

代表 rule: `AR-CANON-MASTER-REGISTRY` / `AR-CANON-DERIVED-VIEWS` / `AR-CANON-OLD-PATH-IMPORT` ほか。

### §3.4 移行中の dual-run / canonical / candidate (heuristic)

漸次移行で発生する負債。

代表 rule: `AR-MIGRATION-DUAL-RUN-EXIT` / `AR-MIGRATION-COMPARISON-SCOPE` / `AR-CANDIDATE-AUTHORITATIVE` ほか。

## §4 review (観測)

> **方針**: 即 fail にしない。Discovery Review の入力とする。

### §4.1 制度健全性指標 (review)

AAG 制度自体の健全性を示す兆候。コードの問題ではないため即 fail させず、Discovery Review で評価。

代表 rule: `AR-OBSERVATION-EXAMPLE` / `AR-RULE-DEPRECATED-LINGER` / `AR-ALLOWLIST-RETENTION-LONGEVITY` ほか。

詳細は `references/03-guides/architecture-rule-system.md` の review section 参照。

## §5 ruleClass と運用区分の関係

ruleClass (`invariant` / `default` / `heuristic` / `experimental`) は **意味分類** で、運用区分 (`now` / `debt` / `review`) は **運用方針**。両 axis は orthogonal:

| ruleClass | 性質 | 主に該当する運用区分 |
|---|---|---|
| **invariant** | 「破ると設計が壊れる」絶対不変 | 主に now (例外: 移行中の `AR-MIGRATION-*` は debt) |
| **default** | 通常守るべき pattern | now or debt (即修正可能なら now、波及大なら debt) |
| **heuristic** | 経験則ベース | 主に debt (allowlist で管理) |
| **experimental** | 検証中 | 主に review (`sunsetCondition` 状態満足で deprecated 化) |

ruleClass の articulate は `base-rules.ts` の各 rule entry の `ruleClass` field、運用区分は `defaults.ts` execution overlay の `lifecyclePolicy` field で articulate (二重正本回避、本 doc では運用方針のみ articulate、具体 rule の lifecyclePolicy は overlay を正本)。

## §6 旧 運用区分 → 新 運用区分 mapping (`§1.5 archive 前 mapping 義務`)

旧 `aag-operational-classification.md` (旧 84 rule articulate) → 新 doc の運用区分は **構造変更なし** (now / debt / review の 3 分類は維持)。差分:

| 変更点 | 内容 |
|---|---|
| **rule 件数の articulate を削除** | 旧 doc では「即修正 (31 rule)」「構造負債 (33 rule)」「観測 (XX rule)」のように prose に件数を articulate していた → 本 doc では件数を generated section に寄せる (`docStaticNumberGuard` 適用) |
| **5 層位置付けの articulate 追加** | 本 doc は Layer 2 (governance-ops スライス、orthogonal axis = 運用区分) として明示位置付け |
| **drill-down pointer の articulate 追加** | 本 doc 冒頭に上位 / 下位 pointer を articulate |
| **`AAG-REQ-*` 要件との整合性 articulate 追加** | now (即修正) は `AAG-REQ-RATCHET-DOWN` の即時 fail 経路、debt (構造負債) は `AAG-REQ-RATCHET-DOWN` の漸次返済経路、review (観測) は `AAG-REQ-NO-PERFECTIONISM` の意図的に残す弱さ経路、と articulate 整合 |
| **AAG 5.2.0 (新 5 層) との整合 articulate 追加** | 旧 4 層 (Constitution / Schema / Execution / Operations) からの mapping を含意 (旧 rule の Operations 層 = 新 5 層では Layer 4 検証 + 別 axis = System Operations) |

## §7 非目的 (Non-goals)

本 doc は次を **articulate しない** (= 別 doc の責務):

- **5 層構造定義** → [`architecture.md`](./architecture.md)
- **戦略 / 文化論** → [`strategy.md`](./strategy.md)
- **進化動学 (Discovery / Accumulation / Evaluation)** → [`evolution.md`](./evolution.md)
- **ファイル別 5 層マッピング** → [`layer-map.md`](./layer-map.md)
- **正本 / 派生物 / 運用物 区分** → [`source-of-truth.md`](./source-of-truth.md)
- **個別 rule の articulate** (検出 logic / pattern / migrationRecipe / lifecyclePolicy) → `app-domain/gross-profit/rule-catalog/base-rules.ts` + `app/src/test/architectureRules/defaults.ts`
- **rule 件数 / 現在値** → `references/02-status/generated/architecture-health.md`

## §8 関連 doc

| doc | 役割 |
|---|---|
| [`architecture.md`](./architecture.md) | 5 層構造定義 (本 doc の上位) |
| [`evolution.md`](./evolution.md) | 進化動学 (本 doc の上位、Accumulation 後の rule 運用) |
| [`source-of-truth.md`](./source-of-truth.md) | 正本 / 派生物 / 運用物 区分 (orthogonal axis) |
| [`layer-map.md`](./layer-map.md) | ファイル別 5 層マッピング |
| [`README.md`](./README.md) | aag/ ディレクトリ index |
| `references/03-guides/architecture-rule-system.md` | AR-rule 運用ガイド |
| `references/03-guides/allowlist-management.md` | allowlist 管理手順 |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 (個別 rule の articulate) |
| `app/src/test/architectureRules/defaults.ts` | execution overlay (lifecyclePolicy 正本) |
| `projects/aag-core-doc-refactor/plan.md` | 本 doc を landing する project の plan |
