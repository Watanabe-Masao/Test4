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

以下はすべて**本プロジェクトで実際に発生したバグ**に基づく。
「こう書け」ではなく「これをやると壊れる」という制約として読むこと。
解決方法は状況に応じて柔軟に選んでよいが、制約自体は破ってはならない。

**制約の変更について:**
これらの制約は不変ではない。技術的前提やプロジェクト要件が変われば制約も変わりうる。
ただし制約を変更・緩和する場合は、**なぜその制約が不要になったか、
または維持するコストが利益を上回るようになったか**を明示すること。
「やりたいことの邪魔になるから」は理由にならない。
「この制約が防いでいたバグが、別の仕組みで防がれるようになった」は理由になる。

---

### 1. コンパイラ警告を黙らせてはならない

`noUnusedParameters` エラーに対して `_` リネームで対処してはならない。
`eslint-disable` コメントで lint エラーを握り潰してはならない。

**これをやると何が壊れるか:**
`decompose5` は `prevSales`/`curSales` を引数に受け取りながら内部で使っていなかった。
`_prevSales`/`_curSales` にリネームしてコンパイルを通した結果、
「売上データを無視している」という**重大なバグがコンパイラの警告ごと隠蔽された**。
要因分解の合計が実際の売上差と一致しない状態が、検出手段を失ったまま残った。

**壊れるパターン:**
- コンパイラやlinterが「おかしい」と指摘しているのに、指摘自体を消す
- 特に数学的関数で入力パラメータが無視されている場合、ほぼ確実にバグ
- 同系列の関数（decompose2, decompose3）では使われているパラメータが、
  ある関数だけ未使用なら、その関数の実装が間違っている

---

### 2. 引数を無視して別ソースから再計算してはならない

関数が `prevSales`/`curSales` 等を引数として受け取っているのに、
その値を使わず別のデータ（カテゴリデータ等）から合計を再計算してはならない。

**これをやると何が壊れるか:**
本システムの売上データは複数ファイルに由来する:
- `totalSales`/`totalCustomers`: 売上・売変Excelから算出
- `categoryTimeSales`: 分類別時間帯CSVから算出

これらは**別ファイル由来で合計が一致する保証がない**。
丸め誤差・集計タイミング差・対象範囲差により数%乖離する。

`decompose5` がカテゴリデータから売上合計を独自再計算した結果、
シャープリー恒等式（`Σ効果 = curSales - prevSales`）が崩れた。
ウォーターフォールチャートの合計が売上差と一致しなくなった。

**壊れるパターン:**
- 引数で渡されている値と同じものを、別経路で再計算する
- 「どうせ同じ値だから」という前提を置く（データソースが異なれば一致しない）
- 合計値の算出元と比率の算出元を混同する

---

### 3. useMemo/useCallback の依存配列から参照値を省いてはならない

`useMemo`/`useCallback` 内で参照している値を依存配列に入れ忘れてはならない。
ESLint `react-hooks/exhaustive-deps` は **error** 設定であり、これを回避してはならない。

**これをやると何が壊れるか:**
`YoYWaterfallChart.tsx` と `DrilldownWaterfall.tsx` で `categoryTimeSales` 関連の
値が依存配列から漏れていた。ユーザーが新しいファイルをインポートしても
チャートが古いデータのまま更新されない「ステールデータ」バグが発生した。

**壊れるパターン:**
- 依存配列を手動で書いて、参照値を入れ忘れる
- 「再計算コストが高いから」と意図的に依存を省く（表示が壊れる）
- `// eslint-disable-next-line` で依存配列の警告を消す

---

### 4. 要因分解の合計を売上差と不一致にしてはならない

分解関数を変更した結果、効果の合計値が `curSales - prevSales` と
一致しなくなる状態にしてはならない。

**これをやると何が壊れるか:**
シャープリー値の効率性公理により、配分合計は全体の売上差と一致する必要がある。
これが崩れると:
- ウォーターフォールチャートの棒が「合計」に到達しない
- ユーザーが数値の信頼性を疑い、分析ツールとして使われなくなる
- 上流の意思決定に誤ったデータが渡る

**壊れるパターン:**
- カテゴリデータから合計を再計算する（禁止事項2と同根）
- 分解レベル間（2↔3↔5要素）で客数・点数効果の値が食い違う
- `factorDecomposition.test.ts` の不変条件テストを通さずにリリースする

---

### 5. domain/ 層に外部依存・副作用を持ち込んではならない

`domain/` 配下のコードが React、ブラウザAPI、外部ライブラリ、
ファイルI/O等に依存してはならない。

**これをやると何が壊れるか:**
`domain/calculations/` は純粋な数学関数であり、入力→出力の決定論的変換のみを行う。
副作用や外部依存が混入すると:
- 単体テストにモックが必要になり、テストの信頼性が落ちる
- 不変条件テスト（シャープリー恒等式の検証）が実行困難になる
- 計算バグの再現・修正に環境構築が必要になる

**壊れるパターン:**
- `domain/` 内で `import React` や `import { useXxx }` をする
- `domain/` 内で `localStorage`、`fetch`、`console.log` を使う
- `domain/` から `infrastructure/` や `presentation/` を参照する
