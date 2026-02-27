# ADR-001: DuckDB-WASM の採用

**ステータス**: 採用済み
**日付**: 2026-02-21
**影響範囲**: infrastructure / application / presentation

---

## コンテキスト

仕入荒利管理システムは、分類別時間帯売上データ（1 ヶ月あたり数万〜10 万行）を
ブラウザ内で集計・分析する必要がある。Phase 1 時点では JavaScript の
配列操作（`filter` / `reduce`）で集計していたが、以下の課題が顕在化した:

1. **パフォーマンス**: 10,000 行超のデータでスライダー操作時にフレーム落ちが発生
2. **月跨ぎクエリ**: IndexedDB に保存された過去月データを JavaScript で結合するのは煩雑
3. **クエリ複雑度**: 時間帯×曜日マトリクス、RANK OVER、移動平均等の集計を
   JavaScript で書くとコードが肥大化し、バグのリスクが増大
4. **コード重複**: 複数チャートで同様の集計ロジックがインラインで重複

---

## 検討した選択肢

### A. JavaScript 集計の最適化

- **方法**: インデックス構造（HashMap / B-Tree 風）を自前実装、メモ化を強化
- **利点**: 追加依存なし、バンドルサイズ増加なし
- **欠点**: 複雑な集計（ウィンドウ関数、FULL OUTER JOIN）の実装コスト大、
  月跨ぎクエリの実装が困難

### B. SQL.js（SQLite WASM）

- **方法**: SQLite をブラウザ内で動作させ、SQL で集計
- **利点**: SQL の表現力、成熟したエコシステム
- **欠点**: 列指向ストレージではないため分析クエリが遅い、
  ウィンドウ関数のサポートが限定的

### C. DuckDB-WASM（採用）

- **方法**: DuckDB の WASM ビルドをブラウザ内で実行
- **利点**:
  - 列指向ストレージによる高速な分析クエリ
  - 豊富なウィンドウ関数（RANK, LAG, 移動平均）
  - SQL による宣言的な集計ロジック
  - FULL OUTER JOIN、CTE 等の高度なクエリ
  - Apache Arrow フォーマットによる効率的なデータ転送
- **欠点**:
  - WASM バイナリのバンドルサイズ増加（~4MB gzipped）
  - 初期化にかかるレイテンシ（1〜3 秒）
  - ブラウザのメモリ使用量増加

### D. Web Worker + JavaScript

- **方法**: 集計処理を Web Worker に移行
- **利点**: メインスレッドのブロッキング解消
- **欠点**: 集計ロジック自体の複雑さは解決しない、
  データの直列化コスト

---

## 決定

**DuckDB-WASM（選択肢 C）を採用する。**

理由:
1. SQL で集計ロジックを宣言的に書けるため、コード量が大幅に削減される
2. 列指向ストレージにより、大量行の集計が 10 倍以上高速
3. ウィンドウ関数・CTE・FULL OUTER JOIN が標準サポートされている
4. DuckDB が利用不可の場合は既存の JavaScript パスにフォールバック可能
5. サーバーサイドへの移行を将来検討する際に、SQL クエリをそのまま転用可能

---

## 実装方針

### レイヤー配置

```
Domain層       → 型定義のみ（DuckDB に依存しない）
Infrastructure → engine, schemas, dataLoader, queryRunner, queries/
Application    → useDuckDB, useDuckDBQuery（20 フック）
Presentation   → DuckDB* チャートコンポーネント（15 個）
```

### フォールバック戦略

全ての DuckDB チャートは、DuckDB が利用不可（`conn === null`）の場合に
既存の JavaScript パス（`ctsIndex` ベース）にフォールバックします。

```typescript
// フック内での分岐
if (conn && dataVersion > 0) {
  // DuckDB クエリ実行
} else {
  // 既存の JavaScript 集計にフォールバック
}
```

### テーブル設計

8 テーブル + 1 VIEW を定義:
- `classified_sales`, `category_time_sales`, `time_slots`, `purchase`,
  `special_sales`, `transfers`, `consumables`, `department_kpi`
- `store_day_summary`（VIEW: 6 テーブル LEFT JOIN）

全テーブルに `year`, `month`, `day`, `date_key` カラムを持たせ、
月跨ぎクエリを `date_key BETWEEN` で実現。

### 段階的導入

- **Phase 1**（v1.0.0）: 基盤構築（engine, schemas, dataLoader, queryRunner）
- **Phase 2**（v2.0.0）: クエリモジュール（6 モジュール / 23 関数）+ フック（20 個）+ チャート（15 個）

---

## 結果

### 達成されたこと

- 23 の SQL クエリ関数により、集計ロジックが宣言的かつテスト可能に
- 15 の新チャートにより、DuckDB ベースの高度な分析を提供
- フォールバック機構により、DuckDB 非対応環境でも既存機能が維持
- 75 のテスト（スキーマ・アーキテクチャガード・クエリ型・ユーティリティ）

### トレードオフ

- WASM バイナリによるバンドルサイズ増加（約 4MB gzipped）
- 初期化レイテンシ（1〜3 秒）
- ブラウザメモリ使用量の増加

### 今後の課題

- DuckDB チャートと既存 JavaScript チャートの統合・統一
- Web Worker への DuckDB エンジン移行（メインスレッドのブロッキング軽減）
- パーシステント DuckDB（IndexedDB 連携）によるリロード時のデータ再ロード省略
