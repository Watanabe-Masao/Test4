# inquiry/07 — Phase 0 Acceptance Criteria（10 項目集約）

> **役割**: Phase 0 で **Phase 1 へ進む前に確定すべき 10 項目** の acceptance criteria を集約する。各項目は inquiry/01〜06 / decision-audit.md の ADR / plan.md の該当 section へ cross-link する。
>
> **scope**: 「何をもって Phase 0 完了か」「どこまでを自動判定するか」「既存資産とどう接続するか」を明確化する。Phase 1 schema 設計の揺れを抑止する。
>
> **規約**: ADR-SCP-010〜013（本 inquiry と同 commit で landing）+ ADR-SCP-001〜009（既 landing）。

## 0. 思想層別（前提）

> ADR-SCP-014「Guidance over restriction」+ 不可侵原則 11 に従う。

```
思想 (= 不可変)
  → AI の判断を定性的に導くもの
  例: 「製本は現在の正本」「過去 = archive / 未来 = project」

Contract (= 構造的前提)
  → AI と repo が共有する構造的な前提
  例: doc-registry の kind / temporalScope / requiredSections

Guidance (= 文脈提供)
  → AI が良い判断をするための文脈・観点・参照先
  例: AI Instruction Pack（「命令書」ではなく「文書kindごとの guidance」）

Gate (= 構造破綻検出)
  → 構造的に判定可能な違反のみを foul する安全網
  例: 未登録 Markdown / generated 手編集 / 製本に Roadmap section
```

合言葉: **`Plan → Context → Contract → Guidance → Gate`**

### 定量・定性の分離（機械検証 scope の articulate）

| 機械検証する（Gate scope） | 定性的に AI を導く（Guidance scope） |
|---|---|
| 未登録 Markdown | この文書は何のためにあるか |
| requiredSections 欠落 | 読者は誰か |
| generated artifact の producer 不明 | どの粒度で説明すべきか |
| generated file の手編集 | 何を判断材料として扱うか |
| doc kind / topology mismatch | 過去・現在・未来をどう分けるか |
| 製本に TODO / Roadmap section | どのような設計思想を優先するか |
| 例外に owner / reason / reviewAfter なし | どの文脈を参照すべきか |
| YAML 変更後の generated JSON 未更新 | 比喩 / 表現の適切さ |

左側だけが foul 可能な構造ルール。右側は AI / human review の責務であり、AAG が無理に数値化しない。

本 inquiry で articulate する 10 acceptance criteria は **すべて左側（構造ルール）に属するもの** であり、右側（定性的 guidance）の機械化を企図しない。

## 0.5. 優先度

| 優先度 | 項目 | landing 先 |
|---|---|---|
| **高 #1** | Phase 0 inquiry の完了条件 | 本 inquiry §1（各 inquiry に必須項目を articulate） |
| **高 #2** | doc-registry.json 拡張フィールド（最小 set） | inquiry/03 + ADR-SCP-002 + 本 inquiry §2 |
| **高 #3** | Reading Pass の記録フォーマット | ADR-SCP-010 + 本 inquiry §3 |
| **高 #4** | disposition taxonomy（6 分類） | ADR-SCP-011 + 本 inquiry §4 |
| **高 #5** | Finding schema 最小 set | ADR-SCP-013 + 本 inquiry §5 |
| 次点 #6 | Temporal Scope 誤検知 policy | inquiry/06 + 本 inquiry §6 |
| 次点 #7 | unmanaged-but-tolerated の意味 | plan.md 不可侵原則 4 補強 + ADR-SCP-004 + 本 inquiry §7 |
| 次点 #8 | YAML→JSON normalize deterministic rule | ADR-SCP-001 補強 + 本 inquiry §8 |
| 次点 #9 | self-check / index への接続 | inquiry/04 + 本 inquiry §9 |
| 次点 #10 | Phase 5 PR 分割基準 | ADR-SCP-012 + 本 inquiry §10 |

## 1. Phase 0 inquiry の完了条件（高 #1）

各 inquiry/01〜06 が以下 7 項目を articulate していることを Phase 0 完了条件とする:

| 必須項目 | 内容 |
|---|---|
| **対象ファイル / 対象資産** | 何を inventory 対象にするか |
| **現在の正本** | 現在の source of truth path / 形式 |
| **新構造での位置付け** | 本 program の新 schema / contract 配置との関係 |
| **移行方針** | 既存 → 新構造への移行 step |
| **未解決事項** | open questions（Phase 0 で解消するか、Phase 1+ で解消するか） |
| **Phase 1 以降への入力** | 後続 Phase の入力として何を渡すか |
| **acceptance criteria** | 当該 inquiry の完了判定（state-based） |

inquiry/01〜06 の現状:

- inquiry/01: 既存資産 listing + 新配置 mapping は articulate 済 + open questions あり → **acceptance criteria** section を追記必要
- inquiry/02: YAML 5 分類 articulate 済 + open questions あり → **acceptance criteria** section を追記必要
- inquiry/03: doc-registry 拡張ポイント articulate 済 + open questions あり → **§2 最小 field set** を本 inquiry で articulate（既存 inquiry に back link）
- inquiry/04: self-check drift articulate 済 + open questions あり → **§9 self-check / index 接続** を本 inquiry で articulate
- inquiry/05: 3 段階 migration articulate 済 + open questions あり → 既に十分 articulate
- inquiry/06: ADR-SCP-008 例外条項 articulate 済 + open questions あり → **§6 誤検知 policy** を本 inquiry で articulate

## 2. doc-registry.json 拡張フィールド最小 set（高 #2）

ADR-SCP-002 に従い、既存 doc-registry.json entry に **optional field として additive 拡張** する最小 set:

```jsonc
{
  "// existing required fields": "path / label 等は不変",
  "kind": "canonical-doc",
  "temporalScope": "present",
  "owner": "documentation-steward",
  "audience": ["implementation", "review-gate"],
  "requiredSections": ["Purpose", "Scope", "Current Contract"],
  "forbiddenContent": ["future-plan", "implementation-history"],
  "granularity": {
    "unit": "single-concern"
  },
  "lifecycle": "active"
}
```

Reading Pass 後に追加する review block（Phase 5.2 以降で additive 拡張）:

```jsonc
{
  "review": {
    "status": "reviewed",
    "reviewedBy": "<AI session ID or human reviewer ID>",
    "reviewedAtCommit": "<commit SHA>",
    "reviewedAtSha": "<file blob SHA at commit>",
    "disposition": "keep-and-contract"
  }
}
```

**Phase 0 完了条件**:

- [ ] 上記最小 set が `docs/contracts/schema/document-contracts.schema.json` の draft として articulate される（Phase 1 で正式 schema landing）
- [ ] 既存 generator pipeline（`references/04-tracking/recent-changes.generated.md` 系）が `kind` / `temporalScope` 等の **未知 field を無視する** ことを inquiry/03 で確認する
- [ ] Reading Pass 後 `review` block 追加が後方互換であることを articulate（Phase 5.2 で実施、Phase 0 では schema design のみ）

## 3. Reading Pass 記録フォーマット（高 #3）

ADR-SCP-010 に従い、Reading Pass の各 entry は以下を記録する:

```yaml
# docs/contracts/src/docs/document-reading-decisions.yaml の各 entry
- path: references/03-implementation/example.md
  currentZone: references/03-implementation
  proposedKind: implementation-guide
  temporalScope: present
  disposition: keep-and-contract
  contains:
    presentContract: true
    implementationHistory: false
    futurePlan: false
    generatedState: false
    taskList: false
  review:
    reviewedBy: "<ai-session-id or human-id or ai-human-pair>"
    reviewedAtCommit: "<commit SHA>"
    reviewedAtSha: "<file blob SHA at commit>"
    rationaleSummary: "<1-2 文の判断根拠>"
    alternativesConsidered:
      - kind: operation-protocol
        rejectedBecause: "<却下理由>"
      - kind: domain-definition
        rejectedBecause: "<却下理由>"
```

**disposition: split** の場合の追加 field:

```yaml
- path: references/01-foundation/something.md
  disposition: split
  splitTargets:
    present: references/01-foundation/<extracted-current>.md
    past: references/99-archive/<id>/ARCHIVE.md  # archive doc
    future: projects/active/<project-id>/plan.md  # project plan
    rationale: "<分割根拠>"
```

**disposition: move** の場合の追加 field:

```yaml
- path: references/03-implementation/old-location.md
  disposition: move
  moveTo: references/05-aag-interface/operations/new-location.md
  rationale: "<移動根拠>"
```

**disposition: archive** の場合の追加 field:

```yaml
- path: references/03-implementation/retired.md
  disposition: archive
  archiveTo: references/99-archive/<id>/<retired>.md  # または projects/completed/<id>/
  archiveManifest: true  # archive-manifest 同時 landing
  rationale: "<archive 根拠>"
```

**Phase 0 完了条件**:

- [ ] 上記フォーマットが `docs/contracts/schema/reading-pass.schema.json` draft として articulate される（Phase 1 で正式 schema landing）
- [ ] split / move / archive 各 disposition の追加 field が定義される
- [ ] Phase 2.5 Reading Pass 開始時にこのフォーマットを使う旨が plan.md に articulate されている

## 4. disposition taxonomy（高 #4）

ADR-SCP-011 に従い、原案 4 分類を **6 分類**に拡張:

| disposition | 性質 | Phase 5 での扱い |
|---|---|---|
| `keep-and-contract` | 現在の場所・内容で妥当。Document Contract のみ付与 | doc-registry に kind / temporalScope additive 拡張、本文編集なし |
| `split` | 1 文書に複数責務（present + past + future）が混在 | 本文を分割し、present / past / future に分配。各 split target に doc 新設 |
| `move` | 内容は有効だが置き場所が違う | 物理移動、doc-registry path 更新 |
| `archive` | 現行の正本ではない | `references/99-archive/` または `projects/completed/` へ移動、archive-manifest 必須 |
| `generated-register` | **新規追加**: generated report として登録するだけ（既に producer が存在し、ADR-SCP-008 例外条項で auto-accept） | doc-registry に kind=generated-report として追加、producer field 必須、本文編集なし |
| `needs-triage` | **新規追加**: 判断保留（Phase 2.5 完了条件 = needs-triage 残数 == 0） | Phase 2.5 内で再 review、最終 disposition を確定してから Phase 5 へ進む |

**Phase 0 完了条件**:

- [ ] 6 分類が `docs/contracts/schema/reading-pass.schema.json` の disposition enum として articulate される
- [ ] Phase 2.5 完了条件「needs-triage 残数 == 0」が plan.md に articulate されている（既存）
- [ ] `generated-register` 分類が ADR-SCP-008 例外条項（machine inferred で auto-accept）と整合

**`delete-candidate` を採用しない理由**: 「archive にも残さない候補」は本 program の scope 外（archive 廃止は別 program 候補）。最初は使わず、必要なら別 program で escalate。

## 5. Finding schema 最小 set（高 #5）

ADR-SCP-013 に従い、`docs/contracts/schema/aag-finding.schema.json` の最小 field set:

```jsonc
{
  "id": "FND-DOC-TEMPORAL-001",  // FND- prefix で Document ID と区別
  "schemaVersion": "aag-finding-v1",
  "severity": "warn",  // info | warn | error
  "phase": "shadow",  // shadow | new-only-gate | hard-gate
  "subject": {
    "kind": "document",  // document | tree | artifact | generated | obligation | runner-step
    "path": "references/...",
    "lineRange": "84-90"  // optional
  },
  "rule": {
    "id": "DOC-TEMPORAL-PRESENT-ONLY",  // 違反した rule ID
    "category": "temporal-scope"  // temporal-scope | tree-contract | document-contract | artifact-coverage | runner-parity
  },
  "problem": "<観測した現象 1 文>",
  "expected": "<期待される状態 1 文>",
  "suggestedDisposition": "move-to-project",  // keep-and-contract | split | move | archive | generated-register | needs-triage | accept-as-is | out-of-scope-for-this-program
  "confidence": "medium",  // high | medium | low
  "falsePositiveAllowed": true,  // shadow phase での誤検知許容 flag
  "detectedBy": "check-doc-temporal-scope",  // detector 名
  "detectedAt": {
    "commit": "<SHA>",
    "phase": "phase-2-5-reading-pass"
  },
  "status": "open"  // open | acknowledged | resolved | wontfix | superseded
}
```

**特に重要な 3 field**:

- `confidence` — high / medium / low の 3 段階。shadow phase で low / medium を許容、hard-gate phase で high のみ
- `suggestedDisposition` — finding を triage する際の disposition candidate を機械提示
- `status` — finding lifecycle の trace（open → resolved / wontfix / superseded）

**Phase 0 完了条件**:

- [ ] 上記最小 field set が `docs/contracts/schema/aag-finding.schema.json` draft として articulate される（Phase 1 で正式 schema landing）
- [ ] FND- prefix が DOC-（Document ID）と区別可能であることを grep 検証
- [ ] confidence / suggestedDisposition / status 3 field が必須として articulate される

## 6. Temporal Scope 誤検知 policy（次点 #6）

inquiry/06 の補強。Temporal checker の初期仕様は以下 4 段階を articulate する:

### 6.1. 即 finding（hard-gate phase で error）

- canonical-doc に `## Phase \d+` heading（実装段階の articulate）
- canonical-doc に `## TODO` / `## FIXME` heading
- canonical-doc に `## Migration Log` heading
- canonical-doc に `## Roadmap` heading
- canonical-doc に `## Future` heading
- canonical-doc に checkbox（`- [ ]` / `- [x]`）が 1 つ以上

### 6.2. candidate finding（shadow phase で warn、Reading Pass で確定）

- canonical-doc 本文に「今後」「将来」「予定」「以前は」「旧実装」「過去」等のキーワード
- canonical-doc に generated count / current status の手書き候補（数値 + 件数 + 残数 patterns）
- canonical-doc に project progress 候補（`現在 Phase` / `完了 Phase` 等）

### 6.3. 許可される参照表現（false positive として扱う）

製本本文で **許される表現**（本文展開なし、Document ID / Project ID リンクのみ）:

```markdown
詳細な移行履歴は [DOC-ARCHIVE-XXX](path/to/archive.md) を参照。
今後の再編計画は [PROJECT-YYY](projects/active/<id>/plan.md) を参照。
過去の実装経緯は [archive doc](path/to/archive.md) を参照。
```

許可条件:

- リンク文字列に `archive` / `historical` / `retired` / `project` / `plan` のいずれかを含む
- 本文展開（段落として説明）していない

### 6.4. 禁止表現（即 finding）

```markdown
Phase 3 では...
今後は...
旧実装では XXX のように...
TODO: ...
```

理由: 本文展開しているため、参照ではなく実体。製本に過去/未来の実体記述があると drift / 肥大化する。

**Phase 0 完了条件**:

- [ ] 上記 4 段階が `docs/contracts/src/docs/temporal-scope-policy.yaml` draft として articulate される（Phase 4 で正式 landing）
- [ ] inquiry/06 の Q4（AI session note の検出 heuristic）が解消または Phase 4 への送り articulate

## 7. unmanaged-but-tolerated の意味（次点 #7）

ADR-SCP-004 の補強。`unmanaged-but-tolerated` の意味を以下に articulate:

### 7.1. 定義

```yaml
unmanaged-but-tolerated:
  meaning: 既存構造として inventory に載るが、Phase 1 MVP では Tree Contract 必須対象ではない
  inventoryListed: true   # repo-topology.generated.json に載る
  contractRequired: false # tree-contracts.yaml への宣言は不要
  newDirectoryAllowed: true   # 既存 unmanaged 配下への新規子 directory 追加は OK（finding なし）
  newTopLevelAllowed: false   # 新規 top-level directory 追加は finding（new-only gate 対象、Phase 3 完了後）
  promotionPath: managed  # 必要時に Phase 1 MVP scope に追加 = managed 化
```

### 7.2. 恒久化抑止

`unmanaged-but-tolerated` は**ratchet-down 対象**。具体的には:

- Phase 3 完了時の baseline = 現在の unmanaged-but-tolerated 数
- 以降、baseline は単調減少のみ（managed への promotion は OK、新規 unmanaged 化は finding）
- 1 年後に再評価（state-based exit、AAG-REQ-NO-DATE-RITUAL 整合のため期間 buffer ではなく「全 unmanaged が managed か archive されるまで」状態判定）

### 7.3. promotion 判断

unmanaged → managed への promotion trigger:

- 当該 directory に新 Tree Contract を追加した方が境界統制が向上すると判断（user 判断）
- 当該 directory が他 directory との依存関係を持ち、forbidden child 検出の対象にすべき
- 当該 directory に layer 違反 candidate が観測された

**Phase 0 完了条件**:

- [ ] 上記定義が `docs/contracts/schema/tree-contracts.schema.json` の draft で articulate される（Phase 1 で正式 schema landing）
- [ ] Phase 3 完了時の baseline 取得手順が plan.md Phase 3 に articulate される

## 8. YAML→JSON normalize deterministic rule（次点 #8）

ADR-SCP-001 補強。normalize の deterministic rule:

### 8.1. 配置規則

- YAML は `docs/contracts/src/` 配下のみ許可（その他配置は finding）
- generated JSON は `docs/contracts/generated/` 配下のみ
- Detector / CI / AAG CLI / architecture-health は generated JSON のみ読む（YAML 直読は finding）
- generated JSON 手編集禁止（producer 経由のみ）

### 8.2. normalize 手順

1. YAML を parse
2. **deterministic sort**: object key を alphabetical sort、array は order-preserving（YAML 上の order を保持）
3. JSON の indent = 2 spaces、final newline あり
4. metadata block を頭に articulate:
   ```jsonc
   {
     "$comment": "Generated from <source paths>. Do not edit manually.",
     "schemaVersion": "<schema version>",
     "sourceSha": {
       "<source-yaml-1>": "<file blob SHA>",
       "<source-yaml-2>": "<file blob SHA>"
     },
     "sourcePaths": ["docs/contracts/src/.../foo.yaml"],
     "generatedAt": "<ISO 8601 timestamp>",
     "// content": "..."
   }
   ```

### 8.3. drift 検出

- YAML 変更時に generated JSON が更新されていなければ finding（pre-push hook で検出）
- generated JSON 手編集は finding（sourceSha と実 YAML hash の不一致で検出）
- normalize 結果が deterministic でない場合（同 YAML から異なる JSON が生成される）は normalizer bug として finding

### 8.4. self-check 対象

`sourceSha` / `sourcePaths` を持つ generated JSON は self-check で:

- sourceSha と実 YAML hash の整合確認
- sourcePaths の file 存在確認
- generatedAt の sanity（remote past でないこと、未来でないこと）

**Phase 0 完了条件**:

- [ ] 上記 4 規則が ADR-SCP-001 補強として decision-audit.md に追記される
- [ ] `tools/governance/normalize-*.ts`（Phase 1 から landing）が deterministic sort + sourceSha + sourcePaths + generatedAt を articulate する
- [ ] self-check 拡張（Phase 9 / 10）で sourceSha 整合検証 step を追加する候補を articulate

## 9. self-check / index への接続（次点 #9）

inquiry/04 の補強。本 program の新 schema / command / generated artifact を AAG self-check / index 体系へ接続する論点:

### 9.1. 接続候補

| 新 artifact | self-check 対象? | aag index 対象? |
|---|---|---|
| `docs/contracts/schema/aag-finding.schema.json` | yes（schemaInfoTable に追加、producer / consumer 双方 articulate） | yes（aag index schema で出る） |
| `docs/contracts/schema/tree-contracts.schema.json` | yes | yes |
| `docs/contracts/schema/doc-kind-registry.schema.json` | yes | yes |
| `docs/contracts/schema/document-contracts.schema.json` | yes | yes |
| `docs/contracts/schema/temporal-scope-policy.schema.json` | yes | yes |
| `docs/contracts/src/*.yaml` | no（authoring source、self-check 対象外） | no（command surface に出さない） |
| `docs/contracts/generated/*.generated.json` | yes（producer 必須、self-check で sourceSha 整合検証） | yes（aag index でも generated artifact として出る candidate） |
| `tools/governance/check-*.ts` | yes（implTable / testTable） | yes（aag index command で出す candidate） |
| `tools/governance/normalize-*.ts` | yes（implTable / testTable） | yes（aag index command で出す candidate） |
| `aag docs instruction <doc-id>` command（Phase 6） | yes（commandTable / introspect） | yes（aag index command） |

### 9.2. 接続タイミング

- **Phase 1**: aag-finding.schema.json + tree-contracts.schema.json + doc-kind-registry.schema.json + document-contracts.schema.json + temporal-scope-policy.schema.json を schemaInfoTable に additive 追加
- **Phase 3**: tree-contract checker を implTable に additive 追加
- **Phase 4**: doc-kind / temporal-scope checker を implTable に additive 追加
- **Phase 5**: document-contract checker を implTable に additive 追加
- **Phase 6**: `aag docs instruction` command を commandTable / introspect に追加（reposteward 側で landing 想定）
- **Phase 9**: artifact-coverage checker を implTable に追加 + self-check の sourceSha 整合検証 step 追加 candidate
- **Phase 10**: runner-parity checker を implTable に追加

### 9.3. self-check 拡張候補（V8 / V9）

本 program の新 schema 群が増えると、self-check に新軸が必要になる可能性:

- **V8 candidate**: `docs/contracts/generated/*.generated.json` の sourceSha 整合検証（YAML 手編集 / generated JSON 手編集の検出）
- **V9 candidate**: `docs/contracts/src/*.yaml` の schema validation（src/ 内に schema 違反 YAML がないこと）

V8 / V9 は本 program では **追加しない**（reposteward / aag-engine 側で扱うのが自然）。本 inquiry では候補として記録のみ。

**Phase 0 完了条件**:

- [ ] 上記 9.1 接続候補表が articulate される
- [ ] Phase 別接続タイミング（9.2）が articulate される
- [ ] V8 / V9 候補が discovery-log P2 entry として articulate される（本 program scope 外）

## 10. Phase 5 PR 分割基準（次点 #10）

ADR-SCP-012 に従い、Phase 5 の Finding group 単位 = **zone × disposition**:

### 10.1. PR 分割例

| PR タイトル | zone | disposition | 想定 PR 数 |
|---|---|---|---|
| `phase5(zone-01-foundation): keep-and-contract` | references/01-foundation | keep-and-contract | 1 |
| `phase5(zone-01-foundation): split-history-to-archive` | references/01-foundation | split | 数件（doc 単位） |
| `phase5(zone-01-foundation): move-to-project` | references/01-foundation | move | 数件 |
| `phase5(zone-03-implementation): keep-and-contract` | references/03-implementation | keep-and-contract | 1 |
| `phase5(zone-03-implementation): move-project-plan-to-projects` | references/03-implementation | move | 数件 |
| `phase5(zone-04-tracking): generated-register` | references/04-tracking | generated-register | 1（一括） |
| `phase5(zone-99-archive): archive-manifest-add` | references/99-archive | archive | 数件 |

### 10.2. 想定 PR 数

- zone 数: 6（01〜04 + 05-aag-interface + 99-archive）
- disposition: 6（keep-and-contract / split / move / archive / generated-register / needs-triage）
- 全組み合わせ: 6 × 6 = 36
- 実際は zone × disposition で entry が空のものは PR 不要 → 想定 15〜25 PR

### 10.3. 例外

- `disposition: needs-triage` は Phase 2.5 で残数 0 にするため Phase 5 PR 対象外
- 同 zone 同 disposition 内で entry 数が多い場合（split 等で 10+）は doc kind 単位で分割可（zone × disposition × kind）

**Phase 0 完了条件**:

- [ ] 上記 10.1 / 10.2 / 10.3 が plan.md Phase 5 section に articulate される
- [ ] 想定 PR 数が articulate される（実数は Phase 2.5 完了時に確定）

## 10.5. やってはいけないこと の §A/§B 分類（不可侵原則 11 / GUIDANCE-005 整合）

ADR-SCP-014 + AAG-SCP-GUIDANCE-005 に従い、plan.md「やってはいけないこと」を §A（仕組み化可能 = CI で foul）と §B（仕組み化不可 = AI/human review）に 2 分類する。§A の各項目には **検出ロジックがセットで articulate** される。

### §A: 仕組み化できるもの（検出装置 + landing phase が必須、§A1/§A2 細分）

plan.md「やってはいけないこと」§A は **§A1（AAG Core 永続、parse-heavy も含む）** と **§A2（project-scoped boundary protection、parse-free 限定、archive で消失）** に細分（GUIDANCE-007）。

§A2 = **「触ってはいけない / 変更してはいけない / 崩してはいけない」boundary protection**。AI が安心してアクセルを踏めるように事前に敷くガードレール。本 program 全期間（Phase 0〜10）を通じて一貫して禁止される事項に限定。

各項目は以下を必須記述:

- **違反根拠**: どの不可侵原則 / ADR / projectization.md nonGoal に違反するか
- **検出装置 + 配置**: §A1 = `tools/governance/check-*.ts`（parse-heavy 含む）/ §A2 = `projects/active/aag-structural-control-plane/aag/scp-checkers/`（parse-free 限定、AI が `aag scp check --project <id> <checker>` で呼び出し可能）
- **landing phase**: 検出装置が advisory として動き始める phase
- **lifecycle**: §A1 = 永続 / §A2 = archive 時 Archive v2 §6.4 で物理削除

検出装置の総数（boundary protection narrowing 後）:

- §A1（AAG Core 永続）: **11 件**（`check-yaml-machine-truth` / `check-doc-contracts` / `check-doc-temporal-scope` / `check-tree` / `check-no-prewrite-hook` / `check-obligation-drift` / `check-reading-pass-schema` / `check-phase-ordering` / `check-finding-group-pr` / 既存 `docs:check` 拡張 / 既存 `projectizationPolicyGuard` PZ-13 + `projectCompletionConsistencyGuard` C1）
- §A2（project-scoped boundary protection）: **4 件のみ**
  - `app-untouched`（触ってはいけない: app/src/）
  - `docs-contracts-aag-untouched`（触ってはいけない: docs/contracts/aag/）
  - `no-new-references-doc`（触ってはいけない: references/ への新 .md 追加）
  - `hard-gate-count`（崩してはいけない: pre-push/CI advisory state）
- §A2 → §A1 promotion 経路: §A2 は boundary protection 限定のため通常は promote 候補にならない（universal rule にはなりにくい）

§A2 narrowing rationale（GUIDANCE-007）:

- **「やってはいけない」より重い「不可触・不可変・不可崩」に限定** — 単なる手続き上の禁止は §A1 へ promote
- **parse-free 限定** — `git diff --name-only` / `grep` だけで動く、reposteward Wave 1+ infrastructure 待ちなしで Phase 1 で landing 可能
- **phase 不変** — phase 別 transient rule（Reading Pass 中の zone 編集禁止 等）は §B に降格
- **AI tool として均質** — 4 checker すべて「path 集合の差分比較」と均質
- **archive 削除が文脈整合** — 本 program が完遂すれば boundary protection の約束も終わる

### §B: 仕組み化できないもの（AI/human review が判定 + 再チェック機会を構造提供）

plan.md「やってはいけないこと」§B で articulate 済。**guard 化を試みない** が、**AI / human review に放置せず、再チェック trigger + 文脈提供 surface を必須記述**（GUIDANCE-006）:

| 項目 | 再チェック trigger | 文脈提供 surface |
|---|---|---|
| 設計判断・表現品質・文脈解釈を機械検証 scope に含める | 新 checker 設計時 | `check-design-intent.yaml` |
| Instruction Pack を命令書扱いする | AI 初参照時 | Instruction Pack JSON `philosophy` block |
| Gate を AI 失敗装置として設計する | 新 checker 設計時 / severity 引き上げ時 | `check-design-intent.yaml` + ADR-SCP-014 back link |
| Reading Pass `rationaleSummary` の内容妥当性 | Phase 5 PR review 時 / stale 後の再 review | PR description template + `alternativesConsidered` field |
| ADR の `rationale` / `alternatives` 品質 | wrap-up commit / 振り返り判定 / archive 圧縮時 | ADR template `振り返り判定` + alternatives 最低 2 件 guideline |
| 文書間の責務境界 / kind 選択妥当性 | doc-registry kind 設定時 / disposition 確定時 | `doc-kind-registry.yaml` の `discriminationGuide` field + `alternativesConsidered` field |

soft mechanism としての運用（GUIDANCE-006）:

- soft = guard / CI で foul させない
- mechanism = 再チェック機会を構造的に提供する（template / philosophy block / discrimination guide / 振り返り判定 / AI 自己レビュー 5 軸）
- AI session が defensive に振る舞わず、自由判断と妥当性確認を両立

### Phase 0 完了条件（§A/§B split + §A1/§A2 boundary protection 細分整合）

- [ ] plan.md「やってはいけないこと」が §A1（AAG Core 永続、11 件）/ §A2（project-scoped boundary protection、**4 件のみ**）/ §B（仕組み化不可、6+ 件）に 3 分類されている
- [ ] §A1 各項目に **検出装置 path（`tools/governance/check-*.ts` または既存 mechanism、parse-heavy 含む）+ landing phase + 違反根拠** が articulate されている
- [ ] §A2 が **「触ってはいけない / 変更してはいけない / 崩してはいけない」boundary protection に限定** されている（GUIDANCE-007、4 件のみ: `app-untouched` / `docs-contracts-aag-untouched` / `no-new-references-doc` / `hard-gate-count`）
- [ ] §A2 各 checker が **parse-free**（`git diff --name-only` / `grep` のみ、TypeScript AST / Markdown 構造解析 / YAML schema 解析 不要）であることが articulate されている
- [ ] §A2 各項目が **phase 不変**（本 program 全期間 Phase 0〜10 を通じて一貫禁止）であることが articulate されている
- [ ] §B 各項目に **再チェック trigger + 文脈提供 surface** が articulate されている（GUIDANCE-006）
- [ ] §A2 checker は本 program archive 時に Archive v2 §6.4 で物理削除されることが articulate されている
- [ ] aag/scp-checkers/README.md が landing し、4 checker の boundary protection image / 検出ロジック / 設計原則が articulate されている
- [ ] §B の文脈提供 surface（`check-design-intent.yaml` / Instruction Pack `philosophy` block / `discriminationGuide` field 等）の landing phase が articulate されている
- [ ] checker の landing phase が Phase 0〜10 に分散され、Wave 1 milestone（reposteward Task Capsule v1）到達前は advisory のみ（不可侵原則 8 整合）
- [ ] §A2 metaphor（AI が安心してアクセルを踏むための事前ガードレール）が ADR-SCP-014 GUIDANCE-007 / AI_CONTEXT.md / scp-checkers/README.md に articulate されている

## 11. 整合性確認項目（Phase 0 完了 = 本 inquiry の最終 acceptance）

- [ ] 高 #1〜#5 が ADR / schema draft / inquiry に articulate されている
- [ ] 次点 #6〜#10 が ADR 補強 / inquiry / plan.md section に articulate されている
- [ ] inquiry/01〜06 の各 file が §1 の 7 項目（対象 / 正本 / 位置付け / 移行方針 / 未解決 / 入力 / acceptance）を articulate している
- [ ] 本 inquiry が `decision-audit.md` の ADR-SCP-010〜014 へ back link している
- [ ] checklist.md に本 inquiry + ADR-SCP-010〜014 の checkbox が追加されている
- [ ] §0 思想層別（Plan → Context → Contract → Guidance → Gate）が articulate されている
- [ ] §0 定量・定性分離 table が articulate されている（10 acceptance criteria はすべて左側 = 構造ルールに属する）
