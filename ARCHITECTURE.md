# アーキテクチャドキュメント

## 📐 システムアーキテクチャ

### 全体構造

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│                      (index.html)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
    ┌────▼─────┐              ┌──────▼──────┐
    │   CSS    │              │  JavaScript │
    │  Layer   │              │   Modules   │
    └──────────┘              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              ┌─────▼─────┐   ┌─────▼─────┐  ┌──────▼──────┐
              │   Config  │   │  Models   │  │   Services  │
              │   Layer   │   │   Layer   │  │    Layer    │
              └───────────┘   └───────────┘  └──────┬──────┘
                                                     │
                                              ┌──────▼──────┐
                                              │  UI Layer   │
                                              └─────────────┘
```

### レイヤー別詳細

#### 1. Config Layer (設定層)

**責務**: アプリケーション全体の設定と定数管理

```
js/config/
└── constants.js
    ├── CATEGORIES           # カテゴリー定義
    ├── SUPPLIER_CAT_MAP     # 仕入先カテゴリーマッピング
    ├── FILE_TYPES           # ファイルタイプ定義
    ├── DEFAULT_CONFIG       # デフォルト設定値
    └── CALC_CONSTANTS       # 計算用定数
```

**依存関係**: なし（最下層）

#### 2. Models Layer (モデル層)

**責務**: データモデルと状態管理

```
js/models/
└── state.js
    └── AppState Class
        ├── データストレージ (DATA, STORES, SUPPLIERS)
        ├── 状態管理 (currentStore, currentView)
        ├── 計算結果 (result)
        └── 設定 (SUPPLIER_SETTINGS, etc.)
```

**依存関係**: Config Layer

**主要メソッド**:
- `setData(type, data)` / `getData(type)`
- `setCurrentStore(id)` / `getCurrentStore()`
- `setResult(result)` / `getResult()`
- `export()` / `import(state)` / `reset()`

#### 3. Services Layer (サービス層)

**責務**: ビジネスロジックとデータ処理

```
js/services/
├── dataLoader.js          # ファイル読み込み・検証
│   ├── loadFile()
│   ├── handleDroppedFiles()
│   ├── detectFileType()
│   ├── detectStoresAndSuppliers()
│   └── validateRequiredData()
│
├── dataProcessor.js       # データ処理・変換
│   ├── processShiire()
│   ├── processUriage()
│   ├── processBaihen()
│   ├── processTenkanIn/Out()
│   ├── processHanaSanchoku()
│   └── aggregateStoreData()
│
├── excelService.js        # Excel入出力
│   ├── exportExcel()
│   ├── createSupplierSheet()
│   ├── createStoreSheet()
│   └── exportSettings()
│
└── storageService.js      # 設定永続化
    ├── saveSettings()
    ├── loadSettings()
    ├── toggleTheme()
    └── applySettings()
```

**依存関係**: Config Layer, Models Layer, Utils Layer

**データフロー**:
```
Raw Data → dataLoader → appState
appState → dataProcessor → Processed Data
Processed Data → excelService → Excel File
Settings ↔ storageService ↔ localStorage
```

#### 4. UI Layer (UI層)

**責務**: ユーザーインターフェースの管理

```
js/ui/
├── modals.js              # モーダル管理
│   ├── show*Modal()
│   ├── close*Modal()
│   ├── save*Settings()
│   └── setupModalGlobalFunctions()
│
├── components.js          # UIコンポーネント
│   ├── update*()          # UI更新
│   ├── create*Card()      # カード生成
│   ├── createTable()      # テーブル生成
│   └── create*State()     # 状態表示
│
└── eventHandlers.js       # イベント処理
    ├── initializeEventHandlers()
    ├── setup*Handlers()
    └── cleanup*()
```

**依存関係**: すべてのレイヤー

**イベントフロー**:
```
User Action → eventHandlers
            → Services (処理)
            → appState (状態更新)
            → components (UI更新)
```

#### 5. Utils Layer (ユーティリティ層)

**責務**: 共通ユーティリティ関数

```
js/utils/
└── helpers.js
    ├── parseNum()         # 数値パース
    ├── fmt()              # 数値フォーマット
    ├── fmtPct()           # パーセントフォーマット
    ├── parseDate()        # 日付パース
    ├── showToast()        # 通知表示
    ├── readExcelFile()    # Excelファイル読み込み
    └── その他のヘルパー
```

**依存関係**: Config Layer

#### 6. Main Entry Point (エントリーポイント)

**責務**: アプリケーション初期化と統合

```
js/main.js
└── App Class
    ├── initialize()       # 初期化
    ├── generate()         # データ生成
    ├── exportData()       # データ出力
    └── render()           # レンダリング
```

**依存関係**: すべてのレイヤー

## 🔄 データフロー図

### ファイルアップロード → 分析 → 出力

```
┌──────────────┐
│  User Action │  (ファイルドロップ)
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  dataLoader.js   │  ファイル読み込み & 自動判定
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│    appState      │  データ保存 (DATA.shiire, etc.)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ dataProcessor.js │  データ処理 & 集約
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│    appState      │  結果保存 (result)
└──────┬───────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────┐
│ components   │  │ excelService │
│ (UI更新)     │  │ (Excel出力)  │
└──────────────┘  └──────────────┘
```

### 設定管理フロー

```
┌─────────────────┐
│  User Settings  │
└────────┬────────┘
         │
         ├────────────────┬────────────────┐
         │                │                │
         ▼                ▼                ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │ modals │      │ appState│      │storage │
    │ (入力)  │  ←→  │ (保持)  │  ←→  │Service │
    └────────┘      └────────┘      └────┬───┘
                                          │
                                          ▼
                                    ┌──────────┐
                                    │localStorage│
                                    └──────────┘
```

## 🏛️ 設計原則

### SOLID原則の適用

1. **Single Responsibility (単一責任)**
   - 各モジュールは1つの責務のみを持つ
   - 例: `dataLoader.js` はファイル読み込みのみ

2. **Open/Closed (開放/閉鎖)**
   - 拡張に開いて、修正に閉じている
   - 新機能は新モジュール追加で対応

3. **Liskov Substitution (リスコフの置換)**
   - インターフェースの一貫性を保持
   - 例: すべてのモーダルは同じパターン

4. **Interface Segregation (インターフェース分離)**
   - 必要な機能のみをエクスポート
   - 大きな神クラスを作らない

5. **Dependency Inversion (依存性逆転)**
   - 抽象に依存、具象に依存しない
   - `appState`を通じた間接アクセス

### その他の設計パターン

**Singleton Pattern**: AppState
```javascript
// 唯一のインスタンス
export const appState = new AppState();
```

**Module Pattern**: すべてのモジュール
```javascript
// 名前空間の分離
export function loadFile() { ... }
export function validateData() { ... }
```

**Observer Pattern** (部分的): 状態変更時の更新
```javascript
appState.setCurrentStore(id);
render(); // 状態変更を監視して更新
```

**Factory Pattern**: UIコンポーネント生成
```javascript
createKPICard(config);
createAlertCard(type, title, desc);
```

## 📦 モジュール依存関係

### 依存グラフ

```
         ┌──────────────┐
         │   main.js    │
         └──────┬───────┘
                │
     ┌──────────┼──────────┐
     │          │          │
     ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐
│Services │ │  UI    │ │ Models │
└────┬────┘ └───┬────┘ └───┬────┘
     │          │          │
     └──────────┼──────────┘
                │
     ┌──────────┼──────────┐
     │          │          │
     ▼          ▼          ▼
┌─────────┐ ┌────────┐ ┌────────┐
│ Config  │ │ Utils  │ │ Models │
└─────────┘ └────────┘ └────────┘
```

### インポートチェーン

**最小依存** (下層):
- `config/constants.js` → なし

**中間層**:
- `models/state.js` → config
- `utils/helpers.js` → config

**サービス層**:
- `services/*.js` → config, models, utils

**UI層** (最上層):
- `ui/*.js` → config, models, services, utils

**エントリーポイント**:
- `main.js` → すべて

## 🧪 テスト戦略

### ユニットテスト

各モジュールを独立してテスト:

```javascript
// helpers.test.js
import { parseNum, fmt, fmtPct } from '../utils/helpers.js';

test('parseNum should parse formatted numbers', () => {
    expect(parseNum('1,234')).toBe(1234);
    expect(parseNum('¥5,678')).toBe(5678);
});
```

### 統合テスト

モジュール間の連携をテスト:

```javascript
// dataFlow.test.js
import { loadFile } from '../services/dataLoader.js';
import { appState } from '../models/state.js';

test('loadFile should update appState', async () => {
    await loadFile(mockFile, 'shiire');
    expect(appState.hasData('shiire')).toBe(true);
});
```

### E2Eテスト

ユーザーフローをテスト:

```javascript
// e2e.test.js
test('complete workflow: upload → process → export', async () => {
    // 1. ファイルアップロード
    // 2. データ処理
    // 3. Excel出力
    // 4. 結果検証
});
```

## 📊 パフォーマンス考慮事項

### コード分割

```javascript
// 必要な時だけロード
const { exportExcel } = await import('./services/excelService.js');
```

### メモ化

```javascript
// 計算結果のキャッシュ
const memoized = memoize(expensiveCalculation);
```

### 遅延初期化

```javascript
// 必要になるまで初期化しない
let heavyModule;
function getHeavyModule() {
    if (!heavyModule) {
        heavyModule = import('./heavy.js');
    }
    return heavyModule;
}
```

## 🔐 セキュリティ考慮事項

1. **XSS防止**: ユーザー入力のサニタイズ
2. **CSRF対策**: (将来のAPI統合時)
3. **データ検証**: すべての入力を検証
4. **設定保護**: 機密情報をlocalStorageに保存しない

## 🚀 将来の拡張

### Phase 4候補

- 計算エンジンの実装
- レンダリングロジックの実装
- リアルタイムデータ同期
- バックエンドAPI統合

### Phase 5候補

- TypeScript移行
- フレームワーク統合 (Vue/React)
- PWA化
- オフライン対応

---

**このアーキテクチャは、保守性・拡張性・テスト可能性を最大化するように設計されています。**
