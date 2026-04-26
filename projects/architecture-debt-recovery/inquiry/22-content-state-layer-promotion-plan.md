# inquiry/22 — Content State Layer Promotion 段階展開計画

> **役割**: `inquiry/01a-widget-specs-bootstrap.md` で立ち上げた Widget Spec System (WSS) を、
> SP-B (widget-registry-simplification) の改修と相乗的に **Content State Layer** へと
> 段階的に昇格させる計画書。Wave 2 spawn の補助 inquiry。
>
> **形式**: SP-B を支援する**計画書 / addendum**として運用する。**独立 sub-project では
> 立てない**（umbrella plan.md §3 不可侵原則 #16「Phase 4/5 計画を経由せずに sub-project
> を立ち上げない」遵守 + 軽量起動の原則）。
>
> **status**: **draft（2026-04-26 起草）**。SP-B spawn / SP-B PR1 前後に absorption 可否を
> 確認し、必要に応じ **`18a-content-state-layer-promotion.md`** を作成して正式 sub-project 化
> する（escalation path）。
>
> **判断主体**: `architecture` ロール（pm-business + 人間承認、Phase 4 計画整合性は
> umbrella plan.md §3 Phase 4 に従う）

## 経緯（現在地）

| 日付 | 事象 | 出典 |
|---|---|---|
| 2026-04-23 | inquiry/01a で WSS bootstrap landed（`05-contents/widgets/` scaffold + 45 件 型番割当） | `inquiry/01a-widget-specs-bootstrap.md` |
| 2026-04-25 | **SP-A widget-context-boundary completed / archived** — ctx 型境界 / WidgetDef 分離 / chokepoint narrowing 確定 | `projects/completed/widget-context-boundary/SUMMARY.md` |
| 2026-04-25 | **SP-C duplicate-orphan-retirement completed / archived** | umbrella `HANDOFF.md` |
| 2026-04-25 | **SP-B widget-registry-simplification 起動条件解除済み** | umbrella `HANDOFF.md` §「Wave 2 spawn 高優先」 |
| 2026-04-26 | 本 inquiry 起草（PR #1148 merged, head bc103ea, CI success 確認後） | 本ファイル |

> **更新ポイント**: 旧版「SP-A archive 後に開始可能」→ 新版「**SP-A は 2026-04-25 に archive 完了済み。SP-B は起動条件解除済み。Content State Layer Promotion は SP-B spawn / SP-B PR1 前後の補助計画として投入可能**」。

## 計画として妥当な 4 理由

1. **SP-A が完了済み** — ctx 型境界 / WidgetDef 分離 / chokepoint narrowing が確定したため、
   SP-B で registry simplification に進める前提が整っている
2. **SP-B が次の主対象** — umbrella `HANDOFF.md` 上で次は Wave 2 spawn (SP-B + SP-D-continued
   D-004)
3. **05-contents/widgets は既に存在する** — WSS 45 widget spec scaffold が landed 済み。
   Content State Layer Promotion は **ゼロからの新設ではなく、既存 WSS の昇格**として扱える
4. **SP-B と相乗効果がある** — SP-B は二重 null check / full ctx passthrough / IIFE /
   registry inline logic を触るため、**WID 単位の状態管理 / source ↔ spec 同期 /
   co-change guard の効果が直接出る**

## Phase 構造（A〜J）

### 設計思想

Phase A の目的は **「対象を網羅すること」ではなく「保証経路を完成させること」**。
次の 4 経路が SP-B Anchor Slice に対して end-to-end で動くことを確認する。

| 経路 | 検証内容 |
|---|---|
| source | `@widget-id WID-NNN` JSDoc が registry 登録 entry に注入されている |
| spec | `references/05-contents/widgets/WID-NNN.md` が振る舞いを記録 |
| guard | 5 件の `AR-CONTENT-SPEC-*` rule が active で source ↔ spec drift を検出 |
| CI | `npm run docs:check` が drift を hard fail させる |

この 4 経路が SP-B 改修の vertical slice で実用可能なら、後続 Phase は
**同じ仕組みの対象拡大**として段階導入できる。

Phase F（UI Components）以降は **「全網羅」ではなく selection rule を満たすもののみ**。
過剰網羅は drift コストを上げ、運用負荷を増やす（CLAUDE.md §C9: 現実把握優先）。

### Phase 一覧

| Phase | 対象 | 完了条件 |
|---|---|---|
| **A: SP-B Anchor Slice** | WID-033 / WID-040 / WID-018 / WID-006 / WID-002 + 関連 RM/PIPE/CALC/PROJ/CHART を最小追加 | 対象 5 slice で `missingSpec / frontmatterDrift / coChangeViolation = 0`、`docs:check` で hard fail |
| **B: SP-B 対象全体** | B-001〜B-004 対象 WID 全体 | SP-B 対象 WID `missingSpec / frontmatterDrift / coChangeViolation = 0`、SP-B 範囲の content graph 生成 |
| **C: ReadModels / Pipelines** | `application/readModels/` / `application/queries/` / queryHandlers / projections（SP-B 依存鎖から拡張） | 主要 RM/PIPE `missingSpec = 0`、QH/PROJ `sourceRef drift = 0`、pipeline lineage 追跡可 |
| **D: Domain Calculations** | `domain/calculations/`（invariant / test を持つ重要計算から） | 対象 CALC `missingSpec = 0`、tests 参照 100%、invariant 付き CALC test 参照 100%、deprecated CALC `sunsetCondition` 100% |
| **E: Charts** | `presentation/components/charts/`（SP-B 対象 widget の child chart から） | 主要 chart `missingSpec = 0`、input builder 参照 100%、visual/e2e evidence required で evidence 設定済み |
| **F: Selected UI Components** | 全 UI ではなく **重い責務 / 複数 consumer / SP-B/C/D 影響対象** のみ（selection rule 適用） | 対象 UIC `missingSpec = 0`、props `sourceRef drift = 0`、story/visual evidence 設定 |
| **G: Storybook / Visual Evidence** | UI/Chart の状態証拠（loading / empty / ready / error） | evidence coverage 基準値以上、empty/error state の story coverage 基準値以上 |
| **H: Architecture Health KPI** | `content-spec-health.json` 新設 + summary 反映 | `contentSpec.{total, byKind, missingSpec, frontmatterDrift, coChangeViolation, stale, missingOwner, lifecycleViolation, evidenceCoverage}` の 9 KPI が出力、threshold/budget 設定 |
| **I: PR Impact Report** | `npm run content-specs:impact -- --base main --head HEAD` CLI から開始、必要に応じ PR bot 化 | CLI 実用可能、CI artifact として保存、必要に応じ bot 昇格 |
| **J: Claim Evidence Enforcement** | `evidenceLevel` 段階導入（J1 任意 → J2 4 分類 → J3 high-risk 制限 → J4 tested 必須 → J5 guarded 必須） | high-risk claim `evidenceLevel=asserted` が 0、tested/guarded claim の参照欠落 0 |

### Phase 依存

```text
A ─→ B ─→ C ─→ D ─→ E ─→ F ─→ G ─→ H ─→ I ─→ J
```

各 Phase は前 Phase 完了後に着手（Wave 構造）。

## SP-B への absorption 戦略

本 inquiry は SP-B を支援する計画書として運用する。具体的には次の 3 段階で absorb される。

### 段階 1: SP-B spawn 時（Wave 2）

SP-B (widget-registry-simplification、`projectId: widget-registry-simplification`) の
bootstrap 時に:

- SP-B project の `plan.md` の Phase 構造に **Phase A / B を取り込む**
- SP-B project の `checklist.md` に Phase A / B の完了条件を追加
- 対応する WID-NNN.md の本文量産 PR を ADR-B-001〜004 と同 sprint で実施

> SP-B project root path は spawn 時に確定する。本 inquiry はパス参照を含めない —
> SP-B spawn 時に absorb 側が plan.md / checklist.md を更新する。

> SP-B 内の Phase 構造例:
>
> | SP-B Phase | 内容 |
> |---|---|
> | Phase 1 | guard 追加 (3 guard baseline) — 既存計画 |
> | Phase 2 | selector / helper 実装 — 既存計画 |
> | **Phase 2.5（新規）** | **Content Spec Phase A: Anchor Slice 5 件の保証経路完成** |
> | Phase 3 | registry 行 path 切替 — 既存計画 |
> | **Phase 3.5（新規）** | **Content Spec Phase B: SP-B 対象 WID 全体の spec 同期** |
> | Phase 4 | guard baseline=0 — 既存計画 |

### 段階 2: SP-B 完了後（Wave 3 以降）

Phase C 以降（ReadModels / Pipelines / Calculations / Charts / UI / Storybook / KPI / Impact / Evidence）は SP-B 完了後の sub-project として spawn 判断。

- **軽量パス**: 各 Phase を umbrella の小規模な作業 PR として実施（sub-project 化しない）
- **重量パス**: `inquiry/18a-content-state-layer-promotion.md` を作成して **正式 sub-project 化**（umbrella plan.md §3 Phase 4 計画再評価 → §3 Phase 6 で sub-project bootstrap）

判断基準: Phase C 着手時点で **影響範囲 × ratchet-down baseline 戦略 × 破壊的変更**を再評価。
重量級が必要なら sub-project 化、軽量で済むなら直接実施。

### 段階 3: 必要に応じた sub-project 化

下記 trigger で `18a-content-state-layer-promotion.md` を作成して umbrella 内で正式 sub-project に escalate する。

- Phase C 以降が単一 PR で済まないと判明
- 新 Architecture Rule の active 化を含む
- 破壊的 type 変更（spec frontmatter schema 拡張等）を含む
- ratchet-down baseline 戦略が必要

## 最終方針（5 つの不可侵）

本計画の運用上、以下を不可侵とする。

1. **対象は SP-B に直結させる** — Phase A の 5 件は SP-B Anchor Slice の改修対象。「網羅」目的で対象を拡大しない
2. **保証は source / spec / guard / CI まで深く入れる** — 表面だけ整えて drift を放置しない
3. **「初回スコープ外」は段階移行計画に載せる** — 「やらないこと」ではなく「順番を後にすること」として明記する（Phase B〜J を放棄しない）
4. **正しさではなく現状一致を保証する** — spec は behavior の現状記録。「あるべき姿」を spec に書かない（CLAUDE.md §C9: 現実把握優先 / 05-contents/README.md §「振る舞いの記述」）
5. **正しさに近い主張は test / evidence で補強する** — Phase J で `evidenceLevel` を段階導入、high-risk claim だけ evidence 必須

## 関連

| 文書 | 役割 |
|---|---|
| `inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `inquiry/18-sub-project-map.md` | SP-A〜D 依存関係（SP-B が次の主対象） |
| `inquiry/21-spawn-sequence.md` | sub-project 立ち上げ順序 |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御 + frontmatter 共通スキーマ） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 |
| `projects/completed/widget-context-boundary/SUMMARY.md` | SP-A archive 完了（2026-04-25）|
| umbrella `plan.md` §3 不可侵原則 #16 | sub-project spawn は Phase 4/5 計画経由必須 |
| umbrella `HANDOFF.md` §「Wave 2 spawn 高優先」 | SP-B 起動条件解除済み |

## 進捗ノート（addendum 規約）

本 inquiry は **draft → SP-B absorption 確認 → final** の 3 状態を持つ。
状態遷移時は本ファイル冒頭の **status** を更新する（人間承認時刻 + 承認者ロール明記）。

`inquiry/17 §再発防止規約 5` に従い、本 file 自体は**追記のみ可能**。
Phase A〜J の構造変更が必要になった場合は **`22a-*.md` addendum** を作成する。
