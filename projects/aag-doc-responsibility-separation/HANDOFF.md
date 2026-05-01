# HANDOFF — aag-doc-responsibility-separation

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 1 + Phase 2 + Phase 4 完了、Phase 3 + Phase 5 残**。

- **Phase 1 (inventory) 完了**: AAG 関連 doc 6 件の責務分類が確定 (本 HANDOFF §3 参照)
- **Phase 2 (Project E rescue) 完了**: `projects/aag-decision-traceability/` を独立 active
  project として spawn 済 (commits `5acb275` + `ad71d64`)。archived
  `aag-bidirectional-integrity` 行から "Future follow-up = Project E candidate" 文を削除済
- **Phase 4 (stale refresh) 完了**: `aag/README.md` の display-rule-registry 状態 / 旧 AAG
  doc archive 完了表現 + `aag/layer-map.md` の Phase 8 MVP / selfHostingGuard 完遂表現を
  本 commit で landing
- **Phase 3 (ar-rule-audit split) 未着手**: 別 PR で実施 (inbound 参照 co-change が medium
  規模、独立した branch で扱う)
- **Phase 5 (meta.md split 判断) 未着手**: Project E (`aag-decision-traceability`) Phase 0
  と並行で人間判断

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先

- Phase 3 着手: `references/02-status/ar-rule-audit.md` を protocol / status に分割
  - 移送先: `references/03-guides/ar-rule-binding-quality-protocol.md` (新規 Create、
    §1〜§2 + §5 を移送)
  - 残置: `references/02-status/ar-rule-audit.md` (status / 履歴、§3〜§4 + §6)
  - inbound 参照の co-update (CLAUDE.md / archived project plan / base-rules.ts
    `canonicalDocRef` / guard 実装の comment)

### 中優先

- Phase 5 判断: `aag/meta.md` を `aag/audit.md` に split するか defer するかを人間が判断
  (Project E Phase 0 と並行)。判断のみ、実施は scope 外 (不可侵原則 2)

### 低優先

- なし (Phase 3 + Phase 5 完了で本 project は最終レビュー gate へ)

## 3. Phase 1 inventory 結果

各 AAG 関連 doc の責務分類:

| doc | 主責務 | 紛れている責務 | Phase 対応 |
|---|---|---|---|
| `references/01-principles/aag/meta.md` | Layer 0/1 charter (目的 + 要件) | audit framework + 達成判定 + orphan baseline | Phase 5 判断 |
| `references/01-principles/aag/README.md` | aag/ index | 予定表現 (Project C 着手後 / Phase 5 archive 候補) | Phase 4 refresh ✅ |
| `references/01-principles/aag/layer-map.md` | ファイル別 5 層 mapping | 予定表現 (Phase 8 / selfHostingGuard 予定 / follow-up scope) | Phase 4 refresh ✅ |
| `references/02-status/ar-rule-audit.md` | protocol + status 混在 | 内部に protocol (§1〜§2、§5) + status (§3〜§4、§6) | Phase 3 split |
| `references/02-status/open-issues.md` | active project index | future-follow-up note | 完了 (Project E rescue + 12/12 milestone update、Phase 2) |
| `projects/completed/aag-bidirectional-integrity/HANDOFF.md` | archived project record | live future work (Project E candidate) | 完了 (rescue で外部化、Phase 2) |

## 4. ハマりポイント

### 4.1. Phase 3 split は inbound co-change が伴う

`ar-rule-audit.md` を split すると、`semanticArticulationQualityGuard` 実装の comment、
`base-rules.ts` の `canonicalDocRef` 等の参照が壊れる可能性。grep で全 inbound を洗ってから
split する。本 project の不可侵原則 1 (= inbound 参照を未更新で残さない) を厳守。

### 4.2. Phase 5 は判断 gate であり実装ではない

`aag/meta.md` → `aag/audit.md` の split は **判断のみ** が本 project の scope。実施は
escalate (Level 3 化) or 別 project に逃がす (= 不可侵原則 2)。先回り実装で sunk cost を
作らない。

### 4.3. Project E rescue 後の archived row 表現

Phase 2 で archived `aag-bidirectional-integrity` 行から "Future follow-up = Project E
candidate" 文を削除済。今後 archived row に future-follow-up note を書き戻さない
(`project-checklist-governance.md` §0 鉄則、不可侵原則 3)。

### 4.4. sibling `aag-decision-traceability` との関係

`aag-decision-traceability` は Project E concept (DecisionTrace + AI utilization) の
spawn judgment gate。本 project は AAG **doc 責務分離** が scope。両者は parallel に
進行する独立 project であり、本 project の Phase 5 (meta.md split 判断) と Project E の
Phase 0 (DecisionTrace 進める / defer / scope out 判断) は同時期に走る可能性がある。

## 5. 関連文書

| ファイル | 役割 |
|---|---|
| `projects/aag-decision-traceability/` | Phase 2 で spawn 済の sibling project |
| `projects/completed/aag-bidirectional-integrity/HANDOFF.md` | parent framework (完遂済) |
| `references/01-principles/aag/meta.md` | Phase 5 split 判断対象 |
| `references/01-principles/aag/README.md` | Phase 4 refresh 完了 |
| `references/01-principles/aag/layer-map.md` | Phase 4 refresh 完了 |
| `references/02-status/ar-rule-audit.md` | Phase 3 split 対象 |
