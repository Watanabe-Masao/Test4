# App Domain — 仕入荒利管理システム（shiire-arari）

> このアプリ固有の意味空間。業務値の定義、契約、ルールカタログ、バインディング。
> AAG Core のフレームワークをこのアプリの文脈で適用する。

## このディレクトリの役割

App Domain Pack は、粗利管理ツール固有の意味定義・業務定義・具体ルール群を管理する。
AAG Core の共通フレームワーク上に、このアプリの「意味」を載せる層。

## 3 層モデルにおける位置づけ

| 層 | 役割 | 状態 |
|---|---|---|
| AAG Core | 共通原則、schema、共通 guard、共通運用 | 恒久。アプリに依存しない |
| **App Domain**（本層）| アプリ固有の意味定義、契約、ルールカタログ | 恒久。アプリに依存、案件に依存しない |
| Project Overlay | 案件ごとの handoff / plan / checklist / health budget | 一時的。案件ごとに差し替わる |

## App Domain に置くもの

- 業務値定義書（sales, discount, customer, gross-profit, purchase-cost, PI, customer-gap 等）
- semanticClass / authorityKind のアプリ適用
- 契約カタログ（BIZ-001〜013 / ANA-001〜009）
- アプリ固有ルールカタログ（140 ルールの具体定義）
- アプリ固有バインディング（imports, codeSignals, path patterns, 具体 hook / bridge / readModel 名）
- アプリ固有 allowlist reasons（display-only, no-readmodels）
- アプリ固有不変条件カタログ

## App Domain に置かないもの

- AAG フレームワーク原則 → AAG Core
- ルール型定義（RuleSemantics, RuleGovernance 等）→ AAG Core
- 案件進行状態（HANDOFF, plan, checklist）→ Project Overlay
- Health budget（具体 target 値）→ Project Overlay

## 読み順

1. 本ファイル
2. `app-domain/gross-profit/principles/app-domain-boundary-policy.md` — 境界ポリシー
3. 必要に応じて業務値定義書（現在は `references/01-principles/*-definition.md` に配置）

## 関連ファイル（現在の配置）

| App Domain 資産 | 現在の配置 | 備考 |
|---|---|---|
| 業務値定義書（12 ファイル） | `references/01-principles/*-definition.md` | 将来 App Domain 移動候補 |
| 意味分類ポリシー | `references/01-principles/semantic-classification-policy.md` | Mixed（概念=Core、具体適用=App） |
| 契約定義ポリシー | `references/03-guides/contract-definition-policy.md` | App Domain |
| ルールインスタンス | `app/src/test/architectureRules.ts` の ARCHITECTURE_RULES | App Domain |
| カテゴリマップ | `app/src/test/guardCategoryMap.ts` | App Domain |
| Master Registry | `app/src/test/calculationCanonRegistry.ts` | App Domain |
| 不変条件カタログ | `references/03-guides/invariant-catalog.md` | App Domain |
