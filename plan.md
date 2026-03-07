# 修正プラン: インポート/エクスポート — 予算・初期設定・店舗情報の欠損問題

> **状態: 全ステップ実装完了（2026-03）**
> Step 1〜5 が実装・テスト済み。CI 6段階ゲート通過確認済み。

## pm-business タスク分析

### 問題の整理

ユーザー報告:
1. 予算ファイルが読み込まれていない又はエクスポートされていない
2. 初期設定ファイルが保存されていない又は読み込んでいない
3. 店舗情報が適切に保存・読み込みができていない → 店舗数0件

### 根本原因分析（3つの問題）

#### ~~問題A: storeId フォーマット不一致~~ → **調査で否定済み**

全プロセッサ（Purchase, ClassifiedSales, Budget, Settings）は同じ
`String(parseInt(...))` パターンを使用。storeId フォーマットは一致している。

#### 問題A: バックアップエクスポートでの Map 消失（最重要）

- `backupExporter.ts:133` — `JSON.stringify(backup)` で **Map は `{}` に化ける**
- stores, suppliers, settings, budget の全 Map フィールドが空オブジェクトになる
- `hydrateImportedData()` が `objectToMap({})` で復元を試みるが、
  元データが `{}` なので空 Map が返る
- **結果**: バックアップ import 後に store count = 0、budget/settings 消失

#### 問題B: budget/initialSettings 単体インポートで stores が空

- `ImportService.ts:393` — `initialSettings` ケースは stores を更新しない
- `ImportService.ts:396` — `budget` ケースも stores を更新しない
- purchase/classifiedSales なしで budget/settings のみインポートすると
  `stores = new Map()` のまま

#### 問題C: DuckDB フィンガープリントが budget/settings/stores を含まない

- `useDuckDB.ts:56-74` — `computeFingerprint()` に budget.size, settings.size,
  stores.size が含まれていない
- budget/settings のみ変更しても DuckDB テーブルが再ロードされない

### タスク規模: **Medium**

- 複数ファイル変更、既知パターン
- infrastructure 層 + application 層の2層

### フロー: pm-business → implementation → review-gate

---

## 修正計画

### Step 1: バックアップエクスポートの Map シリアライズ修正

**変更:** `app/src/infrastructure/storage/backupExporter.ts`

`JSON.stringify` に Map → plain object の replacer を追加:
```typescript
const json = JSON.stringify(backup, (_key, value) => {
  if (value instanceof Map) {
    return Object.fromEntries(value)
  }
  return value
})
```

Map.fromEntries は再帰的に処理されるため、budget.daily (Map<number,number>) も
自動的にシリアライズされる。`hydrateImportedData()` の既存ロジック
（objectToMap + hydrateBudgetMap）で正しく復元される。

### Step 2: budget/initialSettings の店舗抽出

**変更:** `app/src/infrastructure/ImportService.ts`

`processFileDataInner()` の `initialSettings` と `budget` ケースで
storeId から最低限の Store オブジェクトを生成:

```typescript
case 'initialSettings': {
  const settings = processSettings(rows)
  for (const [storeId] of settings) {
    if (!mutableStores.has(storeId)) {
      mutableStores.set(storeId, { id: storeId, code: storeId, name: `店舗${storeId}` })
    }
  }
  return { data: { ...current, stores: mutableStores, settings } }
}
```

同様に `budget` ケースにも追加。

### Step 3: DuckDB フィンガープリント修正

**変更:** `app/src/application/hooks/useDuckDB.ts`

`computeFingerprint()` に以下を追加:
- `data.stores.size`
- `data.budget.size`
- `data.settings.size`

### Step 4: テスト

1. `backupExporter.test.ts` — Map シリアライズ往復テスト
   - export 時に Map が正しく plain object にシリアライズされること
   - import 後に budget/settings/stores が復元されること

2. `ImportService` テスト拡充
   - budget 単体インポートで stores > 0 を検証
   - initialSettings 単体インポートで stores > 0 を検証

3. `useDuckDB` テスト拡充
   - budget/settings/stores の変更でフィンガープリントが変わること

### Step 5: CI 6段階ゲート通過確認

1. `npm run lint` — エラー0
2. `npm run format:check` — 準拠
3. `npm run build` — tsc + vite build 成功
4. `npx vitest run` — テスト通過

---

## リスクと対策

| リスク | 対策 |
|---|---|
| 既存バックアップファイルの後方互換 | hydrateImportedData の既存ロジックは旧形式（空 Map）も読める。旧バックアップは壊れたまま |
| Map replacer で予期せぬ型変換 | replacer は `instanceof Map` でのみ発動。他の型には影響しない |
| 仮店舗名 `店舗{id}` の見た目 | purchase/classifiedSales がインポートされれば正式名で上書きされる |
