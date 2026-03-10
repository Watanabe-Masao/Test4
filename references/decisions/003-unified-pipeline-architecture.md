# ADR-003: 統一パイプラインアーキテクチャ — DuckDB/JS チャート二分法の廃止

**ステータス**: Accepted（採用済み）
**日付**: 2026-03-10
**影響範囲**: infrastructure / application / domain / presentation
**前提**: ADR-001（DuckDB 導入）、ADR-002（期間選択モデル — 一部 Superseded）

---

## コンテキスト

Phase 3 の SQL→JS 移行により、DuckDB は多くのチャートで `SELECT * WHERE` に専念し、
集約は JS 純粋関数に移行された。しかし以下の問題が残っている:

1. **「DuckDB チャート」と「JS チャート」の二分法が残存**
   - コンポーネント名（`DuckDBYoYChart` vs `PrevYearComparisonChart`）に取得方式が焼き込まれている
   - チャートの責務ではなく実装方式がアーキテクチャを規定している

2. **比較ロジックの分散**
   - SQL JOIN 条件に比較ルールが埋め込まれている（`yoyComparison.ts`）
   - 個別 hook のマージキーにも比較ルールが埋め込まれている（`computeYoyDaily` の `storeId|month|day`）
   - `resolveComparisonFrame.ts` と `PeriodSelection.ts` に比較先決定が分散

3. **canonical rows の不在**
   - 比較先の行が確定した中間表現がない
   - 各チャートが独自にマージ・整列を行っている

---

## 意思決定

### 最終アーキテクチャ: 5段パイプライン

```
DuckDB Data Provider
  → 期間取得・候補抽出・軽い前処理
  ↓
Comparison / Alignment
  → 比較先を確定した canonical rows
  ↓
JS Analysis
  → 集計・特徴量・差分計算
  ↓
Chart VM
  → 既存チャート互換 shape
  ↓
Chart
  → 描画だけ
```

**DuckDB チャートと JS チャートは「別系統のチャート」ではなく、同じパイプライン上の別責務になる。**

### 各層の責務

| 層 | 責務 | やらないこと |
|---|---|---|
| **DuckDB Data Provider** | 期間指定でのデータ取得、current/previous 候補の抽出、store/category/hour の粒度前処理、lookback 用の追加期間取得、必要なら軽い前集約や中間表生成 | 比較ルールの判定、分析計算 |
| **Comparison / Alignment** | 前年同日・前年同曜日の比較先決定、整列済み canonical rows の生成 | データ取得、分析計算 |
| **JS Analysis** | 比較後の差分計算、累積、移動平均、Z スコア、構成比、ランキング | データ取得、比較先決定、描画 |
| **Chart VM** | 分析結果を既存チャート互換の shape に変換、ViewModel 生成 | データ取得、分析、描画 |
| **Chart** | 描画のみ | 上記すべて |

### Comparison / Alignment 層（新設）

DuckDB と JS Analysis の間に新設する。

**入力:** DuckDB Data Provider からの current rows / previous candidate rows
**出力:** 整列済み canonical rows

概念上の canonical row:

```typescript
interface CanonicalRow {
  readonly currentDateKey: string    // 当期の日付キー (YYYYMMDD)
  readonly compareDateKey: string    // 比較期の日付キー (YYYYMMDD)
  readonly compareMode: ComparisonPreset  // 比較モード
  readonly alignmentKey: string      // 整列キー（store + date の複合キー）
  readonly storeId: string
  // ... 以下、データフィールド
}
```

**現状との違い:**
- 現在は SQL JOIN 条件や hook のマージキー（`storeId|month|day`）に比較ルールが分散
- 新設層で比較先決定を一箇所に集約し、downstream は整列済みデータを消費するだけ

### ADR-002 コードの位置づけ

ADR-002 で実装済みのコードは新アーキテクチャの構成要素として活用する:

| ADR-002 コード | 新アーキテクチャでの役割 |
|---|---|
| `PeriodSelection.ts` | Comparison/Alignment 層の比較先決定入力。`ComparisonPreset` と `applyPreset()` が比較意味論を提供 |
| `PeriodContract.ts` | Chart VM 層のウィジェット向け API。`PeriodNeed` でウィジェットの期間要求を宣言 |
| `periodSelectionStore.ts` | ユーザーの期間選択状態管理。パイプライン全体の入力源 |
| `usePeriodResolver.ts` | ウィジェットの期間解決。`PeriodNeed` → `ResolvedPeriods` の仕分け |

**ADR-002 の Phase 4 以降（消費側移行）は本 ADR に吸収する。**
ADR-002 のステータスは Superseded（本 ADR に置換）。

---

## 比較仕様の固定

当面の対応範囲を固定する。この線引きがないと移行先設計が定まらない。

| 比較モード | 対応状況 | 備考 |
|---|---|---|
| 前年同日（`prevYearSameMonth`） | **対応** | カレンダー日付で対応 |
| 前年同曜日（`prevYearSameDow`） | **単月内のみ対応** | `calcSameDowOffset` による月初曜日差調整 |
| 前月（`prevMonth`） | **対応** | ADR-002 で追加 |
| 前年同曜日 + 1週 | **将来候補** | 月跨ぎなし試験対応の可能性 |
| 月跨ぎ任意期間の前年同曜日 | **非対応** | 複雑度が高く、需要が不明確 |

---

## なくすもの・残すもの・新設するもの

### なくすもの

- 「DuckDB チャート」「JS チャート」という UI 上の分類
- チャートごとの SQL 集約ロジック（段階的に縮小）
- チャートごとの JS マージロジック（Comparison 層に統合）
- 比較ルールを SQL JOIN 条件に埋め込む構造
- 比較ルールを個別 hook のマージキーに埋め込む構造

### 残すもの

- DuckDB の取得・絞り込み能力（Data Provider として）
- 一部の軽い前集約（データ量が多い場合の SQL GROUP BY）
- JS の純粋関数分析（`rawAggregation.ts` 等）
- 既存チャートコンポーネント（名称変更するが描画ロジックは維持）

### 新設するもの

- Comparison / Alignment 層
- Canonical row 型定義
- Chart VM 変換層

---

## 実装ロードマップ

### フェーズ 1: 棲み分けの定義 ← 本 ADR

設計上、以下を明文化する:
- DuckDB は**取得と前処理**
- Comparison は**比較先決定**
- JS は**分析**
- Chart は**描画**

### フェーズ 2: 比較仕様の固定

上記「比較仕様の固定」セクションで確定済み。

### フェーズ 3: 日別 YoY を新パイプラインへ移行

最初の移行対象。理由:
- 現在の問題が最も集中している
- SQL 版も JS 版もあり、二重構造が見えやすい
- 成功すると新アーキテクチャの検証になる

この段階では:
1. DuckDB で current / prev 候補を取得
2. Comparison 層で alignment
3. JS で差分計算
4. `YoyDailyRow` 互換 VM に戻す

### フェーズ 4: 既存 DuckDB チャートを「データ供給 hook」に置き換え

名称から取得方式を外す:
- `DuckDBCumulativeChart` → `CumulativeChart`
- `DuckDBYoYChart` → `YoyChart`
- `DuckDBFeatureChart` → `FeatureChart`

内部では DuckDB provider → Comparison → JS analysis → VM builder を使用。

### フェーズ 5: 既存 JS チャートも同じパイプラインへ寄せる

通常の JS チャートも、可能なものは同じ構造に寄せる:
data provider → analysis → VM → chart

### フェーズ 6: SQL 集約ロジックを順次縮小

**先に移しやすいもの（JS 化の実績あり）:**
- 日別累積
- 日別前年比較
- 特徴量
- 曜日パターン
- 時間帯プロファイル後段

**後で移すもの（SQL 維持理由あり）:**
- カテゴリ×時間帯（データ量が多く SQL GROUP BY が有効）
- 店舗×時間帯
- ベンチマーク
- カテゴリ構成比推移

**最終的にも SQL 前処理は残る可能性がある。**
ただし「SQL 分析チャート」ではなく「SQL 前処理つきの同一分析パイプライン」として扱う。

---

## engine-responsibility.md との整合

現行の `engine-responsibility.md` は「JS エンジン vs DuckDB エンジン」の二分法で記述されている。
本 ADR 採用後、以下のように改訂する:

| 現行の区分 | 新しい区分 |
|---|---|
| JS 計算エンジン（確定値） | 変更なし（単月確定値は JS のまま） |
| DuckDB 探索エンジン（集約） | → **DuckDB Data Provider**（取得 + 前処理） + **JS Analysis**（集約） |
| SQL→JS 移行パターン | → 統一パイプラインの標準パターンに昇格 |

**判定フロー**の変更:

```
この処理は…
├── StoreResult の確定値を消費するか？
│   └── Yes → JS（domain/calculations/）— 変更なし
├── 比較先の決定が必要か？
│   └── Yes → Comparison / Alignment 層
├── データ取得が必要か？
│   ├── 多次元集約（GROUP BY 3変数以上）？ → DuckDB + SQL 前集約
│   ├── 10万件超？ → DuckDB + SQL 前集約
│   └── それ以外 → DuckDB SELECT * WHERE → JS Analysis
└── 分析計算（差分・累積・移動平均等）→ JS Analysis
```

---

## 却下した選択肢

### DuckDB チャートと JS チャートの並立維持

Phase 3 で SQL→JS 移行が進み、実態として両者の境界が曖昧になっている。
並立を維持すると、新チャート追加時に「どちらの系統か」の判断が必要になり、
比較ロジックの分散が続く。統一パイプラインで責務を再定義する方が保守性が高い。

### Comparison 層を DuckDB 側に置く（SQL VIEW として実装）

SQL VIEW で比較先を JOIN すると、比較ルール変更時に SQL を修正する必要があり、
JS 側の柔軟性が失われる。また、前年同曜日の offset 計算は JS の方が自然。
Comparison 層は application 層に配置し、JS 純粋関数として実装する。

### 一括移行

全チャートを一度に移行するのはリスクが大きい。
日別 YoY から始めて検証し、段階的に移行する。

---

## リスクと緩和策

| リスク | 緩和策 |
|---|---|
| 移行中の二重構造期間が長期化 | フェーズごとに完了基準を設定。委譲パターンで外部 API を維持 |
| Comparison 層の追加による複雑度増加 | 比較先決定を一箇所に集約することで、全体としては複雑度が減少 |
| 既存チャートの互換性破壊 | Chart VM で既存の型（YoyDailyRow 等）互換の shape を返す |
| SQL 前処理が必要なチャートとの不整合 | SQL 前処理を「パイプラインの Data Provider 内の実装詳細」として扱う |
