# inquiry/16 — 破壊的変更 完全 list

> 役割: Phase 4 inquiry 成果物 #2。inquiry/15 の 18 改修 item のうち **`breakingChange: true`** のものを完全列挙し、**rollback 手順 + 影響範囲 + 前後条件**を記述する。
>
> plan.md §2 不可侵原則:
> - #2: Phase 4 計画に載らない破壊的変更を Phase 6 で実施 **禁止**
> - #3: 1 PR に複数の破壊的変更を混ぜる **禁止**
> - #4: Phase 4 計画承認後のみ破壊的変更可
>
> 本台帳は **Phase 4 計画に載る破壊的変更の唯一正本**。Phase 6 では本 list 以外の破壊的変更を行わない。
>
> 本ファイルは immutable。Phase 5 以降で追加情報が判明しても書き換えず、`16a-*.md` として addend する。

## 採取条件

| 項目 | 値 |
|---|---|
| 採取日 | 2026-04-23 |
| commit | `0e51579`（inquiry/15 push 直後） |
| branch | `claude/budget-simulator-review-dJr9C` |
| 入力 | `inquiry/15-remediation-plan.md` の 18 改修 item のうち `breakingChange: true` を持つもの |

## 破壊的変更の定義（本 project 固有）

**破壊的変更 = 以下のいずれかを含む改修**:

1. 公開 API（export された型 / 関数 / interface）の削除または signature 変更
2. 型レベルの required / optional 状態変更（型 checker で既存 consumer が fail）
3. ファイル path の移動 / rename（import path 変更が必要）
4. runtime 契約の変更（isVisible 条件変更で可視性が変わる widget 等）
5. allowlist baseline の増加（ratchet-down を逆行させる）

**非破壊的変更**（= `breakingChange: false` 扱い）:

- registry 行の内部改修（consumer API 不変）
- guard の新規追加（baseline で既存通過）
- JSDoc metadata 付記（type 非影響）

## 破壊的変更 完全 list（7 item）

inquiry/15 の 18 item 中、`breakingChange: true` は以下 7 件:

| ADR | title | 主な破壊 |
|---|---|---|
| ADR-A-001 | UnifiedWidgetContext から page-local optional 5 field 剥離 | type 削除 |
| ADR-A-002 | Dashboard 固有 20 field を DashboardWidgetContext に required 集約 | type 削除 + 新型導入 |
| ADR-A-003 | WidgetDef 同名 2 型を DashboardWidgetDef / UnifiedWidgetDef に分離 | rename |
| ADR-A-004 | core required field `result` / `prevYear` の discriminated union 化 | type shape 変更 |
| ADR-D-001 | Architecture Rule の reviewPolicy を required 昇格 | type required 昇格 |
| ADR-D-002 | allowlist entry metadata を required 化 | type required 昇格 |

**6 件**で非破壊。加えて `inquiry/15` 記述で `breakingChange: true` の追加 1 件:

| ADR | title | 追加理由 |
|---|---|---|
| ADR-C-003 | Tier D orphan 3 件削除 | 厳密には import 経路 0 だが、`RangeComparison.styles.ts` の barrel re-export を削除するため、barrel 経由の import に影響 |

合計 **7 件**。以下で各 item の rollback + 影響範囲 + 前後条件を詳述する。

---

## 詳細

### BC-1. ADR-A-001（UnifiedWidgetContext page-local 剥離）

| 項目 | 内容 |
|---|---|
| 削除される public 型 | `UnifiedWidgetContext.insightData?` / `costDetailData?` / `selectedResults?` / `storeNames?` / `onCustomCategoryChange?` の 5 field |
| 影響範囲 | 5 field を touch する 10 widget（WID-032/034/035/036/038/039/040/041/042/043）+ 該当 widget の page（Insight / CostDetail / Category） |
| 前提（precondition） | page-specific ctx 型 3 本（InsightWidgetContext / CostDetailWidgetContext / CategoryWidgetContext）が別 path で存在 |
| 後置（postcondition） | page registry 10 widget が page-specific ctx 型を受ける shape に移行済み |
| rollback 手順 | (1) `git revert PR4` で field 削除を取消 (2) 5 field の optional 宣言を UnifiedWidgetContext に復元 (3) page-specific ctx 型の required 参照を optional に戻す |
| rollback の前提 | PR3 の consumer 移行が完了していない段階での rollback は refuse（混在状態になる） |
| guard 設定 | `unifiedWidgetContextNoPageLocalOptionalGuard` を baseline=5 → 4 → 3 → 2 → 1 → 0 で段階減少 |
| 実施 PR 数 | 4（plan では PR1-4 を分割） |

### BC-2. ADR-A-002（Dashboard 固有 20 field 集約）

| 項目 | 内容 |
|---|---|
| 削除される public 型 | `UnifiedWidgetContext` の Dashboard 固有 optional 20 field（`storeKey?` / `allStoreResults?` ほか、inquiry/04 §B-3） |
| 新設 public 型 | `DashboardWidgetContext extends UnifiedWidgetContext`（現存 `WidgetContext` を rename） |
| 影響範囲 | Dashboard-local registry 29 widget 全件（WID-001〜WID-029） |
| 前提 | ADR-A-001 が PR3 まで完了していること（page-specific ctx 分離が先行） |
| 後置 | Dashboard 29 widget が `DashboardWidgetContext` を使う shape |
| rollback 手順 | (1) `git revert PR3-4` (2) 20 field を UnifiedWidgetContext に optional で復元 (3) `WidgetContext` 名称を既存に戻す |
| guard 設定 | `unifiedWidgetContextNoDashboardSpecificGuard` baseline=20 → 0 |
| 実施 PR 数 | 4 |

### BC-3. ADR-A-003（WidgetDef 2 型分離）

| 項目 | 内容 |
|---|---|
| rename される public 型 | `WidgetDef`（Dashboard 版 `types.ts:101`）→ `DashboardWidgetDef` |
| rename される public 型 | `WidgetDef`（Unified 版 `types.ts:225`）→ `UnifiedWidgetDef` |
| 影響範囲 | registry 10 本 + registry 行で `import type { WidgetDef }` を使う全 consumer（45 widget + 合成 registry 2 本） |
| 前提 | ADR-A-001 / A-002 完了（ctx 型分離が前提。WidgetDef 型の引数 ctx 型が確定してから rename） |
| 後置 | 同名 `WidgetDef` interface が独立 file で並存 0 |
| rollback 手順 | (1) 両 file に `export type WidgetDef = <NewName>` の alias を追加して後方互換 (2) consumer 側の新名 import を `WidgetDef` に戻す |
| guard 設定 | `sameInterfaceNameGuard` baseline=1（WidgetDef のみ allowlist）→ 0 |
| 実施 PR 数 | 4 |

### BC-4. ADR-A-004（core required discriminated union 化）

| 項目 | 内容 |
|---|---|
| 変更される public 型 | `StoreResult`（`result` の型）/ `PrevYearData`（`prevYear` の型） |
| 旧 shape | object with fields（`result.daily` / `prevYear.hasPrevYear` 等） |
| 新 shape | discriminated union（例: `{ status: 'ready'; data: StoreResult } \| { status: 'empty' }`） |
| 影響範囲 | 本型を touch する全 widget + `useStoreSelection` / `useInsightData` / `useCostDetailData` 等の hook |
| 前提 | ADR-A-001 / A-002 / A-003 完了（widget 側の type 変換が先行可能な状態） |
| 後置 | `ctx.result != null` / `ctx.prevYear.hasPrevYear` の null check が不要な shape |
| rollback 手順 | (1) discriminated union の old shape alias を再導入 (2) 新 shape consumer を revert (3) alias を削除 |
| guard 設定 | `coreRequiredFieldNullCheckGuard` baseline=2（WID-031, WID-033）→ 0 |
| 実施 PR 数 | 4 |

### BC-5. ADR-C-003（orphan 3 件削除）

| 項目 | 内容 |
|---|---|
| 削除される public 型 / file | `DowGapKpiCard.tsx` / `PlanActualForecast.tsx` / `RangeComparison.tsx` + 関連 `*.styles.ts` + `__tests__/PlanActualForecast.test.tsx` |
| 影響範囲 | import 経路 0 のため表面的な consumer 影響は無いが、`DashboardPage.styles.ts:16` の `export * from './RangeComparison.styles'` を同時に削除するため、barrel 経由の間接 import が万一あれば fail |
| 前提 | 削除前に全 source（app/src/ 全域 + test + stories）の grep で import 0 確認 |
| 後置 | 3 .tsx + 関連 file が物理削除、git 履歴には残存 |
| rollback 手順 | (1) `git revert` で file 復元 (2) barrel re-export を復元 |
| guard 設定 | `orphanUiComponentGuard` baseline=3 → 0 |
| 実施 PR 数 | 3（Phase 6 で短期完結） |

### BC-6. ADR-D-001（reviewPolicy required 昇格）

| 項目 | 内容 |
|---|---|
| 変更される public 型 | `RuleOperationalState.reviewPolicy` optional → required |
| 影響範囲 | `base-rules.ts` + `architectureRules/` 配下の全 rule 定義 92 件 |
| 前提 | PR2 で 92 件に reviewPolicy を bulk 追記済み（compile pass） |
| 後置 | 新規 rule 登録時に reviewPolicy 未設定 = compile fail |
| rollback 手順 | (1) type 定義を optional に戻す (2) 新規追加 rule から reviewPolicy 削除 |
| guard 設定 | `reviewPolicyRequiredGuard` baseline=92 → 0 |
| 実施 PR 数 | 4 |

### BC-7. ADR-D-002（allowlist metadata required 昇格）

| 項目 | 内容 |
|---|---|
| 変更される public 型 | allowlist entry type の `ruleId` / `createdAt` / `reviewPolicy` / `expiresAt` optional → required |
| 影響範囲 | `app/src/test/allowlists/` 配下 7 categories の全 entry |
| 前提 | PR2 で既存 allowlist に metadata bulk 追記済み |
| 後置 | 新規 allowlist entry は metadata 必須 |
| rollback 手順 | (1) type を optional に戻す (2) entry から metadata 削除 |
| guard 設定 | `allowlistMetadataGuard` baseline=current → 0 |
| 実施 PR 数 | 4 |

---

## PR 分離規律（plan.md §2 不可侵 #3 強制）

- 各破壊的変更は **独立 PR**（他の破壊的変更と merge しない）
- 各破壊的変更の 4 step（PR1-4）もそれぞれ独立 PR
- BC-1〜BC-7 の合計 PR 数: 4+4+4+4+3+4+4 = **27 PR**
- 依存順序に従い順次 merge（`inquiry/18-sub-project-map.md` で詳細）

## 人間承認のスコープ（Phase 4 完了条件）

plan.md Phase 4 完了条件 `人間承認: 破壊的変更 list と sub-project 立ち上げ順序` に対応し、**本 list 7 件 の承認**が Phase 5 進行の条件となる。

承認対象:
- BC-1 から BC-7 の 7 件全て
- 各 rollback 手順の妥当性
- 各 guard の baseline 設定
- 27 PR の分離

## 非承認のスコープ

**本 list に載らない破壊的変更は Phase 6 で実施禁止**（不可侵 #2）。

新たな破壊的変更が必要と判明した場合:
1. `16a-<slug>.md` addendum を作成（本 file は immutable のため）
2. 改めて人間承認を取得
3. 承認後に Phase 6 で実施

## 付記

- 本 list は immutable。追加は `16a-*.md` として addend
- 関連: `inquiry/15`（全改修 item 元台帳）、`inquiry/17`（legacy retirement）、`inquiry/18`（sub-project map + 実行順序）
