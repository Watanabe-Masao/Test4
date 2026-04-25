# inquiry/17a — orphan scope 拡張提案（addendum to inquiry/17 §LEG-014）

> **役割**: `inquiry/17 §LEG-014` の addendum。`inquiry/03 §Tier D` で確定していた 3 件の orphan に加え、ADR-C-003 PR1 で `orphanUiComponentGuard` を実装した際の audit で**さらに 4 件の orphan が判明**した。本 file はその 4 件の audit と scope 拡張提案を記録する。
>
> **status**: **final（Option A 承認 2026-04-25、ADR-C-003 PR3a/PR3b で実施完了）**。本 file は immutable な inquiry/17 を書き換えず、addendum として配置する（`inquiry/17 §再発防止規約 5` の運用ルールに準拠）。承認後 immutable 化。
>
> **判断主体**: `architecture` ロール（pm-business + 人間承認）

## 経緯

| Phase | 件 | 出典 |
|---|---|---|
| inquiry/03 (Phase 1) | **3 件** Tier D orphan として確定 | `DowGapKpiCard.tsx` / `PlanActualForecast.tsx` / `RangeComparison.tsx` |
| ADR-C-003 PR1 (実装時 audit) | **+ 4 件** 未確定 orphan を発見 | `ConditionDetailPanels.tsx` / `ConditionMatrixTable.tsx` / `ConditionSummary.tsx` / `ExecSummaryBarWidget.tsx` |
| ADR-C-003 PR2 (削除実施) | inquiry/03 scope の **3 件削除済**（baseline 7→4） | `app/src/test/guards/orphanUiComponentGuard.test.ts` 冒頭コメント参照 |
| **本 17a (現在)** | 残 4 件の処理方針を決定する | — |

## 4 件の audit

### F1. `ConditionDetailPanels.tsx` (17 行)

| 項目 | 値 |
|---|---|
| 種別 | barrel re-export（純粋。logic ゼロ） |
| 内容 | `conditionPanel{Profitability,MarkupCost,YoY,SalesDetail}.tsx` から各 Detail Table を re-export |
| 直接 import | **0 件**（barrel 自体は誰も import しない） |
| 間接利用 | barrel が指す siblings は `ConditionSummary.tsx`（orphan）が直接 import している。他の active 経路は **siblings → `ConditionSummaryYoYDrill.tsx` / `ConditionSummaryEnhanced.tsx`**（LIVE） |
| 削除影響 | **なし**（barrel 自体は dead、siblings は他経路で生存） |

### F2. `ConditionMatrixTable.tsx` (177 行)

| 項目 | 値 |
|---|---|
| 種別 | 実 component（DuckDB 5期間メトリクス table） |
| 役割 | コンディションマトリクステーブル — 前年比 / 前週比 / トレンド比率 / トレンド方向 表示 |
| 直接 import | **0 件** |
| 関連 application 層 | `application/hooks/plans/useConditionMatrixPlan.ts` + `application/queries/advanced/ConditionMatrixHandler.ts` を import している。これらは application 内部 (`advanced/index.ts` barrel) からも参照されるが、**外部 consumer 0 件** |
| 削除影響 | **cascade あり**: 削除すると `useConditionMatrixPlan` + `ConditionMatrixHandler` + `advanced/index.ts` 内の re-export が dead 化。同 barrel 経由で他 consumer が無いことを再検証要 |

### F3. `ConditionSummary.tsx` (330 行)

| 項目 | 値 |
|---|---|
| 種別 | 実 widget component (`ConditionSummaryWidget`) |
| 役割 | 旧世代の Condition サマリー widget。`DashboardWidgetContext` を消費 |
| 直接 import | **0 件** |
| 後継 | `ConditionSummaryEnhanced.tsx` が `registryKpiWidgets.tsx` で正規 widget として登録済（kpi-condition-summary）。本 file は **superseded by `ConditionSummaryEnhanced`** |
| 削除影響 | **なし**（後継が完全に置き換え済） |

### F4. `ExecSummaryBarWidget.tsx` (326 行)

| 項目 | 値 |
|---|---|
| 種別 | 実 widget component (`ExecSummaryBarWidget`) |
| 役割 | エグゼクティブサマリーバー widget |
| 直接 import | **0 件** |
| 後継 | 不明（registry に該当 widget なし）。実機で UI が消えている可能性高い |
| 既存記録 | `app/src/test/allowlists/responsibility.ts` line 15 に「Zustand selector 経由に移行。getState 0 回。許可リスト卒業」のコメントあり — つまり **migration 完了 + 後続 deletion 忘れ** の可能性が高い |
| 削除影響 | **なし**（実機 UI で参照されない、allowlist にも graduated 済） |

## cascade 影響まとめ

| 削除対象 | 同時に dead 化する file | scope |
|---|---|---|
| F1 ConditionDetailPanels.tsx | （なし） | 1 file |
| F2 ConditionMatrixTable.tsx | `useConditionMatrixPlan.ts`, `ConditionMatrixHandler.ts`, `advanced/index.ts` 内の re-export | 1 + 2~3 file（要再検証） |
| F3 ConditionSummary.tsx | （なし — siblings は active 経路で生存） | 1 file |
| F4 ExecSummaryBarWidget.tsx | （なし） | 1 file |

`conditionPanel*.tsx` 8 file は `ConditionSummary` 削除後も `ConditionSummaryYoYDrill` / `ConditionSummaryEnhancedRows` 等の **LIVE 経路**で生存するため orphan 化しない。

## scope 拡張の選択肢

### Option A: 一括追加削除（推奨）

**全 4 件を ADR-C-003 PR3 の scope に追加**して削除する。phased で cascade を分離:

```
ADR-C-003 PR3a: F1 + F3 + F4 を削除（cascade なし、即時実行可能）
                baseline 4 → 1
ADR-C-003 PR3b: F2 を削除 + cascade (useConditionMatrixPlan / ConditionMatrixHandler / advanced/index.ts 整備)
                baseline 1 → 0、ALLOWLIST 空、fixed mode 化
ADR-C-003 PR3c: LEG-014 sunsetCondition 達成確認 + BC-5 rollback 手順 PR description 記載
```

**メリット**: SP-C Phase 3 を完遂できる、guard fixed mode 到達、Phase 4-5 とそれ以降 (SP-C completion → SP-D Wave 2) が unblock。

**デメリット**: cascade で application 層も触るため scope は当初より広がる。phased で分離すれば各 PR は小さい。

### Option B: scope 縮退（保留）

**4 件を inquiry/17 LEG-014 の scope 外として保留**し、別の sub-project または **完全な inquiry redo** で扱う。`orphanUiComponentGuard` baseline=4 を fixed mode で凍結（ratchet-down 不可）。

**メリット**: ADR-C-003 PR3 は LEG-014 元 scope の 3 件のみで完結。

**デメリット**: 4 file (合計 850 行) が dead code として永続化。`orphanUiComponentGuard` の本来意図 (`baseline=0`) が達成されない。再発防止構造が完成しない。

### Option C: 部分採用

**F1 / F3 / F4 のみ削除**（cascade なし）、F2 は保留。baseline 4 → 1 で fixed mode。

**メリット**: A の即効性を取りつつ、application 層の cascade は深追いしない。

**デメリット**: F2 が永続 dead code 化。`baseline=1 fixed` は guard の本来意図と乖離。

## 推奨 / 最終決定

**Option A（承認 2026-04-25）** — 4 件すべての削除を ADR-C-003 PR3 の scope に追加し、phased で実施した。`orphanUiComponentGuard` baseline=0 + ALLOWLIST 空 + fixed mode を完遂し、`INV-J7-B` の効力を完全化した。

### 実施結果（PR3a/PR3b）

PR3a (commit b2c9c31): F1 ConditionDetailPanels + F3 ConditionSummary + F4 ExecSummaryBarWidget 削除。
17a 想定外の cascade orphan として F1 barrel 削除に伴う conditionPanelMarkupCost / conditionPanelProfitability の 2 件も同時削除（barrel re-export の唯一 consumer 経路だったため）。F4 唯一対象だった `phase6SummarySwapGuard.test.ts` も削除。baseline 4→1 に減算。

PR3b (commit 8d852bd): F2 ConditionMatrixTable + 17a 想定 cascade (Plan / Handler / advanced/index.ts) + 17a 想定外の拡張 cascade (`useConditionMatrix.ts` / `conditionMatrixLogic.ts` / `infrastructure/duckdb/queries/conditionMatrix.ts` および各テスト) を削除。Option A 趣旨「dead code 永続化を避ける」に従い、F2 削除で orphan 化する application + infrastructure 層の dead code chain も同 PR で fully cleanup。baseline 1→0 + ALLOWLIST=[] + fixed mode 達成。

合計影響: 削除ファイル 24 件、影響行数 -3700+ 行（presentation/application/infrastructure/test 層）。

### 推奨に対する 17a の評価精度 learning

17a 評価「F1 削除影響: なし」は誤りだった（barrel sibling 経路の見落とし）。17a 評価「F2 cascade は application 層 2-3 file のみ」も保守的過ぎた（duckdb hook + infrastructure query の 5 file 追加 cleanup が必要だった）。後続 inquiry での cascade 評価は

1. barrel re-export の sibling 経路を必ず audit
2. 削除対象の hook chain（Plan → Handler → legacy hook → query）を最後の dead code まで辿る

の 2 点を加えること。

理由:
1. **再発防止が完成する** — guard fixed mode が本来意図どおり機能する（baseline=0）
2. **block チェーンが解ける** — SP-C Phase 3 → Phase 5 (sub-project completion) → Wave 2 SP-D ADR-D-004 着手 が連鎖的に unblock される
3. **dead code 永続化を避ける** — 850 行の dead code は将来の reader を misled する。後継 (`ConditionSummaryEnhanced` 等) との関係を理解するコストが残る
4. **cascade も小規模** — F2 cascade は application 層 2-3 file のみで、`advanced/` barrel の整備で完結

## 承認すれば実施する作業

Option A 承認時の PR 計画:

| PR | scope | 影響行数 | 影響範囲 |
|---|---|---|---|
| PR3a | F1 + F3 + F4 削除 | -673 行 | presentation のみ |
| PR3b | F2 + cascade (useConditionMatrixPlan / ConditionMatrixHandler / advanced/index.ts 整備) 削除 | -177 (F2) + ~200 (application) = ~-380 行 | presentation + application（軽微） |
| PR3c | guard baseline=0 + ALLOWLIST 空 + fixed mode + checklist Phase 3 残 box [x] + LEG-014 sunset + BC-5 rollback 記載 | docs only | docs |

各 PR で全 guard test + docs:check + visual / E2E 検証。

## rollback plan

各 PR を `git revert` で戻す。F2 cascade の rollback はやや広範になるため、PR3b では削除前後で `npm run test:guards` + `application/queries/advanced/index.ts` の structural integrity test が PASS することを確認する。

## 参照

- 上位 inquiry: `inquiry/17 §LEG-014`
- 上位 ADR: `inquiry/15 §ADR-C-003`
- 破壊的変更: `inquiry/16 §BC-5`
- guard: `app/src/test/guards/orphanUiComponentGuard.test.ts`
- SP-C local 文書: `projects/duplicate-orphan-retirement/checklist.md` Phase 3
- 後続 unblock 先:
  - SP-C Phase 5 (sub-project completion)
  - SP-D Phase 5 ADR-D-004 (`@deprecated metadata`、SP-C completed 後に着手)

## 付記

- 本 file は inquiry/17 の addendum。inquiry/17 immutable 規約に準拠し、本 17a も承認後 immutable 化
- 追加情報が判明した場合は `17b-*.md` として addend
- 2026-04-25 Option A 承認 + 実施完了 (PR3a/PR3b) で本 file final 化、immutable
