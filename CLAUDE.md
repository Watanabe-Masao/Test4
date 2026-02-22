# CLAUDE.md - 開発ルール

## プロジェクト構成

- アプリケーション: `app/` ディレクトリ
- CI: lint → build(tsc -b + vite) → test(vitest)

## コマンド

- `cd app && npm run lint` - ESLint
- `cd app && npm run build` - TypeScript型チェック + Viteビルド
- `cd app && npm test` - 全テスト実行
- `cd app && npx vitest run <path>` - 特定テスト実行

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

### 未使用パラメータの禁止

関数パラメータが未使用（`_` プレフィクス）の場合、単にリネームで済ませず、
**なぜ使われていないかを検討すること**。
特に数学的関数で入力パラメータが使われていない場合はバグの可能性が高い。

## テストの方針

### 不変条件テスト（invariant tests）

`factorDecomposition.test.ts` に数学的不変条件テストがある。
分解ロジックを変更した場合は:

1. 既存の不変条件テストが全て通ること
2. 新しいエッジケースのテストを追加すること
3. データソース不一致シナリオでも合計が一致することを検証すること

### バリデーション

- `FileImportService.ts` の `validateImportedData` で売上データとCTS合計の乖離を検出
- 1%以上の乖離がある場合ユーザーに警告を表示
