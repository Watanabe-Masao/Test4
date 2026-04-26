# HANDOFF — phased-content-specs-rollout

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**本 project は 2026-04-26 に SHELL モードへ降格。canonical な Phase A〜J 計画は
`projects/architecture-debt-recovery/inquiry/22-content-state-layer-promotion-plan.md`
に移管された。**

### 状態遷移の経緯

| 日付 | 事象 |
|---|---|
| 2026-04-26 | 独立 sub-project として spawn（Level 2 / docs-only） |
| 2026-04-26 | umbrella plan.md §3 不可侵原則 #16「Phase 4/5 計画を経由せずに sub-project を立ち上げない」遵守 + 軽量起動の原則に従い、canonical 計画 doc を **`inquiry/22-content-state-layer-promotion-plan.md`** に移管。本 project は **SHELL（promotion 待ち）** に降格 |

### 現状の役割

- **canonical な Phase A〜J 計画 + SP-B absorption 戦略**: umbrella `inquiry/22-content-state-layer-promotion-plan.md`
- **本 project**: Phase C 以降が **umbrella 直接実装で重量化したと判明した時点で activate される promotion target shell**。trigger は inquiry/22 が `18a-content-state-layer-promotion.md` にエスカレートされたとき
- **本 project の `plan.md` / `checklist.md`**: 将来 promotion 時の参考骨格。**正本は inquiry/22**。差分が出た場合は inquiry/22 を canonical として扱う

### 主な前提（2026-04-26 時点）

- **SP-A widget-context-boundary**: 2026-04-25 archive 完了（`projects/completed/widget-context-boundary/SUMMARY.md`）
- **SP-C duplicate-orphan-retirement**: 2026-04-25 archive 完了
- **SP-B widget-registry-simplification**: 起動条件解除済み（umbrella `HANDOFF.md` §「Wave 2 spawn 高優先」）
- **PR #1148**: merged（merge commit `26fc5f4`）、head `bc103ea` CI success

### spawn 時 landed (本 commit)

- `config/project.json`（Level 2 / docs-only / parent: architecture-debt-recovery）
- `AI_CONTEXT.md`（why / scope / read order）
- `HANDOFF.md`（本ファイル）
- `plan.md`（Phase A〜J 構造 + 不可侵原則 + 依存グラフ）
- `checklist.md`（Phase 0〜J + 最終レビュー）
- `projectization.md`（AAG-COA 判定）
- `aag/execution-overlay.ts`（initial 空）

### 着手前提（Phase A 以降）

| 前提 | 状態 |
|---|---|
| umbrella inquiry/01a Phase 6 frontmatter generator landed | 未着手（umbrella 側 Phase 6 量産時） |
| `AR-CONTENT-SPEC-*` 5 件の active 化 | 未着手（umbrella 側 Phase 6） |
| `obligation-collector.ts` への OBLIGATION_MAP entry 追加 | 未着手（umbrella 側 Phase 6） |
| SP-B (widget-registry-simplification) status | planned（spawn 待ち） |

## 2. 次にやること

本 project は SHELL モード。**作業は inquiry/22 + SP-B 側で進む**。詳細は
`checklist.md` を参照（最終レビュー以外は inquiry/22 と SP-B が canonical）。

### 高優先（本 project 外で進む作業）

- **inquiry/22 を canonical 計画 doc として人間 review** — Phase A〜J 順序・対象・
  完了条件が SP-B / SP-C / SP-D の実態と整合しているか検証する
- **SP-B spawn 時の Phase A/B absorption** — SP-B (widget-registry-simplification)
  bootstrap で Phase A/B を SP-B 内 plan/checklist に取り込む（inquiry/22 §「SP-B への
  absorption 戦略」段階 1）

### 中優先（promotion 判断 trigger）

本 project が SHELL から ACTIVE に昇格する trigger:

- Phase C 以降が単一 PR で済まないと判明
- 新 Architecture Rule の active 化を含む Phase が必要
- 破壊的 type 変更（spec frontmatter schema 拡張等）を含む Phase が必要
- ratchet-down baseline 戦略が必要

trigger 発火時は umbrella `inquiry/18a-content-state-layer-promotion.md` を作成して
正式 sub-project bootstrap に進む（inquiry/22 §「段階 3: 必要に応じた sub-project 化」）。

### 低優先

- 本 project の `plan.md` / `checklist.md` を inquiry/22 と差分検出する仕組みは導入しない
  （drift コストの方が高い）。promotion 時に inquiry/22 から再生成する

## 3. ハマりポイント

### 3.1. 「初回スコープ外」の表現を本 plan に持ち込まない

不可侵原則 1 違反。本 project の存在意義は「Phase B 以降を放棄しないこと」を
明文化することにある。`plan.md` / `checklist.md` / `AI_CONTEXT.md` に「out of scope」
「非対象」「初回除外」のような表現が混入したら不可侵原則違反として差し戻す。

正しい表現: 「Phase X で着手する」「依存 Phase 完了後に Wave 化する」。

### 3.2. Phase A の対象を 5 件から拡大しない

Anchor Slice の目的は **「対象網羅」ではなく「保証経路完成」**。
WID-033 / WID-040 / WID-018 / WID-006 / WID-002 の 5 件で source / spec / guard / CI の
4 経路 end-to-end が確認できれば、後続 Phase は同じ仕組みの対象拡大として
段階導入できる。Phase A で 6 件目以降に手を広げると、保証経路が完成する前に
重量化して目的を失う（plan.md 不可侵原則 3）。

### 3.3. 本 project は SHELL モード — 計画の正本は inquiry/22

2026-04-26 降格以降、本 project の `plan.md` / `checklist.md` は **promotion 待ちの
参考骨格**であり canonical ではない。Phase A〜J の実態管理は次の経路で行う:

- **canonical 計画 doc**: umbrella `inquiry/22-content-state-layer-promotion-plan.md`
- **Phase A/B 実装**: SP-B (widget-registry-simplification) spawn 時に absorption
- **Phase C 以降の実装判断**: inquiry/22 §「段階 2: SP-B 完了後」 の軽量パス / 重量パス判定
- **正式 sub-project 化**: 重量パス trigger 発火時に `inquiry/18a-content-state-layer-promotion.md`
  作成 + 本 project を ACTIVE に昇格

### 3.4. Phase F 以降は selection rule 必須

UI Components / Charts / Storybook 連携 等を全網羅すると drift コストで運用が崩壊する。
Phase F の 6 条件 / Phase E の 4 条件は「selection 必須」を明示するための
sentinel。条件追加で網羅範囲が広がるのは OK、条件削除で全網羅に近づくのは NG
（plan.md 不可侵原則 + C9 現実把握優先）。

### 3.5. content-spec-health.json は Phase H で初出

Phase H 完了前に `references/02-status/generated/content-spec-health.json` を
参照する CLAUDE.md 記述・docs:check 経路を追加してはならない。Phase H で collector
を実装してから初めて生成される。先行参照すると `docRegistryGuard` で fail する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| **`projects/architecture-debt-recovery/inquiry/22-content-state-layer-promotion-plan.md`** | **canonical 計画 doc（Phase A〜J + SP-B absorption 戦略 + 最終方針 5 つ）** |
| `AI_CONTEXT.md` | why / scope / parent / read order |
| `plan.md` | Phase A〜J 構造（**inquiry/22 が canonical / 本ファイルは shell の参考骨格**） |
| `checklist.md` | Phase 0〜J completion 条件（同上） |
| `projectization.md` | AAG-COA 判定 (Level 2 / docs-only / shell) |
| `config/project.json` | project manifest |
| `aag/execution-overlay.ts` | rule overlay（initial 空） |
| `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | SP-A〜D 依存関係 |
| umbrella `HANDOFF.md` | Wave 2 spawn 高優先（SP-B 起動条件解除済み） |
| `projects/completed/widget-context-boundary/SUMMARY.md` | SP-A archive 完了（2026-04-25） |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 |
| `references/03-guides/project-checklist-governance.md` | AAG Layer 4A 運用ルール |
