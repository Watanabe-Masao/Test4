# Record Store アーキテクチャ

> 月別blob保存からレコード単位保存への移行設計

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
| **Scope Resolution** | ParsedFileResult[] | ImportPlan | **する（唯一の判断者）** |
| **Record Store** | ImportPlan | void（保存完了） | しない（実行のみ） |

### 2.2 Scope Resolution（判断層）の責務

**やること:**
1. 各ファイルのレコードから日付範囲を検出する（dayFrom, dayTo）
2. データ種別ごとに影響範囲（ImportScope）を確定する
3. 既存レコードとの衝突を検出する
4. ImportPlan（保存命令書）を生成する

**やらないこと:**
- ファイルの読み込み・パース（Parse 層の仕事）
- IndexedDB への書き込み（Record Store の仕事）
- レコードのフィルタリング（自分が判断したスコープで保存層に指示する）

**純粋関数であること:**
- 副作用なし。入力（レコード配列 + 既存データ情報）→ 出力（ImportPlan）
- テスト可能。実際のファイルやDBなしでテストできる

## 3. ドメイン型定義

### 3.1 ImportScope（影響範囲）

```typescript
/**
 * 1つのデータ種別×1つの年月におけるインポートの影響範囲。
 * Record Store はこのスコープ内のレコードのみを置換し、
 * スコープ外のレコードには一切触れない。
 */
interface ImportScope {
  readonly dataType: StorageDataType
  readonly year: number
  readonly month: number
  /** スコープ内の日付範囲（この範囲内の既存レコードを置換する） */
  readonly dayFrom: number
  readonly dayTo: number
  /** 対象店舗ID（空配列 = 全店舗） */
  readonly storeIds: readonly string[]
}
```

### 3.2 ImportOperation（保存命令）

```typescript
/**
 * 1つのスコープに対する保存命令。
 * Record Store はこの命令を受け取り、以下を実行する:
 * 1. scope 内の既存レコードを削除
 * 2. records を挿入
 */
interface ImportOperation {
  readonly scope: ImportScope
  readonly records: readonly DatedRecord[]
}
```

### 3.3 ImportPlan（保存命令書）

```typescript
/**
 * インポート1回分の完全な保存命令書。
 * Scope Resolution が生成し、Record Store が実行する。
 */
interface ImportPlan {
  /** 取込ID（UUID） */
  readonly importId: string
  /** 取込日時 ISO 8601 */
  readonly importedAt: string
  /** 取込元ファイル情報 */
  readonly sourceFiles: readonly SourceFileInfo[]
  /** 保存命令の一覧（データ種別×年月ごとに1つ） */
  readonly operations: readonly ImportOperation[]
  /** マスタデータの更新（stores, suppliers） */
  readonly masterUpdates: {
    readonly stores: ReadonlyMap<string, Store>
    readonly suppliers: ReadonlyMap<string, { code: string; name: string }>
  }
  /** 在庫設定の更新 */
  readonly settingsUpdates: ReadonlyMap<string, InventoryConfig>
}

interface SourceFileInfo {
  readonly filename: string
  readonly dataType: DataType
  readonly recordCount: number
  /** ファイル内のデータが実際にカバーする年月 */
  readonly coveredMonths: readonly { year: number; month: number }[]
}
```

### 3.4 ImportLog（取込履歴）

```typescript
/**
 * 保存済みの取込履歴。Record Store が ImportPlan 実行時に自動記録する。
 */
interface ImportLogEntry {
  /** 自動採番ID */
  readonly id: number
  /** 取込ID（ImportPlan.importId） */
  readonly importId: string
  /** 取込日時 */
  readonly importedAt: string
  /** 取込元ファイル */
  readonly sourceFiles: readonly SourceFileInfo[]
  /** 各オペレーションの影響範囲サマリー */
  readonly scopes: readonly ImportScope[]
  /** 置換されたレコード数 */
  readonly replacedCount: number
  /** 挿入されたレコード数 */
  readonly insertedCount: number
}
```

### 3.5 RecordStore インターフェース

```typescript
/**
 * レコード単位のデータストア。
 * ImportPlan を受け取り、スコープ内のレコードのみを安全に置換する。
 */
interface RecordStore {
  /** ImportPlan を実行する（アトミック） */
  executePlan(plan: ImportPlan): Promise<ImportLogEntry>

  /** 指定年月のデータを ImportedData として組み立てる */
  queryMonth(year: number, month: number): Promise<ImportedData | null>

  /** 取込履歴を取得する */
  getImportLog(options?: {
    year?: number
    month?: number
    limit?: number
  }): Promise<readonly ImportLogEntry[]>

  /** 保存済みの全年月を取得する */
  listStoredMonths(): Promise<readonly { year: number; month: number }[]>

  /** 指定年月のデータを削除する */
  clearMonth(year: number, month: number): Promise<void>

  /** 全データを削除する */
  clearAll(): Promise<void>

  /** 利用可能か */
  isAvailable(): boolean
}
```

## 4. IndexedDB スキーマ（v3）

### 4.1 Object Store 設計

```
shiire-arari-db v3

┌─────────────────────────────────────────────────────┐
│ importLog                                            │
│   keyPath: 'id' (autoIncrement)                      │
│   Value: ImportLogEntry                               │
│   Indexes:                                           │
│     importId (unique)                                │
│     importedAt                                       │
├─────────────────────────────────────────────────────┤
│ records                                              │
│   keyPath: '_id' (autoIncrement)                     │
│   Value: {                                           │
│     _dataType: StorageDataType                       │
│     _importLogId: number                             │
│     _naturalKey: string  // 一意キー文字列            │
│     year: number                                     │
│     month: number                                    │
│     day: number          // budget: 0                │
│     storeId: string                                  │
│     ...record fields                                 │
│   }                                                  │
│   Indexes:                                           │
│     typeYearMonth: [_dataType, year, month]           │
│     naturalKey: _naturalKey (unique)                  │
│     importLogId: _importLogId                        │
├─────────────────────────────────────────────────────┤
│ masterData                                           │
│   keyPath: '_key'                                    │
│   Value: { _key, _type: 'store'|'supplier', ...data }│
│   Indexes:                                           │
│     type: _type                                      │
├─────────────────────────────────────────────────────┤
│ monthSettings                                        │
│   keyPath: '_key'   // "YYYY-MM_storeId"             │
│   Value: InventoryConfig & { year, month }            │
│   Indexes:                                           │
│     yearMonth: [year, month]                          │
├─────────────────────────────────────────────────────┤
│ summaryCache (既存維持)                               │
│ appSettings (既存維持)                                │
└─────────────────────────────────────────────────────┘
```

### 4.2 Natural Key 生成規則

| データ種別 | Natural Key 構成 | 例 |
|---|---|---|
| purchase | `purchase:{year}:{month}:{day}:{storeId}` | `purchase:2025:2:15:001` |
| classifiedSales | `cs:{year}:{month}:{day}:{storeId}:{group}:{dept}:{line}:{class}` | `cs:2025:2:15:001:G1:D1:L1:C1` |
| categoryTimeSales | `cts:{year}:{month}:{day}:{storeId}:{dept}:{line}:{class}` | `cts:2025:2:15:001:001:01:001` |
| flowers | `flowers:{year}:{month}:{day}:{storeId}` | `flowers:2025:2:15:001` |
| directProduce | `dp:{year}:{month}:{day}:{storeId}` | `dp:2025:2:15:001` |
| interStoreIn | `isi:{year}:{month}:{day}:{storeId}` | `isi:2025:2:15:001` |
| interStoreOut | `iso:{year}:{month}:{day}:{storeId}` | `iso:2025:2:15:001` |
| consumables | `con:{year}:{month}:{day}:{storeId}` | `con:2025:2:15:001` |
| budget | `budget:{year}:{month}:{storeId}:{day}` | `budget:2025:2:001:15` |
| departmentKpi | `kpi:{year}:{month}:{deptCode}` | `kpi:2025:2:001` |

### 4.3 クエリパターン

```typescript
// 2025年2月の仕入レコードを全取得
records.index('typeYearMonth').getAll(['purchase', 2025, 2])

// 特定レコードの upsert（natural key で検索 → 上書き or 挿入）
records.index('naturalKey').get('purchase:2025:2:15:001')

// 特定インポートのレコードを全取得（ロールバック用）
records.index('importLogId').getAll(42)
```

## 5. Scope Resolution のロジック

### 5.1 日付範囲の検出

```typescript
function detectScope(
  dataType: StorageDataType,
  records: readonly DatedRecord[],
): readonly ImportScope[] {
  // 1. レコードを (year, month) でグループ化
  // 2. 各グループの dayFrom, dayTo を検出
  // 3. storeIds を収集
  // 4. ImportScope[] を返す
}
```

### 5.2 差分取込の安全性

例: 既存データに `1/4, 1/5, 2/5, 2/10` がある状態で `2月1-30日` を取り込む

```
detectScope の結果:
  scope = { dataType: 'purchase', year: 2025, month: 2, dayFrom: 1, dayTo: 30, storeIds: [] }

Record Store の実行:
  1. DELETE WHERE _dataType='purchase' AND year=2025 AND month=2 AND day BETWEEN 1 AND 30
     → 2/5, 2/10 が削除される
     → 1/4, 1/5 は month=1 なのでスコープ外 → 影響なし
  2. INSERT 新しい2月レコード
```

### 5.3 Budget の特殊処理

BudgetData は `daily: Map<day, amount>` 形式。レコード化する:

```typescript
// Budget → 個別レコードに展開
for (const [storeId, budget] of budgetMap) {
  for (const [day, amount] of budget.daily) {
    records.push({
      _dataType: 'budget',
      year, month, day, storeId,
      amount,
    })
  }
}

// 読み出し時に再集約
function reassembleBudget(records): Map<string, BudgetData> {
  // group by storeId → daily Map → total 計算
}
```

## 6. データフロー（新）

### 6.1 インポートフロー

```
  User drops files
       │
       ▼
  Parse Layer (Infrastructure)
  processDroppedFiles() → ParsedFileResult[]
       │
       ▼
  Scope Resolution (Domain/Application) ← 純粋関数
  resolveImportPlan(parsedResults, existingMonths) → ImportPlan
       │  ここで判断が完結する:
       │  - 各ファイルのカバー範囲
       │  - 既存データとの衝突検出
       │  - 置換スコープの確定
       │
       ├─ needsConfirmation? → UI に差分表示 → ユーザー承認
       │
       ▼
  Record Store (Infrastructure)
  executePlan(plan) → ImportLogEntry
       │  指示通りに実行するだけ:
       │  - スコープ内レコード削除
       │  - 新レコード挿入
       │  - Import Log 記録
       │
       ▼
  State Update (Application)
  queryMonth(year, month) → ImportedData → useDataStore.setData()
```

### 6.2 月切替フロー

```
  User selects month
       │
       ▼
  Record Store.queryMonth(year, month)
       │  ← save-on-switch 不要（レコードは既にDBにある）
       │
       ▼
  ImportedData → useDataStore.setData()
       │
       ▼
  計算パイプライン → UI 更新
```

**月切替時にデータを保存する必要がなくなる。** データは常にDBにあり、
月切替は単にクエリ条件を変えるだけ。

## 7. 移行戦略

### 7.1 DB Version 2 → 3 マイグレーション

```typescript
// onupgradeneeded v2 → v3
if (oldVersion < 3) {
  db.createObjectStore('importLog', { keyPath: 'id', autoIncrement: true })
  db.createObjectStore('records', { keyPath: '_id', autoIncrement: true })
  db.createObjectStore('masterData', { keyPath: '_key' })
  db.createObjectStore('monthSettings', { keyPath: '_key' })
  // indexes は createObjectStore の後に追加
}
```

### 7.2 データ移行（非同期、初回起動時）

```
起動 → DB v3 スキーマ作成
     → v2 データ存在チェック
     → 存在する場合:
        1. 各月の ImportedData を読み込み
        2. レコード単位に分解
        3. records store に挿入
        4. importLog にマイグレーションエントリ記録
        5. v2 データはそのまま残す（フォールバック用）
```

### 7.3 段階的移行

| Phase | 内容 | 影響範囲 |
|---|---|---|
| 1 | Domain 型定義 + Scope Resolution 純粋関数 | domain/ のみ |
| 2 | RecordStore IndexedDB 実装 | infrastructure/ のみ |
| 3 | useImport を新パイプラインに移行 | application/ |
| 4 | useMonthSwitcher をクエリベースに | application/ |
| 5 | v2 データ移行 + v2 store 削除 | infrastructure/ |

各フェーズでテスト・ビルドが通ること。Phase 3 まで完了すれば
新規インポートは新アーキテクチャで動作する。

## 8. 既存 DataRepository との関係

`DataRepository` インターフェースは段階的に `RecordStore` に置き換える:

- Phase 3 まで: `DataRepository` と `RecordStore` が共存
- Phase 4 で: `useMonthSwitcher` が `RecordStore.queryMonth()` を使用
- Phase 5 で: `DataRepository` の月別 CRUD メソッドを非推奨化

`RecordStore` は `DataRepository` を**置き換える**のではなく、
`DataRepository.saveMonthlyData()` の内部実装として段階的に組み込む。

## 9. DuckDB との関係

DuckDB は引き続き「探索エンジン」として機能する。
データソースが月別blobからレコードストアに変わるだけ:

```
現行: IndexedDB (月別blob) → loadMonth() → DuckDB
新規: IndexedDB (records)  → queryMonth() → ImportedData → loadMonth() → DuckDB
```

将来的には DuckDB が records store から直接読み込む最適化も可能だが、
初期実装では ImportedData を経由する。

## 10. 不変条件（テストで保証）

| ID | 不変条件 | テスト |
|---|---|---|
| INV-RS-01 | ImportScope.dayFrom <= ImportScope.dayTo | resolveImportPlan のガードテスト |
| INV-RS-02 | スコープ外のレコードは executePlan で変更されない | RecordStore のガードテスト |
| INV-RS-03 | executePlan 前後で、スコープ外月のレコード数は不変 | RecordStore のガードテスト |
| INV-RS-04 | queryMonth の結果は saveMonthlyData の結果と等価 | 移行期の同値テスト |
| INV-RS-05 | ImportLog.insertedCount = plan.operations の全レコード数合計 | executePlan の事後条件 |
