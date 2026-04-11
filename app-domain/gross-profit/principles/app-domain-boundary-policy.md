# App Domain 境界ポリシー — 仕入荒利管理システム

> App Domain はこのアプリの意味空間を定義する。
> Core の共通フレームワークと Project Overlay の案件状態の間に位置する。

## 原則

### 意味は持つが、進行状態は持たない

App Domain には業務意味、分類、契約、ルールインスタンスを置く。
「今どの Phase か」「次に何をやるか」「どこまで進んだか」は置かない。

### Core の原則を再定義しない

AAG Core の 5 原則（A-E）はそのまま受け入れる。
App Domain は Core の枠組みの中で意味を埋める。

### 具体名はここに置く

readSalesFact、useDataStore、UnifiedWidgetContext、PAGE_REGISTRY 等の具体名は
App Domain のバインディングとして管理する。Core ではなくここ。

## App Domain の構成要素

### 業務値定義

このアプリが扱う業務上の正本:
- 売上（sales）、値引き（discount）、客数（customer）
- 仕入原価（purchase-cost）、粗利（gross-profit）
- PI 値（pi-value）、客数 GAP（customer-gap）
- 予算（budget）、KPI、自由期間分析
- 要因分解（factorDecomposition = business / analytic_decomposition）

### 意味分類の適用

Core が定義する分類フレームワーク（semanticClass, authorityKind, runtimeStatus）を
このアプリの計算群に具体適用:
- business-authoritative: 粗利計算、予算分析、要因分解等
- analytic-authoritative: 移動平均、z-score、感度分析等
- candidate-authoritative: 昇格候補

### 契約カタログ

- BIZ-001〜013: Business Semantic Core 契約
- ANA-001〜009: Analytic Kernel 契約

### ルールカタログ

140 ルールの具体定義（ARCHITECTURE_RULES）。
型（RuleSemantics 等）は Core、具体値は App Domain。

### アプリ固有 allowlist reasons

- `display-only`: 表示用途のみ。分析入力ではない
- `no-readmodels`: 正本（readModels）へのアクセス経路が未配線
