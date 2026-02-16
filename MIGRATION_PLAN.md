# 仕入荒利モックアプリ 移行計画書（TypeScript + Rust）

## 1. 目的
- 単一HTMLに集約された UI / 取込 / 集計 / 出力ロジックを分離し、保守性を改善する。
- 変数名の混在、重複集計関数、多数のグローバル状態依存を段階的に解消する。
- 最終的に TypeScript フロントエンド + Rust API の構成へ移行し、監査可能な業務アプリへ進化させる。

## 2. 現状確認（今回の見直し）
- `DATA`, `STORES`, `SUPPLIERS`, `result` などグローバル可変状態が中心。
- 集計処理が `ensureAllAggregate` / `v9_ensureAllAggregate` / `ensureAllAggregateV19` と多重化。
- `window.*` への直接代入が多く、依存関係の見通しが悪い。
- 取込・UI・帳票・描画ロジックが1ファイル内で混在。

## 3. 修正方針（即効）
### 3.1 既存コードの安全修正（本コミットで対応）
- 「全店集計をどの関数で実行するか」を一本化する `ensureAllStoreAggregate()` を追加。
- `render()` とダッシュボード側再描画で同ヘルパーを利用し、集計関数選択の揺れを低減。

### 3.2 段階移行での実施事項
1. **構造分離**
   - `apps/web`（TypeScript）に UI/状態/ドメインを分離。
2. **型定義**
   - `Store`, `Supplier`, `DailyMetric`, `AggregateResult` を明示。
3. **命名統一**
   - `sid/sc/si/r/d` など短縮名を `storeId/supplierCode/rowData...` に統一。
4. **重複排除**
   - 全店集計は `buildAllStoreAggregate()` のみに集約。
5. **テスト追加**
   - 集計ロジックを pure function 化し fixture で回帰テスト。

## 4. 推奨アーキテクチャ

### 4.1 フロントエンド（TypeScript）
- Vite + TypeScript
- 状態管理: Zustand もしくは Redux Toolkit
- UI: 現行レイアウトを維持し段階的移植
- 主要モジュール:
  - `features/import`（CSV/XLSX 取込）
  - `domain/aggregate`（粗利・予算・移動集計）
  - `features/report`（帳票・Excel出力）

### 4.2 バックエンド（Rust）
- Axum + SQLx + PostgreSQL
- API候補:
  - `POST /imports` 取込
  - `POST /aggregate` 集計
  - `GET /reports/:id` 帳票取得
- 監査要件:
  - 誰が、いつ、どのファイルを取り込んだかを記録

## 5. マイルストーン
- **M1（1〜2週）**: TypeScript化基盤 + 画面分割 + 既存ロジック移設
- **M2（2〜3週）**: 集計関数統合 + 命名統一 + 単体テスト
- **M3（2週）**: Rust API導入（集計API先行）
- **M4（1〜2週）**: DB永続化 + 監査ログ + 本番運用準備

## 6. リスクと対策
- **リスク**: 集計結果差分（特に全店集計・値引き影響）
  - **対策**: 現行値をゴールデンデータ化し差分テストで監視
- **リスク**: UI移植時の仕様漏れ
  - **対策**: 画面単位でスナップショット比較

## 7. 完了条件（Definition of Done）
- 集計ロジック入口が単一であること。
- グローバル変数直接更新が禁止されていること。
- 主要業務KPI（売上、粗利、粗利率、予算達成、在庫推定）が回帰テストで一致すること。
- 移行手順書と運用手順書が揃っていること。
