# HANDOFF — aag-core-doc-refactor

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Bootstrap 完了 (2026-04-30、Project A spawn)**。

親 project (`projects/aag-bidirectional-integrity/`) の Phase 3 hard gate **B 確定** (= Project A〜D
分割、AI 推奨 + ユーザー確認、2026-04-30) を受けて、**Phase 4 (AAG Core doc content refactoring) +
Phase 5 (legacy 撤退) を本 project に独立 spawn**。

| 項目 | 状態 |
|---|---|
| project bootstrap (skeleton 8 doc) | ✅ 完了 |
| 親 project の MVP scope | ✅ 完遂 (Phase 1 + Phase 3 + cyclic refinement、commit `c1ffc3a`) |
| 親 project の Phase 3 hard gate | ✅ B 確定 (Project A〜D 分割) |
| **本 project Phase 1 (Create 段階)** | ✅ 完遂 (commit `7b49436`、6 新 doc Create + 5 層位置付け + drill-down + mapping 装着) |
| **本 project Phase 2 (Split / Rewrite 段階)** | ✅ 完遂 (commit `85a07b0`、AAG の本質 + AI 対話 + Response フロー migrate) |
| **本 project Phase 3 (CLAUDE.md 薄化)** | ✅ 完遂 (commit `c5de337`、67 行 → 22 行 = 67% 削減、§8.13 判断 = B 適用) |
| **本 project Phase 4 (registry / manifest 整合)** | ✅ 完遂 (commit `9cc0ebe`、旧 8 doc deprecation marker + manifest discovery 新 path migrate) |
| **本 project Phase 5 (legacy 撤退)** | ⏳ multi-session work (8 旧 doc archive、各 inbound 0 + §1.5 mapping 義務 PASS が前提、Phase 5.1〜5.8 sub-phase で 1 session = 1〜2 doc archive 推奨) |

### Phase 5 multi-session 計画 (旧 8 doc archive、inbound 状況に基づく順序)

各旧 doc の inbound 数 (`active references/* + projects/aag-bidirectional-integrity/* + projects/aag-core-doc-refactor/* を除く`):

| # | 旧 doc | inbound 数 | 推奨 archive 順序 | 主要 active inbound |
|---|---|---|---|---|
| 5.1 | `aag-5-layer-map.md` | 8 | 最初 (pilot) | `references/03-guides/projectization-policy.md` L596 (= Layer 4A 登録 reference) |
| 5.2 | `aag-five-layer-architecture.md` | 12 | 2 番目 (即 archive 候補、旧 4 層) | (未調査) |
| 5.3 | `adaptive-governance-evolution.md` | 14 | 3 番目 | (未調査) |
| 5.4 | `aag-5-source-of-truth-policy.md` | 15 | 4 番目 | (未調査) |
| 5.5 | `aag-operational-classification.md` | 16 | 5 番目 | (未調査) |
| 5.6 | `aag-rule-splitting-plan.md` | 18 | 6 番目 (即 archive 候補、completed project execution 記録) | (未調査) |
| 5.7 | `aag-5-constitution.md` | 23 | 7 番目 | (未調査) |
| 5.8 | `adaptive-architecture-governance.md` | 43 | **最後** (最大、Split 既実施で Phase 2 で migrate 済 part あり) | (未調査) |

**Phase 5 sub-phase 共通手順** (per-doc archive workflow):
1. 該当 doc の inbound 全件 grep (`git grep "<旧 path>"`)
2. inbound を分類:
   - **active reference** (= 「現在の情報源として使ってる」): 新 path に update
   - **mapping reference** (= 「旧 → 新 mapping 表記」): archive 移管後の path (`references/99-archive/<旧 path>`) に update or 表記方法の rephrase
3. inbound 全件 update commit (sub-phase 内 別 commit 推奨)
4. `git mv references/01-principles/<旧 path> references/99-archive/<旧 path>` で archive 移管
5. archive frontmatter (`archived: true` + `archivedAt` + `archivedBy` + `migratedTo`) 追加
6. `docs/contracts/doc-registry.json` の archive section に entry migrate
7. test:guards / docs:check 全 PASS 確認
8. checklist Phase 5.X [x] flip + commit + push

### Project E candidate engagement (Phase 5 必ず触れる原則)

Phase 5 の archive workflow (= inbound 0 trigger + §1.5 mapping 義務 + 物理削除 trigger 人間判断) は Project E の以下 deliverable の **direct application instance**:
- `AAG-REQ-ROLLBACK-ANCHOR-PRESERVATION` (Insight 8): archive 移管 commit が rollback anchor、`git revert` で復活可能
- `AAG-REQ-MILESTONE-ACKNOWLEDGMENT` (Insight 7-b): archive 移管自体が「不可逆ステップを今ここで踏みます」の announcement、最終的な物理削除は更に強い milestone (人間 deletion approval 必須)
- `AAG-REQ-DECISION-TRACEABILITY` (Insight 1): 各 archive 移管に decision trace (= なぜ archive するか / どう mapping するか / inbound 0 確認結果) を articulate

Phase 5 進行中に Project E vision との整合性を継続 articulate (= 各 archive 移管 commit message に decision trace 雛形を articulate)、Project E 着手時に retrospective retrofit candidate として活用。

### 親 project からの継承事項

本 project は親 plan §Phase 4 + §Phase 5 articulation を継承。詳細概念定義 (5 層 × 5 縦スライス
matrix / 7 operation taxonomy / drill-down chain semantic / SemanticTraceBinding 設計) は親 plan を
正本とし、本 project では **operational plan に scope を絞った重複なし運用**。

入力 doc:
- `references/02-status/aag-doc-audit-report.md` (Phase 3 audit findings、各 doc の 5 層位置付け
  / 責務 / write/non-write list / drill-down pointer / 必要 operation / 影響範囲 / migration order)
- `references/01-principles/aag/meta.md` (Phase 1 で landing 済の AAG Meta charter、本 project が
  refer する目的 + 要件 + 達成判定総括)
- `references/01-principles/aag/README.md` (aag/ ディレクトリ index)

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 1-2 段で要約する。

### 高優先 (Phase 1 = Create 段階)

- 親 plan §3.5 step 1 (Create 先行) を実行
- `references/01-principles/aag/strategy.md` / `architecture.md` / `evolution.md` / `layer-map.md` /
  `source-of-truth.md` / `operational-classification.md` を新規 Create
- 各新 doc に **5 層位置付け + drill-down pointer + 旧概念 mapping section** を装着
- 各 Create を独立 commit で landing (parallel comparison 期間を確保、旧 doc は touch せず併存)

### 中優先 (Phase 2-3 = Split / Rewrite + CLAUDE.md 薄化)

- `adaptive-architecture-governance.md` の Split + Rewrite (戦略 + 文化論 + 5 層 + バージョン履歴を新 doc に分配)
- CLAUDE.md AAG セクション薄化 (§8.13 判断 = B、鉄則 quote 3-5 行 + link 形式)

### 低優先 (Phase 4-5 = registry 整合 + archive)

- doc-registry.json / principles.json / manifest.json 整合 + 旧 doc deprecation marker
- 各旧 doc への inbound 全件 update + archive 移管 (inbound 0 機械検証 + §1.5 archive 前 mapping 義務 PASS 後)
- breaking-changes.md / legacy-retirement.md の各 entry 完遂

## 3. ハマりポイント

### 3.1. edit-in-place は不可侵原則違反

旧 AAG Core doc を直接 edit すると Create / Split / Rewrite の段階パスが崩れ、parallel comparison
期間が消失する。**新 path に Create → 内容確定 → 旧 doc archive** の順序を厳守 (plan 不可侵原則 1)。

### 3.2. inbound 0 検証なしに archive すると docRegistryGuard が hard fail

旧 path に dangling reference が残ると `docRegistryGuard.test.ts` / `docCodeConsistencyGuard.test.ts`
が hard fail する。各旧 doc archive 前に `git grep "<旧 path>"` で 0 件確認が必須 (plan 不可侵原則 2)。

### 3.3. §1.5 archive 前 mapping 義務を忘れると semantic continuity が消失

旧 → 新の概念 mapping table が新 doc に landed 済でない archive は、後任 AI session が変更履歴を
辿れなくなる。例: `aag/architecture.md` 内に「旧 4 層 → 新 5 層 mapping table」を必ず articulate
してから旧 `aag-5-constitution.md` を archive する (plan 不可侵原則 5)。

### 3.4. 期間 buffer (30 日待機等) の archive trigger は anti-ritual

「30 日待ってから archive」のような期間制度を導入してはいけない。**inbound 0 機械検証のみ** が
trigger (親 plan + 親 Constitution articulate)。

### 3.5. Project B 所掌の越境注意

BaseRule schema 拡張 / AR-rule binding 記入 / meta-guard 実装は **Project B 所掌**。本 project では
**doc 内容のみ** を refactor し、`app-domain/gross-profit/rule-catalog/base-rules.ts` /
`app/src/test/architectureRules/` に touch しない (plan 不可侵原則 7)。

### 3.6. Phase 3 (CLAUDE.md 薄化) の test-contract 違反注意

CLAUDE.md には test-contract guard が要求する暗黙の依存がある (canonicalization-tokens /
features-modules / generated-sections / canonical-table / reference-link-existence / no-static-numbers)。
薄化 commit 後に test:guards で test-contract 関連 guard が PASS することを確認。詳細は
`docs/contracts/test-contract.json` 参照。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/aag-bidirectional-integrity/plan.md` | 親 project の正本 (5 層 × 5 縦スライス matrix、Phase 4 + Phase 5 articulation の出元) |
| `projects/aag-bidirectional-integrity/HANDOFF.md` | 親 project の現在地 (MVP 完遂、Phase 3 hard gate B 確定、Project A〜D 分割) |
| `references/02-status/aag-doc-audit-report.md` | Phase 3 audit findings (本 project の入力) |
| `references/01-principles/aag/meta.md` | AAG Meta charter (Phase 1 で landing 済) |
| `references/01-principles/aag/README.md` | aag/ ディレクトリ index (Phase 1 で landing 済) |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用ルール (AAG Layer 4A) |
| `references/03-guides/projectization-policy.md` | AAG-COA Level 3 判定の根拠 |
| `references/03-guides/deferred-decision-pattern.md` | 途中判断 checklist の制度 doc |
