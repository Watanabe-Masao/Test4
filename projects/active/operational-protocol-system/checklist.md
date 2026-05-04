# checklist — operational-protocol-system

> 役割: completion 判定の入力（required checkbox の集合）。
> やってはいけないこと / 恒久ルールは plan.md §4 に書く。
> 各 item は **observable verification** が完了条件 (= drawer Pattern 4 適用)。

## Phase 0: Bootstrap

- [x] `_template/` から `projects/active/operational-protocol-system/` 作成 + 必須セット 6 ファイル
- [x] charter draft 内容を plan.md に migrate + charter draft 削除 (= 重複 articulate 防止)
- [x] config/project.json を AAG-COA Level 2 + governance-hardening で articulate
- [x] `references/04-tracking/open-issues.md` に `operational-protocol-system` 行追加
- [x] `references/README.md` + `docs/contracts/doc-registry.json` から charter draft entry 削除 (= 移動済)
- [ ] DA-α-000 (進行モデル) landing
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS

## Phase M1: Task Protocol System 定義

- [x] DA-α-001 entry landing (= M1 着手判断、新 doc 4 件配置 + articulate 順序、5 軸 + 観測点 + Lineage、archive-v2 program PR 6 + wrap-up commit で完遂、judgementCommit = `9d106564649fac499cc96285cf8c08d64d8315eb` / preJudgementCommit = `5c29bb54971c8ca97042360bacebc23953f20d54`)
- [x] `task-protocol-system.md` 新設 (= 上位 doc、M1-M5 全体 index、`references/05-aag-interface/protocols/` に landing)
- [x] `task-class-catalog.md` 新設 (= 6 類型 = TC-1 Planning / TC-2 Refactor / TC-3 Bug Fix / TC-4 New Capability / TC-5 Incident Discovery / TC-6 Handoff、各々に scope + 入口/出口条件 + complexity range + antipattern)
- [x] `session-protocol.md` 新設 (= Session 開始 §1 / 実行中 §3 (L1/L2/L3 別) / 終了・引き継ぎ §4 + drawer Pattern 1-6 適用 articulate)
- [x] `complexity-policy.md` 新設 (= L1 軽修正 / L2 通常変更 / L3 重変更 + 各 level で使う既存 5 文書 §5 table + AAG-COA との関係 §2)
- [x] **観測** M1-1: 6 Task Class が articulated (catalog 完成、`task-class-catalog.md` §1 summary table + §2-§7 詳細)
- [x] **観測** M1-2: Session Protocol が L1/L2/L3 別に articulated (`session-protocol.md` §3.2/§3.3/§3.4)
- [x] **観測** M1-3: L1/L2/L3 と既存 5 文書の使い分けが table で articulated (`complexity-policy.md` §5 use-case mapping table)
- [x] **観測** M1-4: 4 doc 全 landing で `docs:check` PASS (= 60 KPI all OK / Hard Gate PASS、2026-05-04 verify)
- [x] **観測** M1-5: 反証可能観測 ≥ 1 (= 本 session 自体が synthetic session scenario として self-application instance、`session-protocol.md` §1 開始 → §3.4 L3 実行中 → §4 終了 routing が trace 可能)
- [x] DA-α-001 振り返り判定 (= **正しい**、5 観測点全達成、wrap-up commit で articulated、`decision-audit.md` DA-α-001 §「振り返り (Phase M1 完了 / 2026-05-04)」参照)
- [x] `cd app && npm run docs:check && npm run test:guards && npm run lint && npm run build` PASS (= 60 KPI Hard Gate PASS / 146 file 969 test PASS / 0 errors 25 warnings / built successful、2026-05-04)

## Phase M2: 既存 5 文書への routing 固定

- [x] DA-α-002 entry landing (= M2 着手判断、session-protocol.md 単独拡張、5 軸 + 観測点 + Lineage、Lineage 実 sha は本 commit 後 update 予定)
- [x] `session-protocol.md` 拡張: L1/L2/L3 別 read order articulate (= §1.1 table 形式で per-level read order articulated)
- [x] `session-protocol.md` 拡張: Session 終了 protocol L1/L2/L3 別 articulate (= §4.1 per-level required artifacts table + §4.2 全 level 共通 articulation)
- [x] `session-protocol.md` 拡張: 引き継ぎ protocol 双方向 articulate (= §4.3.1 引き継ぐ側 + §4.3.2 引き継がれる側、双方向必須 check)
- [x] **観測** M2-1: 3 routing pattern (L1/L2/L3) articulated (= §1.1 read order table + §3.2/§3.3/§3.4 routing が全 L 別 articulated)
- [x] **観測** M2-2: Session 終了 protocol 3 level 全件 articulated (= §4.1 per-level required artifacts table)
- [x] **観測** M2-3: 引き継ぎ protocol 双方向 articulated (= §4.3.1 + §4.3.2 双方向 必須 check)
- [x] **観測** M2-4: synthetic scenario で全 routing 再現可能 (= 本 session 自体が L2 routing instance、§1.1 L2 read order → §3.3 L2 routing → §4.1 L2 required artifacts → §4.3.1 引き継ぐ側 の trace が verify 可能)
- [x] DA-α-002 振り返り判定 (= **正しい**、4 観測点全達成、wrap-up commit で articulated、`decision-audit.md` DA-α-002 §「振り返り (Phase M2 完了 / 2026-05-04)」参照)

## Phase M3: 動的昇格・降格ルール

- [x] DA-α-003 entry landing (= M3 着手判断、complexity-policy.md 単独拡張、5 軸 + 観測点 + Lineage 仮 sha)
- [x] `complexity-policy.md` 拡張: 昇格 trigger ≥ 6 件 articulate (= §4.1 で 10 件 list、各々 P1-P10 ID + 該当例 + level 移行)
- [x] `complexity-policy.md` 拡張: 降格 trigger ≥ 4 件 articulate (= §4.2 で 7 件 list、各々 D1-D7 ID + 該当例 + level 移行)
- [x] `complexity-policy.md` 拡張: 昇格時手順 articulate (= §4.3 で L1→L2 / L2→L3 / L1→L3 直接昇格 の 3 手順 + §4.4 降格時手順 + §4.5 articulation template + §4.6 AI judgement 範囲)
- [x] **観測** M3-1: 昇格 trigger ≥ 6 件 articulated (= 10 件で 4 件超過達成)
- [x] **観測** M3-2: 降格 trigger ≥ 4 件 articulated (= 7 件で 3 件超過達成)
- [x] **観測** M3-3: 昇格時手順 articulated (= §4.3 + §4.4 + §4.5 で 3 transition path articulate)
- [x] **観測** M3-4: 反証 — synthetic task で trigger 該当 → 手順実行が verify 可能 (= 本 session の M2 → M3 着手で「L2 継続維持」判定が trigger §4.1 P5/P6 観点で trace 可能、self-application instance)
- [ ] DA-α-003 振り返り判定 (本 wrap-up 後 [x])

## Phase M4: Task Class ごとの標準手順 (= 5 protocol)

- [ ] DA-α-004 entry landing
- [ ] **Planning Protocol** articulate (= 構想 → 調査 → 比較検討 → 妥当性判断 → ドキュメント化 → 自己評価)
- [ ] **Refactor Protocol** articulate (= 挙動不変確認 → 範囲確定 → 実装 → parity / drift / regression 確認)
- [ ] **Bug Fix Protocol** articulate (= 再現 → 原因調査 → 最小修正 → regression → 再発防止 guard 検討)
- [ ] **New Capability Protocol** articulate (= authority/contract/generated 追加要否 → 実装 → compatibility 確認)
- [ ] **Handoff Protocol** articulate (= 現在地 / 次アクション / 未確定判断 / ハマりポイント の更新)
- [ ] **観測** M4-1: 5 protocol articulated
- [ ] **観測** M4-2: 各 protocol に drawer Pattern 1-6 application instance hint
- [ ] **観測** M4-3: 各 protocol に Complexity Policy (M3) との対応 articulated
- [ ] DA-α-004 振り返り判定

## Phase M5: drawer `_seam` を使った最小統合

- [ ] DA-α-005 entry landing
- [ ] `taskHint` / `consumerKind` / `sourceRefs` の意味 articulate (= AAG drawer-generator.ts 既 articulate を Task Class lens で再 articulate)
- [ ] Task Class × drawer 軸 routing matrix articulate
- [ ] guard 化判断 (= value > cost 評価、drawer Pattern 4 適用)
- [ ] **観測** M5-1: taskHint / consumerKind / sourceRefs 意味 articulated
- [ ] **観測** M5-2: 5 Task Class × drawer 軸 routing matrix articulated
- [ ] **観測** M5-3: guard 化判断 articulated (Yes/No + rationale)
- [ ] DA-α-005 振り返り判定

## Phase 完了 verify (= Pilot 完了 criterion 5 件 — `plan.md` §2)

- [ ] M1-M5 全 deliverable landed
- [ ] 6 Task Class + L1/L2/L3 + 5 protocol articulated
- [ ] AI simulation で 昇格 / 降格 trigger + session start/end が verify (= drawer Pattern 6 application)
- [ ] decision-audit.md に Pilot 判断履歴 landing (DA-α-000 + 001-005 = 6 entry)
- [ ] AAG framework / Standard / drawer / 5 文書 / role / AAG-COA / 主アプリ code に破壊的変更 0 件 (= 全 verify command PASS)

## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.2

- [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。
> 機能的な Phase がすべて [x] になっても、ここが [ ] なら project は
> `in_progress` のまま留まり、archive obligation は発火しない。
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 / §6.2

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) をuser がレビューし、archive プロセスへの移行を承認する
