# Task Protocol System — index (= operational-protocol-system M1 fill)

> **landed**: 2026-05-04 (= operational-protocol-system M1)
>
> **役割**: AAG framework を **日常作業で使う側** の運用プロトコル集の上位 doc。Task 軸 / Session 軸 / Complexity 軸 + Task Class catalog の 4 doc を統合 articulate し、reader が「いま自分は何の作業をしているか」「どの protocol で進めるか」を即判断可能にする。
>
> **reader**: 主アプリ改修 user (= 粗利管理ツール改修者) + AI session。
>
> **AAG framework との関係**: AAG Core / Standard / drawer / 5 文書 / role / AAG-COA は本 protocol の **input** として参照、改変しない (= 不可侵原則 1 整合)。本 protocol は AAG の上に薄く載せる operational layer。

## 1. なぜ本 system が必要か (= trigger source)

AAG Platformization Pilot (`projects/completed/aag-platformization/`) で AAG framework articulate が complete に到達した後、AAG を **使う側の操作** が未明文化のまま残る:

- 軽い修正で制度が重くなりすぎる risk (= over-ritual)
- 重い変更で制度が間に合わない risk (= under-ritual)
- セッション開始 / 終了 / 引き継ぎ が ad-hoc
- AI が毎回必要な文脈に最短到達できない
- 途中で重さが変わったときの昇格・降格が articulate されていない

= 本 system は AAG framework の改変ではなく、**運用層** の articulate (= drawer Pattern 4 honest articulation 整合、AAG framework の boundary を超えない範囲で operational gap を解消)。

## 2. 4 doc 構成 (= 本 directory 内の reach 経路)

| doc | 軸 | role |
|---|---|---|
| 本 doc (`task-protocol-system.md`) | 上位 index | 全 protocol の reach 経路 + 適用順序 + reader 別 routing |
| [`task-class-catalog.md`](./task-class-catalog.md) | Task 軸 | 6 Task Class 類型 (= Planning / Refactor / Bug Fix / New Capability / Incident Discovery / Handoff)、各々の scope + 標準手順 pointer |
| [`session-protocol.md`](./session-protocol.md) | Session 軸 | Session 開始 / 実行中 / 終了 / 引き継ぎ の prescriptive 手順 (= 現 ad-hoc の置換) |
| [`complexity-policy.md`](./complexity-policy.md) | Complexity 軸 | L1 軽修正 / L2 通常変更 / L3 重変更 articulate + 各 level で使う既存 5 文書 |

= **3 軸 + 1 catalog** で運用 layer を articulate (= Task = 何をするか / Session = いつ / Complexity = どの重さで)。

## 3. reader 別 routing (= 本 directory への入口)

| reader | 第一読 | 第二読 |
|---|---|---|
| **新規 session 開始 AI** | `session-protocol.md` §1 開始 | `complexity-policy.md` §現在 Task の level 判定 |
| **既存 task 継続 AI** | `task-class-catalog.md` §該当 class | `session-protocol.md` §3 実行中 |
| **handoff 受領者** | `session-protocol.md` §4 引き継ぎ | 該当 project の `HANDOFF.md` |
| **complexity 判断者** | `complexity-policy.md` | `task-class-catalog.md` §該当 class |
| **主アプリ改修 user** | 本 doc §3 (= reader 別 routing) → 上記の該当行 | — |

## 4. Task Class catalog (= 6 類型 summary、詳細は `task-class-catalog.md`)

| class | 性質 | 主な complexity range |
|---|---|---|
| **Planning** | 計画策定 / 設計判断 (= 実装前の articulate) | L2-L3 |
| **Refactor** | 既存 behavior 不変な構造改善 | L1-L3 |
| **Bug Fix** | 観測された defect の修正 | L1-L2 |
| **New Capability** | 新機能 / 新 KPI / 新 protocol 追加 | L2-L3 |
| **Incident Discovery** | 観測された incident の root cause 究明 + 修正 | L1-L3 |
| **Handoff** | session 引き継ぎ / context transfer | L1 (= 1 session 内完結が原則) |

## 5. Complexity level catalog (= 3 level summary、詳細は `complexity-policy.md`)

| level | 性質 | 使う既存 5 文書 | 起動条件 (= 例) |
|---|---|---|---|
| **L1** 軽修正 | 単発 fix / typo / 軽量 doc update | `checklist.md` のみ | typo / 1 file 内修正 / quick-fixes 級 |
| **L2** 通常変更 | 新機能 / 構造改善 / multi-file change | `plan.md` + `checklist.md` | feature 追加 / refactor / multi-file |
| **L3** 重変更 | architecture 変更 / breaking change / multi-program | `plan.md` + `checklist.md` + `decision-audit.md` まで | structural reorganization / migration / 1,000+ inbound update |

## 6. Session lifecycle (= 4 phase summary、詳細は `session-protocol.md`)

```
[新規 session]
    ↓ Session 開始 (= §1: context 復元 + Task Class 判定 + Complexity 判定)
[実行中]
    ↓ 実装 / 検証 / commit (= §3: drawer Pattern 1-6 適用)
[Session 終了 or 引き継ぎ]
    ↓ Session 終了 (= §4: deliverable summary + next action articulate + push)
[次 session]
```

## 7. AAG framework との contract (= 不可侵境界)

本 protocol は以下を **input** として読むのみ。改変しない:

| AAG component | location | 役割 (input としての) |
|---|---|---|
| 不可侵原則 7 件 | `aag/_internal/strategy.md` §鉄則 | session 全体の最上位制約 |
| AAG-REQ 12 件 | `aag/_internal/meta.md` §2 | Tier 0 不変条件、AI が自動修正できない要件 |
| AAG drawer Pattern 1-6 | `references/05-aag-interface/drawer/decision-articulation-patterns.md` | 領域 agnostic decision articulation pattern |
| AAG-COA (= projectization-policy) | `references/05-aag-interface/operations/projectization-policy.md` | 立ち上げ前判定 (= L0-L4 + required + forbidden artifacts) |
| AAG project-checklist-governance | `references/05-aag-interface/operations/project-checklist-governance.md` | 立ち上げ後 completion 管理 + Archive v2 |
| AAG drawer `_seam` (= rule routing metadata) | `docs/generated/aag/rule-index.json` + `merged-architecture-rules.json` | Task Class lens で再 articulate = [`seam-integration.md`](./seam-integration.md) (= M5) |
| 5 文書 (AI_CONTEXT / HANDOFF / plan / checklist / decision-audit) | `projects/active/<id>/` | per-project institution の正本 |

## 8. landing context

- **trigger source**: aag-platformization Pilot complete (= 2026-05-02 archive、`projects/completed/aag-platformization/ARCHIVE.md` 参照)
- **bootstrap**: operational-protocol-system project (= AAG-COA Level 2 + governance-hardening、`projects/completed/operational-protocol-system/`)
- **DA**: `projects/completed/operational-protocol-system/archive.manifest.json` の decisionEntries DA-α-001 (= M1 着手判断、本 doc landing trigger、archive 前 decision-audit.md は Archive v2 圧縮済)
- **後続**: M2-M5 完遂済 (= 2026-05-04 full archive)、後続 candidate は archive.manifest.json relatedPrograms 参照

## 9. status

- 2026-05-02: skeleton landed (= aag-self-hosting-completion R2)
- 2026-05-04: M1 fill 開始 (= 本 doc + task-class-catalog + session-protocol + complexity-policy 同時 landing、operational-protocol-system DA-α-001)
- M2-M5: 後続 PR で fill 予定

## 関連

- 親 directory: `references/05-aag-interface/protocols/README.md` (= landing 受け入れ structure)
- 上位 program: `projects/completed/operational-protocol-system/` (= 本 protocol の implementation program)
- 出口 program (= operational-protocol-system 完遂時): Archive v2 圧縮形式 (`docs/contracts/project-archive.schema.json` + `references/05-aag-interface/operations/project-checklist-governance.md` §6.4)
