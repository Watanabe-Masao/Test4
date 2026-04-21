# plan — budget-achievement-simulator

## 不可侵原則

1. **既存 `features/budget/` を改変しない。** 本 project は新規縦スライス
   `features/budget-simulator/` として追加する。既存予算タブのユーザーに影響を与えない。
2. **`domain/calculations/` の既存 pure 関数は改変しない。** 再利用は可。
   新規追加する計算ロジックは新規ファイル（`budgetSimulator.ts` など）に置き、
   `calculationCanonRegistry` に登録する。
3. **ページ登録は PAGE_REGISTRY（`application/navigation/pageRegistry.ts`）経由**で行う。
   `routes.tsx` を手編集しない。メタデータ駆動の原則を守る。
4. **プロトタイプの CSS/JSX をそのままコピーしない。** 色・スペーシング・フォントは
   `presentation/theme/tokens.ts` のデザイントークンに変換する。
   styled-components で記述し、`index.html` に直書きされた CSS は持ち込まない。
5. **既存 UI プリミティブを優先的に再利用する**（KpiCard / Chip / ChipGroup /
   Card / CardTitle / DualPeriodSlider）。独自に作るのはプロトタイプ固有の
   コンポーネントのみ（TimelineSlider / DayCalendarInput / ProjectionBarChart など）。

## Phase 構造

### Phase 0: プロトタイプの持ち込み（完了判定: 本 PR マージ時点）

本 project 立ち上げ時の文脈ファイル一式を作成する。

**完了条件:**

- `projects/budget-achievement-simulator/` 配下に AI_CONTEXT / HANDOFF / plan /
  checklist / config/project.json / aag/execution-overlay.ts が揃っている
- `CURRENT_PROJECT.md` の active 切り替えは **行わない**（pure-calculation-reorg を
  継続）。本 project は待機状態で登録する

### Phase 1: Pure 計算 Domain 層

プロトタイプ `calc.js` 相当の計算ロジックを pure TypeScript 関数として `domain/calculations/`
配下に実装する。

**成果物:**

- `app/src/domain/calculations/budgetSimulator.ts`
  - `computeSimulatorKpis(scenario, currentDay): SimulatorKpis`
  - `computeRemainingByYoy(remLY, yoyPct)`
  - `computeRemainingByAchievement(remBudget, achPct)`
  - `computeRemainingByDow(base, dowFactors, dayOverrides, currentDay, daysInMonth)`
  - `computeProjectedLanding(elapsedActual, remainingSales)`
  - `aggregateDowAverages(data, compare, year, month, rangeStart, rangeEnd)`
  - `aggregateWeeks(data, compare, year, month, rangeStart, rangeEnd, weekStart)`
- `app/src/domain/calculations/__tests__/budgetSimulator.test.ts`
  - 不変条件（elapsedDays === 0 の端、daysInMonth = elapsedDays の端など）
  - YoY / achievement / dow 各モードの出力が整合する
  - dayOverrides が dow を上書きする
- `calculationCanonRegistry` に追加（`semanticClass` を明示）

**完了条件:**

- unit テストが PASS
- `npm run lint` / `npm run format:check` が PASS
- guard テスト（`test:guards`）が PASS

### Phase 2: Application 層 — ViewModel / Hooks

プロトタイプ `App.jsx` の useState/useMemo を React 非依存の VM 関数 + React hook に
分離する。Presentation VM は domain のみに依存し、application には依存しない
（既存の `InsightTabBudget.vm.ts` と同じ方針）。

**成果物:**

- `app/src/features/budget-simulator/application/useSimulatorState.ts`
  - `currentDay` / `mode` / `yoyInput` / `achInput` / `dowInputs` / `dayOverrides` /
    `weekStart` の状態管理と `localStorage` 連携
- `app/src/features/budget-simulator/application/useSimulatorScenario.ts`
  - データソース（DuckDB）から scenario を構築するアプリケーションサービス
- `app/src/features/budget-simulator/ui/BudgetSimulatorPage.vm.ts`
  - 表の行データを構築（純関数）
  - `domain/calculations/budgetSimulator.ts` をラップして UI 形式に変換
- `app/src/features/budget-simulator/ui/BudgetSimulatorPage.vm.test.ts`

**完了条件:**

- VM テストが PASS
- hook のテスト（`@testing-library/react`）が PASS

### Phase 3: Presentation 層 — ページ + サブコンポーネント

styled-components でサブコンポーネントを実装し、ページを組み立てる。

**成果物:**

- `app/src/features/budget-simulator/ui/BudgetSimulatorPage.tsx` — ルートページ
- `app/src/features/budget-simulator/ui/TimelineSlider.tsx` — 基準日スライダー
- `app/src/features/budget-simulator/ui/KpiTable.tsx` — ①〜④ の行テーブル
- `app/src/features/budget-simulator/ui/StripChart.tsx` — 日次ストリップ
- `app/src/features/budget-simulator/ui/DrilldownPanel.tsx` — 週別/曜日別/日別
- `app/src/features/budget-simulator/ui/DailyBarChart.tsx` — 棒グラフ + MA
- `app/src/features/budget-simulator/ui/ProjectionBarChart.tsx` — ④用予測棒グラフ
- `app/src/features/budget-simulator/ui/DrillCalendar.tsx` — ドリル用カレンダー
- `app/src/features/budget-simulator/ui/DayCalendarInput.tsx` — 日別入力カレンダー
- `app/src/features/budget-simulator/ui/RemainingInputPanel.tsx` — ④入力部
- 各コンポーネントに `*.styles.ts` を分離
- `app/src/features/budget-simulator/index.ts` — public API
- `app/src/features/budget-simulator/manifest.ts` — ownership manifest
- `app/src/stories/BudgetSimulator.stories.tsx` — Storybook エントリ

**完了条件:**

- 全コンポーネントが Storybook でレンダリングされる
- `npm run test:visual` が PASS
- ECharts は使わずに SVG + CSS で描画（プロトタイプの実装と同じ方針）

### Phase 4: 組込み — PAGE_REGISTRY / Nav / routes

**成果物:**

- `app/src/application/navigation/pageRegistry.ts` に `budget-simulator` エントリ追加
- `app/src/domain/models/PageMeta.ts` の ViewType に `budget-simulator` 追加
- `app/src/presentation/pageComponentMap.ts` に lazy import 追加
- `app/src/features/budget-simulator/index.ts` から `BudgetSimulatorPage` を re-export
- ナビ / キーボードショートカット / ブレッドクラムは PAGE_REGISTRY から自動生成される

**完了条件:**

- `/budget-simulator` にアクセスして画面が描画される
- Nav にメニューアイテムが出る
- `npm run test:guards` の `pageMetaGuard` が PASS

### Phase 5: E2E + Health + 仕上げ

**成果物:**

- `app/e2e/budget-simulator.spec.ts` — スライダー操作・モード切替・日別上書きの
  主要フロー
- `references/02-status/features-migration-status.md` に本 feature を追加
- `cd app && npm run docs:generate` を実行、project-health に
  `budget-achievement-simulator` が現れる
- CHANGELOG.md 更新

**完了条件:**

- E2E が PASS
- `npm run health:check` が warning なしで通る
- `npm run build` が成功

### Phase 6: 最終レビュー (人間承認)

機能的な Phase 1〜5 がすべて [x] になった後、人間がレビューして承認する。

## やってはいけないこと

- **既存 `features/budget/` を改変する** → 業務利用中の予算タブに回帰を起こすため禁止
- **プロトタイプの CSS を `index.html` や `public/` に直置きする** → デザイントークンと
  乖離し、ダーク/ライトテーマ切替が壊れるため禁止
- **React CDN + Babel standalone のまま持ち込む** → プロダクションビルドから外れる
- **pure 計算関数を hook 内で直接書く** → テスト不能になるため禁止。必ず domain/ に置く
- **`routes.tsx` を直接編集する** → PAGE_REGISTRY 駆動の原則を壊す
- **`calculationCanonRegistry` に登録せずに新 pure 関数を追加する** → guard テストで
  FAIL する

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/features/budget-simulator/` | 本 project の新規 feature |
| `app/src/domain/calculations/budgetSimulator.ts` | 新規 pure 計算 |
| `app/src/application/navigation/pageRegistry.ts` | ページ登録（追加） |
| `app/src/presentation/pageComponentMap.ts` | lazy import（追加） |
| `app/src/domain/models/PageMeta.ts` | ViewType 拡張（追加） |
| `app/src/features/budget/` | 既存予算タブ（**変更しない**、参考元） |
| `app/src/domain/calculations/budgetAnalysis.ts` | 既存按分ロジック（**変更しない**、再利用） |
| `app/src/presentation/theme/tokens.ts` | デザイントークン（参照のみ） |
