# Record Store アーキテクチャ v2

> 月別blob保存からレコード単位保存への移行設計
> v2: 批判的レビューで発見した7つの問題 + データライフサイクルを反映

## 1. 現行アーキテクチャの問題

### 1.1 月別blob保存の構造的欠陥

```
Files → Parse → ImportedData（全種別混在blob）→ IndexedDB（月別キー）
                     ↑
              currentData から継承（汚染の源）
```

| 問題 | 原因 | 影響 |
|---|---|---|
| 他月データ漏れ | filterDataForMonth が判断と保存を兼務 | 全月のデータが上書きされる |
| 差分取込の粒度不足 | 月全体の置換しかできない | Feb 1-15 を取り込むと Feb 16-28 が消える |
| 取込元の追跡不能 | どのファイルからどのレコードが来たか記録なし | デバッグ・監査不能 |
| 月切替時の state 汚染 | hasData 誤判定 + save-on-switch | 空データで既存データを上書き |

### 1.2 根本原因: 判断と保存の混在

`filterDataForMonth`（保存直前の関数）が「このデータはどの月のものか」を判断している。
判断を間違えると、保存も間違える。**判断する層と保存する層は分離しなければならない。**

## 2. 新アーキテクチャ: 3層パイプライン

```
  Parse              Scope Resolution         Record Store
  （解析）              （判断）                 （保存）
  Infrastructure      Domain/Application       Infrastructure

  「何が書いてある」    「どこからどこまでか」      「指示通りに保存」
  ファイル→レコード     レコード→ImportPlan        ImportPlan→実行
```

### 2.1 各層の責務

| 層 | 入力 | 出力 | 判断するか |
|---|---|---|---|
| **Parse** | ファイル（CSV/Excel） | ParsedFileResult[] | しない（変換のみ） |
| **Scope Resolution** | ParsedFileResult[] + 既存レコード | ImportPlan | **する（唯一の判断者）** |
| **Record Store** | ImportPlan | ExecutePlanResult | しない（実行のみ） |

### 2.2 Scope Resolution（判断層）の責務

**やること:**
1. 各ファイルのレコードから日付範囲を検出する（dayFrom, dayTo）
2. データ種別ごとに影響範囲（ImportScope）を確定する
3. 既存レコードとの衝突を検出し、add/update に分類する
4. 削除ポリシーに従い、削除対象を判定する
5. ImportPlan（保存命令書）を生成する

**やらないこと:**
- ファイルの読み込み・パース（Parse 層の仕事）
- IndexedDB への書き込み（Record Store の仕事）

**純粋関数の範囲:**
- `detectScopes()` と `classifyChanges()` は個別に純粋関数
- 2つを繋ぐオーケストレーター（`buildImportPlan()`）は application 層に置く
  （`RecordStore.queryScope()` の呼び出しを含むため副作用あり）

### 2.3 データの3分類

ImportedData のフィールドは保存方式が異なる3種類に分かれる:

| 分類 | 保存先 | 対象フィールド |
|---|---|---|
| **DatedRecord 系** | `records` store | purchase, classifiedSales, interStoreIn/Out, flowers, directProduce, consumables, categoryTimeSales |
| **月別メタ系** | `monthData` store | budget, settings(InventoryConfig), departmentKpi |
| **マスタ系** | `masterData` store | stores, suppliers |

**なぜ分けるか:**
- Budget は `{ daily: Map<day, amount>, total }` 形式。day分解すると `total`（端数調整済み値）が消失する
- DepartmentKpi は `{ deptCode, deptName, gpRateBudget, ... }` で year/month/day/storeId を持たない（DatedRecord ではない）
- InventoryConfig は月×店舗単位の設定値で、日別の概念がない
- これらを records store に無理に入れるとアダプタ層が必要になり、複雑度が増す

**prevYear データ:**
- `prevYearClassifiedSales`, `prevYearCategoryTimeSales`, `prevYearFlowers` は **DB に保存しない**
- 現行と同じく `useAutoLoadPrevYear` が前年の実データを `queryRecordsByType()` で取得し、
  3ヶ月マージ + 拡張day番号変換を行ってメモリ上にセットする

## 3. ドメイン型定義

### 3.1 ImportScope（影響範囲）

```typescript
interface ImportScope {
  readonly dataType: StorageDataType
  readonly year: number
  readonly month: number
  readonly dayFrom: number
  readonly dayTo: number
  /** 対象店舗ID（incoming から収集。空配列にしない） */
  readonly storeIds: readonly string[]
  /**
   * 削除ポリシー:
   * - 'upsert-only': 追加・更新のみ。既存レコードは削除しない（デフォルト）
   * - 'replace-scope': スコープ内で incoming に含まれない既存レコードを削除する
   *
   * なぜデフォルトが upsert-only か:
   * ファイルにデータが「含まれない」ことは「削除すべき」か「対象外」か判断できない。
   * 安全側に倒す。
   */
  readonly deletePolicy: 'upsert-only' | 'replace-scope'
}
```

### 3.2 RecordChange（レコード単位の変更分類）

```typescript
interface RecordAdd {
  readonly kind: 'add'
  readonly naturalKey: string
  readonly record: DatedRecord
}

interface RecordUpdate {
  readonly kind: 'update'
  readonly naturalKey: string
  readonly record: DatedRecord
  readonly previousRecord: DatedRecord
}

interface RecordDelete {
  readonly kind: 'delete'
  readonly naturalKey: string
  readonly previousRecord: DatedRecord
}

type RecordChange = RecordAdd | RecordUpdate | RecordDelete
```

### 3.3 ImportOperation（保存命令）

```typescript
interface ImportOperation {
  readonly scope: ImportScope
  readonly adds: readonly RecordAdd[]
  readonly updates: readonly RecordUpdate[]
  /** deletePolicy 'upsert-only' の場合は常に空配列 */
  readonly deletes: readonly RecordDelete[]
}
```

### 3.4 ImportPlan（保存命令書）

```typescript
interface ImportPlan {
  readonly importId: string
  readonly importedAt: string
  readonly sourceFiles: readonly SourceFileInfo[]
  /** DatedRecord 系の保存命令 */
  readonly operations: readonly ImportOperation[]
  /** マスタデータの更新 */
  readonly masterUpdates: {
    readonly stores: ReadonlyMap<string, Store>
    readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  }
  /** 月別メタデータの更新（budget, settings, departmentKpi） */
  readonly monthDataUpdates: readonly MonthDataUpdate[]
}

/** 月別メタデータの更新1件 */
interface MonthDataUpdate {
  readonly year: number
  readonly month: number
  /** null = 更新なし */
  readonly settings: ReadonlyMap<string, InventoryConfig> | null
  /** BudgetData をそのまま保持。day分解しない → total が消失しない */
  readonly budget: ReadonlyMap<string, BudgetData> | null
  readonly departmentKpi: DepartmentKpiData | null
}

interface ImportPlanSummary {
  readonly totalAdds: number
  readonly totalUpdates: number
  readonly totalDeletes: number
  readonly isEmpty: boolean
  /** 削除・更新がある場合 true */
  readonly needsConfirmation: boolean
  readonly deleteDetails: readonly {
    readonly dataType: StorageDataType
    readonly year: number
    readonly month: number
    readonly count: number
    readonly reason: string
  }[]
  readonly byDataType: readonly {
    readonly dataType: StorageDataType
    readonly adds: number
    readonly updates: number
    readonly deletes: number
  }[]
}

interface SourceFileInfo {
  readonly filename: string
  readonly dataType: DataType
  readonly recordCount: number
  readonly coveredMonths: readonly { year: number; month: number }[]
}
```

### 3.5 ImportLog（取込履歴）

```typescript
interface ImportLogEntry {
  readonly id: number
  readonly importId: string
  readonly importedAt: string
  readonly sourceFiles: readonly SourceFileInfo[]
  readonly scopes: readonly ImportScope[]
  readonly addedCount: number
  readonly updatedCount: number
  readonly deletedCount: number
  readonly rolledBack: boolean
  readonly compacted: boolean
  readonly changeLog: {
    readonly adds: readonly ChangeLogAdd[]
    readonly updates: readonly ChangeLogUpdate[]
    readonly deletes: readonly ChangeLogDelete[]
  }
}

interface ChangeLogAdd {
  readonly naturalKey: string
  readonly dataType: StorageDataType
  readonly record: DatedRecord
}

interface ChangeLogUpdate {
  readonly naturalKey: string
  readonly dataType: StorageDataType
  readonly before: DatedRecord
  readonly after: DatedRecord
  /** ネストオブジェクトはトップレベルフィールド名のみ記録 */
  readonly changedFields: readonly FieldDiff[]
}

interface ChangeLogDelete {
  readonly naturalKey: string
  readonly dataType: StorageDataType
  readonly record: DatedRecord
}

interface FieldDiff {
  readonly fieldPath: string
  readonly before: number | string | null
  readonly after: number | string | null
}
```

### 3.6 エラーとトランザクション結果

```typescript
type ImportErrorPhase = 'parse' | 'scope-resolution' | 'transaction' | 'rollback'

interface ImportError {
  readonly phase: ImportErrorPhase
  readonly code: ImportErrorCode
  readonly message: string
  readonly dataType?: StorageDataType
  readonly yearMonth?: { year: number; month: number }
  readonly detail?: string
}

type ImportErrorCode =
  | 'PARSE_FAILED'
  | 'INVALID_FORMAT'
  | 'SCOPE_CONFLICT'
  | 'EMPTY_SCOPE'
  | 'TRANSACTION_ABORTED'
  | 'QUOTA_EXCEEDED'
  | 'CONSTRAINT_VIOLATION'
  | 'WRITE_FAILED'
  | 'ROLLBACK_FAILED'
  | 'ROLLBACK_PARTIAL'
  | 'ROLLBACK_NOT_LATEST'    // LIFO制約違反
  | 'ROLLBACK_COMPACTED'     // changeLog 圧縮済み
  | 'IMPORT_NOT_FOUND'

type ExecutePlanResult =
  | { readonly ok: true; readonly entry: ImportLogEntry }
  | { readonly ok: false; readonly error: ImportError; readonly rolledBack: boolean }

type RollbackResult =
  | { readonly ok: true; readonly restoredCount: number }
  | { readonly ok: false; readonly error: ImportError }
```

### 3.7 RecordStore インターフェース

```typescript
/**
 * レコード単位のデータストア。
 * 判断しない。Scope Resolution が分類した通りに実行するだけ。
 *
 * ImportedData の組み立ては RecordStore の責務ではない。
 * Application 層の MonthDataAssembler が queryRecordsByType 等を使って行う。
 * 理由: 組み立てには全データ種別の構造知識が必要。Infrastructure が知るべきではない。
 */
interface RecordStore {
  // ─── 書き込み ─────────────────────────────────────────

  /** ImportPlan を実行する（1トランザクション、アトミック） */
  executePlan(plan: ImportPlan): Promise<ExecutePlanResult>

  /**
   * 最新のインポートをロールバックする（LIFO制約）。
   * 最新の active（非rolledBack・非compacted）エントリのみ対象。
   */
  rollbackLatest(): Promise<RollbackResult>

  // ─── 読み取り（DatedRecord 系） ──────────────────────

  /** 指定データ種別×年月のレコードを全取得 */
  queryRecordsByType(
    dataType: StorageDataType, year: number, month: number,
  ): Promise<readonly DatedRecord[]>

  /** 指定スコープ内の既存レコードを取得（Scope Resolution 用） */
  queryScope(scope: ImportScope): Promise<readonly StoredRecord[]>

  // ─── 読み取り（月別メタ系） ────────────────────────────

  queryMonthData(year: number, month: number): Promise<MonthDataSnapshot | null>
  queryMasterData(): Promise<{
    stores: ReadonlyMap<string, Store>
    suppliers: ReadonlyMap<string, { code: string; name: string }>
  }>

  // ─── 履歴・管理 ──────────────────────────────────────

  getImportLog(options?: { limit?: number }): Promise<readonly ImportLogEntry[]>
  listStoredMonths(): Promise<readonly { year: number; month: number }[]>
  clearMonth(year: number, month: number): Promise<void>
  clearAll(): Promise<void>

  // ─── ログ・ストレージ管理 ──────────────────────────────

  compactChangeLogs(olderThanDays: number): Promise<CompactResult>
  purgeCompactedLogs(): Promise<{ deletedCount: number }>
  getStorageStats(): Promise<StorageStats>
  isAvailable(): boolean
}

interface MonthDataSnapshot {
  readonly settings: ReadonlyMap<string, InventoryConfig>
  readonly budget: ReadonlyMap<string, BudgetData>
  readonly departmentKpi: DepartmentKpiData
}

interface CompactResult {
  readonly compactedCount: number
  readonly freedBytes: number
}

interface StorageStats {
  readonly totalRecords: number
  readonly importLogCount: number
  readonly rollbackableCount: number
  readonly estimatedBytes: number
  readonly byMonth: readonly { year: number; month: number; recordCount: number }[]
}
```

### 3.8 MonthDataAssembler（Application 層）

```typescript
/**
 * RecordStore のデータを ImportedData に組み立てる（Application 層）。
 *
 * なぜ RecordStore.queryMonth() ではないか:
 * - 全16フィールドの構造知識が必要（Infrastructure に置くと責務過大）
 * - prevYear の3ヶ月マージはビジネスロジック
 * - 読み取り元が records / monthData / masterData の3 store にまたがる
 */
async function assembleMonthData(
  store: RecordStore, year: number, month: number,
): Promise<ImportedData> {
  const [purchase, cs, interIn, interOut, flowers, dp, con, cts] =
    await Promise.all([
      store.queryRecordsByType('purchase', year, month),
      store.queryRecordsByType('classifiedSales', year, month),
      store.queryRecordsByType('interStoreIn', year, month),
      store.queryRecordsByType('interStoreOut', year, month),
      store.queryRecordsByType('flowers', year, month),
      store.queryRecordsByType('directProduce', year, month),
      store.queryRecordsByType('consumables', year, month),
      store.queryRecordsByType('categoryTimeSales', year, month),
    ])

  const [monthData, master] = await Promise.all([
    store.queryMonthData(year, month),
    store.queryMasterData(),
  ])

  // prevYear は空 — useAutoLoadPrevYear が別途セット
  return {
    stores: master.stores,
    suppliers: master.suppliers,
    purchase: { records: purchase as PurchaseDayEntry[] },
    classifiedSales: { records: cs as ClassifiedSalesRecord[] },
    prevYearClassifiedSales: { records: [] },
    interStoreIn: { records: interIn as TransferDayEntry[] },
    interStoreOut: { records: interOut as TransferDayEntry[] },
    flowers: { records: flowers as SpecialSalesDayEntry[] },
    directProduce: { records: dp as SpecialSalesDayEntry[] },
    consumables: { records: con as CostInclusionRecord[] },
    categoryTimeSales: { records: cts as CategoryTimeSalesRecord[] },
    prevYearCategoryTimeSales: { records: [] },
    prevYearFlowers: { records: [] },
    departmentKpi: monthData?.departmentKpi ?? { records: [] },
    settings: monthData?.settings ?? new Map(),
    budget: monthData?.budget ?? new Map(),
  }
}
```

**prevYear の読み込み（既存ロジック維持）:**
```
useAutoLoadPrevYear:
  repo.loadDataSlice(Y, M, type) → store.queryRecordsByType(type, Y, M)
  3ヶ月分取得 → mergeAdjacentMonthRecords() → setPrevYearAutoData()
  ※ 拡張day番号変換ロジックは変更不要
```

### 3.9 ログのライフサイクル管理

```
  active（ロールバック可能 — 最新のみ）
    ↓ rollbackLatest()
  rolled-back
    ↓ compactChangeLogs(30)
  compacted（ロールバック不能、履歴参照のみ）
    ↓ purgeCompactedLogs()
  物理削除
```

**自動圧縮:** 起動時に `compactChangeLogs(30)` を非同期実行。
ロールバック済みは即時圧縮対象。purge はユーザー明示操作。

## 4. IndexedDB スキーマ（v3）

### 4.1 Object Store 設計

```
shiire-arari-db v3

┌─────────────────────────────────────────────────────┐
│ importLog                                            │
│   keyPath: 'id' (autoIncrement)                      │
│   Indexes: importId (unique), importedAt             │
├─────────────────────────────────────────────────────┤
│ records                                              │
│   keyPath: '_id' (autoIncrement)                     │
│   Value: { _dataType, _importLogId, _naturalKey,     │
│            year, month, day, storeId, ...fields }    │
│   Indexes:                                           │
│     typeYearMonth: [_dataType, year, month]           │
│     typeYearMonthDay: [_dataType, year, month, day]   │
│     naturalKey: _naturalKey (unique)                  │
│     importLogId: _importLogId                        │
├─────────────────────────────────────────────────────┤
│ masterData                                           │
│   keyPath: '_key'                                    │
│   Indexes: type: _type                               │
├─────────────────────────────────────────────────────┤
│ monthData                                            │
│   keyPath: '_key'  // "YYYY-MM_kind_storeId"         │
│   Value: 3種のいずれか                                 │
│     { _kind:'settings', year, month, storeId, ...}   │
│     { _kind:'budget', year, month, storeId,          │
│       daily: Record<day,amount>, total: number }     │
│     { _kind:'departmentKpi', year, month,            │
│       records: DepartmentKpiRecord[] }               │
│   Indexes: kindYearMonth: [_kind, year, month]        │
├─────────────────────────────────────────────────────┤
│ summaryCache (既存維持)                               │
│ appSettings (既存維持)                                │
└─────────────────────────────────────────────────────┘
```

**v1からの変更:**
- `monthSettings` → `monthData`（budget, departmentKpi も含む）
- `typeYearMonthDay` 4要素 compound index 追加（day range クエリ高速化）
- Budget は day 分解せず monthData に BudgetData ごと保存
- DepartmentKpi は monthData に `{ _kind, year, month, records }` で保存

### 4.2 Natural Key 生成規則

**区切り文字: タブ `\t`**（既存の classifiedSalesRecordKey と統一）

| データ種別 | Natural Key 構成 |
|---|---|
| purchase | `purchase\t{year}\t{month}\t{day}\t{storeId}` |
| classifiedSales | `cs\t{year}\t{month}\t{day}\t{storeId}\t{group}\t{dept}\t{line}\t{class}` |
| categoryTimeSales | `cts\t{year}\t{month}\t{day}\t{storeId}\t{deptCode}\t{lineCode}\t{klassCode}` |
| flowers | `flowers\t{year}\t{month}\t{day}\t{storeId}` |
| directProduce | `dp\t{year}\t{month}\t{day}\t{storeId}` |
| interStoreIn/Out | `isi/iso\t{year}\t{month}\t{day}\t{storeId}` |
| consumables | `con\t{year}\t{month}\t{day}\t{storeId}` |

Budget, DepartmentKpi, InventoryConfig は records store に入れないため natural key 不要。

### 4.3 クエリパターン

```typescript
// 月別取得
records.index('typeYearMonth').getAll(['purchase', 2025, 2])

// day range（queryScope 用）
records.index('typeYearMonthDay')
  .getAll(IDBKeyRange.bound(['purchase', 2025, 2, 1], ['purchase', 2025, 2, 20]))

// natural key lookup
records.index('naturalKey').get('purchase\t2025\t2\t15\t001')
```

## 5. Scope Resolution のロジック

### 5.1 全体フロー

```
buildImportPlan() — Application 層オーケストレーター
  detectScopes(parsed) → scopes              ← 純粋関数
  store.queryScope(scope) → existing[]        ← DB読み取り
  classifyChanges(scope, incoming, existing)  ← 純粋関数
  → ImportPlan 組み立て
```

### 5.2 Stage 1: スコープ検出（純粋関数）

```typescript
function detectScopes(
  parsedResults: readonly ParsedFileResult[],
): readonly ImportScope[] {
  // 1. レコードを dataType × (year, month) でグループ化
  // 2. dayFrom = min(day), dayTo = max(day)
  // 3. storeIds = incoming の storeId 集合（空配列にしない）
  // 4. deletePolicy = 'upsert-only'（デフォルト）
}
```

### 5.3 Stage 2: 差分分類（純粋関数）

```typescript
function classifyChanges(
  scope: ImportScope,
  incomingRecords: readonly DatedRecord[],
  existingRecords: readonly StoredRecord[],
): ImportOperation {
  const incomingByKey = new Map(incomingRecords.map(r => [naturalKey(r), r]))
  const existingByKey = new Map(existingRecords.map(r => [r._naturalKey, r]))

  const adds: RecordAdd[] = []
  const updates: RecordUpdate[] = []
  const deletes: RecordDelete[] = []

  for (const [key, record] of incomingByKey) {
    const existing = existingByKey.get(key)
    if (!existing) {
      adds.push({ kind: 'add', naturalKey: key, record })
    } else if (!recordsEqual(record, existing)) {
      updates.push({ kind: 'update', naturalKey: key, record, previousRecord: existing })
    }
  }

  // 削除は replace-scope の場合のみ
  if (scope.deletePolicy === 'replace-scope') {
    for (const [key, existing] of existingByKey) {
      if (!incomingByKey.has(key)) {
        deletes.push({ kind: 'delete', naturalKey: key, previousRecord: existing })
      }
    }
  }

  return { scope, adds, updates, deletes }
}
```

### 5.4 recordsEqual: レコード同値判定

```typescript
/**
 * メタフィールド（_id, _dataType, _importLogId, _naturalKey）を除外し、
 * キーをソートした JSON.stringify で deep comparison する。
 * queryScope 結果（数百〜数千件）に対して実行するため実用的。
 */
function recordsEqual(a: DatedRecord, b: DatedRecord): boolean {
  return stableStringify(stripMeta(a)) === stableStringify(stripMeta(b))
}
```

### 5.5 差分取込の安全性（upsert-only）

```
既存: 1/4, 1/5, 2/5, 2/10    取り込み: 2月1-30日

scope = { month:2, dayFrom:1, dayTo:30, deletePolicy:'upsert-only' }
queryScope → 既存 [2/5:10000, 2/10:10000]  ※1月はスコープ外

classifyChanges:
  incoming = [2/1:8000, 2/5:12000, 2/15:9000]
  結果:
    add:    [2/1:8000, 2/15:9000]
    update: [2/5: 10000→12000]
    delete: []  ← upsert-only なので 2/10 は残る
```

### 5.6 ロールバックの LIFO 制約

```
Import A (id=1): 2/5 追加
Import B (id=2): 2/5 更新 (10000→12000)
Import C (id=3): 2/10 追加

ロールバック順序: C → B → A（逆順のみ可）
A をいきなりロールバック → ROLLBACK_NOT_LATEST エラー
```

**理由:** A のロールバック = 2/5 削除。しかし B が 2/5 を更新済み → B の前提が崩壊する。

## 6. データフロー（新）

### 6.1 インポートフロー

```
  User drops files
       ▼
  Parse Layer → ParsedFileResult[]
       ▼
  buildImportPlan() (Application)
    detectScopes → queryScope → classifyChanges → ImportPlan
       ▼
  ImportPlanSummary → UI に差分表示
  ※ 削除がある場合は明示確認
       ▼  ← ユーザー承認
  executePlan() (Infrastructure) — 1トランザクション
       ▼
  assembleMonthData() → ImportedData → useDataStore.setData()
       ▼
  useAutoLoadPrevYear → prevYear 自動セット → 計算パイプライン → UI
```

### 6.2 月切替フロー

```
  User selects month
       ▼
  assembleMonthData(store, year, month)  ← save-on-switch 不要
       ▼
  ImportedData → useDataStore.setData()
       ▼
  useAutoLoadPrevYear
    store.queryRecordsByType(type, prevY, prevM) × 3ヶ月分
    → mergeAdjacentMonthRecords() → setPrevYearAutoData()
       ▼
  計算パイプライン → UI 更新
```

### 6.3 ロールバックフロー

```
  rollbackLatest() — 1トランザクション
    adds → DELETE, updates → PUT before, deletes → PUT record
       ▼
  assembleMonthData() → 最新状態を反映
```

## 7. データライフサイクル（2年ウィンドウ + アーカイブ）

### 7.1 基本方針

```
  アクティブ領域（最大24ヶ月）              アーカイブ領域
 ┌──────────────────────┐              ┌──────────────────┐
 │ IndexedDB            │  エクスポート  │ ローカルファイル   │
 │ 最終取込月から24ヶ月   │ ──────────→ │ 必要時にインポート  │
 └──────────────────────┘              └──────────────────┘
```

### 7.2 アーカイブ単位

月単位（Record Store のデータ構造と自然に合致）:
- records store の該当月レコード全て
- monthData store の該当月エントリ
- masterData のスナップショット
- メタ情報（エクスポート日時、レコード数、チェックサム）

### 7.3 自動アーカイブフロー

```
起動時 or インポート完了時:
  1. 最終取込月を特定
  2. 24ヶ月前より古いデータを検出
  3. ユーザーに通知 → 承認 → エクスポート → clearMonth()
  ※ 強制削除はしない
```

### 7.4 リストア

アーカイブファイル → 通常のインポートパイプラインを再利用。特別なパスは作らない。

## 8. 移行戦略

### 8.1 DB Version 2 → 3

```typescript
if (oldVersion < 3) {
  const importLog = db.createObjectStore('importLog',
    { keyPath: 'id', autoIncrement: true })
  importLog.createIndex('importId', 'importId', { unique: true })
  importLog.createIndex('importedAt', 'importedAt')

  const records = db.createObjectStore('records',
    { keyPath: '_id', autoIncrement: true })
  records.createIndex('typeYearMonth', ['_dataType', 'year', 'month'])
  records.createIndex('typeYearMonthDay', ['_dataType', 'year', 'month', 'day'])
  records.createIndex('naturalKey', '_naturalKey', { unique: true })
  records.createIndex('importLogId', '_importLogId')

  const masterData = db.createObjectStore('masterData', { keyPath: '_key' })
  masterData.createIndex('type', '_type')

  const monthData = db.createObjectStore('monthData', { keyPath: '_key' })
  monthData.createIndex('kindYearMonth', ['_kind', 'year', 'month'])
}
```

### 8.2 段階的移行（4フェーズ）

| Phase | 内容 | 影響範囲 |
|---|---|---|
| 1 | Domain 型定義 + Scope Resolution 純粋関数 + テスト | domain/ のみ |
| 2 | RecordStore IndexedDB 実装 + MonthDataAssembler | infrastructure/ + application/ |
| 3 | useImport + useMonthSwitcher を**同時に**新パイプラインに移行 | application/ |
| 4 | v2 データ移行 + v2 store 削除 + アーカイブ機能 | infrastructure/ |

**Phase 3 が同時移行の理由:**
書き込みだけ先行すると「インポートしたのに月切替でデータが消える」期間が発生する。

## 9. 不変条件（テストで保証）

| ID | 不変条件 |
|---|---|
| INV-RS-01 | ImportScope.dayFrom <= dayTo |
| INV-RS-02 | スコープ外レコードは executePlan で変更されない |
| INV-RS-03 | executePlan 前後でスコープ外月のレコード数は不変 |
| INV-RS-04 | assembleMonthData の結果は旧 loadMonthlyData と等価（移行期） |
| INV-RS-05 | classifyChanges: add + update + skip + delete はスコープ内を網羅 |
| INV-RS-06 | update の previousRecord は既存値と一致 |
| INV-RS-07 | ImportLog の count は実行結果と一致 |
| INV-RS-08 | classifyChanges は純粋関数 |
| INV-RS-09 | changeLog の件数は count と一致 |
| INV-RS-10 | changeLog.updates の before は実行前の実値と一致 |
| INV-RS-11 | rollbackLatest 後は executePlan 前と一致 |
| INV-RS-12 | executePlan 失敗時、DB状態は実行前と同一 |
| INV-RS-13 | deletePolicy 'upsert-only' のとき deletes は常に空 |
| INV-RS-14 | storeIds は常に非空配列 |
| INV-RS-15 | Budget の total は保存→復元で不変 |
| INV-RS-16 | recordsEqual は対称的かつ推移的 |

## 10. v1 からの変更履歴

| 問題 | v1 | v2 |
|---|---|---|
| prevYear 取得不能 | queryMonth が丸ごと返す | queryMonth 廃止。assembleMonthData + useAutoLoadPrevYear で分離 |
| departmentKpi 非DatedRecord | records store に格納 | monthData store に分離 |
| Budget total 消失 | day 分解 | monthData に BudgetData ごと保存 |
| 削除デフォルト暴走 | スコープ内非存在 = 即削除 | deletePolicy 追加。デフォルト upsert-only |
| ロールバック連鎖崩壊 | 任意 import を rollback | LIFO 制約。rollbackLatest() のみ |
| queryMonth 責務過大 | RecordStore が組み立て | MonthDataAssembler を Application 層に分離 |
| Natural key 衝突 | コロン区切り | タブ区切り（既存コードと統一） |
| recordsEqual 未定義 | 暗黙 | stableStringify ベースで明示定義 |
| Phase 3-4 断絶 | 段階移行 | Phase 3 で読み書き同時移行 |
| day range 非効率 | 3要素 index | typeYearMonthDay 4要素 index |
| データ寿命未定義 | なし | 2年ウィンドウ + 月単位アーカイブ |
