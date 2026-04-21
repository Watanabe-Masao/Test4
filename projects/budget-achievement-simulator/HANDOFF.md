# HANDOFF — budget-achievement-simulator

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 進行中。** Claude Design から export した HTML プロトタイプを元に、
新規 feature `budget-simulator` を立ち上げるための project 文脈ファイルを作成中。

**landed:**

- `projects/budget-achievement-simulator/` の project 文脈一式（本 PR）

**残り:**

- Phase 1〜5 の実装（本 PR の scope ではない）
- `CURRENT_PROJECT.md` の `active` 切替は **行わない**。本 project は先行登録のみで、
  現行 `pure-calculation-reorg` と並走しない。実装着手時に human が切替判断する。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先

- 本 PR（Phase 0）のレビューとマージ — project 文脈の承認
- Phase 1 着手の human 承認 — `CURRENT_PROJECT.md` の切替タイミング確認

### 中優先

- Phase 1: `domain/calculations/budgetSimulator.ts` の pure 関数実装 + unit テスト
- Phase 1: `calculationCanonRegistry` への登録
- Phase 2: application / VM 層の実装

### 低優先

- Phase 5: E2E とモバイル最適化（モバイルは後続 PR）

## 3. ハマりポイント

### 3.1. 既存 `features/budget/` を触らない

既存の `InsightTabBudget.tsx` は **Insight ページ内のタブ** として稼働中。
本 project は「独立したシミュレーター画面」を新規追加するもので、
既存タブとは別 feature として実装する。

**誤って既存の Budget タブを拡張すると:**

- Insight ページの既存レイアウトが壊れる
- guard テスト（`features/budget/manifest.ts` の `publicApi`）が FAIL する可能性

### 3.2. `domain/calculations/` の既存関数の再利用

既存 `budgetAnalysis.ts` の `prorateBudget` / `projectLinear` は本 feature でも
役立つが、**改変しない**。再利用するときは import のみ。

プロトタイプ `calc.js` の `buildScenario` はサンプルデータ生成のため pure 関数としては
不適切。本番ではアプリケーション層（DuckDB クエリの結果）から scenario を構築する。
`domain/` には KPI 計算のみを置く。

### 3.3. プロトタイプの CSS を直コピーしない

Claude Design の export 物（`budget-slider.css` / `table.css` / `App.jsx` の inline style）は
design token と独立した CSS 変数を使っている。本 project では必ず
`presentation/theme/tokens.ts` 経由で styled-components に変換する。

具体的には:

- `var(--c-primary)` → `palette.primary`
- `var(--bg3)` / `var(--fg2)` → `theme.semantic.surface.*` / `theme.semantic.text.*`
- `var(--sp-4)` → `theme.spacing.sp4`（または同等）

### 3.4. pure-calculation-reorg との衝突

現行 active project は `pure-calculation-reorg` で、`domain/calculations/` の再編中。
本 project が新規 pure 関数を追加するとき:

- **必ず `calculationCanonRegistry` に登録する**
- `semanticClass` を明示する（例: `analytic_aggregation` / `business_decision` など）
- pure-calculation-reorg の担当者と scope の整合を取る（本 project は「新規追加」で、
  既存再編には触らない）

### 3.5. ページ登録はメタデータ駆動

`routes.tsx` を手編集してはいけない。PAGE_REGISTRY の既存エントリを観察して、
それに倣う形で追加する（`id` / `pathPattern` / `kind` / `category` / `label` /
`icon` / `navVisible` 等）。`ViewType` にも追加が必要（`domain/models/PageMeta.ts`）。

### 3.6. localStorage キーの衝突

プロトタイプは `budget-sim-day` / `budget-sim-weekstart` を使っていた。
本番では feature スコープを明示して `budget-simulator:day` 等にする（`:`区切りに統一）。
既存アプリの localStorage 命名規則を確認すること。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | なぜこの project が必要か・scope 境界 |
| `plan.md` | 不可侵原則・Phase 構造・やってはいけないこと |
| `checklist.md` | Phase 別の完了条件 |
| `config/project.json` | project id / entrypoints |
| `aag/execution-overlay.ts` | ルール overlay（初期は空） |
| Claude Design handoff bundle | デザイン原本一式（本 PR には含めない） |
| `app/src/features/budget/` | 既存予算タブ（参考・**変更しない**） |
| `app/src/features/README.md` | feature 縦スライスの構造ルール |
| `references/03-guides/project-checklist-governance.md` | project 運用の正本ガイド |
