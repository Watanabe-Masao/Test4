/**
 * @file データ管理モーダル
 * @description IndexedDB のデータを表示・削除する UI
 */

import { DataRepository } from '../services/database/index.js';
import { DATA_TYPE_MAP } from '../services/database/schema.js';
import { FILE_TYPES } from '../config/constants.js';

/**
 * データ管理モーダルを表示
 */
export async function showDataManagementModal() {
  const modal = document.getElementById('data-management-modal');
  const content = document.getElementById('data-management-content');

  if (!modal || !content) return;

  // ローディング表示
  content.innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--text3)">
      <div style="font-size:2rem;margin-bottom:12px">⏳</div>
      <div>データを読み込んでいます...</div>
    </div>
  `;

  modal.style.display = 'flex';

  // データベースの統計情報を取得
  try {
    const stats = await getDataStats();
    renderDataManagement(stats);
  } catch (error) {
    console.error('Failed to load data stats:', error);
    content.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--danger)">
        <div style="font-size:2rem;margin-bottom:12px">❌</div>
        <div>データの読み込みに失敗しました</div>
        <div style="font-size:0.7rem;margin-top:8px">${error.message}</div>
      </div>
    `;
  }
}

/**
 * データ管理モーダルを閉じる
 */
export function closeDataManagementModal() {
  const modal = document.getElementById('data-management-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * データベースの統計情報を取得
 */
async function getDataStats() {
  const stats = {};

  // すべてのデータタイプについて統計を取得
  for (const [dataType, storeName] of Object.entries(DATA_TYPE_MAP)) {
    try {
      const repo = new DataRepository(storeName);
      const count = await repo.count();

      if (count > 0) {
        const allData = await repo.getAll();

        // 日付範囲を計算
        let minDate = null;
        let maxDate = null;
        const stores = new Set();

        allData.forEach(record => {
          if (record.date) {
            const date = new Date(record.date);
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;
          }
          if (record.store) {
            stores.add(record.store);
          }
        });

        stats[dataType] = {
          storeName,
          count,
          minDate,
          maxDate,
          stores: Array.from(stores),
          data: allData
        };
      }
    } catch (error) {
      console.warn(`Failed to get stats for ${dataType}:`, error);
    }
  }

  return stats;
}

/**
 * データ管理画面を描画
 */
function renderDataManagement(stats) {
  const content = document.getElementById('data-management-content');
  if (!content) return;

  const dataTypes = Object.keys(stats);

  if (dataTypes.length === 0) {
    content.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text3)">
        <div style="font-size:2rem;margin-bottom:12px">📭</div>
        <div>データベースは空です</div>
        <div style="font-size:0.7rem;margin-top:8px">ファイルをアップロードしてデータをインポートしてください</div>
      </div>
    `;
    return;
  }

  let html = '<div style="display:flex;flex-direction:column;gap:16px">';

  for (const dataType of dataTypes) {
    const stat = stats[dataType];
    const fileType = FILE_TYPES[dataType] || { name: dataType };

    html += `
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="flex:1">
            <div style="font-size:0.9rem;font-weight:700">${fileType.name}</div>
            <div style="font-size:0.65rem;color:var(--text3)">${dataType}</div>
          </div>
          <div style="display:flex;gap:8px">
            <button onclick="viewDataDetails('${dataType}')" style="padding:8px 16px;background:var(--bg4);border:1px solid var(--border);border-radius:6px;color:var(--text2);font-family:inherit;font-size:0.7rem;cursor:pointer">
              📋 詳細表示
            </button>
            <button onclick="deleteDataType('${dataType}')" style="padding:8px 16px;background:linear-gradient(135deg,#ef4444,#dc2626);border:none;border-radius:6px;color:white;font-family:inherit;font-size:0.7rem;font-weight:600;cursor:pointer">
              🗑️ 削除
            </button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">
          <div style="background:var(--bg4);padding:10px;border-radius:6px">
            <div style="font-size:0.6rem;color:var(--text3);margin-bottom:4px">レコード数</div>
            <div style="font-size:1rem;font-weight:700;color:var(--primary)">${stat.count.toLocaleString()}</div>
          </div>
          ${stat.minDate && stat.maxDate ? `
            <div style="background:var(--bg4);padding:10px;border-radius:6px">
              <div style="font-size:0.6rem;color:var(--text3);margin-bottom:4px">期間</div>
              <div style="font-size:0.7rem;font-weight:600">${formatDate(stat.minDate)} 〜 ${formatDate(stat.maxDate)}</div>
            </div>
          ` : ''}
          ${stat.stores.length > 0 ? `
            <div style="background:var(--bg4);padding:10px;border-radius:6px">
              <div style="font-size:0.6rem;color:var(--text3);margin-bottom:4px">店舗数</div>
              <div style="font-size:1rem;font-weight:700">${stat.stores.length} 店舗</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  html += '</div>';
  content.innerHTML = html;
}

/**
 * データの詳細を表示
 */
window.viewDataDetails = async function(dataType) {
  try {
    const storeName = DATA_TYPE_MAP[dataType];
    const repo = new DataRepository(storeName);
    const data = await repo.getAll();

    // 新しいモーダルを表示
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:4000;display:flex;align-items:center;justify-content:center';

    const fileType = FILE_TYPES[dataType] || { name: dataType };

    modal.innerHTML = `
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;width:95%;max-width:1200px;max-height:90vh;overflow:hidden;display:flex;flex-direction:column">
        <div style="padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">
          <div style="flex:1">
            <div style="font-size:1rem;font-weight:700">${fileType.name} - 詳細データ</div>
            <div style="font-size:0.65rem;color:var(--text3)">${data.length} レコード</div>
          </div>
          <button onclick="this.closest('div[style*=\\'fixed\\']').remove()" style="width:32px;height:32px;background:var(--bg3);border:none;border-radius:6px;color:var(--text2);cursor:pointer;font-size:1rem">✕</button>
        </div>
        <div style="flex:1;overflow:auto;padding:20px">
          ${renderDataTable(data, dataType)}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  } catch (error) {
    console.error('Failed to view data details:', error);
    alert(`データの表示に失敗しました: ${error.message}`);
  }
};

/**
 * データテーブルを描画
 */
function renderDataTable(data, dataType) {
  if (!data || data.length === 0) {
    return '<div style="text-align:center;padding:40px;color:var(--text3)">データがありません</div>';
  }

  // カラムを自動検出
  const columns = Object.keys(data[0]).filter(key => key !== 'id');

  let html = `
    <table style="width:100%;border-collapse:collapse;font-size:0.7rem">
      <thead>
        <tr style="background:var(--bg3);position:sticky;top:0">
          ${columns.map(col => `<th style="padding:8px;text-align:left;border-bottom:2px solid var(--border);font-weight:700">${col}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `;

  data.slice(0, 100).forEach((record, index) => {
    html += `<tr style="border-bottom:1px solid var(--border);${index % 2 === 0 ? 'background:var(--bg4)' : ''}">`;
    columns.forEach(col => {
      let value = record[col];

      // 日付フィールドをフォーマット
      if (col === 'date' && typeof value === 'number') {
        value = formatDate(new Date(value));
      }

      // 数値フィールドをフォーマット
      if (typeof value === 'number' && col !== 'date') {
        value = value.toLocaleString();
      }

      html += `<td style="padding:8px">${value ?? '-'}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';

  if (data.length > 100) {
    html += `<div style="text-align:center;padding:16px;color:var(--text3);font-size:0.7rem">最初の 100 レコードを表示 (全 ${data.length} レコード)</div>`;
  }

  return html;
}

/**
 * データタイプを削除
 */
window.deleteDataType = async function(dataType) {
  const fileType = FILE_TYPES[dataType] || { name: dataType };

  if (!confirm(`本当に ${fileType.name} のすべてのデータを削除しますか？\n\nこの操作は取り消せません。`)) {
    return;
  }

  try {
    const storeName = DATA_TYPE_MAP[dataType];
    const repo = new DataRepository(storeName);
    await repo.clear();

    alert(`${fileType.name} のデータを削除しました`);

    // モーダルを再読み込み
    showDataManagementModal();
  } catch (error) {
    console.error('Failed to delete data:', error);
    alert(`データの削除に失敗しました: ${error.message}`);
  }
};

/**
 * 日付をフォーマット
 */
function formatDate(date) {
  if (!date) return '-';
  const d = typeof date === 'number' ? new Date(date) : date;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// グローバルに公開
window.showDataManagementModal = showDataManagementModal;
window.closeDataManagementModal = closeDataManagementModal;
