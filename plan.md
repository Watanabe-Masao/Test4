# データパイプライン根本再設計

## 現状の診断

### 構造的欠陥: データに「自分が何者か」の情報がない

現在のデータモデルは**年月情報を持たない**。

```
現在の ImportedData:
  discount: { "101": { 1: {sales:100, ...}, 2: {sales:200, ...} } }
  categoryTimeSales: { records: [{ day: 3, storeId: "101", ... }] }
  prevYearDiscount: { "101": { 1: {sales:80, ...} } }
```

- `discount[101][3]` — これは2026年2月3日？2025年2月3日？→ **データ自身は知らない**
- `CategoryTimeSalesRecord.day: 3` — 何年何月の3日？→ **データ自身は知らない**
- `prevYearDiscount` — 「前年」とは？設定 `targetYear - 1`？手動指定？→ **暗黙の外部状態に依存**

### この欠陥が引き起こした実際のバグ

1. **2025年CTS が 2026年として表示**: categoryTimeSales が状態に入った時点で年月情報が消失。表示層でどの年のデータか判別不能
2. **月切替で前の月のデータが残る**: IndexedDB の `lastSession` ガードが他月のロードを阻害
3. **前年データ day 23-28 が欠落**: overflow 結合時に翌月データが IndexedDB にないケースで無音失敗
4. **ドリルダウンの売上が異なる年のデータ**: Excel(当年) と CSV(前年) の値が同一画面に混在

### 根本原因の連鎖

```
データに年月がない
  → IndexedDB のキーでのみ年月を管理
    → メモリにロードした瞬間に年月が消える
      → 複数年のデータが同じ構造で混在
        → 表示層で「これは何年のデータ？」が判別不能
          → バグ
```

---

## 設計原則

### 1. データファースト（取込→保存→取出）

> **全てのデータオブジェクトは、自分が「何年何月のデータか」を自身の中に持つ。**
> 外部の状態（settings.targetYear 等）に依存して年月を解決しない。

### 2. ユーザーファースト（参照→加工→表示）

> **表示層は、年月タグ付きデータを受け取り、ユーザーの目的に応じて加工・比較する。**
> 「当年」と「前年」の区別はデータ自身が持つ年月から機械的に導出される。

### 3. 未知の拡張への備え

> **年月だけでなく、データの出自（ソースファイル名、取込日時）も保持する。**
> 将来の監査・デバッグ・データ品質検証に対応可能にする。

---

## 新しいデータモデル

### Phase 1: DataEnvelope — データの封筒

全てのデータオブジェクトを「封筒」で包む。封筒にはメタデータが記載される。

```typescript
/** データの出自と期間を表すメタデータ */
interface DataOrigin {
  readonly year: number          // 対象年
  readonly month: number         // 対象月 (1-12)
  readonly importedAt: string    // ISO 8601 取込日時
  readonly sourceFile?: string   // 元ファイル名（任意）
}

/**
 * DataEnvelope: 全データ型の封筒
 *
 * 中身（payload）がどの年月に属するかを、データ自身が保持する。
 * これにより、メモリ上のどの時点でも年月を問い合わせ可能になる。
 */
interface DataEnvelope<T> {
  readonly origin: DataOrigin
  readonly payload: T
}
```

### Phase 2: ImportedData の再定義

```typescript
/** 当月データ集約（年月はエンベロープが持つ） */
interface MonthlyData {
  readonly origin: DataOrigin
  readonly stores: ReadonlyMap<string, Store>
  readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  readonly purchase: PurchaseData
  readonly sales: SalesData
  readonly discount: DiscountData
  readonly interStoreIn: TransferData
  readonly interStoreOut: TransferData
  readonly flowers: SpecialSalesData
  readonly directProduce: SpecialSalesData
  readonly consumables: ConsumableData
  readonly categoryTimeSales: CategoryTimeSalesData
  readonly departmentKpi: DepartmentKpiData
  readonly settings: ReadonlyMap<string, InventoryConfig>
  readonly budget: ReadonlyMap<string, BudgetData>
}

/** アプリケーションが保持するデータ全体 */
interface AppData {
  /** 当月データ（null = 未ロード） */
  readonly current: MonthlyData | null
  /** 前年データ（null = 未ロード） */
  readonly prevYear: MonthlyData | null
}
```

**変更のポイント:**
- `ImportedData` の `prevYearSales` / `prevYearDiscount` / `prevYearCategoryTimeSales` を廃止
- 当年と前年は**同じ `MonthlyData` 型**で、`origin.year` / `origin.month` で区別
- 「前年」は特別な概念ではなく、単に「別の月の MonthlyData」

### Phase 3: CategoryTimeSalesRecord の強化

```typescript
interface CategoryTimeSalesRecord {
  readonly year: number           // ← 追加
  readonly month: number          // ← 追加
  readonly day: number
  readonly storeId: string
  readonly department: { readonly code: string; readonly name: string }
  readonly line: { readonly code: string; readonly name: string }
  readonly klass: { readonly code: string; readonly name: string }
  readonly timeSlots: readonly TimeSlotEntry[]
  readonly totalQuantity: number
  readonly totalAmount: number
}
```

**全てのレコードが自分の年月を知っている** → 異年度のレコードが混在しても判別可能。

---

## IndexedDB スキーマ再設計

### 現在のスキーマ

```
monthlyData store:
  "2026-02_discount" → { "101": { 1: {...}, 2: {...} } }
  "2026-02_categoryTimeSales" → { records: [...] }

metadata store:
  "lastSession" → { year: 2026, month: 2, savedAt: "..." }
```

**問題点:**
- `lastSession` が単一ポインタ → 複数月を扱えない
- データ値に年月が含まれない → ロード後に出自が不明

### 新しいスキーマ

```
monthlyData store:  （変更なし — キー形式は維持）
  "2026-02_discount" → {
    origin: { year: 2026, month: 2, importedAt: "...", sourceFile: "売変202602.xlsx" },
    payload: { "101": { 1: {...}, 2: {...} } }
  }
  "2026-02_categoryTimeSales" → {
    origin: { year: 2026, month: 2, importedAt: "...", sourceFile: "分類別202602.csv" },
    payload: { records: [...] }  // records 内の各レコードにも year/month
  }

metadata store:
  "lastSession" → { year: 2026, month: 2, savedAt: "..." }  // 後方互換のため維持
  "sessions" → [                                              // 全セッション一覧（追加）
    { year: 2026, month: 2, savedAt: "...", dataTypes: ["discount", "sales", ...] },
    { year: 2025, month: 2, savedAt: "...", dataTypes: ["discount", "sales", ...] },
  ]
```

**ポイント:**
- 既存のキー形式 `YYYY-MM_dataType` は維持（後方互換）
- 値に `origin` を付与（自己記述的データ）
- `sessions` メタデータで全保存月を高速一覧（`listStoredMonths` の最適化）

---

## パイプライン再設計

### Import（取込）

```
ファイル → readTabularFile → detectFileType → detectYearMonth
                                                    ↓
                                              DataOrigin 生成
                                                    ↓
                                            processFileData
                                                    ↓
                                         DataEnvelope<T> を返す
```

**変更点:**
1. `processFileData` が `DataOrigin` を必ず生成（年月検出 or 設定値から）
2. 結果の `ImportedData` ではなく `MonthlyData`（origin 付き）を返す
3. CTS レコードに `year` / `month` を埋め込む

### Storage（保存）

```
MonthlyData → saveMonthlyData(data)
                    ↓
              data.origin から year/month を取得（引数不要）
                    ↓
              IndexedDB に DataEnvelope 形式で保存
```

**変更点:**
1. `saveMonthlyData(data, year, month)` → `saveMonthlyData(data)` （year/month は data.origin から取得）
2. origin ごと保存 → ロード時にも origin が復元される
3. 保存時に integrity check: `origin.year/month` とキーの year/month の一致を検証

### Retrieval（取出）

```
loadMonthlyData(year, month) → DataEnvelope を取得
                                     ↓
                               origin を検証（キーと一致するか）
                                     ↓
                               MonthlyData として返す（origin 付き）
```

**変更点:**
1. ロード後に `origin.year === year && origin.month === month` を検証
2. 不一致の場合はエラーログ + null を返す（サイレント破損防止）
3. 旧形式データ（origin なし）のマイグレーション対応

### Display（表示 — ユーザーファースト）

```
AppData { current: MonthlyData, prevYear: MonthlyData }
                    ↓
         コンポーネントで比較・分析
                    ↓
  current.origin.year = 2026, prevYear.origin.year = 2025
                    ↓
     「これは2026年のデータ」「これは2025年のデータ」が
     データ自身から導出可能 → settings.targetYear に頼らない
```

---

## マイグレーション戦略

### 旧データの自動マイグレーション

IndexedDB から旧形式（origin なし）のデータをロードした場合:

```typescript
function migrateToEnvelope<T>(
  raw: T | DataEnvelope<T>,
  year: number,
  month: number,
): DataEnvelope<T> {
  // 既に envelope 形式なら何もしない
  if (isEnvelope(raw)) return raw

  // 旧形式 → origin をキーから復元して envelope 化
  return {
    origin: {
      year,
      month,
      importedAt: new Date().toISOString(),  // マイグレーション日時
      sourceFile: undefined,                  // 不明
    },
    payload: raw,
  }
}
```

**ポイント:**
- 既存データを壊さない（読み込み時に自動変換）
- 次回保存時に新形式で保存される（漸進的マイグレーション）
- `sourceFile` は旧データでは不明 → undefined（それでも year/month は復元可能）

---

## 実装ステップ

### Step 1: Domain 型定義（影響範囲最小）
- `DataOrigin` 型を `domain/models/` に追加
- `MonthlyData` 型を定義（`ImportedData` の後継）
- `CategoryTimeSalesRecord` に `year` / `month` を追加
- `ImportedData` は一時的に共存（段階的移行）

### Step 2: Infrastructure 層（保存・取出）
- `IndexedDBStore` の保存を envelope 形式に変更
- ロード時のマイグレーション関数を追加
- `DataRepository` インターフェースを `MonthlyData` 対応に更新
- integrity check（origin とキーの一致検証）を追加

### Step 3: Import パイプライン
- `processFileData` が `DataOrigin` を生成するよう変更
- CTS プロセッサで `year` / `month` をレコードに埋め込む
- `processDroppedFiles` が `MonthlyData` を返すよう変更

### Step 4: Application 層（状態管理）
- `dataStore` を `AppData { current, prevYear }` 構造に変更
- `useAutoLoadPrevYear` を `MonthlyData` 対応に更新
- `usePrevYearData` が `prevYear.origin` から年月を取得するよう変更
- `useMonthSwitcher` を新構造に対応

### Step 5: Presentation 層（表示）
- ダッシュボードで `current.origin` / `prevYear.origin` を参照
- `CategoryDrilldown` が年月タグからデータの所属年を判別
- 全ウィジェットで年月ラベルをデータ自身から生成

### Step 6: テスト・検証
- 既存テスト全通過の確認
- マイグレーションテスト（旧形式データのロード）
- 年月整合性テスト（異なる年のデータが混在しないことの検証）
- E2E: インポート→月切替→再ロード→前年比較 の一連フロー

---

## 設計上の判断と根拠

### なぜ `DataEnvelope` であって、各レコードに year/month を埋め込まないのか？

**両方やる。**
- `DataEnvelope` は**コレクション全体**の年月を保証する（例: DiscountData 全体が2026年2月）
- `CategoryTimeSalesRecord` のような**個別レコード**にも year/month を持たせる
- これは冗長だが、**防衛的冗長性**（defensive redundancy）として正当化される
  - レコードが配列から取り出されて単体で渡される場面では、envelope から辿れない
  - レコード単体で「自分が何年のデータか」を答えられることが、バグの根絶に不可欠

### なぜ `ImportedData` を即座に廃止しないのか？

- `ImportedData` は30以上のファイルで参照されている
- 一括変更はリグレッションリスクが高い
- `MonthlyData` と `ImportedData` を一時的に共存させ、段階的に移行する
- 最終的に `ImportedData` を `@deprecated` にし、全参照を `MonthlyData` に置換

### `prevYearSales` / `prevYearDiscount` はなぜ廃止するのか？

- 現在の設計では、同じ `ImportedData` 内に当年と前年が混在している
- これが「前年データの年月がわからない」問題の根本原因
- `AppData { current, prevYear }` にすることで:
  - 当年 = `current` (origin: 2026年2月)
  - 前年 = `prevYear` (origin: 2025年2月)
  - **同じ型、同じ構造、origin だけが違う**
  - 「前年」は特別扱いではなく、単に「別の月のデータ」

---

## 期待される効果

1. **年月混在バグの根絶**: データ自身が年月を知っているため、異年度データの混在を検出・防止可能
2. **デバッグ容易性**: `origin.sourceFile` から「このデータはどのファイルから来たか」を追跡可能
3. **拡張性**: 将来「3年比較」「任意月比較」を追加する際、同じ `MonthlyData` をもう一つ持つだけ
4. **信頼性**: 保存・取出時の integrity check で、キーとデータの年月不一致を検出
5. **マイグレーション安全性**: 旧データは自動変換、既存機能は段階的に移行
