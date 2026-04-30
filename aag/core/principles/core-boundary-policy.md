# AAG Core 境界ポリシー

> AAG を 3 層に分離するための設計原則。
> 全セッションで参照する。変更には人間承認が必要。

## 5 つの設計原則

### 原則 A: Core は再利用可能でなければならない

粗利・売上・客数・PI 値・factorDecomposition など、このアプリに特有の意味は Core に置かない。
Core は別のアプリに持っていっても機能する品質 OS である。

### 原則 B: App Domain は意味を持つが、進行状態を持たない

業務意味、business/analytic の分類、業務定義、契約定義は App Domain に置く。
ただし「今どの Phase か」「次に何をやるか」は置かない。

### 原則 C: Project Overlay は進行を持つが、原則を再定義しない

HANDOFF.md、plan.md、checklist.md、案件固有の health budget は Project Overlay に置く。
ただし思想や原則は Core / App Domain を参照する。再定義しない。

### 原則 D: 意味・運用・検出を分ける

- **意味**: 何を守るか（RuleSemantics）
- **運用**: どう扱うか（RuleGovernance）
- **検出**: どう見つけるか（RuleDetectionSpec）

これらが同一の型に混在しない。

### 原則 E: 具体名は後段へ落とす

readSalesFact、useDataStore、UnifiedWidgetContext、PAGE_REGISTRY のような具体名は Core に置かない。
具体名はアプリ固有の RuleBinding に属する。

## 各層の境界定義

### AAG Core に置くもの

| カテゴリ | 例 |
|---|---|
| フレームワーク構造 | 5 層定義 (目的 / 要件 / 設計 / 実装 / 検証、旧 4 層 = Constitution / Schema / Execution / Operations を §4.1 mapping で参照、Project A で landed)、source-of-truth policy、governance evolution |
| スキーマ型定義 | RuleSemantics, RuleGovernance, RuleDetectionSpec, AagViolation, AagEvidencePack |
| Allowlist 共通型 | AllowlistEntry, AllowlistLifecycle, CoreRetentionReason |
| Health 共通型 | HealthRule, HealthKpi, evaluator, renderer |
| 共通運用 | ルールシステム運用ガイド、allowlist 管理ガイド |

### AAG Core に置かないもの

| カテゴリ | 行き先 |
|---|---|
| 業務値定義書（*-definition.md） | App Domain |
| アプリ固有のルールインスタンス（140 ルール） | App Domain |
| PrincipleId（A1-I4） | App Domain（設計原則体系はアプリ固有） |
| 具体パス、import、codeSignals | App Domain（RuleBinding） |
| BIZ/ANA 契約 | App Domain |
| semanticClass/authorityKind の具体適用 | App Domain |
| HANDOFF, plan, checklist | Project Overlay |
| Health target 値（具体 budget） | Project Overlay |
| 案件固有の allowlist entry | Project Overlay |

## 禁止例（AI 誤配置の防止）

### Core に置かない例

- sales, gross-profit, PI, factorDecomposition（業務値）
- readSalesFact, useDataStore, UnifiedWidgetContext（具体名）
- BIZ-001, ANA-003（契約 ID）
- PrincipleId の具体値（A1, B2, C3 等）
- project の進捗、handoff、current status

### App Domain に置かない例

- current phase、next action、review due today（進行状態）
- health budget（具体しきい値）
- HANDOFF.md、plan.md、checklist.md

### Project Overlay に置かない例

- AAG 原則の再定義
- semanticClass の意味変更
- 共通 schema の再定義
- CoreRetentionReason の追加

## 変更条件

この境界ポリシーの変更は人間承認が必要。
「邪魔だから」は理由にならない。「別の仕組みで防がれるようになった」は理由になる。
