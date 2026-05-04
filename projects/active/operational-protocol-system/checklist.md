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

- [ ] DA-α-001 entry landing (= M1 着手判断、新 doc 4 件配置 + articulate 順序、5 軸 + 観測点 + Lineage)
- [ ] `task-protocol-system.md` 新設 (= 上位 doc、M1-M5 全体 index)
- [ ] `task-class-catalog.md` 新設 (= 6 類型 = Planning / Refactor / Bug Fix / New Capability / Incident Discovery / Handoff)
- [ ] `session-protocol.md` 新設 (= Session 開始 / 実行中 / 終了 / 引き継ぎ の prescriptive 手順)
- [ ] `complexity-policy.md` 新設 (= L1 軽修正 / L2 通常変更 / L3 重変更 + 各 level で使う文書)
- [ ] **観測** M1-1: 6 Task Class が articulated (catalog 完成)
- [ ] **観測** M1-2: Session Protocol が L1/L2/L3 別に articulated
- [ ] **観測** M1-3: L1/L2/L3 と既存 5 文書の使い分けが table で articulated
- [ ] **観測** M1-4: 4 doc 全 landing で `docs:check` PASS
- [ ] **観測** M1-5: 反証可能観測 ≥ 1 (= synthetic session scenario で各 level routing が verify 可能)
- [ ] DA-α-001 振り返り判定 (正しい / 部分的 / 間違い)
- [ ] `cd app && npm run docs:check && npm run test:guards && npm run lint && npm run build` PASS

## Phase M2: 既存 5 文書への routing 固定

- [ ] DA-α-002 entry landing
- [ ] `session-protocol.md` 拡張: L1/L2/L3 別 read order articulate
- [ ] `session-protocol.md` 拡張: Session 終了 protocol L1/L2/L3 別 articulate
- [ ] `session-protocol.md` 拡張: 引き継ぎ protocol 双方向 articulate
- [ ] **観測** M2-1: 3 routing pattern (L1/L2/L3) articulated
- [ ] **観測** M2-2: Session 終了 protocol 3 level 全件 articulated
- [ ] **観測** M2-3: 引き継ぎ protocol 双方向 articulated
- [ ] **観測** M2-4: synthetic scenario で全 routing 再現可能
- [ ] DA-α-002 振り返り判定

## Phase M3: 動的昇格・降格ルール

- [ ] DA-α-003 entry landing
- [ ] `complexity-policy.md` 拡張: 昇格 trigger ≥ 6 件 articulate
- [ ] `complexity-policy.md` 拡張: 降格 trigger ≥ 4 件 articulate
- [ ] `complexity-policy.md` 拡張: 昇格時手順 articulate
- [ ] **観測** M3-1: 昇格 trigger ≥ 6 件 articulated
- [ ] **観測** M3-2: 降格 trigger ≥ 4 件 articulated
- [ ] **観測** M3-3: 昇格時手順 articulated
- [ ] **観測** M3-4: 反証 — synthetic task で trigger 該当 → 手順実行が verify 可能
- [ ] DA-α-003 振り返り判定

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
