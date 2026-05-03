# AI_CONTEXT — aag-self-hosting-completion

> 役割: project 意味空間の入口（why / scope / read order）。
> 現在地・次の作業・ハマりポイントは `HANDOFF.md` を参照。

## Project

AAG Self-Hosting Completion（aag-self-hosting-completion）

## Purpose

AAG framework が articulate rigor (= 意味 / 境界 / 依存関係) を要求する framework であるにも関わらず、AAG 自身への entry navigation が articulate rigor を満たしていない (= 3 軸混在 + reader 分別不在 + 課題/進捗/projects 境界曖昧 + AAG sub-tree 同階層配置) という **AAG framework の self-contradiction** を解消する。AAG-REQ-SELF-HOSTING の **真の closure 達成** = code-level + entry navigation rigor 完全達成。

structural reorganization により references/ + aag/ + projects/ の boundary を **structural separation** で articulate、主アプリ改修 AI が AAG 内部を一切認知せず必要 context に最短到達できる状態を realize。

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 次にやること）
3. `plan.md`（不可侵原則 7 件 + Phase R1-R7 + scope 外）
4. `checklist.md`（completion 判定 + 観測点）
5. `decision-audit.md`（重判断 institution + DA-α-000）
6. `projectization.md`（AAG-COA 判定 = Level 3 + architecture-refactor）
7. 関連: `references/03-guides/decision-articulation-patterns.md` (drawer Pattern 1-6 application instance source)

## Why this project exists

本 project は **AAG framework の品質完成** を目的とする:

- AAG が「意味 / 境界 / 依存関係」を articulate する framework であるにも関わらず、entry navigation level でその articulate rigor を満たしていない self-contradiction
- 主アプリ改修 AI が AAG 内部 (= references/01-principles/aag/) を読まずに作業できる state を articulate (= 構造的 boundary)
- references/ の 3 軸混在 (= 文書役割 / 対象領域 / lifecycle) を 1 lens (= reader-domain) で再構築
- per-element drill-down predictability (= 04-tracking/elements/ standardized structure)
- dashboard layer の機械生成化 (= drift 自動検出)
- drawer 中核性の structural articulation (= aag/interface/drawer/ で primary interface 明示)

operational-protocol-system project は本 program R5 で再開、M1 deliverable は aag/interface/protocols/ に直接 landing する (= structural foundation 上に articulation)。

## Scope

含む:

- AAG framework の **物理 location 移動** (= references/01-principles/aag/ → aag/_internal/ + aag/interface/)
- references/ directory rename (= 01-principles → 01-foundation / 02-status → 04-tracking / 04-design-system → 02-design-system / 03-guides → 03-implementation)
- per-element directory + dashboard layer 新設 (= 04-tracking/elements/ + 04-tracking/dashboards/)
- 全 inbound link migration (= 1,000+ 件)
- 全 guard / collector path constants update (= 138 件)
- doc-registry.json + manifest.json reorganize
- AAG meta.md §2.1 で AAG-REQ-SELF-HOSTING を「完全達成」に articulate update (R6)

含まない:

- 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) の touch
- AAG framework articulate **内容** の改変 (= 物理 location のみ移動、articulate text 不変、ただし R6 で meta.md self-hosting closure 部分のみ honest update 例外)
- Standard / drawer / 5 文書 template の articulate 内容改変 (= 物理 location 移動のみ)
- AI Role Catalog 本実装 (= post-Pilot 別 program scope)
- 主アプリ業務 logic 変更
- 機能 loss (= 既存 functionality 100% 維持)

## 関連文書

| 文書 | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール（AAG Layer 4A） |
| `references/03-guides/projectization-policy.md` | AAG-COA (= Level 3 + architecture-refactor 判定) |
| `references/03-guides/new-project-bootstrap-guide.md` | bootstrap 手順 (= 本 project bootstrap で適用) |
| `references/03-guides/decision-articulation-patterns.md` | drawer (= Pattern 1-6 application instance source) |
| `references/01-principles/aag/meta.md` | AAG-REQ-SELF-HOSTING articulate (R6 で update 対象) |
| `projects/operational-protocol-system/` | R5 完了後再開、M1 deliverable は aag/interface/protocols/ に landing |
| `projects/completed/aag-platformization/` | AAG Pilot (= 本 program の motivation source) |
