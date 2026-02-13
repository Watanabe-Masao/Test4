/**
 * @file インポートダイアログ
 * @description データインポート時のプレビューとマージモード選択UI
 */

import { syncManager, MERGE_MODE } from '../services/database/syncManager.js';

/**
 * インポートダイアログクラス
 */
export class ImportDialog {
  constructor() {
    this.dialog = null;
    this.dataType = null;
    this.data = null;
    this.diff = null;
    this.onConfirm = null;
    this.onCancel = null;
    this.closeTimeout = null;
    this.isShowing = false;
  }

  /**
   * ダイアログを表示
   * @param {string} dataType - データタイプ
   * @param {Array} data - インポートするデータ
   * @param {Function} onConfirm - 確認時のコールバック(mode)
   * @param {Function} onCancel - キャンセル時のコールバック
   */
  async show(dataType, data, onConfirm, onCancel) {
    // 既に表示中の場合は無視
    if (this.isShowing) {
      console.warn('Dialog is already showing, ignoring duplicate call');
      return;
    }

    this.isShowing = true;

    // 既存のダイアログがあれば即座にクリーンアップ
    if (this.dialog) {
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }
      if (this.dialog.parentNode) {
        this.dialog.parentNode.removeChild(this.dialog);
      }
      this.dialog = null;
    }

    // DOM内の全ての古いダイアログオーバーレイを削除（念のため）
    const oldOverlays = document.querySelectorAll('.import-dialog-overlay');
    oldOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    this.dataType = dataType;
    this.data = data;
    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    // 差分を検出
    try {
      this.diff = await syncManager.detectDiff(dataType, data);
    } catch (error) {
      console.error('Failed to detect diff:', error);
      this.diff = null;
    }

    // ダイアログを作成
    this._createDialog();

    // DOMに追加
    document.body.appendChild(this.dialog);

    // アニメーション
    setTimeout(() => {
      if (this.dialog) {
        this.dialog.classList.add('show');
      }
    }, 10);
  }

  /**
   * ダイアログを閉じる
   */
  close() {
    if (!this.dialog) return;

    this.dialog.classList.remove('show');

    // 既存のタイムアウトをクリア
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
    }

    this.closeTimeout = setTimeout(() => {
      if (this.dialog && this.dialog.parentNode) {
        this.dialog.parentNode.removeChild(this.dialog);
      }
      this.dialog = null;
      this.closeTimeout = null;
      this.isShowing = false;
    }, 300);
  }

  /**
   * ダイアログを作成
   * @private
   */
  _createDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'import-dialog-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'import-dialog';

    dialog.innerHTML = `
      <div class="import-dialog-header">
        <h2>📥 データインポート</h2>
        <button class="close-btn" onclick="importDialog.close()">×</button>
      </div>

      <div class="import-dialog-body">
        <!-- データ情報 -->
        <div class="import-info">
          <div class="info-item">
            <span class="label">データタイプ:</span>
            <span class="value">${this._getDataTypeLabel(this.dataType)}</span>
          </div>
          <div class="info-item">
            <span class="label">レコード数:</span>
            <span class="value">${this.data.length.toLocaleString()}件</span>
          </div>
        </div>

        ${this._renderDiffSummary()}

        <!-- マージモード選択 -->
        <div class="merge-mode-section">
          <h3>📋 マージモード</h3>
          <div class="merge-modes">
            ${this._renderMergeModes()}
          </div>
        </div>

        <!-- データプレビュー -->
        <div class="preview-section">
          <h3>👁️ データプレビュー (先頭10件)</h3>
          <div class="preview-table-container">
            ${this._renderPreviewTable()}
          </div>
        </div>

        <!-- 進捗バー（非表示） -->
        <div class="progress-section" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <div class="progress-text">0 / 0</div>
        </div>
      </div>

      <div class="import-dialog-footer">
        <button class="btn btn-secondary" onclick="importDialog.handleCancel()">
          キャンセル
        </button>
        <button class="btn btn-primary" onclick="importDialog.handleConfirm()">
          インポート実行
        </button>
      </div>
    `;

    overlay.appendChild(dialog);
    this.dialog = overlay;

    // スタイルを追加（初回のみ）
    if (!document.getElementById('import-dialog-styles')) {
      this._injectStyles();
    }
  }

  /**
   * 差分サマリーをレンダリング
   * @private
   */
  _renderDiffSummary() {
    if (!this.diff) {
      return '<div class="diff-summary loading">差分を計算中...</div>';
    }

    return `
      <div class="diff-summary">
        <h3>📊 差分サマリー</h3>
        <div class="diff-grid">
          <div class="diff-item add">
            <div class="diff-icon">➕</div>
            <div class="diff-label">新規追加</div>
            <div class="diff-count">${this.diff.toAdd.length}</div>
          </div>
          <div class="diff-item update">
            <div class="diff-icon">🔄</div>
            <div class="diff-label">更新</div>
            <div class="diff-count">${this.diff.toUpdate.length}</div>
          </div>
          <div class="diff-item unchanged">
            <div class="diff-icon">✓</div>
            <div class="diff-label">変更なし</div>
            <div class="diff-count">${this.diff.unchanged.length}</div>
          </div>
          ${this.diff.conflicts.length > 0 ? `
          <div class="diff-item conflict">
            <div class="diff-icon">⚠️</div>
            <div class="diff-label">衝突</div>
            <div class="diff-count">${this.diff.conflicts.length}</div>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * マージモードをレンダリング
   * @private
   */
  _renderMergeModes() {
    const modes = [
      {
        value: MERGE_MODE.SMART,
        icon: '🤖',
        label: 'スマートマージ',
        description: '重複を検出して自動更新（推奨）',
        recommended: true
      },
      {
        value: MERGE_MODE.REPLACE,
        icon: '🔄',
        label: '完全置換',
        description: '既存データを削除して新規追加'
      },
      {
        value: MERGE_MODE.APPEND,
        icon: '➕',
        label: '追加のみ',
        description: '既存データを保持して追加'
      },
      {
        value: MERGE_MODE.SKIP,
        icon: '⏭️',
        label: 'スキップ',
        description: '重複をスキップ、新規のみ追加'
      }
    ];

    return modes.map((mode, index) => `
      <label class="merge-mode-option ${mode.recommended ? 'recommended' : ''} ${index === 0 ? 'selected' : ''}" data-mode="${mode.value}">
        <input type="radio" name="merge-mode" value="${mode.value}" ${index === 0 ? 'checked' : ''}>
        <div class="mode-icon">${mode.icon}</div>
        <div class="mode-content">
          <div class="mode-label">
            ${mode.label}
            ${mode.recommended ? '<span class="badge">推奨</span>' : ''}
          </div>
          <div class="mode-description">${mode.description}</div>
        </div>
      </label>
    `).join('');
  }

  /**
   * プレビューテーブルをレンダリング
   * @private
   */
  _renderPreviewTable() {
    if (!this.data || this.data.length === 0) {
      return '<p class="no-data">データがありません</p>';
    }

    const preview = this.data.slice(0, 10);
    const keys = Object.keys(preview[0]);

    return `
      <table class="preview-table">
        <thead>
          <tr>
            ${keys.map(key => `<th>${this._getFieldLabel(key)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${preview.map(row => `
            <tr>
              ${keys.map(key => `<td>${this._formatValue(key, row[key])}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${this.data.length > 10 ? `<p class="preview-note">... 他 ${this.data.length - 10} 件</p>` : ''}
    `;
  }

  /**
   * データタイプのラベルを取得
   * @private
   */
  _getDataTypeLabel(dataType) {
    const labels = {
      shiire: '仕入データ',
      uriage: '売上データ',
      baihen: '売変データ',
      consumables: '消耗品データ',
      tenkanIn: '店間入データ',
      tenkanOut: '店間出データ',
      sanchoku: '産直データ',
      hana: '花データ',
      budget: '予算データ'
    };
    return labels[dataType] || dataType;
  }

  /**
   * フィールドラベルを取得
   * @private
   */
  _getFieldLabel(key) {
    const labels = {
      date: '日付',
      store: '店舗',
      supplier: '仕入先',
      category: 'カテゴリ',
      cost: '仕入金額',
      amount: '数量',
      itemName: '商品名',
      sales: '売上'
    };
    return labels[key] || key;
  }

  /**
   * 値をフォーマット
   * @private
   */
  _formatValue(key, value) {
    if (value === null || value === undefined) {
      return '-';
    }

    if (key === 'date' && typeof value === 'number') {
      return new Date(value).toLocaleDateString('ja-JP');
    }

    if (key === 'cost' || key === 'sales' || key === 'amount') {
      return value.toLocaleString();
    }

    return value;
  }

  /**
   * 確認ボタンのハンドラー
   */
  async handleConfirm() {
    // ダイアログが存在しない場合は何もしない
    if (!this.dialog) {
      console.warn('Dialog is not open');
      return;
    }

    const selectedMode = this.dialog.querySelector('input[name="merge-mode"]:checked').value;

    // ボタンを無効化
    const confirmBtn = this.dialog.querySelector('.btn-primary');
    const cancelBtn = this.dialog.querySelector('.btn-secondary');
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.textContent = 'インポート中...';

    // 進捗バーを表示
    const progressSection = this.dialog.querySelector('.progress-section');
    const progressFill = this.dialog.querySelector('.progress-fill');
    const progressText = this.dialog.querySelector('.progress-text');
    progressSection.style.display = 'block';

    try {
      // インポート実行
      await syncManager.importData(
        this.dataType,
        this.data,
        selectedMode,
        (current, total) => {
          // 進捗更新
          const percent = Math.round((current / total) * 100);
          progressFill.style.width = `${percent}%`;
          progressText.textContent = `${current.toLocaleString()} / ${total.toLocaleString()}`;
        }
      );

      // コールバック実行
      if (this.onConfirm) {
        await this.onConfirm(selectedMode);
      }

      this.close();
    } catch (error) {
      console.error('Import failed:', error);
      alert(`インポートに失敗しました: ${error.message}`);

      // ボタンを再有効化
      confirmBtn.disabled = false;
      cancelBtn.disabled = false;
      confirmBtn.textContent = 'インポート実行';
      progressSection.style.display = 'none';
    }
  }

  /**
   * キャンセルボタンのハンドラー
   */
  handleCancel() {
    // ダイアログが存在しない場合は何もしない
    if (!this.dialog) {
      console.warn('Dialog is not open');
      return;
    }

    if (this.onCancel) {
      this.onCancel();
    }
    this.close();
  }

  /**
   * スタイルを注入
   * @private
   */
  _injectStyles() {
    const style = document.createElement('style');
    style.id = 'import-dialog-styles';
    style.textContent = `
      .import-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }

      .import-dialog-overlay.show {
        opacity: 1;
        pointer-events: auto;
      }

      .import-dialog {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 900px;
        width: 90%;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        transform: scale(0.9);
        transition: transform 0.3s;
      }

      .import-dialog-overlay.show .import-dialog {
        transform: scale(1);
      }

      .import-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        border-bottom: 1px solid #e0e0e0;
      }

      .import-dialog-header h2 {
        margin: 0;
        font-size: 24px;
        color: #333;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 32px;
        cursor: pointer;
        color: #999;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .close-btn:hover {
        background: #f5f5f5;
        color: #333;
      }

      .import-dialog-body {
        padding: 30px;
        overflow-y: auto;
        flex: 1;
      }

      .import-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .info-item .label {
        font-size: 12px;
        color: #6c757d;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .info-item .value {
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .diff-summary {
        margin-bottom: 25px;
      }

      .diff-summary h3 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #333;
      }

      .diff-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }

      .diff-item {
        background: white;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        padding: 15px;
        text-align: center;
      }

      .diff-item.add { border-color: #4caf50; background: #f1f8f4; }
      .diff-item.update { border-color: #2196f3; background: #f0f7ff; }
      .diff-item.unchanged { border-color: #9e9e9e; background: #f5f5f5; }
      .diff-item.conflict { border-color: #ff9800; background: #fff8e1; }

      .diff-icon {
        font-size: 24px;
        margin-bottom: 5px;
      }

      .diff-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 5px;
      }

      .diff-count {
        font-size: 24px;
        font-weight: 700;
        color: #333;
      }

      .merge-mode-section {
        margin-bottom: 25px;
      }

      .merge-mode-section h3 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #333;
      }

      .merge-modes {
        display: grid;
        gap: 12px;
      }

      .merge-mode-option {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 15px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: white;
      }

      .merge-mode-option:hover {
        border-color: #2196f3;
        background: #f0f7ff;
      }

      .merge-mode-option.selected {
        border-color: #2196f3;
        background: #e3f2fd;
      }

      .merge-mode-option.recommended {
        border-color: #4caf50;
      }

      .merge-mode-option input[type="radio"] {
        margin: 0;
      }

      .mode-icon {
        font-size: 24px;
      }

      .mode-content {
        flex: 1;
      }

      .mode-label {
        font-weight: 600;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .mode-label .badge {
        background: #4caf50;
        color: white;
        font-size: 10px;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 600;
      }

      .mode-description {
        font-size: 13px;
        color: #666;
      }

      .preview-section {
        margin-bottom: 20px;
      }

      .preview-section h3 {
        font-size: 18px;
        margin-bottom: 15px;
        color: #333;
      }

      .preview-table-container {
        overflow-x: auto;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }

      .preview-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      .preview-table th,
      .preview-table td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
      }

      .preview-table th {
        background: #f8f9fa;
        font-weight: 600;
        color: #333;
        position: sticky;
        top: 0;
      }

      .preview-table tr:last-child td {
        border-bottom: none;
      }

      .preview-table tr:hover {
        background: #f8f9fa;
      }

      .preview-note {
        text-align: center;
        color: #666;
        font-size: 13px;
        margin-top: 10px;
      }

      .no-data {
        text-align: center;
        color: #999;
        padding: 40px;
      }

      .progress-section {
        margin-top: 20px;
      }

      .progress-bar {
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #2196f3, #4caf50);
        transition: width 0.3s;
      }

      .progress-text {
        text-align: center;
        font-size: 13px;
        color: #666;
      }

      .import-dialog-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 20px 30px;
        border-top: 1px solid #e0e0e0;
      }

      .btn {
        padding: 10px 24px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: linear-gradient(135deg, #2196f3, #1976d2);
        color: white;
      }

      .btn-primary:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4);
      }

      .btn-secondary {
        background: #f5f5f5;
        color: #666;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #e0e0e0;
      }
    `;

    document.head.appendChild(style);
  }
}

/**
 * グローバルインスタンス
 */
export const importDialog = new ImportDialog();

// グローバルに公開（HTMLから呼び出し可能にする）
if (typeof window !== 'undefined') {
  window.importDialog = importDialog;
}
