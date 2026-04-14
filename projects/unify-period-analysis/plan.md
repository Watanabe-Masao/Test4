# plan — unify-period-analysis

## 不可侵原則

1. **UI は統合、内部契約は分離** — 固定期間ヘッダはそのまま残し、内部で
   `FreePeriodAnalysisFrame` に変換する。`StoreResult` 系と `FreePeriodReadModel`
   系を無理に同一化しない。
2. **取得経路は `readFreePeriodFact()` のみ** — 自由期間データの取得を他の
   クエリや直接 SQL から行わない（`free-period-analysis-definition.md` 準拠）。
3. **比較先解決は `ComparisonScope` のみ** — presentation 層・ViewModel・
   chart component が比較先日付を独自計算してはならない。
4. **額で持ち回し、率は domain/calculations で算出** — SQL / VM / presentation
   で discountRate / gpRate / markupRate を直計算しない
   （`data-pipeline-integrity.md` 準拠）。
5. **UI 載せ替えより先に契約固定** — Phase 1→2→3 の順序を飛ばさない。
   比較意味論と取得経路が固まる前に画面を触らない。

## Phase 構造

### Phase 0: 現状棚卸し

既存コードで次を棚卸しする:
- 比較先日付を presentation / VM / chart で独自計算している箇所
- `readFreePeriodFact()` 以外の自由期間取得経路
- SQL 内で rate を計算している箇所
- `HeaderFilterState` を直接読んでいる hook / component

完了条件: 対象ファイル一覧と件数が checklist で固定されている。

### Phase 1: 入力契約統一

`HeaderFilterState → FreePeriodAnalysisFrame` adapter を 1 箇所に実装。
画面内部は frame ベースに切り替え、ヘッダ状態の直接参照を禁止する。

完了条件: 固定期間画面の query が frame 経由で動く。比較系 hook の入口が
frame で統一される。

### Phase 2: 比較解決一本化

比較先期間解決を `ComparisonScope` resolver に集約。`sameDate` / `sameDow` /
`previousPeriod` / `sameRangeLastYear` を resolver で解く。
provenance（mappingKind / fallbackApplied / sourceDate / comparisonRange /
confidence）を比較出力に付与する。

完了条件: presentation 層に比較先解決ロジックが残っていない。比較結果に
provenance が載っている。

### Phase 3: 自由期間データレーン完成

`freePeriodHandler` / `readFreePeriodFact()` / `computeFreePeriodSummary()` /
`FreePeriodReadModel` を唯一の経路として固定する。UI 載せ替え前に、この
データレーンを先に完成させる。

完了条件: 自由期間取得・集計が 1 経路に統一されている。ガードが他経路を
遮断する。

### Phase 4: 率計算・集約責務整理

SQL は額のみ返す。rate 計算は domain/calculations に寄せる。同一集約の
SQL / JS 二重実装を排除する。

完了条件: free-period 系 SQL に rate 計算がない。VM / Presentation で率を
直計算していない。

### Phase 5: ViewModel / chart 薄化

`FreePeriodReadModel → ViewModel → Chart` の三段に分ける。chart が raw query
結果を直接解釈しない。option builder と data builder を分離する。

完了条件: chart component が raw rows や frame を直接解釈していない。

### Phase 6: 段階的画面載せ替え

次の順で既存画面を新レーンに載せ替える:
1. 比較ヘッダ周辺
2. 期間サマリー系
3. 売上比較 chart
4. 時間帯比較
5. 仕入 / 原価比較
6. 天気連動比較

固定期間画面を free-period preset として動かし、自由期間 picker は後から
追加する。

完了条件: 対象画面の内部レーンが統一されている。

## やってはいけないこと

- **UI 先行移行** → 比較意味論が漏れて事故が増える。Phase 1→2→3 を先に完了する。
- **`StoreResult` と `FreePeriodReadModel` の強制統合** → 単月確定値と自由期間
  分析は意味論が別。非スコープ。
- **presentation / VM / chart での比較先日付計算** → `ComparisonScope` resolver
  の外で解くと二重定義になる。
- **SQL 内での rate 計算** → `data-pipeline-integrity.md` で禁止。
- **raw rows を chart に直接渡す** → `FreePeriodReadModel` → VM を経由する。
- **ガードなしの新経路追加** → 新しい取得経路・比較経路を作ったらガードを
  同時に追加する。

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/application/readModels/freePeriod/` | 自由期間 ReadModel（取得・集計の正本） |
| `app/src/application/hooks/useFreePeriodAnalysis.ts` | 自由期間分析の標準入口 |
| `app/src/application/queries/freePeriodHandler.ts` | 取得 orchestration |
| `app/src/domain/calculations/` | 率計算の正本（SQL から剥がす先） |
| `app/src/test/guards/freePeriodPathGuard.test.ts` | 取得経路ガード |
| `app/src/test/guards/comparisonScopeGuard.test.ts` | 比較先解決ガード |
