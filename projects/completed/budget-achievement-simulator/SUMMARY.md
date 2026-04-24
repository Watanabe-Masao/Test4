# SUMMARY — budget-achievement-simulator

> 役割: completion 記録。後続 project が本 project の経緯・成果物・引き継ぎ先を参照するためのサマリ。

## 完了日

2026-04-23（architecture-debt-recovery Phase 5 承認と同日。Wave 0 切替 PR で archive）

## 目的（再掲）

月内の任意の基準日を日別スライダーで動的に選択し、「経過予算 / 経過実績 / 残期間必要売上 / 月末着地見込」をリアルタイムに確認できる **予算達成シミュレーター** を実装する。

当初の新規縦スライス `features/budget-simulator/` + 独立ページ `/budget-simulator` 方針を途中で撤回し、**既存 `features/budget/` 配下で動作する Insight widget** として再実装した（reboot）。

## 成果物（landed）

### 実装
- `features/budget/ui/BudgetSimulatorWidget.tsx` ほか Budget Simulator UI 群
- `components/day-detail/DayDetailModal` / `PeriodDetailModal`（shared 化）
- `domain/calculations/budgetSimulator.ts` の pure 計算再利用
- Dashboard 既存 widget `MonthlyCalendar` / `MonthlyCalendarFC` 撤去
- モック HTML `_.standalone.html` 削除

### ドキュメント
- `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` / `checklist.md`
- `aag/execution-overlay.ts`

## 後続引き継ぎ（umbrella project へ）

本 project の reboot 過程で表面化した widget 複雑化の構造的負債は、**umbrella project `architecture-debt-recovery`** が引き継いで体系的に解消する。

### 引き継ぎ先 umbrella

- project: `architecture-debt-recovery`
- 関係: `informed-by`（budget-achievement-simulator が起点の先行 project）
- 引き継ぎ確定の根拠: `projects/architecture-debt-recovery/inquiry/19-predecessor-project-transition.md`

### 具体的な cleanup 3 件の sub-project 引き継ぎ

| 後続 cleanup item | 引き継ぎ先 sub-project |
|---|---|
| `components/day-detail/` → Dashboard widget への上向き依存解消（`HourlyChart` / `DrilldownWaterfall` / `CategoryDrilldown` を absolute import している件） | SP-A widget-context-boundary（ADR-A-002 / 新 ADR-A-005 候補） |
| compat shim `Dashboard/widgets/DayDetailModal.styles.ts` 解消（`HourlyWeatherOverlay` / `HourlyYoYSummary` / `CategoryDrilldown` を新 path に直す） | SP-C duplicate-orphan-retirement（ADR-C-004 / LEG-015） |
| `RemainingInputPanel.tsx` / `DrilldownPanel.tsx` の分割（`responsibilityTag` baseline 削減） | SP-B widget-registry-simplification（ADR-B-003 / B-004） |

### 構造的負債 7 項目の引き継ぎ

`projects/architecture-debt-recovery/inquiry/07-complexity-hotspots.md §E` に整理した 7 項目（2 WidgetDef 型並存 / ctx 非対称 / registry 未登録検出不在 / 2 registry 系統 / pure 埋没 / byte-identical 複製 / G5 超過 + DOW 重複）は、umbrella の 4 sub-project（SP-A/B/C/D）で全 cover 確定（inquiry/19 §inquiry/07 §E 対応表）。

## archive 手順（Wave 0 切替 PR で実施、本 commit 時点）

本 project の archive は umbrella の `inquiry/20-current-project-switch-plan.md` に定義された 7 step で実施:

1. 本 SUMMARY.md を作成（本 file）
2. `config/project.json` の `status: "active" → "completed"`
3. `projects/budget-achievement-simulator/` を `projects/completed/budget-achievement-simulator/` に物理移動
4. `projects/architecture-debt-recovery/config/project.json` の `status: "draft" → "active"`
5. `CURRENT_PROJECT.md` を `architecture-debt-recovery` に切替
6. `references/02-status/open-issues.md` の active/archived 欄を更新
7. `projects/architecture-debt-recovery/HANDOFF.md §1` 現在地を同期

## 参照

- umbrella project: `projects/completed/architecture-debt-recovery/`（Phase 7 archive 後。本 archive 時点では `projects/architecture-debt-recovery/`）
- lineage 台帳: `projects/architecture-debt-recovery/AI_CONTEXT.md §Project Lineage`
- 引き継ぎ確定: `projects/architecture-debt-recovery/inquiry/19-predecessor-project-transition.md`
- 本 project の元 HANDOFF: `HANDOFF.md`（本 directory 内）
- 本 project の元 plan: `plan.md`（本 directory 内）

## 歴史的意義

本 project は「widget reboot」という具体的な新機能実装を通じて、**既存コードベース全体の構造的負債**（widget / ctx / pipeline / 責務分離）を surface させた。

本 project 単独では個別 refactor を行わず、**事実として negotiation せずに観察する姿勢**を守った結果、umbrella project（architecture-debt-recovery）の Phase 1-5 で:
- 9 inquiry ファイル（事実台帳）
- 20 仮説 + 4 共通構造源
- 8 原則候補（J1-J8）+ 12 不変条件候補 + 7 廃止候補
- 18 ADR 改修 item + 7 破壊的変更 + 15 legacy item + 4 sub-project
- 46 WSS widget spec（45 widget 現状把握）

という体系的な負債回収計画に発展した。

「個別対応で新機能を追加するだけでは負債は回収されない」「観察した事実を仕組みに変換することで再発が防がれる」という本プロジェクトの学びは、umbrella project の plan.md §2 不可侵原則 16 項と §10 運用規律に明文化されている。
