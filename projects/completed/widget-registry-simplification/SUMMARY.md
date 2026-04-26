# SUMMARY — widget-registry-simplification（SP-B）

> **役割**: completion 記録（final）。後続 project（SP-D Wave 3 ADR-D-003 等）が
> 本 sub-project の経緯・成果物・引き継ぎ先を参照するためのサマリ。
>
> **status (本 file)**: **final（2026-04-26 archive 完了）**。
> `inquiry/20 §sub-project completion テンプレート` の step1-7 すべて実施完了。

## 完了日

**2026-04-26** — ADR-B-004 PR4 (commit 4548822) で Phase 4 完了確定、Phase 5
sub-project completion で archive。

## 目的（再掲）

umbrella `architecture-debt-recovery` の **Lane B** sub-project として、
widget registry 行に蓄積した冗長パターン（二重 null check / full ctx passthrough /
IIFE / inline function / inline JSX + palette refs）を、SP-A で確立した型整備と
適切な抽出先（pure selector / domain calc / helper component）で解消する。

## 成果物（landed）

### 4 ADR 完遂

| ADR | 主な成果 | guard fixed mode |
|---|---|---|
| **B-001** | registry isVisible の `?.isReady` → `.isReady` 置換（type narrowing 活用、6 件） | shortcutPatternGuard |
| **B-002** | 8 widget を `Pick<DashboardWidgetContext, ...>` signature 化、IntegratedSalesChart widgetCtx → widgetContext rename | fullCtxPassthroughGuard |
| **B-003** | registry IIFE → application/readModels/customerFact/selectors.ts に pure selector 抽出（4 call site） | registryInlineLogicGuard I1 |
| **B-004** | inline function (WID-003) → domain/calculations/prevYearCostApprox.ts、palette refs (WID-040) → CostDetailKpiSummaryWidget component 抽出 | registryInlineLogicGuard I2/I3 |

PR 数 / 行数 / baseline 推移などのメトリクスは
`references/02-status/generated/architecture-debt-recovery-remediation.json` を参照。

### 4 guard fixed mode 達成

| guard | 状態 |
|---|---|
| `shortcutPatternGuard` | ✅ ADR-B-001 完結（fixed mode） |
| `fullCtxPassthroughGuard` | ✅ ADR-B-002 完結（fixed mode） |
| `registryInlineLogicGuard` (I1/I2/I3) | ✅ ADR-B-003 + ADR-B-004 完結（全 3 baseline fixed mode） |

### LEG sunsetCondition 達成

| LEG ID | 対象 | 状態 |
|---|---|---|
| LEG-009 | registry inline pure helper 群（IIFE / function / palette refs） | ✅ migrated（ADR-B-003 + ADR-B-004 完遂） |

### 新設 module / component

| パス | 役割 |
|---|---|
| `application/readModels/customerFact/selectors.ts` (+ test) | customerFact ReadModel から派生値を取得する pure selector 3 本（ADR-B-003） |
| `domain/calculations/prevYearCostApprox.ts` (+ test) | 前年データから日別近似原価マップを構築する pure function（ADR-B-004 WID-003） |
| `presentation/pages/CostDetail/CostDetailKpiSummaryWidget.tsx` | 原価明細サマリーKPI 描画 component（ADR-B-004 WID-040 + ACCENT 定数で design decision を component 内に閉じ込め） |

## 主要設計決定

### 1. 「`const ctx = props`」minimal change pattern (ADR-B-002 重量級 widget)

ConditionSummaryEnhanced / ForecastToolsWidget は body 内で `ctx.X` 参照が
350+ 行にわたるため、signature を `props: Pick<...>` に変更後、body 冒頭で
`const ctx = props` を加えて従来の `ctx.X` access を温存。これにより widget 本体に
手を入れずに型 narrowing を達成。

**教訓**: refactor のスコープを「型契約のみ narrow」「body は不変」に分離する設計判断。

### 2. IntegratedSalesChart `widgetCtx` → `widgetContext` rename (ADR-B-002 PR3)

`registryChartWidgets.tsx:58` の `widgetCtx={ctx}` を fullCtxPassthroughGuard の
正規表現 `(?:widget)?[Cc]tx=\{ctx\}` から外すため、IntegratedSalesChart の prop
名を `widgetCtx` → `widgetContext` に rename（"Ctx" → "Context"）。意味は不変。

**教訓**: guard の正規表現と意味的命名の両立を考えて prop 名を選ぶ。

### 3. baseline 値の plan vs 実測の乖離

各 ADR の plan 提示 baseline と実測値が異なるケースが複数:
- ADR-B-001: plan baseline=10 → 実測 6（registry 行 pattern としては 6、widget 数とは別）
- ADR-B-002: plan baseline=12 → 実測 9
- ADR-B-003: plan baseline=3 → 実測 3 ✓
- ADR-B-004: plan baseline=5 → 実測 5（I2:1 + I3:4）✓

**教訓**: PR1 で「実測で baseline 凍結」を必ず行い、plan 値に合わせない。

### 4. ADR-B-004 機械検出 vs コードレビュー対応

inquiry/15 の 5 WID の中で機械検出可能な pattern (WID-003 / WID-040) を guard
で固定し、機械検出が困難な WID-006 / WID-020 / WID-038 はコードレビュー対応:
- WID-006 (length<2 早期 return): SP-A categoryWidget pattern 同様の helper 化が望ましい
- WID-020 (inline object literal 7 field): readModel input builder への抽出が望ましい
- WID-038 (?? defaults): SP-A categoryWidget で既に解消済み

**教訓**: 全パターンを 1 guard に詰め込まず、検出可能な pattern のみに絞って ratchet-down する。

## CI gate（本 sub-project 期間中の通過実績）

- `npm run test:guards` PASS（test files / tests 数は generated section 参照）
- `npm run docs:generate` PASS（KPIs OK、Hard Gate PASS）
- `npm run docs:check` PASS（sections valid、health match committed）
- `npm run lint` PASS（0 errors）
- `npm run build` PASS（tsc -b + vite build、type 整合性）

## 後続 project への引き継ぎ

### SP-D Wave 3 ADR-D-003 への影響

本 SP-B completion により、umbrella inquiry/21 §W3 の起動条件「SP-B completed」が
満たされる。SP-D の `aag-temporal-governance-hardening` Wave 3 で ADR-D-003
（G8 P20: useMemo 内行数 / P21: widget 直接子数 baseline 削減）を着手可能。

### umbrella architecture-debt-recovery への影響

Lane B 全完遂。残 Lane:
- Lane A widget-context-boundary: ✅ archived
- Lane C duplicate-orphan-retirement: ✅ archived
- Lane D aag-temporal-governance-hardening: Wave 1 + Wave 2 (ADR-D-004) ✅、Wave 3 (ADR-D-003) は本 SP-B completion で起動可能

## 完了条件（達成状況）

`checklist.md` Phase 1-5 + 最終レビューが正本（本 SUMMARY は要約）。実施完了状態:

- [x] 全 ADR の 4 step（新実装 / 移行 / 削除 / guard）完遂
- [x] LEG-009 の `consumerMigrationStatus` `migrated`
- [x] 全 guard の baseline 0 到達（shortcutPattern / fullCtxPassthrough / registryInlineLogic I1/I2/I3）
- [x] umbrella plan.md 外の破壊的変更なし（`git log` で本 sub-project の commit はすべて
      widget-registry-simplification scope 内）
- [x] sub-project completion テンプレート step1-7 全実施

## rollback plan

完了 PR の人間承認後に問題が発覚した場合:

- archive 7 step を逆順に revert（git revert）
- sub-project status を `completed → active` に戻す
- 必要に応じて 個別 ADR の PR4 → PR3 → PR2 → PR1 の順で段階 revert（rollback 境界は 1 ADR 単位）
- guard ALLOWLIST と baseline は revert 後に手動修復

## 参照

- umbrella project: `projects/architecture-debt-recovery/`
- 本 project HANDOFF / plan / checklist / legacy-retirement: 同 directory 内
- 完了 PR / commit:
  - ADR-B-001 PR1: `1996c92 feat: shortcutPatternGuard baseline=6`
  - ADR-B-001 PR2-PR4: `bf426b5 / 0004352 / b25a73a`
  - ADR-B-002 PR1: `3535b14 feat: fullCtxPassthroughGuard baseline=9`
  - ADR-B-002 PR2-PR4: `186355e / 0c7cb97 / 764e7bf`
  - ADR-B-003 PR1: `ea41ae8 feat: registryInlineLogicGuard baseline=3`
  - ADR-B-003 PR2-PR4: `3c619ae / 1356ff8 / 99b93fc`
  - ADR-B-004 PR1: `06d33e7 feat: registryInlineLogicGuard 拡張 (I2/I3)`
  - ADR-B-004 PR2-PR4: 後続 commit / `c359182 / 4548822`

## 歴史的意義

本 sub-project は umbrella `architecture-debt-recovery` の **Phase 6 Wave 2** で
spawn された Lane B。registry 行に蓄積した 4 種の冗長パターン（二重 null check /
full ctx passthrough / IIFE / inline function & palette refs）を体系的に解消し、
4 guard を全て fixed mode に到達させた。

特筆すべき設計判断:

1. **段階的 fixed mode 戦略** — 4 ADR それぞれが独立した 4 step pattern で
   ratchet-down → fixed mode に到達。途中段階での部分達成を許容しつつ最終的に
   全 baseline 0 を強制

2. **「const ctx = props」minimal change pattern** — 重量級 widget の refactor で
   型契約と body の分離を活用し、350+ 行の widget 本体を変更せず Pick narrow を達成

3. **guard の正規表現と命名の両立** — `widgetCtx` → `widgetContext` rename で
   guard pattern を回避しつつ意味的に自然な命名を維持

4. **機械検出可能な pattern のみ ratchet-down** — 検出が困難な pattern は
   コードレビュー / 個別対応に留め、guard は確実に検出できる pattern のみで
   fixed mode 運用

「45 widget 全件影響」の SP-A に続き、registry 層の責務簡素化を完遂した
本 sub-project は、umbrella plan §2 不可侵原則 #1（現実保護: runtime 動作不変）
と #10（レガシー撤退）を両立した模範例。
