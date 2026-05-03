# Authoritative/Exploratory 表示ルール

## 目的

MetricResolution の status / authoritativeAccepted / exploratoryAllowed / warnings の
組み合わせに対する UI 表示ルールを一元定義し、画面ごとのブレを防ぐ。

## 表示ルール表

| status | authoritativeAccepted | exploratoryAllowed | 値表示 | WarningBadge | ReferenceBadge | displayMode |
|---|---|---|---|---|---|---|
| ok | true | true | 通常表示 | なし | なし | `authoritative` |
| ok + warning(info) | true | true | 通常表示 | info（青） | なし | `authoritative` |
| partial | false | true | 通常表示 | warning severity | なし | `reference` |
| partial + policy許可 | true | true | 通常表示 | warning severity | なし | `authoritative` |
| estimated | false | true | 通常表示 | info | なし | `reference` |
| estimated + policy許可 | true | true | 通常表示 | info | なし | `authoritative` |
| fallback (zero) | true | true | 通常表示 | なし | なし | `authoritative` |
| fallback (null) | false | false | `—` | なし | なし | `hidden` |
| invalid | false | false | `—` | なし | なし | `hidden` |
| invalid + policy許可 | false | true | 灰色表示 | critical | なし | `reference` |

## displayMode の定義

| displayMode | 意味 | 値の扱い | 視覚表現 |
|---|---|---|---|
| `authoritative` | 正式値として採用 | そのまま表示 | 通常色 |
| `reference` | 参考値として表示 | 表示するが参考扱い | ReferenceBadge or WarningBadge |
| `hidden` | 値を表示しない | `—` または非表示 | — |

### displayMode 決定ロジック

```
if (status === 'invalid' && !exploratoryAllowed) → 'hidden'
if (authoritativeAccepted) → 'authoritative'
if (exploratoryAllowed) → 'reference'
else → 'hidden'
```

## KpiCard props 契約

| prop | 型 | 意味 |
|---|---|---|
| `warning` | `KpiWarningInfo \| undefined` | warning があれば severity / label / message |
| `isReference` | `boolean` | authoritative でなく exploratory な値 |
| `displayMode` | `'authoritative' \| 'reference' \| 'hidden'` | 表示モード（上記ロジックで決定） |

### 表示優先順位

1. `displayMode === 'hidden'` → 値を `—` 表示、badge なし
2. `warning` あり → WarningBadge を表示（severity で色分け）
3. `isReference` かつ warning なし → ReferenceBadge を表示
4. それ以外 → 通常表示

## WarningBadge / ReferenceBadge の役割分担

| バッジ | 役割 | 条件 | 色 |
|---|---|---|---|
| WarningBadge | **問題の種類**を示す | warning がある場合 | critical=赤, warning=橙, info=青 |
| ReferenceBadge | **値の立場**を示す | isReference かつ warning なし | 灰色 |

**鉄則:**
- WarningBadge = 「何が問題か」
- ReferenceBadge = 「この値は参考値」
- 両方同時には表示しない（warning があれば WarningBadge を優先）

## MetricBreakdownPanel の表現ルール

| 条件 | FormulaTab 内の表示 |
|---|---|
| warnings あり | 警告セクションに WarningAlertBox（severity 別色分け） |
| authoritativeAccepted=false | 式の説明に「参考値」の注記を含めてよい |
| invalid | 「計算条件不足」または「計算不能」のメッセージ |

### Explanation 文章の注意

- reference 値を authoritative な口調で説明しない
- warning の有無で文章トーンがバラバラにならない
- 値そのものは StoreResult からそのまま使う（再計算しない）

## 適用対象画面

### 優先度 High（Phase 5 で適用）

- registryKpiWidgets — 推定マージン、売変ロス原価、値入率
- KpiCard 共通 — displayMode による表示制御
- MetricBreakdownPanel — 警告セクション

### 優先度 Medium（将来適用）

- ExecSummaryBar — 粗利率カード
- 予測系サマリー — projectedSales, projectedAchievement
- 部門別 KPI — departmentKpi

### 優先度 Low（必要に応じて）

- チャート内のラベル・凡例
- CSV エクスポート時の注記
