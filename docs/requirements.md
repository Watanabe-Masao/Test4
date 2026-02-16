# 仕入荒利管理システム - 要件定義書

## 1. プロジェクト概要

### 1.1 目的

既存の単一HTMLファイル（`shiire_arari_v10_multistore_flowview_ES5_20260216_022229_fixed_v23.html`、約364KB）で実装されている**仕入荒利管理システム**を、保守性・拡張性・型安全性を備えたモダンなTypeScript Webアプリケーションへリファクタリングする。

### 1.2 現行システムの課題

| # | 課題 | 影響 |
|---|------|------|
| 1 | 単一HTMLファイルに全コード（CSS/JS/HTML）が密結合 | 保守・テスト不能 |
| 2 | ES5 + グローバル変数によるステート管理 | 名前衝突・デバッグ困難 |
| 3 | 型定義なし（全てany相当） | ランタイムエラーの原因 |
| 4 | テストコードなし | 計算ロジックの信頼性が不明 |
| 5 | 変数名が略称・不統一（`v9_`, `v22_`, etc.） | コード理解に時間がかかる |
| 6 | ビジネスロジックとUIが密結合 | ロジック変更時にUI破壊のリスク |
| 7 | 参照外部モジュール（`features/import/*.js`, `state/*.js`）が欠落 | 不完全な状態 |

### 1.3 ゴール

- GitHub Pagesで静的にホスティング可能
- TypeScriptによる完全な型安全
- テストカバレッジ（ビジネスロジック80%以上）
- コンポーネント単位の分離（関心の分離）
- 将来的なバックエンド統合を考慮したアーキテクチャ

---

## 2. 技術スタック

| カテゴリ | 選定技術 | 理由 |
|----------|----------|------|
| 言語 | TypeScript 5.x (strict mode) | 型安全、IDE支援、リファクタリング容易 |
| UIフレームワーク | React 18 | コンポーネント指向、豊富なエコシステム |
| ビルドツール | Vite 6.x | 高速HMR、TypeScript native対応 |
| スタイリング | styled-components | CSS-in-JS、動的テーマ、型安全なスタイル |
| テスト | Vitest + React Testing Library | Vite互換・高速、Jest互換API |
| ファイル解析 | SheetJS (xlsx) | Excel/CSV読み込み（既存と同じ） |
| チャート | SVG自前実装 → 将来Chart.js/Recharts検討 | 既存SVGロジック移植、段階的改善 |
| デプロイ | GitHub Pages + GitHub Actions | 自動ビルド・デプロイ |
| Linter/Formatter | ESLint + Prettier | コード品質統一 |
| 状態管理 | React Context + useReducer → 将来Zustand検討 | 軽量から開始、必要に応じて拡張 |

---

## 3. 機能要件

### 3.1 データインポート機能

#### 3.1.1 対応ファイル形式
- Excel (.xlsx, .xls)
- CSV (.csv)

#### 3.1.2 データ種別と入力

| # | データ種別 | キー名 | 必須 | 説明 |
|---|-----------|--------|------|------|
| 1 | 仕入データ | `purchase` | **必須** | 取引先別・日別の原価金額・売価金額 |
| 2 | 売上データ | `sales` | **必須** | 店舗別・日別の販売金額 |
| 3 | 売変データ | `discount` | 任意 | 値引・割引額 |
| 4 | 初期設定 | `initialSettings` | 任意 | 期首在庫・期末在庫・粗利予算 |
| 5 | 予算データ | `budget` | 任意 | 店舗別・日別予算配分 |
| 6 | 消耗品データ | `consumables` | 任意 | 消耗品費（複数ファイル可、追加/上書きモード） |
| 7 | 店間入データ | `interStoreIn` | 任意 | 他店舗からの入荷 |
| 8 | 店間出データ | `interStoreOut` | 任意 | 他店舗への出荷 |
| 9 | 花データ | `flowers` | 任意 | 花売上（売価×掛け率=原価） |
| 10 | 産直データ | `directProduce` | 任意 | 産直売上（売価×掛け率=原価） |

#### 3.1.3 インポート方式
- ドラッグ＆ドロップ（複数ファイル同時対応）
- ファイル選択ダイアログ（カード型UI）
- 自動ファイル種別判定（ヘッダー解析）
- インポート進捗表示
- データ検証＆警告（検証モーダル付き）

#### 3.1.4 ファイル種別自動判定ルール

| データ種別 | ファイル名パターン | ヘッダーパターン |
|-----------|-------------------|-----------------|
| 仕入 | `仕入`, `shiire` | `取引先コード`, `原価金額`, `売価金額` |
| 売上 | `売上`, `uriage` | `販売金額`, `売上` |
| 売変 | `売変`, `baihen` | `売変合計`, `値引` |
| 初期設定 | `初期`, `設定`, `setting` | `期首`, `期末` |
| 予算 | `予算`, `budget` | `予算` |
| 店間入 | `店間入`, `入庫` | `店舗コードIN` |
| 店間出 | `店間出`, `出庫` | `店舗コードOUT` |
| 花 | `花`, `hana` | `販売金額` |
| 産直 | `産直`, `sanchoku` | `販売金額` |

> **注意**: 花・産直はヘッダーパターンが同一（`販売金額`）のため、ファイル名パターンで先に判定する。

#### 3.1.5 ファイル形式詳細仕様

##### (1) 仕入データ（purchase）

```
行0: 取引先コード（"NNNNNNN:取引先名" 形式、7桁コード、Col3〜）
行1: 店舗コード（"NNNN:店舗名" 形式、4桁コード、Col3〜）
行2: (メタ情報)
行3: (メタ情報)
行4+: データ行
  Col0: 日付
  Col3+: 2列ペアで繰り返し
    偶数列(3,5,7...): 原価金額
    奇数列(4,6,8...): 売価金額
```

- 最低4行必要（データは行4以降）
- 取引先コード抽出: 正規表現 `/(\d{7})/`
- 店舗コード抽出: 正規表現 `/(\d{4}):/`
- 値の解析: `parseFloat()`, NaN → 0

##### (2) 売上データ（sales）

```
行0: 店舗コード（"NNNN:店舗名" 形式、Col3〜）
行1: (メタ情報)
行2: (メタ情報)
行3+: データ行
  Col0: 日付
  Col3+: 店舗別売上金額（2列ペア）
```

- 最低3行必要（データは行3以降）
- 店舗コード抽出: 正規表現 `/(\d{4}):/`

##### (3) 売変データ（discount）

```
行0: 店舗コード（"NNNN:店舗名" 形式、Col3〜）
行1: (ヘッダー)
行2+: データ行
  Col0: 日付
  Col3+: 2列ペアで繰り返し
    偶数列: 売上金額
    奇数列: 売変額
```

- 最低3行必要（データは行2以降）
- 売変額は**絶対値**で格納: `Math.abs(value)`
- 売上が0の行はスキップ

##### (4) 初期設定（initialSettings）

```
行0: ヘッダー
行1+: データ行
  Col0: 店舗コード
  Col1: 期首在庫
  Col2: 期末在庫
  Col3: 月間粗利額予算
```

- 最低2行必要（データは行1以降）
- 店舗ID変換: `String(parseInt(storeCode))`
- 粗利予算 > 0 のみ登録

##### (5) 予算データ（budget）

```
行0: ヘッダー
行1+: データ行
  Col0: 店舗コード
  Col1: 日付
  Col2: 予算金額
```

- 最低2行必要（データは行1以降）
- 予算金額 ≤ 0 はスキップ
- 日付範囲を追跡（min/max）

##### (6) 店間入データ（interStoreIn）

```
行0: ヘッダー
行1+: データ行
  Col0: 入庫店舗コード
  Col1: 日付
  Col2: 出庫元店舗コード
  Col3: 原価
  Col4: 売価
```

- 最低2行必要（データは行1以降）
- 金額は絶対値: `Math.abs(value)`
- **部門間移動判定**: 入庫店舗コード === 出庫元店舗コード → 部門間移動（bumonIn）

##### (7) 店間出データ（interStoreOut）

```
行0: ヘッダー
行1+: データ行
  Col0: 日付
  Col1: 出庫元店舗コード
  Col2: 入庫先店舗コード
  Col3: 部門コード
  Col4: 原価
  Col5: 売価
```

- 最低2行必要（データは行1以降）
- 金額は**負の絶対値**: `-Math.abs(value)`
- **部門間移動判定**: 同上（同一店舗コード → 部門間移動）

##### (8) 花データ（flowers）

```
行0: 店舗コード（"NNNN:店舗名" 形式、Col3〜）
行1-2: (メタ情報)
行3+: データ行
  Col0: 日付
  Col3+: 店舗別売価金額
```

- 最低3行必要（データは行3以降）
- 原価計算: `cost = Math.round(price × flowerCostRate)` （デフォルト 0.80）
- 売価 > 0 のみ処理

##### (9) 産直データ（directProduce）

```
（花データと同一フォーマット）
原価計算: cost = Math.round(price × directProduceCostRate)（デフォルト 0.85）
```

##### (10) 消耗品データ（consumables）

```
行0: ヘッダー
行1+: データ行
  Col0: 勘定コード（'81257' のみ対象）
  Col1: 品目コード
  Col2: 品目名
  Col3: 数量
  Col4: 原価
  Col5: 日付
```

- 最低2行必要（データは行1以降）
- **店舗判定**: ファイル名先頭2桁 → 正規表現 `/^(\d{2})/`
- **勘定コードフィルタ**: `'81257'` 以外の行はスキップ
- 複数ファイル対応（追加/上書きモード選択）

#### 3.1.6 日付パーサー仕様

以下の形式を自動認識:

| 形式 | 例 | 備考 |
|------|-----|------|
| Excelシリアル値 | `45338` | 数値型をDate変換 |
| 日本語形式 | `2026年2月15日` | 正規表現マッチ |
| ISO形式 | `2026-02-15` | ハイフン区切り |
| スラッシュ形式 | `2026/02/15` | スラッシュ区切り |

パース不能な場合は `null` を返し、その行はスキップされる。

#### 3.1.7 バリデーションルール

**分析実行前チェック:**

| レベル | 条件 | メッセージ |
|--------|------|-----------|
| ERROR | 仕入データ未読込 | 仕入データが必要です |
| ERROR | 売上データ未読込 | 売上データが必要です |
| WARNING | 検出店舗数 = 0 | 店舗が検出されません |
| WARNING | 在庫設定未登録の店舗あり | 在庫設定が必要です |
| INFO | 予算データ未読込 | 予算データの読込を推奨 |
| INFO | 売変データ未読込 | 売変データで精度向上 |

### 3.2 計算エンジン（推定在庫・粗利管理 ロジック仕様）

> **設計思想**: 売変（値引）・値入率を考慮した推定原価・推定粗利・推定期末在庫を、
> **在庫販売のみ**を対象として一貫したロジックで算出する。
> 売上納品・花・産直など値入率管理の対象外売上を除外し、
> 売上・原価・在庫が同一の範囲（＝**同一の"世界線"**）で対応することを目的とする。

#### 3.2.0 対象範囲と前提条件

**売上の構成:**
- 総売上高には以下を含む
  - 在庫販売（値入率管理対象）
  - 売上納品
  - 花売上
  - 産直売上

**原価の構成:**
- 総仕入原価には以下を含む
  - 在庫仕入原価
  - 売上納品売上から換算した原価
- 消耗品費は在庫販売に付随する費用として扱う

**売上納品の定義（重要）:**
- 現時点では **売上納品 = 花 + 産直** として扱う（現行HTML準拠）
- 花・産直はそれぞれ売価×掛け率で原価を算出する特殊カテゴリ
- 型定義上は花・産直・売上納品を個別に持ち、**将来的に花・産直以外の売上納品を追加可能**な設計とする

**推定法の対象:**
- 本推定ロジックの対象は**在庫販売のみ**とする
- 花・産直（=売上納品）は、売上・原価・在庫**すべてから除外**する

**用語定義:**

| 用語 | 定義 |
|------|------|
| 売変率 | 売価ベースの値引率 |
| 値入率 | 売価ベースの粗利率 |
| コア売上 | 総売上から花・産直を除外した売上（※現時点では売上納品=花+産直） |
| 粗売上 | 売変前の売価ベース売上 |

#### 3.2.1 在庫法（実績値）

```
■ 売上原価（実績）
  売上原価 = 期首在庫 + 総仕入高 - 期末在庫

■ 粗利益・粗利率（実績）
  粗利益 = 売上高 - 売上原価
  粗利率 = 粗利益 / 売上高
```

> **スコープ**: 全売上・全仕入（花・産直・売上納品を含む全体）が対象。
> 実際の在庫実績に基づく会計的な粗利。

#### 3.2.2 推定法（予測ロジック）

```
■ コア売上の算出
  コア売上 = 総売上 - 花売価 - 産直売価
  ※ 現時点では「売上納品 = 花 + 産直」のため、上記で売上納品も除外される
  ※ 将来、花・産直以外の売上納品が追加される場合は別途減算が必要

■ 粗売上（売変前売価）の算出
  粗売上 = コア売上 / (1 - 売変率)

■ 推定原価（在庫販売分）
  推定原価 = 粗売上 × (1 - 値入率) + 消耗品費
  【重要】コア売上から花・産直（=売上納品）を除外しているため、
          推定原価に花・産直の原価を含めてはならない。
          売上と原価は必ず同一範囲で対応させる。

■ 推定粗利・推定粗利率
  推定粗利   = コア売上 - 推定原価
  推定粗利率 = 推定粗利 / コア売上
```

> **スコープ**: 在庫販売のみ（花・産直を除外）が対象。
> 値入率・売変率から逆算した**推定在庫の算出基礎**であり、実粗利ではない。

#### 3.2.2a 在庫法と推定法の用途分離（最重要）

**在庫法と推定法は目的が根本的に異なる。混同してはならない。**

| | 在庫法 = **実粗利**（損益） | 推定法 = **在庫推定指標**（異常検知） |
|---|---|---|
| **本質** | **損益計算**（売上 - 売上原価） | **在庫推定**（推定期末在庫の算出基礎） |
| **目的** | 実際の粗利益を確認する | 推定在庫と実績在庫を比較し、見えない損失・異常がないか計る |
| **対象スコープ** | 全売上・全仕入（花・産直含む全体） | 在庫販売のみ（花・産直除外） |
| **売上の範囲** | 総売上高 | コア売上 |
| **原価の算出** | 期首在庫 + 総仕入高 - 期末在庫 | 粗売上 ×(1-値入率) + 消耗品費 |
| **算出根拠** | 実際の在庫増減（実績値） | 値入率・売変率からの逆算（理論値） |
| **必要データ** | 期首在庫・期末在庫（実績）が必須 | 値入率・売変率があれば算出可能 |

**実務上の使い分け:**
- **実粗利を見たい** → 在庫法（`invMethod*`）のみを参照
- **在庫差異を検知したい** → 推定法（`estMethod*`）で推定期末在庫を算出し、実績期末在庫と比較
  - ズレが大きい → 売変差・値入差・数量差（ロス）等の可能性
  - ズレが小さい → 在庫管理が適正
- 推定法の数値を**実粗利として画面に表示してはならない**（あくまで推定指標）

#### 3.2.3 売変影響額（原価ベース）

```
■ 売変ロス原価
  売変ロス原価 = (1 - 値入率) × コア売上 × 売変率 / (1 - 売変率)

■ 意味
  売変（値引）によって失われた売価を、原価換算した金額。
  在庫評価・在庫差異分析の補助指標として使用可能。
```

#### 3.2.4 推定期末在庫（原価）

```
■ 算出式
  推定期末在庫 = 期首在庫（在庫販売分） + 期中仕入原価（在庫販売分） - 推定原価
  ※ 期中仕入原価から花・産直（=売上納品）の仕入分は除外して使用すること
```

#### 3.2.5 差異分析の基本分解（参考）

```
■ 差異分解
  実績期末在庫 - 推定期末在庫 = 売変差 + 値入差 + 数量差 + その他差異

  本仕様は、売変差・値入差を明確に分離できる設計となっている。
```

#### 3.2.6 仕様上の原則（最重要）

1. **売上・原価・在庫は必ず同一範囲で対応させる**
2. **値入率は在庫販売のみに適用する**
3. **管理対象外売上（花・産直 = 売上納品）は完全に切り離す**
4. **推定ロジックは在庫評価・経営判断用であり、会計仕訳そのものではない**

> **付記**: 本仕様に基づく推定在庫・推定粗利は、
> 月次速報、棚卸前の異常検知、売変影響分析に使用することを想定する。

#### 3.2.7 予算分析
- 月間予算消化率（日別累計 vs 予算累計）
- 営業日ベースの進捗率
- 月末予測（営業日平均 × 残日数）
- 予算達成率

#### 3.2.8 週間予測
- 月間カレンダー（月曜始まり）
- 週単位の売上・粗利集計
- 曜日別平均
- 異常値検出（平均±標準偏差からの乖離）

#### 3.2.9 全店集計
- 個別店舗データの自動合算
- 日別・帳合別・取引先別の集計
- 店間移動の集約
- **集計方式**:
  - 金額項目（売上・原価・粗利・在庫等）: **単純合計**
  - 率項目（値入率・売変率等）: **売上高加重平均**
  - 加重平均の除数が0の場合: `null` を返す

#### 3.2.10 エッジケース処理仕様

##### (1) ゼロ除算の防止

全ての除算に対しガード条件を適用する:

| 計算 | ガード条件 | フォールバック値 |
|------|-----------|-----------------|
| 粗利率 = 粗利 / 売上高 | `totalSales > 0` | `0` |
| 売変率 = 売変額 / (売上 + 売変額) | `(sales + discount) > 0` | `0` |
| 値入率 = (売価 - 原価) / 売価 | `corePrice > 0` | グローバル設定の `marginRate` |
| 予算達成率 = 売上 / 予算 | `budget > 0` | `0` |
| 粗売上 = コア売上 / (1 - 売変率) | `(1 - discountRate) > 0` | `コア売上`（売変率0扱い） |
| 売変ロス原価の除数 | `(1 - baihenRate)` が0 | `1` をフォールバック |

##### (2) 売上納品超過（コア売上がマイナスになるケース）

花売上 + 産直売上が総売上を超える場合:

```
if (coreSales < 0) {
  overDelivery = true;
  overDeliveryAmount = -coreSales;  // 超過分を記録
  coreSales = 0;                     // 0にクランプ
}
```

- **警告**: セッション中1回のみトースト表示
- **影響**: 推定原価計算はコア売上=0で実行される

##### (3) Null/NaN/Undefined の統一処理

```typescript
// 安全な数値変換
function safeNumber(n: unknown): number {
  return (n == null || isNaN(Number(n))) ? 0 : Number(n);
}

// 表示用フォーマット（null/NaN → '-'）
function formatCurrency(n: number | null): string {
  return (n == null || isNaN(n)) ? '-' : Math.round(n).toLocaleString('ja-JP');
}

function formatPercent(n: number | null, decimals = 2): string {
  return (n == null || isNaN(n)) ? '-' : (n * 100).toFixed(decimals) + '%';
}
```

##### (4) 負の値の取り扱い

| データ | 処理 |
|--------|------|
| 売変額 | **絶対値**で格納: `Math.abs(value)` |
| 店間入（原価・売価） | **絶対値**: `Math.abs(value)` |
| 店間出（原価・売価） | **負の絶対値**: `-Math.abs(value)` |
| 在庫値 | 負値を許容（棚卸差異等の表現） |

##### (5) データ欠損時のフォールバック

| データ | フォールバック |
|--------|---------------|
| 期首在庫 | `null` → 推定在庫計算スキップ |
| 期末在庫 | `null` → 在庫法粗利計算スキップ |
| 売変データ | 売変率 = 0 として計算続行 |
| 予算データ | デフォルト予算（6,450,000）を使用 |
| 値入率（個別） | グローバルデフォルト値入率（0.26）を使用 |
| 花掛け率 | デフォルト 0.80（範囲制限: 0〜1.2） |
| 産直掛け率 | デフォルト 0.85（範囲制限: 0〜1.2） |

#### 3.2.11 数値フォーマット仕様

| 種別 | フォーマット | 例 |
|------|------------|-----|
| 金額（通常） | 四捨五入 → カンマ区切り（`ja-JP`） | `1,234,567` |
| 金額（万円表示） | ÷10,000 → 四捨五入 → ±符号 → `万円` | `+123万円` |
| 率（パーセント） | ×100 → 小数2桁 → `%` | `25.00%` |
| 率（ポイント差） | ×100 → 小数1桁 → ±符号 → `pt` | `+1.5pt` |
| Null/NaN | `-`（ハイフン） | `-` |

#### 3.2.12 データフロー（トリガーと再計算）

```
ファイルインポート
  ↓
ファイル種別自動判定 → データ解析 → グローバルデータ格納
  ↓
バリデーションチェック（必須ファイル確認）
  ↓
ユーザー操作: 「フォーマット作成」ボタン押下 ← ★ 再計算トリガー
  ↓
全店舗ループ（各店舗 × 日1-31）:
  仕入集計 → 売上集計 → 花/産直集計 → 売変集計 → 店間集計
  → コア売上算出 → 推定原価算出 → 粗利算出
  ↓
全店集計（加重平均）
  ↓
UI描画
```

> **注意**: 設定変更（値入率、掛け率等）後は手動で再計算が必要。自動再計算は行わない。

### 3.3 表示機能（ビュー）

| # | ビュー名 | ID | 説明 |
|---|----------|-----|------|
| 1 | ダッシュボード | `dashboard` | エグゼクティブバー、KPIカード、レンジパネル、チャート |
| 2 | 帳合別 | `category` | 帳合（市場/LFC/サラダクラブ/加工品等）ごとの展開セクション |
| 3 | 週間予測 | `forecast` | 月間カレンダー、週別サマリー、曜日別平均 |
| 4 | 予算分析 | `analysis` | 予算vs実績テーブル、チャート |
| 5 | 日別推移 | `daily` | 日別明細テーブル、累計カラム |
| 6 | 荒利計算 | `summary` | 在庫計算、推定在庫、取引先別合計 |
| 7 | レポート | `reports` | 6種類のレポート生成（日別/週別/月別/帳合別/取引先別/在庫） |

### 3.4 設定機能

| 設定項目 | デフォルト値 | 説明 |
|----------|-------------|------|
| 目標粗利率 | 25.00% | 成功/警告の閾値 |
| 警告しきい値 | 23.00% | この値以下で警告 |
| 花掛け率 | 0.80 | 花の原価率（売価×0.80=原価） |
| 産直掛け率 | 0.85 | 産直の原価率（売価×0.85=原価） |
| デフォルト値入率 | 0.26 | コア商品の値入率 |
| デフォルト予算 | 6,450,000 | 予算ファイル未読込時のフォールバック |

- 全設定はlocalStorageに永続化
- 取引先別の個別設定（値入率、帳合分類）

### 3.5 エクスポート機能
- Excel出力（XLSX形式）
- 印刷対応（@media print最適化）
- レポートプレビューモーダル

### 3.6 UI/UX

- ダーク/ライトテーマ切替（localStorage永続化）
- レスポンシブデザイン（700px / 900px / 1100px / 1200px ブレークポイント）
- トースト通知
- ツールチップ
- ドラッグ＆ドロップ（ファイル、カラム並び替え）

---

## 4. 非機能要件

### 4.1 パフォーマンス
- 初期表示: 1秒以内（静的アセット配信後）
- 計算処理: 10店舗×31日のデータで500ms以内
- メモリ: 200MB以下（大規模データセット処理時）

### 4.2 セキュリティ
- 全データはクライアントサイド処理（サーバー送信なし）
- XSS対策（React標準のエスケープ + DOMPurify検討）
- localStorage暗号化は将来検討

### 4.3 アクセシビリティ
- セマンティックHTML
- WAI-ARIA属性
- キーボードナビゲーション
- カラーコントラスト比4.5:1以上

### 4.4 ブラウザ対応
- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+

---

## 5. アーキテクチャ設計

### 5.1 ディレクトリ構造

```
src/
├── main.tsx                      # エントリーポイント
├── App.tsx                       # ルートコンポーネント
├── vite-env.d.ts
│
├── domain/                       # ★ ドメイン層（フレームワーク非依存）
│   ├── models/                   # 型定義・ドメインモデル
│   │   ├── Store.ts              #   店舗
│   │   ├── Supplier.ts           #   取引先
│   │   ├── DailyRecord.ts        #   日別レコード
│   │   ├── CategoryTotal.ts      #   帳合別合計
│   │   ├── TransferDetail.ts     #   店間/部門間移動
│   │   ├── StoreResult.ts        #   店舗別計算結果
│   │   ├── BudgetData.ts         #   予算データ
│   │   ├── Settings.ts           #   アプリ設定
│   │   └── index.ts
│   │
│   ├── calculations/             # ★ ビジネスロジック（純粋関数）
│   │   ├── invMethod.ts          #   在庫法: 実績粗利（全体スコープ）
│   │   ├── estMethod.ts          #   推定法: 推定粗利・推定在庫（在庫販売スコープ）
│   │   ├── budgetAnalysis.ts     #   予算分析
│   │   ├── forecast.ts           #   予測・異常値検出
│   │   ├── aggregation.ts        #   全店集計
│   │   ├── discountImpact.ts     #   売変影響分析
│   │   └── index.ts
│   │
│   └── constants/                # 定数
│       ├── categories.ts         #   帳合カテゴリ
│       └── defaults.ts           #   デフォルト値
│
├── infrastructure/               # ★ インフラ層
│   ├── fileImport/               # ファイル読み込み
│   │   ├── FileTypeDetector.ts   #   ファイル種別判定
│   │   ├── CsvParser.ts          #   CSV解析
│   │   ├── XlsxParser.ts         #   Excel解析
│   │   ├── ImportService.ts      #   インポート統合サービス
│   │   └── errors.ts             #   インポートエラー型
│   │
│   ├── dataProcessing/           # データ加工
│   │   ├── PurchaseProcessor.ts  #   仕入データ処理
│   │   ├── SalesProcessor.ts     #   売上データ処理
│   │   ├── DiscountProcessor.ts  #   売変データ処理
│   │   ├── SettingsProcessor.ts  #   初期設定処理
│   │   ├── BudgetProcessor.ts    #   予算データ処理
│   │   ├── TransferProcessor.ts  #   店間移動処理
│   │   ├── SpecialSalesProcessor.ts # 花・産直処理
│   │   └── ConsumableProcessor.ts   # 消耗品処理
│   │
│   ├── export/                   # エクスポート
│   │   ├── ExcelExporter.ts
│   │   └── ReportGenerator.ts
│   │
│   └── storage/                  # 永続化
│       └── LocalStorageAdapter.ts
│
├── application/                  # ★ アプリケーション層
│   ├── hooks/                    # カスタムフック
│   │   ├── useAppState.ts        #   グローバル状態管理
│   │   ├── useFileImport.ts      #   ファイルインポート
│   │   ├── useCalculation.ts     #   計算実行
│   │   ├── useSettings.ts        #   設定管理
│   │   ├── useTheme.ts           #   テーマ切替
│   │   └── useStoreSelection.ts  #   店舗選択
│   │
│   ├── context/                  # Reactコンテキスト
│   │   ├── AppStateContext.tsx
│   │   └── ThemeContext.tsx
│   │
│   └── services/                 # アプリケーションサービス
│       └── CalculationOrchestrator.ts # 計算フロー制御
│
├── presentation/                 # ★ プレゼンテーション層
│   ├── components/               # 共通UIコンポーネント
│   │   ├── Layout/
│   │   │   ├── AppShell.tsx      #   3カラムレイアウト
│   │   │   ├── NavBar.tsx        #   左ナビ
│   │   │   ├── Sidebar.tsx       #   サイドバー
│   │   │   └── TopBar.tsx        #   トップバー
│   │   │
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Chip.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── DropZone.tsx
│   │   │
│   │   ├── charts/
│   │   │   ├── BudgetVsActualChart.tsx
│   │   │   ├── GrossProfitRateChart.tsx
│   │   │   ├── DailySalesChart.tsx
│   │   │   └── InventoryChart.tsx
│   │   │
│   │   ├── kpi/
│   │   │   ├── KpiCard.tsx
│   │   │   ├── KpiGrid.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── ExecutiveBar.tsx
│   │   │
│   │   └── fileImport/
│   │       ├── UploadGrid.tsx
│   │       ├── UploadCard.tsx
│   │       └── FileDropZone.tsx
│   │
│   ├── views/                    # ページビュー
│   │   ├── DashboardView.tsx
│   │   ├── CategoryView.tsx
│   │   ├── ForecastView.tsx
│   │   ├── BudgetAnalysisView.tsx
│   │   ├── DailyTrendView.tsx
│   │   ├── GrossProfitCalcView.tsx
│   │   └── ReportsView.tsx
│   │
│   ├── modals/                   # モーダルダイアログ
│   │   ├── SettingsModal.tsx
│   │   ├── SupplierSettingsModal.tsx
│   │   ├── ConsumableModal.tsx
│   │   ├── ValidationModal.tsx
│   │   ├── ReportPreviewModal.tsx
│   │   └── ColumnConfigModal.tsx
│   │
│   └── styles/                   # グローバルスタイル
│       ├── theme.ts              #   テーマ定義（dark/light）
│       ├── GlobalStyle.ts        #   styled-components グローバル
│       └── mixins.ts             #   共通スタイルMixin
│
├── __tests__/                    # テスト
│   ├── domain/
│   │   ├── calculations/
│   │   │   ├── invMethod.test.ts
│   │   │   ├── estMethod.test.ts
│   │   │   ├── budgetAnalysis.test.ts
│   │   │   ├── forecast.test.ts
│   │   │   └── aggregation.test.ts
│   │   └── models/
│   │       └── StoreResult.test.ts
│   │
│   ├── infrastructure/
│   │   ├── fileImport/
│   │   │   ├── CsvParser.test.ts
│   │   │   ├── FileTypeDetector.test.ts
│   │   │   └── ImportService.test.ts
│   │   └── dataProcessing/
│   │       ├── PurchaseProcessor.test.ts
│   │       ├── SalesProcessor.test.ts
│   │       └── DiscountProcessor.test.ts
│   │
│   └── presentation/
│       └── components/
│           ├── KpiCard.test.tsx
│           └── DataTable.test.tsx
│
└── types/                        # グローバル型定義
    └── xlsx.d.ts                 #   SheetJS型拡張
```

### 5.2 レイヤードアーキテクチャ

```
┌─────────────────────────────────────────────┐
│            Presentation Layer               │
│   (React Components, Views, Styled)         │
├─────────────────────────────────────────────┤
│            Application Layer                │
│   (Hooks, Context, Orchestrator)            │
├─────────────────────────────────────────────┤
│              Domain Layer                   │
│   (Models, Calculations, Constants)         │
│   ★ フレームワーク非依存・純粋関数          │
├─────────────────────────────────────────────┤
│          Infrastructure Layer               │
│   (File I/O, Parsers, Export, Storage)      │
└─────────────────────────────────────────────┘
```

**依存方向**: Presentation → Application → Domain ← Infrastructure

Domain層は他のどの層にも依存しない（依存性逆転の原則）。

### 5.3 設計原則

| 原則 | 適用箇所 |
|------|----------|
| **単一責任原則 (SRP)** | 各Processorは1種類のデータのみ処理 |
| **開放閉鎖原則 (OCP)** | カテゴリ追加時にCalculation変更不要 |
| **依存性逆転 (DIP)** | Domain層はインフラに依存しない |
| **インターフェース分離 (ISP)** | Parserインターフェースを細分化 |
| **純粋関数** | 全計算ロジックは副作用なし |
| **イミュータブル** | Readonly型の活用、状態変更はReducer経由 |

### 5.4 状態管理設計

```typescript
// アプリケーション状態の型定義
interface AppState {
  // データ
  rawData: RawDataState;
  stores: ReadonlyMap<string, Store>;
  suppliers: ReadonlyMap<string, Supplier>;

  // 計算結果
  storeResults: ReadonlyMap<string, StoreResult>;

  // UI状態
  ui: {
    currentStoreId: string;         // 'all' | store ID
    currentView: ViewType;
    theme: 'dark' | 'light';
  };

  // 設定
  settings: AppSettings;
}

type AppAction =
  | { type: 'IMPORT_DATA'; payload: { dataType: DataType; rows: unknown[][] } }
  | { type: 'SET_STORE'; payload: string }
  | { type: 'SET_VIEW'; payload: ViewType }
  | { type: 'CALCULATE'; payload: CalculationResult }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'TOGGLE_THEME' }
  | { type: 'RESET' };
```

---

## 6. 変数名・命名規則の見直し

### 6.1 命名変換マップ（主要なもの）

| 旧名（現行HTML） | 新名（TypeScript） | 型 | 説明 |
|-------------------|--------------------|----|------|
| `DATA` | `rawData` | `RawDataState` | 生データストア |
| `STORES` | `stores` | `Map<string, Store>` | 店舗マスタ |
| `SUPPLIERS` | `suppliers` | `Map<string, Supplier>` | 取引先マスタ |
| `STORE_INVENTORY` | `storeInventory` | `Map<string, InventoryConfig>` | 在庫設定 |
| `STORE_BUDGET` | `storeBudget` | `Map<string, BudgetConfig>` | 予算設定 |
| `result` | `storeResults` | `Map<string, StoreResult>` | 計算結果 |
| `currentStore` | `currentStoreId` | `string` | 選択中店舗 |
| `currentView` | `currentView` | `ViewType` | 表示中ビュー |
| `shiire` | `purchase` | - | 仕入 → 購入 |
| `uriage` | `sales` | - | 売上 |
| `baihen` | `discount` | - | 売変 → 値引 |
| `tenkanIn/Out` | `interStoreIn/Out` | - | 店間移動 |
| `catTotals` | `categoryTotals` | `Map<string, CategoryTotal>` | 帳合別合計 |
| `supTotals` | `supplierTotals` | `Map<string, SupplierTotal>` | 取引先別合計 |
| `invStart/invEnd` | `openingInventory/closingInventory` | `number` | 期首/期末在庫 |
| `gpBudget` | `grossProfitBudget` | `number` | 粗利予算 |
| `gpRateBudget` | `grossProfitRateBudget` | `number` | 粗利率予算 |
| `grossProfit` (在庫法) | `invMethodGrossProfit` | `number` | 在庫法: 粗利益（全体スコープ） |
| `grossProfitRate` (在庫法) | `invMethodGrossProfitRate` | `number` | 在庫法: 粗利率（分母=総売上高） |
| `estimatedGP` (推定法) | `estMethodMargin` | `number` | 推定法: 推定マージン（※実粗利ではない、在庫推定指標） |
| `estimatedGPRate` (推定法) | `estMethodMarginRate` | `number` | 推定法: 推定マージン率（※実粗利率ではない） |
| `estimatedCogs` | `estMethodCogs` | `number` | 推定法: 推定原価 |
| `estimatedInv` | `estMethodClosingInventory` | `number` | 推定法: 推定期末在庫 |
| `baihenLossCost` | `discountLossCost` | `number` | 売変ロス原価 |
| `coreMarginRate` | `coreMarkupRate` | `number` | コア値入率 |
| `hanaRate` | `flowerCostRate` | `number` | 花掛け率 |
| `sanchokuRate` | `directProduceCostRate` | `number` | 産直掛け率 |

### 6.2 命名規約

| 対象 | 規約 | 例 |
|------|------|-----|
| 型/インターフェース | PascalCase | `StoreResult`, `DailyRecord` |
| 変数/関数 | camelCase | `calculateGrossProfit()` |
| 定数 | UPPER_SNAKE_CASE | `DEFAULT_MARKUP_RATE` |
| ファイル名 | PascalCase (コンポーネント), camelCase (関数) | `KpiCard.tsx`, `grossProfit.ts` |
| テストファイル | `*.test.ts` / `*.test.tsx` | `grossProfit.test.ts` |
| 型ファイル | PascalCase | `StoreResult.ts` |
| Enum値 | PascalCase | `ViewType.Dashboard` |
| boolean変数 | `is`/`has`/`should` prefix | `isLoaded`, `hasData` |

---

## 7. 型設計（主要モデル）

### 7.1 コアモデル

```typescript
// 店舗
interface Store {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

// 取引先
interface Supplier {
  readonly code: string;
  readonly name: string;
  readonly category: CategoryType;
  readonly markupRate?: number;
}

// 帳合カテゴリ
type CategoryType =
  | 'market'           // 市場
  | 'lfc'              // LFC
  | 'saladClub'        // サラダクラブ
  | 'processed'        // 加工品
  | 'directDelivery'   // 直伝
  | 'flowers'          // 花
  | 'directProduce'    // 産直
  | 'consumables'      // 消耗品
  | 'interStore'       // 店間移動
  | 'interDepartment'  // 部門間移動
  | 'other';           // その他

// 日別レコード
interface DailyRecord {
  readonly day: number;                              // 1-31
  readonly sales: number;                            // 売上高（総売上）
  readonly coreSales: number;                       // コア売上（花・産直・売上納品除外）
  readonly grossSales: number;                      // 粗売上（売変前売価）
  readonly purchase: CostPricePair;                  // 仕入（原価/売価）
  readonly deliverySales: CostPricePair;            // 売上納品（原価/売価）
  readonly interStoreIn: CostPricePair;             // 店間入
  readonly interStoreOut: CostPricePair;            // 店間出
  readonly interDepartmentIn: CostPricePair;        // 部門間入
  readonly interDepartmentOut: CostPricePair;       // 部門間出
  readonly flowers: CostPricePair;                  // 花
  readonly directProduce: CostPricePair;            // 産直
  readonly consumable: ConsumableDailyRecord;       // 消耗品
  readonly discountAmount: number;                  // 売変額
  readonly discountAbsolute: number;                // 売変絶対値
  readonly supplierBreakdown: ReadonlyMap<string, CostPricePair>;
}

// 原価・売価ペア
interface CostPricePair {
  readonly cost: number;    // 原価金額
  readonly price: number;   // 売価金額
}

// 消耗品日別
interface ConsumableDailyRecord {
  readonly cost: number;
  readonly items: readonly ConsumableItem[];
}

// 店舗別計算結果
interface StoreResult {
  readonly storeId: string;

  // ============================================================
  // 在庫（実績）
  // ============================================================
  readonly openingInventory: number;          // 期首在庫
  readonly closingInventory: number;          // 期末在庫（実績）

  // ============================================================
  // 売上
  // ============================================================
  readonly totalSales: number;                // 総売上高（全体 = コア + 花 + 産直 + 売上納品）
  readonly totalCoreSales: number;            // コア売上（花・産直・売上納品除外）
  readonly deliverySalesPrice: number;        // 売上納品売価
  readonly flowerSalesPrice: number;          // 花売価
  readonly directProduceSalesPrice: number;   // 産直売価
  readonly grossSales: number;                // 粗売上（売変前売価）

  // ============================================================
  // 原価
  // ============================================================
  readonly totalCost: number;                 // 総仕入原価（全体）
  readonly inventoryCost: number;             // 在庫仕入原価（売上納品分除外）
  readonly deliverySalesCost: number;         // 売上納品原価

  // ============================================================
  // 【在庫法】実績粗利  ← スコープ: 全売上・全仕入
  //   売上原価 = 期首在庫 + 総仕入高 - 期末在庫
  //   粗利益   = 総売上高 - 売上原価
  //   粗利率   = 粗利益 / 総売上高
  // ============================================================
  readonly invMethodCogs: number;             // 在庫法: 売上原価
  readonly invMethodGrossProfit: number;      // 在庫法: 粗利益
  readonly invMethodGrossProfitRate: number;  // 在庫法: 粗利率（分母=総売上高）

  // ============================================================
  // 【推定法】在庫推定指標  ← スコープ: 在庫販売のみ（花・産直除外）
  //   ※ 実粗利ではない。推定期末在庫の算出基礎として使用する。
  //   ※ 推定在庫と実績在庫を比較し、見えない損失・異常を検知するための指標。
  //   推定原価 = 粗売上 × (1 - 値入率) + 消耗品費
  //   推定マージン = コア売上 - 推定原価
  //   推定期末在庫 = 期首在庫 + 期中仕入原価(在庫販売分) - 推定原価
  // ============================================================
  readonly estMethodCogs: number;             // 推定法: 推定原価
  readonly estMethodMargin: number;           // 推定法: 推定マージン（コア売上-推定原価）※実粗利ではない
  readonly estMethodMarginRate: number;       // 推定法: 推定マージン率（分母=コア売上）※実粗利率ではない
  readonly estMethodClosingInventory: number; // 推定法: 推定期末在庫（※3.2.4参照）← 本来の主目的

  // ============================================================
  // 売変
  // ============================================================
  readonly totalDiscount: number;             // 売変額合計
  readonly discountRate: number;              // 売変率（売価ベース）
  readonly discountLossCost: number;          // 売変ロス原価

  // ============================================================
  // 値入率
  // ============================================================
  readonly averageMarkupRate: number;         // 平均値入率（全体）
  readonly coreMarkupRate: number;            // コア値入率（在庫販売対象）

  // ============================================================
  // 消耗品
  // ============================================================
  readonly totalConsumable: number;           // 消耗品費合計
  readonly consumableRate: number;            // 消耗品率

  // ============================================================
  // 予算
  // ============================================================
  readonly budget: number;
  readonly grossProfitBudget: number;
  readonly grossProfitRateBudget: number;
  readonly budgetDaily: ReadonlyMap<number, number>;

  // ============================================================
  // 日別データ
  // ============================================================
  readonly daily: ReadonlyMap<number, DailyRecord>;

  // ============================================================
  // 集計
  // ============================================================
  readonly categoryTotals: ReadonlyMap<CategoryType, CostPricePair>;
  readonly supplierTotals: ReadonlyMap<string, SupplierTotal>;
  readonly transferDetails: TransferDetails;

  // ============================================================
  // 予測・KPI
  // ============================================================
  readonly elapsedDays: number;               // 経過日数
  readonly salesDays: number;                 // 営業日数
  readonly averageDailySales: number;         // 日平均売上
  readonly projectedSales: number;            // 月末予測売上
  readonly projectedAchievement: number;      // 予算達成率予測
}
```

---

## 8. フェーズ別実装計画

### Phase 1: プロジェクト基盤構築

**目標**: ビルド・テスト・デプロイのパイプライン確立

| # | タスク | 成果物 |
|---|--------|--------|
| 1-1 | Vite + React + TypeScriptプロジェクト初期化 | `package.json`, `tsconfig.json`, `vite.config.ts` |
| 1-2 | ESLint + Prettier設定 | `.eslintrc.cjs`, `.prettierrc` |
| 1-3 | Vitest設定 | `vitest.config.ts` |
| 1-4 | styled-components設定 + テーマ定義 | `theme.ts`, `GlobalStyle.ts` |
| 1-5 | GitHub Actions CI/CD | `.github/workflows/deploy.yml` |
| 1-6 | GitHub Pages用ビルド設定 | `vite.config.ts` (base path) |
| 1-7 | ディレクトリ構造の作成 | 空の構造 + index.ts |

**完了基準**: `npm run build` 成功 & GitHub Pagesデプロイ動作確認

---

### Phase 2: ドメイン層実装（型定義 + 計算ロジック）

**目標**: フレームワーク非依存のビジネスロジック完成 + テスト

| # | タスク | テスト |
|---|--------|--------|
| 2-1 | 全型定義（models/） | 型チェック通過 |
| 2-2 | 定数定義（categories, defaults） | - |
| 2-3 | `invMethod.ts` - 在庫法: 実績粗利（全体スコープ） | 10+ テストケース |
| 2-4 | `estMethod.ts` - 推定法: 推定粗利・推定在庫（在庫販売スコープ） | 10+ テストケース |
| 2-5 | `budgetAnalysis.ts` - 予算分析 | 8+ テストケース |
| 2-6 | `forecast.ts` - 予測・異常値検出 | 8+ テストケース |
| 2-7 | `aggregation.ts` - 全店集計 | 5+ テストケース |
| 2-8 | `discountImpact.ts` - 売変影響 | 5+ テストケース |

**完了基準**: 全テスト通過、カバレッジ80%以上

---

### Phase 3: インフラ層実装（ファイル解析 + データ処理）

**目標**: ファイル読み込み → データオブジェクト変換

| # | タスク | テスト |
|---|--------|--------|
| 3-1 | `CsvParser.ts` | 5+ テストケース |
| 3-2 | `XlsxParser.ts` | 3+ テストケース |
| 3-3 | `FileTypeDetector.ts` | 10+ テストケース（全ファイル種別） |
| 3-4 | `ImportService.ts` | 統合テスト |
| 3-5 | `PurchaseProcessor.ts` | 8+ テストケース |
| 3-6 | `SalesProcessor.ts` | 5+ テストケース |
| 3-7 | `DiscountProcessor.ts` | 5+ テストケース |
| 3-8 | `SettingsProcessor.ts` | 3+ テストケース |
| 3-9 | `BudgetProcessor.ts` | 3+ テストケース |
| 3-10 | `TransferProcessor.ts` | 5+ テストケース |
| 3-11 | `SpecialSalesProcessor.ts`（花・産直） | 4+ テストケース |
| 3-12 | `ConsumableProcessor.ts` | 3+ テストケース |
| 3-13 | `ExcelExporter.ts` | 基本テスト |
| 3-14 | `LocalStorageAdapter.ts` | 3+ テストケース |

**完了基準**: CSV/XLSXファイル → 型付きオブジェクト変換テスト通過

---

### Phase 4: アプリケーション層 + 状態管理

**目標**: React Context + Hooks で状態フロー確立

| # | タスク |
|---|--------|
| 4-1 | `AppStateContext.tsx` - Reducer + Provider |
| 4-2 | `ThemeContext.tsx` - テーマ管理 |
| 4-3 | `useAppState.ts` - 状態参照フック |
| 4-4 | `useFileImport.ts` - インポートフロー |
| 4-5 | `useCalculation.ts` - 計算トリガー |
| 4-6 | `useSettings.ts` - 設定永続化 |
| 4-7 | `useTheme.ts` - テーマ切替 |
| 4-8 | `useStoreSelection.ts` - 店舗切替 |
| 4-9 | `CalculationOrchestrator.ts` - 計算フロー統合 |

**完了基準**: フック経由でデータインポート→計算→結果取得のフローが動作

---

### Phase 5: プレゼンテーション層（UI実装）

**目標**: 全ビューのUI実装

| # | サブフェーズ | コンポーネント |
|---|-------------|---------------|
| 5-1 | レイアウト基盤 | AppShell, NavBar, Sidebar, TopBar |
| 5-2 | 共通コンポーネント | Button, Card, Modal, Toast, DataTable, DropZone, etc. |
| 5-3 | ファイルインポートUI | UploadGrid, UploadCard, FileDropZone |
| 5-4 | ダッシュボード | ExecutiveBar, KpiGrid, KpiCard, チャート |
| 5-5 | 帳合別ビュー | CategoryView + 展開セクション |
| 5-6 | 週間予測ビュー | ForecastView + カレンダー |
| 5-7 | 予算分析ビュー | BudgetAnalysisView + テーブル |
| 5-8 | 日別推移ビュー | DailyTrendView + チャート |
| 5-9 | 荒利計算ビュー | GrossProfitCalcView |
| 5-10 | レポートビュー | ReportsView + レポートモーダル |
| 5-11 | モーダル群 | Settings, Supplier, Consumable, Validation, etc. |

**完了基準**: 全画面が表示され、データ入力→計算→表示の全フローが動作

---

### Phase 6: チャート・ビジュアライゼーション

**目標**: SVGチャートの実装

| # | タスク |
|---|--------|
| 6-1 | BudgetVsActualChart（予算vs実績累計折れ線） |
| 6-2 | GrossProfitRateChart（日別粗利率棒グラフ） |
| 6-3 | DailySalesChart（売上推移＋売変率オーバーレイ） |
| 6-4 | InventoryChart（在庫推移） |

---

### Phase 7: 品質向上 + 最終調整

| # | タスク |
|---|--------|
| 7-1 | E2Eテスト（Playwright検討） |
| 7-2 | パフォーマンス最適化（React.memo, useMemo） |
| 7-3 | アクセシビリティ対応 |
| 7-4 | レスポンシブ最終調整 |
| 7-5 | 印刷スタイル対応 |
| 7-6 | エラーバウンダリ実装 |
| 7-7 | ドキュメント整備 |

---

## 9. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 元HTMLの計算ロジックにバグがある可能性 | 高 | テストケースで既存挙動を検証後、修正 |
| XLSX外部ライブラリのバンドルサイズ | 中 | 遅延読み込み + tree shaking |
| 大量データでのパフォーマンス劣化 | 中 | Web Worker検討、計算結果キャッシュ |
| styled-componentsのSSR非対応 | 低 | GitHub Pages（SPA）では問題なし |
| 元HTMLの未ドキュメント仕様の見落とし | 高 | テストファーストで既存挙動を記録 |

---

## 10. 用語集

| 日本語 | 英語 | 説明 |
|--------|------|------|
| 仕入 | Purchase | 商品の仕入れ（原価・売価） |
| 売上 | Sales | 販売金額 |
| 粗利/荒利 | Gross Profit | 売上 - 売上原価 |
| 粗利率 | Gross Profit Rate | 粗利 / 売上 |
| 値入率 | Markup Rate | (売価 - 原価) / 売価 |
| 売変 | Discount / Price Adjustment | 値引・割引 |
| 帳合 | Category / Supplier Group | 取引先の分類 |
| 店間移動 | Inter-store Transfer | 店舗間の商品移動 |
| 部門間移動 | Inter-department Transfer | 部門間の商品移動 |
| 花 | Flowers | 花卉（特殊原価計算） |
| 産直 | Direct Produce | 産地直送品（特殊原価計算） |
| 消耗品 | Consumables | 消耗品費（直接経費） |
| 期首在庫 | Opening Inventory | 月初の在庫金額 |
| 期末在庫 | Closing Inventory | 月末の在庫金額 |
| 掛け率 | Cost Rate | 売価に対する原価の比率 |
