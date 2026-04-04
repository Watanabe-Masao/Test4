/**
 * 永続化関連のドメイン型定義
 *
 * インフラ層 (IndexedDB) の実装詳細に依存しない、
 * アプリケーション全体で共有する永続化の抽象型。
 */

/** 保存済みデータのメタ情報 */
export interface PersistedMeta {
  readonly year: number
  readonly month: number
  readonly savedAt: string // ISO 8601
}

/** フィールド単位の変更 */
export interface FieldChange {
  readonly storeId: string
  readonly storeName: string
  readonly day: number
  readonly fieldPath: string
  readonly oldValue: number | string | null
  readonly newValue: number | string | null
}

/** データ種別ごとの差分 */
export interface DataTypeDiff {
  readonly dataType: string
  readonly dataTypeName: string
  readonly inserts: readonly FieldChange[]
  readonly modifications: readonly FieldChange[]
  readonly removals: readonly FieldChange[]
}

/** 全体の差分結果 */
export interface DiffResult {
  readonly diffs: readonly DataTypeDiff[]
  /** ユーザー確認が必要か */
  readonly needsConfirmation: boolean
  /** 挿入のみで確認不要のデータ種別 */
  readonly autoApproved: readonly string[]
}

/** インポート履歴のファイルエントリ */
export interface ImportHistoryFile {
  readonly filename: string
  /** フォルダ選択時の相対パス（監査・重複判定用） */
  readonly relativePath?: string
  readonly type: string | null
  readonly typeName: string | null
  /** マージ後累計（importedCount が差分ベースの正確な値） */
  readonly rowCount?: number
  /** その月にこのファイルから追加されたレコード数 */
  readonly importedCount?: number
}

/** インポート履歴の1回分の記録 */
export interface ImportHistoryEntry {
  /** import 操作の一意識別子（冪等 restore 用） */
  readonly importId?: string
  /** ISO 8601 取込日時 */
  readonly importedAt: string
  /** 取り込まれたファイル */
  readonly files: readonly ImportHistoryFile[]
  /** 成功ファイル数 */
  readonly successCount: number
  /** 失敗ファイル数 */
  readonly failureCount: number
}
