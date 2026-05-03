# shiire-arari -- アプリケーション

仕入粗利管理ツールのフロントエンドアプリケーション。
React + TypeScript + Vite を基盤とし、ブラウザ内で計算・永続化・分析を完結させる。

## この README の役割

このファイルは「アプリ開発の入口」を示す。
詳細な原則・定義・移行方針は以下を参照する。

- ルール全体: `../CLAUDE.md`
- 設計原則: `../references/01-foundation/`
- 実装ガイド: `../references/03-implementation/`
- 現在の構造状態: `../references/04-tracking/generated/architecture-state-snapshot.generated.md`

## 初回セットアップ

### 前提条件

- **Node.js** >= 22.x
- **npm** >= 10.x
- **Rust + wasm-pack**（WASM モジュールのビルドに必要）

### 通常の開発起動

```bash
cd app
npm install
npm run dev          # http://localhost:5173/Test4/
```

### WASM パッケージ再生成が必要なケース

`package.json` は `file:../wasm/.../pkg` 依存を含む。
WASM 側を変更した場合、または `pkg/` が不足している環境では先に以下を実行する。

```bash
cd app
npm run build:wasm   # Rust → wasm-pack（全 7 モジュール）
npm install
npm run dev
```

## npm スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | Vite 開発サーバーを起動（HMR 有効） |
| `npm run build` | TypeScript の型チェック（tsc -b）後、Vite で本番ビルド |
| `npm run test` | Vitest でテストを一括実行 |
| `npm run test:guards` | 構造制約ガードテスト（CI fast-gate） |
| `npm run test:observation` | 観測テスト（WASM 二重実行検証） |
| `npm run test:coverage` | カバレッジレポート付きでテスト（lines 55% 閾値） |
| `npm run test:e2e` | Playwright E2E テスト |
| `npm run build:wasm` | WASM モジュールビルド（Rust → wasm-pack） |
| `npm run lint` | ESLint によるコード検査 |
| `npm run format:check` | Prettier のフォーマット適合チェック |
| `npm run storybook` | Storybook 開発サーバー |

## アーキテクチャ

4 層モデル: `Presentation → Application → Domain ← Infrastructure`

### 実装の主経路

コードを追うときは、4 層の抽象図だけでなく、次の 2 本の実装経路として理解する。

**A. 正本 lane** — 業務値の意味を確定する経路

```
infra query → QueryHandler → pure builder → readModel / calculateModel
```

例: `salesFactHandler.ts` → `buildSalesFactReadModel()`

**B. Screen Plan lane** — 画面固有の取得・比較を束ねる経路

```
Controller → application hook → useXxxPlan → useQueryWithHandler → QueryHandler 群 → View
```

例: `TimeSlotChart.tsx` → `useTimeSlotData.ts` → `useTimeSlotPlan.ts`

### presentation 側の共通入口

`useUnifiedWidgetContext` → comparison / query / weather / chart interaction の slice に分割。
`query slice` → `useWidgetQueryContext` / `useWidgetDataOrchestrator` に集約。

### Composition Root

`AppProviders.tsx` が composition root として Provider tree を管理する。
RepositoryProvider / AdapterProvider / PersistenceProvider / AppLifecycleProvider 等を束ね、
DI は App.tsx / AppProviders.tsx に集約する。

## どこに何を書くか

### 新しい業務値を追加する

- `application/queries/*Handler.ts` — infra query
- `application/readModels/<name>/` — pure builder + Zod 契約
- 必要なら `references/01-foundation/*-definition.md` — 定義書
- `test/guards/*PathGuard.test.ts` — パスガード追加

### 既存画面に新しい分析系列を追加する

- `application/hooks/useXxxData.ts` — UI state + derivation
- `application/hooks/plans/useXxxPlan.ts` — query orchestration
- `useQueryWithHandler` 経由で QueryHandler を呼ぶ
- component に acquisition logic を書かない

### 新しい描画だけを追加する

- Controller / View / OptionBuilder の 3 分離を優先
- View には raw domain/query 値を渡さない
- `.tsx`（描画）+ `.styles.ts`（スタイル）+ `.vm.ts`（ViewModel）の構成

## パスエイリアス

`@/` が `src/` にマッピングされている（`tsconfig.app.json` / `vite.config.ts` / `vitest.config.ts` で同期）。

## テスト

| 項目 | 値 |
|---|---|
| テスト環境 | jsdom |
| テストファイルパターン | `src/**/*.{test,spec}.{ts,tsx}` |
| カバレッジ | V8 プロバイダ、domain + application + infrastructure が対象。lines 55% 閾値 |
| WASM | 型付きモック alias でテスト時に差し替え |

## ビルド構成

| 項目 | 値 |
|---|---|
| `base` | `/Test4/`（GitHub Pages） |
| `target` | ES2022 |
| `strict` | true（+ noUnusedLocals / noUnusedParameters） |
| WASM | `vite-plugin-wasm` + `vite-plugin-top-level-await` |
| DuckDB | `@duckdb/duckdb-wasm`（optimizeDeps.exclude） |

## ブラウザサポート

- Chrome / Edge >= 94（推奨）
- Firefox >= 93
- Safari >= 15.4

> DuckDB Worker: Chrome/Edge ではネスト Worker、Firefox/Safari はメインスレッドフォールバック。
> 大量データを扱う場合は Chrome/Edge を推奨。
