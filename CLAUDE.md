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

以下の禁止事項はすべて**本プロジェクトで実際に発生したバグ**に基づく。
各項目の「なぜ」を理解し、形式的な遵守ではなく本質的な理解をもって守ること。

---

### 1. 未使用パラメータの `_` リネームによるコンパイルエラー回避禁止

**何が禁止か:**
TypeScript の `noUnusedParameters` エラーを、パラメータ名に `_` を付けて
黙らせること。例: `prevSales` → `_prevSales`

**なぜ禁止か（実際のインシデント）:**
`decompose5` 関数は `prevSales`/`curSales` を引数に受け取っていたが、
内部で使用していなかった。コンパイルエラーを消すために `_prevSales`/`_curSales` に
リネームした結果、「この関数は売上データを使っていない」という**重大なバグが
コンパイラの警告ごと隠蔽された**。

本来 `decompose5` は売上データにアンカーして分解すべきだったが、代わりに
カテゴリデータ（別ファイル由来）から独自に合計を再計算していた。
これにより要因分解の合計が実際の売上差と一致しないバグが発生した。

**正しい対応:**
パラメータが未使用の場合、まず「なぜこのパラメータが渡されているのに
使われていないのか？」を調査する。特に以下の場合はバグを強く疑うこと:
- 数学的関数で入力パラメータが無視されている
- 関数シグネチャの意図と実装の乖離がある
- 同系列の他の関数（decompose2, decompose3）では使われているパラメータ

---

### 2. 上位レイヤーから渡された値を無視した独自再計算禁止

**何が禁止か:**
関数の引数として渡された `prevSales`/`curSales` 等の値を使わず、
別のデータソース（カテゴリデータ等）から独自に合計値を再計算すること。

**なぜ禁止か（データソース分離問題）:**
本システムでは売上データの算出元が複数存在する:
- `totalSales`/`totalCustomers`: 売上Excel・売変Excelから計算
- `categoryTimeSales`: 分類別時間帯CSVから計算

これらは**別ファイル由来であり、合計値が一致する保証がない**。
実際の運用データでは丸め誤差・集計タイミング差・対象範囲差により
数%の乖離が発生する。

`decompose5` がカテゴリデータから独自に売上合計を再計算した結果、
シャープリー恒等式（`Σ効果 = curSales - prevSales`）が崩れ、
UIに表示される要因分解の合計値が実際の売上差と一致しなくなった。

**正しいアーキテクチャ:**
- 分解関数は常に**呼び出し元から渡された売上値（Single Source of Truth）**を使う
- カテゴリデータは「比率の算出」にのみ使い、「合計の算出」には使わない
- 現在の `decompose5` は `decompose3`（売上アンカー）の結果を
  `decomposePriceMix`（カテゴリ比率）で分割する設計になっている

---

### 3. useMemo/useCallback の依存配列からの参照値省略禁止

**何が禁止か:**
`useMemo` や `useCallback` 内で参照している変数を依存配列に含めないこと。
ESLint `react-hooks/exhaustive-deps` ルールは **error** レベルで設定されている。

**なぜ禁止か（ステールデータバグ）:**
依存配列に値が不足していると、メモ化された計算結果が古いデータのまま
保持される。ユーザーが新しいファイルをインポートしても、チャートに
反映されない「ステールデータ」バグが発生する。

実際に `YoYWaterfallChart.tsx` と `DrilldownWaterfall.tsx` で
`categoryTimeSales` 関連の値が依存配列から漏れており、
カテゴリデータを更新してもチャートが再計算されないバグが発生した。

**正しい対応:**
- `useMemo`/`useCallback` 内で参照する値はすべて依存配列に列挙する
- ESLint の警告を `// eslint-disable` で黙らせない
- 依存配列が長くなる場合は、計算ロジック自体をカスタムフックに抽出する

---

### 4. シャープリー恒等式を破る変更の禁止

**何が禁止か:**
要因分解関数の変更において、効果の合計が `curSales - prevSales` と
一致しなくなる変更を加えること。

**なぜ禁止か（数学的整合性）:**
シャープリー値の効率性公理（efficiency axiom）により、各プレイヤーへの
配分の合計は全体のパイ（売上差）と一致しなければならない。
これが崩れると:
- ウォーターフォールチャートの棒グラフが「合計」に到達しない
- ユーザーが数値の信頼性を疑い、分析ツールとしての価値が失われる
- 上流の意思決定に誤ったデータが使われるリスクがある

**検証方法:**
- `factorDecomposition.test.ts` の不変条件テストが自動検証する
- 新しい分解ロジックを追加する場合は、必ず恒等式テストも追加する
- テストには「データソース不一致シナリオ」を必ず含める

---

### 5. domain/ 層からの外部依存・副作用の持ち込み禁止

**何が禁止か:**
`domain/` 配下のコードが React、ブラウザAPI、外部ライブラリ、
ファイルI/O等に依存すること。

**なぜ禁止か（テスト容易性と移植性）:**
`domain/calculations/` は純粋な数学関数であり、入力→出力の決定論的な
変換のみを行う。副作用や外部依存が混入すると:
- 単体テストでモックが必要になり、テスト信頼性が低下する
- 計算の正しさの検証が困難になる
- 将来的なバックエンド移行（Node.js/Deno）が不可能になる

`domain/` は `vitest` のみで高速にテスト可能な状態を維持すること。
