# HANDOFF — aag-doc-responsibility-separation

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**全 Phase 完遂、archive プロセス完了 (2026-05-01)**。

- **Phase 1 (inventory) 完了**: AAG 関連 doc 6 件の責務分類が確定 (本 HANDOFF §3 参照)
- **Phase 2 (Project E rescue) 完了**: `projects/aag-decision-traceability/` を独立 project として spawn 済 (commits `5acb275` + `ad71d64`)、archived `aag-bidirectional-integrity` 行から "Future follow-up = Project E candidate" 文削除済
- **Phase 3 (ar-rule-audit split) scope out**: §6 articulation 参照、split risk > benefit と判定
- **Phase 4 (stale refresh) 完了**: `aag/README.md` / `aag/layer-map.md` を実績表現に同期済 (commit `3fe93cd`)
- **Phase 5 (meta.md split 判断) scope out**: §6 articulation 参照、`aag/meta.md` を「3 機能融合 mechanism doc」として永続的に統合維持

最終レビュー (人間承認) 通過後、本 project は archive 済。

## 2. 次にやること

なし (本 project は archived)。再判断 trigger は §6 各 phase の state-based trigger を参照。

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
| `projects/completed/aag-decision-traceability/` | Phase 2 で spawn された sibling project (同日に scope out + archive) |
| `projects/completed/aag-bidirectional-integrity/HANDOFF.md` | parent framework (完遂済) |
| `references/01-principles/aag/meta.md` | Phase 5 で永続的統合維持を判断 |
| `references/01-principles/aag/README.md` | Phase 4 refresh 完了 |
| `references/01-principles/aag/layer-map.md` | Phase 4 refresh 完了 |
| `references/02-status/ar-rule-audit.md` | Phase 3 で scope out 判断、現状 functional として維持 |

## 6. Phase 3 / Phase 5 scope-out rationale

### Phase 3 (ar-rule-audit split) scope out

split risk が benefit を上回ると判定:

- **drill-down chain semantic 破壊**: `canonicalDocRef.docPath` field は 1 path のみ受け入れる、AR-rule 単位での re-binding が必要、binding chain articulation を弱める
- **archived doc immutability 破壊 or linkrot の二択**: 23 inbound のうち archived project (`aag-bidirectional-integrity` / `aag-rule-schema-meta-guard`) の参照を update すると history immutability に違反、しないと linkrot
- **重複 articulation 生成 risk**: protocol / status 間の cross-pointer が AAG-REQ-ANTI-DUPLICATION の構造的 risk を高める
- **Project B Phase 3 deliverable judgment の上書き**: Project B が意図的に同居させた設計 (= 「protocol + batch articulation context」) を後付けで覆す precedent

判断基準: 現状 ar-rule-audit.md は 210 行 functional、`semanticArticulationQualityGuard` 等が正しく動作、reader 混乱の観測なし。AAG-REQ-NO-PERFECTIONISM (= 弱さを構造的に受容) + AAG-REQ-NON-PERFORMATIVE (= proxy work 生成禁止) に従って意図的に残す弱さとして許容。

**再判断 trigger** (state-based): 行数 400 超 / inbound 30 件超 / `semanticArticulationQualityGuard` 拡張で hard fail 化のいずれか。

### Phase 5 (meta.md → audit.md split 判断) scope out

判断結果: **永続的に統合維持**。

rationale:

- meta.md は親 project (`aag-bidirectional-integrity`) §8.10 で「A: meta.md §3 内に articulate」と能動判断、L7 で「3 機能融合 mechanism doc」と明示設計
- 新たな failure mode (= 実害) なしにこの judgment を覆すことは Project B archive immutability に対する revisionism
- `selfHostingGuard.test.ts` Test 1-3 が `aag/meta.md` §2 を regex 参照する依存あり、split は path / regex / Section 抽出ロジックすべての co-change 必要、cost > benefit
- 180 行は許容範囲、`AAG-REQ-ANTI-DUPLICATION` の対偶 = 集中の利点 (単一エントリの利点) も valid な設計原則

**再判断 trigger** (state-based): meta.md が真に painful な責務肥大を起こす状況 (例: 300 行超 / audit framework が 100 行超 / status table が 16 行超 / inbound 30 件超のいずれか) が観測された時点で別 project として再判断可。

## 7. archive 履歴

Archived: 2026-05-01 (本 commit、`aag-decision-traceability` と同日 scope out + archive)。
case B early scope-out pattern (`aag-legacy-retirement` 前例) に合致。
