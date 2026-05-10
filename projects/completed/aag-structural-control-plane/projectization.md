# projectization — aag-structural-control-plane

> 役割: AAG-COA 判定結果。作業文脈に応じて、必要な project 化の重さと
> 不要な手続きを明示する。
>
> 規約: `references/05-aag-interface/operations/projectization-policy.md`

## 1. 判定結果

| 項目 | 値 |
|---|---|
| `projectizationLevel` | Level 3 |
| `changeType` | governance-hardening |
| `implementationScope` | `["docs/contracts", "tools/governance", "references", "projects"]` |
| `breakingChange` | false |
| `requiresLegacyRetirement` | false |
| `requiresGuard` | true |
| `requiresHumanApproval` | true |

## 2. 判定理由

### Level 3 の根拠（Architecture Project）

projectization-policy.md §3「Level 3 Architecture Project」の **複数条件を満たす**:

- **層境界を変えない** が、**新しい構造統制レイヤー**（Tree Contract / Document Contract / Temporal Scope）を AAG framework の Layer 2 / 3 / 4A に additive 追加する → Architecture Project の典型
- **guard / invariant 新設あり** — Tree contract checker / Document contract checker / Temporal scope checker / Artifact coverage checker / Runner parity checker
- **複数 feature に影響する** — references/ 全体 + docs/contracts/ 全体 + tools/ 全体 + projects/ 全体 + 既存 obligation-collector.ts
- **不可侵原則を独自に持つ**（plan.md §不可侵原則）
- **Phase 0〜10 の長期戦**（Schema-first → Inventory → Reading Pass → Shadow → Triage → Declaration → Ratchet → Gate）

`new-feature` ではなく `governance-hardening` を採用する根拠:

- 新 feature の追加（業務機能 / chart / page / read model）ではなく、**既存 repo に対する governance ルールの追加と機械検証**が中心
- projectization-policy.md §2 Change Type table の `governance-hardening` 定義（「ルール / guard / allowlist の強化」）に直接合致
- Tree Contract / Document Contract / Temporal Scope はすべて「**新規 governance ルール + 機械検証 guard 新設**」の形を取る

### breakingChange = false の根拠

- 既存 `doc-registry.json` を **拡張**（kind / temporalScope / requiredSections を additive 追加）。既存 entry の必須 field は不変
- 既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` を **3 段階 shadow migration**（Phase 8a/8b/8c）で慎重に YAML 化。TS 定数は phase 8c まで残す
- 既存 `docs/contracts/aag/*.schema.json` を **触らない**（新 schema は同階層に additive 追加、再配置しない = ADR-SCP-002）
- 全 Phase で **既存 substrate の正本性は不変**（aag/_internal/source-of-truth.md 整合）
- pre-push / CI への新 check は **advisory** で開始、Hard Gate 化は別 program 候補

### requiresLegacyRetirement = false の根拠

- 旧 API / module の物理削除は本 program では行わない
- Phase 8c で `OBLIGATION_MAP` TS 定数を **deprecated shim → 削除** する step は含むが、これは「本 program 内で新設した generated JSON への切替の最終 step」であり、**先行する legacy retirement** ではない
- それ以外の既存 doc / schema / guard はすべて維持

### requiresGuard = true の根拠

本 program の核心が **構造統制 guard の新設**:

- Tree contract guard（未宣言 top-level directory / 未宣言 child の検出）
- Document contract guard（未登録 Markdown / docId 欠落 / kind mismatch / requiredSections 欠落 / forbiddenContent 混入の検出）
- Temporal scope guard（製本に History / Roadmap / TODO / Phase / Migration Log 検出、本文展開禁止 + Document ID リンク許可）
- Artifact coverage guard（未管理 artifact / generated producer 不明 / declared path missing の検出）
- Runner parity guard（pre-push / CI / npm scripts の必須 step drift 検出）

### requiresHumanApproval = true の根拠

projectization-policy.md §3「Level 3」の必須条件:

- ADR-SCP-001（YAML authoring / JSON machine truth）は既存 `JSON-first / YAML 採用禁止` 原則（reposteward plan.md 不可侵原則 1）と scope 境界の整合が必要 → user 判断
- ADR-SCP-002〜009 すべて design contract の確定 → user 判断
- Phase 2.5 Reading Pass で各 Markdown の disposition（keep / split / move / archive）を確定する作業 → user 判断（AI 単独では不可逆な repo 構造変更を伴う）
- Phase 5 Finding group PR は references/ / projects/ の **物理移動**を伴う → user 判断
- Phase 6 Hard Gate 昇格判定 → user 判断
- 最終レビュー（archive 承認）→ user 判断

## 3. 必要な文書

| 文書 | 必要性 | 理由 |
|---|---:|---|
| `AI_CONTEXT.md` | required | L3 必須 |
| `HANDOFF.md` | required | L3 必須 |
| `plan.md` | required | L3 必須、Phase 0〜10 の長期戦 |
| `checklist.md` | required | L3 必須 |
| `inquiry/` | required | Phase 0 で既存資産マッピング 6 項目（doc-registry / aag schema / 既存 YAML / self-check substrate / OBLIGATION_MAP / temporal scope policy）を事実棚卸 |
| `decision-audit.md` | required | L3 + 9 ADR を articulate |
| `discovery-log.md` | required | Level 2+ project は必須（PZ-14） |
| `breaking-changes.md` | forbidden | breakingChange=false |
| `legacy-retirement.md` | forbidden | requiresLegacyRetirement=false（Phase 8c の TS 定数削除は本 program 内 step、別 doc 不要） |
| `sub-project-map.md` | forbidden | umbrella ではない（1 一貫した task scope） |
| guard 設計（plan.md 内） | required | requiresGuard=true、Phase 1 / 3 / 4 / 9 / 10 で guard 新設 |
| 最終レビュー（user 承認）checkbox | required | requiresHumanApproval=true |

## 4. やらないこと (nonGoals)

この project の scope に含めない作業を明示する。
scope 逸脱の抑止と escalation 判定の基準として機能する。

- **app/src/ 配下の touch** — 本 program は app に触れない。references/ + docs/contracts/ + tools/governance/ + projects/ のみ
- **業務 logic / domain calculations / readModels の変更** — 既存正本性は不変（aag/_internal/source-of-truth.md 整合）
- **既存 `doc-registry.json` の置換** — 拡張のみ。base registry として正本性を維持
- **既存 `OBLIGATION_MAP` / `PATH_TO_REQUIRED_READS` の即時切替** — Phase 8a/8b/8c の 3 段階 shadow migration で慎重に
- **既存 `docs/contracts/aag/*.schema.json` の再配置** — `docs/contracts/schema/` への集約はしない。新 schema は同階層に additive 追加（ADR-SCP-002）
- **既存 `references/99-archive/` への大量 docs 移動** — Phase 5 Finding group PR で個別実施。本 project 自体が大量移動 PR を出す scope ではない
- **AI 執筆の pre-write 強制** — ADR-SCP-006: post-write validation のみ。AI session を硬く縛らない
- **Wave 1 milestone（reposteward Task Capsule v1）到達前の Hard Gate 追加** — 全 Phase で advisory 開始、Hard Gate 化は別 program 候補（reposteward の `aag-engine-hard-gate-promotion` 候補等と並走しない）
- **新規 YAML を AAG machine truth として採用** — ADR-SCP-001: YAML は authoring source、generated JSON が machine truth。reposteward 不可侵原則 1（JSON-first）は narrow scope（AAG Parameters / Capsule / DetectorResult）として再定義し、本 program の YAML 用法（人間/AI 向け宣言層）は同 scope 外
- **Reading Pass の自動化** — AAG-SCP-MIGRATION-001: 既存ドキュメントは自動分類だけで contract 化しない。proposedKind / temporalScope / disposition は人間/AI が読んで確定
- **Phase 2.5 Reading Pass を AI 単独で完結させる** — 各 disposition（keep / split / move / archive）は user 承認を経て初めて Phase 5 PR に進む
- **新 namespace の Document ID（DOC-DEF-*）と既存 doc-registry を並立させる** — ADR-SCP-002: Document Contract は doc-registry.json の拡張層であり、並立 namespace は作らない
- **Tree Contract で repo 全ディレクトリを宣言する** — Phase 1 MVP は top-level + 主要 layer + references zone のみ。それ以外は `unmanaged-but-tolerated` 状態で許容
- **Reading Pass 中に対象 doc を編集する** — AAG-SCP-MIGRATION-006: Reading Pass 期間中、対象 zone 内の文書本体は編集しない。編集は Phase 5 Finding group PR でのみ。frontmatter（docId 付与）は reading entry 作成時に同時付与可

## 5. Escalation / De-escalation 条件

以下が発生した場合、`projectizationLevel` を再評価する。

- 破壊的変更が発覚した（例: 既存 doc-registry.json の必須 field 変更が必要と判明） → Level 3 維持 + breakingChange=true へ escalate + `breaking-changes.md` を新設
- legacy 撤退が新たに必要になった（例: 既存 schema 全廃が必要） → requiresLegacyRetirement=true へ escalate + `legacy-retirement.md` を新設
- Phase 1〜10 の途中で「これは別 project に分離すべき」と判明した（例: AI Instruction Pack の post-write validation が独立した複雑性を持つ） → 該当 phase を別 project に切り出し、本 program の checklist から削除
- 当初 nonGoals に含めた作業が必要になった（例: app/ 配下の guard も Tree Contract 対象に含める必要） → user 判断で escalate
- 想定より影響範囲が小さく、Phase 6 以降が不要と判明した → de-escalate せず scope を削る形で対応（Level は 3 維持、Phase 7〜10 を削除）

## 6. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-05-07 | 初期判定 (Level 3, governance-hardening) | reposteward-ai-ops-platform substrate を入力消費する後段 program として独立。Tree / Document / Temporal の構造統制 guard 新設 + 9 ADR + Reading Pass + 3 段階 shadow migration を含むため Level 3 |
