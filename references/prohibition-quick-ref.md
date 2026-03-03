# 禁止事項クイックリファレンス

全7件。全ロールが遵守必須。詳細は CLAUDE.md §禁止事項 を参照。

| # | 禁止事項 | 壊れるもの | 検出手段 |
|---|---|---|---|
| 1 | `_` リネームでコンパイラ警告を黙らせる | 未使用パラメータのバグが隠蔽される（decompose5 の prevSales/curSales 事件） | `noUnusedParameters: true` + review-gate |
| 2 | 引数を無視して別ソースから再計算する | シャープリー恒等式が崩壊（カテゴリ合計 ≠ 売上合計） | factorDecomposition.test.ts |
| 3 | useMemo/useCallback の依存配列から参照値を省く | ステールデータ（ファイルインポート後にチャートが更新されない） | `react-hooks/exhaustive-deps: error` |
| 4 | 要因分解の合計を売上差と不一致にする | ウォーターフォールチャートが合計に到達しない | factorDecomposition.test.ts |
| 5 | domain/ に外部依存・副作用を持ち込む | テストにモック必要、不変条件テスト実行困難 | architectureGuard.test.ts |
| 6 | UI が生データソースを直接参照する | データソース混同、計算ロジック分散、テスト困難 | review-gate チェック |
| 7 | UI に変換・副作用・状態管理を混在させる（God Component） | 717行の MetricBreakdownPanel 事件。Storybook 不可、テスト不可 | 300行閾値 + review-gate |

## チェック手順（review-gate 用）

1. `git diff` で `_` 接頭辞の追加がないか確認
2. `git diff` で `eslint-disable` コメントの追加がないか確認
3. 計算関数で引数を全て使用しているか確認（特に prevSales/curSales）
4. `npm test` で factorDecomposition.test.ts が通ること
5. `npm test` で architectureGuard.test.ts が通ること
6. 新規 UI コンポーネントが生データ（records[]）を直接触っていないか確認
7. 新規/変更ファイルが 300行を超えていないか確認
