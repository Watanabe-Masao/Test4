# SUMMARY — duplicate-orphan-retirement（SP-C）

> **役割**: completion 記録。後続 project（umbrella `architecture-debt-recovery` の Phase 6 残作業 / SP-D Wave 2 ADR-D-004）が本 sub-project の経緯・成果物・引き継ぎ先を参照するためのサマリ。
>
> **status (本 file)**: 本セッションで step1（本 SUMMARY 作成）+ step2-7（physical move / status 切替 / CURRENT_PROJECT 確認 / open-issues 更新 / umbrella HANDOFF 同期 / projectCompletionConsistencyGuard 確認）を一括実施。

## 完了日

**2026-04-25** — ADR-C-003 PR3c (commit f5c9d15) で Phase 3 完了確定。

## 目的（再掲）

umbrella `architecture-debt-recovery` の **Lane C** sub-project として、**複製 / orphan / barrel 残存**を体系的に撤退する:

- `features/*/ui/widgets.tsx` 3 件の byte-identical duplicate 解消
- `useCostDetailData` 2 箇所並存解消（features 版を正本に）
- Tier D orphan の物理削除（BC-5）と再発防止 guard 化
- barrel re-export の metadata 必須化（@sunsetCondition / @expiresAt / @reason）

## 成果物（landed）

### 4 ADR 完遂

| ADR | 主な成果 | landed PR/commit |
|---|---|---|
| **C-001** | `features/*/ui/widgets.tsx` 3 件 byte-identical 解消 → barrel re-export 化 → 物理削除 | `duplicateFileHashGuard` baseline 3→0 + fixed mode、LEG-010/011/012 sunset |
| **C-002** | `useCostDetailData` 2 箇所並存 → features 版を `@canonical` 化 + consumer 切替 + pages 版削除 | `hookCanonicalPathGuard` baseline 1→0 + fixed mode、LEG-013 sunset |
| **C-003** | Tier D orphan + 17a 拡張 4 件 + cascade orphan を段階削除（PR2/PR3a/PR3b） | `orphanUiComponentGuard` baseline 7→4→1→0 + ALLOWLIST 空 + fixed mode、LEG-014 sunset、BC-5 完了 |
| **C-004** | 既存 38 barrel re-export に metadata bulk 追記 + 新規追加時 metadata 必須化 | `barrelReexportMetadataGuard` baseline 38→0 + fixed mode、LEG-015 sunset |

### 17a Option A 拡張 scope（ADR-C-003）

`inquiry/17a-orphan-scope-extension.md` Option A 承認 (2026-04-25) を受けて、当初 inquiry/03 の Tier D 3 件に加えて以下を全削除:

- **17a 直接 scope (4 件)**: F1 ConditionDetailPanels / F2 ConditionMatrixTable / F3 ConditionSummary / F4 ExecSummaryBarWidget
- **F1 barrel cascade (2 件)**: conditionPanelMarkupCost / conditionPanelProfitability（barrel re-export の唯一 consumer 経路）
- **F2 17a 想定 cascade (3 件)**: useConditionMatrixPlan / ConditionMatrixHandler / advanced/index.ts re-export
- **F2 17a 想定外の拡張 cascade (5 件)**: useConditionMatrix (legacy hook) / conditionMatrixLogic + test / infrastructure/duckdb/queries/conditionMatrix + test
- **F4 唯一対象 guard (1 件)**: `phase6SummarySwapGuard.test.ts`（ExecSummaryBarWidget のみを監視していた regression freeze guard）

合計 24 ファイル削除、影響行数 -3700+ 行。

### 4 guard fixed mode 達成

| guard | 最終 baseline | 状態 |
|---|---|---|
| `duplicateFileHashGuard` | 0 | ✅ ADR-C-001 完結（fixed mode） |
| `hookCanonicalPathGuard` | 0 | ✅ ADR-C-002 完結（fixed mode） |
| `orphanUiComponentGuard` | 0 | ✅ ADR-C-003 完結（ALLOWLIST 空 + fixed mode） |
| `barrelReexportMetadataGuard` | 0 | ✅ ADR-C-004 完結（fixed mode、新規 barrel は 3 metadata 必須） |

### 6 LEG sunsetCondition 達成

| LEG ID | 対象 | 状態 |
|---|---|---|
| LEG-010 | `features/category/ui/widgets.tsx` | ✅ migrated |
| LEG-011 | `features/cost-detail/ui/widgets.tsx` | ✅ migrated |
| LEG-012 | `features/reports/ui/widgets.tsx` | ✅ migrated |
| LEG-013 | `useCostDetailData` pages 版 | ✅ migrated（features 版単一正本化） |
| LEG-014 | Tier D orphan 3 件 + 17a 拡張 4 件 + cascade orphan | ✅ migrated（17a Option A 完遂） |
| LEG-015 | barrel re-export metadata 未設定群 | ✅ migrated（38 barrel 全件 metadata 付与） |

### 1 BC（破壊的変更）完遂

- **BC-5**: orphan UI component の物理削除（PR2 → PR3a → PR3b 段階実施、各 PR 独立 revert 可能、umbrella `inquiry/16 §BC-5` 正本）

## 主要設計決定

### 1. 17a Option A による orphan scope 拡張

inquiry/03 §Tier D 3 件確定後、ADR-C-003 PR1 実装時の audit で 4 件追加判明。**Option A（一括追加削除）vs Option B（保留）vs Option C（部分採用）** から Option A を選択。理由:

- 再発防止構造の完成（baseline=0 + fixed mode 達成）
- 連鎖的 unblock（SP-C Phase 3 → Phase 5 → SP-D Wave 2）
- 850 行 dead code 永続化を回避

### 2. 17a 想定外の cascade 評価精度 learning

17a 評価「F1 削除影響: なし」は誤りだった（barrel sibling 経路の見落とし）。F1 ConditionDetailPanels.tsx は barrel re-export だが、`conditionPanelMarkupCost` / `conditionPanelProfitability` の唯一 consumer 経路だったため、F1 削除で 2 件が cascade orphan 化した。

17a 評価「F2 cascade は application 層 2-3 file のみ」も保守的過ぎた。実際は duckdb hook (`useConditionMatrix.ts`) + pure logic (`conditionMatrixLogic.ts`) + infrastructure query (`queries/conditionMatrix.ts`) の 5 file 追加 cleanup が必要だった。Option A 趣旨「dead code 永続化を避ける」に従い、これらも PR3b に統合。

**learning（17a final §推奨に記録）**: 後続 inquiry での cascade 評価は (a) barrel re-export の sibling 経路を必ず audit、(b) 削除対象の hook chain（Plan → Handler → legacy hook → query）を最後の dead code まで辿る、の 2 点を加える。

### 3. 1 PR = 1 ADR step 規律の徹底

ADR-C-003 PR3 を当初 1 commit で計画していたが、scope 拡張（17a Option A）後は phased で 3 commit に分解（PR3a / PR3b / PR3c）:

- **PR3a (b2c9c31)**: cascade なしの F1+F3+F4 削除（presentation のみ）
- **PR3b (8d852bd)**: F2 + cascade 削除（presentation + application + infrastructure）
- **PR3c (f5c9d15)**: docs only（checklist + 17a + breaking-changes + legacy-retirement の状態確定）

各 commit は独立 revert 可能。

## CI gate（本 sub-project 期間中の通過実績）

- `npm run test:guards` PASS（44 secs / 100 test files / 744 tests）
- `npm run docs:generate` PASS（40 KPIs OK、Hard Gate PASS）
- `npm run docs:check` PASS（sections valid、health match committed）
- `npm run lint` PASS（0 errors）
- `npm run build` PASS（tsc -b + vite build、type 整合性）

## 後続 project への引き継ぎ

### SP-D Wave 2 ADR-D-004 への影響

本 SP-C completion により、umbrella inquiry/21 §W2 の起動条件「SP-C completed」が満たされる。SP-D の `aag-temporal-governance-hardening` Wave 2 で ADR-D-004（@deprecated metadata required）を着手可能。

### umbrella architecture-debt-recovery への影響

Lane C（4 ADR / 6 LEG / 1 BC）が全完遂。残 Lane:
- Lane A widget-context-boundary: Wave 2 完遂（SUMMARY draft 済み、Phase 5 step2-7 待ち）
- Lane B widget-registry-simplification: SP-A completed 後に Wave 2 で spawn 予定
- Lane D aag-temporal-governance-hardening: Wave 1 完遂、Wave 2 (ADR-D-004) は本 SP-C completion で起動可能

## 完了条件（達成状況）

- [x] 4 ADR すべての 4 step（新実装 / 移行 / 削除 / guard）完遂
- [x] LEG-010〜LEG-015 の `consumerMigrationStatus` 全て `migrated`
- [x] 4 guard の baseline が 0 到達
- [x] BC-5 rollback 手順を PR description に記載（PR2 / PR3a / PR3b / breaking-changes.md）
- [x] umbrella plan.md 外の破壊的変更なし（`git log` で確認: 本 sub-project の commit はすべて duplicate-orphan-retirement scope 内）
- [x] sub-project completion PR step1（本 SUMMARY 作成）

step2-7 は本 SUMMARY と同一 commit set 内で実施:
- step2: 物理移動 `projects/duplicate-orphan-retirement/` → `projects/completed/duplicate-orphan-retirement/`
- step3: `config/project.json.status: "active" → "completed"`
- step4: `CURRENT_PROJECT.md` 確認（umbrella のままなので no-op）
- step5: `references/02-status/open-issues.md` の active → archived
- step6: umbrella `HANDOFF.md` §1 に SP-C completion 反映
- step7: `projectCompletionConsistencyGuard.test.ts` PASS 確認

## rollback plan

完了 PR の人間承認後に問題が発覚した場合:

- archive 7 step を逆順に revert（git revert）
- sub-project status を `completed → active` に戻す
- 必要に応じて 個別 ADR の PR3b → PR3a → PR2 → PR4 → PR3 → PR2 → PR1 の順で段階 revert（rollback 境界は 1 ADR 単位）
- guard ALLOWLIST と baseline は revert 後に手動修復

## 参照

- umbrella project: `projects/architecture-debt-recovery/`
- 本 project HANDOFF / plan / checklist / breaking-changes / legacy-retirement: 同 directory 内
- 17a addendum: `projects/architecture-debt-recovery/inquiry/17a-orphan-scope-extension.md`
- 完了 PR / commit:
  - PR1〜PR4 各 ADR: 詳細は git log
  - ADR-C-003 PR3a (17a Option A): `b2c9c31 feat(duplicate-orphan-retirement): ADR-C-003 PR3a — F1+F3+F4 削除 (17a Option A)`
  - ADR-C-003 PR3b (17a 拡張 cascade): `8d852bd feat(duplicate-orphan-retirement): ADR-C-003 PR3b — F2 + 拡張 cascade 削除 (17a Option A)`
  - ADR-C-003 PR3c (docs only): `f5c9d15 docs(duplicate-orphan-retirement): ADR-C-003 PR3c — Phase 3 完了確定 + 17a final 化`

## 歴史的意義

本 sub-project は umbrella `architecture-debt-recovery` の **Phase 6 Wave 1** で spawn された Lane C。3 種の負債（複製 / orphan / barrel）を体系的に撤退し、各々を再発防止 guard で fixed mode に到達させた。

特筆すべき設計判断:

1. **fixed mode 戦略の徹底** — 4 guard 全てを baseline=0 + ALLOWLIST 空 + 増加方向禁止に到達させ、再発防止構造を完成。「気をつける」運用から「通らない」運用への移行を完遂

2. **17a Option A による cascade 拡張** — inquiry/03 の見落としを発見した時点で、scope 縮退（保留）でなく scope 拡張（dead code 排除）を選択。short-term cost > long-term clarity の原則

3. **17a 評価精度 learning の制度化** — 17a final §推奨に「barrel sibling 経路 + hook chain の最後まで追跡」を learning として記録。後続 inquiry の audit 規律として活用可能

「complete dead code elimination」を BC を伴う段階的削除で達成した本 sub-project は、umbrella plan §2 不可侵原則 #10（レガシー撤退）と #1（出口まで詰める）を両立した模範例。
