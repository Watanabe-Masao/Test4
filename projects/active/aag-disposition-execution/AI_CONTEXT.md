# AI_CONTEXT — aag-disposition-execution

> 役割: project 意味空間の入口（why / scope / read order）。
> 親 umbrella: `projects/active/aag-governance-ratchet-down/`

## Project

AAG Disposition Execution (= Sub-3 of aag-governance-ratchet-down umbrella)

## Purpose

aag-structural-control-plane の **Reading Pass で articulate された 19 件の disposition** を実
execution する program。各 disposition は file movement / content split / archive / generator 登録
を実施。

**19 件 disposition 内訳** (= reading-decisions.yaml articulate):
| disposition | count | 内容 |
|---|---|---|
| move | 12 | 旧 location から canonical location へ物理移動 |
| split | 3 | 1 doc を articulate に従い 2 doc に分割 |
| archive | 3 | references/99-archive/ への移動 + frontmatter 装着 |
| generated-register | 1 | machine-generated への移行 + producer 登録 |

各 disposition は reading-decisions entry の rationaleSummary で articulate 済。本 program は
articulate を実 file system change に converted する。

## Scope

**含む**:
- 19 件 file movement の物理 execution (= git mv / split / archive 移動)
- 各 movement に対応する reference update (= grep ベースで全 inbound update)
- archive frontmatter 装着 (= archived/archivedAt/migratedTo 等)
- generated-register: producer articulate + .generated.* suffix 装着

**含まない**:
- 新 disposition 追加 (= 19 件のみ scope)
- Reading Pass の new batch (= 100% 完遂済)
- 新 schema 追加
- AI 単独 archive (= 各 sub-PR で user 判断 gate 経由)

## 推奨 sub-PR 分割

各 disposition group を独立 sub-PR で landing (= AAG-SCP-MIGRATION-005 = 1 Finding group = 1 PR):
1. sub-PR 1: bootstrap (本 PR、3 sub-programs 一括 spawn)
2. sub-PR 2: archive 3 件 group execution (= 最 atomic、frontmatter 装着 + 99-archive/ 移動)
3. sub-PR 3〜7: move 12 件を 4-5 group に分割
4. sub-PR 8: split 3 件 (各独立、content split 必要)
5. sub-PR 9: generated-register 1 件 (producer articulate)

## Read Order

1. 本ファイル
2. `HANDOFF.md`（現在地 + 次にやること）
3. 親 umbrella `HANDOFF.md`（共有 context）
4. `docs/contracts/src/docs/document-reading-decisions.yaml`（19 件 entry の articulate 詳細）
5. `references/05-aag-interface/operations/projectization-policy.md`（archive frontmatter 装着 articulate）
