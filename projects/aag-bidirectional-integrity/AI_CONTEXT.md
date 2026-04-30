# AI_CONTEXT — aag-bidirectional-integrity

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Meta 確立 + AAG Core doc 群の責務再定義 + 双方向 integrity の機械化 + 表示 rule 製本化
（aag-bidirectional-integrity） — **active**

## Status

**active → MVP 完遂 (2026-04-30、Phase 3 hard gate B 確定)**。

- **2026-04-29 spawn**: parent project (`phased-content-specs-rollout`) 末セッションの dialog で発見された AAG 構造的弱点 (双方向 integrity 不在 + AAG Meta articulation 不在 + drill-down chain semantic 管理不在) の根本対策として独立 active project で spawn
- **2026-04-30 plan refinement**: 経営階層 drill-down 視点で 0 ベース re-derivation、5 層 × 5 縦スライス matrix + 3 軸 (AAG Meta / Core / Audit) + 7 operation taxonomy + decision gates 制度化 + Phase 3 hard gate 必須化を articulate
- **2026-04-30 §8.14 順序付き 3 段階 完遂**:
  - 第 1 段 (Phase 1 skeleton landing): aag/meta.md + aag/README.md + Requirement ID namespace `AAG-REQ-*` 12 件 (PR #1216-#1223 merged)
  - 第 2 段 (Phase 3 audit landing): aag-doc-audit-report.md (8 doc + CLAUDE.md AAG section、13 deliverable、800+ 行)
  - 第 3 段 (Phase 1 §3 fill cyclic refinement): audit findings を aag/meta.md §3 + §4 に反映
- **2026-04-30 Phase 3 hard gate decision = B 確定**: AI 自主判断 (deferred-decision-pattern §3.1 適用) で **Project A〜D 分割を採用** (audit report §7.2 rationale: scope = Level 4 寄り)
- **MVP 完遂状態**: Phase 1 + Phase 3 + cyclic refinement で完了。Phase 4〜10 は Project A〜D に移管予定
- **次 session**: Project A〜D bootstrap (1 session = 1 project) → 本 project archive プロセスへ migrate

canonical 計画 doc は本 project の `plan.md`。parent: なし。後続: Project A〜D (next session で spawn 予定)。

## Purpose

AAG (Adaptive Architecture Governance) は「機械的品質管理を担う OS / フレームワーク」と
位置付けられているが、次の構造的弱点を持つ:

- **AAG Meta が articulate されていない**: AAG が満たすべき要件 (目的 + 不変条件 + 禁則) を
  単一エントリで articulate する doc がなく、Constitution / 設計原則 / 文化論 が 8 doc に sprawl。
  AI / 後任が「AAG とは何で何でないか」を単一エントリで把握できない
- **forward 方向の弱点**: 設計 doc (canonical doc) で定義された rule が AAG で機械検証されず、製本が「装飾」になる
- **reverse 方向の弱点**: AR-rule が製本されていない proxy / 派生 metric を回し、guard が「performative」になる
- **drill-down chain の semantic 管理不在**: 下位 (実装) が上位 (設計 / 要件 / 目的) の何を課題として
  何を解決しているかが pointer + articulation として機械管理されていない

`phased-content-specs-rollout` の末セッションで撤回した次のケースは、上記 reverse 方向 + semantic 管理不在の
表面化事例:

- visual evidence selection rule (consumer 数 / 365d commits / severity color / optionBuilder) — 製本されていない proxy metric を guard 化していた
- Phase L spawn (PIPE / QH / PROJ) — spec 化されるべき drift / risk が validate されていない状態で spec authoring を guard 化しようとしていた

## 設計の核心 (2026-04-30 0 ベース re-derivation)

### 5 層 drill-down 構造 + 縦スライス (AAG architecture pattern)

AAG は **5 層 (横軸) × 5 縦スライス (縦軸)** の matrix で articulate (= 本プロジェクト本体側
modular monolith evolution と parallel)。経営階層 metaphor は image、正式用語が下表:

**横軸 (5 層 drill-down)**:

| Layer | 用語 | metaphor | 性質 |
|---|---|---|---|
| 0 | **目的** (Purpose) | 経営理念 | AAG の存在意義、人間判断、機械検証不可 |
| 1 | **要件** (Requirements) | 社訓 | 不変条件 + 禁則、機械検証可能 |
| 2 | **設計** (Design) | 経営戦略 | AAG の構造方針 |
| 3 | **実装** (Implementation) | 戦術 | AAG が能動的に行うこと (rule / guard / allowlist / health) |
| 4 | **検証** (Verification) | 外部監査 | AAG が claim と actual を受動的に照合すること、5 sub-audit に細分 (4.1 境界 / 4.2 方向 / 4.3 波及 / 4.4 完備性 / 4.5 機能性、initial set / extensible) |

**縦軸 (5 縦スライス、AAG 既存)**: layer-boundary / canonicalization / query-runtime /
responsibility-separation / governance-ops。各セルに「縦スライスの特定層に住む doc / 実装」が
articulate される (詳細: plan §3.1.3 matrix view)。

**3 軸の役割分担**:
- **AAG Meta** = Layer 0 + 1 (`aag/meta.md` を新規 Create で articulate、目的 + 要件)
- **AAG Core** = Layer 2 + 3 (設計 doc 群 + 実装 = 8 doc + rule + guard + allowlist)
- **AAG Audit** = Layer 4 (検証 = 外部監査視点で AAG 全体を audit、health-rules / Discovery Review / meta-guard / certificate)
- AAG Meta は **目的 (= 評価基準を規定する側)**、AAG Core は **対象 (= 評価される側)**、AAG Audit は **第三者監査 (= claim と actual を照合)**

### 破壊的変更前提

本 project は AAG の根本的整理を行うため、追加コスト / 変更コストを考慮せず必要な変更を遂行する。
既存 AR-NNN rule の振る舞い変更 / 縦スライス境界の reshape / 5 層構造の調整 / AAG framework 構造変更
等を許容 (本体アプリの機能変更は scope 外)。Phase 3 audit + Phase 4 refactor で必要な breaking change
を identify し、Phase 6+ で順次実施。

### drill-down chain の semantic management

各層間の binding は単なる pointer ではなく **重複と参照の切り分け** + **semantic articulation**:

- 重複 (上位 content の copy) は禁止
- 参照は pointer + `problemAddressed` (上位の何を課題として) + `resolutionContribution` (何を解決) を mandate
- 機械検証 + 維持される field として確立 (Phase 8 meta-guard で検証)

### doc operation taxonomy

AAG Core 8 doc の整理は単純な「追加 / 退役」ではなく 7 operation で articulate (Create / Split /
Merge / Rename / Relocate / Rewrite / Archive)。**新規書き起こし優先** (edit-in-place 禁止)、操作順序
原則に従い段階実行。**期間 buffer (日数 / commits 数) を一切使わず inbound 0 trigger** のみで物理削除。

### ディレクトリ階層化案 (Phase 3 audit で確定)

```
references/01-principles/aag/         ← 新ディレクトリ集約
├── README.md, meta.md, strategy.md, architecture.md,
├── evolution.md, operational-classification.md,
├── source-of-truth.md, layer-map.md, display-rule-registry.md
```

`aag-5-` / `adaptive-` prefix は撤廃 (ディレクトリで階層性を表現)。

## Scope

含む:

- **AAG Meta doc (`aag/meta.md`) の新規 Create** (§1 目的 / §2 要件 / §3 AAG Core mapping / §4 達成判定総括 の 4 section、要件定義 + audit framework + AR-rule binding hub の 3 機能融合 mechanism doc)
- **AAG Core 8 doc の content refactoring** (新規書き起こし → 旧 doc 退役、5 層位置付け + 責務 + drill-down semantic articulation を装着、ディレクトリ階層化)
- **AR-rule schema 拡張** (`canonicalDocRef` + `metaRequirementRefs` を semantic articulation 構造で追加)
- **Phase 3 網羅的 doc audit** (各 doc の 5 層位置付け + 責務 + write/non-write list + 影響範囲 + 必要 operation を articulate)
- **Phase 5 legacy 撤退** (旧 doc を inbound 0 trigger で archive 移管 → 物理削除、期間 buffer なし)
- 既存 AR-NNN rule 全数の audit (製本されているか / されていないか) + binding 整備
- Layer 2 既存 canonical doc 群への `## Mechanism Enforcement` section 追加 + drill-down semantic 装着
- forward / reverse 双方向 meta-guard の実装 (semantic articulation 検証含む)
- display-rule registry (`aag/display-rule-registry.md`) の製本化と DFR-001〜DFR-005 の登録
- 各 DFR rule の guard 実装と baseline 確定 (観測済 drift を ratchet-down 起点に)

含まない:

- **AAG Core 既存 doc の edit-in-place で意味改変** (Phase 4 doc refactor は新規書き起こし → 旧 doc 退役 のみ)
- **AAG 関連以外の doc の整理** (canonicalization / business-values / design / coding-conventions 等は別 project、scope creep 防止)
- **本体アプリ (粗利管理ツール) の機能変更**
- **既存 AR-NNN rule の無制限な全面再設計** (Phase 6 audit を経た rule by rule の振る舞い変更 / proxy 撤回 / enforcement logic 変更 / schema migration は **scope 内** = 破壊的変更前提、§1.2 #10、breaking-changes.md §1.6 参照)
- `phased-content-specs-rollout` の archive 判定への干渉 (parent は独立に archive process を進める)
- date-based ritual の導入 (cooling period / 月次 review hook 等 = aag/meta.md §2 禁則で構造禁止)
- **期間 buffer (日数 / commits 数)** を archive trigger に使う (anti-ritual)
- **重複 articulation の生成** (上位 content の copy を下位 doc に書く、§3.4.2 anti-duplication)
- **Layer 0 (目的) を機械検証可能 condition に変換しようとする** (Layer 0 は人間判断のみ)

## Why this project exists

`phased-content-specs-rollout` の末セッション dialog で発見された **AAG の構造的弱点**
(双方向 integrity 不在 + AAG Meta articulation 不在 + drill-down chain semantic 管理不在) は、
parent project の scope (content spec rollout) には収まらない AAG core の進化テーマであるため
独立 active project として spawn。

CLAUDE.md の AAG セクション「**AAG が PASS した後に立ち上がる問い**」が想定する critical
thinking は人間の能動的姿勢に依存しており、構造的に保証されていない。本 project はこの
不足を **AAG Meta 確立 + drill-down chain semantic management の機械化** として解消する。

## Read Order

1. 本ファイル (why / scope / read order)
2. `HANDOFF.md` (現在地 / 次にやること / ハマりポイント)
3. **`plan.md`** (canonical 計画 doc — Phase 1〜10、§3 設計思想 §3.4 semantic management 必読)
4. `checklist.md` (completion 判定の入力 — Phase 別 required checkbox 集合)
5. `projectization.md` (AAG-COA 判定 Level 3 / governance-hardening)
6. `legacy-retirement.md` (Phase 5 sunset / archive 計画、inbound 0 trigger)
7. **`references/01-principles/adaptive-architecture-governance.md`** (旧 AAG マスター、Phase 4 で Split + Rewrite)
8. **`references/01-principles/aag-5-constitution.md`** (旧 4 層構造定義、Phase 4 で Rewrite + Relocate + Rename)
9. **`references/01-principles/adaptive-governance-evolution.md`** (旧進化動学、Phase 4 で Rewrite + Relocate + Rename)
10. `projects/completed/phased-content-specs-rollout/HANDOFF.md` (parent dialog の経緯、本 project spawn の trigger)
11. `references/04-design-system/docs/` (DFR rule の Layer 2 製本群)

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール (AAG Layer 4A) |
| `references/01-principles/adaptive-architecture-governance.md` | 旧 AAG マスター (Phase 4 で Split + Rewrite + Relocate → aag/strategy.md ほか) |
| `references/01-principles/aag-5-constitution.md` | 旧 4 層構造定義 (Phase 4 で Rewrite + Relocate + Rename → aag/architecture.md) |
| `references/01-principles/adaptive-governance-evolution.md` | 旧進化動学 (Phase 4 で Rewrite + Relocate + Rename → aag/evolution.md) |
| `references/01-principles/aag/meta.md` (仮、Phase 1 新規 Create) | **AAG Meta** (Layer 0 + 1: 目的 + 要件) |
| `references/01-principles/aag/README.md` (仮、Phase 1 新規 Create) | aag/ ディレクトリ index |
| `projects/completed/phased-content-specs-rollout/HANDOFF.md` | parent dialog の経緯、本 project spawn の trigger |
| `references/04-design-system/docs/chart-semantic-colors.md` | DFR-001 (色) の Layer 2 製本 |
| `references/04-design-system/docs/echarts-integration.md` | DFR-002 (axis) の Layer 2 製本 |
| `references/03-guides/coding-conventions.md` §数値表示ルール | DFR-003/004 (% / 通貨) の Layer 2 製本 |
| `references/04-design-system/docs/iconography.md` | DFR-005 (icon) の Layer 2 製本 |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | **BaseRule 物理正本**。Phase 2 で `canonicalDocRef` + `metaRequirementRefs` を `SemanticTraceBinding<T>` 形式で追加 |
| `app/src/test/architectureRules/types.ts` / `app/src/test/aag-core-types.ts` | BaseRule / RuleBinding 型定義 (Phase 2 で `SemanticTraceBinding<T>` 型 family 追加) |
| `app/src/test/architectureRules/merged.ts` | derived consumer (consumer は merged.ts 経由のみアクセス) |
| `app/src/test/architectureRules/defaults.ts` | execution overlay defaults (運用状態 = fixNow / executionPlan / lifecyclePolicy)。**semantic binding の正本ではない、本 project では touch しない** |
| `app/src/test/guardCategoryMap.ts` | category / layer / note の補助 metadata。**semantic binding の正本ではない**、本 project では touch しない (二重正本回避) |
