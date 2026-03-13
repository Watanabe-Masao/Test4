# Engine Boundary Policy — 三層 Execution Engine の責務境界

## 設計思想

実装は目的ではない。実装は、正しい業務値を導出し、その再現性を保ち、
長期的な運用と変更に耐える構造を実現するための手段である。

技術選定は「その言語で書けるか」「局所的に速くなるか」ではなく、以下の観点で行う:

- 正しさを保ちやすいか
- 再現性を担保しやすいか
- 責務境界を明確にできるか
- 長期運用で破綻しにくいか
- 変更時に影響範囲を局所化できるか

### 核心的判断

**本ポリシーの本質は「どこに Rust を入れるか」ではなく、
「TypeScript に何をさせないかを定める」ことである。**

TypeScript は実装可能性が広いゆえに、責務逸脱を起こしやすい。
「便利だからここに置く」が積み重なり:

- pure な業務計算が hook に埋まる
- 画面都合のロジックと業務ロジックが混ざる
- 正式値の定義元が複数になる
- 表示不整合の原因追跡が難しくなる

したがって、**TypeScript の自由度を意図的に制限し、責務を守らせるための設計規律**
としてエンジン境界を定義する。

## 基本原則

1. **正式な業務確定値には単一の責務を与える** —
   確定値の導出責務は、単一の Authoritative Engine に集約する
2. **pure かつ authoritative な処理は制御層に残さない** —
   TypeScript 側にそのような処理が存在する場合、放置対象ではなくリファクタリング対象
3. **取得・保存・制御・表示と計算を混在させない** —
   Application Engine は業務計算そのものを抱え込まない
4. **探索と確定値を混在させない** —
   Exploration Engine は正式な値の唯一の定義元にはしない
5. **技術は責務に従って選定する** —
   その責務を最も自然に、最も壊れにくく、最も長く維持できる技術を選ぶ

## 三層 Execution Engine 定義

| Execution Engine | 役割 | 実装 | 制約 |
|---|---|---|---|
| **Authoritative Business Calculation** | 正式な業務確定値を導く純粋計算 | 現在: `domain/calculations/` (TS), 将来: Rust/WASM | pure only, 副作用なし, UI非依存 |
| **Application Orchestration / Storage / UI** | 取得・保存・状態管理・非同期・表示制御・ViewModel | TypeScript | pure+authoritative を新規実装しない |
| **Exploration** | 任意条件の探索・自由集計・drilldown | DuckDB SQL | 正式値の唯一定義元にしない |

### `domain/calculations/` は Authoritative Engine の staging area である

現時点では Authoritative Business Calculation Engine の実装の大半は TypeScript であり、
`domain/calculations/` がその配置先である。
ただしこれは Application Engine の一部ではなく、
将来 Rust/WASM へ移行可能な権威的計算領域として扱う。

したがって、**TypeScript で実装されていることは Application 責務であることを意味しない。**

### Authoritative と Pure Analytics Substrate の区別

`domain/calculations/` 内のモジュールはさらに2層に分類される:

| 区分 | モジュール | 性質 |
|---|---|---|
| **Authoritative** | factorDecomposition, forecast, budgetAnalysis, invMethod, estMethod, markupRate, costAggregation, discountImpact, inventoryCalc, pinIntervals | 正式業務値を決定する |
| **Pure Analytics Substrate** | rawAggregation, correlation, trendAnalysis, sensitivity, advancedForecast | 分析基盤。authoritative ではないが pure |

Authoritative モジュールは Pure Analytics Substrate に依存してよいが、逆は許可しない。

## Pure / Authoritative 判定ルール

処理の所属を以下の順で判定する:

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

### 「Authoritative」の定義

以下を**すべて**満たす処理を Authoritative とする:

- 正式な業務確定値に関わる（KPI、粗利、予算達成率、要因分解等）
- 同じ入力なら同じ出力
- UI がなくても成立する
- StoreResult / PeriodMetrics のフィールド値を決定する

### Pure 判定と FFI 適合判定の分離

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

## TypeScript の責務と制約

### TypeScript に残してよいもの

- IndexedDB / OPFS / localStorage
- DuckDB 呼び出し・Worker bridge
- Zustand store（state 反映のみ）
- React hook（memoization + delegation）
- cache / invalidate / debounce / retry
- loading / error 制御
- UI 向け整形・ViewModel 生成
- ページ状態依存の表示制御

### TypeScript に恒久的に残さない方針のもの

- 業務確定値を導く pure 計算
- pure なデータ突き合わせ・正規化
- pure な統計処理・予測処理・要因分解
- pure なルール評価

### TS 禁止原則

次を**すべて**満たす処理を TypeScript に恒久実装してはならない:

- pure function である
- authoritative な値に関わる
- UI がなくても成立する
- 取得や保存に依存しない

これに該当するなら、まず pure に切り出し、最終的に Authoritative Engine に寄せる。

### レビュー時のチェックポイント

以下が見えたら、「TypeScript に置くべきでない可能性」を疑う:

- `useMemo` 内で業務値を計算している
- selector 内で集約している
- `useEffect` 内で値を組み立てている
- store 更新直前に業務ロジックを混ぜている
- ViewModel 生成の中で business rule を決めている
- 同じ入力なら同じ結果になる処理なのに hook に埋まっている

### 禁止シグナル（Authoritative Engine に入れてはならない処理）

以下を含む処理は Authoritative Engine の対象外:

- `use...` hook 依存
- `getState()` 利用
- `Date.now()` / `new Date()`
- `Math.random()`
- `console.*`
- `indexedDB` / `fetch` / `localStorage`
- loading / retry / cancel
- キャッシュ参照
- UI ラベルや文言整形

## DuckDB Exploration Engine の守備範囲

- 任意期間・任意条件のデータ取得（`SELECT WHERE`）
- GROUP BY 集約は探索・取得責務の範囲で使用してよい。
  ただし正式な業務確定値の定義は Authoritative Engine 側で行う
- JOIN による突き合わせ（データ取得レベル）
- 探索的分析（ad hoc query, drilldown）

DuckDB は `normalized_records`（IndexedDB）から派生するキャッシュ層である。
DuckDB が壊れても `rebuildFromIndexedDB()` で完全再構築可能。
DuckDB → IndexedDB の書き戻しは禁止。

## 新規処理の判断フロー

新しい処理を追加するときは、次で判断する:

```
1. pure にできるか？
   └── No → TypeScript（Application Engine）
   └── Yes → 次へ

2. 正式な業務確定値に関わるか？
   └── Yes → Authoritative Engine 候補
              → domain/calculations/ に配置
   └── No → 次へ

3. exploration か？
   └── Yes → DuckDB
   └── No → TypeScript（UI 専用 pure utility）
```

## 既存 engine-responsibility.md との関係

本文書は `engine-responsibility.md` の上位方針として位置づける。
`engine-responsibility.md` は具体的なモジュール割当と SQL→JS 移行パターンを記録する。
本文書はエンジン境界の設計思想と判定ルールを定義する。

| 文書 | 役割 |
|---|---|
| **engine-boundary-policy.md**（本文書） | 設計思想・判定ルール・禁止原則 |
| **engine-responsibility.md** | 具体的なモジュール割当・移行パターン・データ契約 |
