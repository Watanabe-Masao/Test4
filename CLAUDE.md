# CLAUDE.md - 開発ルール

## プロジェクト概要

仕入荒利管理システム（shiire-arari）。小売業の仕入・売上・在庫データから粗利計算・
予算分析・売上要因分解・需要予測を行うSPA。

## プロジェクト構成

```
app/                          # アプリケーション本体
├── src/
│   ├── domain/               # ドメイン層（フレームワーク非依存）
│   │   ├── models/           # 型定義・データモデル
│   │   ├── calculations/     # 計算ロジック（粗利・予測・分解）
│   │   └── constants/        # 定数
│   ├── application/          # アプリケーション層
│   │   ├── context/          # React Context（状態管理）
│   │   ├── hooks/            # カスタムフック
│   │   ├── services/         # オーケストレーション
│   │   └── stores/           # Zustand ストア
│   ├── infrastructure/       # インフラ層
│   │   ├── dataProcessing/   # ファイルパーサー・プロセッサ
│   │   ├── storage/          # IndexedDB・localStorage
│   │   └── export/           # CSV/Excel出力
│   └── presentation/         # プレゼンテーション層
│       ├── components/       # 共通コンポーネント・チャート
│       └── pages/            # ページコンポーネント
.github/workflows/ci.yml     # CI パイプライン
```

### レイヤー間の依存ルール

`Presentation → Application → Domain ← Infrastructure`

- **domain/** はどの層にも依存しない（純粋なビジネスロジック）
- **application/** は domain/ のみに依存
- **infrastructure/** は domain/ のみに依存
- **presentation/** は application/ と domain/ に依存
- infrastructure/ と presentation/ は直接依存しない

## コマンド

```bash
cd app && npm run lint          # ESLint（エラー0で通ること）
cd app && npm run build         # tsc -b（型チェック）+ vite build
cd app && npm test              # vitest run（全テスト）
cd app && npx vitest run <path> # 特定テスト実行
cd app && npm run format:check  # Prettier フォーマットチェック
cd app && npm run test:e2e      # Playwright E2Eテスト
```

### CI パイプライン（PR・push to main で自動実行）

1. `npm run lint` — ESLint（**エラー0必須**、warningは許容）
2. `npm run build` — tsc -b + vite build（**TypeScript strict mode**）
3. `npm test` — vitest（**全テスト合格必須**）

## コーディング規約

### 命名規則

| 対象 | 規則 | 例 |
|---|---|---|
| 型・インターフェース | PascalCase | `StoreResult`, `DailyRecord` |
| 変数・関数 | camelCase | `totalSales`, `calculateGrossProfit` |
| 定数 | UPPER_SNAKE_CASE | `MAX_DAYS`, `DEFAULT_RATE` |
| コンポーネント | PascalCase | `DashboardPage`, `KpiCard` |
| テストファイル | `*.test.ts(x)` | `factorDecomposition.test.ts` |
| Boolean | is/has/should/needs 接頭辞 | `isCalculated`, `hasPrevYear` |

### TypeScript

- **strict mode 有効**（tsconfig.app.json）
- `noUnusedLocals: true` / `noUnusedParameters: true` — ビルドで強制
- パスエイリアス: `@/` → `src/`（import は `@/domain/...` の形式）
- `readonly` を積極的に使用（イミュータブル設計）

### スタイリング

- styled-components 6 を使用
- テーマトークン経由でカラー・スペーシングを参照
- ダーク/ライトテーマ対応

## 要因分解ロジックのルール

### 数学的不変条件（絶対に守ること）

全ての分解関数は **シャープリー恒等式** を満たさなければならない:

- `decompose2`: `custEffect + ticketEffect = curSales - prevSales`
- `decompose3`: `custEffect + qtyEffect + pricePerItemEffect = curSales - prevSales`
- `decompose5`: `custEffect + qtyEffect + priceEffect + mixEffect = curSales - prevSales`

**合計値は実際の売上差（`curSales - prevSales`）に完全一致しなければならない。**
カテゴリデータから独自に合計を再計算してはならない。

### 2↔3↔5要素間の一貫性

- `decompose5` の `custEffect` と `qtyEffect` は `decompose3` と同じ値になること
- `decompose5` の `priceEffect + mixEffect` は `decompose3` の `pricePerItemEffect` と一致すること
- UIで分解レベルを切り替えた際に客数・点数効果の値が変わらないこと

### データソースの分離に注意

- `totalSales` / `totalCustomers` は売上・売変Excelから計算
- `categoryTimeSales` は分類別時間帯CSVから計算
- **これらは別ファイル由来で合計が一致する保証がない**
- 分解関数は常に `prevSales`/`curSales`（売上データ）にアンカーすること
- `FileImportService.ts` の `validateImportedData` で1%以上の乖離を警告表示

## テストの方針

### 必須テスト

計算ロジック（`domain/calculations/`）を変更した場合:

1. 既存テストが全て通ること
2. 新しいエッジケースのテストを追加すること
3. ゼロ除算・null・NaN のガードを検証すること

### 不変条件テスト（invariant tests）

`factorDecomposition.test.ts` に数学的不変条件テストがある。
分解ロジックを変更した場合は:

1. 既存の不変条件テストが全て通ること
2. データソース不一致シナリオでも合計が一致することを検証すること
3. 2↔3↔5要素間の一貫性テストを通すこと

## 禁止事項

### 未使用パラメータの安易なリネーム禁止

関数パラメータが未使用（`_` プレフィクス）の場合、単にリネームで済ませず、
**なぜ使われていないかを検討すること**。
特に数学的関数で入力パラメータが使われていない場合はバグの可能性が高い。

### 計算結果の独自再計算禁止

上位レイヤーから渡された `prevSales`/`curSales` 等の値を無視して、
別のデータソースから独自に合計を再計算してはならない。
データは常に信頼できる単一ソースにアンカーすること。

### useMemo/useCallback の依存配列省略禁止

React Hooks の依存配列は ESLint `react-hooks/exhaustive-deps` で **error** 設定。
関数内で参照している値は必ず依存配列に含めること。
