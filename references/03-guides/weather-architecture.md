# 天気データアーキテクチャ

## 1. 概要

天気データは以下のパイプラインで UI に到達する:

```
気象庁 ETRN API → パース → DuckDB (weather_hourly) → Domain 集約 → UI 表示
```

### データフロー全体像

```
[気象庁 ETRN]          外部 API（過去実測値 1977年〜昨日）
      │
      ▼
[Infrastructure]       ETRN クライアント: HTML テーブルをフェッチ・パース
      │
      ▼
[DuckDB]               weather_hourly テーブルに永続化
      │
      ▼
[Domain]               aggregateHourlyToDaily: 時間別 → 日別サマリ集約（純粋関数）
      │
      ▼
[Application]          WeatherLoadService: オーケストレーション
      │                hooks: UI 向けデータ供給
      ▼
[Presentation]         チャート・ウィジェット表示
```

**設計原則:**
- Domain 層の計算は純粋関数（副作用なし・外部依存なし）
- UI は hook 経由でデータを受け取るのみ（禁止事項 #6, #11）
- 率の直接計算は禁止（禁止事項 #10）— 集約は domain/calculations で実施

---

## 2. データモデル

### HourlyWeatherRecord（時間別天気レコード）

気象庁 ETRN の実測値 1 時間分を表すドメイン型。

| フィールド | 型 | 説明 |
|---|---|---|
| dateKey | string | YYYY-MM-DD |
| hour | number | 1-23（ETRN 時表記そのまま） |
| temperature | number | 気温 °C |
| humidity | number | 湿度 % |
| precipitation | number | 1 時間降水量 mm |
| windSpeed | number | 風速 km/h |
| weatherCode | number | WMO 互換コード（実測値から導出） |
| sunshineDuration | number | 日照時間 seconds |

### DailyWeatherSummary（日別天気サマリ）

時間別レコードから `aggregateHourlyToDaily` で導出される集約型。

| フィールド | 型 | 説明 |
|---|---|---|
| dateKey | string | YYYY-MM-DD |
| temperatureAvg | number | 日平均気温 °C |
| temperatureMax | number | 日最高気温 °C |
| temperatureMin | number | 日最低気温 °C |
| precipitationTotal | number | 日合計降水量 mm |
| humidityAvg | number | 日平均湿度 % |
| windSpeedMax | number | 日最大風速 km/h |
| dominantWeatherCode | number | 最頻出の WMO コード |
| sunshineTotalHours | number | 日照時間合計 hours |
| weatherTextDay? | string | 気象庁天気概況（昼） |
| weatherTextNight? | string | 気象庁天気概況（夜） |

### StoreLocation（店舗位置情報）

ジオコーディング結果と ETRN 観測所解決キャッシュを保持する。

| フィールド | 型 | 説明 |
|---|---|---|
| latitude / longitude | number | 緯度・経度 |
| resolvedName? | string | ジオコーディングで解決された地名 |
| amedasStationId? | string | JMA 観測所番号 |
| amedasStationName? | string | 観測所名 |
| forecastOfficeCode? | string | 府県予報区コード |
| weekAreaCode? | string | 週間予報区域コード |
| etrnPrecNo? | number | ETRN 府県コード |
| etrnBlockNo? | string | ETRN 観測所コード |
| etrnStationType? | 'a1' \| 's1' | AMeDAS or 気象台 |

### DailyForecast（週間天気予報）

気象庁 forecast API の週間予報から抽出。weatherCode は気象庁独自コード体系。

### ForecastAreaResolution / GeocodingResult

予報区域の解決結果・住所検索結果の補助型。

---

## 3. Domain 計算（純粋関数）

**配置:** `domain/calculations/weatherAggregation.ts`

Domain 層の天気計算は全て純粋関数であり、副作用・外部依存を持たない（禁止事項 #5）。

### aggregateHourlyToDaily

```typescript
function aggregateHourlyToDaily(
  records: readonly HourlyWeatherRecord[],
): readonly DailyWeatherSummary[]
```

- 同一 dateKey のレコードをグループ化し、各指標を集計
- 入力の dateKey ソートは不要（内部でソート）
- 出力は dateKey 昇順

### categorizeWeatherCode

```typescript
function categorizeWeatherCode(code: number): WeatherCategory
```

WMO Weather Interpretation Code を 5 カテゴリに分類:
- `0`: sunny
- `1`: sunny, `2-3`: cloudy
- `4-48`: cloudy（霧含む）
- `49-57`: rainy（霧雨）
- `58-67`: rainy（雨）
- 雪系: snowy
- その他: other

### deriveWeatherCode

```typescript
function deriveWeatherCode(
  precipitationMm: number,
  sunshineHours: number,
  temperatureCelsius?: number,
): number
```

降水量・日照時間・気温から WMO 互換コードを導出する。
ETRN の実測値には直接的な天気コードがないため、観測データから推定する。

### toWeatherDisplay

```typescript
function toWeatherDisplay(code: number | null | undefined): WeatherDisplayInfo | null
```

WMO コードを UI 表示用情報（カテゴリ・アイコン・ラベル）に変換する。
`code == null` の場合は `null` を返す（禁止事項 #13 準拠: truthiness 不使用）。

---

## 4. DuckDB: weather_hourly テーブル

**配置:** `infrastructure/duckdb/schemas.ts`

```sql
CREATE TABLE IF NOT EXISTS weather_hourly (
  date_key            VARCHAR NOT NULL,
  year                INTEGER NOT NULL,
  month               INTEGER NOT NULL,
  day                 INTEGER NOT NULL,
  hour                INTEGER NOT NULL,
  store_id            VARCHAR NOT NULL,
  temperature         DOUBLE,
  humidity            DOUBLE,
  precipitation       DOUBLE,
  wind_speed          DOUBLE,
  weather_code        INTEGER,
  sunshine_duration   DOUBLE
)
```

**設計ポイント:**
- `date_key` を主キーとし、月跨ぎでも連続的に保持
- `store_id` で店舗別の天気データを管理（店舗ごとに最寄り観測所が異なる）
- `year` / `month` / `day` を分離して保持（DuckDB クエリでの期間フィルタ最適化）
- 数値カラムは `DOUBLE`（ETRN パース時に欠損の可能性があるため NULL 許容）
- 設計思想 #16 準拠: DuckDB は normalized_records の派生キャッシュ。破損時は再取得で復元可能

---

## 5. Infrastructure: ETRN クライアント

**データソース:** 気象庁 ETRN（過去の気象データ検索）

### 取得フロー

1. **観測所解決（初回のみ）**
   - 店舗の緯度・経度から逆ジオコーディングで都道府県名を取得
   - ETRN 府県マップから最寄り観測所を解決
   - 解決結果は `StoreLocation` にキャッシュ（`etrnPrecNo`, `etrnBlockNo` 等）

2. **データ取得**
   - ETRN 日別 HTML テーブルをフェッチ
   - HTML をパースして `HourlyWeatherRecord` / `DailyWeatherSummary` に変換
   - DuckDB `weather_hourly` テーブルに永続化

**制約:**
- ETRN は過去データのみ提供（1977年〜昨日）
- AMeDAS・予報区域には依存しない（ETRN 独自の観測所体系を使用）

---

## 6. Application: WeatherLoadService, hooks

**配置:** `application/usecases/weather/WeatherLoadService.ts`

### WeatherLoadService

天気データ取得のオーケストレーションを担当する。

```typescript
interface WeatherLoadProgress {
  readonly storeId: string
  readonly status: 'resolving' | 'loading' | 'done' | 'error'
  readonly recordCount: number
  readonly error?: string
  readonly stationName?: string
}
```

**責務:**
- ETRN 観測所の解決（初回 → キャッシュ）
- 月別データの取得・パース
- 進捗状態の管理
- DuckDB への永続化の調停

**層内設計原則の適用:**
- load 系処理は「計画」「取得/補完」「反映」に分離
- データ取得関数内で store 更新・cache clear・UI invalidation を同時に行わない
- facade に業務判断を載せない

### hooks

Presentation 層は Application 層の hook を通じて天気データにアクセスする（禁止事項 #11）。
取得元の切替（DuckDB → ETRN フォールバック等）は hook 内で完結し、UI は取得元を知らない。

---

## 7. Presentation: チャート連携

天気データは売上・来客数との相関分析チャートで使用される。

**表示ルール:**
- `toWeatherDisplay` で WMO コードをアイコン・ラベルに変換
- 気温は °C、降水量は mm、風速は km/h で表示
- 数値表示は `formatCurrency` / `formatPercent` の既存ルールに従う

**レイヤー制約:**
- Presentation は `application/hooks` 経由でのみデータを取得（禁止事項 #6, #11）
- 生データの走査・インライン計算・独自集約は禁止
- 描画は純粋（設計原則 #9: memo + フックで描画と計算を分離）

---

## 8. 禁止事項 #13 との関連

> `number | null` 型の欠損判定に truthiness（`!value` / `if (value)`）を使ってはならない

天気データは禁止事項 #13 が特に重要な領域である:

| フィールド | 0 が有効値である理由 |
|---|---|
| weatherCode | WMO コード `0` = 快晴（Clear sky） |
| temperature | 0°C は有効な気温 |
| precipitation | 0mm は「降水なし」の正当な実測値 |
| humidity | 理論上 0% は有効（実際にはまれ） |
| windSpeed | 0km/h は無風の正当な実測値 |
| sunshineDuration | 0 秒は「日照なし」の正当な実測値 |

**正しい欠損判定:**

```typescript
// NG: weatherCode === 0 が欠損扱いされる
if (!record.weatherCode) { ... }

// OK: null/undefined のみを欠損として判定
if (record.weatherCode == null) { ... }
```

`toWeatherDisplay` は `code == null` で判定しており、この原則に準拠している。
DuckDB の `weather_hourly` テーブルでも数値カラムは `DOUBLE`（NULL 許容）としており、
0 と NULL を区別できる設計になっている。

---

## 関連ドキュメント

- [データモデル層](./data-model-layers.md)
- [DuckDB アーキテクチャ](./duckdb-architecture.md)
- [データフロー](../01-principles/data-flow.md)
- [エンジン境界ポリシー](../01-principles/engine-boundary-policy.md)
- [禁止事項クイックリファレンス](../01-principles/prohibition-quick-ref.md)
