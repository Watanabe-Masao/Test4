# checklist — aag-platformization

> 役割: completion 判定の入力 (機械検証可能な checkbox 集合)。
> 各 Phase は **observable verification** が完了条件。articulate 完了は条件ではない (supreme principle)。
> 各 Phase 完了時に DA entry に 5 軸 articulate + 振り返り observation + Commit Lineage を landing。

## Phase 0: Bootstrap

- [x] `_template/` をコピーして `projects/aag-platformization/` を作成した
- [x] `config/project.json` を実値で埋めた
- [x] `projectization.md` に AAG-COA 判定 (Level 3) を記録した
- [x] `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` / `checklist.md` を埋めた
- [x] `aag/execution-overlay.ts` を空のまま (本 program は本体 merge に参加しない)
- [x] `breaking-changes.md` を派生セットから足した
- [x] `decision-audit.md` を scaffold + DA-α-000 (進行モデル決定) landing 済
- [x] DA-α-000 entry に Phase 0 全成果物の Q1〜Q5 self-check を埋めた
- [x] `decision-audit.md` の DA entry テンプレに **5 軸 articulation** 欄追加
- [x] `plan.md` を supreme principle + F1-F7 + 7 Phase 構造に refactor
- [ ] `references/02-status/open-issues.md` に `aag-platformization` 行を追加
- [ ] `CURRENT_PROJECT.md` を `aag-platformization` に切替
- [ ] `cd app && npm run verify:project && npm run test:guards && npm run docs:generate && npm run docs:check && npm run lint && npm run build` 全 PASS

## Phase 1: 5 軸 articulation framework operational 化

- [ ] DA-α-001 entry を `decision-audit.md` に landing (判断時 + 5 軸 articulate + 振り返り観測点)
- [ ] DA-α-001 の Commit Lineage (judgementCommit / preJudgementCommit + annotated tag) を記録 + push
- [ ] 既存 5 軸 articulate (source-of-truth / architecture / meta / strategy / layer-map) を verify した結果を DA entry に articulate
- [ ] gap が無い ことを確認 (gap があれば既存 doc に追加、新 doc は作らない)
- [ ] 本 plan.md / decision-audit.md template に 5 軸 articulate 欄が反映されているか verify
- [ ] **観測**: 本 program 内全 deliverable の 5 軸 articulate 存在 Y/N
- [ ] DA-α-001 振り返り判定 (正しい / 部分的 / 間違い) を記録

## Phase 2: `rules-by-path` artifact + sync guard

- [ ] DA-α-002 entry を landing (判断時 + 5 軸 articulate + 振り返り観測点 + format 選定根拠)
- [ ] DA-α-002 の Commit Lineage + tag 記録 + push
- [ ] **format 選定**: JSON / CUE / YAML / TOML / 他から AI が事実根拠で 1 つ採用
- [ ] `tools/architecture-health/src/aag/rules-by-path-generator.ts` 新設
- [ ] `docs/generated/aag/rules-by-path.<format>` 生成可
- [ ] `app/src/test/guards/aagRulesByPathSyncGuard.test.ts` 新設 (drift 検出)
- [ ] `npm run docs:generate` から呼び出し
- [ ] **観測 simulation** (本 session 内):
  - [ ] AI が `merged.ts` 編集 task で artifact 1 read で関連 rule id 集合取得 Y/N
  - [ ] TS trace 比 tool call 削減率 > 2.0 Y/N
  - [ ] 試験 drift (canonical 編集 + artifact 未生成) で sync guard hard fail Y/N
- [ ] DA-α-002 振り返り判定 + Q1〜Q5 self-check
- [ ] 不機能なら artifact 削除 + revert + DA に "機能しなかった" 記録
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

## Phase 3: `rule-detail` drawer + `rule-index`

- [ ] DA-α-003 entry を landing (5 軸 + granularity 判断 + 観測点)
- [ ] DA-α-003 の Commit Lineage + tag
- [ ] `tools/architecture-health/src/aag/rule-detail-generator.ts` 新設
- [ ] `docs/generated/aag/rule-index.<format>` 軽量 index 生成
- [ ] `docs/generated/aag/rule-detail/<id>.<format>` 個別 rule detail 生成
- [ ] `app/src/test/guards/aagRuleDetailSyncGuard.test.ts` 新設
- [ ] **観測**:
  - [ ] AI が rule lookup を rule-index → rule-detail で完了する step 数 (TS trace 比較)
  - [ ] guard 違反 simulation で AI が rule-detail に reach する step 数
- [ ] DA-α-003 振り返り判定 + Q1〜Q5 self-check
- [ ] 不機能なら artifact 削除 + revert
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

## Phase 4: 5 軸 audit (既存 AAG + 本 project)

- [ ] DA-α-004 entry を landing (audit scope + 違反検出基準 + 振り返り観測点)
- [ ] CLAUDE.md / `aag/*` / `references/01-principles/aag/*` を 5 軸 audit
- [ ] 本 project (`aag-platformization`) を自己 audit (reframe 跡 articulate を含む)
- [ ] 違反箇所を分類: 製本重複 / 依存逆 / 責務集合 / 境界曖昧 / 意味曖昧
- [ ] per-violation で restructure 判断 (実施 / 据置 / 後続) を DA entry に articulate
- [ ] 採用された restructure を実施 (新 doc 増設は禁止、既存 doc 拡張のみ)
- [ ] **観測**:
  - [ ] 違反検出件数
  - [ ] 解消件数
  - [ ] 本 project 内 articulation 量の変化 (削減量)
- [ ] DA-α-004 振り返り判定
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

## Phase 5: `rule-by-topic` index

- [ ] DA-α-005 entry を landing (manifest.json 拡張 vs 並列 file 判断 + 5 軸)
- [ ] DA-α-005 の Commit Lineage + tag
- [ ] `tools/architecture-health/src/aag/rule-by-topic-generator.ts` 新設
- [ ] `docs/generated/aag/rule-by-topic.<format>` 生成
- [ ] manifest.json 拡張または並列 articulate (採用判断次第)
- [ ] sync guard 追加
- [ ] **観測**: AI が topic 起点で rule subset に reach できる Y/N + tool call 削減率
- [ ] DA-α-005 振り返り判定 + Q1〜Q5 self-check
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards` PASS

## Phase 6: Simulation + 機能 verify

- [ ] DA-α-006 entry を landing (simulation suite scope + 観測 protocol)
- [ ] `tools/aag-simulation/` (or 等価 location) に simulation runner を新設 (Go or Python or shell、Rust 除外)
- [ ] **CT1〜CT7 を AI 自身が実行** (本 session 内 / state-based、calendar 観測なし):
  - [ ] CT1 path-triggered rule access (Phase 2 effect)
  - [ ] CT2 irrelevant context surface しない (negative)
  - [ ] CT3 rule detail rapid lookup (Phase 3 effect)
  - [ ] CT4 topic discovery (Phase 5 effect)
  - [ ] CT5 drift 検出 (Phase 2/3/5 sync guard)
  - [ ] CT6 session 間判断継承 (decision-audit re-derive 不要)
  - [ ] CT7 5 軸 articulate なき deliverable は review block (Phase 1 effect)
- [ ] 各 CT 結果を DA-α-006 observation table に landing
- [ ] F1〜F7 の機能 status を articulate
- [ ] DA-α-006 振り返り判定

## Phase 7: archive + cutover charter

- [ ] DA-α-007 entry を landing (archive 判断 + 後続 program charter 必要性)
- [ ] 不機能と判明した deliverable の revert 完了
- [ ] Phase 4 audit で identify された負債の削減実施
- [ ] 後続 program (もし必要なら) charter を 1 doc で articulate (新規 or 既存拡張は判断)
- [ ] `references/02-status/recent-changes.md` に本 program のサマリ追加
- [ ] `cd app && npm run docs:generate && npm run docs:check && npm run test:guards && npm run lint && npm run build` 全 PASS

## 最終 archive レビュー (人間承認、構造的要請)

> 本 program 唯一の人間承認点 (`plan.md` 不可侵原則 6)。
> judgement の正しさを担保しない、責任の引受。

- [ ] 人間が `decision-audit.md` の全 entry (DA-α-000〜007) を read
- [ ] 全 F1-F7 の observation 結果を確認
- [ ] archive プロセスへの移行を承認
