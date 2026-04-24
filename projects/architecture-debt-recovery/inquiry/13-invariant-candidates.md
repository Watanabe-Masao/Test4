# inquiry/13 — 新規不変条件 + guard 設計 候補

> 役割: Phase 3 inquiry 成果物 #2。inquiry/12 で提示した 8 原則候補（J1-J8）を**機械検出**するための不変条件 + guard 設計の前書きを提示する。
>
> 本ファイルは**候補提示**であり、`references/03-guides/invariant-catalog.md` / `app/src/test/guards/` への登録ではない（plan.md §2 不可侵原則 #8 / #9 遵守）。
>
> 各候補に以下を記述:
> - 対応原則候補（J1-J8）
> - 不変条件の形式（「常に X = Y が成り立つ」「X が存在するとき Y も存在する」等）
> - guard の粗設計（detection.type / regex / AST 走査方法 / baseline）
> - ratchet-down or fixed のどちらで管理するか
>
> 本ファイルは immutable。Phase 4 以降で追加情報が判明しても書き換えず、`13a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `c9c4890`（inquiry/12 push 直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/12`（8 原則候補 J1-J8）、既存 guard（39 件）、`architectureRules.ts` の detection.type 8 種 |

## 候補一覧

8 原則候補に対して 12 不変条件 + guard を提示（複数の不変条件が 1 原則に属する場合あり）:

| ID | 不変条件 | 対応原則 | 管理方式 |
|---|---|---|---|
| INV-J1-A | `*Handler` export は `application/readModels/<name>/` のみに置かれる | J1 | ratchet-down → fixed |
| INV-J1-B | pure fn は `domain/calculations/` / `features/<slice>/application/pure/` のみに置かれる | J1 | ratchet-down |
| INV-J2-A | isVisible predicate で null check を行う widget 数 ≤ 17（現行 baseline） | J2 | ratchet-down → 0 |
| INV-J2-B | useMemo 内の行数 ≤ 20 | J2 | ratchet-down |
| INV-J2-C | 1 widget の直接子 component 数 ≤ 5 | J2 | ratchet-down |
| INV-J3-A | `@deprecated` comment には `@expiresAt` + `@sunsetCondition` が併記される | J3 | fixed（0 違反） |
| INV-J4-A | `UnifiedWidgetContext` 内の page-local optional field 数 = 0 | J4 / J5 | ratchet-down → 0 |
| INV-J4-B | widget registry ごとに使用する `WidgetDef` 型が一意 | J4 | fixed（0 違反） |
| INV-J6-A | 同名 `interface` / `type alias` の独立定義 file 数 ≤ 1（例外 allowlist） | J6 | ratchet-down → 1 |
| INV-J7-A | byte-identical な `.tsx` / `.ts` file ペア数 = 0 | J7 | ratchet-down → 0 |
| INV-J7-B | 本番到達不能な `.tsx` / `.ts` file 数（orphan） ≤ 3（現行 baseline） | J7 | ratchet-down → 0 |
| INV-J8-A | `reviewPolicy` 未設定の Architecture Rule 数 = 0 | J8 | ratchet-down → 0 |

---

## INV-J1-A. Handler 配置の統一

- **不変条件**: ファイル中で `export const *Handler =` または `export function *Handler(` を含む file は、path が `app/src/application/readModels/<name>/` 配下であること
- **対応原則**: J1（配置規約の成文化）
- **detection.type**: `custom`（ファイル内 export 名 + path matching）
- **guard 粗設計**: `app/src/**/*.ts` を glob、`export.*Handler` 正規表現 match → path 接頭辞が `app/src/application/readModels/` かを検証
- **想定例外**: 無し（現 1 違反 = `application/queries/discountFactHandler.ts` を移設対象とする前提）
- **baseline**: 初期 baseline = 1（discountFactHandler）→ ratchet-down → 0
- **管理方式**: ratchet-down → fixed（0 到達後）
- **sunsetCondition**: J1 の `sunsetCondition` に従う

## INV-J1-B. pure fn 配置の制約

- **不変条件**: 複雑度 N（例: 行数 ≥ 10 + 非自明 arithmetic/aggregation）を満たす pure fn の定義 path は `app/src/domain/calculations/` / `app/src/features/<slice>/application/pure/` のいずれかであること
- **対応原則**: J1
- **detection.type**: `custom`（pure fn 判定は heuristic、行数 + import 不使用 + side effect 不在）
- **guard 粗設計**: `ts-morph` 等 AST 解析で arrow function / function declaration を走査、pure 判定 heuristic、allowlist 外 path に存在する件数を測定
- **baseline**: Phase 1 inquiry/05 で 95 候補検出 → baseline = 95 → ratchet-down
- **管理方式**: ratchet-down（単調減少）
- **sunsetCondition**: 95 → 0（または安定 rare exception 5 件程度）到達で完了

## INV-J2-A. isVisible null check の総量

- **不変条件**: registry 定義行で `isVisible: (ctx) => ctx.X != null` 形式の null check predicate を持つ widget 数 ≤ 17
- **対応原則**: J2（近道禁止）
- **detection.type**: `regex` + `count`
- **guard 粗設計**: 10 registry `.tsx` / `.tsx` を走査、`isVisible:.*!= null` / `isVisible:.*?.*!=` 正規表現 match
- **baseline**: Phase 1 inquiry/04 §D で 17 件確認 → baseline = 17 → ratchet-down → 0
- **管理方式**: ratchet-down（J4 達成時に自然に 0 へ）
- **sunsetCondition**: J4 達成 + null check が不要になる

## INV-J2-B. useMemo 内行数上限

- **不変条件**: 各 `useMemo(() => { ... }, [...])` block 内部の行数 ≤ 20
- **対応原則**: J2
- **detection.type**: `custom`（AST 走査で useMemo 呼び出しの callback body 行数計測）
- **guard 粗設計**: `ts-morph` で `useMemo` / `useCallback` の第 1 引数 arrow function の statement 数 → 行数換算
- **baseline**: inquiry/05 で最大 69 行検出 → baseline = 69 → ratchet-down → 20（目標上限）
- **管理方式**: ratchet-down（超過 useMemo の段階的抽出）
- **sunsetCondition**: 20 行超過 useMemo が 0 件で 6 ヶ月継続

## INV-J2-C. widget の直接子数上限

- **不変条件**: 1 `WidgetDef.render` から import される直接子 component 数 ≤ 5
- **対応原則**: J2
- **detection.type**: `custom`（registry `.tsx` の import 解析 + render 関数内で使用される JSX component の列挙）
- **guard 粗設計**: registry 10 file を走査、render callback 内で実体化されている component の import 数を計測
- **baseline**: WSS pilot 観察で WID-001 の ConditionSummaryEnhanced ファミリ 12+ が最大 → 複数 widget で 5 超過の可能性 → Phase 1 時点では正確な baseline 未計測 → Phase 6 実装時に initial baseline を fix
- **管理方式**: ratchet-down
- **sunsetCondition**: 全 widget で ≤ 5 が 6 ヶ月継続

## INV-J3-A. @deprecated の metadata 必須

- **不変条件**: ファイル内コメントに `@deprecated` tag が存在するとき、同一コメントブロック内に `@expiresAt <ISO date>` と `@sunsetCondition <text>` が共存する
- **対応原則**: J3（移行完了の全層検証）
- **detection.type**: `regex` + `must-include`
- **guard 粗設計**: `app/src/**/*.{ts,tsx}` を走査、`@deprecated` を含む JSDoc コメントを抽出、同 block 内の `@expiresAt` / `@sunsetCondition` の存在確認
- **baseline**: 初期は 0（そもそも `@deprecated` が Phase 1 観察で検出されていない。付けられた瞬間に必須化）
- **管理方式**: fixed（0 違反）
- **sunsetCondition**: `@deprecated` 運用が確立し、違反が 0 で 6 ヶ月継続

## INV-J4-A. UnifiedWidgetContext の page-local optional 数

- **不変条件**: `app/src/presentation/components/widgets/types.ts` の `UnifiedWidgetContext` interface 内で、以下を検出する optional field 数 = 0:
  - field 名が page 名を接頭辞に持つ（`insight*` / `costDetail*` / `category*` / `reports*` / `daily*`）
  - ソース内コメント `// ── <page 名> 固有 ──` 直下の field
- **対応原則**: J4 / J5
- **detection.type**: `custom`（特定 file + 特定 pattern）
- **guard 粗設計**: 対象 file の AST 走査、`UnifiedWidgetContext` interface の property 列挙、命名 pattern + コメントセクション判定
- **baseline**: Phase 1 inquiry/04 §B-2 で 5 件確認 → baseline = 5 → ratchet-down → 0
- **管理方式**: ratchet-down → fixed（0 到達後）
- **sunsetCondition**: J4 達成 + page-specific ctx 型が各 page に存在

## INV-J4-B. registry × WidgetDef 型の 1:1 対応

- **不変条件**: 10 widget registry（`WIDGETS_KPI` / `WIDGETS_CHART` / `WIDGETS_EXEC` / `WIDGETS_ANALYSIS` / `WIDGETS_DUCKDB` / `DAILY_WIDGETS` / `INSIGHT_WIDGETS` / `CATEGORY_WIDGETS` / `COST_DETAIL_WIDGETS` / `REPORTS_WIDGETS`）ごとに、使用する `WidgetDef` 型（型 A Dashboard-local / 型 B Unified / 将来の page-specific 型）が一意に決まる
- **対応原則**: J4
- **detection.type**: `custom`（registry file の import 解析）
- **guard 粗設計**: 10 registry file の `import type { WidgetDef } from '...'` を抽出、各 registry の import source が単一 file であることを確認
- **baseline**: 現状 fixed = 1:1 対応は既に成立（inquiry/01 §A-4 で確認、各 registry 1 import source のみ）→ baseline = 0 違反
- **管理方式**: fixed
- **sunsetCondition**: page-specific ctx 型への移行（J4）が完了し、本 rule の意味が「registry × context 型の 1:1」に昇格するまで（以降は別 rule に置換）

## INV-J6-A. 同名 interface 並存の制限

- **不変条件**: `app/src/**/*.{ts,tsx}` 全域で、同名 `interface` または `type alias` の独立定義 file 数 ≤ 1（allowlist 例外を除く）
- **対応原則**: J6
- **detection.type**: `custom`（全 file の top-level type 定義列挙 + 重複検出）
- **guard 粗設計**: AST 走査で全 top-level `export interface <Name>` / `export type <Name> =` を収集、同名の複数 file 存在を検出
- **baseline**: Phase 1 inquiry/04 §A で `WidgetDef` 2 件 + `WidgetContext` 潜在 → 初期 baseline 測定は Phase 6 実装時。既知の 1 違反 = `WidgetDef` → baseline = 1
- **管理方式**: ratchet-down → fixed（1 例外以内）
- **sunsetCondition**: `WidgetDef` 並存が解消され、他の重複が 6 ヶ月 0 継続

## INV-J7-A. byte-identical file の 0 件

- **不変条件**: Git 管理下の `.tsx` / `.ts` file 中、SHA256 hash が同一の file ペア数 = 0
- **対応原則**: J7
- **detection.type**: `custom`（file hash map 生成）
- **guard 粗設計**: `git ls-files -- '*.ts' '*.tsx'` で file 列挙 → SHA256 計算 → 同 hash 複数 file を検出
- **baseline**: Phase 1 inquiry/01 §特殊 で 3 件確認（`features/{category,cost-detail,reports}/ui/widgets.tsx`）→ baseline = 3 → ratchet-down → 0
- **管理方式**: ratchet-down → fixed（0 到達後）
- **sunsetCondition**: 3 複製が解消されてから 6 ヶ月 0 継続

## INV-J7-B. orphan file の 0 件

- **不変条件**: `app/src/presentation/pages/*/widgets/` / `app/src/features/*/ui/` 配下の `.tsx` で、test 以外から import 0 の file 数 ≤ 3（現行 baseline）
- **対応原則**: J7
- **detection.type**: `custom`（import graph 走査）
- **guard 粗設計**: 対象 dir の全 `.tsx` を候補集合とし、`grep -rn "from '<basename>'"` で本番 import 0 の file を抽出
- **baseline**: Phase 1 inquiry/03 Tier D で 3 件確認 → baseline = 3 → ratchet-down → 0
- **管理方式**: ratchet-down → fixed（0 到達後）
- **sunsetCondition**: orphan 3 件（`DowGapKpiCard` / `PlanActualForecast` / `RangeComparison`）の削除後 6 ヶ月 0 継続

## INV-J8-A. Architecture Rule の reviewPolicy 必須

- **不変条件**: `app/src/test/architectureRules/` 配下で定義される全 rule（`base-rules.ts` + overlay）に `reviewPolicy` field が存在する
- **対応原則**: J8
- **detection.type**: `must-include`（type 必須 field）
- **guard 粗設計**: `base-rules.ts` の全 rule オブジェクトを走査、`reviewPolicy` field の存在確認。あるいは TypeScript 型定義で `reviewPolicy` を required に昇格（`RuleOperationalState` に統合）
- **baseline**: inquiry/11 §E より現状未設定 92 件 → baseline = 92 → ratchet-down → 0
- **管理方式**: ratchet-down → fixed（0 到達後）
- **sunsetCondition**: 92 → 0 到達 + 新規 rule の reviewPolicy 未設定が 0 で 6 ヶ月継続

---

## guard 実装優先度（参考、Phase 4 改修計画への入力）

Phase 4 改修計画でのサブ project 起動順序の参考として、以下の観点で整理:

| 優先度 | guard | 理由 |
|---|---|---|
| 高 | INV-J7-A（byte-identical）| 即効性・副作用少・baseline 明確 |
| 高 | INV-J7-B（orphan）| 同上 |
| 高 | INV-J4-A（page-local optional）| J4 達成の compile-time 強制部分 |
| 中 | INV-J1-A（handler 配置）| discountFactHandler 移設に rename 必要、影響 isolate 可能 |
| 中 | INV-J6-A（interface 並存）| WidgetDef 分離に widget 全体影響あるが、分割作業は明確 |
| 中 | INV-J8-A（reviewPolicy）| 92 件の bulk 作業が必要だが構造変更なし |
| 低 | INV-J2-A / B / C（近道検出系）| baseline が曖昧、段階的測定から |
| 低 | INV-J1-B（pure 配置）| heuristic 判定の精度を上げる必要あり |
| 低 | INV-J3-A（@deprecated metadata）| 対象数が少、影響小 |

優先度は Phase 4 改修計画で architecture ロール review 時に確定する（本台帳は候補提示のみ）。

## 付記

- 本ファイルは候補提示であり、invariant-catalog 登録・guard 実装ではない
- 本ファイルは immutable。追加情報は `13a-*.md` として addend する
- 関連: `inquiry/12`（原則候補）、`inquiry/14`（廃止候補）、`references/03-guides/invariant-catalog.md`（Phase 6 で登録先）、`architectureRules.ts`（Phase 6 で実装先）
