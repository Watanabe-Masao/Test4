# 説明責任（Explanation / Evidence）アーキテクチャ

> 本ドキュメントは CLAUDE.md から詳細を分離したものである。

本システムの計算結果は経営判断に使われる。**数値の信頼性は「なぜこの値か」が
追跡可能であることで初めて保証される。** 以下の設計思想に基づき、全ての主要指標に
説明データ（Explanation）を付与する。

### 3つの要件

| # | 要件 | 問いかけ | 実装 |
|---|---|---|---|
| 1 | **式の透明化** | 「この値はどの式で算出？」 | `Explanation.formula` に人間可読な計算式 |
| 2 | **入力の追跡** | 「どのデータが寄与？」 | `Explanation.inputs[]` で入力パラメータを列挙、`metric` で指標間リンク |
| 3 | **ドリルダウン** | 「月→日→元データまで辿れるか？」 | `Explanation.breakdown[]` で日別内訳、`evidenceRefs[]` で元データ参照 |

### レイヤー配置

```
Domain層    → Explanation / MetricId / EvidenceRef 型定義のみ（ロジックなし）
Application層 → ExplanationService（usecases/explanation/）が StoreResult から Explanation を生成
               useExplanation フックで遅延生成（useMemo）
Presentation層 → MetricBreakdownPanel（モーダル）で表示
               KpiCard.onClick → onExplain(metricId) で起動
```

### 設計原則

1. **計算を再実行しない**: ExplanationService は StoreResult の値をそのまま使う。
   計算パイプライン（CalculationOrchestrator）は変更しない。
2. **Domain層は純粋に保つ**: `domain/models/Explanation.ts` は型定義のみ。
   生成ロジックは `application/usecases/explanation/ExplanationService.ts` に置く。
3. **遅延生成**: Explanation は useMemo で計算結果に連動して生成。
   全指標を事前計算せず、表示時に必要な分だけキャッシュする。
4. **指標間ナビゲーション**: ExplanationInput.metric でリンク先を持ち、
   MetricBreakdownPanel 内でクリックして別指標の根拠に遷移できる。

### 対象指標（MetricId）

| グループ | MetricId | 指標名 |
|---|---|---|
| 売上系 | `salesTotal`, `coreSales`, `grossSales` | 総売上, コア売上, 粗売上 |
| 原価系 | `purchaseCost`, `inventoryCost`, `deliverySalesCost` | 総仕入, 在庫仕入, 売上納品 |
| 売変系 | `discountTotal`, `discountRate`, `discountLossCost` | 売変額, 売変率, 売変ロス原価 |
| 値入率 | `averageMarkupRate`, `coreMarkupRate` | 平均値入率, コア値入率 |
| 在庫法 | `invMethodCogs`, `invMethodGrossProfit`, `invMethodGrossProfitRate` | 原価, 粗利, 粗利率 |
| 推定法 | `estMethodCogs`, `estMethodMargin`, `estMethodMarginRate`, `estMethodClosingInventory` | 原価, マージン, マージン率, 期末在庫 |
| 客数 | `totalCustomers` | 来店客数 |
| 消耗品 | `totalConsumable` | 消耗品費 |
| 予算系 | `budget`, `budgetAchievementRate`, `budgetProgressRate`, `projectedSales`, `remainingBudget` | 予算, 達成率, 消化率, 予測, 残余 |

### 受け入れ基準

以下を満たすとき「説明責任が実装できた」と判定する:

1. 粗利 / 粗利率 / 売上 / 仕入 / 売変 の各指標で:
   - 計算式が表示される
   - 入力値が表示される
   - 月→日へのドリルダウンができる（店舗別）
2. 指標→日→元データ種別（出所）が辿れる
3. 入力パラメータのクリックで関連指標へ遷移できる

### ページ別の根拠表示対応状況

全6ページで MetricBreakdownPanel による根拠表示が利用可能。
「数字の根拠を示せること」がアプリケーションの最大の品質要件であり、
ユーザーがどのページからでも「なぜこの数字なのか？」を追跡できる状態を実現している。

| ページ | 対応状況 | 主な根拠表示対象 |
|---|---|---|
| **Dashboard** | `WidgetContext.onExplain` 経由で全ウィジェットから利用可能 | ExecSummaryBar, AlertPanel, ConditionSummary（値入率の相乗積ドリルダウン含む） |
| **Daily** | KpiCard 6枚（売上, 仕入, 売変, 粗利率, 値入率, 消耗品）全てに接続 | 前年比 trend 表示付き |
| **Insight** | Tab 1: KpiCard 6枚に接続 / Tab 2: 在庫法・推定法カード内の全計算値（13指標）をクリック可能 | CalcRow $clickable で損益構造の各値から直接根拠表示 |
| **Reports** | 概況 KpiCard 4枚 + 目標対実績 KpiCard 4枚 + 仕入・売変 KpiCard 4枚 + 損益構造カード内の全計算値をクリック可能 | 在庫法・推定法カードの CalcRow $clickable |
| **Category** | KpiCard 4枚（全体値入率, 粗利額, 原価合計, 売価合計）に接続 | カテゴリ→店舗→日別の3段ドリルダウンは既存テーブルで対応 |
| **CostDetail** | KpiCard（消耗品費合計, 消耗品率）に接続 | 品目別→日別ドリルダウンは既存テーブルで対応 |

#### 共通 CalcRow コンポーネント

計算結果を「ラベル: 値」形式で表示する行コンポーネント群は
`presentation/components/common/CalcRow.ts` に一元化されている:

- `CalcRow` — `$clickable` prop で MetricBreakdownPanel 連携用ホバーエフェクト付与
- `CalcLabel` — ラベル部分
- `CalcValue` — 値部分（等幅フォント）
- `CalcHighlight` — 強調値（カラー指定可能）

Insight と Reports の .styles.ts からは re-export で参照している（設計思想7「後方互換はバレル re-export で保つ」に従う）。

### 今後の拡張（第2段階以降）

- **差異の要因分解**: 前年比 / 予算比 / 先月比 での影響度（impact）表示
- **元ファイル行参照**: EvidenceRef にファイル名・行番号を持たせ、インポートエラー時に「どの行が原因」まで出せるようにする
- **Worker拡張**: 計算と同時にExplanationを生成し、非同期でUIに反映
