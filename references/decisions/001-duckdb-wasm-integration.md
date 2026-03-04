# ADR-001: DuckDB-WASM によるブラウザ内 SQL 分析エンジン導入

**ステータス**: Accepted（採用済み）
**日付**: 2026-02-21
**影響範囲**: infrastructure / application / presentation

---

## コンテキスト

仕入荒利管理システムは、小売業の仕入・売上・在庫データから粗利計算・予算分析・
売上要因分解を行う SPA である。

分類別時間帯売上データ（1 ヶ月あたり数万〜10 万行）や部門 KPI データに対して、
以下のような集約・分析処理をブラウザ内で実行する必要がある:

- 時間帯 x 曜日のクロス集計（ヒートマップ用）
- カテゴリ階層別（部門/ライン/クラス）の集約
- 日次累積売上のウィンドウ関数（SUM OVER ORDER BY）
- 前年比較の FULL OUTER JOIN
- 移動平均（MA3/7/28）、変動係数、Z スコア、スパイク検出
- カテゴリ構成比の週次推移（LAG 関数）
- 店舗ランキングの推移（RANK OVER PARTITION BY）

Phase 1 時点では JavaScript の配列操作（`filter` / `reduce`）で集計していたが、
以下の課題が顕在化した:

1. **パフォーマンス**: 10,000 行超のデータでスライダー操作時にフレーム落ちが発生
2. **月跨ぎクエリ**: IndexedDB に保存された過去月データを JavaScript で結合するのは煩雑
3. **クエリ複雑度**: ウィンドウ関数・RANK・移動平均等の集計を JavaScript で書くと
   コードが肥大化し、バグのリスクが増大
4. **コード重複**: 複数チャートで同様の集計ロジックがインラインで重複
   （CLAUDE.md 禁止事項 6「UIコンポーネントが生データソースを直接参照してはならない」に抵触）

---

## 検討した代替案

### 代替案 1: JavaScript で手動集約（現状維持）

- **方法**: インデックス構造（HashMap / B-Tree 風）を自前実装、メモ化を強化
- **利点**: 追加依存なし、バンドルサイズ増加なし
- **欠点**:
  - 複雑な集計（ウィンドウ関数、FULL OUTER JOIN）の実装コストが非常に大きい
  - 月跨ぎクエリの実装が困難
  - 各チャートで独自の集計ロジックが増殖するリスク
- **却下理由**: 実装コストとバグリスクが許容範囲を超える

### 代替案 2: Web Worker + JavaScript 手動集約

- **方法**: 集計処理を Web Worker に移行し、メインスレッドのブロッキングを解消
- **利点**: UI のフレーム落ちが解消される
- **欠点**:
  - 集計ロジック自体の複雑さは解決しない
  - Worker - メインスレッド間のデータ直列化コスト
  - ウィンドウ関数等の高度な集計は依然として手書き
- **却下理由**: パフォーマンス問題は緩和されるが、コード複雑度の根本的な解決にならない

### 代替案 3: SQL.js（SQLite WASM）

- **方法**: SQLite の WASM ビルドをブラウザ内で動作させ、SQL で集計
- **利点**: SQL の表現力、成熟したエコシステム
- **欠点**:
  - 行指向ストレージのため分析クエリが DuckDB より低速
  - ウィンドウ関数のサポートが限定的
- **却下理由**: 分析ワークロードには列指向エンジンが適している

### 代替案 4: DuckDB-WASM（採用）

- **方法**: DuckDB の WASM ビルドをブラウザ内で実行
- **利点**:
  - 列指向ストレージによる高速な分析クエリ
  - 豊富なウィンドウ関数（RANK, LAG, 移動平均、累積合計）
  - SQL による宣言的な集計ロジック
  - FULL OUTER JOIN、CTE 等の高度なクエリ
  - Apache Arrow フォーマットによる効率的なデータ転送
  - サーバーサイド移行時に SQL クエリをそのまま転用可能
- **欠点**:
  - WASM バイナリのバンドルサイズ増加（約 4MB gzipped）
  - 初期化にかかるレイテンシ（1-3 秒）
  - ブラウザのメモリ使用量増加

---

## 決定

**DuckDB-WASM（代替案 4）を採用する。**

### 理由

1. **SQL の表現力**: ウィンドウ関数・CTE・FULL OUTER JOIN が標準サポートされており、
   複雑な集計ロジックを宣言的に記述できる
2. **Apache Arrow 形式の高速データ転送**: DuckDB の内部データフォーマットと
   JavaScript 側のデータ受け渡しが効率的
3. **WASM による高速実行**: 列指向ストレージ + WASM により、
   10 万行規模のデータに対する集計が数十ミリ秒で完了する
4. **コード品質の向上**: SQL クエリとして分離することで、
   UI コンポーネントから集計ロジックを排除できる（CLAUDE.md 禁止事項 6 への対応）
5. **フォールバック可能**: DuckDB が利用不可の場合は既存の JavaScript パスに
   フォールバック可能な設計にできる

---

## 実装方針

### レイヤー配置

```
Domain層       -> 型定義のみ（DuckDB に依存しない）
Infrastructure -> engine.ts, schemas.ts, dataLoader.ts, queryRunner.ts, queries/
Application    -> useDuckDB.ts, useDuckDBQuery.ts（20 フック）
Presentation   -> DuckDB* チャートコンポーネント（15 個）
```

`domain/` 層は DuckDB に一切依存しない（CLAUDE.md 禁止事項 5 を遵守）。

### フォールバック戦略

全ての DuckDB チャートは、DuckDB が利用不可（`conn === null`）の場合に
既存の JavaScript パス（`ctsIndex` ベース）にフォールバックする。

### テーブル設計

8 テーブル + 1 VIEW を定義:
- `classified_sales`, `category_time_sales`, `time_slots`, `purchase`,
  `special_sales`, `transfers`, `consumables`, `department_kpi`
- `store_day_summary`（VIEW: classified_sales を基準に 6 テーブル LEFT JOIN）

全テーブルに `year`, `month`, `day`, `date_key` カラムを持たせ、
月跨ぎクエリを `date_key BETWEEN` で実現。

### 段階的導入

- **Phase 1**（v1.0.0）: 基盤構築 -- engine, schemas, dataLoader, queryRunner、
  6 クエリモジュール
- **Phase 2**（v1.1.0）: 高度分析チャート 14 種 -- 専用フック 20 個、
  DateRangePicker、チャートウィジェット 15 個

---

## 結果・影響

### 追加されたインフラストラクチャ

- `infrastructure/duckdb/` レイヤーの新設
  - `engine.ts`: DuckDB-WASM のライフサイクル管理（初期化・接続・状態遷移）
  - `schemas.ts`: 8 テーブル + 1 VIEW の DDL 定義
  - `dataLoader.ts`: ImportedData -> DuckDB テーブルへのデータロード
  - `queryRunner.ts`: SQL 実行ユーティリティ（Arrow -> JS 変換、snake_case -> camelCase）

### クエリモジュール（6 モジュール / 23 関数）

| モジュール | 関数数 | 主な機能 |
|---|---|---|
| `categoryTimeSales.ts` | 8 | 時間帯・階層・店舗別集約、曜日除数マップ |
| `storeDaySummary.ts` | 4 | 日次サマリー、累積売上、集約レート |
| `departmentKpi.ts` | 3 | 部門 KPI ランキング、サマリー、月別トレンド |
| `yoyComparison.ts` | 2 | 前年比較（日次・カテゴリ別） |
| `features.ts` | 4 | 特徴量、時間帯プロファイル、曜日パターン、部門トレンド |
| `advancedAnalytics.ts` | 2 | カテゴリ構成比週次、店舗ベンチマーク |

### フック（20 個）

`useDuckDB.ts`（ライフサイクル管理）+ `useDuckDBQuery.ts`（19 クエリフック）

### チャートウィジェット（15 個）

累積売上、前年比日次、部門トレンド、曜日パターン、時間帯プロファイル、
時間帯別集約、ヒートマップ、部門別時間帯、店舗別時間帯、
カテゴリトレンド、カテゴリ時間帯、カテゴリ構成比、店舗ベンチマーク、
部門 KPI、DateRangePicker

### テスト

75 のテスト（スキーマ・アーキテクチャガード・クエリ型・ユーティリティ）

### トレードオフ

- WASM バイナリによるバンドルサイズ増加（約 4MB gzipped）
- 初期化レイテンシ（1-3 秒）
- ブラウザメモリ使用量の増加

### 今後の課題

- DuckDB チャートと既存 JavaScript チャートの統合・統一
- Web Worker への DuckDB エンジン移行（メインスレッドのブロッキング軽減）
- パーシステント DuckDB（IndexedDB 連携）によるリロード時のデータ再ロード省略

---

## DuckDB-WASM バージョン追従ポリシー

**決定日**: 2026-03-04

### 現状

`@duckdb/duckdb-wasm` は `^1.33.1-dev18.0`（dev プレリリース）を使用している。
DuckDB-WASM の stable リリースは不定期であり、dev ビルドが事実上の最新版となっている。

### 方針: dev 追従（Dependabot 管理）

| 項目 | 方針 |
|---|---|
| 追従対象 | `@duckdb/duckdb-wasm` の dev リリース |
| 更新頻度 | Dependabot が週次で PR を作成 |
| 受入基準 | CI 6段階ゲート（lint → format → build → storybook → test → e2e）が全て通過 |
| stable 移行 | stable リリースが出た場合は優先的にピン留め |

### 理由

1. **dev ビルドが実質的な最新版**: DuckDB-WASM の stable リリースは infrequent であり、
   バグ修正やパフォーマンス改善は dev ビルドにのみ含まれることが多い
2. **CI ゲートが品質保証**: 6段階 CI パイプラインが通過すれば、アプリケーションへの
   影響は限定的と判断できる
3. **ブラウザ完結型のリスク低減**: サーバーサイドと異なり、DuckDB-WASM の不具合は
   ユーザーのブラウザ内に閉じるため、影響範囲が限定的

### stable リリース時の対応

DuckDB-WASM が stable をリリースした場合:

1. `package.json` のバージョン指定を `^X.Y.Z`（stable）に変更
2. dev プレリリースの `^` 範囲指定を解除
3. Dependabot は stable のパッチ・マイナー更新を監視
