# inquiry/12 — 設計原則 v2 候補

> 役割: Phase 3 inquiry 成果物 #1。Phase 2 の 20 仮説 + 4 共通構造源（D-1〜D-4）に対応する**設計原則 v2 候補**を提示する。
>
> 本ファイルは**候補提示**であり、正本化ではない。plan.md §2 不可侵原則 #8 / #9 に従い、`references/01-principles/` / `docs/contracts/principles.json` を一切 touch しない。
>
> 各候補に以下を必須添付（checklist Phase 3 より）:
> - 対応する真因仮説（Phase 2）
> - 既存 9 カテゴリ（A-I + Q）との差分（追加 / 上書き / 削除）
> - 機械検出方法の粗設計
> - `sunsetCondition`（この原則が不要になる条件）
>
> 本ファイルは immutable。Phase 4 以降で追加情報が判明しても書き換えず、`12a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `2af4f6f`（Phase 2 完了直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/09`（20 仮説）、`inquiry/10`（4 共通構造源 D-1〜D-4）、`inquiry/11`（既存対策 7 機構 + 8 抜け目） |

## 候補の構造

各原則候補は以下の form で記述:

```
### <候補 ID> <タイトル>

| 項目 | 内容 |
|---|---|
| 対応仮説 | Phase 2 の仮説 ID |
| カテゴリ属性 | 既存 9 カテゴリへの差分（追加 / 上書き / 削除） |
| 機械検出方法 | guard の粗設計 |
| sunsetCondition | 不要になる条件 |

本文: 原則の定義（what / why / correctPattern）
```

## 候補一覧

本台帳が提示する候補:

| ID | タイトル | 対応仮説 / 構造源 |
|---|---|---|
| J1 | 配置規約の成文化（where を規定する原則） | D-1、S2-H2、S4-H2、S5-H3 |
| J2 | 近道禁止（shortcut 封鎖と構造改善圧力の保持） | D-2、S3-H4、S4-H1、S6-H2 |
| J3 | 移行完了の全層検証（中間状態固定化の防止） | D-3、S1-H1、S3-H1、S5-H1、S2-H1、S2-H3 |
| J4 | page-specific / universal の型レベル分離 | D-4、S1-H2、S3-H3、S6-H3 |
| J5 | ctx 型の page-local optional 禁止 | S3-H1、S3-H2、S3-H4 |
| J6 | 同名 `interface` 並存検出 | S1-H1、S1-H2 |
| J7 | file 重複 / orphan の機械検出 | S5-H1、S5-H2 |
| J8 | Architecture Rule に reviewPolicy 必須化（92 → 0） | D-2、S6-H4、inquiry/11 §E |

---

### J1. 配置規約の成文化（where を規定する原則）

| 項目 | 内容 |
|---|---|
| 対応仮説 | D-1、S2-H2、S4-H2、S5-H3 |
| カテゴリ属性 | **新カテゴリ J「配置規約」** として追加（既存 A-I + Q への上書きは行わない） |
| 機械検出方法 | (1) `*Handler` export を持つ file の配置先を強制する guard。(2) pure fn 抽出先の候補 path を allowlist 化、新規作成時に allowlist 外 path を拒否する guard。(3) duplicate file 検出 guard（byte hash + export 名の組み合わせ） |
| sunsetCondition | (a) `references/01-principles/` 配下に「コード片の配置先規約」を網羅する文書が存在する / (b) 本原則に対応する guard が 6 ヶ月 0 違反で安定し、配置迷いが発生しない / (c) 配置規約違反の PR が review-gate で 3 ヶ月 0 件 |

#### 本文

**what**: コード片（function / type / hook / handler）を「どこに置くか」を規定する原則が、「何を書くか」を規定する原則と同等の強度で成文化されている状態を目指す。

**why**: 既存の `references/01-principles/` は業務値の正本定義（what）を多く含むが、「この種類のコード片はどこに置くべきか」（where）を成文化した文書は部分的（Phase 2 §D-1 で観察）。where が曖昧だと個別判断コストが上がり、近道（S2-H1 / S4-H1）が選ばれる。

**correctPattern**:

- handler 配置: `application/readModels/<name>/` に統一（`application/queries/` への配置は禁止）
- pure fn 抽出: `domain/calculations/`（business logic）/ `features/<slice>/application/pure/`（feature 固有）/ 禁止 path（`presentation/`）を明示
- file 重複: 同一 export 名を持つ file は 1 箇所のみ（`@canonical` JSDoc で正本マーク、重複 file は barrel re-export のみ許容）

**outdatedPattern**:

- `discountFactHandler` が `application/queries/` にある（他は `application/readModels/`）
- 同じ `useCostDetailData` が `features/cost-detail/application/` と `presentation/pages/CostDetail/` に byte-identical 並存
- pure fn が `presentation/pages/Forecast/ForecastPage.helpers` に配置される（presentation 配下）

---

### J2. 近道禁止（shortcut 封鎖と構造改善圧力の保持）

| 項目 | 内容 |
|---|---|
| 対応仮説 | D-2、S3-H4、S4-H1、S6-H2 |
| カテゴリ属性 | 既存 C カテゴリ（純粋性と責務分離）の補強。C8 / C9 に加えて、**C10「近道封鎖」**を追加（既存 C の上書きは行わない） |
| 機械検出方法 | (1) isVisible predicate で `ctx.X != null` 形式の null check を多用する widget を検出（17 widget が該当、ratchet-down baseline 17）。(2) useMemo 内行数上限（例: ≤20 行）を guard で強制、超過は `domain/calculations/` 抽出を要求。(3) 1 widget 内 sub-component 数上限（例: ≤5）を guard で強制 |
| sunsetCondition | (a) ctx 型が page-specific に分離され、gate predicate が不要になる（J4 達成） / (b) pure 抽出が標準化され、useMemo 内 pure は rare exception のみ / (c) sub-widget 畳み込みが無くなり、1 widget = 1 概念の粒度が保たれる |

#### 本文

**what**: 問題の局所的解決手段（widget 側の null check、useMemo 内 pure、1 widget 内の機能畳み込み）が存在することで、構造的改善の圧力が減衰する事象を禁止する。

**why**: Phase 2 D-2 で観察された通り、「近道」は局所的には機能するが、長期的に構造病理を表面化させない。gate パターンが定着すると ctx の page-local optional は解消されない。useMemo 内 pure が許容されると pure 抽出圧力は消える。Sub-widget 畳み込みが許容されると widget 粒度が崩壊する。

**correctPattern**:

- 型レベルで保証されている field は gate predicate 不要（型システムが null check を不要にする）
- 非自明な pure 計算は `domain/calculations/` / `features/<slice>/application/pure/` に抽出し、component は consume のみ
- 1 `WidgetDef` entry = 1 変更理由（C8 準拠）

**outdatedPattern**:

- WID-033 `insight-budget-simulator` が Unified core required の `result` を null check（型で required なのに gate）
- `CategoryComparisonCharts.tsx:52-120` の 69 行 useMemo（ECharts option builder）
- `ConditionSummaryEnhanced.tsx:532` に Budget drill + YoY drill + Settings + Card rows + Daily chart + Daily modal を畳み込み

---

### J3. 移行完了の全層検証（中間状態固定化の防止）

| 項目 | 内容 |
|---|---|
| 対応仮説 | D-3、S1-H1、S3-H1、S5-H1、S2-H1、S2-H3 |
| カテゴリ属性 | **新カテゴリ K「移行規律」** として追加。plan.md §10 の「4 ステップ pattern」「L1-L3 撤退ステップ」を原則化する位置付け |
| 機械検出方法 | (1) 移行 project の checklist に「全層確認」項目を必須化（widget / ctx / hook / handler / style 全てで新経路への統一を明示確認）。(2) `@deprecated` / 「後で消す」コメントを持つ file に `sunsetCondition` + `expiresAt` metadata を必須化し、超過時に guard で fail。(3) byte-identical 複製検出 guard（J7 と連動） |
| sunsetCondition | (a) 移行途中 project が常時 0 / (b) `@deprecated` コメント付き file が `expiresAt` 超過 0 件で 6 ヶ月継続 / (c) byte-identical 複製 0 が 6 ヶ月継続 |

#### 本文

**what**: 大型改修（feature slice 化 / readModel 正本化 / page 追加）が複数層（widget 型 / ctx 型 / hook / handler / style）にまたがる時、**全層での移行完了を機械的に検証**してから project を completed 扱いする。

**why**: Phase 2 D-3 で観察された通り、「主要層の動作確認」で project を閉じると、残層（adapter / 複製 / orphan）が中間状態で残り、**10 年単位で固定化**する（現 code base で observed）。plan.md §10 の 4 ステップ pattern（新実装 → 移行 → 削除 → guard）を「全層で完走」まで厳格化する。

**correctPattern**:

- 移行 project の Phase 6 checklist に「widget 層の確認」「ctx 層の確認」「hook 層の確認」「handler 層の確認」「style 層の確認」等の全層 checkbox を必須化
- `@deprecated` comment を付ける場合、`@expiresAt` date と `@sunsetCondition` を必須
- 複製作成を一時的に許容する場合、`@canonical` JSDoc で正本を明示、複製側は barrel re-export のみ

**outdatedPattern**:

- Feature slice 化の中間で widgets.tsx が byte-identical 複製（S5-H1）
- `useCostDetailData` が 2 箇所並存（S2-H3）
- `RangeComparison.styles.ts` のみ残存、`.tsx` 本体は orphan（S5-H2）

---

### J4. page-specific / universal の型レベル分離

| 項目 | 内容 |
|---|---|
| 対応仮説 | D-4、S1-H2、S3-H3、S6-H3 |
| カテゴリ属性 | 既存 A カテゴリ（層境界）の補強。A1-A6 に加えて **A7「ctx の page / universal 分離」** を追加 |
| 機械検出方法 | (1) `UnifiedWidgetContext` 型への page-local field 追加禁止 guard。(2) page-specific ctx 型（`InsightWidgetContext` / `CostDetailWidgetContext` 等）を明示し、widget registry ごとに使用する ctx 型を fixed にする guard。(3) 合成点（現行 `useUnifiedWidgetContext`）で page ごとに scope を分岐する構造を強制 |
| sunsetCondition | (a) `UnifiedWidgetContext` の page-local optional が 0（現 5） / (b) Dashboard 固有 optional 20 field が Dashboard 専用 ctx 型に移動 / (c) widget registry ごとに ctx 型が 1:1 対応 |

#### 本文

**what**: page 固有データ（`insightData` / `costDetailData` / `selectedResults` 等）を universal な ctx 型（`UnifiedWidgetContext`）に optional として配置することを禁止し、**page-specific ctx 型を明示**する。

**why**: Phase 2 D-4 で観察された通り、Dashboard の構造的特殊性（全店横断 + 独自分析概念 + 先行設計）が汎用設計に非対称を生成する。universal を名乗る ctx が page-coupled になると、widget の真の依存が不可視化され、gate パターン（J2 対策対象）が定着する。

**correctPattern**:

- `UnifiedWidgetContext` は全 page 共通の field のみ（16 core field 程度）
- `DashboardWidgetContext extends UnifiedWidgetContext` で Dashboard 固有 20 field を required
- `InsightWidgetContext extends UnifiedWidgetContext` で Insight 固有 field を required
- 同様に `CostDetailWidgetContext` / `CategoryWidgetContext` / `ReportsWidgetContext` / `DailyWidgetContext` を別型で明示

**outdatedPattern**:

- `UnifiedWidgetContext` に `insightData?` / `costDetailData?` / `selectedResults?` が optional 配置
- Dashboard 固有 `storeKey?` / `allStoreResults?` 等 20 field が optional で同居
- page-level registry（型 B）が Unified ctx を受け取り、自身の必要 field だけ isVisible で gate

---

### J5. ctx 型の page-local optional 禁止

| 項目 | 内容 |
|---|---|
| 対応仮説 | S3-H1、S3-H2、S3-H4 |
| カテゴリ属性 | J4 の compile-time 部分を独立 rule 化。J4 は構造原則、J5 は具体的な禁止 pattern（J4 の correctPattern に対する compile-time 側の強制） |
| 機械検出方法 | (1) `components/widgets/types.ts` の `UnifiedWidgetContext` interface 内、optional field の名前に page 名を含む（例: `insightData` / `costDetailData` / `categoryData`）場合を検出する guard。(2) `// ── <page 名> 固有 ──` コメントブロックの存在を検出し、当該ブロック内の field 追加を禁止 |
| sunsetCondition | (a) `UnifiedWidgetContext` に page-local optional field が 0 件で 6 ヶ月継続 / (b) 全 page が専用 ctx 型を持ち、UnifiedWidgetContext が universal のみに保たれる |

#### 本文

**what**: `UnifiedWidgetContext` interface に **「page 名を field 名に含む optional field」**を追加することを禁止する。

**why**: S3-H2 で観察された「統合契約 spec 不在」を、具体的な禁止 pattern として表明する。page-local field は J4 で別 ctx 型に移動し、Unified ctx には universal only を保つ。

**correctPattern**:

```typescript
// 許容
export interface UnifiedWidgetContext {
  readonly result: StoreResult          // universal
  readonly daysInMonth: number          // universal
  // ...
}

// 禁止
export interface UnifiedWidgetContext {
  // ...
  readonly insightData?: InsightData    // NG: page-local optional
  readonly costDetailData?: CostDetailData // NG
  readonly selectedResults?: readonly StoreResult[] // NG
}
```

**outdatedPattern**: 現行 `components/widgets/types.ts:211-219`。

---

### J6. 同名 `interface` 並存検出

| 項目 | 内容 |
|---|---|
| 対応仮説 | S1-H1、S1-H2 |
| カテゴリ属性 | 既存 F カテゴリ（コード構造規約）の補強。F1（バレル後方互換）/ F5（Contract 管理）に加えて **F10「interface 一意性」** を追加 |
| 機械検出方法 | AST 走査で同名 `interface` / `type alias` の独立定義を検出（`grep -rnE "^(export )?interface <name>"` の複数 file hit）。`WidgetDef` / `WidgetContext` / `StoreResult` 等の重要 interface に対象を限定 |
| sunsetCondition | (a) 対象 interface の一意性が 6 ヶ月 0 違反 / (b) 並存理由が存在する rare case は `@canonical` JSDoc + `@variant` 明示で例外扱い（allowlist 管理） |

#### 本文

**what**: 同じ interface 名が複数 file に独立定義されている状態を **機械検出し、原則禁止** する。

**why**: S1 で観察された `WidgetDef` 2 型並存が、人間の「気付き」に頼って存続している。型名は意味を担うので、同名の別型は設計意図の混乱を示す。

**correctPattern**:

- 共通 interface は 1 file 定義 + barrel export
- 必要なら **名前を分ける**（`DashboardWidgetDef` / `UnifiedWidgetDef`）
- どうしても同名が必要な rare case は `@canonical` JSDoc で正本を明示、他は別名 alias

**outdatedPattern**: 現行 `Dashboard/widgets/types.ts:101` と `components/widgets/types.ts:225` の `WidgetDef` 並存。

---

### J7. file 重複 / orphan の機械検出

| 項目 | 内容 |
|---|---|
| 対応仮説 | S5-H1、S5-H2 |
| カテゴリ属性 | 既存 G カテゴリ（機械的防御）の補強。G1-G8 に加えて **G9「重複 / orphan 検出」** を追加 |
| 機械検出方法 | (1) Repository 全体の SHA hash map を生成し、同一 hash を持つ `.tsx` / `.ts` を検出。(2) import graph 走査で本番到達不能な file（test-only / 全く未参照）を検出、ratchet-down で管理 |
| sunsetCondition | (a) byte-identical 複製 0 が 6 ヶ月継続 / (b) orphan file 0 が 6 ヶ月継続 / (c) 例外（意図的な barrel 複製）は `@duplicate-of` JSDoc で明示 |

#### 本文

**what**: Git repository 中の `.tsx` / `.ts` file 全体に対して、**byte-identical 複製と orphan を機械検出する** 体制を確立する。

**why**: S5 で観察された 3 件の byte-identical 複製（widgets.tsx × 3）と 3 件の orphan（inquiry/03 Tier D）は、人間が `diff` / `grep` を手動実行して発見した。本来これは CI で常時検出されるべき。

**correctPattern**:

- 重複検出 guard: SHA256 hash map + 同 hash 複数 file の検出
- Orphan 検出 guard: import graph + registry reachability
- 意図的な barrel re-export は `@duplicate-of <canonical-path>` で明示し、allowlist 管理

**outdatedPattern**:

- `features/{category, cost-detail, reports}/ui/widgets.tsx` と `pages/*/widgets.tsx` の byte-identical 並存（inquiry/01 §特殊）
- `DowGapKpiCard.tsx` / `PlanActualForecast.tsx` / `RangeComparison.tsx` の本番 import 0（inquiry/03 Tier D）

---

### J8. Architecture Rule に reviewPolicy 必須化

| 項目 | 内容 |
|---|---|
| 対応仮説 | D-2（近道の定着を時間軸で検出）、S6-H4（Plan パターンの集約性が長期化）、inquiry/11 §E（reviewPolicy 未設定 92 件） |
| カテゴリ属性 | 既存の Temporal Governance（CLAUDE.md 直近の主要変更 2026-04-07）を強化。Architecture Rule の登録時に `reviewPolicy` を optional → required に昇格 |
| 機械検出方法 | `architectureRules.ts` / `base-rules.ts` の rule 定義に `reviewPolicy` field が無い rule を検出し、ratchet-down。現状 baseline 92 → 減少のみ許可、`docs:check` の警告（既に表示されている）を hard gate 化 |
| sunsetCondition | (a) reviewPolicy 未設定 rule 0 件で 6 ヶ月継続 / (b) 全 rule に owner と reviewCadenceDays が設定され、時間 drift 検出が機能する |

#### 本文

**what**: 全 Architecture Rule の定義に `reviewPolicy`（owner / lastReviewedAt / reviewCadenceDays）を**必須**にする。

**why**: inquiry/11 §E で観察された「reviewPolicy 設定済みルール数 0 / 92」の状態は、rule が時間軸で陳腐化しても検出できないことを意味する。plan.md は「ルールは仮説であり、回避が生まれたらルールを疑う」としているが、疑う契機が無いと rule は永続化する。

**correctPattern**:

- 新規 rule 登録時に `reviewPolicy` を required field として型定義
- `lastReviewedAt` 超過は `docs:check` で fail
- owner は人間または role（`architecture` / `implementation` 等）

**outdatedPattern**: 現状 `reviewPolicy` 未設定 92 rule（`docs:generate` 警告で表示される）。

## 付記

- 本ファイルは候補提示であり、正本化ではない（plan.md §2 不可侵原則 #8 / #9 遵守）
- 本ファイルは immutable。追加情報は `12a-*.md` として addend する
- 関連: `inquiry/09`（仮説）、`inquiry/10`（相互作用）、`inquiry/11`（既存対策）、`inquiry/13`（不変条件候補）、`inquiry/14`（廃止候補）
