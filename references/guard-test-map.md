# ガードテスト対応表

本ファイルはガードテスト → 管理ロール → 保護対象ファイルの対応を示す。

## テストファイル一覧

| テストファイル | 管理ロール | ルール数 | 保護対象 |
|---|---|---|---|
| `app/src/test/architectureGuard.test.ts` | architecture | 9件 | 4層境界、許可リスト、ビジネス関数アクセス |
| `app/src/domain/calculations/__tests__/calculationRules.test.ts` | invariant-guardian | 7件 | safeDivide, calculateTransactionValue, overflowDay, fmtSen, formatPercent, toPct |
| `app/src/presentation/components/charts/__tests__/divisorRules.test.ts` | invariant-guardian | 8件 | computeDivisor, filterByStore, countDistinctDays, 正規ロケーション, 網羅性 |
| `app/src/presentation/pages/Dashboard/widgets/__tests__/factorDecomposition.test.ts` | invariant-guardian | 30件 | シャープリー恒等式（2/3/5要素）、2↔3↔5 一貫性 |

## ルール → テスト対応

### architectureGuard.test.ts（architecture ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| — | domain → 外部層依存なし | INV-ARCH-01 |
| — | application → infrastructure 許可リストのみ | INV-ARCH-02 |
| — | presentation → infrastructure 許可リストのみ | INV-ARCH-03 |
| — | application → presentation 依存なし | INV-ARCH-04 |
| — | infrastructure → presentation 依存なし | INV-ARCH-05 |
| — | 許可リストファイル実在確認 | INV-ARCH-06 |
| — | presentation → domain/calculations 直接 import 禁止 | INV-ARCH-07 |
| — | getDailyTotalCost 直接使用禁止 | INV-ARCH-08 |

### calculationRules.test.ts（invariant-guardian ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| RULE-D1 | domain 内インライン除算禁止 | INV-DIV-01 |
| RULE-D2 | インライン客単価計算禁止 | INV-DIV-02 |
| RULE-I1 | overflow day ロジック共通化 | INV-DIV-03 |
| RULE-P2 | fmtSen 重複定義禁止 | INV-FMT-01 |
| RULE-P3 | Dashboard パーセント書式統一 | INV-FMT-02 |
| RULE-C1 | Chart パーセント書式統一 | INV-FMT-03 |

### divisorRules.test.ts（invariant-guardian ロール管理）

| ルール ID | 検証内容 | 不変条件 ID |
|---|---|---|
| RULE-1 | computeDivisor 経由強制 | INV-PF-01 |
| RULE-2 | レガシー API 使用禁止 | INV-PF-02 |
| RULE-3 | カレンダーベース除数禁止 | INV-PF-03 |
| RULE-4 | 二重ゼロ除算ガード禁止 | INV-PF-04 |
| RULE-5 | filterByStore 経由強制 | INV-PF-05 |
| RULE-6 | countDistinctDays 経由強制 | INV-PF-06 |
| — | 正規ロケーション実装健全性 | INV-PF-07 |
| — | usePeriodFilter 使用ファイル網羅性 | INV-PF-08 |

### factorDecomposition.test.ts（invariant-guardian ロール管理）

| 検証内容 | 不変条件 ID |
|---|---|
| decompose2 シャープリー恒等式 | INV-SH-01 |
| decompose3 シャープリー恒等式 | INV-SH-02 |
| decompose5 シャープリー恒等式 | INV-SH-03 |
| 2↔3↔5 要素間一貫性 | INV-SH-04 |
| データソース乖離時の合計一致 | INV-SH-03（特殊ケース） |
| 全パラメータ大変動時の合計一致 | INV-SH-03（ストレステスト） |

## 許可リスト管理

### application → infrastructure 許可リスト（14件）

変更時は architecture ロールの承認が必要。

| ファイル | 理由 |
|---|---|
| `application/hooks/useDuckDB.ts` | DuckDB ライフサイクル管理 |
| `application/hooks/duckdb/useCtsQueries.ts` | 時間帯売上クエリ |
| `application/hooks/duckdb/useDeptKpiQueries.ts` | 部門KPIクエリ |
| `application/hooks/duckdb/useSummaryQueries.ts` | サマリクエリ |
| `application/hooks/duckdb/useYoyQueries.ts` | 前年比較クエリ |
| `application/hooks/duckdb/useFeatureQueries.ts` | 特徴量クエリ |
| `application/hooks/duckdb/useAdvancedQueries.ts` | 高度分析クエリ |
| `application/hooks/duckdb/useMetricsQueries.ts` | 店舗メトリクスクエリ |
| `application/hooks/duckdb/useDailyRecordQueries.ts` | 日次レコードクエリ |
| `application/hooks/useStoragePersistence.ts` | ストレージ永続化 |
| `application/hooks/useDataRecovery.ts` | データ復旧 |
| `application/hooks/useBackup.ts` | バックアップ |
| `application/hooks/useImport.ts` | ファイルインポート |
| `application/usecases/import/FileImportService.ts` | インポートサービス |
| `application/workers/fileParseWorker.ts` | ファイル解析ワーカー |
| `application/workers/useFileParseWorker.ts` | ワーカーフック |
| `application/usecases/export/ExportService.ts` | エクスポート |
| `application/hooks/useI18n.ts` | i18n ブリッジ |
