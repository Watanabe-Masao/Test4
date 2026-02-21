/**
 * Phase 7.3: 国際化 (i18n) メッセージカタログ
 *
 * アプリケーション内の全テキストリソースを一元管理する。
 * 将来的には react-intl や i18next を導入して動的に切り替えるが、
 * まずは日本語テキストを外部化し、コード内のハードコードを排除する基盤を提供する。
 */

export type Locale = 'ja' | 'en'

export interface MessageCatalog {
  // ─── ナビゲーション ─────────────────────────────────
  nav: {
    dashboard: string
    category: string
    forecast: string
    analysis: string
    daily: string
    transfer: string
    consumable: string
    summary: string
    reports: string
    admin: string
    lightMode: string
    darkMode: string
  }

  // ─── 共通 ──────────────────────────────────────────
  common: {
    loading: string
    noData: string
    calculate: string
    save: string
    cancel: string
    apply: string
    reset: string
    close: string
    selectAll: string
    deselectAll: string
    confirm: string
    delete: string
    edit: string
    search: string
    filter: string
    sort: string
    export: string
    import: string
  }

  // ─── ダッシュボード ─────────────────────────────────
  dashboard: {
    title: string
    customize: string
    editMode: string
    presets: string
    presetExecutive: string
    presetField: string
    presetAnalyst: string
    resetDefault: string
  }

  // ─── 計算 ──────────────────────────────────────────
  calculation: {
    runCalculation: string
    calculating: string
    calculated: string
    pleaseCalculate: string
    validationError: string
  }

  // ─── インポート ────────────────────────────────────
  import: {
    dropFiles: string
    reading: string
    validating: string
    saving: string
    done: string
    success: string
    failed: string
    fileCount: string
  }

  // ─── 数値フォーマット ──────────────────────────────
  format: {
    currency: string      // '{value}' or '¥{value}'
    manYen: string         // '{value}万円'
    percent: string        // '{value}%'
    pointDiff: string      // '{value}pt'
  }

  // ─── カテゴリ ──────────────────────────────────────
  categories: {
    flowers: string
    directProduce: string
    consumables: string
    interStore: string
    interDepartment: string
    other: string
  }
}

// ─── 日本語メッセージ ──────────────────────────────────

export const jaMessages: MessageCatalog = {
  nav: {
    dashboard: 'ダッシュボード',
    category: 'カテゴリ',
    forecast: '予測',
    analysis: '分析',
    daily: '日別',
    transfer: '移動',
    consumable: '消耗品',
    summary: 'サマリ',
    reports: 'レポート',
    admin: '管理',
    lightMode: 'ライトモード',
    darkMode: 'ダークモード',
  },
  common: {
    loading: '読み込み中...',
    noData: 'データがありません',
    calculate: '計算実行',
    save: '保存',
    cancel: 'キャンセル',
    apply: '適用',
    reset: 'リセット',
    close: '閉じる',
    selectAll: '全選択',
    deselectAll: '全解除',
    confirm: '確認',
    delete: '削除',
    edit: '編集',
    search: '検索',
    filter: 'フィルター',
    sort: 'ソート',
    export: 'エクスポート',
    import: 'インポート',
  },
  dashboard: {
    title: 'ダッシュボード',
    customize: 'ダッシュボードのカスタマイズ',
    editMode: '編集モード',
    presets: 'プリセット',
    presetExecutive: '経営者向け',
    presetField: '現場担当者向け',
    presetAnalyst: '分析者向け',
    resetDefault: 'デフォルトに戻す',
  },
  calculation: {
    runCalculation: '計算を実行しました',
    calculating: '計算中...',
    calculated: '計算済み',
    pleaseCalculate: '計算を実行してください',
    validationError: '検証エラーがあります',
  },
  import: {
    dropFiles: 'ファイルをドロップするか、クリックして選択',
    reading: '読み込み中',
    validating: '検証中',
    saving: '保存中',
    done: '完了',
    success: '成功',
    failed: '失敗',
    fileCount: '{count}ファイル',
  },
  format: {
    currency: '{value}',
    manYen: '{value}万円',
    percent: '{value}%',
    pointDiff: '{value}pt',
  },
  categories: {
    flowers: '花',
    directProduce: '産直',
    consumables: '消耗品',
    interStore: '店間移動',
    interDepartment: '部門間移動',
    other: 'その他',
  },
}

// ─── 英語メッセージ (将来用) ──────────────────────────

export const enMessages: MessageCatalog = {
  nav: {
    dashboard: 'Dashboard',
    category: 'Category',
    forecast: 'Forecast',
    analysis: 'Analysis',
    daily: 'Daily',
    transfer: 'Transfer',
    consumable: 'Consumable',
    summary: 'Summary',
    reports: 'Reports',
    admin: 'Admin',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
  },
  common: {
    loading: 'Loading...',
    noData: 'No data available',
    calculate: 'Calculate',
    save: 'Save',
    cancel: 'Cancel',
    apply: 'Apply',
    reset: 'Reset',
    close: 'Close',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    export: 'Export',
    import: 'Import',
  },
  dashboard: {
    title: 'Dashboard',
    customize: 'Customize Dashboard',
    editMode: 'Edit Mode',
    presets: 'Presets',
    presetExecutive: 'Executive',
    presetField: 'Field Staff',
    presetAnalyst: 'Analyst',
    resetDefault: 'Reset to Default',
  },
  calculation: {
    runCalculation: 'Calculation complete',
    calculating: 'Calculating...',
    calculated: 'Calculated',
    pleaseCalculate: 'Please run calculation',
    validationError: 'Validation errors found',
  },
  import: {
    dropFiles: 'Drop files or click to select',
    reading: 'Reading',
    validating: 'Validating',
    saving: 'Saving',
    done: 'Done',
    success: 'Success',
    failed: 'Failed',
    fileCount: '{count} files',
  },
  format: {
    currency: '{value}',
    manYen: '{value}0K JPY',
    percent: '{value}%',
    pointDiff: '{value}pt',
  },
  categories: {
    flowers: 'Flowers',
    directProduce: 'Direct Produce',
    consumables: 'Consumables',
    interStore: 'Inter-Store',
    interDepartment: 'Inter-Department',
    other: 'Other',
  },
}

/** ロケール → メッセージカタログのマッピング */
export const MESSAGE_CATALOGS: Record<Locale, MessageCatalog> = {
  ja: jaMessages,
  en: enMessages,
}
