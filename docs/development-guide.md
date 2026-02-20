# 開発ガイド

仕入粗利管理アプリケーション（shiire-arari）の開発に必要な情報をまとめたガイドです。

---

## 1. 開発環境セットアップ

### 前提条件

- **Node.js**: 18 以上
- **npm**: Node.js に同梱のバージョン

### インストール

```bash
cd app
npm install
```

### 開発サーバー起動

```bash
npm run dev
```

Vite の開発サーバーが起動します。デフォルトポートは **5173** です。
ホットモジュールリプレースメント（HMR）に対応しており、ソース変更時にブラウザが自動更新されます。

### ビルド

```bash
npm run build
```

内部的に `tsc -b && vite build` が実行されます。
ビルド成果物は `app/dist/` に出力されます。ソースマップも同時に生成されます。

---

## 2. プロジェクト構成

```
Test4/
├── app/                    # メインアプリケーション
│   ├── src/
│   │   ├── domain/         # ドメイン層 (型定義・計算ロジック)
│   │   │   ├── models/     # データモデル・型定義
│   │   │   ├── calculations/ # 集計・粗利計算・予測ロジック
│   │   │   └── constants/  # 定数定義 (カテゴリ・デフォルト値)
│   │   ├── application/    # アプリケーション層 (フック・状態管理)
│   │   ├── infrastructure/ # インフラ層 (ファイル解析・永続化)
│   │   │   ├── fileImport/ # ファイル読込・種別判定・日付パーサー
│   │   │   ├── dataProcessing/ # データ種別ごとのプロセッサ
│   │   │   ├── storage/    # IndexedDB 永続化・差分計算
│   │   │   └── export/     # データエクスポート
│   │   └── presentation/   # プレゼンテーション層 (UI)
│   │       ├── components/ # 共通コンポーネント
│   │       │   ├── common/ # ボタン・カード・モーダル等
│   │       │   ├── charts/ # グラフコンポーネント (Recharts)
│   │       │   └── Layout/ # AppShell・NavBar・Sidebar
│   │       ├── pages/      # ページコンポーネント
│   │       │   ├── Dashboard/  # ダッシュボード (ウィジェット構成)
│   │       │   ├── Category/   # カテゴリ分析
│   │       │   ├── Forecast/   # 予測・着地見込み
│   │       │   ├── Analysis/   # 分析・比較
│   │       │   ├── Daily/      # 日別詳細
│   │       │   ├── Transfer/   # 店間移動
│   │       │   ├── Consumable/ # 消耗品
│   │       │   ├── Summary/    # サマリー
│   │       │   ├── Reports/    # レポート
│   │       │   └── Admin/      # 管理 (ストレージ管理・前年マッピング)
│   │       └── theme/      # テーマ定義 (Dark/Light)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.*.json
├── docs/                   # ドキュメント
└── PLAN.md                 # 改善計画
```

### アーキテクチャ概要

本アプリケーションはクリーンアーキテクチャに基づく4層構造を採用しています。

| 層 | ディレクトリ | 責務 |
|---|---|---|
| **ドメイン層** | `domain/` | ビジネスロジックの中核。型定義、計算ロジック、定数。外部依存なし |
| **アプリケーション層** | `application/` | React フック・状態管理。ドメイン層とインフラ層を橋渡し |
| **インフラ層** | `infrastructure/` | 外部リソースとの接続。ファイル解析、IndexedDB 永続化 |
| **プレゼンテーション層** | `presentation/` | UI コンポーネント。React + styled-components |

依存方向: `presentation → application → domain ← infrastructure`

---

## 3. npm スクリプト一覧

すべてのコマンドは `app/` ディレクトリで実行します。

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 (Vite HMR対応) |
| `npm run build` | TypeScript コンパイル + Vite ビルド (`tsc -b && vite build`) |
| `npm run test` | テスト実行 (`vitest run`) |
| `npm run test:watch` | テストウォッチモード (`vitest`) |
| `npm run test:coverage` | カバレッジレポート付きテスト実行 |
| `npm run lint` | ESLint によるリント実行 |
| `npm run format` | Prettier によるコード整形 |
| `npm run format:check` | Prettier 整形チェック (CI用) |
| `npm run preview` | ビルド結果のプレビューサーバー起動 |

---

## 4. パスエイリアス

`@/` エイリアスが `src/` ディレクトリにマッピングされています。

**設定箇所:**
- `vite.config.ts` (ランタイム解決)
- `tsconfig.app.json` (TypeScript 型解決)

**使用例:**

```typescript
import { StoreResult } from '@/domain/models'
import { processPurchase } from '@/infrastructure/dataProcessing/PurchaseProcessor'
import { safeNumber } from '@/domain/calculations/utils'
```

相対パスの `../../domain/models` のような記述を避け、常に `@/` プレフィックスを使用してください。

---

## 5. テスト

### フレームワーク

- **テストランナー**: Vitest 4.0
- **UIテスト**: React Testing Library
- **DOM環境**: jsdom
- **IndexedDB モック**: fake-indexeddb

### テストファイル規約

テストファイルはソースファイルと同じディレクトリに配置します。

```
domain/calculations/aggregation.ts
domain/calculations/aggregation.test.ts

infrastructure/fileImport/FileTypeDetector.ts
infrastructure/fileImport/FileTypeDetector.test.ts
```

ファイル名は `*.test.ts` または `*.test.tsx` の形式です。

### テスト規模

- **テストファイル数**: 45
- **テストケース数**: 467

### カバレッジ対象

- `domain/` - 型定義・計算ロジック
- `infrastructure/` - ファイル解析・永続化
- `application/` - フック・状態管理

### テスト実行

```bash
# 全テスト実行
npm run test

# ウォッチモード (ファイル変更時に自動実行)
npm run test:watch

# カバレッジレポート
npm run test:coverage
```

---

## 6. コーディング規約

### 命名規則

| 対象 | 規則 | 例 |
|------|------|-----|
| 型・インターフェース | PascalCase | `StoreResult`, `ImportedData`, `PurchaseDayEntry` |
| 変数・関数 | camelCase | `calculateGrossProfit`, `safeNumber`, `processFileData` |
| 定数 | UPPER_SNAKE_CASE | `DEFAULT_MARKUP_RATE`, `TARGET_ACCOUNT_CODE`, `DB_NAME` |
| コンポーネントファイル | PascalCase | `KpiCard.tsx`, `DashboardPage.tsx`, `FileDropZone.tsx` |
| テストファイル | *.test.ts(x) | `aggregation.test.ts`, `KpiCard.test.tsx` |

### boolean 変数の命名

boolean 型の変数・プロパティには `is` / `has` / `should` / `needs` プレフィックスを使用します。

```typescript
readonly isDepartmentTransfer: boolean
readonly needsConfirmation: boolean
```

### イミュータビリティ

全データモデルは `readonly` 修飾子を使用し、不変性を保証します。

```typescript
export interface PurchaseDayEntry {
  readonly suppliers: {
    readonly [supplierCode: string]: {
      readonly name: string
      readonly cost: number
      readonly price: number
    }
  }
  readonly total: { readonly cost: number; readonly price: number }
}
```

型エイリアスも `Readonly` パターンを使用します。

```typescript
export type StoreDayRecord<T> = {
  readonly [storeId: string]: {
    readonly [day: number]: T
  }
}
```

### インポート

- 型のみのインポートには `import type` を使用します。
- パスエイリアス `@/` を使用し、相対パスは同一ディレクトリ内のみ許可します。

```typescript
import type { DataType } from '@/domain/models'
import { safeNumber } from '@/domain/calculations/utils'
```

---

## 7. スタイリング

### styled-components

UI スタイリングには **styled-components 6** を使用しています。テーマは `ThemeProvider` で配信されます。

### テーマモード

| モード | 説明 |
|--------|------|
| **Dark** (デフォルト) | 暗い背景色 (`#09090b`) + 明るいテキスト (`#f4f4f5`) |
| **Light** | 明るい背景色 (`#f8fafc`) + 暗いテキスト (`#0f172a`) |

### カテゴリグラデーション

17色のグラデーションカラーが定義されており、カテゴリ別チャートやヒートマップで使用されます。

### フォント

```
font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif
```

### ブレークポイント

| 名称 | 幅 | 用途 |
|------|-----|------|
| `xs` | 0px | モバイル |
| `sm` | 640px | 小型タブレット |
| `md` | 768px | タブレット |
| `lg` | 1024px | デスクトップ |
| `xl` | 1280px | ワイドスクリーン |

### テーマアクセス

コンポーネント内では `props.theme` 経由でテーマトークンにアクセスします。

```typescript
const Card = styled.div`
  background: ${(p) => p.theme.colors.bg2};
  border: 1px solid ${(p) => p.theme.colors.border};
  border-radius: ${(p) => p.theme.radii.lg};
  padding: ${(p) => p.theme.spacing.md};
`
```

---

## 8. 新機能の追加ガイド

### 新しい計算ロジックを追加する

1. `domain/calculations/` に新しいモジュールを作成する
2. 純粋関数として実装し、外部依存を持たない
3. 同ディレクトリにテストファイル (`*.test.ts`) を作成する
4. `domain/calculations/index.ts` からエクスポートする

```
domain/calculations/
├── newCalculation.ts      # 新しい計算ロジック
├── newCalculation.test.ts # テスト
└── index.ts               # エクスポート追加
```

### 新しいデータ種別を追加する

1. `domain/models/Settings.ts` の `DataType` 型に新しい種別を追加する
2. `domain/models/DataTypes.ts` にデータ型を定義する
3. `domain/models/ImportedData.ts` にフィールドを追加する
4. `infrastructure/dataProcessing/` に新しい Processor を作成する
5. `infrastructure/fileImport/FileTypeDetector.ts` に判定ルールを追加する
6. `infrastructure/ImportService.ts` の `processFileData` に処理分岐を追加する
7. `infrastructure/storage/IndexedDBStore.ts` に保存/読込ロジックを追加する
8. 各段階でテストを作成する

### 新しいページを追加する

1. `presentation/pages/` に新しいページディレクトリ・コンポーネントを作成する
2. `domain/models/Settings.ts` の `ViewType` に新しいビュー種別を追加する
3. `App.tsx` の ViewRouter に新しいルーティングを追加する
4. `presentation/components/Layout/Sidebar.tsx` にナビゲーションリンクを追加する

```
presentation/pages/
└── NewFeature/
    ├── NewFeaturePage.tsx   # メインページコンポーネント
    └── SubComponent.tsx     # サブコンポーネント
```

### 新しいチャートを追加する

1. `presentation/components/charts/` にチャートコンポーネントを作成する (Recharts 使用)
2. ダッシュボードに表示する場合は `presentation/pages/Dashboard/widgets/` にウィジェットを作成する
3. `presentation/pages/Dashboard/widgets/registry.tsx` にウィジェットを登録する

```
presentation/components/charts/
├── NewChart.tsx            # チャートコンポーネント
└── __tests__/
    └── NewChart.test.tsx   # テスト
```

---

## 9. 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|-----------|
| フレームワーク | React | 19.2 |
| ビルドツール | Vite | 7.3 |
| 言語 | TypeScript | 5.9 |
| スタイリング | styled-components | 6.3 |
| チャート | Recharts | 3.7 |
| Excel解析 | SheetJS (xlsx) | 0.18 |
| テスト | Vitest | 4.0 |
| テスト (UI) | React Testing Library | 16.3 |
| リント | ESLint | 9.39 |
| フォーマット | Prettier | 3.8 |

---

## 10. 主要なデータフロー

```
ファイル選択/D&D
    ↓
tabularReader (xlsx/CSV パース)
    ↓
FileTypeDetector (種別自動判定)
    ↓
各 Processor (データ構造化)
    ↓
ImportService (ImportedData にマージ)
    ↓
diffCalculator (既存データとの差分検出)
    ↓
IndexedDBStore (永続化)
    ↓
application hooks (状態管理)
    ↓
calculations (集計・粗利計算)
    ↓
presentation (UI 表示)
```
