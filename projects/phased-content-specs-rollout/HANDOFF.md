# HANDOFF — phased-content-specs-rollout

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase A〜K 全 landed (2026-04-29)。** 残作業は **人間 review + archive 承認のみ**。
status: `active` / parent: なし。Phase K Option 1+2 の landing で source ↔ spec 同期は
date-based cadence 儀式から **commit-pin (full SHA) の構造的 mechanism** に置換済。
**本 project は archive 候補状態**。

> **2026-04-29 末セッションの判断**: 旧版 HANDOFF が Tier 1 残として記載していた
> #9 (CHART visual evidence selection) / #10 (pipeline / queryHandler / projection) は、
> dialog で **両者とも performative documentation** と判定され撤回:
> - **#9 撤回**: visual evidence selection rule の指標群 (consumer 数 / 365d commits /
>   severity color / optionBuilder) は proxy metric / 適用 0 件 / governance theater。
>   `contentSpecVisualEvidenceGuard` の baseline=6 + `REQUIRED_COVERED_IDS` hard-pin が
>   そのまま structurally accepted state を固定（新規後退禁止は維持）
> - **#10 保留**: parent HANDOFF が「Phase L として独立 project 化を推奨」していたが、
>   PIPE / QH / PROJ に **spec 化されるべき実 drift / risk が validated されていない**
>   ため、Phase L 立ち上げ自体が performative の risk 高。validation 後に再判断
> - **色整合性 direction (CHART-004 semantic.customers 不使用 / CHART-005 semantic.grossProfit
>   不使用)** は実 drift を観測したが、ちゃんと考えてから着手判断のため pause
>
> checklist.md には対応する 8 項目を理由付き strikethrough で記録 (commit 99c4504)。
>
> **2026-04-29 末セッションの追加発見 (AAG 構造的弱点)**: 上記 2 件の撤回経験を統合的に
> 振り返ると、AAG (Adaptive Architecture Governance) 自体に **製本 ↔ AAG の双方向
> integrity** が確立されておらず、製本されていない proxy metric が guard 化される構造的余地が
> 存在する。本 project の scope では収まらない AAG core 進化テーマであるため、
> 独立 active project **`aag-bidirectional-integrity`** を spawn (commit pending)。
> 同 project が AAG core への双方向 integrity meta-rule 追加 + 既存 100+ AR rule の audit
> + display rule registry (DFR-NNN) bootstrap + meta-guard 2 件 + DFR guards 実装 を
> 段階展開する。本 project の archive 進行とは独立して進む（parent / child 関係なし）。

### Phase A〜K 完遂サマリ (2026-04-29)

| 軸 | 達成値 |
|---|---:|
| 全 spec 数 | 89（widget 45 / RM 10 / CALC 24 / chart 5 / UIC 5）|
| Behavior Claims | **310** (各 spec 平均 3.5)|
| reviewed claim verificationNote | **110+ 件全件記入済** (Phase K Option 2、#8 完遂) |
| guard 数 | **11 active** (`contentSpec*Guard.test.ts`、Phase K で `FRESHNESS` 撤退 → `LAST-VERIFIED-COMMIT` 置換) |
| coverage baseline | **全 0** (J6 / canonical-registration-sync 等) |
| Evidence Level enforcement | J1〜J6 + K1 全 active で違反 0 |
| Visual Evidence baseline | **6** (UIC-002/003/004/005 の 4 件 cover、`REQUIRED_COVERED_IDS` で hard-pin) |
| Promote Ceremony | candidate slot 二状態モデル institutionalize 済 |
| 統合 KPI | 60 KPI all OK / Hard Gate PASS |
| test 結果 | **130 file / 893 test PASS** |
| 本セッションで成立した再発防止 mechanism | E (`AR-CI-FETCH-DEPTH`) / B (`AR-COVERAGE-MAP-DISPLAY-NAME-COUNT`) / C (active project hint) / D (`tools/scaffold-guard.mjs`) / F (`tools/check-substantive-change.mjs`) |

### canonicalization-domain-consolidation との handoff

本 project の 11 guard / `contentSpecHelpers.ts` は canonicalization plan §1.2
**#12 ペア** そのもの。canonicalization Phase B の domain primitive
(`parsing/yamlFrontmatter` / `detection/existence` / `detection/ratchet` /
`detection/temporal` / `reporting/formatViolation`) は本 project が完成させた
helper にすでに実体化済み。canonicalization Phase B は「ゼロから設計」ではなく
「Phase J 既実装の crystallize」として進む（詳細: phased plan §4 末尾 +
canonicalization plan §3.2 対応表）。

### spawn → ACTIVE への経緯

| 日付 | 事象 |
|---|---|
| 2026-04-26 | 本 project を独立 sub-project (Level 2 / docs-only) として spawn（旧版 `inquiry/22` で SP-B Anchor Slice + SP-B/D absorption 戦略） |
| 2026-04-26 | umbrella `architecture-debt-recovery` の不可侵原則 #16 + 軽量起動の原則に従い、canonical 計画 doc を `inquiry/22` に移管 + 本 project を **SHELL モード**降格 |
| 2026-04-26 | Operational Control System §1〜§11 を inquiry/22 に追加 |
| **2026-04-26** | umbrella + 4 sub-project (SP-A/B/C/D) **全 archive 完遂**（main merge）。45 WID spec 本文 landed。archived umbrella 配下の inquiry が無効化されたため、**本 project を ACTIVE 昇格 + plan.md を canonical 化**（旧 inquiry/22 を `plan.md` に移管・post-archive 文脈に適合） |

### 現状の役割

- **canonical 計画 doc**: 本 project の `plan.md`（Phase A〜J + Operational Control System §1〜§11）
- **状態**: `status: active` / parent なし / Level 3 / governance-hardening
- **次の作業**: Phase A の Anchor Slice 5 件に対する **source ↔ spec 機械接続**

### 主な前提（2026-04-26 時点、main merge 後）

- archived: SP-A widget-context-boundary / SP-B widget-registry-simplification / SP-C duplicate-orphan-retirement / SP-D aag-temporal-governance-hardening / umbrella architecture-debt-recovery
- landed: 全 45 WID-NNN.md spec 本文（`references/05-contents/widgets/`）
- WSS bootstrap: D1〜D8 確定済み（archived umbrella `inquiry/01a`）
- 未着手: source `@widget-id` JSDoc / frontmatter generator / `AR-CONTENT-SPEC-*` rule active 化 / co-change guard / OBLIGATION_MAP 拡張

## 2. 次にやること

> **状態 (2026-04-29 末時点)**: Phase A〜K 全 mechanism 完遂、本セッションで再発防止 5 件 (E/B/C/D/F) も追加 landed。
> 末セッションで checklist 同期 + #9/#10 撤回判定 (commit 99c4504)。
> 残作業は **人間 review + archive 承認** (gate) のみ。

### Tier 0: 完了 (本 session、2026-04-29 全 landed)

| # | 内容 | merge commit / PR |
|---|---|---|
| 1 | J7 path 実在 guard (contentSpecPathExistenceGuard) | (5564b60 系) |
| 2 | content graph 初版 collector | (5564b60 系) |
| 3 | CI artifact 保存 (Phase I) | commit ceaac3f |
| 4 | UIC-003 visual evidence cover (baseline 9 → 8) | commit ceaac3f |
| 5 | Phase K Freshness Mechanism Redesign 提案 | commit b872f5f |
| 6 | **#7** UIC-004/005 ChartCard story (baseline 8 → 6、`REQUIRED_COVERED_IDS` hard-pin 追加) | PR **#1204** (71c1270) |
| 7 | **#6** Phase K Option 1 + 2 実装 (lastVerifiedCommit guard / verificationNote 必須化) | PR **#1206** |
| 8 | **#8** reviewed claim 全 110+ 件 verificationNote rationale 記入 | PR **#1206** (#7 と同梱) |
| 9 | **shallow clone CI 修正** (workflow に `fetch-depth: 0` + guard defensive 検出 + 比較を full SHA 化) | PR #1205 / PR **#1206** |
| 10 | **E** `AR-CI-FETCH-DEPTH` meta-guard 新設 (workflow に fetch-depth: 0 強制) | PR **#1207** |
| 11 | **#11** AR-CONTENT-SPEC-FRESHNESS / cadence field 物理削除 (Phase K Option 1 後続) | PR **#1208** |
| 12 | **F** pre-push false-positive 解消 (`tools/check-substantive-change.mjs`) | PR **#1208** + PR **#1210** (set -e fix) |
| 13 | **B** coverage-map displayName count drift 検出 + obligation false-positive 修正 | PR **#1208** |
| 14 | **C** architectureRules merged.ts error message に active project id 明示 | PR **#1208** |
| 15 | **D** 新 guard scaffold script (`tools/scaffold-guard.mjs`) | PR **#1208** |

### Tier 1: 残 (人間 gate のみ)

#### 1. ✅ **checklist 同期** — landed 2026-04-29 (commit 99c4504)
- Phase K Option 1 / Option 2 の 6 項目を `[x]` flip (PR #1206 / #1208 で実 landed)
- Phase K Option 3 に defer 注記 (vacuous condition)

#### 2. ✅ **#9 visual evidence selection rule 撤回** — landed 2026-04-29 (commit 99c4504)
- 旧版 HANDOFF が「中規模、別 sprint」と推奨した内容を dialog で performative と判定
- 「consumer 数 / 365d commits / severity color / optionBuilder」全 4 指標が proxy metric / 適用 0 件 / governance theater
- Phase E 2 件 / Phase F 1 件 / Phase G 1 件 を理由付き strikethrough で記録
- structurally accepted state は guard 側 (baseline=6 + `REQUIRED_COVERED_IDS` hard-pin) で維持

#### 3. ✅ **#10 Phase L spawn 保留判定** — landed 2026-04-29 (commit 99c4504)
- 旧版 HANDOFF が「Phase L として独立 project 化を推奨」と記載していたが、Phase L spawn 自体が performative の risk 高
- PIPE / QH / PROJ に **spec 化されるべき実 drift / risk が validated されていない**
- 着手判断は validation 後（drift / risk 実証後）に再評価
- Phase C 4 項目を理由付き strikethrough で記録

#### 4. **最終 review + archive 承認** — `checklist.md` line 158、人間 gate
- 全 Phase (A〜K) の成果物 + 末セッションの撤回判定 (#9 / #10) を人間レビュー → archive プロセスへ移行承認
- 本 project の active 状態は本 gate のみで保留中

### Tier 2: defer (prerequisite 待ち、auto-trigger)

- 全 45 WID content graph + Promotion Gate L4 (#2 完成後に対象化)
- pipeline lineage graph + Promotion Gate L5 (#2 + Phase C 完成後)
- deprecated CALC sunsetCondition: vacuously achieved (現状 0 件、guard active)
- Phase K Option 3 (sunset trigger): 保留中、明確 value 出現で再着手判断

### cut (anti-bloat self-test 結果、2026-04-29)

- 全 chart cover (58 中 5 spec で selection rule 限定、HANDOFF 不可侵原則 3)
- 全 UIC cover (26 中 5 spec、同様)
- empty/error state 別 story 管理 (schema 拡張 cost > value)
- Promotion Gate L6 (per-tag tracking、1 人 project で過剰)
- PR comment bot (CLI 実用可能、手動運用で十分)

復活 trigger: chart/UIC selection rule 突破事例、deprecated calc 出現、PR コメント運用に pain 発生時に別 minor project として再起案。

### canonicalization 連動 (本 project と独立)

- `references/03-guides/integrity-pair-inventory.md` の #12 セル更新
- `contentSpecHelpers.ts` を Phase B reference 実装として明記
- 共通 primitive 候補を inventory 化

### 旧 Phase A〜J の作業（landed、参考用）

| Phase | 範囲 | landed commit |
|---|---|---|
| A〜D | calculation 全件 + readModel + scaffold | b4e07fd 〜 5b53a8f |
| E〜I | chart / UIC / Architecture Health KPI / PR Impact Report | (Phase E〜I 完遂時) |
| J | Behavior Claims Evidence Level enforcement、Step 1〜10 完遂 | 9c01678 〜 5564b60 |

## 3. ハマりポイント

### 3.1. 「初回スコープ外」の表現を本 plan に持ち込まない

不可侵原則 1 違反。本 project の存在意義は「Phase B 以降を放棄しないこと」を構造的に
保証することにある。`plan.md` / `checklist.md` / `AI_CONTEXT.md` に「out of scope」
「非対象」「初回除外」のような表現が混入したら不可侵原則違反として差し戻す。

**正しい表現**: 「Phase X で着手する」「依存 Phase 完了後に Wave 化する」。

### 3.2. Phase A の対象を 5 件から拡大しない

Anchor Slice の目的は **「対象網羅」ではなく「保証経路完成」**。
WID-033 / WID-040 / WID-018 / WID-006 / WID-002 の 5 件で source / spec / guard / CI の
4 経路 end-to-end が確認できれば、後続 Phase は同じ仕組みの対象拡大として
段階導入できる。Phase A で 6 件目以降に手を広げると、保証経路が完成する前に
重量化して目的を失う（plan.md 不可侵原則 3）。

### 3.3. WID-NNN 本文の上書き禁止

全 45 WID spec 本文は SP-B archive 期間に landed 済み（umbrella Phase 6 量産）。
本 project の Phase A の作業は **frontmatter 同期と source 接続のみ**。
本文（Section 1-9）を上書きする変更は scope 外（`plan.md` §7 やってはいけないこと）。

### 3.4. archived umbrella / archived sub-project の touch 禁止

archived は immutable（`projects/completed/architecture-debt-recovery/` 等）。
本 project は umbrella の sub-project ではない（不可侵原則 8）。
`config/project.json.parent` は設定しない。

archived sub-project SUMMARY との連携 (§5.7) は **読むだけ**。書き換えない。

### 3.5. Phase F 以降は selection rule 必須

UI Components / Charts / Storybook 連携 等を全網羅すると drift コストで運用が崩壊する。
plan.md §3.2 の優先順位 + 各 Phase の selection rule で「広げない」ことを明示。
条件追加で網羅範囲が広がるのは OK、条件削除で全網羅に近づくのは NG（C9 現実把握優先）。

### 3.6. content-spec-health.json は Phase H で初出

Phase H 完了前に `references/02-status/generated/content-spec-health.json` を
参照する CLAUDE.md 記述・docs:check 経路を追加してはならない。Phase H で collector
を実装してから初めて生成される。先行参照すると `docRegistryGuard` で fail する。

### 3.7. 大きな単一 Write は stream idle timeout に抵触する

archived umbrella `HANDOFF.md §3.6` の経験則を継承。**plan.md / 大きな inquiry ファイルは
skeleton → Edit の chunked 方式**で埋める（1 chunk あたり 100-150 行が目安）。
本 project の plan.md も skeleton → Edit chunked で構築されている。

### 3.8. State / Behavior / Decision の混同

`plan.md §5.1` の 3 層分離を破ると過剰期待が起こる。spec が green でも behavior が
正しいとは限らない。spec frontmatter の sync は **State Correctness** のみ保証する。
Behavior は test、Decision は ADR で別途守る。

### 3.9. 90 日 review cadence は儀式 — Phase K で構造 mechanism に置換済

`reviewCadenceDays + lastReviewedAt` の date-based cadence は **「review = date 更新」**
で構造的検証を伴わない儀式。既存 5 guard (co-change / frontmatter-sync / path-existence
/ lifecycle / evidence-level) が構造的 drift を網羅し、`lastVerifiedCommit` が concrete
signal を提供。Phase K Option 1+2 の実装が **landed (2026-04-29)**:

- **Option 1 (cadence 廃止 + commit-pin 強化)**: `contentSpecLastVerifiedCommitGuard` 新設
  (`AR-CONTENT-SPEC-LAST-VERIFIED-COMMIT`)。spec の `lastVerifiedCommit` が
  `git log -1 --format=%h -- <sourceRef>` の出力と一致するかを検証 (stale spec 検出)。
  `contentSpecFreshnessGuard` は `.skip` 化、`AR-CONTENT-SPEC-FRESHNESS` rule は
  deprecated 状態。物理削除は Tier 1 #11 で別 sprint。
- **Option 2 (verificationNote 必須化)**: `parseBehaviorClaimsTable` を 7 列対応に拡張、
  `contentSpecEvidenceLevelGuard` で `reviewed` claim の rationale 空欄を hard fail。
  既存 110+ reviewed claim に rationale を一括記入。

**やってはいけないこと（恒久）**: 「reviewed claim を機械的に tested に昇格」する作業を
追加し、test 化しにくい claim に無理やり test を書く（anti-pattern、CALC-013/014
CLM-004 等の横断的意味整合 / 表現規約 / 定数固定 claim は性質上 test 単独で表現不能）。
Phase K Option 2 の `verificationNote` 列が「なぜ test 化しないか」の explicit rationale を
強制する mechanism として動作する。

### 3.10. pre-push 警告「principles.json 未更新の可能性」は Phase K Option 1 後続 F で構造解消済

**[解消済 — 2026-04-29]** 旧状況: `docs:generate` が
`references/01-principles/adaptive-architecture-governance.md` の GENERATED:START/END
マーカー内 timestamp を更新するため、本ファイルの diff が出るたびに pre-push hook が
`docs/contracts/principles.json` 更新を提案していた (false positive)。

解消: Phase K Option 1 後続 F (2026-04-29) で
`tools/check-substantive-change.mjs` を新設、pre-push hook の
`check_principles_json` から呼出して `references/01-principles/*.md` の generated
section 外で変更があるときだけ warn を出すよう精度を上げた (HANDOFF.md §3.10
言及の改善余地を構造的に解消)。同 helper は generated section マーカー
(`<!-- GENERATED:START -->` / `<!-- GENERATED:END -->`) で囲まれた範囲を
diff 計算から除外する。

### 3.11. CI workflow checkout は `fetch-depth: 0` 必須 — 構造的に強制済

**[mechanism 化済 — 2026-04-29]** Phase K Option 1 で導入した
`contentSpecLastVerifiedCommitGuard` は `git log -1 --format=%H -- <sourceRef>` で
source の最新 commit を解決するため **full git history** が必要。`actions/checkout@v4` の
default は `fetch-depth: 1` (shallow clone) で、merge commit のみが返って全 89 spec で
false-positive 一括 fail を起こす事故 (PR #1205 後 main で発生)。

修正と再発防止 (2026-04-29):
- `.github/workflows/ci.yml` の `fast-gate` / `docs-health` / `test-coverage` に
  `fetch-depth: 0` を明示
- guard 側に `git rev-parse --is-shallow-repository` で defensive 検出 (shallow なら skip + warn)
- **E. `AR-CI-FETCH-DEPTH` meta-guard 新設** (PR #1207、`tools/git-hooks/pre-push` 経由
  で workflow YAML を機械検証)。新 workflow / 新 job 追加時の同種事故を構造的に予防。
  Allowlist (full history 不要): `wasm-build` / `e2e` / `pages-build` / `deploy`

### 3.12. git の `%h` short hash は repo 成長で長さ変動 — full SHA (`%H`) 比較が正解

**[mechanism 化済 — 2026-04-29]** Phase K Option 1 初版で `git log -1 --format=%h` の
短縮 hash (7-char) を spec frontmatter に保存 → 完全一致比較していた。リポジトリが
大きくなると `%h` は最小 unique abbreviation を返すため必要文字数が増える
(例: 7 chars `50018d3` → 8 chars `50018d33`)。これで完全一致比較が false-positive
一括 fail を起こした (PR #1205 main merge 後)。

中間案 (prefix-match) は CodeRabbit P1 review で false-negative リスク指摘:
declared = 古い 7-char prefix `abcdef0`、新 commit が `abcdef0X...` (prefix 衝突 = まさに
`%h` 長を 7→8 に伸ばす条件) だと、異 commit でも `actual.startsWith(declared)` で
誤って同一判定 → drift 検出見逃し。

最終解 (PR #1206、2026-04-29):
- `git log -1 --format=%H` で **full 40-char SHA** を取得
- spec frontmatter も full SHA で記録 (refresh-last-verified.mjs も同様)
- 完全一致比較 (`===`) のみで commit identity を判定
- Repo 成長 / prefix 衝突 / abbreviation 長変動 すべての false-positive/negative を排除

**やってはいけないこと**: spec.lastVerifiedCommit を短縮 hash で記録する。
`tools/widget-specs/refresh-last-verified.mjs` で full SHA に統一済、手書き編集は禁止。

### 3.13. shell hook の `set -e` 下で helper exit 1/2 が hook abort を起こす

**[修正済 — 2026-04-29、PR #1210]** `tools/git-hooks/pre-push` は冒頭で `set -e` を
有効化している。`check_principles_json` で `node tools/check-substantive-change.mjs` を
呼出し `case $?` で分岐していたが、helper が exit 1 (substantive change) や exit 2
(error) を返した時点で **`case` 行に到達する前に `set -e` が hook を abort** していた。
warn-only の check が hard push failure に化けていた。

修正: `if/else` パターンに変更。`if node ...; then ... else ... fi` の condition は
exit code を期待するため、非 0 でも `set -e` を triggered せず `else` 分岐で正しく
処理される。

**やってはいけないこと（恒久）**: `set -e` 下の shell スクリプトで helper の exit code
を分岐に使うときは `case $?` ではなく `if/else` を使う (もしくは `cmd || true` で明示
吸収)。同型 bug を新 check 追加時に再発させない。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / read order |
| **`plan.md`** | **canonical 計画 doc — Phase A〜K + Operational Control System §1〜§11** |
| `checklist.md` | Phase 0〜K completion 条件 (Phase K landing 後の同期は次セッション初手) |
| `projectization.md` | AAG-COA 判定 (Level 3 / governance-hardening) |
| `config/project.json` | project manifest（`status: "active"` / parent なし） |
| `aag/execution-overlay.ts` | rule overlay |
| `projects/completed/architecture-debt-recovery/HANDOFF.md` | archived umbrella の完遂サマリ |
| `projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/completed/widget-registry-simplification/SUMMARY.md` | SP-B archive サマリ（Anchor Slice 選定の文脈） |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御、Phase K で commit-pin 軸に更新済） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 + 全 45 spec 本文 |
| `references/03-guides/project-checklist-governance.md` | AAG Layer 4A 運用ルール |
| `references/03-guides/guard-test-map.md` | guard 一覧 + scaffold script 使用方法 (本 session で追記) |

## 5. 本セッション (2026-04-29) で導入した script / mechanism

| script / file | 役割 |
|---|---|
| `tools/widget-specs/refresh-last-verified.mjs` | 全 89 spec の `lastVerifiedCommit` を `git log -1 --format=%H` の出力で一括 sync (Phase K Option 1 修正経路) |
| `tools/widget-specs/migrate-verification-note.mjs` | 全 spec の Behavior Claims table を 7 列化 + reviewed claim に rationale 一括記入 (Phase K Option 2、本 session 完遂後は use-case 限定) |
| `tools/check-substantive-change.mjs` | 文書の generated section 外で substantive change があるかを判定する CLI (pre-push hook 等の false-positive 解消用) |
| `tools/scaffold-guard.mjs` | 新 architecture rule + guard test を skeleton + 5 箇所 paste-ready snippets で半自動生成 (E/B/D 系の co-change 義務軽減) |
| `app/src/test/guards/contentSpecLastVerifiedCommitGuard.test.ts` | spec ↔ source の commit-pin sync を full SHA 完全一致で検証 (`AR-CONTENT-SPEC-LAST-VERIFIED-COMMIT`) |
| `app/src/test/guards/coverageMapDisplayNameGuard.test.ts` | coverage-map.json の `× N` 表記が `guardFiles.length` と一致を機械検証 (`AR-COVERAGE-MAP-DISPLAY-NAME-COUNT`) |
| `app/src/test/guards/ciFetchDepthGuard.test.ts` | `.github/workflows/*.yml` の actions/checkout に `fetch-depth: 0` を強制 (`AR-CI-FETCH-DEPTH`、Allowlist: wasm-build / e2e / pages-build / deploy) |
| `app/src/stories/ChartCard.stories.tsx` | UIC-004 ChartCard + UIC-005 ChartLoading の 6 状態 visual evidence (Ready / Loading / Error / Empty / SectionVariant / Collapsible) |
