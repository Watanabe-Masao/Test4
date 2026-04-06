/**
 * 責務タグレジストリ — hook/コンポーネントの責務を正直に分類
 *
 * 原則:
 * - 自動推定はしない。中身を確認して正確にタグを付ける
 * - 未分類は未分類のまま。嘘の単一責務タグは付けない
 * - 複数責務があるファイルには複数タグを付ける（AND の可視化）
 * - 新規ファイルはレジストリ登録必須（未登録なら CI 失敗）
 * - 既存の未分類は徐々に減らす（SNAPSHOT で管理）
 *
 * @see references/03-guides/responsibility-separation-catalog.md
 */

// ─── 責務タグ定義 ─────────────────────────────────────

/** 責務タグ（R: プレフィックス） */
export type ResponsibilityTag =
  | 'R:query-plan' // DuckDB クエリの組み立て・実行計画
  | 'R:query-exec' // DuckDB クエリ実行 hook
  | 'R:calculation' // 純粋な計算・集計ロジック
  | 'R:data-fetch' // 外部データの取得・ロード
  | 'R:state-machine' // UI 操作状態の管理
  | 'R:transform' // データ変換・整形・ViewModel
  | 'R:orchestration' // 複数 hook の結合・配信
  | 'R:chart-view' // チャート描画コンポーネント
  | 'R:chart-option' // ECharts option 構築
  | 'R:page' // ページレベルのレイアウト
  | 'R:widget' // ウィジェット（ページ内独立 UI）
  | 'R:form' // フォーム・入力・設定 UI
  | 'R:navigation' // ルーティング・ドリルダウン
  | 'R:persistence' // 永続化・バックアップ
  | 'R:context' // React Context Provider/slice
  | 'R:layout' // レイアウト・ナビゲーション UI
  | 'R:adapter' // 外部 API アダプタ・橋渡し
  | 'R:utility' // 汎用ヘルパー・共通フィルタ
  | 'R:reducer' // state reducer / action 定義
  | 'R:barrel' // re-export のみのバレルファイル

/** 責務タグのメタデータ */
export interface ResponsibilityTagDef {
  readonly description: string
  readonly oneLiner: string
}

export const RESPONSIBILITY_TAG_DEFS: Record<ResponsibilityTag, ResponsibilityTagDef> = {
  'R:query-plan': {
    description: 'DuckDB クエリ入力の構築と実行計画',
    oneLiner: 'クエリの what/when/where を宣言する',
  },
  'R:query-exec': {
    description: 'DuckDB クエリの実行とキャッシュ管理',
    oneLiner: 'クエリを実行して結果を返す',
  },
  'R:calculation': {
    description: '純粋な計算・集計ロジック',
    oneLiner: '入力から導出値を算出する',
  },
  'R:data-fetch': {
    description: '外部データの取得・ロード・副作用',
    oneLiner: '外部からデータを取得して store に反映する',
  },
  'R:state-machine': {
    description: 'UI 操作状態の管理（drill/filter/selection）',
    oneLiner: 'ユーザー操作に応じて UI 状態を遷移する',
  },
  'R:transform': {
    description: 'データ変換・整形・ViewModel 構築',
    oneLiner: '生データを UI 表示用モデルに変換する',
  },
  'R:orchestration': {
    description: '複数 hook/module の結合・配信',
    oneLiner: '複数のデータ源を束ねて消費者に配信する',
  },
  'R:chart-view': {
    description: 'チャート描画コンポーネント',
    oneLiner: 'データを受け取ってチャートを描画する',
  },
  'R:chart-option': {
    description: 'ECharts option の構築',
    oneLiner: 'チャートデータから ECharts option を組み立てる',
  },
  'R:page': {
    description: 'ページレベルのレイアウト・構成',
    oneLiner: 'ページ全体の構成と hook の接続を担う',
  },
  'R:widget': {
    description: 'ウィジェット（ページ内独立 UI ブロック）',
    oneLiner: '独立した UI ブロックを描画する',
  },
  'R:form': {
    description: 'フォーム・入力・設定パネル',
    oneLiner: 'ユーザー入力を受け取って値を変更する',
  },
  'R:navigation': {
    description: 'ルーティング・ドリルダウン・パンくず',
    oneLiner: '画面遷移やドリルダウンの状態を管理する',
  },
  'R:persistence': {
    description: '永続化・バックアップ・リストア',
    oneLiner: 'データの保存・復元・同期を担う',
  },
  'R:context': {
    description: 'React Context Provider / slice',
    oneLiner: 'コンテキスト経由でデータを子コンポーネントに配信する',
  },
  'R:layout': {
    description: 'レイアウト・ナビゲーション・シェル',
    oneLiner: 'アプリの骨格レイアウトを構成する',
  },
  'R:adapter': {
    description: '外部 API アダプタ・橋渡し',
    oneLiner: '外部サービスとの接続を抽象化する',
  },
  'R:utility': {
    description: '汎用ヘルパー・共通フィルタ・定数',
    oneLiner: '複数箇所で使われる共通処理を提供する',
  },
  'R:reducer': {
    description: 'state reducer / action 定義',
    oneLiner: '状態遷移のルールを定義する',
  },
  'R:barrel': {
    description: 're-export のみのバレルファイル',
    oneLiner: 'モジュールの公開 API を束ねる',
  },
}

// ─── レジストリ本体 ───────────────────────────────────

export interface ResponsibilityEntry {
  /** 責務タグ（複数 = AND = 分離候補） */
  readonly tags: readonly ResponsibilityTag[]
}

/**
 * 手動で正確に分類されたファイルのレジストリ。
 *
 * キー: src/ 相対パス
 * 値: 確認済みの責務タグ（複数可）
 *
 * ここに載っていないファイルは「未分類」。
 * 新規ファイルはここに登録しないと CI が落ちる。
 */
export const RESPONSIBILITY_REGISTRY: Readonly<Record<string, ResponsibilityEntry>> = {
  // ★ 既存ファイルは徐々にここに登録していく。
  // ★ 登録時は中身を確認し、正直にタグを付ける。
  // ★ 複数タグ = AND = 分離候補として可視化される。
}

// ─── 解決関数 ─────────────────────────────────────────

/**
 * ファイルが分類済みかどうかを返す。
 * レジストリに登録されていれば分類済み、なければ未分類。
 */
export function isClassified(relPath: string): boolean {
  return relPath in RESPONSIBILITY_REGISTRY
}

/**
 * ファイルの責務タグを返す。未分類なら null。
 */
export function getResponsibilityTags(relPath: string): readonly ResponsibilityTag[] | null {
  return RESPONSIBILITY_REGISTRY[relPath]?.tags ?? null
}
