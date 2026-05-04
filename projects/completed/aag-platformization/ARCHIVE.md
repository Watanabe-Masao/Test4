# aag-platformization

> **archive 形式**: Archive v2 (= 圧縮形式、`docs/contracts/project-archive.schema.json` 準拠)
> **archived at**: 2026-05-02 (= human-approved archive)
> **compression at**: 2026-05-04 (= Archive v2 PR 5、self-dogfood 2 件目)
> **restore**: `archive.manifest.json` の `restoreAllCommand` で 1 行 checkout

## 完遂内容 (= 達成 milestone summary)

`references/01-principles/platformization-standard.md` (= **Platformization Standard**) の **Pilot Application**。AAG framework に Standard 8 軸 (Authority / Derivation / Contract / Binding / Generated / Facade / Policy / Operating Gate) を最初に適用し、articulation complete + 実バグ 3 件修復 + AI simulation で機能 verify を達成した program。

### Phase 別 commit lineage

| Phase | DA | 着手 commit | 内容 |
|---|---|---|---|
| 0 | DA-α-000 | `36c4868` (bootstrap) | 進行モデル (= AI-driven judgement + retrospective + commit-bound rollback) |
| 1 / A1 | DA-α-001 | (planned, not instituted) | Authority articulation 方針 (= 4 layer 正本確認 + back-link、bootstrap 内に吸収) |
| 1 / A2a | DA-α-002a | `226b455` | merge policy canonical 単一点化 (= `aag/source-of-truth.md` "Merge Policy" section) + 実バグ 3 件修復 |
| 1 / A2b | DA-α-002b | `74100a7` | merged artifact generator + sync guard (= Go 実装条件 C2 met) |
| 1 / A3 | DA-α-003 | `eee1de8` | contract schema 化 + AagResponse + DetectorResult (= Go 実装条件 C3 met) + 3 seams |
| 1 / A4 | DA-α-004 | `db26556` | RuleBinding boundary guard (= Go 実装条件 C4 met、Phase 1 完了) |
| 1 / A5 | DA-α-005 | `e806bfa` | generated drawers (rule-index + rules-by-path + rule-by-topic) |
| 2 | DA-α-006 | `625e55c` | Verification simulation (= CT1-CT5 / F1-F5 verdict) |
| 3 | DA-α-007 | `6e6acd1` | Archive 判断 + 横展開可否判定条件 articulation + 後続 charter 必要性 |
| archive | (transition) | `4e5c690` | aag-platformization Pilot 完遂 archive (2026-05-02、人間承認) |

### Pilot 完了 criterion (= 5 件全 MET)

1. ✅ AAG が Standard 8 軸 articulate complete
2. ✅ 実バグ 3 件修復 (= merge policy 揺れ / bootstrap path 破綻 / RuleExecutionOverlayEntry 三重定義)
3. ✅ AI simulation で F1〜F5 verify (= CT1-CT5、F1=PASS partial coverage / F2-F5=PASS)
4. ✅ DA entry 履歴 landing (= DA-α-001〜005 articulate、bootstrap + 6 phase)
5. ✅ System Inventory に AAG "Pilot complete" entry (= Standard §3.1)

### 主要観測値

- **新 doc**: 1 (= `references/01-principles/platformization-standard.md`)
- **修復バグ**: 3 (= merge policy / bootstrap / 三重定義)
- **AI simulation**: F1-F5 全 PASS (= F1 partial coverage / F2-F5 full)
- **DA entry**: 8 (= α-000/001/002a/002b/003/004/005/006/007、001 は planned のみ)
- **annotated tags**: 16 (= 8 judgement + 8 rollback-target、commit-bound rollback institute)
- **PROD-X drawer landing (post-Pilot self-dogfood)**: `references/05-aag-interface/drawer/decision-articulation-patterns.md` で 6 pattern (= commit-bound rollback / scope discipline / clean rewrite / honest limitation / rationale skip / state-based verification harness) を **領域 agnostic** に articulate

## archive 経緯

1. 2026-05-02 Phase 3 完遂 (= DA-α-007、Pilot 完了 criterion 5 件全 MET 確認)
2. 2026-05-02 user (= human approval) で archive 承認 (= AI-driven judgement の不可侵原則 1 適用、最終 archive 1 点 only human approval)
3. 2026-05-02 archive transition commit `4e5c690` で `projects/aag-platformization/` → `projects/completed/aag-platformization/` (= R6b 前の構造)
4. 2026-05-03 R6b active+completed split で `projects/completed/aag-platformization/` 配置維持 (= 既 archived のため move 不要)
5. **本 PR 5 (= 2026-05-04) で Archive v2 圧縮形式に移行** (= self-dogfood 2 件目、aag-self-hosting-completion (PR 3) に続く Pilot 検証)

## restore 手順

active 期 file 16 件 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / projectization / DERIVED / breaking-changes / aag/ / derived/ 配下) が必要になった場合:

```bash
$(jq -r '.restoreAllCommand' projects/completed/aag-platformization/archive.manifest.json)
```

> **注**: `config/project.json` は AAG project-checklist-collector の identification key として参照されるため、Archive v2 圧縮対象から **例外的に残置** (= aag-self-hosting-completion PR 3 で institute された design 整合)。

詳細な復元 file list は `archive.manifest.json` の `deletedPaths` / `compressedFiles` を参照。

## 関連

### 後続 program

- **AAG Knowledge Relocation observation** (= aag/_internal/ と aag/core/ 二重配置の構造債務): archive scope 外、後続 trigger 発生時に独立 program。本 program archive scope に articulated
- **後続 candidate 3 件** (= DA-α-007 §4.1 articulate、起動 ≠ commit、trigger 待ち):
  - C-α-001: simulation harness template (= AI simulation の reusable harness 化)
  - C-α-002: _seam taxonomy (= contract schema 化の seam pattern articulate)
  - C-α-003: mapped 率 coverage 改善 (= F1 partial coverage の本格化)

### 後続 program (= 既 institute / 完遂)

- **aag-self-hosting-completion** (= 完遂 archive、2026-05-04): AAG framework の self-hosting closure 完遂 (= 本 Pilot の後継 stream)
- **aag-bidirectional-integrity** (= 完遂 archive、2026-05-01): AAG framework MVP scope 完遂 (= 並行系統)

### 親 / sibling

- **AAG framework 全体** (= `aag/_internal/` 配下): 本 program は AAG framework の subsystem level Pilot
- **drawer Pattern 1-6**: `references/05-aag-interface/drawer/decision-articulation-patterns.md` (= 本 program post-Pilot self-dogfood で landing)

## metadata

- **archiveVersion**: 2
- **schema**: `docs/contracts/project-archive.schema.json`
- **archiveSection**: `references/05-aag-interface/operations/project-checklist-governance.md` §6.4
- **selfDogfoodOrder**: 2 (= aag-self-hosting-completion = 1)
