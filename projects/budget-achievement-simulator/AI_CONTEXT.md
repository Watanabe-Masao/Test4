# AI_CONTEXT — budget-achievement-simulator (widget reboot)

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

予算達成シミュレーター（budget-achievement-simulator）

## Purpose

月内の任意の基準日を日別スライダーで動的に選択し、
「経過予算 / 経過実績 / 残期間必要売上 / 月末着地見込」を
リアルタイムに確認できる **予算達成シミュレーター** を実装する。

本 project は当初、新規縦スライス `features/budget-simulator/` + 独立ページ
`/budget-simulator` を想定していたが、途中方針変更により
**既存 `features/budget/` 配下で動作する Insight widget** として再実装する方針に統一した
（reboot）。HTML モックは見た目確認用の基準として参照するが、production 実装として
埋め込まない。

### 達成したい業務価値

- 現時点（経過日数）の実績ペースから、**月末着地が予算に届くかを即判定**
- 残期間に必要な売上を「前年比」「予算達成率」「曜日別」の 3 モードでシミュレート
- 曜日パターン × 日別上書きで詳細な月末計画を組める
- 週別 / 曜日別 / 日別カレンダー / 日別棒グラフの多角的ドリルダウンで
  「なぜこの達成率なのか」を 1 画面で追える

## Reboot 方針（現行の正本）

1. **正本は widget** — page ではなく widget として実装。`/budget-simulator` の独立ページは
   スコープ外
2. **UI 先行** — 取得経路から作らない。まずは仮の `SimulatorScenario` を固定し、
   UI を完成させる
3. **HTML モックは参照実装のみ** — そのまま持ち込まず、styled-components / デザイン
   トークン経由で再構築する
4. **取得経路は adapter に閉じ込める** — widget 本体は raw data / `UnifiedWidgetContext`
   の shape を直接知らない。取得は application 層の builder / adapter に隔離する
5. **計算資産は再利用** — `budgetSimulator.ts`（`SimulatorScenario` / KPI 計算 /
   remaining 計算）は契約が安定しているため活用対象

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地・次の作業・ハマりポイント）
3. `plan.md`（不可侵原則・Phase A〜H 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. HTML モック（`_.standalone.html`）— 見た目の基準としてのみ参照
6. 既存参考: `app/src/features/budget/ui/BudgetSimulatorWidget.tsx`（現行 widget）
7. 既存参考: `app/src/domain/calculations/budgetSimulator.ts`（再利用する pure 計算）

## Why this project exists

### 既存の「予算」機能とのギャップ

既存の `features/budget/` は **Insight ページ内の 1 タブ**（`InsightTabBudget.tsx`）
および関連 widget 群として実装されているが、以下の性質を持つ:

- 日別実績データが揃っている前提で、既存の累積予実比較を表示する
- ユーザーが「基準日」を動的に変えるインタラクションは無い
- 残期間の必要売上をシミュレートする UI は無い
- 曜日別の傾向入力や日別上書きといった「計画立案」ユースケースをサポートしない

プロトタイプで検証された **予算達成シミュレーター** は、
「**月の途中で月末着地を意図的に操作するためのツール**」であり、
既存タブとは利用目的が異なる。ただし **独立画面ではなく、Insight 系 widget として
embed する**ことで、既存の期間・店舗コンテキストを継承しつつ、
page 新設に伴う nav / routes の肥大を回避する。

### デザインプロトタイプの決定事項

- ④「着地見込」セクションに「残期間前年比 / 残期間予算達成率 / 曜日別」の
  3 モードトグル
- 曜日別モードでは 7 曜日の係数 + 「実績曜日平均を自動入力」プリセット
- 日別カレンダーで、曜日別を継承しつつ任意の日を上書き可能
- 各 KPI 行は折りたたみ可能、ドリルダウン（週別・曜日別・日別カレンダー・日別棒グラフ）
- `localStorage` で基準日・週始まり曜日を保持

## Scope

### 含む

- `features/budget/` 内で動作する `BudgetSimulatorWidget`
- widget 用の UI 部品再設計（見た目は HTML モック準拠）
- 仮データでの Storybook / visual 固定
- scenario builder / source adapter の新設（`buildBudgetSimulatorSource` /
  `buildBudgetSimulatorScenario` / `useBudgetSimulatorWidgetPlan`）
- widget への段階的な実データ接続
- テストの再整理（VM test / hook test / visual / 主要 E2E）

### 含まない

- 独立ページ `/budget-simulator`
- `PAGE_REGISTRY` / `PageMeta` / `pageComponentMap` への登録
- 既存予算タブ全体の構造変更
- Excel/CSV インポート仕様の変更
- モバイル最適化（まずは desktop first）
- 天気相関・カテゴリ分解との連携

## Project-Specific Constraints

- **widget 本体に取得ロジックを書かない** — UI は `SimulatorScenario` 相当の
  整形済み入力だけを受ける
- **HTML モックを production 実装として埋め込まない** — 見本として参照し、
  styled-components / デザイントークン経由で再構築する
- **既存 `domain/calculations/` の pure 関数は原則再利用し、安易に hook 内へ
  再実装しない** — `budgetSimulator.ts` は scenario 契約と主要計算を保持
- **データ取得差し替えは 1 レーンずつ行う** — UI と取得経路を同時に触らない
- **widget integration と visual completion を分離する** — 見た目完成前に
  実データ最適化へ入らない
- **色覚多様性（Wong palette）を使い、達成/未達の識別は形状・記号でも行う**
- **既存 UI プリミティブを再利用する**（`KpiCard` / `Chip` / `ChipGroup` /
  `Card` / `CardTitle`）

## Update Points

- status / Phase を変えたら `HANDOFF.md` と `checklist.md` を更新
- guard / allowlist を変えたら `cd app && npm run docs:generate`
- Phase を完了したら `HANDOFF.md` の「現在地」を更新
- 計画方針を変えたら `plan.md` を更新（checklist.md と HANDOFF.md の
  `現在地` に波及）

## 関連文書

| 文書 | 役割 |
|---|---|
| `plan.md` | widget reboot 方針・Phase A〜H 構造・不可侵原則 |
| `HANDOFF.md` | 現在地・次の作業・ハマりポイント |
| `checklist.md` | Phase A〜H 別の completion checkbox 集合 |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `app/src/features/budget/` | widget embed 先の既存 feature |
| `app/src/domain/calculations/budgetSimulator.ts` | 再利用する pure 計算群 |
| `app/src/test/calculationCanonRegistry.ts` | 新規 pure 関数登録先 |
