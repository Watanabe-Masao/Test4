/**
 * デバッグパネル - 開発用データ管理機能
 * IndexedDBのデータ確認・削除・リセット機能を提供
 */

class DebugPanel {
  constructor() {
    this.panel = null;
    this.isVisible = false;
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.createPanel();
    this.attachEventListeners();
    this.updateDataInfo();
  }

  /**
   * パネルのHTML要素を作成
   */
  createPanel() {
    this.panel = document.getElementById('debug-panel');
    if (!this.panel) {
      console.warn('⚠️ Debug panel element not found');
      return;
    }

    // 初期状態は非表示
    this.panel.style.display = 'none';
  }

  /**
   * イベントリスナーを登録
   */
  attachEventListeners() {
    // トグルボタン
    const toggleBtn = document.getElementById('debug-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    // データクリアボタン
    document.getElementById('clear-shiire')?.addEventListener('click', () => {
      this.clearStore('shiire');
    });

    document.getElementById('clear-araki')?.addEventListener('click', () => {
      this.clearStore('araki');
    });

    document.getElementById('clear-all')?.addEventListener('click', () => {
      this.clearAllData();
    });

    // リセットボタン
    document.getElementById('reset-app')?.addEventListener('click', () => {
      this.resetApplication();
    });

    // 更新ボタン
    document.getElementById('refresh-info')?.addEventListener('click', () => {
      this.updateDataInfo();
    });
  }

  /**
   * パネルの表示/非表示を切り替え
   */
  toggle() {
    this.isVisible = !this.isVisible;
    this.panel.style.display = this.isVisible ? 'block' : 'none';

    if (this.isVisible) {
      this.updateDataInfo();
    }
  }

  /**
   * データベース情報を更新
   */
  async updateDataInfo() {
    if (!window.db) {
      this.showInfo('⚠️ データベース未接続');
      return;
    }

    try {
      // shiireデータのカウント
      const shiireCount = await this.getStoreCount('shiire');

      // arakiデータのカウント
      const arakiCount = await this.getStoreCount('araki');

      // 情報を表示
      this.showInfo(`
        📊 データベース情報
        ━━━━━━━━━━━━━━━━
        • shiire: ${shiireCount} レコード
        • araki: ${arakiCount} レコード
        • 合計: ${shiireCount + arakiCount} レコード
      `);

      console.log('📊 Debug Panel - Database Info:', {
        shiire: shiireCount,
        araki: arakiCount,
        total: shiireCount + arakiCount
      });

    } catch (error) {
      console.error('❌ Failed to get database info:', error);
      this.showInfo('❌ データ取得エラー');
    }
  }

  /**
   * オブジェクトストアのレコード数を取得
   */
  async getStoreCount(storeName) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } catch (error) {
        resolve(0); // ストアが存在しない場合は0
      }
    });
  }

  /**
   * 特定のオブジェクトストアをクリア
   */
  async clearStore(storeName) {
    if (!window.db) {
      alert('データベースが接続されていません');
      return;
    }

    const confirmed = confirm(`${storeName} のデータを削除しますか?`);
    if (!confirmed) return;

    try {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`✅ Cleared ${storeName} store`);
        alert(`✅ ${storeName} データを削除しました`);
        this.updateDataInfo();
      };

      request.onerror = () => {
        console.error(`❌ Failed to clear ${storeName}:`, request.error);
        alert(`❌ 削除に失敗しました: ${request.error}`);
      };

    } catch (error) {
      console.error(`❌ Error clearing ${storeName}:`, error);
      alert(`❌ エラー: ${error.message}`);
    }
  }

  /**
   * 全データをクリア
   */
  async clearAllData() {
    if (!window.db) {
      alert('データベースが接続されていません');
      return;
    }

    const confirmed = confirm('⚠️ 全データを削除しますか?\nこの操作は取り消せません。');
    if (!confirmed) return;

    try {
      const stores = ['shiire', 'araki'];
      let clearedCount = 0;

      for (const storeName of stores) {
        try {
          const transaction = db.transaction([storeName], 'readwrite');
          const store = transaction.objectStore(storeName);
          await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => {
              clearedCount++;
              resolve();
            };
            request.onerror = () => reject(request.error);
          });
        } catch (error) {
          console.warn(`⚠️ Could not clear ${storeName}:`, error);
        }
      }

      console.log(`✅ Cleared ${clearedCount} stores`);
      alert(`✅ ${clearedCount} 個のデータストアを削除しました`);
      this.updateDataInfo();

    } catch (error) {
      console.error('❌ Error clearing all data:', error);
      alert(`❌ エラー: ${error.message}`);
    }
  }

  /**
   * アプリケーション完全リセット
   * データベース削除 + ページリロード
   */
  async resetApplication() {
    const confirmed = confirm(
      '⚠️ アプリケーションを完全リセットしますか?\n\n' +
      '以下の操作が実行されます:\n' +
      '• IndexedDBの完全削除\n' +
      '• ページのリロード\n\n' +
      'この操作は取り消せません。'
    );

    if (!confirmed) return;

    try {
      // データベースを閉じる
      if (window.db) {
        db.close();
        console.log('🔌 Database connection closed');
      }

      // データベースを削除
      const deleteRequest = indexedDB.deleteDatabase('ShiireArariDB');

      deleteRequest.onsuccess = () => {
        console.log('✅ Database deleted successfully');
        alert('✅ データベースを削除しました\nページをリロードします...');

        // ページをリロード
        setTimeout(() => {
          window.location.reload(true);
        }, 500);
      };

      deleteRequest.onerror = (event) => {
        console.error('❌ Failed to delete database:', event);
        alert('❌ データベース削除に失敗しました');
      };

      deleteRequest.onblocked = () => {
        console.warn('⚠️ Database deletion blocked');
        alert('⚠️ データベースが使用中です\nページを閉じてから再度お試しください');
      };

    } catch (error) {
      console.error('❌ Error resetting application:', error);
      alert(`❌ エラー: ${error.message}`);
    }
  }

  /**
   * 情報を表示
   */
  showInfo(text) {
    const infoElement = document.getElementById('data-info');
    if (infoElement) {
      infoElement.textContent = text;
    }
  }
}

// グローバルに公開して、コンソールからも使えるようにする
window.debugPanel = null;

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
  window.debugPanel = new DebugPanel();
  console.log('🛠️ Debug Panel initialized');
  console.log('💡 Tip: window.debugPanel でアクセス可能');
});
