/**
 * Phase 7.2: データリポジトリインターフェース
 *
 * IndexedDB / REST API / GraphQL などバックエンドを差し替え可能にする。
 * 現在は IndexedDB 実装のみ。将来クラウド連携時にこのインターフェースに
 * REST/GraphQL 実装を追加することで、アプリケーション層の変更なしに移行できる。
 */
import type { ImportedData, DataType } from '@/domain/models'

/** 永続化されたセッションのメタデータ */
export interface PersistedSessionMeta {
  readonly year: number
  readonly month: number
  readonly savedAt: string // ISO 8601
}

/** 月別データサマリー */
export interface MonthDataSummaryItem {
  readonly dataType: string
  readonly label: string
  readonly recordCount: number
}

/**
 * データリポジトリ抽象インターフェース
 *
 * アプリケーション層はこのインターフェースを通じてデータにアクセスする。
 * 具体的なストレージ実装 (IndexedDB, REST API 等) はインフラ層で提供する。
 */
export interface DataRepository {
  /** データが利用可能か判定する */
  isAvailable(): boolean

  /** 指定年月の全データを保存する */
  saveMonthlyData(data: ImportedData, year: number, month: number): Promise<void>

  /** 指定年月の全データを読み込む (存在しない場合 null) */
  loadMonthlyData(year: number, month: number): Promise<ImportedData | null>

  /** 特定データ種別のみを保存する */
  saveDataSlice(
    data: ImportedData,
    year: number,
    month: number,
    dataTypes: readonly DataType[],
  ): Promise<void>

  /** 特定データ種別のスライスを読み込む */
  loadDataSlice<T>(year: number, month: number, dataType: string): Promise<T | null>

  /** 最後に保存したセッションのメタデータを取得する */
  getSessionMeta(): Promise<PersistedSessionMeta | null>

  /** 指定年月のデータを削除する */
  clearMonth(year: number, month: number): Promise<void>

  /** 全データを削除する */
  clearAll(): Promise<void>

  /** 保存されている全年月を一覧取得する */
  listStoredMonths(): Promise<{ year: number; month: number }[]>

  /** 指定年月のデータサマリーを取得する */
  getDataSummary(year: number, month: number): Promise<MonthDataSummaryItem[]>
}
