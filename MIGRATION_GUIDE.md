# マイグレーションガイド

## 📌 概要

このガイドでは、モノリシックな `shiire_arari_v8.html` からリファクタリングされたモジュラーアーキテクチャへの移行方法を説明します。

## 🔄 変更点の概要

### アーキテクチャの変化

**Before (旧版):**
```
shiire_arari_v8.html (2,455行)
├── HTML (マークアップ)
├── <style> (圧縮されたCSS)
└── <script> (すべてのJavaScript)
```

**After (新版):**
```
index.html (HTMLのみ)
├── css/styles.css (整形されたCSS)
└── js/ (モジュール化されたJavaScript)
    ├── config/constants.js
    ├── models/state.js
    ├── services/
    │   ├── dataLoader.js
    │   ├── dataProcessor.js
    │   ├── excelService.js
    │   └── storageService.js
    ├── ui/
    │   ├── modals.js
    │   ├── components.js
    │   └── eventHandlers.js
    ├── utils/helpers.js
    └── main.js
```

## 📋 移行手順

### ステップ 1: ファイル構造の理解

新しいアーキテクチャでは、関心事が明確に分離されています:

1. **Config層**: 設定と定数
2. **Models層**: データモデルと状態管理
3. **Services層**: ビジネスロジックとデータ処理
4. **UI層**: ユーザーインターフェース
5. **Utils層**: 共通ユーティリティ

### ステップ 2: グローバル変数の移行

**旧版:**
```javascript
const DATA = {};
let STORES = {};
let SUPPLIERS = {};
let currentStore = 'all';
let currentView = 'dashboard';
```

**新版:**
```javascript
import { appState } from './models/state.js';

// 使用方法
appState.setData('shiire', data);
appState.setCurrentStore('01');
const result = appState.getResult();
```

### ステップ 3: 関数の移行マップ

#### データロード関連

| 旧版 | 新版 |
|------|------|
| `loadFile(input, key)` | `import { loadFile } from './services/dataLoader.js'` |
| `detectStoresAndSuppliers()` | `import { detectStoresAndSuppliers } from './services/dataLoader.js'` |
| `handleDroppedFiles()` | `import { handleDroppedFiles } from './services/dataLoader.js'` |
| `validateData()` | `import { validateRequiredData } from './services/dataLoader.js'` |

#### データ処理関連

| 旧版 | 新版 |
|------|------|
| `processShiire()` | `import { processShiire } from './services/dataProcessor.js'` |
| `processUriage()` | `import { processUriage } from './services/dataProcessor.js'` |
| `processBaihen()` | `import { processBaihen } from './services/dataProcessor.js'` |
| `processTenkanIn/Out()` | `import { processTenkanIn, processTenkanOut } from './services/dataProcessor.js'` |
| `processHanaSanchoku()` | `import { processHanaSanchoku } from './services/dataProcessor.js'` |

#### Excel関連

| 旧版 | 新版 |
|------|------|
| `exportExcel()` | `import { exportExcel } from './services/excelService.js'` |
| `exportSettings()` | `import { exportSettingsToFile } from './services/storageService.js'` |
| `importSettings()` | `import { importSettingsFromObject } from './services/storageService.js'` |

#### UI関連

| 旧版 | 新版 |
|------|------|
| `showConsumableModal()` | `import { showConsumableModal } from './ui/modals.js'` |
| `showSettingsModal()` | `import { showSettingsModal } from './ui/modals.js'` |
| `updateStoreChips()` | `import { updateStoreChips } from './ui/components.js'` |
| `toggleTheme()` | `import { toggleTheme } from './services/storageService.js'` |

#### ヘルパー関数

| 旧版 | 新版 |
|------|------|
| `parseNum(s)` | `import { parseNum } from './utils/helpers.js'` |
| `fmt(n)` | `import { fmt } from './utils/helpers.js'` |
| `fmtPct(n)` | `import { fmtPct } from './utils/helpers.js'` |
| `parseDate(v)` | `import { parseDate } from './utils/helpers.js'` |
| `showToast(msg, type)` | `import { showToast } from './utils/helpers.js'` |

### ステップ 4: イベントハンドラーの移行

**旧版 (インラインハンドラー):**
```html
<button onclick="showSettingsModal()">設定</button>
<div class="nav-item" onclick="toggleTheme()">🌙</div>
```

**新版 (イベントリスナー):**
```javascript
import { initializeEventHandlers } from './ui/eventHandlers.js';

// 自動的にすべてのイベントハンドラーを設定
initializeEventHandlers();
```

### ステップ 5: 状態管理の移行

**旧版:**
```javascript
// グローバル変数の直接変更
currentStore = '01';
DATA.shiire = data;
```

**新版:**
```javascript
import { appState } from './models/state.js';

// 状態管理APIを使用
appState.setCurrentStore('01');
appState.setData('shiire', data);
```

## 🎯 コード例: Before & After

### 例 1: ファイル読み込み

**Before:**
```javascript
function loadFile(input, key) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
            DATA[key] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header: 1});
            // ... 後処理
        } catch (err) {
            showToast('読込エラー: ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}
```

**After:**
```javascript
import { loadFile } from './services/dataLoader.js';
import { appState } from './models/state.js';

// 使用するだけ - 内部処理は抽象化されている
await loadFile(file, 'shiire');

// データは自動的にappStateに保存される
const data = appState.getData('shiire');
```

### 例 2: モーダル表示

**Before:**
```javascript
function showSettingsModal() {
    renderSettingsContent();
    document.getElementById('settings-modal').style.display = 'flex';
}
```

**After:**
```javascript
import { showSettingsModal } from './ui/modals.js';

// 単純に呼び出すだけ
showSettingsModal();
```

### 例 3: テーマ切り替え

**Before:**
```javascript
let currentTheme = 'dark';

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
    saveSettingsToStorage();
}
```

**After:**
```javascript
import { toggleTheme } from './services/storageService.js';

// すべての処理が自動化されている
toggleTheme();
```

## 🔧 カスタマイズポイント

### 新しい機能を追加する場合

1. **新しいデータ処理**: `js/services/dataProcessor.js` に関数を追加
2. **新しいUI要素**: `js/ui/components.js` に生成関数を追加
3. **新しいモーダル**: `js/ui/modals.js` に管理関数を追加
4. **新しい設定**: `js/config/constants.js` に定数を追加
5. **新しいヘルパー**: `js/utils/helpers.js` にユーティリティ関数を追加

### モジュールのインポート方法

**ES6 モジュール構文を使用:**
```javascript
// 単一エクスポート
import appState from './models/state.js';

// 名前付きエクスポート
import { fmt, parseNum, showToast } from './utils/helpers.js';

// すべてインポート
import * as helpers from './utils/helpers.js';
```

## 📊 パフォーマンスと最適化

### モジュールの遅延読み込み

必要に応じてモジュールを動的にインポート:

```javascript
// 必要な時だけインポート
async function exportData() {
    const { exportExcel } = await import('./services/excelService.js');
    exportExcel(result);
}
```

### バンドリング (オプション)

本番環境では、モジュールをバンドルすることを推奨:

```bash
# Webpack, Vite, Rollup などを使用
npm install vite
npx vite build
```

## ✅ チェックリスト

移行が完了したら、以下を確認してください:

- [ ] すべてのグローバル変数が `appState` を使用している
- [ ] インラインイベントハンドラーがすべて削除されている
- [ ] 関数が適切なモジュールからインポートされている
- [ ] CSSが `css/styles.css` から読み込まれている
- [ ] ES6モジュール構文を使用している
- [ ] 開発者ツールでエラーが出ていない
- [ ] すべての機能が正常に動作している

## 🐛 トラブルシューティング

### よくある問題と解決方法

**問題 1: モジュールが読み込めない**
```
Error: Cannot use import statement outside a module
```

**解決:**
```html
<!-- type="module" を追加 -->
<script type="module" src="./js/main.js"></script>
```

**問題 2: CORSエラー**
```
Access to script has been blocked by CORS policy
```

**解決:**
ローカルサーバーを使用してください:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve

# VS Code
Live Server拡張機能を使用
```

**問題 3: 関数が見つからない**
```
ReferenceError: processShiire is not defined
```

**解決:**
```javascript
// モジュールからインポートを追加
import { processShiire } from './services/dataProcessor.js';
```

## 📚 参考リソース

- [ES6 Modules - MDN](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Modules)
- [JavaScript Best Practices](https://github.com/ryanmcdermott/clean-code-javascript)
- [Modular JavaScript](https://addyosmani.com/resources/essentialjsdesignpatterns/book/)

## 💡 ベストプラクティス

1. **常に型チェックを行う**: JSDocを活用
2. **エラーハンドリング**: try-catchで適切に処理
3. **テストを書く**: 各モジュールに対してユニットテスト
4. **コードレビュー**: Pull Requestで変更を確認
5. **ドキュメント**: 新しい機能は必ずドキュメント化

## 🎉 まとめ

リファクタリングにより、以下の改善が実現されました:

✅ **保守性**: モジュール化により変更が容易に
✅ **テスト可能性**: 各モジュールを個別にテスト可能
✅ **可読性**: 整理されたコードで理解しやすい
✅ **拡張性**: 新機能の追加が簡単
✅ **パフォーマンス**: 必要なモジュールのみ読み込み可能

---

**問題や質問がある場合は、README.mdを参照するか、開発チームにお問い合わせください。**
