# 禁止事項クイックリファレンス

> 本ファイルは CLAUDE.md §禁止事項 から抽出した全文である。
> 正式な原典は CLAUDE.md であり、乖離がある場合は CLAUDE.md を優先すること。

## クイックリファレンス表

全9件（正本: CLAUDE.md §禁止事項）。全ロールが遵守必須。

| # | 禁止事項 | 壊れるもの | 検出手段 |
|---|---|---|---|
| 1 | `_` リネームでコンパイラ警告を黙らせる | 未使用パラメータのバグが隠蔽される（decompose5 の prevSales/curSales 事件） | `noUnusedParameters: true` + review-gate |
| 2 | 引数を無視して別ソースから再計算する | シャープリー恒等式が崩壊（カテゴリ合計 ≠ 売上合計） | factorDecomposition.test.ts |
| 3 | useMemo/useCallback の依存配列から参照値を省く | ステールデータ（ファイルインポート後にチャートが更新されない） | `react-hooks/exhaustive-deps: error` |
| 4 | 要因分解の合計を売上差と不一致にする | ウォーターフォールチャートが合計に到達しない | factorDecomposition.test.ts |
| 5 | domain/ に外部依存・副作用を持ち込む | テストにモック必要、不変条件テスト実行困難 | architectureGuard.test.ts |
| 6 | UI が生データソースを直接参照する | データソース混同、計算ロジック分散、テスト困難 | review-gate チェック |
| 7 | UI に変換・副作用・状態管理を混在させる（God Component） | 717行の MetricBreakdownPanel 事件。Storybook 不可、テスト不可 | 300行閾値 + review-gate |
| 8 | 比較データの sourceDate を落とす変換を行う | 月跨ぎ時の出典追跡不能、前年比0表示（buildPrevSameDowMap 事件） | comparisonMigrationGuard.test.ts (INV-CMP-08) + sameDowPoint.test.ts |
| 9 | pure かつ authoritative な処理を TypeScript の制御層に新規実装する | 正式値の定義元が分散し、責務境界が崩壊する | review-gate チェック + engine-boundary-policy.md |

## チェック手順（review-gate 用）

1. `git diff` で `_` 接頭辞の追加がないか確認
2. `git diff` で `eslint-disable` コメントの追加がないか確認
3. 計算関数で引数を全て使用しているか確認（特に prevSales/curSales）
4. `npm test` で factorDecomposition.test.ts が通ること
5. `npm test` で architectureGuard.test.ts が通ること
6. 新規 UI コンポーネントが生データ（records[]）を直接触っていないか確認
7. 新規/変更ファイルが 300行を超えていないか確認
8. `dailyMapping` を直接ループする独自変換がないか確認（`buildSameDowPoints()` を経由すること）
9. pure かつ authoritative な処理が hooks/stores/usecases に新規実装されていないか確認（`domain/calculations/` に配置すべき）

---

## 全禁止事項 詳細

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
本システムの売上データは複数ファイルに由来する（詳細は「データソースの分離」を参照）。
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

---

### 6. UIコンポーネントが生データソースを直接参照してはならない

Presentation層のコンポーネントが `ImportedData` の生レコード
（`categoryTimeSales.records` 等）を直接受け取り、
フィルタ・集約・計算を行ってはならない。

**これをやると何が壊れるか:**
本システムのデータは複数ファイルに由来し、同じ「売上」でもソースによって値が異なる。
UIが生データを直接触ると:
- **データソースの混同**: 生レコードを集計した合計と、計算パイプラインが出した
  `StoreResult.totalSales` が一致しない。ユーザーは画面上の矛盾した数値を見ることになる。
- **計算ロジックの分散**: フィルタ・除数計算・集約ロジックがUIコンポーネント内に散在し、
  同じ計算を複数箇所で独自実装するリスクが生まれる。
- **テスト困難**: UIコンポーネント内の計算はReact環境でしかテストできず、
  純粋関数のユニットテストに比べて脆弱になる。

**壊れるパターン:**
- チャートコンポーネントが `categoryTimeSales.records` を props で受け取り、
  内部で `records.filter(...)` → `records.reduce(...)` する
- `WidgetContext` に `CategoryTimeSalesData`（生データ）を入れてUIに渡す
- 複数コンポーネントで同じフィルタ・集約ロジックをインラインで重複実装する

---

### 7. UIコンポーネントにデータ変換・副作用・状態管理を混在させてはならない

Presentation層のコンポーネントが `useMemo`/`useCallback` でデータ変換を行い、
`navigator.clipboard` 等の副作用を含み、複数の `useState` で状態管理し、
かつ JSX の描画も行う「God Component」にしてはならない。

**これをやると何が壊れるか:**
MetricBreakdownPanel.tsx が 717 行の God Component に成長した事例（現在は 304 行に分割済み）:
- 25 個の styled-component 定義、4 個の `useState`、5 個の `useMemo`/`useCallback`、
  2 個の副作用（クリップボード書き込み、CSV エクスポート）、200 行以上の JSX が
  1 ファイルに混在していた
- Storybook ストーリーの作成が不可能（ドメイン型のモック構築が必要）
- `allExplanations: ReadonlyMap<MetricId, Explanation>`（22 指標の全マップ）を
  props で丸ごと受け取る God Object Prop パターンにより、
  テストでのモック構築が困難かつ関心の境界が曖昧になっていた
- ファイルが 300 行（設計思想4の閾値）を大幅に超過していたにもかかわらず放置されていた

**壊れるパターン:**
- 1 コンポーネントに styled-component 定義 + フック + JSX を全部入れる
- `allXxx: ReadonlyMap<Id, DomainModel>` のような巨大マップを props で丸ごと渡す
- 副作用（API 呼び出し、クリップボード、ファイル出力）を描画コンポーネント内に書く

**正しい分割パターン:**
```
ComponentName.styles.ts   — styled-component 定義のみ
useComponentName.ts       — データ変換・状態管理・副作用（ViewModel フック）
ComponentName.tsx         — ViewModel を受け取り JSX を返す（描画のみ）
```

---

### 8. 比較データの sourceDate を落とす変換を行ってはならない

`DayMappingRow` の `prevYear`/`prevMonth`/`prevDay` を落として
`Map<number, number>` や `Map<number, { sales, customers }>` に変換してはならない。
同曜日比較の UI データは `buildSameDowPoints()` を唯一の入口とし、
`SameDowPoint` 型（sourceDate を含む）を使うこと。

**これをやると何が壊れるか:**
`buildPrevSameDowMap()` が `DayMappingRow` を `Map<number, { sales, customers }>` に
劣化させていた。月跨ぎ（例: 2026/2/28 → 2025/3/1）で、
「その値は前年のどの実日付から来たか」が復元不能になった。
デバッグ時に出典を追跡できず、ツールチップに正しい日付を表示できず、
前年比が 0 として表示されるバグが長期間残った。

**壊れるパターン:**
- `dailyMapping` をループして独自の `Map<number, ...>` を構築する
- `currentDay → sales` だけを抽出し、sourceDate を捨てる
- 表とグラフで別々に `dailyMapping` を解釈する独自変換を作る

**正しいパターン:**
```typescript
// buildSameDowPoints() を使う（comparisonTypes.ts で定義）
const points = buildSameDowPoints(kpi.sameDow.dailyMapping)
// 各 point は sourceDate を保持する
const p = points.get(28)
// p.sourceDate → { year: 2025, month: 3, day: 1 }
// p.sales → 1722
// p.customers → 80
```

**検出:**
- ガードテスト `comparisonMigrationGuard.test.ts` (INV-CMP-08) が
  presentation 層での `dailyMapping` 独自ループを検出する
- `sameDowPoint.test.ts` が sourceDate 保持と合計整合性を検証する
