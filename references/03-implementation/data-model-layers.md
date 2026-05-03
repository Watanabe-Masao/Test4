# 5層データモデル

> 本ドキュメントは CLAUDE.md の設計思想セクション、`data-flow.md`、`engine-responsibility.md` を補完する。

## 設計原則

**「Raw中心 + DuckDB活用」** — Raw データを唯一の真実源（Single Source of Truth）とし、
DuckDB は normalized_records から派生するキャッシュ層として位置づける。

## 5層の定義

```
raw_data → normalized_records → derived_metrics
              ↓ (キャッシュ)         ↑ (計算)
           DuckDB tables        JS Calculation Engine
              ↓ (探索)
           SQL集約結果 → UI

settings ← 全層が参照
metadata ← 全層が生成・参照
```

### 1. raw_data（元データ）

| 項目 | 内容 |
|---|---|
| **定義** | インポートされた元ファイル（CSV/XLSX）のバイナリ + パース前メタデータ |
| **永続化** | IndexedDB `metadata` ストア（`rawFile:` プレフィックス） |
| **型** | `RawFileRecord`, `RawDataManifest`（domain/models/RawData.ts） |
| **実装** | `rawFileStore`（infrastructure/storage/rawFileStore.ts） |
| **責務** | 監査証跡。元ファイルからの再構築を可能にする |
| **不変条件** | 一度保存された raw_data は変更されない（イミュータブル） |

### 2. normalized_records（正規化済みレコード）

| 項目 | 内容 |
|---|---|
| **定義** | バリデーション・正規化済みのドメイン型レコード |
| **永続化** | IndexedDB `monthlyData` ストア |
| **型** | `ImportedData`（domain/models/ImportedData.ts） |
| **実装** | `IndexedDBRepository`（infrastructure/storage/IndexedDBRepository.ts） |
| **責務** | DuckDB テーブルの構築元。JS 計算エンジンの入力 |
| **不変条件** | raw_data から再生成可能。DuckDB 破損時の再構築源 |

**含まれるデータ型:**
- `PurchaseData`（仕入）
- `ClassifiedSalesData`（分類別売上）
- `TransferData`（店間/部門間移動）
- `SpecialSalesData`（花/産直）
- `CostInclusionData`（消耗品）
- `CategoryTimeSalesData`（カテゴリ時間帯売上）
- `DepartmentKpiData`（部門KPI）
- `BudgetData`（予算）
- `InventoryConfig`（在庫設定）

### 3. derived_metrics（導出指標）

| 項目 | 内容 |
|---|---|
| **定義** | normalized_records + settings から計算された指標値 |
| **永続化** | Zustand ストア（メモリ）+ IndexedDB キャッシュ（StoreDaySummaryCache） |
| **型** | `StoreResult`（domain/models/StoreResult.ts） |
| **実装** | `CalculationOrchestrator`（application/usecases/calculation/） |
| **責務** | UI 表示に使用される最終的な計算結果 |
| **不変条件** | normalized_records + settings から決定論的に再生成可能 |

**導出元:**
- JS 計算エンジン → `StoreResult`（単月確定値）
- DuckDB 探索エンジン → SQL 集約結果（任意範囲探索）

### 4. settings（設定）

| 項目 | 内容 |
|---|---|
| **定義** | アプリケーション設定 + 店舗別在庫/予算設定 |
| **永続化** | IndexedDB `appSettings` ストア + `monthlyData` 内 |
| **型** | `AppSettings`, `InventoryConfig`, `BudgetData` |
| **責務** | 計算パラメータ。ユーザーが編集可能 |

### 5. metadata（メタデータ）

| 項目 | 内容 |
|---|---|
| **定義** | インポート履歴・チェックサム・データセットレジストリ |
| **永続化** | IndexedDB `metadata` ストア |
| **型** | `ImportHistoryEntry`, `DatasetMeta`, `DataEnvelope` |
| **責務** | 監査証跡。データ整合性検証。重複検知 |

## DuckDB の位置づけ

DuckDB は **normalized_records の派生キャッシュ** である。

```
normalized_records (IndexedDB)
  ↓ dataLoader.loadMonth()
DuckDB tables (in-memory + OPFS)
  ↓ queries/*.ts
SQL 集約結果
  ↓ hooks/duckdb/
UI
```

**鉄則:**
1. DuckDB が壊れても `rebuildFromIndexedDB()` で完全再構築可能
2. DuckDB のクエリ結果を IndexedDB に書き戻すことは禁止
3. UI が DuckDB に直接書き込むことは禁止
4. DuckDB は探索（読み取り専用）にのみ使用する

## data-flow.md の4段階との対応

| data-flow.md の段階 | 5層データモデル |
|---|---|
| 段階1: 組み合わせ | raw_data → normalized_records |
| 段階2: 計算 | normalized_records + settings → derived_metrics |
| 段階3: インデックス構築 | derived_metrics の構造化（StoreResult, キャッシュ） |
| 段階4: 動的フィルタ | DuckDB 探索 + hooks による絞り込み |

## バックアップ形式との対応

| BackupFile フィールド | 5層 |
|---|---|
| `months[].data` | normalized_records |
| `months[].importHistory` | metadata |
| `appSettings` | settings |
| `meta.checksum` | metadata |
| `rawManifest`（v3 候補） | raw_data（メタデータのみ） |
