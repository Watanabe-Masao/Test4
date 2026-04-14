# HANDOFF — unify-period-analysis

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

project ディレクトリを bootstrap した段階。`AI_CONTEXT.md` / `plan.md` /
`checklist.md` / `config/project.json` を作成済み。実装・ガード追加は未着手。
既存コードの棚卸し（Phase 0）が次の作業。

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先

- Phase 0 棚卸し: 比較先日付の独自計算箇所、`readFreePeriodFact()` 以外の
  自由期間取得経路、SQL 内の rate 計算、`HeaderFilterState` 直接参照の 4 点。
- Phase 1: `HeaderFilterState → FreePeriodAnalysisFrame` adapter 設計。

### 中優先

- Phase 2: `ComparisonScope` resolver への比較先解決集約。
- Phase 3: 自由期間データレーン（handler / readFact / summary / readModel）固定。

### 低優先

- Phase 5 以降: ViewModel / chart の薄化と画面段階載せ替え。

## 3. ハマりポイント

### 3.1. UI 先行移行の誘惑

自由期間 picker を先に作って固定期間画面を後で統合したくなるが、
比較意味論と取得経路が固まる前に UI を触ると、比較先解決や集約ロジックが
presentation 層に漏れて後から剥がせなくなる。**Phase 1→2→3 の順を崩さない**。

### 3.2. StoreResult との強制統合

`StoreResult`（単月確定値）と `FreePeriodReadModel`（自由期間分析）は
意味論が別系統（business-authoritative vs analytic-authoritative）。
統合を試みると正本化体系が崩れる。**UI 統合だけを目標とする**。

### 3.3. SQL 内 rate 計算

自由期間集計で rate を SQL 側で計算すると短期的には楽だが、
`data-pipeline-integrity.md` の「額で持ち回し、率は使用直前に
domain/calculations で算出」原則に反する。Phase 4 で必ず剥がす。

### 3.4. 比較先日付の散在

既存コードでは比較先日付（前年同日・前期・同曜日など）を
chart / VM / hook / component の複数箇所で独自計算している可能性が高い。
Phase 0 の棚卸しで場所と件数を固定してから Phase 2 に進む。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project の why / scope / read order |
| `plan.md` | 不可侵原則と Phase 構造 |
| `checklist.md` | 完了判定の入力 |
| `references/01-principles/free-period-analysis-definition.md` | 自由期間分析の正本定義 |
| `references/01-principles/data-pipeline-integrity.md` | 額 / 率の分離原則 |
| `references/03-guides/runtime-data-path.md` | 正本 lane / Screen Plan lane |
