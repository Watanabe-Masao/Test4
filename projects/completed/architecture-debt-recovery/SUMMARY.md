# SUMMARY — architecture-debt-recovery (umbrella)

> **役割**: completion 記録（final）。後続 project が本 umbrella の経緯・成果物・
> 引き継ぎ先を参照するためのサマリ。
>
> **status (本 file)**: **final（2026-04-26 archive 完了）**。
> Phase 7 完了 + 4 sub-project (SP-A/B/C/D) すべて archived。

## 完了日

**2026-04-26** — SP-D `aag-temporal-governance-hardening` archive (commit
`bc3ff12`) で全 4 sub-project 完遂。本 umbrella も Phase 7 で archive。

## 目的（再掲）

`budget-achievement-simulator` reboot で表面化した **widget 複雑化 7 項目** を
起点に、**widget / pure 関数 / 型 / コンポーネント / データパイプライン /
レガシー撤退 / governance** を一体として扱う大型改修 umbrella project。

## 成果物（landed）

### 4 sub-project archive 完遂

| Lane | sub-project | archived | 主な成果（定性） |
|---|---|---|---|
| **A** | `widget-context-boundary` | 2026-04-25 | UnifiedWidgetContext page-local 剥離 / DashboardWidgetContext 集約 / WidgetDef 2 型分離 / chokepoint narrowing 確立。BC-1〜BC-4、LEG-001〜007 sunset |
| **B** | `widget-registry-simplification` | 2026-04-26 | registry 行 4 種冗長 pattern 解消 (二重 null check / full ctx passthrough / IIFE / inline function & palette refs)。4 guard fixed mode、LEG-009 sunset |
| **C** | `duplicate-orphan-retirement` | 2026-04-25 | features/widgets.tsx 解消 / useCostDetailData 単一正本化 / Tier D orphan + 17a Option A 拡張 cascade 全削除 (BC-5) / barrel metadata 必須化。LEG-010〜015 sunset |
| **D** | `aag-temporal-governance-hardening` | 2026-04-26 | reviewPolicy 必須化 (BC-6) / allowlist metadata 必須化 (BC-7) / generated remediation / projectDocConsistencyGuard / @deprecated metadata + lifecycle 監視 (LEG-008 sunset) / G8-P20 useMemo body fixed mode (208→20、28 件抽出)。5 guard fixed mode |

ADR / PR / guard / LEG の通算メトリクスは
`references/02-status/generated/architecture-debt-recovery-remediation.json`
（active 期間中に生成、Phase 7 archive と同時に snapshot として保存）を参照。

### Breaking Changes 全 7 件達成

| BC ID | 対象 | 実施 sub-project |
|---|---|---|
| BC-1 | `UnifiedWidgetContext` page-local optional 5 field 剥離 | SP-A |
| BC-2 | `UnifiedWidgetContext` Dashboard 固有 20 field 削除 + DashboardWidgetContext 置換 | SP-A |
| BC-3 | `WidgetDef` 同名 2 型を 2 つに分離 | SP-A |
| BC-4 | `StoreResult` / `PrevYearData` discriminated union 化 | SP-A |
| BC-5 | Tier D orphan 3 件 物理削除 | SP-C |
| BC-6 | `RuleOperationalState.reviewPolicy` optional → required | SP-D |
| BC-7 | `AllowlistEntry` metadata required 昇格 | SP-D |

### Legacy 撤退 全 15 件達成

| Lane | LEG ID | 状態 |
|---|---|---|
| A | LEG-001〜007 | ✅ migrated (SP-A 完遂) |
| B | LEG-009 | ✅ migrated (SP-B 完遂) |
| C | LEG-010〜015 | ✅ migrated (SP-C 完遂) |
| D | LEG-008 | ✅ migrated (SP-D ADR-D-004 完遂) |

### guard fixed mode 達成（合計 14+ guard）

主要 guard の固定モード移行:

| Lane | guard | 状態 |
|---|---|---|
| A | `unifiedWidgetContextNoDashboardSpecificGuard` / `unifiedWidgetContextNoPageLocalOptionalGuard` / `widgetDefBoundaryGuard` ほか | ✅ fixed |
| B | `shortcutPatternGuard` / `fullCtxPassthroughGuard` / `registryInlineLogicGuard` (I1/I2/I3) | ✅ fixed |
| C | `barrelReexportMetadataGuard` / `barrelImportRequirementGuard` / `featureWidgetsImportGuard` / `useCostDetailDataSingularityGuard` | ✅ fixed |
| D | `reviewPolicyRequiredGuard` / `allowlistMetadataGuard` / `deprecatedMetadataGuard` / `responsibilitySeparationGuard` G8-P20 / `projectDocConsistencyGuard` | ✅ fixed |

### Phase 1-5 inquiry 全 21 ファイル完成

| Phase | inquiry | 内容 |
|---|---|---|
| 1 | 01-08 (8 files) | 棚卸し: registry / ctx field / orphan / 型非対称 / pure fn 候補 / data pipeline / 複雑度 hotspot / UI 責務監査 |
| 2 | 09-11 (3 files) | 真因分析: 仮説 / 相互作用 / 再発 pattern |
| 3 | 12-14 (3 files) | 原則制定: 設計原則候補 / 不変条件候補 / rule retirement |
| 4 | 15-18 (4 files) | 改修計画: remediation plan / breaking changes / legacy retirement / sub-project map |
| 5 | 19-21 (3 files) | 既存 project 整理 + spawn: predecessor 引き継ぎ / current project 切替 / spawn sequence |
| 1-5 addendum | 01a / 10a / 17a | Phase 進行中の追補 |

## 主要設計決定

### 1. **棚卸し → 真因分析 → 原則制定 → 計画 → 実装** の 5 Phase pattern

Phase 1-5 期間中はコード変更を一切行わず、Phase 6 以降で実装に入る。
inquiry/ 全 21 ファイルが「事実源（ファイルパス / 行番号 / commit hash）付き」を
維持し、意見 / recommendations を Phase 1-2 で混入させない規律。

**教訓**: 大型改修では「棚卸し純度」を Phase 1 で確保することで Phase 6 実装時の
判断ぶれを防げる。

### 2. **4 sub-project pattern** で並列実装

Phase 6 では 4 sub-project (SP-A/B/C/D) を依存関係に従って Wave 別に spawn:
- Wave 1: SP-A / SP-C / SP-D（並列）
- Wave 2: SP-A 完遂後 SP-B spawn
- Wave 3: SP-B 完遂後 SP-D Wave 3 (ADR-D-003) 起動

各 sub-project は umbrella plan §2 不可侵原則に従い、独立した checklist で
completion 判定。

**教訓**: umbrella と sub-project の責務分離 (umbrella = 計画 + 監督、
sub-project = 実装 + guard) が大型改修の並行実行を可能にした。

### 3. **4 step pattern** で各 ADR を完遂

各 ADR は次の 4 step で実施:
- **PR1**: 新実装 / 実測 baseline で凍結
- **PR2**: 移行 / bulk 整備
- **PR3**: 旧コード削除 / required 昇格 (breaking change)
- **PR4**: guard fixed mode / lifecycle 監視

**教訓**: 「実測 baseline → ratchet-down → fixed mode」の段階移行で破壊的変更の
ロールバック粒度を確保しつつ最終的に hard fail に到達。

### 4. **breaking change の独立 PR**

7 BC すべてを bulk 整備 commit と分離して独立 PR 化。各 BC のロールバックを
sub-project PR4 → PR3 → PR2 → PR1 の順で段階 revert 可能に。

### 5. **G8-P20 の段階削減 (208→20)** ※SP-D ADR-D-003

useMemo body 行数を 4 step + 4 sub-step (208→120→75→67→38→28→20) で削減。
**28 件 useMemo を pure builder に抽出**し、最終的に上限 20 行 fixed で固定。

### 6. **generated remediation で進捗の機械可読化** ※SP-D ADR-D-005

6 ADR × 多数 step の進捗を JSON として生成し、project-health 経由で全体可読性を
向上。drift 検出も組込。

## CI gate（本 umbrella 期間中の通過実績）

- `npm run test:guards` PASS（最終 108 files / 786 tests）
- `npm run docs:generate` PASS（KPIs OK 44/44、Hard Gate PASS）
- `npm run docs:check` PASS（sections valid、health match committed）
- `npm run lint` PASS（0 errors）
- `npm run build` PASS（tsc -b + vite build、type 整合性）
- `npm test` PASS（最終 724 files / 9,735 tests）

## 後続 project への引き継ぎ

### holdover task（scope 外持ち越し 1 件）

- **G8-P21 widget 直接子数 baseline 削減** — AST ベース解析が必要なため別 PR に分離。
  quick-fix project / 個別 sub-project で着手予定（umbrella scope 外、Phase 4
  inquiry/15 §ADR-D-003 で別 PR に切り出し済）

### 次の active project（CURRENT_PROJECT.md 切替先）

`presentation-quality-hardening` — Presentation 品質強化 (テスト / E2E / active-debt 解消)

### umbrella を起点にした派生原則 / 不変条件

- `references/03-guides/invariant-catalog.md` に Phase 3 不変条件候補が登録済
- `references/01-principles/` に Phase 3 原則候補が配置済 + `docs/contracts/principles.json` に登録
- 詳細は inquiry/12, inquiry/13 を参照

## 完了条件（達成状況）

`checklist.md` Phase 0-7 + 最終レビューが正本（本 SUMMARY は要約）。実施完了状態:

- [x] Phase 0: Scaffold 完了
- [x] Phase 1: Inquiry 全 8 + addendum 完了（コード変更なし規律遵守）
- [x] Phase 2: 真因分析 全 3 完了（コード変更なし規律遵守）
- [x] Phase 3: 原則制定 全 3 完了
- [x] Phase 4: 改修計画 全 4 完了（remediation plan / 7 BC / 15 LEG / sub-project map）
- [x] Phase 5: 既存 project 整理 + Wave 0 切替 PR 完了
- [x] Phase 6: 4 sub-project 全完遂、全 7 BC + 全 15 LEG 達成
- [x] Phase 7: SUMMARY / open-issues / docs / guards / archive 全実施

## rollback plan

完了 PR の人間承認後に問題が発覚した場合:

- archive 7 step を逆順に revert（git revert）
- umbrella status を `completed → active` に戻す
- 各 sub-project の rollback は独立 (sub-project PR4 → PR3 → PR2 → PR1 の順で
  段階 revert)
- guard ALLOWLIST と baseline は revert 後に手動修復

## 参照

- 4 sub-project SUMMARY:
  - `projects/completed/widget-context-boundary/SUMMARY.md`
  - `projects/completed/widget-registry-simplification/SUMMARY.md`
  - `projects/completed/duplicate-orphan-retirement/SUMMARY.md`
  - `projects/completed/aag-temporal-governance-hardening/SUMMARY.md`
- 起点 project:
  - `projects/completed/budget-achievement-simulator/SUMMARY.md` (lineage)
- inquiry/ 全 21 ファイル: 同 directory 内
- 主要 commit:
  - **Phase 5 切替 PR**: Wave 0 active 昇格 + predecessor archive
  - **Phase 6 Wave 1**: `6e2a0d8` (SP-A/C/D spawn)
  - **SP-A archive**: `4cbf3da` (SP-A + SP-C 同時)
  - **SP-B archive**: `e5b6daf`
  - **SP-D archive**: `bc3ff12`
  - **本 umbrella archive**: 本 commit

## 歴史的意義

本 umbrella project は `budget-achievement-simulator` reboot で表面化した
**widget 複雑化 7 項目** を起点に、根本解決のため **5 Phase × 4 sub-project ×
4 step pattern** で大規模改修を実施した模範例。

特筆すべき達成:

1. **棚卸し純度 100%** — Phase 1-2 期間中にコード変更を一切行わず、事実源付き
   inquiry/ 全 21 ファイルを完成

2. **7 BC + 15 LEG 完全達成** — 計画外の破壊的変更を 0 件で済ませ、すべての
   legacy item を sunset

3. **14+ guard fixed mode** — ratchet-down → fixed mode の段階移行で構造保証を
   機械化

4. **4 sub-project 並列実行** — umbrella と sub-project の責務分離 + Wave 構造で
   依存関係を明示しつつ並列実装

5. **G8-P20 useMemo body 上限 20 行 fixed** — SP-D ADR-D-003 で 208→20 を 4 step
   + 4 sub-step で達成、28 件 useMemo を pure builder に抽出

6. **governance に時計を持たせる** — SP-D で reviewPolicy / @expiresAt /
   lastReviewedAt の 3 metadata 必須化により、rule / allowlist / @deprecated の
   経年劣化を構造的に検出可能化

「広範な範囲を扱いつつ計画外の変更を混入させない」「ratchet-down で段階達成しつつ
最終的に hard fail で固定する」「sub-project 単位でロールバック可能性を確保する」
の 3 原則を体現した本 umbrella は、Phase 8 以降の大型改修の参照モデルとなる。
