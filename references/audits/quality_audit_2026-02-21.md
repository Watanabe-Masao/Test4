# 品質チェックレポート（2026-02-21）

## 実施したチェック
- `npm run lint`
- `npm test`
- `npm run build`
- `find src -type f ... | xargs wc -l | sort -nr | head -n 20` で肥大化ファイルを抽出

## 総評
- テストは **66ファイル / 616テスト** がすべて成功し、基礎的な品質は高いです。
- 一方で、Lint警告が **33件** 残っており、React Hooks依存配列・Fast Refresh非互換・一部ライブラリ互換性の懸念が見られます。
- UI層に 500〜1500行級の巨大ファイルが複数あり、将来的な変更容易性/バグ混入率の面で技術的負債化が進んでいます。
- Buildは成功していますが、**dynamic import と static import の混在**によるチャンク分割最適化失敗の警告が出ています。

## 潜在バグ/不具合リスク（優先度: 高）
1. `useImport.ts` の `useCallback` で依存配列不足（`autoSetDataEndDay`）により、古いクロージャ参照が発生する可能性。
2. `usePwaInstall.ts` の `useEffect` で依存配列不足（`isInstalled`）により、インストール状態に追従しない可能性。
3. `StorageManagementTab.tsx` の `useCallback` で依存配列不足（`loadSlice`）が2箇所。ストレージ管理タブで古いデータ読み込み関数を参照する恐れ。
4. `DataGrid.tsx` で `react-hooks/incompatible-library` 警告。`useReactTable()` 由来の関数をメモ化境界に渡す際、stale UI の温床になり得る。
5. `App.test.tsx` 実行時に `borderRadius` prop がDOMへ漏れている警告。属性リークによるDOM汚染・将来的なHydration不整合リスク。
6. `TimeSlotSalesChart` / `TransactionValueChart` / `CustomerTrendChart` テストで width/height が -1 になるstderr。レスポンシブコンテナ前提が崩れた場合に本番描画崩れへ繋がる可能性。

## 技術的負債（優先度: 中）
7. Fast Refresh警告が多数（33件中の大半）。コンポーネントファイルに定数・ヘルパー・コンテキスト値が混在し、開発体験劣化と責務混在を示唆。
8. `CalculationOrchestrator.ts` が dynamic + static の両方で読み込まれ、コード分割が効いていない（初期ロード増加）。
9. `node_modules` をリポジトリ内に持っている構成はレビュー効率・CI時間・差分ノイズの観点で非推奨（Git管理対象なら早急に除外推奨）。
10. 大規模ページ/ウィジェットが単一ファイルに集約され、関心分離が弱い（例: Dashboard, Admin, Detailモーダル）。
11. スタイル定義が 1000行超の単一ファイルに存在し、再利用性低下・デザイン変更コスト増大。
12. チャート系コンポーネントが 500行級で乱立し、同種ロジック（凡例、tooltip、軸フォーマット）の重複温床。

## 関数/変数設計に関する懸念（安全性・可読性）
13. 巨大コンポーネント内でローカル関数が増殖し、入出力契約（引数/戻り値）よりも外部状態への暗黙依存が強くなっている可能性。
14. 命名の責務境界が曖昧（`handleX`, `processY`, `data`, `result` など汎用名の集中）だと、レビュー時に仕様誤読が起きやすい。
15. 「計算関数」と「副作用関数（保存・通知・遷移）」の分離が弱い箇所は、テスト容易性と障害切り分け速度を落とす。
16. 可変オブジェクトを跨いで更新する実装パターンが残っている場合、部分更新漏れ・参照共有バグの温床になる。
17. Optional値や欠損データの扱いが関数ごとに異なると、境界ケースで `undefined` 伝播バグを誘発しやすい。
18. 型アサーション（`as`）が多い箇所は、コンパイラ保護をすり抜けて実行時エラーを引き起こす可能性がある。

## データ安全利用性・将来のデータ増加に対する懸念
19. 取り込みデータのスキーマ検証が十分でない場合、不正フォーマットや列ズレが下流計算を静かに壊すリスクがある。
20. 数値変換時の `NaN` / `Infinity` / 桁溢れ（大きな金額や件数）の防御が不足すると、集計結果の信頼性が下がる。
21. IndexedDB 保存時のバージョニング/移行戦略が弱いと、将来スキーマ変更で既存ユーザーデータを破損しうる。
22. データ件数増加時に全件メモリ展開する処理は、ブラウザメモリ圧迫と描画遅延を招く。
23. チャート/テーブル前処理を毎レンダー再計算している箇所は、データ増加に比例してUI応答性が悪化する。
24. 差分保存・履歴保持の粒度が粗い場合、データ増加とともにI/Oが肥大化し、復元時間が伸びる。
25. 個人情報/機密値を含む可能性があるデータのログ出力が無制御だと、意図しない情報漏えいリスクがある。
26. インポート時の重複キー・不正日付・時系列逆転を正規化しないと、後続分析で統計的に不正な結果を返しうる。

## 肥大化/複雑化ポイント（定量）
- 1518行: `src/presentation/pages/Dashboard/widgets/DayDetailModal.tsx`
- 1105行: `src/presentation/pages/Admin/AdminPage.tsx`
- 1052行: `src/presentation/pages/Dashboard/DashboardPage.styles.ts`
- 1038行: `src/presentation/pages/Dashboard/widgets/TableWidgets.tsx`
- 653行: `src/presentation/pages/Admin/StorageManagementTab.tsx`
- 618行: `src/presentation/components/charts/BudgetVsActualChart.tsx`
- 611行: `src/presentation/pages/Forecast/ForecastCharts.tsx`
- 609行: `src/presentation/pages/Category/CategoryPage.tsx`
- 574行: `src/infrastructure/storage/IndexedDBStore.ts`

## 改善提案バックログ（多め・実行可能な粒度）
### A. バグ予防（Hooks/状態管理）
27. `react-hooks/exhaustive-deps` を warning→error に引き上げ、CIで遮断する。
28. 依存配列不足が出た3ファイルを最優先修正し、回帰テストを追加する。
29. 非同期処理を持つhooksで `AbortController`/`isMounted` 保護を標準化。
30. `useCallback` の乱用点検を行い、不要メモ化を削減して依存関係を単純化。
31. 関数の責務を「純粋計算」「I/O副作用」「画面イベント変換」に分類し、1関数1責務を徹底する。
32. 命名規約を強化し、ドメイン語彙（例: `grossProfit`, `storeDailySummary`）中心に置き換える。
33. `unknown` + 型ガードを優先し、`as` 依存のデータ変換を段階的に撤廃する。

### B. UI層の分割（巨大ファイル対策）
34. `DayDetailModal.tsx` を「表示コンポーネント」「集計hooks」「フォーマッタ」に3分割。
35. `AdminPage.tsx` をタブ単位で route-level code splitting し、初期バンドルを削減。
36. `TableWidgets.tsx` を widgetごとのサブモジュールへ分割し、1ファイル400行以下を目標化。
37. `DashboardPage.styles.ts` のデザイントークンを共通化し、重複スタイルを削減。

### C. チャート品質
38. Rechartsコンポーネント向けにテスト用 `ChartTestContainer`（固定 width/height）を導入し、stderrノイズを根治。
39. チャート共通部品（Tooltip, Axis formatter, Empty state）を抽象化して重複削減。
40. グラフ入力データ変換を `useMemo` + selector 化し、描画再計算コストを削減。

### D. ビルド/性能
41. `CalculationOrchestrator` の import 方式を統一し、worker経由か同期経由かを明確化。
42. `vendor-recharts` / `vendor-xlsx` の重量が大きいため、画面単位の遅延ロードを強化。
43. `vite-bundle-visualizer` などで定期的にバンドルサイズ予算を監視。
44. 大量データ向けに集計処理を Web Worker へ寄せ、メインスレッド占有を低減する。
45. ページネーション/仮想化/インクリメンタル読み込みを統一方針として導入する。

### E. アーキテクチャ/保守性
46. 依存方向（presentation→application→domain→infrastructure）のlintルールを追加。
47. `any` / 型アサーションの棚卸しを実施し、型安全性を向上。
48. `index.ts` の再export境界を整理し、循環参照チェックをCIに追加。
49. ドメイン計算ロジックの境界値テスト（異常系/欠損値）を拡充。
50. インポート境界にランタイムバリデーション（zod等）を導入し、壊れた入力を早期遮断。
51. データ保持ポリシー（保存期間・マスキング・削除手順）を明文化して監査可能にする。

### F. 品質ゲート/運用
52. CIに `lint + test + build + typecheck` を必須化。
53. PRテンプレートに「巨大ファイルへの影響」「分割可否」「パフォーマンス影響」欄を追加。
54. 技術的負債チケットを「バグ誘発リスク」「開発速度低下」「性能悪化」でスコアリングし、四半期ごとに返済。
55. Storybook/Visual Regression をダッシュボード系主要ウィジェットに拡大。
56. 大規模データ（例: 10万行）を使った定期性能回帰テストをCI夜間ジョブで実行する。

## 推奨実施順（短期）
1) Hooks依存配列不足3件の修正
2) インポート境界の入力スキーマ検証導入（壊れたデータの早期遮断）
3) Chartテストstderrの解消
4) `DayDetailModal` と `TableWidgets` の分割
5) `CalculationOrchestrator` の import整理
6) 大規模データ性能計測（10万行想定）を自動化
7) CIゲート強化（warning最小化）
