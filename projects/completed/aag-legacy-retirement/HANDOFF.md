# [ARCHIVED] HANDOFF — aag-legacy-retirement

> **Archived: 2026-04-30** — Project D は Phase 1 のみで MVP scope 完遂 (case B 確定、拡張案件 0 件)、
> ユーザー承認 (本 commit) により archive プロセス完了。physical archive 移管 =
> `projects/completed/aag-legacy-retirement/` (本 commit)。
>
> **判定 = case B (early scope-out)**: Project A archive 完遂 (`projects/completed/aag-core-doc-refactor/`、
> commit `cf8d995`) により全 8 旧 AAG Core doc が `references/99-archive/` に移管完了 +
> 各旧 doc active inbound = 0 のため、本 project が引き受ける拡張案件は 0 件。Phase 2-4
> (Split + Rewrite + 拡張案件 archive 移管 + 物理削除) は scope out。

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

**Phase 1 完遂 + case B 確定 → archive 完遂 (2026-04-30)**。

親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate B 確定 (= Project A〜D 分割) を
受けて、**Project A Phase 5 で完遂しない複雑 archive 案件** を本 project に独立 spawn したが、
Project A Phase 5 完遂状況 grep の結果、**拡張案件 0 件** (= 全 8 旧 AAG Core doc が Project A 内で archive 完遂)
が判明。**case B 確定** = 本 project は Phase 1 のみで MVP scope 完遂、Phase 2-4 は scope out。

| 項目                                                       | 状態                                 |
| ---------------------------------------------------------- | ------------------------------------ |
| project bootstrap (skeleton 5 doc)                         | ✅ 完了                              |
| 親 project MVP scope                                       | ✅ 完遂                              |
| Project A bootstrap + 全 Phase + archive                   | ✅ 完遂 (commit `cf8d995`)           |
| Project B bootstrap                                        | ✅ 完了                              |
| Project C bootstrap                                        | ✅ 完了                              |
| **本 project Phase 1 (必要性 re-evaluate)**                | ✅ **完遂** (case B 確定、本 commit) |
| 本 project Phase 2-4 (拡張案件 Split + archive + 物理削除) | ⛔ **N/A (case B のため scope out)** |
| 本 project 最終レビュー (人間承認)                         | ⏳ 待ち                              |

### Phase 1 判定結果 (case B 確定の根拠)

- Project A Phase 5.1〜5.8 全 [x]、最終レビュー人間承認済 (commit `306c8b9`)、8-step archive 完遂 (commit `cf8d995`)
- 8 旧 AAG Core doc 全て `references/99-archive/` 配下に物理移管済:
  - `adaptive-architecture-governance.md` / `aag-5-constitution.md` / `aag-5-layer-map.md` / `aag-5-source-of-truth-policy.md`
  - `aag-four-layer-architecture.md` / `aag-operational-classification.md` / `aag-rule-splitting-plan.md` / `adaptive-governance-evolution.md`
- 各旧 doc の active inbound = 0 (`principles.json` $comment 内の歴史的 changelog 言及 1 件は migration 対象外)
- 拡張案件 (= Project A Phase 5 で完遂しなかった複雑案件) = **0 件**
- → Phase 2-4 (Split + Rewrite + 拡張案件 archive + 物理削除) は本 project では発火条件を満たさない

### 親 project + Project A からの継承事項

本 project は親 plan §Phase 5 + §3.5 操作順序原則 + §1.5 archive 前 mapping 義務、Project A の
legacy-retirement.md を継承。詳細概念定義は親 plan / Project A を正本。

入力 doc:

- `projects/aag-bidirectional-integrity/plan.md` §Phase 5 + §3.5 + §1.5
- `projects/completed/aag-core-doc-refactor/plan.md` (Project A 正本、Phase 5 で完遂する範囲の定義)
- `projects/completed/aag-core-doc-refactor/legacy-retirement.md` (Project A の legacy-retirement、単純案件の articulation)

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先 — 最終レビュー (人間承認)

Phase 1 完遂 + case B 確定により本 project は MVP scope 完遂状態。次は人間レビューア
による「最終レビュー (人間承認)」 [ ] flip 待ち。承認後、Project A と同様に 8-step
archive プロセスを実行 (本 project ディレクトリを `projects/completed/` 配下に migrate)。

### scope out (case B 確定により発火しない)

- ~Phase 2-3 = Split + Rewrite + archive 移管~ — N/A (拡張案件 0 件)
- ~Phase 4 = 物理削除 (人間判断後)~ — N/A (本 project では物理削除 trigger 発火しない)

## 3. ハマりポイント

### 3.1. Project A Phase 5 完了前の着手禁止

Project A Phase 5 完了前に本 project Phase 2 以降を着手すると、Project A の単純案件と本 project の
複雑案件の境界が不明確になり scope creep。Project A で完遂可能な単純案件は Project A で完遂し、
本 project に持ち込まない (plan 不可侵原則 1)。

### 3.2. 必要性 re-evaluate を skip しない

Phase 1 で必要性を re-evaluate せずに Phase 2 着手すると、不要 project が active のまま残る。
**本 project は Project A Phase 5 進捗依存** (case B = 不要なら本 project archive 候補に migrate)。
Phase 1 で必ず判定する (plan 不可侵原則 5)。

### 3.3. inbound 0 trigger のみ — 期間 buffer 禁止

archive trigger は **inbound 参照 0 件の機械検証** のみ。期間 buffer (例: 30 日待機) は anti-ritual として
絶対禁止。Project A 不可侵原則 2 と同一 (plan 不可侵原則 2)。

### 3.4. archive 前 mapping 義務

旧 doc を archive する前に、新 doc に「旧概念 → 新概念 mapping table」が landed 済を機械検証で確認。
mapping なしの archive は禁止。Project A 不可侵原則 5 と同一 (plan 不可侵原則 3)。

### 3.5. 物理削除 trigger は人間判断必須 (AI 判断しない)

archive 配下 file への inbound 0 機械検証 PASS 後の物理削除は AI が判断しない。frontmatter
`humanDeletionApproved: true` + `approvedBy` + `approvedCommit` の articulate を人間レビューアが
行った後にのみ AI が物理削除 commit を実行 (plan 不可侵原則 4)。

### 3.6. Project A overflow バッファになるな

本 project の scope は **明確に「複雑案件のみ」**。Project A で完遂可能な単純案件を本 project に
持ち込むと、Project A の MVP 完遂判定が不能になる。Phase 1 で identify した拡張案件のみを scope
に articulate (plan 不可侵原則 1)。

## 4. 関連文書

| ファイル                                                        | 役割                                                                   |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `projects/aag-bidirectional-integrity/plan.md`                  | 親 project の正本 (§Phase 5 / §3.5 / §1.5)                             |
| `projects/completed/aag-core-doc-refactor/plan.md`              | Project A 正本 (Phase 5 完遂範囲の確認元)                              |
| `projects/completed/aag-core-doc-refactor/legacy-retirement.md` | Project A の legacy-retirement (単純案件と複雑案件の境界 articulation) |
| `references/99-archive/adaptive-architecture-governance.md`     | 複雑 archive 候補の典型例 (Split + 部分 Archive、Phase 2 で扱う可能性) |
| `references/99-archive/`                                        | archive 配下 (Phase 3 で物理移管先)                                    |
| `references/02-status/legacy-retirement-extended.md`            | Phase 1 で新規 Create (拡張案件 articulation の集約 doc)               |
| `references/03-guides/project-checklist-governance.md`          | 本 project の運用ルール                                                |
