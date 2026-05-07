# inquiry/06 — Temporal Scope Shadow Policy

> **役割**: Phase 0 で `references/99-archive/` の archive-manifest 有無を確認し、ADR-SCP-008 例外条項（machine inferred で accepted 扱いとする kind）の trigger 条件を articulate する。
>
> **scope**: Phase 4 Document Kind + Temporal Scope Shadow checker の設計入力 + Phase 2.5 Reading Pass 対象範囲の確定。
>
> **規約**: ADR-SCP-003（製本 = 現在 / archive = 過去 / project = 未来 / generated report = 計算済み現在）+ ADR-SCP-008（例外条項）に従う。

## 1. 確認項目（Phase 0 で完成）

### 1.1. references/99-archive/ の構造

- [ ] `references/99-archive/` 配下の Markdown 全件 listing
- [ ] 各 doc の archive metadata（archive-manifest 等）の有無確認
- [ ] CLAUDE.md / project-checklist-governance.md §6.4 の Archive v2 形式（`archive.manifest.json`）と references/99-archive/ archive doc の関係（archive v1 形式）

### 1.2. projects/completed/ の archive.manifest.json

- [ ] `projects/completed/<id>/archive.manifest.json` の有無を全 completed project で確認
- [ ] `archiveVersion: 2` を持つ project（v2 圧縮形式）と持たない project（v1 形式）の listing
- [ ] schema 確認（`docs/contracts/project-archive.schema.json`）

### 1.3. references/04-tracking/generated/ の generated artifact

- [ ] `references/04-tracking/generated/` 配下の `*.generated.md` / `*.generated.json` 全件 listing
- [ ] 各 file の producer 推定（`tools/architecture-health/src/` 配下のどの collector / renderer が生成しているか）
- [ ] CLAUDE.md `Obligation Map` table の「health regeneration」trigger と整合確認

## 2. ADR-SCP-008 例外条項の trigger 条件

### 2.1. `generated-report` kind の例外条件

```yaml
exception:
  kind: generated-report
  triggerCondition:
    - producer-declared-in-generated-artifacts.yaml
  rationale: >
    producer が宣言済の generated artifact は machine 再生成可能であり、
    temporal scope は computed-present で確定する。Reading Pass による人間/AI 判定は不要。
  examples:
    - references/04-tracking/generated/architecture-health.generated.md
    - references/04-tracking/generated/architecture-health.json
    - references/04-tracking/generated/architecture-health-certificate.generated.md
    - references/04-tracking/generated/recent-changes.generated.md
    - references/04-tracking/generated/project-health.generated.md
    - references/04-tracking/generated/project-health.json
```

実際の判定 flow:

1. Phase 9 で `docs/contracts/src/governance/generated-artifacts.yaml` に各 generated file の `producer` を articulate
2. generated-artifacts.generated.json に同期
3. Phase 2.5 Reading Pass の machine candidate 生成時、producer 宣言済の file は **`disposition: keep-as-generated-report`** で auto-accept
4. Reading Pass の `document-reading-decisions.yaml` に entry 追加（`reviewedBy: machine-inferred-by-producer-declaration`、`alternativesConsidered` は不要）

### 2.2. `archive-doc` kind の例外条件

```yaml
exception:
  kind: archive-doc
  triggerCondition:
    - archive-manifest-exists  # projects/completed/<id>/archive.manifest.json または references/99-archive/<id>/archive.manifest.json
    - OR archived-zone-membership  # references/99-archive/ 配下の場合は archive-manifest なくても暫定 archive-doc として扱う（ratchet-down で archive-manifest 必須化を Phase 後半で）
  rationale: >
    archive-manifest が存在する archive doc は past 時間軸が確定。
    references/99-archive/ 配下の doc は zone semantics により past 時間軸が暫定確定。
  examples:
    - projects/completed/aag-self-hosting-completion/ARCHIVE.md
    - projects/completed/aag-engine-go-mvp/archive.manifest.json
    - references/99-archive/old-plans-summary.md
```

実際の判定 flow:

1. Phase 0 inquiry/06（本 file）で references/99-archive/ の archive-manifest 有無を全件確認
2. Phase 4 で `archive-manifest-exists` 条件を機械判定可能にする
3. Phase 2.5 Reading Pass の machine candidate 生成時、条件 match の file は **`disposition: keep-as-archive`** で auto-accept
4. references/99-archive/ 配下で archive-manifest なしの doc は、Reading Pass で **「archive-manifest 追加 PR を Phase 5 で起動」** という disposition を articulate（人間/AI 判定）

### 2.3. それ以外の kind は人間/AI 判定必須

- `canonical-doc` / `domain-definition` / `implementation-guide` / `operation-protocol` / `project-plan` / `project-checklist` / `index` / `ai-entrypoint` / `inventory-doc` 等
- `reviewedBy` / `reviewedAtCommit` / `reviewedAtSha` / `rationaleSummary` / `alternativesConsidered` 必須（ADR-SCP-009）

## 3. Phase 4 Shadow checker design への入力

本 inquiry の articulate を Phase 4 `tools/governance/check-doc-temporal-scope.ts` の設計入力とする:

- input: doc-registry.json + doc-kind-registry.yaml + temporal-scope-policy.yaml + reading-decisions.yaml + generated-artifacts.yaml
- detection logic:
  1. 各 doc の現在 kind を doc-registry から取得
  2. kind が `canonical-doc` の場合、本文 heading に `History` / `Roadmap` / `Future` / `TODO` / `Phase` / `Migration Log` / `以前は` / `旧実装` / `過去` / `migration log` / `retired` / `今後` / `将来` / `予定` / `roadmap` 等のキーワードがあれば finding
  3. kind が `canonical-doc` の場合、checkbox 存在で finding
  4. kind が `canonical-doc` の場合、generated count / current status の手書き（数値 + 件数 + 残数 等の patterns）で finding
  5. kind が `canonical-doc` の場合、project progress（`Phase X` / `現在 Phase` / `完了 Phase` 等）で finding
  6. ADR-SCP-008 例外条項（`generated-report` / `archive-doc` with archive-manifest）は heuristic から除外
- output: temporal-scope-findings.generated.json

### 3.1. 誤検知許容期間（state-based exit criteria、AAG-REQ-NO-DATE-RITUAL 整合）

不可侵原則 8（advisory のみ）+ 不可侵原則 7（Reading Pass 必須）に従い:

- Phase 4 開始時点で全 finding を一覧化
- Reading Pass 結果と突合し、本物の violation と誤検知に分類
- 誤検知については Phase 4 シグネチャ調整（heuristic exception 追加 / kind 別 allowedContent 拡張）
- exit criteria: `false-positive rate < 10%` かつ `needs-triage 残数 == 0`（state-based）

## 4. Phase 0 で完了する確認項目

- [ ] `references/99-archive/` 配下の Markdown listing 完了
- [ ] 各 archive doc の archive-manifest 有無確認完了
- [ ] `projects/completed/` 配下の archive.manifest.json listing 完了
- [ ] `references/04-tracking/generated/` 配下の generated artifact listing 完了
- [ ] 各 generated artifact の producer 推定完了
- [ ] ADR-SCP-008 例外条項の trigger 条件が articulate
- [ ] Phase 4 Shadow checker の detection logic candidate が articulate
- [ ] state-based exit criteria（false-positive rate / needs-triage 残数）が articulate

## 4.5. Phase 0 acceptance criteria（inquiry/07 §6 整合）

本 inquiry が Phase 1 へ進む前に articulate すべき 7 項目:

| 項目 | 内容 | status |
|---|---|---|
| **対象ファイル / 対象資産** | `references/99-archive/` 配下 Markdown 全件 + `projects/completed/` 配下 archive.manifest.json + `references/04-tracking/generated/` 配下 generated artifact | articulated（§1） |
| **現在の正本** | archive doc は `references/99-archive/<id>/<doc>.md` または `projects/completed/<id>/ARCHIVE.md` + `archive.manifest.json` / generated artifact は producer に依存（`tools/architecture-health/src/`） | articulated（§1） |
| **新構造での位置付け** | ADR-SCP-008 例外条項（machine inferred で auto-accept）の trigger 条件として articulate / Phase 4 Shadow checker の detection logic 入力 / Phase 2.5 Reading Pass 範囲外（auto-accept 対象） | articulated（§2） |
| **移行方針** | Phase 0 で全件 listing → Phase 4 で trigger 条件機械判定可能にする → Phase 2.5 で Reading Pass 範囲外として articulate → Phase 5 で `disposition: generated-register` / `disposition: keep-as-archive` PR landing | articulated（§2 / §3） |
| **未解決事項** | Q1〜Q4 open（§5）。特に Q3（製本 project progress 検出 heuristic）と Q4（AI session note 検出 heuristic）は Phase 4 で確定 | partially articulated |
| **Phase 1 以降への入力** | (a) Phase 4 Shadow checker の detection logic candidate（§3）/ (b) state-based exit criteria（§3.1: false-positive rate / needs-triage 残数）/ (c) 4 段階分類（即 finding / candidate finding / 許可される参照 / 禁止表現、inquiry/07 §6） | articulated |
| **acceptance criteria** | (1) references/99-archive/ listing 完了 / (2) archive-manifest 有無確認完了 / (3) projects/completed/ archive.manifest.json listing 完了 / (4) generated artifact listing 完了 / (5) 各 generated artifact producer 推定完了 / (6) ADR-SCP-008 trigger 条件 articulate / (7) Phase 4 Shadow checker detection logic candidate articulate / (8) state-based exit criteria articulate | §4（既存）と整合 |

### 補足: 4 段階の許可/禁止表現整理（inquiry/07 §6 と同期）

製本 (`canonical-doc`) で **許可される参照**（本文展開なし、Document ID / Project ID リンクのみ）:

```markdown
詳細な移行履歴は [DOC-ARCHIVE-XXX](path/to/archive.md) を参照。
今後の再編計画は [PROJECT-YYY](projects/active/<id>/plan.md) を参照。
過去の実装経緯は [archive doc](path/to/archive.md) を参照。
```

許可条件: リンク文字列に `archive` / `historical` / `retired` / `project` / `plan` のいずれかを含む + 本文展開していない（段落説明なし）。

製本で **禁止される表現**（即 finding、Phase 4 で hard-gate 候補）:

```markdown
Phase 3 では...
今後は...
旧実装では XXX のように...
TODO: ...
```

理由: 本文展開しているため、参照ではなく実体。製本に過去/未来の実体記述があると drift / 肥大化する。

## 5. open questions

- Q1: references/99-archive/ で archive-manifest なしの doc に対し、Phase 5 で archive-manifest 追加 PR を切るか、それとも `archived-zone-membership` 条件のみで accept するか? → 暫定: `archived-zone-membership` で暫定 accept、Phase 後半で archive-manifest 必須化への ratchet-down を別 program 候補として articulate
- Q2: 「現在値の手書き」の検出 heuristic は何で判定するか? → 暫定: regex `(\d+)\s*(件|個|file|count|entry|residual|残)` 等の数値+単位 pattern を検出、ただし「N ファイル」のような generic 表現も多いため誤検知率が高い → CLAUDE.md `no-static-numbers` Test Contract（既存）と統合判定
- Q3: 「製本に project progress が混入」の検出 heuristic は? → 暫定: `Phase \d+` heading + checkbox の **同時存在** で検出（checkbox のみ / Phase 言及のみは false-positive 多発）
- Q4: AI session note（implementation-history kind）の検出 heuristic は? → 暫定: `Implementation` / `Notes` / `Working` 等の heading + 1 人称 narrative（「実装した」「気づいた」「調査した」）で検出。誤検知率高、Phase 4 で確定
