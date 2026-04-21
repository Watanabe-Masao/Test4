# AI_CONTEXT — budget-achievement-simulator

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

予算達成シミュレーター（budget-achievement-simulator）

## Purpose

月内の任意の基準日を日別スライダーで動的に選択し、
「経過予算 / 経過実績 / 残期間必要売上 / 月末着地見込」を
リアルタイムに確認できる **予算達成シミュレーター** を新規実装する。

本 project は Claude Design（claude.ai/design）で作成した HTML プロトタイプ
`予算達成シミュレーター.html` を元に、
React 19 + TypeScript + styled-components の本体コードへ移植する。

### 達成したい業務価値

- 現時点（経過日数）の実績ペースから、**月末着地が予算に届くかを即判定**
- 残期間に必要な売上を「前年比」「予算達成率」「曜日別」の 3 モードでシミュレート
- 曜日パターン × 日別上書きで詳細な月末計画を組める
- 週別 / 曜日別 / 日別カレンダー / 日別棒グラフの多角的ドリルダウンで
  「なぜこの達成率なのか」を 1 画面で追える

## Read Order

1. 本ファイル
2. `HANDOFF.md`（残作業の優先順位）
3. `plan.md`（不可侵原則と Phase 構造）
4. `checklist.md`（completion 判定の入力 — required checkbox 集合）
5. デザイン原本（Claude Design handoff bundle）
6. 既存参考: `app/src/features/budget/ui/InsightTabBudget.tsx`
7. 既存参考: `app/src/domain/calculations/budgetAnalysis.ts`
8. 必要に応じて `references/03-guides/project-checklist-governance.md`

## Why this project exists

### 既存の「予算」機能とのギャップ

既存の `features/budget/` は **Insight ページ内の 1 タブ**（`InsightTabBudget.tsx`）として
実装されており、以下の性質を持つ:

- 日別実績データが揃っている前提で、既存の累積予実比較を表示する
- ユーザーが「基準日」を動的に変えるインタラクションは無い
- 残期間の必要売上をシミュレートする UI は無い
- 曜日別の傾向入力や日別上書きといった「計画立案」ユースケースをサポートしない

プロトタイプで検証された **予算達成シミュレーター** は、
「**月の途中で月末着地を意図的に操作するためのツール**」であり、
既存の予算タブとは利用目的が異なる。よって **新規縦スライス**
（`features/budget-simulator/`）として実装する。

### デザインプロトタイプの決定事項（chat transcript より）

- ④「着地見込」セクションに「残期間前年比 / 残期間予算達成率 / 曜日別」の
  3 モードトグルを置く
- 曜日別モードでは 7 曜日の係数 + 「実績曜日平均を自動入力」プリセット
- 日別カレンダーで、曜日別を継承しつつ任意の日を上書き可能
- 各 KPI 行は折りたたみ可能、ドリルダウン（週別・曜日別・日別カレンダー・日別棒グラフ）
- `localStorage` で基準日・週始まり曜日を保持

## Scope

含む:

- 新規ページ `/budget-simulator` の追加（PAGE_REGISTRY / routes / Nav への登録）
- `features/budget-simulator/` 縦スライス（application / ui / manifest）
- pure 計算関数（シナリオ構築 / KPI 計算 / 曜日別按分 / 月末着地予測）
- UI コンポーネント（スライダー、テーブル、ドリルダウン、日別カレンダー入力、棒グラフ）
- guard テスト / unit テスト / Storybook エントリ

含まない:

- 既存 `features/budget/` の `InsightTabBudget.tsx` の改変（別 feature として追加）
- 既存 `domain/calculations/budgetAnalysis.ts` の改変（再利用は可、改変は別 PR）
- WASM モジュール新設（本機能は pure TS 計算で完結可能）
- Excel/CSV インポート仕様の変更
- モバイル最適化（まずは desktop first。モバイル対応は後続 PR）
- 天気相関・カテゴリ分解との連携（着地シミュレーションは総売上単位）

## Project-Specific Constraints

- **既存 budget feature は変更しない**（別 feature として追加）
- **`domain/calculations/` の既存 pure 関数は改変しない**（再利用は可）
- **pure 計算責務再編（pure-calculation-reorg）と衝突しない**
  — 新規追加する pure 関数は `semanticClass` を明示し、Master Registry
  （`calculationCanonRegistry`）に登録する
- 色覚多様性（Wong palette）を使い、達成/未達の識別は形状・記号でも行う
- **既存 KpiCard / Chip / ChipGroup / DualPeriodSlider を再利用する**
  （プロトタイプの CSS をコピペせず、デザイントークン `presentation/theme/tokens.ts` に合わせる）

## Update Points

- status を変えたら `HANDOFF.md` と `checklist.md` を更新
- guard / allowlist を変えたら `cd app && npm run docs:generate`
- Phase を完了したら `HANDOFF.md` の「現在地」を更新

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `app/src/features/README.md` | features/ 縦スライスの構造ルール |
| `app/src/features/budget/` | 既存予算タブ（再利用パターンの参考） |
| `app/src/presentation/components/common/KpiCard.tsx` | 再利用する KPI カード |
| `app/src/domain/calculations/budgetAnalysis.ts` | 予算按分関連の既存 pure 関数 |
| `app/src/application/navigation/pageRegistry.ts` | ページ登録の正本 |
