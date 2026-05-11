# HANDOFF — aag-coverage-rule-expansion

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**完遂、archive 移行待ち** (= 2026-05-10 spawn → 同日 1 commit で全 Phase landed)。

### 完遂 summary

- artifact-coverage.yaml に 67 新 rules append (= 17 → 84 rules)
- **unmanaged 86.2% → 0% 達成** (= 3193 件 → 0 件、target ~50% を大幅上回り)
- 全 3704 zone classified (= declared 3225 / archived 409 / generated 51 / external 49 / ignored 7)
- ratchet-down baseline=0 固定 (= 新規 file は明示的 categorize 必須、advisory warning emit)

### 数値 snapshot

| 指標 | aag-scp Wave 3 baseline | Sub-1 完遂後 |
|---|---|---|
| 総 rules | 17 | 84 (+67) |
| tracked zones | 3704 | 3704 |
| unmanaged | 3193 (86.2%) | 0 (0%) |
| managed (= declared+archived+generated+external+ignored) | 511 | 3704 |

### landed commits

- `f0bfc39` feat(aag-ratchet): Sub-1 + Sub-2 1st guard parallel implementation
  - Sub-1: 67 rules append + 100% coverage 達成 (= Agent 1 並行 impl)

## 2. 次にやること

詳細は `checklist.md` を参照。

### 高優先 (= archive 移行前の最終 gate)

- 最終レビュー (user 承認) section の [x] flip 待ち (= 機能 Phase + AI 自己レビュー section は全 [x] 済)

### 中優先 (= user 承認後の archive プロセス)

- archive 移行 (= projects/active/aag-coverage-rule-expansion/ → projects/completed/、Archive v2 形式で ARCHIVE.md + archive.manifest.json 装着)
- 親 umbrella `sub-project-map.md` の Sub-1 status を archive 反映 + open-issues.md 索引 update

### 低優先 (= 別 program 候補、本 Sub-1 scope 外)

- coverage rule の hard gate 昇格判断 (= Sub-2 + Sub-4 系統経由)
- 新 category 追加 (例: 'plugin' / 'overlay') が必要になった場合 = schema 拡張 separate program

## 3. ハマりポイント

### 3.1. rule order が match に影響する

artifact-coverage.yaml は **最初 match を採用** する設計。新 rule を append する際、より一般的な
pattern (例: `references/**/*.md`) を上に置くと specific rule (例: `references/04-tracking/generated/**`)
が永遠に match しなくなる。**specific は先、general は後** が原則。

### 3.2. baseline = 0 は anti-fragile

unmanaged baseline=0 は「新規 file 追加で必ず warning が出る」mechanism = ratchet-down 自動化。
誤解しがちな罠: 「新 file を rule に add せず category=ignored で済ませる」と本来 declared
すべき file が暗黙的に外れる。**新 file は category を judgement (= declared/external/ignored
の理由 articulate) してから rule append**。

### 3.3. 即 hard gate 化禁止 (AAG-SCP-DOC-LEARNING-002 整合)

advisory checker は warning emit のみ、CI fail なし。Sub-1 で hard gate に直接昇格させない。
hard gate 化は Sub-2 (guard articulate) + Sub-4 (maturity progression) 経由で user 判断 gate
を経る (= 5 段階 maturity: observed → pattern-articulated → guardrail-candidate-emitted →
guardrail-shadow → guardrail-advisory)。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 意味空間の入口 (= why / scope / read order) |
| `plan.md` | 不可侵原則 + Phase 1〜3 articulate |
| `checklist.md` | 全 Phase + AI 自己レビュー [x]、最終レビュー [ ] (= user 承認待ち) |
| `decision-audit.md` | ADR-COV-* lineage (= 67 rules の articulate 判断記録) |
| `discovery-log.md` | scope 外発見の蓄積 (= 本 Sub-1 では特になし) |
| `projectization.md` | AAG-COA 判定 (= Level 2 governance-hardening / requiresHumanApproval=true) |
| 親 umbrella `projects/active/aag-governance-ratchet-down/HANDOFF.md` | 共有 context (= Sub-1 完遂 articulate) |
| `projects/completed/aag-structural-control-plane/` | 前駆 program (= 86.2% baseline articulate) |

### 本 Sub-1 で landed deliverables

| 成果物 | パス |
|---|---|
| 67 新 rules | `docs/contracts/src/governance/artifact-coverage.yaml` |
| coverage report | `references/04-tracking/generated/artifact-coverage.generated.md` |
| advisory checker (= aag-scp で landed、Sub-1 で baseline=0 適用) | `tools/governance/check-coverage.mjs` |

## 5. 後任者向け checklist

archive 移行前に以下を確認:

1. [x] checklist.md の各 Phase section が全 [x] になっている
2. [x] AI 自己レビュー section の総 review 完了 (= 不可侵原則違反 0 / 歪み 0 / 潜在バグ 0)
3. [ ] 最終レビュー (user 承認) section の user 判断完了 + [x] flip
4. [ ] archive 移行手順実行 (= Archive v2 形式、git mv + ARCHIVE.md + archive.manifest.json)
5. [ ] 親 umbrella sub-project-map.md の Sub-1 status update (= active → archived)
