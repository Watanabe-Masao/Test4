# 天気データ基盤修正計画

TimeSlotChart を「このアプリの思想に沿った標準サンプル」にするための残タスク。
ステップ1-3（falsy修正、責務分離、ViewModel化）は完了済み。以下は残りの4項目。

---

## Step 5: 月跨ぎフォールバック修正

### 問題

`useWeatherHourlyQuery.ts:154` で月跨ぎ時に `endDay = 28` 固定。
29-31日と翌月の日が取得されない。

```typescript
// 現状（壊れている）
const endDay = from.year === to.year && from.month === to.month ? to.day : 28
for (let d = from.day; d <= endDay; d++) days.push(d)
loadEtrnHourlyForStore(storeId, location, from.year, from.month, days)
```

### 制約

- `loadEtrnHourlyForStore(storeId, location, year, month, days[])` は **単月API**
- 月跨ぎなら月ごとに分割して呼ぶ必要がある

### 修正方針

1. `domain/models/CalendarDate.ts` に純粋関数 `splitDateRangeByMonth` を追加
   - 入力: `from: CalendarDate, to: CalendarDate`
   - 出力: `readonly { year: number; month: number; days: readonly number[] }[]`
   - 例: `{2026,1,29}〜{2026,2,3}` → `[{2026,1,[29,30,31]}, {2026,2,[1,2,3]}]`
   - 閏年・月末日は `new Date(year, month, 0).getDate()` で算出

2. `useWeatherHourlyQuery.ts` の useEffect を修正
   - `splitDateRangeByMonth` で月別チャンクに分割
   - `Promise.all` で全月分を並列取得
   - 全結果の `hourly` を結合してから `insertWeatherHourly`
   - `fetchKey` を `${storeId}|${from.year}-${from.month}-${from.day}|${to.year}-${to.month}-${to.day}` に変更

3. テスト追加
   - 同月: `{2026,3,1}〜{2026,3,15}` → `[{2026,3,[1..15]}]`
   - 月跨ぎ: `{2026,1,28}〜{2026,2,3}` → `[{2026,1,[28..31]}, {2026,2,[1..3]}]`
   - 年跨ぎ: `{2025,12,30}〜{2026,1,2}` → `[{2025,12,[30,31]}, {2026,1,[1,2]}]`
   - 閏年2月: `{2024,2,28}〜{2024,3,1}` → `[{2024,2,[28,29]}, {2024,3,[1]}]`
   - 非閏年2月: `{2025,2,27}〜{2025,3,1}` → `[{2025,2,[27,28]}, {2025,3,[1]}]`

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `domain/models/CalendarDate.ts` | `splitDateRangeByMonth` 純粋関数追加 |
| `domain/models/calendar.ts` | バレルに export 追加 |
| `application/hooks/duckdb/useWeatherHourlyQuery.ts` | useEffect 内の日付生成＋取得を修正 |
| 新規テストファイル | `splitDateRangeByMonth` の境界値テスト |

---

## Step 6: dominantCode 初期値 0 の修正

### 問題

`weatherAggregation.ts:79` で `let dominantCode = 0`。
0 は「晴れ」の有効値であり、初期値/未設定値と区別がつかない。

### 現状の安全性

- 呼び出し元 `aggregateHourlyToDaily` が `records.length === 0` を弾いているため、
  今日時点では実際には壊れない
- しかし、将来の呼び出し元追加時に 0（晴れ）が漏れるリスクがある

### 修正方針

`records[0].weatherCode` で初期化する（呼び出し元の guard で非空が保証済み）。

```typescript
// Before
let dominantCode = 0
let maxCount = 0

// After
let dominantCode = records[0].weatherCode
let maxCount = 0
```

### テスト追加

- `weatherAggregation.test.ts` に追加:
  - 全レコードが weatherCode=0 → dominantWeatherCode が 0
  - 単一レコード → そのレコードの code が返る

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `domain/calculations/weatherAggregation.ts` | 初期値を `records[0].weatherCode` に変更 |
| `domain/calculations/__tests__/weatherAggregation.test.ts` | 境界値テスト追加 |

---

## Step 7: 代表天気の仕様定義

### 問題

「時間帯の代表天気とは何か」が手続きとして未定義。

- JS側 `aggregateOneDay()`: 最頻コード（同数なら先に出現した方）
- SQL側 `queryWeatherHourlyAvg()`: `MODE(weather_code)` （同数時は非決定的）

### 修正方針

**JS 側（Authoritative Engine）のみ修正**。SQL 側は Exploration Engine
として MODE のまま残す（CQRS の二重実装禁止原則に従い、仕様を JS に閉じる）。

1. `weatherAggregation.ts` に天気カテゴリの深刻度順序を定義

```typescript
const WEATHER_SEVERITY: Record<WeatherCategory, number> = {
  sunny: 0, cloudy: 1, rainy: 2, snowy: 3, other: 0,
}
```

2. `aggregateOneDay` のタイブレーク条件を変更

```typescript
// Before: count > maxCount（先着順）
// After:  count > maxCount || (count === maxCount && severity(code) > severity(dominantCode))
```

3. 仕様を `references/03-guides/widget-coordination-architecture.md` に明記
   - 「同数の場合、より深刻な天気を優先する（雪 > 雨 > 曇り > 晴れ）」
   - 「DuckDB の MODE は探索用であり、Authoritative な代表天気は JS で算出する」

### テスト追加

- タイブレーク: 晴れ12h + 雨12h → 雨が代表
- 晴れ多数 + 雨少数 → 晴れが代表（頻度優先は維持）
- 雪と雨の同数 → 雪が代表

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `domain/calculations/weatherAggregation.ts` | 深刻度定数 + タイブレーク追加 |
| `domain/calculations/__tests__/weatherAggregation.test.ts` | タイブレークテスト |
| `references/03-guides/widget-coordination-architecture.md` | 代表天気の仕様明記 |

---

## Step 8: toWeatherDisplay のガードテスト

### 問題

今回新設した `toWeatherDisplay()` にテストがない。

### テスト追加

`domain/calculations/__tests__/weatherAggregation.test.ts` に追加:

| 入力 | 期待結果 |
|---|---|
| `null` | `null` |
| `undefined` | `null` |
| `0` | `{ category: 'sunny', icon: '☀️', label: '晴れ' }` |
| `3` | `{ category: 'cloudy', icon: '☁️', label: '曇り' }` |
| `61` | `{ category: 'rainy', icon: '🌧️', label: '雨' }` |
| `71` | `{ category: 'snowy', icon: '❄️', label: '雪' }` |
| `200` | `{ category: 'other', icon: '🌀', label: '不明' }` |

### 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `domain/calculations/__tests__/weatherAggregation.test.ts` | toWeatherDisplay テスト追加 |

---

## 実施順序

```
Step 8 (toWeatherDisplay テスト)     ← 最小・既存コード変更なし
  ↓
Step 6 (dominantCode 初期値修正)     ← 小・domain 1行修正 + テスト
  ↓
Step 5 (月跨ぎフォールバック修正)    ← 中・純粋関数抽出 + hook 修正
  ↓
Step 7 (代表天気の仕様定義)          ← 中・ドメインロジック変更 + 仕様文書
```

リスクが低い順に進め、各ステップでテスト通過を確認してからコミットする。
