# aag-self-hosting-completion

> **archive 形式**: Archive v2 (= 圧縮形式、`docs/contracts/project-archive.schema.json` 準拠)
> **archived at**: 2026-05-04
> **compression at**: 2026-05-04 (= Archive v2 PR 3 pilot)
> **restore**: `archive.manifest.json` の `restoreAllCommand` で 1 行 checkout

## 完遂内容 (= 達成 milestone summary)

AAG framework の **entry navigation level での self-hosting failure** を **structural reorganization** で解消する program。R0-R7 phase + β stream operational support で 14 DA 着手 (= active 13 件、planned 1 件)。

### α stream (= R-phase 構造再編)

| Phase | DA | 着手 commit | 内容 |
|---|---|---|---|
| R0 | DA-α-001 | `45753b8` | 境界定義先行 (= references / aag / projects 3 tree boundary articulate) |
| R1 | DA-α-002 | `32a1ea3` | AAG sub-tree relocation (= references/01-principles/aag/ → aag/_internal/、9 doc 物理移動 + 101 inbound update) |
| R2 | DA-α-003 | `c408dbc` | AAG public interface relocate (= references/03-guides/{drawer + 4 ops} → references/05-aag-interface/) |
| R3a | DA-α-004a | `c544ff5` | references/ 5 directory rename + 1,000+ inbound update |
| R3b | DA-α-004b | `2040228` | `*.generated.md` 命名規約適用 + generator 出力先変更 + generatedFileEditGuard landing |
| R3c | DA-α-004c | (planned, not instituted) | 旧 mention 撤退 (= bulk sed で吸収済、independent DA 不要と判断) |
| R3d | DA-α-004d | `ee41603` | guard / collector path update + decisions/ 新設 + 新 guard 2 件 (oldPathReferenceGuard / generatedFileEditGuard) landing |
| R4 | DA-α-005 | `a1703a8` | per-element directory (= charts/CHART-NNN/ pattern) + dashboard layer (= 4 dashboards) + element taxonomy (= 5 prefix canonical) |
| R5 | DA-α-006 | `4b346a0` | operational-protocol-system project resume + plan refinement trigger |
| R6a | DA-α-007a | `cd76e1d` | AAG self-hosting closure articulate update + selfHostingGuard expansion |
| R6b | DA-α-007b | `aa00734` | `projects/` active + completed split + 75 inbound update + discovery 関数 update |
| R7 | DA-α-008 | `0f5f226` | 完了 verify + archive trigger 準備 |

### β stream (= operational support、R-phase 中発見)

| DA | 着手 commit | 内容 |
|---|---|---|
| DA-β-001 | `5042dcc` | pre-push hook 役割分離 (= negative articulation = exclusion-driven manifest)。skip-rules.json + skipBaseline=3 + 3 skip rules institute |
| DA-β-002 | `ff7ec23` | AI 自己レビュー section institute (= user 承認 手前 mandatory checkpoint、_template + active project checklists + PZ-13 guard) |
| DA-β-003 | `58d1577` | per-project discovery-log institute (= scope 外発見 / 改善 / 調査要事項の蓄積 mechanism、_template + active projects + PZ-14 guard) |

### bootstrap (= DA-α-000)

- 着手 commit: `b19518c` (= bootstrap 全実装、skeleton 6 doc + breaking-changes.md + DA-α-000 + open-issues 行追加 + operational-protocol-system pause articulate)
- 進行モデル: AI judgement + retrospective + commit-bound rollback (= drawer Pattern 1 application、AAG Pilot DA-α-000 + operational-protocol-system DA-α-000 の領域 agnostic 拡張)

### 主要観測値

- **総 inbound update**: 2,000+ 件 (= R3a 1,000+ + R6b 75 + その他)
- **新 guard**: 12+ (= generatedFileEditGuard / oldPathReferenceGuard / prePushSkipRulesGuard / projectizationPolicyGuard PZ-13 + PZ-14 / selfHostingGuard expansion + Test 4 entry navigation rigor / etc.)
- **AAG-REQ-SELF-HOSTING**: code-level 達成 + entry navigation rigor 完全達成 (= selfHostingGuard Test 4 で entry navigation level 構造的検証 institute、`aag/_internal/meta.md` §2.1 articulate update)

## archive 経緯

1. R7 完遂 + final verify (= 0f5f226) 後、user 承認待ち state
2. 2026-05-04 user 承認 (= 「承認」発言)
3. archive transition commit `2869698` で `projects/active/aag-self-hosting-completion/` → `projects/completed/aag-self-hosting-completion/` に移動 + `config/project.json` の `status: archived` 化
4. 2026-05-04 docs:generate regen (`0255b41` / `8865574` lineage) で project-health.json に `archived` として反映、Hard Gate PASS / 60 KPI all OK / 前回比 Improved
5. 2026-05-04 Archive v2 PR 1 (= 現状整合 cleanup `8865574e1`) で open-issues.md archived table に entry 追加
6. **本 PR 3 (= 2026-05-04) で Archive v2 圧縮形式に移行** (= 本 ARCHIVE.md + archive.manifest.json の 2 file に集約)

## restore 手順

active 期 file 18 件 (= AI_CONTEXT / HANDOFF / plan / checklist / decision-audit / discovery-log / projectization / DERIVED / breaking-changes / doc-improvement-backlog / aag / derived 12 件) が必要になった場合:

> **注**: `config/project.json` は AAG project-checklist-collector の identification key として参照されるため、Archive v2 圧縮対象から **例外的に残置**。compress 後も working tree に存在し、AAG collector は当 project を引き続き認識する。

```bash
$(jq -r '.restoreAllCommand' projects/completed/aag-self-hosting-completion/archive.manifest.json)
```

= `archive.manifest.json` の `preCompressionCommit` 時点の全 file が working tree に復活 (= git checkout 経由)。検査 / 参照後、`git restore projects/completed/aag-self-hosting-completion/` で working tree を archived 状態に戻す。

詳細な復元 file list は `archive.manifest.json` の `deletedPaths` / `compressedFiles` を参照。

## 関連

### 後続 program

- **operational-protocol-system** (= active、Archive v2 完遂後に M1 着手予定): R5 で resume ready articulate、本 program R6 で `projects/active/operational-protocol-system/` に migrate
- **Archive v2 program** (= 後続 PR で institute、本 program archive 後 self-dogfood): completed → archived 移行時の 圧縮形式 institute、本 program が初の pilot

### 親 program / 並行 program

- **aag-platformization** (= 完遂 archive、2026-05-02): 親系統 (= AAG framework Pilot)、本 program は AAG framework の self-hosting closure を完遂する後続 stream
- **aag-bidirectional-integrity** (= 完遂 archive、2026-05-01): 並行系統 (= AAG framework MVP scope 完遂)、本 program と AAG-REQ-SELF-HOSTING flip を共有

### 制度成果 (= post-archive 発見、本 ARCHIVE.md scope 外)

- **drawer Pattern 1-6**: `references/05-aag-interface/drawer/decision-articulation-patterns.md` (= aag-platformization 由来)、本 program でも全 6 pattern 適用済
- **discovery-log institution**: `projects/_template/discovery-log.md` + PZ-14 guard (= DA-β-003、本 program で発見、5 系統 lens 拡張)

## metadata

- **archiveVersion**: 2
- **schema**: `docs/contracts/project-archive.schema.json`
- **archiveSection**: `references/05-aag-interface/operations/project-checklist-governance.md` §6.4
