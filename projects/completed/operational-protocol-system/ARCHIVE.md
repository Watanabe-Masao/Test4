# operational-protocol-system

> **archive 形式**: Archive v2 (= 圧縮形式、`docs/contracts/project-archive.schema.json` 準拠)
> **archived at**: 2026-05-04
> **compression at**: 2026-05-04 (= self-dogfood 3 件目、aag-self-hosting-completion + aag-platformization に続く)
> **restore**: `archive.manifest.json` の `restoreAllCommand` で 1 行 checkout

## 完遂内容 (= 達成 milestone summary)

AAG Platformization Pilot 完遂 (= 2026-05-02 archive) を trigger に、AAG framework を **日常作業で使う側の運用プロトコル** を articulate する program。M1-M5 全 5 Phase で Task / Session / Complexity 軸 + Task Class catalog + 4 sub-protocol + drawer integration を articulate、`references/05-aag-interface/protocols/` 配下に **9 protocol doc** を landing。

### Phase 別 commit lineage

| Phase | DA | landing commit | wrap-up commit | 内容 |
|---|---|---|---|---|
| Phase 0 | DA-α-000 | `8283b4b` (= bootstrap) | — | 進行モデル (= AI judgement + retrospective + commit-bound rollback) |
| **M1** | DA-α-001 | `9d1065646` | `a5ad485ac` | Task Protocol System 定義 (= 4 protocol doc 一括 landing: task-protocol-system / task-class-catalog / session-protocol / complexity-policy) |
| **M2** | DA-α-002 | `8c041ecf9` | `b619a505e` | 既存 5 文書 routing 固定 (= session-protocol.md §1.1 L 別 read order + §4.1 L 別 required artifacts + §4.3 引き継ぎ双方向 articulate) |
| **M3** | DA-α-003 | `2a5033f98` | `27a444bf4` | 動的昇格・降格ルール (= complexity-policy.md §4.1 昇格 trigger 10 件 P1-P10 + §4.2 降格 trigger 7 件 D1-D7 + §4.3 3 transition path + §4.6 AI judgement 範囲) |
| **M4** | DA-α-004 | `921740167` | `2c53f73cd` | Task Class 5 protocol (= 4 sub-doc 別 file 化: planning / refactor / bug-fix / new-capability、TC-5 scope 外 articulate、TC-6 既 session-protocol §4 で代替) |
| **M5** | DA-α-005 | `f40127860` | `5cf5c8f89` | drawer `_seam` 最小統合 (= seam-integration.md 新設、5 Task Class × drawer 軸 routing matrix + guard 化判断 No 結論 + 再起動 trigger 3 件 articulate) |
| Pilot verify | (final) | `da3b7fdd5` | — | Pilot 完了 verify 5/5 + AI 自己レビュー 5/5 [x] 全達成 articulate |
| L1 軽修正 batch | (post-completion) | `abbb65673` | — | §1.2 numbering 重複 fix + discovery-log P3 entry 2 件 articulate (= KPI drift commit pattern + doc-registry pre-flight check) |

### Pilot 完了 criterion (= 5 件全達成)

1. ✅ M1-M5 全 deliverable landed (= 9 protocol doc + 6 DA entry + 19 観測点)
2. ✅ 6 Task Class + L1/L2/L3 + 5 protocol articulated
3. ✅ AI simulation で 昇格 / 降格 trigger + session start/end が verify (= 本 session 自体が L2 routing instance、12 commit で trace 可能、drawer Pattern 6 application instance)
4. ✅ decision-audit.md に Pilot 判断履歴 landing (= DA-α-000 + 001-005 = 6 entry、5 件すべて "正しい" 判定)
5. ✅ AAG framework / Standard / drawer / 5 文書 / role / AAG-COA / 主アプリ code に破壊的変更 0 件 (= 全 verify command PASS、不可侵原則 1 整合)

### AI 自己レビュー (= 5 件全達成、DA-β-002 institute、PZ-13 guard 整合)

1. ✅ 総チェック (= scope 内 / 内容妥当 / 不可侵原則違反 0)
2. ✅ 歪み検出 (= scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 0)
3. ✅ 潜在バグ確認 (= doc articulate scope、edge case を complexity-policy §7 で escalate path articulate)
4. ✅ ドキュメント抜け漏れ確認 (= references/README.md + doc-registry.json + task-protocol-system.md §7 整合)
5. ✅ CHANGELOG.md / バージョン管理 (= 本 program は doc articulate scope、主アプリ release scope 外で改変なし)

### 主要観測値

- **新 protocol doc**: 9 (= protocols/ 配下 9 file landing)
- **DA entry**: 6 (= α-000 + α-001〜005、5 件 "正しい" 判定)
- **観測点**: 19 (= M1-5 + M2-4 + M3-4 + M4-3 + M5-3、全達成)
- **commit**: 12 (= 6 Phase landing × 2 (= landing + wrap-up) + Pilot verify + 軽修正 batch、Phase 0 bootstrap は別 PR)
- **scope discipline**: scope 外 commit 0 件 (= drawer Pattern 2 整合)
- **self-application**: 5 度 (= M1〜M5 各 Phase で本 session が application instance として trace 可能、再帰的 self-test)

## archive 経緯

1. 2026-05-02 AAG Platformization Pilot 完遂 archive を trigger に bootstrap (= DA-α-000 進行モデル institute)
2. 2026-05-03 aag-self-hosting-completion R5 完遂で resume ready (= R5 で operational-protocol-system project resume + plan path refinement)
3. 2026-05-04 M1-M5 全 Phase 一括 landing (= 本 session で 12 commit 完遂)
4. 2026-05-04 Pilot 完了 verify 5/5 + AI 自己レビュー 5/5 全達成
5. 2026-05-04 課題評価 + L1 軽修正 batch (= numbering 重複 fix + discovery-log 学習化 2 件)
6. 2026-05-04 user 承認 (= "4" = Archive v2 形式選択) → archive プロセス §6.2 起動
7. **本 commit (= 2026-05-04) で Archive v2 圧縮形式に移行** (= self-dogfood 3 件目、protocols/ 配下 9 doc は永続維持、active 期 institution doc を圧縮)

## restore 手順

active 期 file 16 件 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / DERIVED / aag/ / derived/ 配下 7 file) が必要になった場合:

```bash
$(jq -r '.restoreAllCommand' projects/completed/operational-protocol-system/archive.manifest.json)
```

> **注**: `config/project.json` は AAG project-checklist-collector の identification key として参照されるため、Archive v2 圧縮対象から **例外的に残置** (= aag-self-hosting-completion PR 3 で institute された design 整合)。

詳細な復元 file list は `archive.manifest.json` の `deletedPaths` / `compressedFiles` を参照。

## 関連

### parent

- **aag-platformization** (= 2026-05-02 archive、`projects/completed/aag-platformization/`): 本 program は AAG Platformization Pilot 完遂後の **post-Pilot 運用制度** として bootstrap、Pilot 完遂を trigger とする継承関係

### sibling

- **aag-self-hosting-completion** (= 2026-05-04 archive、`projects/completed/aag-self-hosting-completion/`): 並行 program、本 program R5 (= aag-self-hosting-completion R5) で resume trigger を articulate

### children (= 後続 candidate、再起動 trigger 観察待ち)

- **TC-5 Incident Discovery 独立 protocol doc** (= drawer Pattern 5 意図的 skip、再起動 trigger 観察待ち、`discovery-log.md` P2 articulated)
- **seam-integration §4 guard 化 (GP-1〜GP-4)** (= 4 候補 No 結論、再起動 trigger 3 件 articulate、`discovery-log.md` P2 articulated)
- **AI Role Catalog institute** (= post-Pilot AI Role Layer charter scope、`discovery-log.md` P2 articulated)

### 後続 program 適用 candidate pattern (= discovery-log P3 articulate)

本 program の retrospect で identify された **後続 program で再利用可能な commit pattern** 2 件:

1. **KPI drift after `[x]` flip — Pattern A** (= `commit (= flip 含む) → docs:generate → 別 regen commit → push`、drawer Pattern 1 整合)
2. **doc-registry obligation pre-flight check** (= 新 references/ doc 追加時に doc-registry.json + README 索引 + 関連 link を **同 atomic commit に統合**、push fail 事前回避)

## metadata

- **archiveVersion**: 2
- **schema**: `docs/contracts/project-archive.schema.json`
- **archiveSection**: `references/05-aag-interface/operations/project-checklist-governance.md` §6.4
- **selfDogfoodOrder**: 3 (= aag-self-hosting-completion = 1, aag-platformization = 2)
- **landed protocol doc**: 9 (= `references/05-aag-interface/protocols/` 配下、永続維持)
