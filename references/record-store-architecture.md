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

### 3.2 RecordChange（レコード単位の変更分類）

Scope Resolution は各レコードを「追加・更新・削除」に分類する。
Record Store はこの分類を受け取り、判断せずに実行する。

```typescript
/** 既存レコードの参照キー */
interface RecordKey {
  readonly naturalKey: string
  readonly dataType: StorageDataType
}

/** 追加: 既存DBに存在しないレコード */
interface RecordAdd {
  readonly kind: 'add'
  readonly naturalKey: string
  readonly record: DatedRecord
}

/** 更新: 既存DBに存在し、値が変わったレコード */
interface RecordUpdate {
  readonly kind: 'update'
  readonly naturalKey: string
  readonly record: DatedRecord
  /** 更新前の値（差分表示・ロールバック用） */
  readonly previousRecord: DatedRecord
}

/** 削除: 新データのスコープ内に存在するが、新データに含まれないレコード */
interface RecordDelete {
  readonly kind: 'delete'
  readonly naturalKey: string
  /** 削除前の値（ロールバック用） */
  readonly previousRecord: DatedRecord
}

type RecordChange = RecordAdd | RecordUpdate | RecordDelete
```

### 3.3 ImportOperation（保存命令）

```typescript
/**
 * 1つのスコープに対する保存命令。
 * Scope Resolution が追加・更新・削除を分類済み。
 * Record Store は分類に従い1トランザクションで実行する。
 *
 * 判断は Scope Resolution が行う。Record Store は判断しない。
 */
interface ImportOperation {
  readonly scope: ImportScope
  /** 新規追加するレコード */
  readonly adds: readonly RecordAdd[]
  /** 値を更新するレコード */
  readonly updates: readonly RecordUpdate[]
  /** 削除するレコード */
  readonly deletes: readonly RecordDelete[]
}
```

**なぜ実行係は1つで良いか:**
- 追加・更新・削除は1つの IndexedDB トランザクション内で実行する
- 分離すると「追加成功・削除失敗」のような不整合が起きる
- **判断の分類は3つ、実行は1アトミック操作**

### 3.4 ImportPlan（保存命令書）

```typescript
/**
 * インポート1回分の完全な保存命令書。
 * Scope Resolution が生成し、Record Store が実行する。
 *
 * Scope Resolution の出力 = Record Store の入力。
 * この型が両者の契約であり、判断と実行の境界線。
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

/** ImportPlan のサマリー（UI表示・ユーザー確認用） */
interface ImportPlanSummary {
  readonly totalAdds: number
  readonly totalUpdates: number
  readonly totalDeletes: number
  /** 変更がなく確認不要か */
  readonly isEmpty: boolean
  /** ユーザー確認が必要か（更新・削除がある場合） */
  readonly needsConfirmation: boolean
  /** データ種別ごとの内訳 */
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
  /** ファイル内のデータが実際にカバーする年月 */
  readonly coveredMonths: readonly { year: number; month: number }[]
}
```

### 3.5 ImportLog（取込履歴）

```typescript
/**
 * 保存済みの取込履歴。Record Store が ImportPlan 実行時に自動記録する。
 * ロールバックに必要な情報（previousRecord）も保持する。
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
  /** 追加されたレコード数 */
  readonly addedCount: number
  /** 更新されたレコード数 */
  readonly updatedCount: number
  /** 削除されたレコード数 */
  readonly deletedCount: number
  /** ロールバック済みか */
  readonly rolledBack: boolean
  /**
   * 変更追跡ログ（audit trail + ロールバック用）。
   *
   * 全ての変更を完全に記録する:
   * - 何を追加したか（追加後の値）
   * - 何を削除したか（削除前の値）
   * - 何を更新したか（更新前の値 + 更新後の値）
   *
   * 用途:
   * 1. ユーザーへの変更レポート表示
   * 2. ロールバック（逆操作の実行）
   * 3. 監査証跡（いつ・どのファイルから・何が変わったか）
   */
  readonly changeLog: {
    /** 追加されたレコード（ロールバック時: これらを削除） */
    readonly adds: readonly ChangeLogAdd[]
    /** 更新されたレコード（ロールバック時: before の値に復元） */
    readonly updates: readonly ChangeLogUpdate[]
    /** 削除されたレコード（ロールバック時: これらを再挿入） */
    readonly deletes: readonly ChangeLogDelete[]
  }
}

/** 追加の記録 */
interface ChangeLogAdd {
  readonly naturalKey: string
  readonly dataType: StorageDataType
  /** 追加された値 */
  readonly record: DatedRecord
}

/** 更新の記録 */
interface ChangeLogUpdate {
  readonly naturalKey: string
  readonly dataType: StorageDataType
  /** 更新前の値 */
  readonly before: DatedRecord
  /** 更新後の値 */
  readonly after: DatedRecord
  /** 変更されたフィールド（UI表示用） */
  readonly changedFields: readonly FieldDiff[]
}

/** 削除の記録 */
interface ChangeLogDelete {
  readonly naturalKey: string
  readonly dataType: StorageDataType
  /** 削除された値 */
  readonly record: DatedRecord
}

/** フィールド単位の差分（更新の詳細表示用） */
interface FieldDiff {
  readonly fieldPath: string
  readonly before: number | string | null
  readonly after: number | string | null
}
```

### 3.6 エラーとトランザクション結果

```typescript
// ─── エラー型（構造化、UIフィードバック可能） ─────────────────

/** エラーの発生フェーズ */
type ImportErrorPhase = 'parse' | 'scope-resolution' | 'transaction' | 'rollback'

/** 構造化されたインポートエラー */
interface ImportError {
  /** エラー発生フェーズ */
  readonly phase: ImportErrorPhase
  /** エラーコード（プログラム的判定用） */
  readonly code: ImportErrorCode
  /** ユーザー向けメッセージ */
  readonly message: string
  /** 影響を受けたデータ種別（特定できる場合） */
  readonly dataType?: StorageDataType
  /** 影響を受けた年月（特定できる場合） */
  readonly yearMonth?: { year: number; month: number }
  /** 技術的詳細（ログ・デバッグ用） */
  readonly detail?: string
}

type ImportErrorCode =
  // parse フェーズ
  | 'PARSE_FAILED'           // ファイル読み込み失敗
  | 'INVALID_FORMAT'         // フォーマット不正
  // scope-resolution フェーズ
  | 'SCOPE_CONFLICT'         // スコープ間の矛盾（同一キーが複数ファイルに存在）
  | 'EMPTY_SCOPE'            // スコープが空（有効なレコードなし）
  // transaction フェーズ
  | 'TRANSACTION_ABORTED'    // IndexedDB トランザクション中断
  | 'QUOTA_EXCEEDED'         // ストレージ容量超過
  | 'CONSTRAINT_VIOLATION'   // 一意制約違反（natural key 重複）
  | 'WRITE_FAILED'           // 書き込み失敗（その他）
  // rollback フェーズ
  | 'ROLLBACK_FAILED'        // ロールバック自体が失敗（重大）
  | 'ROLLBACK_PARTIAL'       // ロールバックが部分的にしか完了しなかった（重大）
  | 'IMPORT_NOT_FOUND'       // ロールバック対象のインポートが見つからない

// ─── 実行結果（成功 or 失敗、常に構造化） ─────────────────────

/** executePlan の実行結果 */
type ExecutePlanResult =
  | { readonly ok: true; readonly entry: ImportLogEntry }
  | { readonly ok: false; readonly error: ImportError; readonly rolledBack: boolean }

/** rollbackImport の実行結果 */
type RollbackResult =
  | { readonly ok: true; readonly restoredCount: number }
  | { readonly ok: false; readonly error: ImportError }
```

### 3.7 RecordStore インターフェース

```typescript
/**
 * レコード単位のデータストア。
 * ImportPlan を受け取り、分類済みの追加・更新・削除を1トランザクションで実行する。
 * Record Store は判断しない。Scope Resolution が分類した通りに実行するだけ。
 *
 * トランザクション保証:
 * - executePlan は1つの IndexedDB トランザクション内で全操作を実行する
 * - トランザクション中にエラーが発生した場合、IndexedDB が自動的に全操作を巻き戻す
 * - Import Log はトランザクション成功後にのみ記録される
 * - 結果は常に ExecutePlanResult として返され、呼び出し元がエラーをハンドリングできる
 */
interface RecordStore {
  /**
   * ImportPlan を実行する（1トランザクション、アトミック）。
   *
   * 成功: { ok: true, entry: ImportLogEntry }
   * 失敗: { ok: false, error: ImportError, rolledBack: true }
   *
   * IndexedDB トランザクションは失敗時に自動巻き戻しするため、
   * 「途中まで書き込まれた」状態にはならない。
   */
  executePlan(plan: ImportPlan): Promise<ExecutePlanResult>

  /**
   * 過去のインポートをロールバックする。
   *
   * ImportLogEntry に記録された importId を指定し、
   * そのインポートで行われた変更を逆転する:
   * - adds → 該当レコードを削除
   * - updates → previousRecord の値に復元
   * - deletes → previousRecord を再挿入
   *
   * ロールバック自体も1トランザクションで実行する。
   */
  rollbackImport(importId: string): Promise<RollbackResult>

  /**
   * 指定スコープ内の既存レコードを取得する。
   * Scope Resolution が差分計算（add/update/delete 分類）に使用する。
   * Record Store 自身は判断に使わない。
   */
  queryScope(scope: ImportScope): Promise<readonly StoredRecord[]>

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

### 5.1 全体フロー（2段階）

Scope Resolution は2段階で ImportPlan を生成する:

```
Stage 1: スコープ検出（純粋関数、DB不要）
  入力: ParsedFileResult[]
  処理: レコードを分析し、各データ種別×年月の影響範囲を確定
  出力: ImportScope[]

Stage 2: 差分分類（純粋関数、既存レコード情報が必要）
  入力: ImportScope[] + 新レコード[] + 既存レコード[]（RecordStore.queryScope 経由）
  処理: 各レコードを add / update / delete に分類
  出力: ImportPlan（= ImportOperation[] を含む完全な保存命令書）
```

Stage 2 で既存レコードが必要な理由:
- 新レコードが「追加」か「更新」かは、既存データと突き合わせないと判断できない
- スコープ内の既存レコードのうち、新データに含まれないものが「削除」対象

### 5.2 Stage 1: スコープ検出

```typescript
/**
 * パース結果からインポートスコープを検出する（純粋関数）。
 * ファイル内のレコードの year/month/day を分析し、
 * データ種別×年月ごとの影響範囲を確定する。
 */
function detectScopes(
  parsedResults: readonly ParsedFileResult[],
): readonly ImportScope[] {
  // 1. 各ファイルのレコードを dataType × (year, month) でグループ化
  // 2. 各グループの dayFrom = min(day), dayTo = max(day)
  // 3. storeIds を収集
  // 4. ImportScope[] を返す
}
```

### 5.3 Stage 2: 差分分類

```typescript
/**
 * 新レコードと既存レコードを突き合わせ、add/update/delete に分類する（純粋関数）。
 *
 * 入力:
 *   scope: このオペレーションの影響範囲
 *   incomingRecords: 新しくインポートされるレコード
 *   existingRecords: RecordStore.queryScope() で取得した既存レコード
 *
 * 分類ルール:
 *   - incoming にあり existing にない → add
 *   - incoming にも existing にもあり、値が異なる → update
 *   - incoming にも existing にもあり、値が同じ → 変更なし（スキップ）
 *   - existing にあり incoming にない（かつスコープ内）→ delete
 */
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

  // incoming を走査: add or update
  for (const [key, record] of incomingByKey) {
    const existing = existingByKey.get(key)
    if (!existing) {
      adds.push({ kind: 'add', naturalKey: key, record })
    } else if (!recordsEqual(record, existing)) {
      updates.push({ kind: 'update', naturalKey: key, record, previousRecord: existing })
    }
    // 値が同じならスキップ（無変更）
  }

  // existing を走査: delete（スコープ内で incoming に含まれない）
  for (const [key, existing] of existingByKey) {
    if (!incomingByKey.has(key)) {
      deletes.push({ kind: 'delete', naturalKey: key, previousRecord: existing })
    }
  }

  return { scope, adds, updates, deletes }
}
```

### 5.4 差分取込の安全性

例: 既存データに `1/4, 1/5, 2/5, 2/10` がある状態で `2月1-30日` を取り込む

```
Stage 1 — detectScopes:
  scope = { dataType: 'purchase', year: 2025, month: 2, dayFrom: 1, dayTo: 30 }

RecordStore.queryScope(scope):
  既存 = [2/5: 10000, 2/10: 10000]
  ※ 1/4, 1/5 は month=1 なのでスコープ外 → クエリ対象にすらならない

Stage 2 — classifyChanges:
  incoming = [2/1: 8000, 2/5: 12000, 2/15: 9000]
  existing = [2/5: 10000, 2/10: 10000]

  分類結果:
    add:    [2/1: 8000, 2/15: 9000]     ← 新規
    update: [2/5: 10000 → 12000]         ← 値変更
    delete: [2/10: 10000]                ← 新データに含まれない

Record Store の実行（1トランザクション）:
  PUT 2/1: 8000
  PUT 2/5: 12000
  PUT 2/15: 9000
  DELETE 2/10
  ※ 1/4, 1/5 は一切触れない（スコープ外）
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
  Parse Layer (Infrastructure) ← 変換のみ、判断しない
  processDroppedFiles() → ParsedFileResult[]
       │
       ▼
  Scope Resolution — Stage 1 (Domain) ← 純粋関数
  detectScopes(parsedResults) → ImportScope[]
       │  各ファイルの影響範囲を確定
       │
       ▼
  Record Store — queryScope() (Infrastructure) ← 読み取りのみ
  各スコープ内の既存レコードを取得
       │
       ▼
  Scope Resolution — Stage 2 (Domain) ← 純粋関数
  classifyChanges(scope, incoming, existing) → ImportOperation
       │  各レコードを add / update / delete に分類
       │  ここで判断が完結する
       │
       ▼
  ImportPlan 組み立て → ImportPlanSummary 生成
       │
       ├─ needsConfirmation? → UI に差分表示
       │   「追加 X件、更新 Y件、削除 Z件」
       │   → ユーザー承認 / キャンセル
       │
       ▼
  Record Store — executePlan() (Infrastructure) ← 実行のみ、判断しない
  1トランザクションで:
       │  - adds → PUT（新規挿入）
       │  - updates → PUT（上書き）
       │  - deletes → DELETE
       │  - Import Log + undoLog 記録
       │
       ├─ ok: true → 成功
       │       ▼
       │  State Update (Application)
       │  queryMonth(year, month) → ImportedData → useDataStore.setData()
       │
       └─ ok: false → 失敗
               ▼
          エラーフィードバック (Application → UI)
          ImportError をユーザーに構造化表示:
            phase: どの段階で失敗したか
            code: 何が起きたか
            message: ユーザー向け説明
            dataType/yearMonth: どのデータが影響を受けたか
          ※ IndexedDB トランザクションは失敗時に自動巻き戻し
          ※ データは変更前の状態を維持（中途半端な状態にならない）
```

### 6.3 ロールバックフロー

```
  User requests rollback (importId を指定)
       │
       ▼
  Record Store — rollbackImport(importId) (Infrastructure)
  1. Import Log から changeLog を取得
  2. 1トランザクションで逆操作:
       │  - changeLog.adds → DELETE（追加されたレコードを削除）
       │  - changeLog.updates → PUT before の値（更新前の値に復元）
       │  - changeLog.deletes → PUT record の値（削除されたレコードを再挿入）
       │  - Import Log に rolledBack: true を記録
       │
       ├─ ok: true → 成功
       │       ▼
       │  State Update → queryMonth() で最新状態を反映
       │
       └─ ok: false → 失敗（重大エラー）
               ▼
          エラーフィードバック: ROLLBACK_FAILED / ROLLBACK_PARTIAL
          ※ ユーザーに「手動でのデータ再インポート」を促す
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
| INV-RS-01 | ImportScope.dayFrom <= ImportScope.dayTo | detectScopes のガードテスト |
| INV-RS-02 | スコープ外のレコードは executePlan で変更されない | RecordStore のガードテスト |
| INV-RS-03 | executePlan 前後で、スコープ外月のレコード数は不変 | RecordStore のガードテスト |
| INV-RS-04 | queryMonth の結果は saveMonthlyData の結果と等価 | 移行期の同値テスト |
| INV-RS-05 | classifyChanges: add + update + delete はスコープ内レコードを網羅 | classifyChanges のガードテスト |
| INV-RS-06 | classifyChanges: update の previousRecord は既存値と一致 | classifyChanges の事後条件 |
| INV-RS-07 | ImportLog の addedCount/updatedCount/deletedCount は実行結果と一致 | executePlan の事後条件 |
| INV-RS-08 | classifyChanges は純粋関数（同じ入力に同じ出力） | 決定性テスト |
| INV-RS-09 | changeLog.adds.length = addedCount, updates.length = updatedCount, deletes.length = deletedCount | changeLog 完全性 |
| INV-RS-10 | changeLog.updates の before は実行前の実値と一致 | 更新追跡の正確性 |
| INV-RS-11 | rollback 後の queryMonth 結果は executePlan 前の状態と一致 | ロールバック完全性 |
| INV-RS-12 | executePlan 失敗時、DBの状態は実行前と同一（中途半端な変更なし） | トランザクション原子性 |
