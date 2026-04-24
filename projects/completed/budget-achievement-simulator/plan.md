# plan — budget-achievement-simulator (widget reboot)

## 方針

本 project は、既存の途中実装を前提に継ぎ足すのではなく、**widget として再計画**する。
ただし、すでに成立している pure 計算資産は必要に応じて再利用する。
特に `budgetSimulator.ts` の `SimulatorScenario` / KPI 計算 / remaining 計算は、契約が安定しているため、**全面破棄ではなく再評価のうえ活用対象**とする。

本計画の主眼は次の 3 点である。

1. **HTML モックを見た目の基準として固定する**
2. **仮データで UI を先に widget 化する**
3. **取得経路は後から 1 本ずつ差し込む**

---

## 目的

予算達成シミュレーターを、既存 `features/budget/` 配下で動作する
**Insight widget** として再実装する。

この widget は、月内の任意基準日に対して

* 経過予算
* 経過実績
* 残期間必要売上
* 月末着地見込

を確認し、さらに

* 残期間前年比
* 残期間予算達成率
* 曜日別係数 + 日別上書き

による what-if シミュレーションを可能にする。

---

## 今回の決定事項

### 1. 正本は widget

本機能は **page ではなく widget** として実装する。
`/budget-simulator` の独立ページは今回のスコープから外す。

### 2. UI 先行

取得経路から作らない。
まずは **仮の `SimulatorScenario`** を固定し、UI を完成させる。

### 3. HTML は参照実装

アップロードされた HTML モックは見た目確認用の基準とするが、
その HTML/CSS をそのまま本体へ持ち込まない。
元 plan の「CSS/JSX の直コピー禁止」は維持する。

### 4. データ取得は adapter に閉じ込める

widget 本体は raw data source や `UnifiedWidgetContext` の shape を直接知らない。
取得経路は application 層の builder / adapter に隔離する。

---

## スコープ

### 含む

* `features/budget/` 内で動作する `BudgetSimulatorWidget`
* widget 用の UI 部品再設計
* 仮データでの Storybook / visual 固定
* scenario builder / source adapter の新設
* widget への段階的な実データ接続
* テストの再整理

### 含まない

* 独立ページ `/budget-simulator`
* `PAGE_REGISTRY` / `PageMeta` / `pageComponentMap` への登録
* 既存予算タブ全体の構造変更
* Excel/CSV インポート仕様変更
* モバイル最適化
* 本 widget 外への機能展開

---

## 不可侵原則

1. **widget 本体に取得ロジックを書かない。**
   UI は `SimulatorScenario` 相当の整形済み入力だけを受ける。

2. **HTML モックを production 実装として埋め込まない。**
   見本として参照し、styled-components / token ベースに変換する。

3. **既存 `domain/calculations/` の pure 関数は原則再利用し、安易に hook 内へ再実装しない。**
   `budgetSimulator.ts` はすでに scenario 契約と主要計算を持つため、再利用候補とする。

4. **データ取得差し替えは 1 レーンずつ行う。**
   UI と取得経路を同時に触らない。

5. **widget integration と visual completion を分離する。**
   見た目完成前に実データ最適化へ入らない。

---

## 目標アーキテクチャ

```text
features/budget/
  application/
    buildBudgetSimulatorSource.ts
    buildBudgetSimulatorScenario.ts
    useBudgetSimulatorWidgetPlan.ts
    mockBudgetSimulatorScenario.ts
  ui/
    BudgetSimulatorWidget.tsx
    BudgetSimulatorWidget.vm.ts
    BudgetSimulatorView.tsx
    TimelineSlider.tsx
    RemainingInputPanel.tsx
    DayCalendarInput.tsx
    DrilldownPanel.tsx
    ProjectionBarChart.tsx
    DailyBarChart.tsx
    StripChart.tsx
```

### 責務分割

* `mockBudgetSimulatorScenario.ts`
  UI 開発用の固定 fixture

* `buildBudgetSimulatorSource.ts`
  widget context / query result から必要データだけ抽出

* `buildBudgetSimulatorScenario.ts`
  source → `SimulatorScenario` 変換の pure builder

* `useBudgetSimulatorWidgetPlan.ts`
  adapter orchestration。取得経路の差し替え点

* `BudgetSimulatorView.tsx`
  表示専用。context を知らない

* `BudgetSimulatorWidget.tsx`
  widget entrypoint。plan hook と view を繋ぐだけ

---

## フェーズ計画

### Phase A: Reboot 文脈の正本化

既存 project 文書を、page 前提から widget 前提へ更新する。

**成果物**

* `AI_CONTEXT.md` 更新
* `plan.md` 更新
* `checklist.md` 更新
* `HANDOFF.md` 更新

**完了条件**

* 文書上の主方針がすべて widget に統一されている
* page 前提の未完タスクが scope 外または後続扱いに変更されている

---

### Phase B: UI 契約の固定

まず UI の入力契約を固定する。
取得経路は考えず、widget が何を受け取れば描けるかだけ決める。

**成果物**

* `SimulatorScenario` 再確認
* `BudgetSimulatorWidgetProps` / VM 入力型
* `mockBudgetSimulatorScenario.ts`

**完了条件**

* widget が実データなしで描画できる
* state と scenario の責務が分離されている

---

### Phase C: 見た目の再移植

HTML モックを見本に、UI を部品ごとに再整備する。
この段階ではデータはすべて mock。

**成果物**

* `BudgetSimulatorView.tsx`
* KPI header / slider / mode switch / input panel / table / drilldown の再整理
* 既存サブコンポーネントの残置 or 作り直し判定
* Storybook states の拡充

**完了条件**

* HTML モックと主要レイアウトが視覚的に一致する
* 代表状態を Storybook で確認できる
* visual baseline を固定できる

---

### Phase D: state 管理の接続

UI にローカル state を戻す。
ここではまだ mock scenario を使う。

**成果物**

* `useSimulatorState.ts` の再利用 or 軽修正
* mode / currentDay / dayOverrides / weekStart の接続
* state と UI のイベント整合

**完了条件**

* mock scenario で全操作が破綻なく動く
* local state による UI 崩れがない

---

### Phase E: source adapter の新設

ここで初めて取得経路へ入る。
widget context から必要値を取り出す adapter を作る。

**成果物**

* `buildBudgetSimulatorSource.ts`
* `buildBudgetSimulatorScenario.ts`
* `useBudgetSimulatorWidgetPlan.ts`

**完了条件**

* `BudgetSimulatorView` が raw context を知らない
* source と scenario の境界が固定される
* mock と実データが同一 view で差し替え可能

---

### Phase F: 段階的な実データ接続

取得経路を一気に載せず、下記順で差し込む。

1. 月次予算
2. 日別実績
3. 前年同月日別
4. 曜日別集計
5. 日別 override 反映後の projection

**完了条件**

* 各段階で fallback がある
* どの経路が未接続か明示できる
* データ欠損時の widget 表示方針が定義されている

---

### Phase G: widget 組込みの整理

`INSIGHT_WIDGETS` との接続、export、guard を整理する。
ただし view 側の責務は増やさない。

**成果物**

* widget barrel export 整理
* widget registration 見直し
* 依存方向チェック

**完了条件**

* 既存 budget widget 群の構造を壊さない
* widget 単体差し替えが可能

---

### Phase H: テストと仕上げ

**成果物**

* VM test
* hook test
* visual regression
* E2E 最小フロー
* health / build 確認

**完了条件**

* UI baseline が安定
* build / guard / health が通る
* 主要操作の回帰が防げる

---

## 作り直し時の扱い

### 破棄対象

* page 前提の文書
* view に acquisition を持たせる構造
* widget 内のその場変換ロジック
* raw context 直読みの表示ロジック

### 再利用対象

* `budgetSimulator.ts` の pure 計算群
* `calculationCanonRegistry` 上の登録資産
* state hook の考え方
* 既存 subcomponent のうち見た目と責務が適切なもの
* Storybook 資産の一部

---

## リスク

### 1. widget なのに page 設計が混ざる

これは現行 project で実際に起きている。
元の AI_CONTEXT / plan は新規縦スライス + page 前提だったが、checklist は widget embed に移っている。
今回の再計画ではこれを解消する。

### 2. HTML をそのまま使いたくなる

禁止。見本としてのみ使う。

### 3. UI 完成前に取得経路へ行ってしまう

見た目の不具合とデータ不具合の切り分けができなくなる。

### 4. 既存 pure 計算まで捨てる

`budgetSimulator.ts` はすでに型契約と計算の骨格を持っている。
ここを無条件に捨てると、逆に工数が増える。

---

## 完了の定義

本 reboot 計画の完了は、次を満たした時点とする。

* widget として visual / interaction が成立している
* 実データ接続が adapter 経由に閉じ込められている
* view が raw context を読まない
* mock / real の切替が可能
* 既存 budget への副作用がない
* build / guard / visual / 主要 E2E が通る

---

## 今回の判断

今回の project は「全部捨てる」より、
**文書・統合方式を捨てて、計算資産と一部 UI 部品を残す**のが合理的。

特に既存正本の

* AI_CONTEXT は widget ではなく page 前提
* plan も page / vertical slice 前提
* checklist は途中で widget embed に変更済み

という不整合を、まず文書から解消すべき。
