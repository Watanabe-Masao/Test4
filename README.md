# 仕入粗利管理ツール (shiire-arari)

小売業の仕入・売上・在庫データから粗利計算・予算分析・売上要因分解・需要予測を行う SPA。
Excel/CSV をインポートし、ブラウザ完結（サーバー不要）で動作します。

## 主な機能

- **ダッシュボード** — 売上・粗利・予算達成・前年比較を一画面で確認
- **日別売上分析** — 日別推移、時間帯ドリルダウン、曜日パターン
- **要因分解** — 売上差異を客数・客単価・点数・価格・構成比に分解
- **カテゴリ分析** — 部門/ライン/クラス別の売上・PI値・構成比
- **仕入分析** — 原価/売価の日別推移、値入率、カテゴリ別内訳
- **予算管理** — 達成率、残予算ペース、前年比較
- **需要予測** — 週別予測、曜日パターン、着地予測・ゴールシーク
- **レポート** — P&L サマリー、部門 KPI、CSV エクスポート
- **天気相関** — 気象庁データとの売上相関分析

## クイックスタート

### 前提条件

- Node.js 22 以上
- Rust toolchain（[rustup.rs](https://rustup.rs/)）
- wasm-pack 0.13.1（`cargo install wasm-pack@0.13.1`）

### 初回セットアップ

```bash
# 依存チェック → WASM ビルド → npm install を一括実行
npm run setup

# 開発サーバーを起動
cd app && npm run dev
```

> **注:** `app/package.json` は `file:../wasm/.../pkg` 依存を含むため、
> WASM ビルドを行わずに `npm install` すると失敗する場合があります。
> `npm run setup` はこの順序を自動的に処理します。

## コマンド

```bash
cd app
npm run dev           # 開発サーバー
npm run build         # 本番ビルド
npm run lint          # ESLint
npm run format:check  # Prettier チェック
npm test              # テスト
npm run test:e2e      # E2E テスト
npm run storybook     # Storybook
```

## 技術スタック

React 19 / TypeScript / Vite / DuckDB-WASM / ECharts / Zustand / styled-components

詳細は [CLAUDE.md](./CLAUDE.md) を参照。

## アーキテクチャ

```
Presentation → Application → Domain ← Infrastructure
```

4 層構成 + features/ 縦スライスで構成。
設計原則・ガードテスト・不変条件で品質を機械的に保証しています。

詳細は [CLAUDE.md](./CLAUDE.md) と [references/](./references/) を参照。

## デプロイ

GitHub Pages: `https://<username>.github.io/<repo-name>/`

CI が `VITE_BASE_PATH` をリポジトリ名から自動設定するため、リポジトリ名に依存しません。

## ライセンス

MIT License
