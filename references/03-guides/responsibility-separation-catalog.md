# 責務分離カタログ

## 判定基準: 「1 文で説明できるか」

> **このインスタンスの責務を「〜を担う」の 1 文で説明できるか？**
> 説明に「AND」が入ったら分離候補。

### AND テスト

```
OK:  「前年日付範囲を alignmentMode に応じて解決する」
NG:  「前年日付範囲を解決する AND 前年売上データを集計する AND KPI を投影する」
```

NG の場合、AND で区切られた各パーツが独立した責務。

### 変更理由テスト

「このインスタンスを変更する理由は何種類あるか」を数える。
1 種類なら OK。2 種類以上なら分離候補。

- 600 行でも変更理由が 1 つ → OK
- 10 行でも変更理由が 2 つ → 分離候補

---

## A. 複数の「何を」が混在（機能の AND）

### P1: 純粋ロジックが hook に閉じ込められている

**1 文テスト:**
- NG: 「日付リマッピングを行う AND それを React state に接続する」
- OK: 「日付リマッピングを行う」(純粋関数) / 「リマッピング結果を React state に接続する」(hook)

**変更理由:** 2 種類 — リマッピングアルゴリズムの変更 / React の接続方式の変更

**典型例:** `useMultiMovingAverage.ts:remapPrevYearSeries`、`useComparisonModule.ts:buildComparisonScope`(修正済)
**検出:** useMemo 内に 10 行以上のロジックがあり、かつ外部から呼び出す用途がある
**対策:** useMemo 内のロジックを named export の純粋関数に抽出。hook は呼ぶだけにする
**ガード化:** useMemo 内の行数を制限するガード（検討中）

### P3: God hook（fetch + 変換 + store 書込の一体化）

**1 文テスト:**
- NG: 「前年データを fetch する AND 変換する AND store に書き込む AND エラーを管理する」
- OK: 各パーツが独立した usecase / hook

**変更理由:** 4 種類 — API変更 / 変換ルール変更 / store 構造変更 / エラーハンドリング変更

**典型例:** `useAutoLoadPrevYear.ts`(11並列fetch+store書込)、`useImport.ts`(5useState+パイプライン)
**検出:** 1 hook 内に useEffect + useState 5個以上 + store.getState() が同居
**対策:** async ロジックを usecase に抽出。hook は state + useEffect のみ
**ガード化:** useState 上限（既に sizeGuard で 8 上限）

### P4: God object / God context

**1 文テスト:**
- NG: 「売上データ AND 天気データ AND クエリ実行器 AND チャート操作 AND 比較スコープを提供する」
- OK: 各 slice が独立したコンテキスト

**変更理由:** 5 種類 — 売上計算変更 / 天気API変更 / クエリ変更 / UI操作変更 / 比較ロジック変更

**典型例:** `useUnifiedWidgetContext.ts`、`WidgetContext`(30+フィールド)
**検出:** interface のフィールド数が 15 以上
**対策:** 責務別 slice に分割（useQuerySlice 等で進行中）
**ガード化:** interface フィールド数の上限ガード（検討中）

### P8: 内部責務爆発（行数 OK だが useMemo 数が多い）

**1 文テスト:**
- NG: 「時間帯チャートのデータ構築 AND 天気マージ AND option 生成 AND ドリルダウン管理 AND エラー処理を担う」
- OK: 各段階が独立した関数/hook

**変更理由:** 5 種類

**典型例:** `HourlyChart.tsx`(15責務)、`ConditionSummaryEnhanced.tsx`(16責務)、`YoYWaterfallChart.tsx`(16責務)
**検出:** 1 ファイル内の useMemo + useCallback の合計が 10 以上
**対策:** builder 群を別ファイルに分離、state を reducer に統合
**ガード化:** useMemo+useCallback 合計数の上限ガード

### P19: facade の返却表面積爆発

**1 文テスト:**
- NG: 「チャートデータ AND 操作ハンドラ AND エラー状態 AND テーマ AND フォーマッタを返す」
- OK: 各消費者が必要な slice だけ受け取る

**変更理由:** 返却フィールドごとに異なる

**典型例:** `useDeptHourlyChartData`(15フィールド)、`useInsightData`(14フィールド)
**検出:** hook の返り値のフィールド数が 10 以上
**対策:** 返り値を責務別の部分オブジェクトに分割
**ガード化:** 返り値フィールド数の上限ガード

### P21: レジストリが 5 役兼務

**1 文テスト:**
- NG: 「指標の表示定義 AND データ紐付け AND 計算出典 AND 品質ポリシー AND フォールバック戦略を管理する」
- OK: 各責務が独立したレジストリ/テーブル

**変更理由:** 5 種類 — UI表示変更 / データ構造変更 / 計算変更 / ポリシー変更 / FB変更

**典型例:** `metricDefs.ts`(50エントリ×7ポリシー)、`formulaRegistryBusiness.ts`(12エントリ×5役)
**検出:** 1 エントリのフィールド数が 7 以上
**対策:** ポリシーを外部テーブルに分離、またはカテゴリ別ファイルに分割
**ガード化:** 困難（データ構造の問題）

### P22: 1 モデルにサブシステム集中

**1 文テスト:**
- NG: 「比較のクエリ範囲 AND JS集計マッピング AND UI表示ラベル AND ロード範囲 AND 日次対応表の正本を担う」
- OK: 各消費者向けのビューモデルに分離

**変更理由:** 5 種類

**典型例:** `ComparisonScope`(query/display/alignment/load/mappingの正本)
**検出:** 1 interface が 3 つ以上の異なるレイヤーから参照される
**対策:** 消費者別のビューモデルを導出、ComparisonScope は内部正本に限定
**ガード化:** 困難（設計判断が必要）

### P23: page-level data assembler

**1 文テスト:**
- NG: 「比較データ AND 予測データ AND 客数分析 AND 分解データ AND 予算データを組み立てる」
- OK: 各分析が独立した hook、ページは結合のみ

**変更理由:** 分析機能ごとに異なる

**典型例:** `useInsightData`(15+導出値)、`useTimeSlotData`(12導出値)
**検出:** 1 hook が 3 つ以上の独立した分析モジュールを内包
**対策:** 分析ごとに独立した hook に分離、ページ hook は結合のみ
**ガード化:** 依存する外部 hook/module の数を制限

---

## B. 複数の「どこで」が混在（層の AND）

### P2: Store 直アクセス（getState() アンチパターン）

**1 文テスト:**
- NG: 「KPI テーブルを描画する AND 在庫設定を Store に直接書き込む」
- OK: 「KPI テーブルを描画する」(component) / 「在庫設定を更新する」(callback prop)

**変更理由:** 2 種類 — UI 変更 / Store 構造変更

**典型例:** `StoreKpiTableInner.tsx`(3つのgetState)、`ExecSummaryBarWidget.tsx`
**検出:** presentation 層で `getState()` または `useXxxStore` を直接呼ぶ
**対策:** callback props 経由で application 層に委譲
**ガード化:** presentation 層での getState() を codePatternGuard で検出

### P5: インフラ層でのビジネスロジック混入

**1 文テスト:**
- NG: 「CSV のヘッダーを検出する AND カラムをマッピングする AND データを変換する AND 集約する」
- OK: 各段階が独立した関数

**変更理由:** 4 種類 — CSV フォーマット変更 / カラム定義変更 / 型変換変更 / 集約ルール変更

**典型例:** `ClassifiedSalesProcessor.ts`、`PurchaseProcessor.ts`(7ファイルが同パターン)
**検出:** Processor ファイルが detect + transform + aggregate を 1 クラスに持つ
**対策:** detect → transform → aggregate の 3 段パイプラインに分離
**ガード化:** Processor ファイルのパブリックメソッド数制限

### P6: 層境界違反

**1 文テスト:**
- NG: 「チャートデータを整形する AND DuckDB に直接クエリする」
- OK: 「チャートデータを整形する」(presentation) / 「クエリする」(application hook 経由)

**変更理由:** 2 種類 — UI 変更 / データ取得方式変更

**典型例:** `useDailySalesData.ts`(presentation/charts/に配置)、`widgetLayout.ts`(localStorage直操作)
**検出:** layerBoundaryGuard（既存）
**ガード化:** 既に layerBoundaryGuard で部分対応

### P7: グローバル変数 / モジュールスコープ副作用

**1 文テスト:**
- NG: 「比較データをロードする AND グローバル変数にキャッシュする」
- OK: 「比較データをロードする」/ キャッシュは WeakMap + GC 対応

**変更理由:** 2 種類 — ロードロジック変更 / キャッシュ戦略変更

**典型例:** `useLoadComparisonData.ts:_adjacentFlowersRecords`
**検出:** モジュールスコープの `let` 変数
**ガード化:** codePatternGuard でモジュールスコープ let を検出（検討中）

### P20: 権限チェック + 業務ロジック混在

**1 文テスト:**
- NG: 「ファイルシステム権限を確認する AND バックアップを実行する」
- OK: 「権限を確認する」/ 「バックアップを実行する」

**変更理由:** 2 種類 — 権限API変更 / バックアップ形式変更

**典型例:** `useAutoBackup.ts:backupNow`
**検出:** 同一関数内に permission API + ビジネスロジック
**対策:** 権限確認を事前条件として分離
**ガード化:** 困難（意味レベルの判断）

---

## C. 複数の「いつ」が混在（ライフサイクルの AND）

### P10: state 群の構造化不足

**1 文テスト:**
- NG: 「表示モード AND 選択状態 AND ドリル状態 AND 比較モード AND 表示/非表示を個別 useState で管理する」
- OK: 「チャート操作状態を 1 つの reducer で管理する」

**変更理由:** 1 種類（状態遷移ルール）だが、散在により遷移の一貫性が保てない

**典型例:** `useInsightData`(6 useState)、`useDeptHourlyChartData`(5 useState)
**検出:** 1 hook/component 内に関連する useState が 4 つ以上
**対策:** 関連する state を useReducer に統合
**ガード化:** useState 上限（既に sizeGuard で 8 上限）

### P13: render 塊の条件分岐肥大

**1 文テスト:**
- NG: 「サマリー AND 棒グラフ AND SVGオーバーレイ AND 詳細パネル AND 選択UIを 1 つの return で描画する」
- OK: 各 render 塊が独立した子コンポーネント

**変更理由:** UI パーツごとに異なる

**典型例:** `HourlyChart.tsx`(5 render 塊)
**検出:** JSX の return 内に 5 つ以上の独立したセクション
**対策:** 各セクションを子コンポーネントに抽出
**ガード化:** 困難（JSX 構造の静的解析が難しい）

### P18: ダミー/fallback 定数の inline 注入

**1 文テスト:**
- NG: 「チャートを描画する AND データ不在時のダミー入力を組み立てる」
- OK: 「チャートを描画する」/ ダミー入力は呼び出し側で

**変更理由:** 2 種類 — 描画ロジック変更 / fallback 戦略変更

**典型例:** `TimeSlotChart.tsx:DUMMY_DATE_RANGE`、`useComparisonModule:EMPTY_DAILY`
**検出:** コンポーネント内の定数に DUMMY/EMPTY/ZERO プレフィックス
**対策:** fallback 値を引数のデフォルト値 or 呼び出し側に移動
**ガード化:** 困難

---

## D. 暗黙の内部構造（説明できるが中身が不透明）

### P9: builder チェーンの密結合

**1 文テスト:**
- OK: 「予算カードを構築する」（1 文で説明できる）
- **問題:** 内部の buildA→buildB→buildC の中間型が暗黙で、個別テスト不可

**変更理由:** 1 種類だが、中間段階の変更が連鎖的に影響

**典型例:** `ConditionSummaryEnhanced`(buildBudgetHeader→buildCardSummaries→buildUnifiedCards)
**検出:** 同一スコープ内で 3 つ以上の build 関数が連鎖呼び出し
**対策:** 中間型を明示し、各 builder を独立テスト可能にする
**ガード化:** 困難（意味レベルの判断）

### P11: 1 関数に多段パイプライン

**1 文テスト:**
- OK: 「カテゴリベンチマークスコアを算出する」
- **問題:** 内部に group→metric→補完→avg→index→variance→dominance→sort の 9 段階

**変更理由:** 段階ごとに異なる可能性あり

**典型例:** `categoryBenchmarkLogic.ts:buildCategoryBenchmarkScores`(9段)
**検出:** 1 関数内の中間変数が 5 つ以上
**対策:** 各段階を独立した純粋関数に抽出、パイプラインで結合
**ガード化:** 関数内の中間変数数を制限（検討中）

### P14: レジストリのメタデータ肥大

**1 文テスト:**
- OK: 「全指標のメタデータを管理する」
- **問題:** 1 エントリが 7 種類のメタデータを持ち、変更理由が 7 種類

**変更理由:** 7 種類（表示/データ/計算/権威/警告/FB/採用ポリシー）

**典型例:** `metricDefs.ts`(50エントリ×7ポリシー)
**検出:** レジストリの 1 エントリのフィールド数が 7 以上
**対策:** ポリシーテーブルの分離、または composition pattern
**ガード化:** 困難（データ設計の問題）

### P15: 純粋関数の内部段階が暗黙

**1 文テスト:**
- OK: 「指標の表示状態を解決する」
- **問題:** 内部に Stage1(raw)→Stage2(warning)→Stage3(acceptance) の 3 段階

**変更理由:** 段階ごとに異なる

**典型例:** `metricResolver.ts:resolveMetric`(3 Stage)、`advancedForecast.ts:calculateMonthEndProjection`(6段)
**検出:** 関数内に `// Stage N` や `// Step N` コメント
**対策:** 各段階を独立した純粋関数に抽出
**ガード化:** 困難

### P24: 導出値の連鎖計算

**1 文テスト:**
- OK: 「インサイトページの KPI を導出する」
- **問題:** actualGP→gpRate→totalCust→avgDaily→avgTxValue→prev→yoy の連鎖

**変更理由:** 導出値ごとに異なる

**典型例:** `useInsightData`(789-797行)
**検出:** useMemo 内で 5 つ以上の導出値が連鎖的に計算
**対策:** 導出チェーンを純粋関数に抽出し、入出力型を明示
**ガード化:** 困難

---

## E. 散在（同じ責務が複数箇所にコピー）

### P12: 型ファイルに utility が同居

**1 文テスト:**
- NG: 「PeriodSelection の型を定義する AND 日付計算ユーティリティを提供する」
- OK: 型定義ファイル / ユーティリティファイルを分離

**変更理由:** 2 種類 — 型変更 / 計算ロジック変更

**典型例:** `PeriodSelection.ts`(型+10個の純粋関数)
**検出:** 型定義ファイルに export function が 5 つ以上
**対策:** 関数を別ファイルに分離、型ファイルは型のみ
**ガード化:** 型ファイルの export function 数を制限

### P16: 日付ユーティリティの分散

**1 文テスト:**
- OK: 各ファイルの責務は正しい
- **問題:** 同じ種類の関数（lastDayOfMonth, daysBetween 等）が 2 箇所に分散

**典型例:** `PeriodSelection.ts` と `ComparisonScope.ts` に類似の日付関数
**検出:** 類似関数名の grep
**対策:** `CalendarDate.ts` に統合
**ガード化:** 困難

### P17: 入力正規化の散在

**1 文テスト:**
- OK: 各 hook の責務は正しい
- **問題:** `storeIds.size > 0 ? [...storeIds] : undefined` が 10+ 箇所にコピペ

**典型例:** 各 plan hook の入力構築
**検出:** 同一コードパターンの grep
**対策:** `normalizeQueryParams()` 関数を 1 箇所に抽出
**ガード化:** 困難（パターンの静的検出が難しい）

---

## 傾向分析

### 因果関係図

```
P4（God object）→ P19（facade 爆発）→ P17（正規化コピペ）
     ↓                                → P8（内部責務爆発）→ P13（render 肥大）
P2（Store 直アクセス）← P6（層境界違反）
     ↓
P1（ロジック閉じ込め）← P3（God hook）← P10（state 構造化不足）

P21（レジストリ 5 役）← P14（メタデータ肥大）
P22（モデル集中）← P23（assembler）← P24（導出連鎖）

P5（infra 混入）← P7（グローバル副作用）← P20（権限混在）
P9（builder 密結合）← P11（多段パイプ）← P15（内部段階暗黙）
P12（型+utility）← P16（日付分散）← P18（ダミー注入）
```

### AND の種類別分布

| AND の種類 | パターン数 | インスタンス数 | 対策の難易度 |
|---|---|---|---|
| **機能の AND** | 8 (P1,3,4,8,19,21,22,23) | ~500 | 中（構造変更） |
| **層の AND** | 5 (P2,5,6,7,20) | ~50 | 低（ガード可能） |
| **ライフサイクルの AND** | 3 (P10,13,18) | ~80 | 低〜中 |
| **暗黙の内部構造** | 5 (P9,11,14,15,24) | ~200 | 高（設計判断） |
| **散在** | 3 (P12,16,17) | ~20 | 低（統合） |

### ガード化可能性

| 検出可能 | パターン | ガード案 |
|---|---|---|
| **静的解析で検出可能** | P2, P6, P7, P12 | codePatternGuard / layerBoundaryGuard |
| **数値で制限可能** | P3, P8, P10, P19 | useState 上限 / useMemo 上限 / 返り値フィールド上限 |
| **設計判断が必要** | P1, P4, P5, P9, P11, P13-P18, P20-P24 | レビュー時のチェックリスト |
