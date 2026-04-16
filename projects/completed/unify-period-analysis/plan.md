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
- `PeriodSelection` / `usePeriodSelectionStore` を直接読んでいる hook / component

完了条件: 対象ファイル一覧と件数が checklist で固定されている。

**Phase 0 補記（2026-04-14 完了）:**

- 固定期間ヘッダ状態の正体は `PeriodSelection`（`app/src/domain/models/PeriodSelection.ts`）であり、store は `usePeriodSelectionStore`。Phase 初期に想定していた `HeaderFilterState` は実在しない仮名だった
- `PeriodSelection → FreePeriodAnalysisFrame` adapter は既に `app/src/domain/models/buildFreePeriodFrame.ts` に実装されている
- `useFreePeriodAnalysisBundle`（1 frame → 3 readModel）も既に `app/src/application/hooks/useFreePeriodAnalysisBundle.ts` に実装されている
- しかし上記 2 つは実コードから呼ばれておらず（ガードテストからの参照のみ）、実際の固定期間画面は `useUnifiedWidgetContext` 内で `usePeriodSelectionStore` を直接 read してバラで slice 群に渡している
- 結論: Phase 1 は「adapter を作る」ではなく「既存 adapter を既存画面に配線する」+「他経路を禁止する」が本質

### Phase 1: 入力契約統一（配線）

実体である `PeriodSelection` を起点に、既存の `buildFreePeriodFrame` +
`useFreePeriodAnalysisBundle` を経由する経路に画面を切り替える。presentation
から `usePeriodSelectionStore` の直接参照を禁止する。

**入口の確定:**

| 旧仮名 | 実体 | パス |
|---|---|---|
| `HeaderFilterState` | `PeriodSelection` | `app/src/domain/models/PeriodSelection.ts` |
| `useHeaderFilterState` | `usePeriodSelectionStore` | `app/src/application/stores/periodSelectionStore.ts` |
| `HeaderFilterState → FreePeriodAnalysisFrame` adapter | `buildFreePeriodFrame` | `app/src/domain/models/buildFreePeriodFrame.ts`（既存） |
| frame bundle hook | `useFreePeriodAnalysisBundle` | `app/src/application/hooks/useFreePeriodAnalysisBundle.ts`（既存） |
| 現行の迂回経路 | `useUnifiedWidgetContext` が `usePeriodSelectionStore` を直接 read | `app/src/presentation/hooks/useUnifiedWidgetContext.ts:60` |

**完了条件:**

- `useUnifiedWidgetContext` が `buildFreePeriodFrame` → `useFreePeriodAnalysisBundle` を経由する
- presentation 配下から `usePeriodSelectionStore` への直接 import が 0 件
- 比較系 hook（`useComparisonSlice` 等）の入口が `FreePeriodAnalysisFrame.comparison` を受け取る形になっている
- `buildFreePeriodFrame` 以外の frame 生成経路が禁止ガードで塞がれている

### Phase 2: 比較解決一本化

比較先期間解決を `ComparisonScope` resolver に集約。`sameDate` / `sameDow` /
`previousPeriod` / `sameRangeLastYear` を resolver で解く。
provenance（mappingKind / fallbackApplied / sourceDate / comparisonRange /
confidence）を比較出力に付与する。

完了条件: presentation 層に比較先解決ロジックが残っていない。比較結果に
provenance が載っている。

### Phase 3: 自由期間データレーンの明文化とガード化

**Phase 0 補記（2026-04-14 完了）で実態が判明済み:**

自由期間の取得経路は既に `freePeriodHandler` / `readFreePeriodFact()` /
`computeFreePeriodSummary()` / `FreePeriodReadModel` の canonical な 1 経路に
収束している（`inventory/02-non-handler-free-period-access.md` 参照、該当 0 件）。
したがって Phase 3 の実作業は「実装コードの移行」ではなく次に縮退する:

- canonical 経路を状態として明文化する（本 plan + architectureRules + read model 定義書の文言）
- 他経路を将来的に塞ぐための G3 ガード（`freePeriodHandlerOnly` /
  `noRawFreePeriodRowsToPresentation`）を追加する
- 新規 handler / readFact 追加時に経路を逸脱しないことを機械的に保証する

完了条件: G3 ガード 2 本が green で CI 常駐し、canonical 経路以外を追加しようと
すると即座に fail する。実装コードの変更は不要（または純粋な documentation のみ）。

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

## Critical Path Acceptance Suite（横串の受け入れテスト層）

PR 1〜5 の実装順計画とは別に、`DB → handler → summary → read model → VM`
を通した意味の整合性を監視する受け入れテスト層を追加する。詳細は
`acceptance-suite.md` を参照。

- 固定期間 preset と自由期間 frame の両方から、同じ代表 5 ケースを流し込む
- frame / rows / summary / provenance / fallback を固定で比較する
- PR 0（事前）として骨格を先に入れ、PR 1〜5 の各段階で期待値を拡張する
- Tier A（自由期間）/ Tier B（比較意味論）の critical path safety map 準拠

## テスト計画（G0〜G6 + L0〜L4）

AAG 連結前提の最終形テスト計画は `test-plan.md` に独立して定義する。

- **G0〜G6**: ガードテスト群（AAG 連結 / 入力契約 / 比較意味論 / 取得経路 /
  率計算 / readModel 安全 / UI 境界）— 既存 5 本 + 追加 19 本 = 計 24 本
- **L0〜L4**: ロジック正しさテスト群（純粋関数 / handler 統合 / acceptance /
  property / regression）— 21 本
- **CI 実行順**: Fast lane（G0-G3, G5, L0）→ Medium lane（L1, G4, G6）→
  Slow lane（L2-L4）
- **Done の定義**: `test-plan.md §4` を参照

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
