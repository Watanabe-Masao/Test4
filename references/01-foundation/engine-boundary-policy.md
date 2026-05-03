# Engine Boundary Policy — 三層 Execution Engine 再定義と TypeScript 側計算責務整理

## 1. 目的

本計画の目的は、実装技術の導入そのものではなく、
正しい業務値を再現可能に導出し、長期的な運用と変更に耐える構造を再定義することにある。

特に本計画では、TypeScript の自由度を意図的に制限し、
責務逸脱を防ぐための設計規律として、Execution Engine の境界を明文化する。

## 2. 背景

本プロジェクト（shiire-arari）は、Phase 0-7 において

- JS 計算エンジン
- DuckDB 探索エンジン

の二層 CQRS を構築済みであり、概ね責務分離は達成されている。

一方で、現状は以下の課題を持つ。

- `application/usecases/calculation/` に pure かつ authoritative な計算ロジックが残存している
- `application/hooks/duckdb/jsAggregationLogic.ts` に pure な探索計算が混在している
- エンジン境界の判定ルールが暗黙的であり、新規実装時の配置判断が曖昧である
- TypeScript が「何でも書ける」ことにより、制御層へ calculation-like code が流入しやすい

この状態を放置すると、

- pure な業務計算が hook や usecase に埋まる
- 画面都合のロジックと業務ロジックが混在する
- 正式値の定義元が複数になる
- 表示不整合の原因追跡が困難になる

という問題が継続的に発生する。

## 3. 設計思想

実装は目的ではない。
実装は、正しい業務値を導出し、その再現性を保ち、
長期的な運用と変更に耐える構造を実現するための手段である。

技術選定は「その言語で書けるか」「局所的に速くなるか」ではなく、以下の観点で行う。

- 正しさを保ちやすいか
- 再現性を担保しやすいか
- 責務境界を明確にできるか
- 長期運用で破綻しにくいか
- 変更時に影響範囲を局所化できるか

## 4. 核心的判断

**本計画の本質は、どこに Rust を入れるかではなく、
TypeScript に何をさせないかを定めることである。**

TypeScript は実装可能性が広いため、責務逸脱を起こしやすい。
そのため、Execution Engine の境界を先に定義し、TypeScript の責務を明示的に制限する。

## 5. 基本原則

### 5.1 正式な業務確定値には単一の責務を与える

確定値の導出責務は、単一の Authoritative Engine に集約する。

### 5.2 pure かつ authoritative な処理は制御層に残さない

TypeScript 側にそのような処理が存在する場合、放置対象ではなくリファクタリング対象とする。

### 5.3 取得・保存・制御・表示と計算を混在させない

Application Engine は、業務計算そのものを抱え込まない。

### 5.4 探索と確定値を混在させない

Exploration Engine は、正式な値の唯一の定義元にはしない。

### 5.5 技術は責務に従って選定する

その責務を最も自然に、最も壊れにくく、最も長く維持できる技術を選ぶ。

## 6. TS 禁止原則

次を**すべて**満たす処理を、TypeScript に恒久実装してはならない。

- pure function である
- authoritative な値に関わる
- UI がなくても成立する
- 取得や保存に依存しない

これに該当する処理は、まず pure に切り出し、最終的に Authoritative Engine に寄せる。

## 7. 三層 Execution Engine 定義

### 7.1 Authoritative Business Calculation Engine

**役割:** 正式な業務確定値を導くための純粋な前処理・構成・計算を担う。

**現在の配置先:** `domain/calculations/`（TypeScript）

**将来の実装候補:** Rust/WASM

**制約:**

- pure only
- 副作用なし
- UI 非依存
- 外部状態非依存
- 保存・非同期・取得を持たない

**補足:**
`domain/calculations/` は Authoritative Engine の staging area とする。
現時点では TypeScript 実装であっても、Application Engine の一部ではなく、
将来 Rust/WASM へ移行可能な権威的計算領域として扱う。
**TypeScript で実装されていることは Application 責務であることを意味しない。**

#### Authoritative と Pure Analytics Substrate の区別

> **注意:** `authoritative` を単独語で使用しない。
> 必ず `business-authoritative` または `analytic-authoritative` として修飾する。
> 詳細は `references/01-foundation/semantic-classification-policy.md` を参照。

`domain/calculations/` 内のモジュールはさらに2層に分類される:

| 区分 | semanticClass | モジュール | 性質 |
|---|---|---|---|
| **Business Semantic Core** (business-authoritative) | business | factorDecomposition, budgetAnalysis, invMethod, estMethod, markupRate, costAggregation, discountImpact, inventoryCalc, pinIntervals | 正式業務値を決定する |
| **Business Semantic Core** (business-authoritative) | business | weatherAggregation (aggregateHourlyToDaily, categorizeWeatherCode, deriveWeatherCode, toWeatherDisplay) | 天気データの集約・分類。気象実測値から日別サマリ・天気カテゴリを導出する |
| **Analytic Kernel** (analytic-authoritative) | analytic | forecast, timeSlotCalculations | 分析基盤。pure かつ authoritative だが業務値の核ではない |
| **Pure Analytics Substrate** (non-authoritative) | analytic | rawAggregation, correlation, trendAnalysis, sensitivity, advancedForecast | 分析基盤。authoritative ではないが pure |

Business Semantic Core は Analytic Kernel / Pure Analytics Substrate に依存してよいが、逆は許可しない。

### 7.2 Application Orchestration / Storage / UI Engine

**役割:** 取得、保存、状態管理、非同期制御、表示制御、ViewModel 生成を担う。

**実装:** TypeScript

**制約:** pure + business-authoritative / analytic-authoritative な処理を新規実装しない

### 7.3 Exploration Engine

**役割:** 任意条件の探索、自由集計、drilldown を担う。

**実装:** DuckDB SQL

**制約:** 正式値の唯一の定義元にしない

## 8. 判定ルール

### 8.1 Pure / Authoritative 判定

処理の所属は、以下の順で判定する。

```
この処理は…
├── pure か？
│   └── No → TypeScript（Application Engine）
├── authoritative か？
│   └── Yes → Authoritative Engine（domain/calculations/）
├── exploration か？
│   └── Yes → Exploration Engine（DuckDB）
│            または domain/calculations/rawAggregation.ts
└── UI 専用 → TypeScript に残してよい（.vm.ts / ViewModel）
```

### 8.2 business-authoritative の定義

以下を**すべて**満たす処理を business-authoritative とする:

- 正式な業務確定値に関わる（KPI、粗利、予算達成率、要因分解等）
- 同じ入力なら同じ出力
- UI がなくても成立する
- StoreResult / PeriodMetrics のフィールド値を決定する

> **注意:** `authoritative` を単独語で使わない。意味分類ポリシーに従い
> `business-authoritative` / `analytic-authoritative` / `candidate-authoritative` を使う。

### 8.3 Pure 判定と FFI 適合判定の分離

Pure であることは Authoritative Engine 候補の**必要条件**であり、
JSON serializable であることは**移管容易性の条件**である。
この二つは区別して扱う。

**Pure 判定（Authoritative Engine 候補の条件）:**

- 同じ入力なら同じ出力
- 副作用なし
- 外部状態なし

**FFI 適合判定（移管容易性の条件）:**

- JSON serializable（no Map, no Set, no class instance）
- 型が安定している
- バージョン管理しやすい

## 9. TS Responsibilities / Prohibitions

### 9.1 TS に残してよいもの

- IndexedDB / OPFS / localStorage
- DuckDB 呼び出し・Worker bridge
- Zustand store（state 反映のみ）
- React hook（memoization + delegation）
- cache / invalidate / debounce / retry
- loading / error 制御
- UI 向け整形・ViewModel 生成
- ページ状態依存の表示制御

### 9.2 TS に恒久的に残さない方針のもの

- 業務確定値を導く pure 計算
- pure なデータ突き合わせ・正規化
- pure な統計処理・予測処理・要因分解
- pure なルール評価

### 9.3 レビュー時のチェックポイント

以下が見えたら、「TypeScript に置くべきでない可能性」を疑う:

- `useMemo` 内で業務値を計算している
- selector 内で集約している
- `useEffect` 内で値を組み立てている
- store 更新直前に業務ロジックを混ぜている
- ViewModel 生成の中で business rule を決めている
- 同じ入力なら同じ結果になる処理なのに hook に埋まっている

## 10. DuckDB の守備範囲

DuckDB は探索責務に限定する。

**許可範囲:**

- 任意期間・任意条件のデータ取得（`SELECT WHERE`）
- 探索・取得責務としての GROUP BY 集約。
  ただし正式な業務確定値の定義は Authoritative Engine 側で行う
- データ取得レベルの JOIN
- ad hoc query
- drilldown

**禁止:**

- 正式な業務確定値の唯一の定義
- authoritative logic の正本化

DuckDB は `normalized_records`（IndexedDB）から派生するキャッシュ層である。
DuckDB が壊れても `rebuildFromIndexedDB()` で完全再構築可能。
DuckDB → IndexedDB の書き戻しは禁止。

## 11. 禁止シグナル

以下を含む処理は、Authoritative Engine に入れてはならない。

- `use...` hook 依存
- `getState()` 利用
- `Date.now()` / `new Date()`
- `Math.random()`
- `console.*`
- `indexedDB` / `fetch` / `localStorage`
- loading / retry / cancel
- キャッシュ参照
- UI ラベルや文言整形

## 12. 実施ステップ

### Step 1. 設計再定義 ✅ 完了

**成果物:**

- `references/01-foundation/engine-boundary-policy.md`（本文書）
- `CLAUDE.md` 更新（3つのエンジン + 禁止事項 #9）
- 既存 `engine-responsibility.md` との整合確認

**目的:**

- 三層 Execution Engine を明文化する
- 判定ルールと TS 禁止原則を固定する

### Step 2. TS 側監査 ✅ 完了

**成果物:**

- TS 側監査（完了済み、監査結果は本ドキュメントに統合）

**目的:**

- TS 側の calculation-like code を棚卸しする
- pure / authoritative / exploration / UI 専用 / non-pure に分類する

**分類カテゴリ:**

- Category A: Pure + Authoritative（domain/ 移管対象）
- Category B: Pure + Exploration（現状維持 or rawAggregation 統合）
- Category C: Pure + UI 専用（TS 残留許可）
- Category D: Pure だが責務過大（分解候補）
- Category E: Non-pure（TS 残留）

### Step 3. Pure 化リファクタリング ✅ 完了

**目的:**

- 責務を見える化する
- エンジン所属判定できる状態にする
- TS 禁止原則に該当する処理を `domain/` に移す
- 散在する authoritative business logic の重複定義を解消する

**実施済み対象:**

- `markupRate` — 3箇所の重複実装を `domain/calculations/markupRate.ts` に統合
- `costAggregation` — 2箇所の重複実装を `domain/calculations/costAggregation.ts` に統合

**方針:**

- `application/usecases/calculation/` 内の inline helper / 重複計算を `domain/calculations/` に抽出
- 既存ロジックとの一致をテストで保証

### Step 4. Authoritative 候補確定 ✅ 完了

**目的:**

- authoritative 候補と pure analytics substrate を区別する
- 将来の FFI 境界に備えてデータ契約を整理する

**Authoritative 候補（FFI Tier 付き）:**

| 優先度 | モジュール | FFI Tier | 備考 |
|---|---|---|---|
| 1 | factorDecomposition | Tier 1 ✅ | Shapley 恒等式検証可。Map/Set 内部のみ |
| 2 | markupRate | Tier 1 ✅ | Phase 2-1 で抽出済み。全 scalar |
| 3 | costAggregation | Tier 1 ✅ | Phase 2-2 で抽出済み。全 scalar |
| 4 | invMethod | Tier 1 ✅ | scalar + null。粗利計算の核心 |
| 5 | estMethod | Tier 1 ✅ | scalar + null。推定法粗利計算 |
| 6 | discountImpact | Tier 1 ✅ | scalar。売変インパクト |
| 7 | pinIntervals | Tier 1 ✅ | scalar + array |
| 8 | forecast | Tier 2 ⚠️ | 入力に ReadonlyMap。出力は serializable |
| 9 | budgetAnalysis | Tier 1 ✅ | Record ベースに変更済み。StoreResult 側は application 層で Map↔Record 変換 |

**Pure Analytics Substrate（FFI Tier 付き）:**

| モジュール | FFI Tier | 備考 |
|---|---|---|
| rawAggregation | Tier 1 ✅ | 23関数。全 array/plain object |
| correlation | Tier 1 ✅ | 相関・正規化・乖離検出 |
| trendAnalysis | Tier 1 ✅ | トレンド分析 |
| sensitivity | Tier 1 ✅ | 感度分析・弾力性 |
| advancedForecast | Tier 2 ⚠️ | 一部 ReadonlyMap 入力 |

**FFI Tier 定義:**

| Tier | 定義 | 対応 |
|---|---|---|
| Tier 1 | 入出力とも JSON serializable | そのまま FFI 境界にできる |
| Tier 2 | 入力に ReadonlyMap あり、出力は serializable | 入力アダプタで対応可 |
| Tier 3 | 入出力とも非 serializable | 型リファクタリングが必要 |

**補足:**

- pure 判定は必要条件
- FFI 適合判定は移管容易性の条件
- この二つは分けて扱う
- 詳細は本ドキュメントの Step 2 を参照

### Step 5. 小規模試験導入

**対象:** `factorDecomposition.ts`

**目的:**

- Authoritative Engine の実装置換が自然に成立するか確認する
- テスト戦略が機能するか確認する
- 速度より正しさを優先して評価する

**一致条件:**

- Shapley 恒等式が成り立つ
- 許容誤差内で TS 実装と一致する
- UI 表示に影響しない

## 13. 検証方法

全体を通して、以下を基準とする。

```bash
cd app && npm run lint          # ESLint エラー0
cd app && npm run format:check  # Prettier 準拠
cd app && npm run build         # tsc -b + vite build 通過
cd app && npm test              # 全テスト通過
cd app && npm run build-storybook  # Storybook ビルド通過
```

加えて、以下を必須とする:

- architecture review
- `guards/layerBoundaryGuard.test.ts` 通過
- 新規 pure function の単体テスト
- 不変条件テスト

## 14. 成功条件

- 各エンジンの責務が一文で説明できる
- TS 側に pure authoritative logic を新規に置かないルールが文書化されている
- 正式値の定義元が `domain/calculations/` に集約されている
- DuckDB の役割が探索に限定されている
- 重複 authoritative logic が解消されている
- 変更時に、どのエンジンを直すべきかが機械的に判定できる

## 15. リスク抑制

- 一括移行しない
- pure 化と Rust 移管を分離する
- TS 例外実装には期限を付ける
- 「速いか」ではなく「正しいか」で評価する
- 設計を先に固定し、実装は後から追従させる

## 16. 実施順序

```
Phase 0: 設計文書              ✅ 完了
  ↓
Phase 1: TS 側監査             ✅ 完了
  ↓
Phase 2: staging area 集約     ✅ 完了
  2-1: markupRate 抽出         ✅
  2-2: costAggregation 抽出    ✅
  2-3: dailyBuilder 分解準備    ✅
  ↓
Phase 3: exploration 整理      ✅ 完了（文書）
  ↓
Phase 4: 候補確定・FFI 契約    ✅ 完了（文書）
  ↓
Phase 5: 小規模試験導入（別計画）
```

## 既存 engine-responsibility.md との関係

本文書は `engine-responsibility.md` の上位方針として位置づける。
`engine-responsibility.md` は具体的なモジュール割当と SQL→JS 移行パターンを記録する。
本文書はエンジン境界の設計思想と判定ルールを定義する。

| 文書 | 役割 |
|---|---|
| **engine-boundary-policy.md**（本文書） | 設計思想・判定ルール・禁止原則・実施計画 |
| **engine-responsibility.md** | 具体的なモジュール割当・移行パターン・データ契約 |

## 17. Import Boundary Rules（Phase 10 追加）

### Runtime authoritative path

- compare 対象関数の runtime 呼び出しは **bridge 経由** で統一する
- `domain/calculations/` からの direct import は **型参照** と **テスト** に限定する
- presentation / hooks が domain の計算関数を直接 import して runtime 呼び出しすることは禁止

### 逆依存禁止

- `domain/` → `application/` の import は禁止（既存ルール通り）
- `domain/` → `infrastructure/` の import は禁止

### Aggregate responsibility

- aggregate（multi-store orchestration）は bridge に混ぜない
- single-store authoritative core のみが bridge の compare 対象
- aggregate は application 層に残す

### Barrel 方針

- bridge 対象関数の barrel は bridge から re-export する
- type-only export は domain barrel から直接許容する
- 直接 import を許す例外: テストファイル、Storybook

### 静的ガード

- `guards/codePatternGuard.test.ts` の architecture guard セクションで
  bridge 対象 runtime 関数の直接 import を検出する（将来追加候補）
