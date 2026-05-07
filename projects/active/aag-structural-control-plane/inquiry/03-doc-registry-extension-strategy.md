# inquiry/03 — doc-registry.json Extension Strategy

> **役割**: Phase 0 で既存 `docs/contracts/doc-registry.json`（138KB）の構造を確認し、Phase 5 で実施する additive 拡張ポイントを articulate する。
>
> **scope**: doc-registry.json の現在 schema、entry 構造、reader（generator pipeline）の後方互換性を確認する。
>
> **規約**: ADR-SCP-002（Document Contract は doc-registry.json の拡張層）に従う。並立 namespace を作らない。

## 1. 既存 doc-registry.json の現在構造（Phase 0 で確認）

### 1.1. 確認すべき項目

- [ ] doc-registry.json の top-level schema（version / categories / entries 等の構造）
- [ ] 各 entry の必須 field（path / label / 等）
- [ ] 各 entry の optional field（既存）
- [ ] entry 数（references/ 配下の Markdown 全件カバーしているか）
- [ ] grouping / category の articulate（references/01-foundation / 03-implementation / 等の zone 分類が entry に articulate されているか）

### 1.2. 既存 reader / consumer

- [ ] `tools/architecture-health/src/collectors/` 配下で doc-registry.json を読む collector の listing
- [ ] `references/04-tracking/recent-changes.generated.md` 系 generator の入力依存
- [ ] `app/src/test/guards/docRegistryGuard.test.ts` の検証範囲（CLAUDE.md Test Contract で `reference-link-existence` 契約 = references 配下 .md および docs/contracts 配下 .json パスが全て実在ファイルを指すこと）
- [ ] `references/README.md` index との同期（atomic dependent update commit pattern §13.2）

## 2. Phase 5 で additive 拡張する field（候補）

既存 entry に **optional field** として additive 拡張する候補:

| 新 field | 型 | 必要性 | 理由 |
|---|---|---|---|
| `kind` | enum string | optional → 段階的に required | Document Kind Registry（Phase 4）で定義した kind を articulate（例: `canonical-doc` / `domain-definition` / `implementation-guide` / `operation-protocol` / `project-plan` / `project-checklist` / `generated-report` / `archive-doc` / `index` / `ai-entrypoint` / `inventory-doc`） |
| `temporalScope` | enum string | optional | `present` / `past` / `future` / `computed-present` のいずれか |
| `requiredSections` | string[] | optional | doc kind の requiredSections list（Phase 4 doc-kind-registry.yaml で kind ごとに定義済の subset） |
| `forbiddenContent` | string[] | optional | 禁止 content kind list（Phase 4 doc-kind-registry.yaml で kind ごとに定義済の subset） |
| `owner` | string | optional | role / agent ID（例: `documentation-steward` / `architecture` / `duckdb-specialist`） |
| `audience` | string[] | optional | reader 種別（例: `主アプリ改修 user` / `AAG framework 改修者` / `初見 AI` / `作業 AI`） |
| `lifecycle` | enum string | optional | `active` / `deprecated` / `retired` |
| `granularity` | string | optional | doc の粒度 articulate（1 文 / 段落 / 概念 / フレームワーク全体 等） |
| `updateTriggers` | string[] | optional | この doc を update すべき trigger（例: `architecture-rule 追加時` / `feature-slice 追加時`） |

### 2.1. additive 拡張の原則

- **既存 entry の必須 field を変更しない**（path / label 等は不変）
- **新 field はすべて optional で追加**
- **既存 reader が未知 field を無視する**ことを Phase 0 で確認
- **段階的に required 化**: 最初は optional、Phase 5 で kind / temporalScope を required へ昇格（Phase 5 後半の Reading Pass 完了後）

## 3. 後方互換性の確認項目（Phase 0 で完了）

- [ ] `docs/contracts/doc-registry.json` を読む全 reader の listing（grep で確認）
- [ ] 各 reader が未知 field を無視するかコード確認（JSON.parse 後に必須 field のみ参照しているか）
- [ ] `references/04-tracking/recent-changes.generated.md` 系 generator が新 field 追加で影響を受けないことを確認
- [ ] `app/src/test/guards/docRegistryGuard.test.ts` が新 field 追加で fail しないことを確認
- [ ] 拡張 field の検証は **新 guard**（`tools/governance/check-doc-contracts.ts`、Phase 5 で landing）で実施し、既存 docRegistryGuard は責務分離（既存検証は `reference-link-existence` のまま）

## 4. Phase 5 拡張作業の段階的 PR plan

### Phase 5.1: optional field 追加（1 PR）

- doc-registry.json の schema 定義（既存）に optional field 追加（schema 自体が JSON Schema として articulate されているか確認、なければ inquiry/01 で扱う `docs/contracts/schema/document-contracts.schema.json` でカバー）
- 既存 entry には field を追加しない（schema 拡張のみ）
- 後方互換性確認: 全テスト + docs:check PASS

### Phase 5.2: Reading Pass 結果 join（複数 PR）

- Phase 2.5 Reading Pass で確定した `proposedKind` / `temporalScope` / `disposition` を doc-registry entry に join
- `disposition = keep-and-contract` の docs から順次 entry update
- 1 Finding group = 1 PR（AAG-SCP-MIGRATION-005）

### Phase 5.3: split / move / archive 実行（複数 PR）

- `disposition = split` の docs について、本文を split し、製本 / archive / project に分配
- `disposition = move` の docs を物理移動
- `disposition = archive` の docs を `references/99-archive/` または `projects/completed/` に移動
- 各 PR で doc-registry entry を update（path 変更 / archive flag 等）

### Phase 5.4: required 昇格（1 PR、全 docs reading pass 完了後）

- kind / temporalScope を optional → required へ昇格
- 未設定 entry は事前に Phase 5.2 で全件 update 済の前提

## 5. 整合性確認項目（Phase 0 で完了）

- [ ] doc-registry.json の現在 schema が確認され、additive 拡張で破壊しない設計が articulate
- [ ] 既存 reader の listing 完了
- [ ] 既存 reader の未知 field 無視性が確認
- [ ] Phase 5 段階的 PR plan が articulate
- [ ] 新 guard `tools/governance/check-doc-contracts.ts` の責務範囲が articulate（既存 docRegistryGuard と責務分離）

## 6. open questions

- Q1: doc-registry.json の schema 定義 file（JSON Schema）は現在存在するか? → Phase 0 で確認、なければ Phase 5.1 で `docs/contracts/schema/document-contracts.schema.json` の一部として articulate
- Q2: optional field を追加する場合、`$comment` field で意図を articulate すべきか? → 暫定: yes、各 entry が AI session に readable な形で意図を articulate（既存 `docs/contracts/aag/aag-metadata.json` 等の慣例に従う）
- Q3: `audience` field は array で articulate するが、reader 種別が増減した場合に enum で限定すべきか? → 暫定: enum 化する（doc-kind-registry.yaml で `knownAudiences` を articulate、未知値は finding 化）
- Q4: 既存 `references/README.md` の index 構造と新 `kind` field を join する必要があるか? → 暫定: yes、Phase 5.2 で README index に kind 別 grouping を追加（atomic dependent update commit pattern §13.2 に従う）
