# breaking-changes — aag-self-hosting-completion

> 役割: breakingChange=true (= AAG-COA Level 3 + architecture-refactor) における破壊対象 + 移行方針を articulate。
> 規約: `references/03-guides/projectization-policy.md` §5 + §3 Level 3。
> **本 project は内容 100% 維持 (= 不可侵原則 4)**、breaking は **path のみ**。

## 1. 破壊対象 (= path 変更で影響する範囲)

### 1.1 doc path (= 1,000+ 件 inbound 影響)

| Phase | 旧 path | 新 path | 影響範囲 |
|---|---|---|---|
| R1 | `aag/_internal/<doc>.md` (9 doc) | `aag/_internal/<doc>.md` | 101 inbound link (= 全 file 内 reference) |
| R2 | `references/03-guides/decision-articulation-patterns.md` | **`references/05-aag-interface/drawer/decision-articulation-patterns.md`** | 該当 inbound 全 update |
| R2 | `references/03-guides/{projectization-policy,project-checklist-governance,new-project-bootstrap-guide,deferred-decision-pattern}.md` (4 doc) | **`references/05-aag-interface/operations/<doc>.md`** | 該当 inbound 全 update |
| R3 | `references/01-principles/<doc>.md` | `references/01-foundation/<doc>.md` | 多数 (= 主アプリ業務 doc 全 reference) |
| R3 | `references/02-status/<doc>.md` | `references/04-tracking/<doc>.md` | 多数 |
| R3 | `references/04-design-system/<doc>.md` | `references/02-design-system/<doc>.md` | 22 inbound |
| R3 | `references/03-guides/<doc>.md` (= AAG-related は R2 で migrate 済) | `references/03-implementation/<doc>.md` | 多数 |
| R3 | `references/05-contents/<category>/<id>.md` | `references/04-tracking/elements/<category>/<id>.md` (= R4 で directory 化) | 46 inbound |
| R3 | `references/02-status/recent-changes.md` | `references/04-tracking/recent-changes.generated.md` (= 機械生成化、suffix 付与) | 多数 |
| R3 | `references/02-status/generated/*.md` (19 file) | `references/04-tracking/generated/*.generated.md` (= directory 移動 + suffix 付与) | 多数 |
| R6 | ``projects` 配下 active project directory` (各 active project 6 件) | `projects` 配下 `active/<active-id>` directory | inbound update |

### 1.2 guard / collector path constants (= 138 file 影響)

| 種別 | 影響対象 | 移行方針 |
|---|---|---|
| `app/src/test/guards/*.ts` (= TARGET_PATHS / allowlist / regex) | aag-related guard 群 + structural guard 群 | 各 R-phase で path constants update + test 該当 PASS まで verify |
| `tools/architecture-health/src/collectors/*.ts` | obligation-collector / project-checklist-collector / etc. | path-based mapping を新 path に update |
| `app/src/test/architectureRules/*.ts` | rule definition 内 path reference | 該当箇所 update |

### 1.3 doc-registry / manifest

| 種別 | 影響 | 移行方針 |
|---|---|---|
| `docs/contracts/doc-registry.json` | 全 doc entry の `path` field | 各 R-phase で reorganize + entry path update |
| `.claude/manifest.json` | `discovery.byTopic` / `byExpertise` 内 path | 各 R-phase で update |

### 1.4 generated artifacts

| 種別 | 影響 | 移行方針 |
|---|---|---|
| `references/02-status/generated/*.{json,md}` | 旧 path → R3 で → `references/04-tracking/generated/` | R3 で物理 location 変更 + collector 設定 update |
| `docs/generated/aag/*.json` | 内容 (= AAG rule 関連) は不変、ただし内部の path reference (= canonicalSource 等) は R1 で update | R1 完了後再生成で整合 |

## 2. 公開契約 / 型 / API への影響

### 2.1 影響なし (= 不可侵原則 4 articulate)

- 主アプリ code (`app/src/`, `app-domain/`, `wasm/`) の API / 型 → **影響なし** (= 不可侵原則 1、touch しない)
- AAG framework articulate **内容** → **影響なし** (= 不可侵原則 2、物理 location のみ移動、R6 例外を除く)
- 主アプリ business logic → **影響なし** (= 不可侵原則 4、機能 loss 0)
- 既存 functionality → **100% 維持** (= 不可侵原則 4、phase 別 verify)

### 2.2 影響あり (= path のみ)

- doc 内 inbound link string → **全 update** (= 1,000+ 件)
- guard / collector path constants → **update + test PASS** (= 138 file)
- doc-registry / manifest entry path → **update**
- 外部 reference (= 例: 主アプリ AI が context として読む path) → **migration 期間中の transient broken risk** (= phase 別 verify で mitigation)

## 3. 移行方針 (= R-phase 別)

### R0 移行方針 (= 境界定義先行、構造変更前)

1. `references/README.md` + `aag/README.md` (新設) + projects/ root の README.md + `CURRENT_PROJECT.md` + `CLAUDE.md` を articulate update (= 物理移動なし、articulate のみ)
2. 3 tree (references / aag / projects) の境界 articulate (= reader-別 routing)
3. `*.generated.md` 命名規約予告 articulate (= R3 以降適用)
4. test:guards で 944 維持 verify (= 構造未変更、breaking なし)

### R1 移行方針

1. `aag/_internal/` 新設 + `aag/_internal/` 9 doc を `git mv` で物理移動 (= git history 保持)
2. 移動直後に grep で 101 inbound link 抽出
3. inbound link を新 path (= aag/_internal/) に sed で全 update (= bulk rewrite)
4. guard / collector の path constants 該当箇所を grep + update
5. doc-registry.json + manifest.json reorganize entry
6. test:guards + docs:check で全 PASS verify
7. broken link 0 件 verify (= synthetic test or grep)

### R2 移行方針

R1 と同 pattern (5 doc 移動 + inbound update + guard/collector update + verify)。

### R3 移行方針

- 5 directory rename (= `git mv` で履歴保持)
- 1,000+ inbound update を **phase 別 sub-batch** で実施 (= 1,000+ 一括 update は merge conflict risk、sub-batch 毎に commit + verify)
- 138 guard / collector path constants update を**全件 1 commit** で実施 (= 部分 update は test 落ち continuation risk)
- doc-registry / manifest update

### R4 移行方針

- `04-tracking/elements/` 新設 + `references/05-contents/*` を merge (= R3 で先行 rename 済の場合は内部 rearrange)
- per-element directory 化は **pilot subset (= charts/ 5 element) で start**、value verify 後段階適用
- dashboard layer 4 件は機械生成 mechanism 実装後に landing
- 既存 single-file spec を per-element README.md に migrate

### R5 移行方針

- operational-protocol-system project resume (= HANDOFF.md §3.6 pause articulation 解除)
- M1-M5 deliverable を `aag/interface/protocols/` (= R2 で skeleton 済) に landing

### R6 移行方針

- `aag/_internal/meta.md` §2.1 articulate update (= 内容変更、不可侵原則 2 の R6 例外)
- selfHostingGuard.test.ts に entry navigation rigor 検証項目追加

### R7 移行方針

- 全 verify command PASS まで反復
- broken link 0 件 maximum verify
- 機能 loss 0 件 verify (= E2E + storybook build)
- recent-changes.md にサマリ landing
- archive 移行 (= user 承認後)

## 4. consumer / 外部依存への通知

| consumer | 通知方針 |
|---|---|
| 主アプリ改修 AI / 人間 | references/README.md (R1 で明示) で新 path articulate、context 構築時に新 path から reach |
| AAG 改修者 | aag/README.md (R1 で新設) で新 internal/interface 構造 articulate |
| guard / test infrastructure | path constants update で対応、外部通知不要 |
| CI / pre-commit hook | 既存 hook が新 path で動作することを R-phase 完了時に verify |

## 5. 旧 path 残置禁止 + transitional period

### 5.1 旧 path 残置禁止 (= 物理 verify)

- 物理 location 移動完了後、**旧 path に file 残置禁止** (= git mv で完全移動、stub も .gitkeep も置かない)
- 旧 path への inbound reference 0 件まで update 完了が R-phase landing 条件
- 例外: `references/99-archive/` 配下 + `projects/completed/` 配下に意図的に残置 (= immutable archive policy 整合、archive-to-archive 旧 path mention は `oldPathReferenceGuard` で許容)

### 5.2 transitional period (= 1 commit に閉じる)

| 状態 | 旧 path | 新 path |
|---|---|---|
| R-phase 着手前 | active (= 全 reference 旧 path) | 未存在 |
| R-phase 進行中 (= 同一 commit 内) | **共存禁止** (= 1 commit で完全 swap、partial migration は禁止) | 全 reference 新 path に update |
| R-phase 完了後 | **0 件** (= guard で hard fail、= retired) | active |

partial migration を複数 commit に跨いで実施する case は **禁止** (= drawer Pattern 1 不可侵原則 5 と同 lens、rollback 境界 articulate 不能化を防ぐ)。

### 5.3 撤退 verify 3 軸

各 R-phase 完了時:

1. **物理 verify**: 旧 path に file 0 件 (= `find` で 0 件)
2. **string verify**: 旧 path 文字列 reference 0 件 (= `grep -r` で 0 件、archive-to-archive 例外除く)
3. **functional verify**: 旧 path 経路で reach 試行 → fail

3 軸全 PASS で撤退完了。

### 5.4 旧 convention / 旧制度の撤退

物理 path だけでなく、旧 convention / 旧制度 も R-phase で完全撤退:

| 旧 convention / 旧制度 | 撤退 phase | 新 articulation |
|---|---|---|
| `recent-changes.md` (suffix なし、手書き) | R3 | `recent-changes.generated.md` (機械生成) |
| `02-status/generated/*.md` (suffix なし、directory のみで articulate) | R3 | `04-tracking/generated/*.generated.md` (= file 名 + directory で 2 重 articulate) |
| projects/ root に flat active project 配置 | R6 | `projects` 配下 `active/` directory に articulate |
| `CURRENT_PROJECT.md` inline state articulate | R6 | pointer-only に固定、`projectsStructureGuard` で機械検証 |
| AAG-related guide が主アプリ実装ガイドと同 directory (= `03-guides/` 内混在) | R2 | `references/05-aag-interface/` 純化 (= reader-別 separation) |
| aag/ vs references/ boundary 不在 | R0 articulate + R1-R2 物理移動 | structural separation |
| section-level GENERATED marker のみ (= file 名 hint なし) | R3 (file-level優先 articulate)、R7 (機械検証) | file-level `*.generated.md` で第一優先、section marker は補助 |

### 5.5 旧 mention (= meta-documentation) の撤退

PR template / CLAUDE.md / doc-registry / manifest 内の旧 path mention:

| 対象 | 撤退 phase |
|---|---|
| `.github/PULL_REQUEST_TEMPLATE.md` 内 旧 path 参照 (= 約 9 箇所) | R3 (= directory rename と同時) |
| `CLAUDE.md` 内 旧 section path | R3 |
| `docs/contracts/doc-registry.json` 内 全 doc entry path | R1 / R2 / R3 (= 移動 phase 毎に update) |
| `.claude/manifest.json` discovery hint 内 path | R1 / R2 / R3 (= 同上) |
| guard / collector path constants (138 file) | R1 / R2 / R3 (= 同上) |
| generator (`tools/architecture-health/src/renderers/`) 出力先 path | R3 |
| 既存 doc 内 inbound link (1,000+ 件) | R1 / R2 / R3 (= 同上) |

### 5.6 archive 例外 articulate

以下は **撤退対象外** (= 旧 path mention 残置許容):

- `references/99-archive/` 配下の immutable archive doc (= 内容 touch しない、archive-to-archive 旧 path mention は archive 整合のため許容)
- `projects/completed/` 配下の archived project doc (= immutable archive policy)

これら例外は `oldPathReferenceGuard` で **archive-to-archive whitelist** に登録、検出対象外。

## 6. rollback 方針

各 R-phase は **judgement commit + rollback tag** で完結 (= drawer Pattern 1)。R-phase landing 後に問題発覚した場合:

```bash
git checkout aag-self-hosting-completion/DA-α-NNN-rollback-target
```

で物理的に判断前に戻れる。ただし inbound update が大規模なため、**部分 rollback** は manual recovery が複雑、**全 rollback or 全 forward-fix** で対応する。
