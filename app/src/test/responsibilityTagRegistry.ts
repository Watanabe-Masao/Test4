/**
 * 責務タグレジストリ — 全 hook/コンポーネントの責務分類
 *
 * 全ファイルに R: プレフィックスの責務タグを割り当て、
 * 未分類のファイルが存在しないことをガードテストで保証する。
 *
 * 新規ファイルを追加する場合は、必ずこのレジストリに登録するか、
 * 自動分類ルールに合致するファイル名にすること。
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
  /** このタグの責務を 1 文で説明 */
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

// ─── 自動分類ルール ───────────────────────────────────

/**
 * ファイルパス（src/ 相対）から責務タグを自動推定する。
 * 推定できない場合は null を返す → 未分類。
 *
 * ルールは優先度順。先にマッチしたものが採用される。
 */
export function inferResponsibilityTag(relPath: string): ResponsibilityTag | null {
  // バレル
  if (relPath.endsWith('/index.ts') || relPath.endsWith('/index.tsx')) return 'R:barrel'

  // Reducer
  if (/[Rr]educer\.ts$/.test(relPath)) return 'R:reducer'

  // Plan hooks
  if (/[Pp]lan\.ts$/.test(relPath) || relPath.includes('/plans/')) return 'R:query-plan'

  // DuckDB query hooks
  if (relPath.includes('/duckdb/') && /^application\/hooks\//.test(relPath)) {
    if (/Logic\.ts$/.test(relPath)) return 'R:calculation'
    if (/Builders?\.ts$/.test(relPath)) return 'R:transform'
    return 'R:query-exec'
  }

  // Chart builders
  if (/\.builders\.ts$/.test(relPath)) return 'R:chart-option'

  // Chart VMs
  if (/\.vm\.ts(x)?$/.test(relPath)) return 'R:transform'

  // presentation/hooks/slices/
  if (relPath.includes('presentation/hooks/slices/')) return 'R:context'

  // presentation/hooks/
  if (/^presentation\/hooks\//.test(relPath)) return 'R:utility'

  // Chart .tsx in presentation/components/charts/
  if (relPath.includes('/charts/') && relPath.endsWith('.tsx')) return 'R:chart-view'

  // Chart .ts (logic/data hooks) in presentation/components/charts/
  if (relPath.includes('/charts/') && relPath.endsWith('.ts')) {
    if (/Logic\.ts$/.test(relPath)) return 'R:calculation'
    if (/Data\.ts$/.test(relPath) || /^use/.test(relPath.split('/').pop() ?? '')) {
      return 'R:state-machine'
    }
    return 'R:utility'
  }

  // Pages
  if (/Page\.tsx$/.test(relPath)) return 'R:page'
  if (relPath.includes('/pages/') && relPath.endsWith('.tsx')) {
    if (relPath.includes('/widgets/')) return 'R:widget'
    return 'R:page'
  }
  if (relPath.includes('/pages/') && relPath.endsWith('.ts')) {
    if (/Logic\.ts$/.test(relPath) || /Builders?\.ts$/.test(relPath)) return 'R:calculation'
    if (/Data\.ts$/.test(relPath) || /State\.ts$/.test(relPath)) return 'R:state-machine'
    return 'R:utility'
  }

  // Layout
  if (relPath.includes('/Layout/')) return 'R:layout'

  // Features — manifest
  if (relPath.startsWith('features/') || relPath.includes('/features/') && relPath.endsWith('manifest.ts')) return 'R:barrel'

  // Features — domain
  if (relPath.startsWith('features/') || relPath.includes('/features/') && relPath.includes('/domain/')) return 'R:calculation'

  // Features — application hooks
  if (relPath.startsWith('features/') || relPath.includes('/features/') && /use[A-Z].*\.ts$/.test(relPath.split('/').pop() ?? '')) {
    if (relPath.includes('/plans/')) return 'R:query-plan'
    return 'R:orchestration'
  }

  // Features — application non-hook .ts
  if (relPath.startsWith('features/') || relPath.includes('/features/') && relPath.includes('/application/') && relPath.endsWith('.ts')) {
    if (/Logic\.ts$/.test(relPath)) return 'R:calculation'
    if (/Builders?\.ts$/.test(relPath)) return 'R:transform'
    if (/Types?\.ts$/.test(relPath)) return 'R:utility'
    if (/Context\.ts$/.test(relPath)) return 'R:context'
    if (/Factory|Prep|Index|Load|Rules|Accessors|Offset/.test(relPath.split('/').pop() ?? '')) {
      return 'R:utility'
    }
    return 'R:utility'
  }

  // Features — ui components
  if (relPath.startsWith('features/') || relPath.includes('/features/') && relPath.endsWith('.tsx')) {
    if (/\.vm\.tsx$/.test(relPath)) return 'R:transform'
    return 'R:widget'
  }

  // Features — ui .ts (non-.tsx)
  if (relPath.startsWith('features/') || relPath.includes('/features/') && relPath.endsWith('.ts')) {
    if (/Logic\.ts$/.test(relPath)) return 'R:calculation'
    if (/Builders?\.ts$/.test(relPath)) return 'R:transform'
    if (/Types?\.ts$/.test(relPath)) return 'R:utility'
    return 'R:utility'
  }

  // application/hooks/use* — general hooks
  if (/^application\/hooks\/use/.test(relPath)) {
    const name = relPath.split('/').pop() ?? ''
    if (/Persist|Backup|Storage|Import|Export/.test(name)) return 'R:persistence'
    if (/Load|Fetch|Auto/.test(name)) return 'R:data-fetch'
    if (/Drill|Route|Switch/.test(name)) return 'R:navigation'
    if (/Selection|Filter/.test(name)) return 'R:state-machine'
    if (/Calculation|Statistics|Sensitivity|Factor|Analysis/.test(name)) return 'R:calculation'
    if (/Orchestrat|Widget|Context/.test(name)) return 'R:orchestration'
    if (/Weather|Comparison|Period/.test(name)) return 'R:data-fetch'
    if (/Explanation|Metric|Alert/.test(name)) return 'R:transform'
    return null // 推定不能 → 手動分類が必要
  }

  // application/hooks/ non-use* (logic, helpers)
  if (/^application\/hooks\//.test(relPath)) {
    if (/Logic\.ts$/.test(relPath)) return 'R:calculation'
    if (/\.helpers\.ts$/.test(relPath)) return 'R:utility'
    return null
  }

  // presentation/components/ (non-charts)
  if (relPath.includes('presentation/components/') && relPath.endsWith('.tsx')) {
    if (/Settings|Config|Editor|Input|Slider|DropZone/.test(relPath)) return 'R:form'
    if (/Context/.test(relPath)) return 'R:context'
    if (/DevTools/.test(relPath)) return 'R:utility'
    return 'R:widget'
  }
  if (relPath.includes('presentation/components/') && relPath.endsWith('.ts')) {
    return 'R:utility'
  }

  return null
}

// ─── 手動分類オーバーライド ─────────────────────────────

/**
 * 自動分類で正しく推定できないファイルの手動オーバーライド。
 * キー: src/ 相対パス
 */
export const RESPONSIBILITY_OVERRIDES: Readonly<Record<string, ResponsibilityTag>> = {
  // application/hooks — 自動分類が曖昧なもの
  'application/hooks/analytics.ts': 'R:adapter',
  'application/hooks/calculation.ts': 'R:barrel',
  'application/hooks/data.ts': 'R:barrel',
  'application/hooks/ui.ts': 'R:barrel',
  'application/hooks/duckdbFingerprint.ts': 'R:utility',
  'application/hooks/monthlyHistoryLogic.ts': 'R:calculation',
  'application/hooks/useI18n.ts': 'R:adapter',
  'application/hooks/useSettings.ts': 'R:persistence',
  'application/hooks/useAppShortcuts.ts': 'R:navigation',
  'application/hooks/useKeyboardShortcuts.ts': 'R:navigation',
  'application/hooks/useGeocode.ts': 'R:adapter',
  'application/hooks/useEtrnStationSearch.ts': 'R:adapter',
  'application/hooks/useCausalChain.ts': 'R:calculation',
  'application/hooks/useShapleyTimeSeries.ts': 'R:calculation',
  'application/hooks/useMultiMovingAverage.ts': 'R:calculation',
  'application/hooks/useInventoryEstimation.ts': 'R:calculation',
  'application/hooks/usePinIntervals.ts': 'R:calculation',
  'application/hooks/useClipExport.ts': 'R:persistence',
  'application/hooks/useMonthSwitcher.ts': 'R:navigation',
  'application/hooks/useMonthlyHistory.ts': 'R:data-fetch',
  'application/hooks/usePurchaseAnalysis.ts': 'R:calculation',
  'application/hooks/useDataPreview.ts': 'R:transform',
  'application/hooks/useDataSummary.ts': 'R:transform',
  'application/hooks/useDailyPageData.ts': 'R:orchestration',
  'application/hooks/useDailySalesData.ts': 'R:orchestration',
  'application/hooks/useDeptKpiView.ts': 'R:transform',
  'application/hooks/useCtsQuantity.ts': 'R:transform',
  'application/hooks/useUndoRedo.ts': 'R:state-machine',
  'application/hooks/useQueryWithHandler.ts': 'R:query-exec',
  'application/hooks/useStoredMonthsMonitor.ts': 'R:data-fetch',

  // presentation/components — 特殊なもの
  'presentation/components/common/FileDropZone.tsx': 'R:form',

  // application/hooks — 残りの未分類
  'application/hooks/useAnalyticsResolver.ts': 'R:transform',
  'application/hooks/useDeviceSync.ts': 'R:persistence',
  'application/hooks/useTimeSlotData.ts': 'R:orchestration',
}

// ─── 解決関数 ─────────────────────────────────────────

/**
 * ファイルパスの責務タグを解決する。
 * 1. 手動オーバーライドを優先
 * 2. 自動推定を試行
 * 3. どちらもなければ null（未分類）
 */
export function resolveResponsibilityTag(relPath: string): ResponsibilityTag | null {
  return RESPONSIBILITY_OVERRIDES[relPath] ?? inferResponsibilityTag(relPath)
}
