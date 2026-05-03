# Safety-First Architecture 改善計画

> **目的:** ルール違反を検知する仕組みから、危険な形に入りにくい構造への移行。
>
> **関連文書:**
> - `references/01-foundation/critical-path-safety-map.md` — Safety Tier 分類
> - `references/01-foundation/modular-monolith-evolution.md` — 4層 × 縦スライスのモジュラーモノリス進化計画

## 改善の3本柱

| 柱 | 要点 |
|---|---|
| **構造安全** | 責務境界・依存方向・context・runtime・persistence を整理し、壊れ方を限定する |
| **アルゴリズム安全** | 比較・集計・日付・fallback・canonicalization を「誤っても静かにズレない」形にする |
| **運用安全** | WASM・DuckDB・復旧・後方互換を「止まっても復元できる」形にする |

---

## 現在の問題

### A. 構造状態の正本が揺れている

`architectureStateAudit.test.ts` は監査出力を構造状態の正本に置くと明記しているが、
周辺文書には古い件数説明や移行状況が残っている。改善計画の土台としては不安定。

### B. Application 層が runtime を抱えている — **解消済み**

`application/runtime-adapters/` に DuckDB lifecycle / recovery / raw fetch / i18n / app lifecycle を移動済み。
8 ファイル（useDuckDB, useEngineLifecycle, useDataRecovery, useRawDataFetch, useI18n, useAppLifecycle, runtimeTypes, index）が稼働中。

### C. Unified Context に責務が集まりすぎている — **4 slice 化済み**

`useUnifiedWidgetContext.ts` を 4 slice（comparison / query / weather / chart interaction）に分解済み。
残課題: `ctxHook` = 1 件（useUnifiedWidgetContext.ts、permanent lifecycle）。

### D. Comparison semantics が抽象化し切れていない — **部分的に解消**

`isPrevYearHandlers` = 0（全 13 handler が `PrevYearFlag` 型に移行済み）、
`pairExceptionDesign` = 0（全 5 consumer が専用 plan hook に移行済み）。
残課題: Window 契約型（CurrentWindow / WoWWindow / YoYWindow 等）と ComparisonProvenance の導入。
`useTimeSlotPlan.ts`（240 行）の comparison routing 分離。

### E. correctness risk が構造で潰せていない

- `readPurchaseCost.ts` の `countMissingDays()` は日付の day 部分だけで欠損を数えており、月跨ぎ期間に安全ではない
- `useQueryWithHandler` の generic canonicalization は、順序に意味がある配列を将来潰すリスクがある
- `useDashboardLayout.ts` はレンダー中に `saveLayout()` を呼んでおり、localStorage ベースの副作用がレンダーと結びついている

### F. WASM dual-run が cleanup blocker になっている

`grossProfitBridge.ts` は dual-run compare と deprecated wrapper を抱えており、
`frozen-list.md` の残存許可も WASM 周りが中心。観測には効いているが cleanup を遅らせている。

---

## Phase 0: 安全設計の正本を一本化する

**目的:** 「何を守るか」をぶらさない。

### 実施内容

- 構造状態の一次情報を `architectureStateAudit` と `frozen-list` に固定する
- `technical-debt-roadmap.md` は方針文書、`allowlist-management.md` は運用手順書に寄せる。件数説明は監査出力へ一本化
- 重要領域を Safety Tier で分類する

### Safety Tier 分類

| Tier | 対象 | 意味 |
|------|------|------|
| **A** | Authoritative business value | 数値の正確さが直接影響 |
| **B** | Comparison semantics | 比較の正しさが分析品質に影響 |
| **C** | Persistence / recovery | データ喪失・復旧に影響 |
| **D** | UI-only orchestration | 表示の利便性に影響 |

### 成果物

- `references/04-tracking/generated/architecture-state-snapshot.*` を唯一の構造状態参照にする
- `references/01-foundation/critical-path-safety-map.md` を新設する

### 効果

以後の cleanup が「感覚」ではなく「どの危険を減らす作業か」で語れるようになる。

---

## Phase 1: Runtime 境界を切り出す — **完了** ✅

**目的:** Application が runtime を抱え込まないようにする。

### 実施内容（完了済み）

- `application/runtime-adapters/` を新設 → **8 ファイルが稼働中**
- 移動完了:
  - DuckDB engine lifecycle → `useEngineLifecycle.ts`
  - DuckDB recovery → `useDataRecovery.ts`
  - raw fetch orchestration → `useRawDataFetch.ts`
  - i18n bootstrap → `useI18n.ts`
  - app lifecycle integration → `useAppLifecycle.ts`
- Application 層には「業務オーケストレーション」だけを残す

### Runtime State Machine

```
idle → booting → loading-cache → ready
                               → recovering → ready
                                            → degraded
                               → failed
```

- `failed` でも IndexedDB 原本から rebuild できることを前提にする
- DuckDB はあくまで派生キャッシュという原則を強める

### 成果物

- Runtime state machine 契約
- lifecycle / recovery ポート
- `applicationToInfrastructure` 例外削減

### 効果

- 障害時の壊れ方が限定される
- engine の失敗が application の責務汚染にならなくなる

---

## Phase 2: Unified Context を slice 化する — **完了** ✅

**目的:** 変更波及を小さくする。

### 実施内容（完了済み）

`useUnifiedWidgetContext.ts` を 4 slice に分割済み:

| Slice | 責務 |
|-------|------|
| `ComparisonContextSlice` | 比較期間・比較モード |
| `QueryContextSlice` | query 実行・readModel アクセス |
| `WeatherContextSlice` | 天気データ |
| `ChartInteractionSlice` | チャート操作状態 |
| `PageSpecificSlice` | ページ固有状態 |

### 安全設計ポイント

- widget が raw engine field を見ないようにする
- `queryExecutor` 以外の low-level field を presentation へ出さない
- 可視性判定、fallback 判定、readModel completeness 判定は slice 側で責務を持つ

### readModel メタデータ拡張

readModels の返り値に以下を明示する:

- `coverage` — データカバー率
- `fallbackUsed` — フォールバック使用有無
- `source` — データ取得元
- `dateSpan` — 対象期間
- `dataVersion` — データバージョン

### 効果

- context の中心肥大化を止められる
- 「値は同じだが由来が違う」ケースを型で扱えるようになる

---

## Phase 3: Comparison semantics を再定義する

**目的:** 比較まわりを「例外管理」から「型で安全」へ移す。**最重要フェーズ。**

### 現状の問題（2026-04-05 更新）

`isPrevYearHandlers` = 0（全 13 handler が `PrevYearFlag` 型エイリアスに移行済み）、
`pairExceptionDesign` = 0（全 5 consumer が専用 plan hook に移行済み）。
ただし `PrevYearFlag` は `boolean` の型エイリアスに過ぎず、Window 型による構造的安全は未達。
`useTimeSlotPlan.ts`（240 行）は comparison routing が複雑なまま残っている。

### 比較契約の分離

| Window 型 | 意味 |
|-----------|------|
| `CurrentWindow` | 当期のみ |
| `AlignedComparisonWindow` | 対応日付揃え比較 |
| `WoWWindow` | 週次比較 |
| `YoYWindow` | 年次比較 |
| `FallbackAwareComparisonWindow` | フォールバック込み比較 |

### Comparison Output に provenance を持たせる

```typescript
interface ComparisonProvenance {
  sourceDate: CalendarDate
  mappingKind: 'aligned' | 'wow' | 'yoy' | 'fallback'
  fallbackApplied: boolean
  confidence: number
}
```

### 対象ファイルの改善

| ファイル | 改善内容 |
|----------|----------|
| `useDayDetailData.ts` | 複合 query を bundled handler / comparison plan に昇格 |
| `useClipExport.ts` | `queryExecutor.execute()` 直呼びを廃止し export plan 化 |
| `useTimeSlotPlan.ts` | comparison planner / weather fallback planner / hourly aggregation planner に分割 |

### 効果

- 比較失敗が「値ズレ」ではなく「型の不一致」で止まるようになる
- fallback の有無が隠れなくなる
- comparison 専用の安全設計が成立する

---

## Phase 4: アルゴリズム安全を強化する

**目的:** 数学的不変条件に加えて、入力意味論の安全性を上げる。

### 4-1: 日付安全

- `countMissingDays()` の day-only ロジックを廃止し、ISO 日付キーか `CalendarDate` ベースへ変更
- `day: number` のみで意味を持つ処理を critical path から排除

### 4-2: canonicalization 安全

- `canonicalizeQueryInput()` の generic array sort をやめる
- `storeIds`, `dateRange`, `selectedMetrics` など、フィールドごとの正規化関数へ置換
- 「順序無意味な配列だけ正規化」を明示する

### 4-3: fallback 安全

- fallback を silent にしない。`meta.usedFallback` のような設計を全 critical readModel に広げる
- `calculateGrossProfit.ts` の方向性を他ドメインにも展開
- UI に fallback 状態を伝播する

### 4-4: 参照実装と parity

authoritative algorithm には必ず以下を持たせる:

- reference implementation
- optimized implementation
- property test
- metamorphic test

Shapley 系の invariant 運用を粗利・比較・集計にも横展開する。

### 効果

- バグが「検出される」だけでなく「意味論的に入りにくい」設計になる
- 集計や比較のズレが静かに混入しにくくなる

---

## Phase 5: UI persistence と render-time side effect を解消する

**目的:** UI 層の偶発的不整合を減らす。

### 現状の問題

- `useDashboardLayout.ts` はレンダー中に `saveLayout()` を呼んでいる
- `widgetAutoInject.ts` も localStorage ベースで注入状態を管理している
- 動いていても安全設計としては弱い

### 実施内容

- render 中の保存処理を全廃する
- localStorage 直書きを facade に寄せる
- widget auto inject は pure 判定関数 + effect 反映に分離する
- `pageStore`, `widgetLayout`, `widgetAutoInject` を UI persistence adapter 配下に統一

### 安全化

- schema version を持たせる
- migration 失敗時は default に safe fallback する
- persistence 書き込みを idempotent にする

### 効果

- React の再レンダーや StrictMode に挙動が引きずられにくくなる
- UI 状態破損が「画面のたまたま」に依存しなくなる

---

## Phase 6: WASM dual-run を「観測」から「収束」へ移す

**目的:** cleanup blocker を除去する。

### 現状（2026-04-05 更新）

全 5 engine authoritative 昇格完了（`compat.bridge.count = 0`）。
dual-run infrastructure 全面退役済み（dualRunObserver, dual-run compare, 3-mode dispatch 削除）。
bridge ファイルは WASM authoritative + TS fallback の薄い wrapper として維持。
詳細は `engine-promotion-matrix.md` を参照。

### 終了条件

`promotion-criteria.md` を正本とする。以下は要約:

| 指標 | 閾値 |
|------|------|
| mismatch rate | 0%（numeric-within-tolerance は許容） |
| null mismatch count | 0 |
| invariant violation | 0 |
| fallback 発生率 | 0% |
| observation test coverage | 全テスト pass |
| rollback | 正常動作確認済み |

### 収束時の作業

モジュールごとに exit criteria を満たしたら:

1. deprecated wrapper 削除
2. bridge 簡素化
3. TS/WASM dispatch の整理

### 効果

- 安全設計が「観測のために複雑なまま」になるのを防げる
- 後方互換凍結が恒久化しにくくなる

---

## 実行順と3レーン構成

### 実行順

| 順序 | Phase | 状態 |
|------|-------|------|
| 1 | ~~Phase 0~~ | **完了** ✅ — Safety Tier 分類、正本一本化 |
| 2 | ~~Phase 1~~ | **完了** ✅ — runtime-adapters/ に 8 ファイル移動済み |
| 3 | ~~Phase 2~~ | **完了** ✅ — 4 slice 化済み（ctxHook 1件 permanent） |
| 4 | ~~Phase 3~~ | **完了** ✅ — ComparisonWindow 契約型導入、PlanComparisonProvenance 全 plan 展開、DataComparisonProvenance resolver 接続済み |
| 5 | Phase 4 | 未着手 — アルゴリズム安全強化 |
| 6 | Phase 5 | 未着手 — UI persistence 解消 |
| 7 | ~~Phase 6~~ | **完了** ✅ — 全 5 engine authoritative、dual-run infrastructure 退役 |

**次の優先:** Phase 3（Window 契約型の横展開）と Phase 4（アルゴリズム安全）。

### 3レーン並行（allowlist 改善レーン付き）

| レーン | 対象 Phase | allowlist 改善対象 | 現況 |
|--------|-----------|-------------------|------|
| **構造レーン** | ~~Phase 0, 1, 2~~ | `applicationToInfrastructure`, `ctxHook`, `vmReactImport` | **大部分完了** ✅ |
| **比較・計算レーン** | Phase 3, 4, 6 | ~~`pairExceptionDesign`~~, ~~`isPrevYearHandlers`~~, `sideEffectChain` | allowlist 削減完了。残: 構造改善 |
| **衛生レーン** | Phase 5 + hotspot 分割 | 複雑性系一式, サイズ系一式 | 未着手 |

---

## Allowlist 改善計画

> **原則:** allowlist を直接減らすのではなく、歪みの原因を消した結果として allowlist も減る形にする。
> 全部をゼロにすべきではない。permanent は「消す」より「正当化して安定化」が正解なものもある。

### Phase 別 Allowlist 改善目標

| Phase | 対象 Allowlist | 改善内容 | 期待効果 |
|-------|---------------|----------|----------|
| **Phase 1** | `applicationToInfrastructure` | DuckDB lifecycle / recovery / raw fetch / i18n / app lifecycle を `runtime-adapters/` へ移動 | **完了** ✅ — runtime-adapters/ に 8 ファイル移動済み |
| **Phase 2** | `ctxHook` | `useUnifiedWidgetContext` / `useQueryBundle` を 5 slice に分解 | **4 slice 化済み** ✅ — 残 1 件（permanent lifecycle） |
| **Phase 2** | `vmReactImport` | VM を pure builder に寄せ、hook は wrapper 側へ出す | **0 件** ✅ |
| **Phase 3** | `pairExceptionDesign` | `isPrevYear` ベースをやめ、Window 型で比較契約を分離 | **0 件** ✅ — 全 5 consumer が plan hook に移行済み。残課題: Window 契約型導入 |
| **Phase 3** | `isPrevYearHandlers` | comparison planner 再設計で pair handler を内部詳細化 | **0 件** ✅ — 全 13 handler が PrevYearFlag 型に移行済み |
| **Phase 3** | `sideEffectChain` | `useLoadComparisonData.ts` の `.then()` を comparison planner 内で解消 | 1件 → 0 |
| **Phase 3,5** | `useMemoLimits` / `useStateLimits` / `hookLineLimits` | planner / reducer / builder / projection に分割 | 件数削減 + limit 引き下げ |
| **Phase 4** | `infraLargeFiles` / `usecasesLargeFiles` | SQL を concern 分割、import validation を schema/coercion/business 分割 | 件数削減 + algorithm safety 向上 |
| **Phase 5** | `presentationMemoLimits` / `presentationStateLimits` | render 計算を builder に、UI state を reducer 化 | 件数削減 + active-debt 比率低下 |

### 主要対象ファイル

**構造レーン（Phase 1, 2）— 大部分完了:**

| ファイル | 改善内容 | 状態 |
|----------|----------|------|
| `useDuckDB.ts` | `runtime-adapters/` へ移動 | ✅ 完了 |
| `useEngineLifecycle.ts` | `runtime-adapters/` へ移動 | ✅ 完了 |
| `useDataRecovery.ts` | `runtime-adapters/` へ移動 | ✅ 完了 |
| `useRawDataFetch.ts` | `runtime-adapters/` へ移動 | ✅ 完了 |
| `useAppLifecycle.ts` | `runtime-adapters/` へ移動 | ✅ 完了 |
| `useI18n.ts` | `runtime-adapters/` へ移動 | ✅ 完了 |
| `useUnifiedWidgetContext.ts` | 4 slice に分解 | ✅ 完了（ctxHook 1件 permanent） |
| `useQueryBundle.ts` | smaller bundle に分割 | 未着手 |
| `CategoryBenchmarkChart.vm.ts` | pure builder 化 | 未着手 |
| `CategoryBoxPlotChart.vm.ts` | pure builder 化 | 未着手 |

**比較・計算レーン（Phase 3, 4）:**

| ファイル | 改善内容 |
|----------|----------|
| `useDayDetailData.ts` | bundled handler / comparison plan に昇格 |
| `useClipExport.ts` | export plan 化 |
| `useTimeSlotPlan.ts` | 3 planner に分割 |
| `useLoadComparisonData.ts` | comparison planner 内で `.then()` 解消 |
| `purchaseComparison.ts` | concern ごとに SQL 分割 |
| `rawAggregation.ts` | authoritative / exploration / adapter に分割 |
| `importValidation.ts` | schema / coercion / business validation に分割 |

**衛生レーン（Phase 5）:**

| ファイル | 改善内容 |
|----------|----------|
| `useComparisonModule.ts` | planner / reducer 分割 |
| `usePersistence.ts` | UI persistence adapter 化 |
| `useAutoBackup.ts` | effect 分離 |
| `useDrilldownData.ts` | builder / projection 分割 |
| `useDrilldownRecords.ts` | builder / projection 分割 |
| `RawDataTab.tsx` | render 計算を builder へ |
| `YoYWaterfallChart.tsx` | render 計算を builder へ |
| `HourlyChart.tsx` | render 計算を builder へ |
| `DailySalesChartBody.tsx` | render 計算を builder へ |

### 無理に減らさないもの

以下は今すぐ削減目標にしない:

| 対象 | 理由 |
|------|------|
| `domainLargeFiles` の一部（`metricDefs.ts`, `formulaRegistryBusiness.ts`） | 「定義集合」であり分けても本質改善にならない |
| WASM 観測フェーズ由来の後方互換 | exit criteria を決めて順番に回収すべき。件数だけを急ぐと観測品質を落とす |
| truly structural な adapter | 役割が明確なら permanent のままで問題ない |

---

## 成功指標

allowlist 件数だけでは評価しない。見るべき指標:

### 構造系

| 指標 | 方向 | 現況（2026-04-05） |
|------|------|------|
| `applicationToInfrastructure` 件数 | 減少 | runtime-adapters 移動済み。残 10 件（adapter 9 + lifecycle 1） |
| `ctxHook` | → 0 もしくは retirement 化 | **1 件**（permanent lifecycle） |
| `vmReactImport` | → 0〜1件 | **0 件** ✅ |

### 比較系

| 指標 | 方向 | 現況（2026-04-05） |
|------|------|------|
| `pairExceptionDesign` 件数 | → 0 | **0 件** ✅ |
| `isPrevYearHandlers` | → 0 | **0 件** ✅（PrevYearFlag 型に移行済み） |
| comparison output が provenance と fallback 状態を持つ | 達成 | 未着手（Window 契約型の導入が前提） |

### 複雑性系

| 指標 | 方向 |
|------|------|
| `presentationMemoLimits` / `presentationStateLimits` 件数 | 減少 |
| `hookLineLimits` の near-limit | 解消 |
| `useMemoLimits` / `useStateLimits` 件数 | 減少 |

### サイズ系

| 指標 | 方向 |
|------|------|
| `infraLargeFiles` / `usecasesLargeFiles` 件数 | 減少 |

### 運用系

| 指標 | 方向 |
|------|------|
| 凍結リストに新規追加 | なし |
| `KNOWN_DEPRECATED` の WASM 起因残件数 | 減少 |
| `architectureStateAudit` の hotspot / bridge / facade hook 数 | 縮小 |
| day-only / implicit fallback / render-time side effect が critical path から消える | 達成 |

---

## 1人運用モデル: AI 主体 + 人間例外承認

### Green / Yellow / Red 判定

AI + 人間 1 名運用において、人間の出番を最小化するための機械判定基準。

| 判定 | 条件 | AI の行動 | 人間の行動 |
|------|------|-----------|-----------|
| **Green** | Hard Gate PASS, WARN=0, guard 全 pass | 自動進行 | 不要 |
| **Yellow** | Hard Gate PASS だが WARN >= 1 | 進行 + 要約通知 | 通知確認のみ |
| **Red** | Hard Gate FAIL, または以下の Red 条件に該当 | **停止、人間承認待ち** | 判断・承認 |

### Red 条件（人間承認必須）

以下は AI だけでは進行せず、必ず人間承認を取る:

- `docs.obligation.violations > 0`（Hard Gate FAIL）
- principles 変更（`references/01-foundation/` 配下の変更）
- 新規 frozen / allowlist / bridge 追加
- authoritative 昇格（`promotion-criteria.md` に明記済み）
- Hard Gate fail override
- 不可逆移行（ファイル削除、型の breaking change）

### No-New-Debt ルール

以下は **新規追加禁止**。`noNewDebtGuard.test.ts` で機械的に検証:

| 禁止対象 | guard |
|----------|-------|
| dual-run compare コード（getExecutionMode / recordCall） | noNewDebtGuard |
| dualRunObserver.ts の復活 | noNewDebtGuard |
| ExecutionMode への dual-run-compare 再導入 | noNewDebtGuard |
| presentation 層からの wasmEngine 直接 import | noNewDebtGuard |

### 運用ルール

- health の current value は prose に書かず generated section から自動埋め込み
- 例外・凍結の新規追加には理由と exit trigger を必須化
- `docs:generate` + `docs:check` は PR ごとに実行（CI fast-gate で強制）
