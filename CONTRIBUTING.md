# コントリビューションガイド

仕入荒利管理システム（shiire-arari）への貢献方法について説明します。

## 開発環境セットアップ

### 前提条件

- **Node.js 22 以上**
- npm（Node.js に同梱）
- Git

### 手順

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd Test4

# 2. 依存パッケージをインストール
cd app
npm install

# 3. 開発サーバーを起動
npm run dev
```

開発サーバーは `http://localhost:5173` で起動します（Vite デフォルト）。

### その他のコマンド

```bash
npm run lint          # ESLint によるコード品質チェック
npm run format:check  # Prettier によるフォーマットチェック
npm run format        # Prettier でフォーマット自動修正
npm run build         # TypeScript 型チェック + Vite プロダクションビルド
npm test              # vitest による全テスト実行
npx vitest run <path> # 特定テストファイルの実行
npm run test:e2e      # Playwright E2E テスト
npm run storybook     # Storybook の起動（ポート 6006）
```

## ブランチ戦略

- **main** ブランチが本番ブランチです
- 機能追加・バグ修正は **main から feature ブランチを作成** して作業します
- ブランチ名の例:
  - `feature/duckdb-hourly-chart`
  - `fix/decompose5-invariant`
  - `refactor/calculation-pipeline`
  - `docs/api-reference`

```bash
git checkout main
git pull origin main
git checkout -b feature/<説明的な名前>
```

## コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/) に従います。

### フォーマット

```
<type>(<scope>): <説明>

<本文（任意）>
```

### type 一覧

| type | 用途 |
|---|---|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `refactor` | 機能変更を伴わないコードの改善 |
| `docs` | ドキュメントの変更 |
| `test` | テストの追加・修正 |
| `style` | コードスタイルの変更（フォーマット等） |
| `chore` | ビルドプロセス・補助ツールの変更 |

### 例

```
feat(duckdb): 時間帯×曜日ヒートマップクエリを追加

queryHourDowMatrix を categoryTimeSales クエリモジュールに実装。
CtsFilterParams による店舗・日付範囲フィルタに対応。
```

```
fix(calculations): decompose5 のシャープリー恒等式不整合を修正
```

## プルリクエスト（PR）フロー

### 1. CI 通過が必須

PR を作成すると、以下の CI パイプラインが自動実行されます。
**全てのチェックが通過しないとマージできません。**

1. `npm run lint` -- ESLint（エラー 0 必須、warning は許容）
2. `npm run format:check` -- Prettier フォーマットチェック
3. `npm run build` -- tsc -b + vite build（TypeScript strict mode）
4. `npm test` -- vitest（全テスト合格必須）

### 2. PR 作成前のローカル確認

```bash
cd app
npm run lint && npm run format:check && npm run build && npm test
```

全て通過することを確認してから PR を作成してください。

### 3. PR の説明

- 変更の目的と概要を明記する
- 影響範囲（変更されるレイヤー）を記載する
- スクリーンショット（UI 変更の場合）を添付する

## コードレビュー基準

レビューでは以下の観点を確認します。詳細は `CLAUDE.md` の禁止事項を参照してください。

### 必須チェック項目

1. **コンパイラ警告の抑制禁止**: `_` リネームや `eslint-disable` で警告を黙らせていないか
2. **引数の無視禁止**: 関数が受け取った引数を使わず別ソースから再計算していないか
3. **useMemo/useCallback 依存配列**: 参照値が依存配列から漏れていないか
4. **要因分解の不変条件**: シャープリー恒等式（`Σ効果 = curSales - prevSales`）が維持されているか
5. **domain 層の純粋性**: `domain/` に React・ブラウザ API・外部依存が混入していないか
6. **UI の生データ参照禁止**: Presentation 層が生レコード配列を直接走査していないか

### レイヤー依存ルール

```
Presentation -> Application -> Domain <- Infrastructure
```

- `domain/` は他のどの層にも依存しない
- `application/` は `domain/` のみに依存
- `infrastructure/` は `domain/` のみに依存
- `presentation/` は `application/` と `domain/` に依存

## テスト追加の方針

### 計算ロジック変更時（domain/calculations/）

`domain/calculations/` を変更した場合、以下が**必須**です:

1. 既存テストが全て通ること
2. 新しいエッジケースのテストを追加すること
3. ゼロ除算・null・NaN のガードを検証すること

### 要因分解ロジック変更時

`factorDecomposition.test.ts` に数学的不変条件テストがあります。分解ロジックを変更した場合:

1. 既存の不変条件テストが全て通ること
2. データソース不一致シナリオでも合計が一致することを検証すること
3. 2要素・3要素・5要素間の一貫性テストを通すこと

### テスト実行

```bash
cd app

# 全テスト
npm test

# 特定ファイル
npx vitest run src/domain/calculations/factorDecomposition.test.ts

# カバレッジ付き
npm run test:coverage
```

## 参考ドキュメント

- **`CLAUDE.md`**: コーディング規約・禁止事項・アーキテクチャルールの詳細
- **`docs/`**: アーキテクチャ設計・計算エンジン・データモデル等の技術ドキュメント
