# AAG Layer Map — ファイル別 5 層マッピング

> **位置付け**: AAG architecture pattern の **Layer 2 reference doc**。`architecture.md` (5 層構造定義) に articulate された 5 層 (目的 / 要件 / 設計 / 実装 / 検証) に既存全主要 AAG アーティファクトを mapping する **棚卸し doc**。
>
> **役割**: 既存 file が「どの層 / どの 5 縦スライスに住むか」を articulate。新規 doc / 実装 / guard 追加時の **配置 reference** として運用。
>
> **drill-down pointer**:
> - 上位 (back-pointer): [`architecture.md`](./architecture.md) (5 層構造定義 + 5 縦スライス articulate)
> - 下位 (drill-down): 各 file 自身 (本 doc 内 table から link)
>
> **5 層位置付け** (本 doc 自身): Layer 2 (設計 reference)
>
> **§1.5 archive 前 mapping 義務**: 旧 `references/99-archive/aag-5-layer-map.md` (旧 4 層 マッピング、Project A Phase 5.1 で archive 移管済) の archive 前提は本 doc が新 5 層 マッピングに extend 済 (= 旧 → 新 transformation を §6 に articulate)。
>
> **件数を書かない原則**: 件数 (`N rule` / `N file` / `N guard`) は **generated section に寄せる** (`AAG-REQ-NO-DATE-RITUAL` と同じ「現在値を prose に書かない」原則、`docStaticNumberGuard` 適用)。本 doc は file path + 役割のみ articulate、件数は `references/04-tracking/generated/architecture-health.md` 参照。

## §1 Layer 0 (目的)

Layer 0 は AAG 全体で 1 つ、`meta.md` §1 で articulate。本 layer に属する file は次のみ:

| file | 役割 |
|---|---|
| [`meta.md`](./meta.md) §1 | AAG の why の正本 (機械検証不可、人間判断のみ) |

## §2 Layer 1 (要件)

Layer 1 は AAG が satisfy すべき不変条件 + 禁則 (12 AAG-REQ-*)。本 layer に属する file:

| file | 役割 |
|---|---|
| [`meta.md`](./meta.md) §2 | 12 AAG-REQ-* 要件定義 (不変条件 7 + 禁則 5) |
| [`meta.md`](./meta.md) §4 | 達成判定総括 (Layer 4 検証の出力) |

## §3 Layer 2 (設計)

Layer 2 は要件を realize する設計 doc 群。**5 縦スライス** で責務を articulate。

### §3.1 縦スライス: layer-boundary

| file | 役割 |
|---|---|
| [`strategy.md`](./strategy.md) | 戦略マスター + 文化論 + 意図的に残す弱さ (Layer 0+1 articulate) |
| [`architecture.md`](./architecture.md) | 5 層構造定義 + 旧 4 層 → 新 5 層 mapping (Layer 1+2) |

### §3.2 縦スライス: canonicalization

| file | 役割 |
|---|---|
| `references/01-foundation/canonicalization-principles.md` | 正本化原則 P1-P7 |
| `references/01-foundation/canonical-value-ownership.md` | 正本値所有権台帳 |
| `references/01-foundation/canonical-input-sets.md` | 正本入力セット |
| `references/01-foundation/calculation-canonicalization-map.md` | 計算分類マップ |
| `references/01-foundation/sales-definition.md` 等 業務値定義書 | sales / discount / customer / gross-profit ほか各業務値の正本 articulate |

### §3.3 縦スライス: query-runtime

| file | 役割 |
|---|---|
| `references/01-foundation/engine-boundary-policy.md` | 3 エンジン境界 (Authoritative / Application / Exploration) |
| `references/01-foundation/engine-responsibility.md` | JS vs DuckDB 責務 |
| `references/01-foundation/data-flow.md` | 4 段階データフロー |
| `references/01-foundation/data-pipeline-integrity.md` | パイプライン整合性 |
| `references/01-foundation/temporal-scope-semantics.md` | 期間スコープ |

### §3.4 縦スライス: responsibility-separation

| file | 役割 |
|---|---|
| `references/01-foundation/design-principles.md` | 9 カテゴリ設計原則 (A-I + Q) |
| `references/01-foundation/safe-performance-principles.md` | H カテゴリ詳細 |
| `references/01-foundation/critical-path-safety-map.md` | Safety Tier 分類 |
| `references/01-foundation/semantic-classification-policy.md` | 意味分類ポリシー |
| `references/01-foundation/responsibility-taxonomy-schema.md` | 責務タグ schema (v2) |
| `references/01-foundation/modular-monolith-evolution.md` | モジュラーモノリス進化 |

### §3.5 縦スライス: governance-ops

| file | 役割 |
|---|---|
| [`evolution.md`](./evolution.md) | 進化動学 (Discovery / Accumulation / Evaluation) |
| [`operational-classification.md`](./operational-classification.md) | now / debt / review 運用区分 |
| [`source-of-truth.md`](./source-of-truth.md) | 正本 / 派生物 / 運用物 区分ポリシー |
| [`display-rule-registry.md`](./display-rule-registry.md) | DFR-NNN registry (Project C で landing) |

### §3.6 縦スライス: schema (拡張、Layer 2 と Layer 3 の境界)

> AAG rule の **宣言的仕様** (what / why / detection type) は Layer 2 設計、**手続的検出実装** は Layer 3 実装。

| file | 役割 |
|---|---|
| `app/src/test/architectureRules.ts` | Consumer facade (rule 宣言的仕様の入口、merged.ts 経由で base-rules.ts に解決) |
| `app/src/test/aag-core-types.ts` | Core 型定義 (`SemanticTraceBinding<T>` 型 family、Project B Phase 1 で追加) |
| `app/src/test/architectureRules/types.ts` | RuleBinding 型定義 (Project B Phase 1 で `canonicalDocRef` + `metaRequirementRefs` 追加) |
| `docs/contracts/principles.json` | 原則メタデータ |
| `docs/contracts/doc-registry.json` | 文書レジストリ |
| `docs/contracts/project-metadata.json` | プロジェクトメタデータ |
| `docs/contracts/test-contract.json` | CLAUDE.md test-contract |

## §4 Layer 3 (実装)

Layer 3 は設計を機械検証する実装。

### §4.1 AR-rule 物理正本 + 手続的検出

| file | 役割 |
|---|---|
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | BaseRule 物理正本 (AR-rule 配列 + binding field) |
| `app/src/test/architectureRules/merged.ts` | derived consumer (consumer は merged.ts 経由のみアクセス) |
| `app/src/test/architectureRules/defaults.ts` | execution overlay (fixNow / executionPlan / lifecyclePolicy 限定、semantic binding は持たせない) |
| `app/src/test/guards/*.test.ts` | 個別 guard 実装 (`*Guard.test.ts` 群) |
| `app/src/test/audits/*.test.ts` | アーキテクチャ監査 |
| `app/src/test/observation/*.test.ts` | WASM 観測テスト |
| `app/src/test/semanticViews.ts` | Derived View 生成 (master → 自動導出) |

### §4.2 health 収集 + 自動導出

| file | 役割 |
|---|---|
| `tools/architecture-health/` | Health 収集・評価・レンダリング |
| `tools/git-hooks/` | pre-commit / pre-push hook |
| `tools/aag-render-cli.ts` | AAG Response CLI |
| `references/04-tracking/generated/` | 生成済みレポート (派生物、手編集禁止) |

### §4.3 allowlist (例外管理)

| file | 役割 |
|---|---|
| `app/src/test/allowlists/types.ts` | AllowlistEntry 型定義 |
| `app/src/test/allowlists/architecture.ts` | 層境界ルール例外 |
| `app/src/test/allowlists/complexity.ts` | 行数・useMemo 制限例外 |
| `app/src/test/allowlists/duckdb.ts` | DuckDB hook 例外 |
| `app/src/test/allowlists/size.ts` | ファイルサイズ例外 |
| `app/src/test/allowlists/performance.ts` | パフォーマンス制限例外 |
| `app/src/test/allowlists/migration.ts` | 比較移行例外 |
| `app/src/test/allowlists/misc.ts` | その他例外 |

## §5 Layer 4 (検証)

Layer 4 は外部監査視点で AAG 全体を audit。詳細は [`meta.md`](./meta.md) §3.2 audit framework。

### §5.1 meta-guard (archived `aag-rule-schema-meta-guard` で landing)

| file | 役割 | sub-audit |
|---|---|---|
| `app/src/test/guards/canonicalDocRefIntegrityGuard.test.ts` | forward direction 検証 (実装 → 設計 doc) | 4.2 方向監査 |
| `app/src/test/guards/canonicalDocBackLinkGuard.test.ts` | reverse direction 検証 (設計 → 実装 逆引き) | 4.2 方向監査 |
| `app/src/test/guards/semanticArticulationQualityGuard.test.ts` | 意味品質 hard fail (禁止 keyword + 文字数 + 重複 + status + path 実在) | 4.4 完備性監査 |
| `app/src/test/guards/statusIntegrityGuard.test.ts` | status 整合性 (`pending` / `not-applicable` / `bound`) | 4.4 完備性監査 |
| `app/src/test/guards/selfHostingGuard.test.ts` | self-reference closure (AAG-REQ-SELF-HOSTING) + orphan AAG-REQ baseline=6 ratchet-down | 4.4 完備性監査 |

### §5.2 既存 Layer 4 検証

| file | 役割 | sub-audit |
|---|---|---|
| `tools/architecture-health/` (health-rules.ts / certificate / hard gate) | KPI 収集 + 評価 + 判定 | 4.5 機能性監査 |
| `app/src/test/guards/docStaticNumberGuard.test.ts` | 静的数値の prose 出現禁止 | 4.5 機能性監査 |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | obligation map (path → 更新義務) | 4.3 波及監査 |
| `app/src/test/guards/responsibilitySeparationGuard.test.ts` (純度判定 part) | 責務純度 audit | 4.4 完備性監査 |
| Discovery Review | 意味品質補完 (人間 review) | 4.4 完備性監査 |

### §5.3 follow-up sub-audit (別 project candidate)

selfHostingGuard は §5.1 で landing 済 (12/12 AAG-REQ milestone 到達)。残 sub-audit は別 project candidate:

| sub-audit | 想定 implementing rule | 状態 |
|---|---|---|
| 4.1 境界監査 (Boundary Audit) | `layerBoundaryGuard.test.ts` (既存、本 sub-audit に整合化) | follow-up project candidate |
| 4.3 波及監査 (Impact Audit) | obligation-collector.ts の rule 化 | follow-up project candidate |
| 4.5 機能性監査 (Functional Audit) | health-rules.ts の rule 化 + claim vs actual 照合 guard | follow-up project candidate |
| metaRequirementBindingGuard | metaRequirementRefs.refs[].requirementId が aag/meta.md §2 の `AAG-REQ-*` ID 実在検証 + orphan coverage 検証 | 部分達成 (selfHostingGuard.test.ts Test 3 が orphan baseline=6 ratchet-down で articulate)。独立 guard 化は follow-up project candidate |

## §6 旧 4 層マッピング → 新 5 層マッピング 変換 (`§1.5 archive 前 mapping 義務`)

旧 `references/99-archive/aag-5-layer-map.md` (旧 4 層 マッピング = Constitution / Schema / Execution / Operations、Phase 5.1 で archive 移管済) から新 5 層への変換:

| 旧 4 層 | 新 5 層 | 変換ルール |
|---|---|---|
| Constitution (思想 + 用語 + 不可侵原則 + 設計原則 + 業務値定義) | Layer 0 + Layer 1 + Layer 2 (canonicalization + responsibility-separation スライス) | 思想 / 用語 → Layer 0、不可侵原則 → Layer 1、設計原則 + 業務値定義 → Layer 2 |
| Schema (型契約 + 宣言的 rule 仕様 + レジストリ) | Layer 2 schema スライス + Layer 3 (型定義 + 物理正本) | 宣言的 rule 仕様 → Layer 2、型定義 + 物理正本 → Layer 3 |
| Execution (検出実装 + health 収集 + 自動導出) | Layer 3 (統合) | 全て Layer 3 に統合 |
| Operations 4A (System Operations) | Layer 4 検証 + System Operations (別 axis) | 検証 (audit) は Layer 4、運用手順 (promote-ceremony / guard-consolidation 等) は別 axis |
| Operations 4B (Project Operations) | Project Operations (別 axis、`projects/` 配下) | 案件固有運用は AAG layer 外 (orthogonal axis) |

詳細 mapping rationale は [`architecture.md`](./architecture.md) §4.3 参照。

## §7 関連 doc

| doc | 役割 |
|---|---|
| [`architecture.md`](./architecture.md) | 5 層構造定義 + 5 縦スライス articulate (本 doc の上位) |
| [`meta.md`](./meta.md) | AAG Meta charter |
| [`source-of-truth.md`](./source-of-truth.md) | 正本 / 派生物 / 運用物 区分ポリシー (本 doc の §3-§4 の正本判定軸) |
| [`operational-classification.md`](./operational-classification.md) | now / debt / review 運用区分 (orthogonal axis) |
| [`README.md`](./README.md) | aag/ ディレクトリ index |
| `references/04-tracking/generated/architecture-health.md` | 件数 / 現在値の正本 (本 doc では articulate しない) |
| `projects/completed/aag-core-doc-refactor/plan.md` | 本 doc を landing する project の plan |
