# discovery-log — aag-engine-go-mvp

> **役割**: implementation 中に発見した **scope 外** / **改善必要** / **詳細調査要** 事項の蓄積 artifact (= DA-β-003 で institute)。
> AAG 4 系統 lens (= ログ / メトリクス / 手順書 / チェックリスト) に直交する **5 系統目: 発見蓄積**。
>
> **scope 含む**: 本 project の plan 範囲外で発見した事項 / 改善 candidate / 詳細調査要事項。
> **scope 外 (= 別 doc)**: 本 project plan 範囲内事項 (= `checklist.md` / `plan.md`)、判断履歴 (= `decision-audit.md`)。
>
> **役割分担**:
> - `decision-audit.md` (= 判断履歴): scope 内で行った意思決定の lineage articulation
> - `discovery-log.md` (本 doc、= scope 外発見): scope 外で発見した未処理事項の inventory
>
> 機械検証: `projectizationPolicyGuard` PZ-14 (= file 存在 + schema 軽量 check)。
> entry 内容妥当性は AI session 責任 (= 機械検証 scope 外、AAG philosophy「製本されないものを guard 化しない」と整合)。
>
> 詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.3 + DA-β-003。

## priority

| priority | 性質 | 解消 timing |
|---|---|---|
| **P1 (high)** | 本 program 内吸収可能 (= 既存 phase で batch 解消可能) | 該当 phase で batch 解消、または直近 phase 末で吸収 |
| **P2 (med)** | post-archive 別 program candidate (= scope 大 / 不可侵原則 risk) | 本 program archive 後、別 program 起動判断 (= user) |
| **P3 (low)** | 揮発 / 不要判定可 / 後続発見で superseded 可能性 | 棚卸 phase で削除判定、scope 不明なら触らない |

## 発見済 entry

> entry 形式: 以下 template に沿って追記。各 entry は priority + 場所 + 現状 + 改善/調査内容 + trigger + 解消 timing + 影響 で articulate。

### template (= copy して新 entry を articulate)

```markdown
### <YYYY-MM-DD> <P1|P2|P3>: <短い articulate>

- **場所**: <file path / scope / module>
- **現状**: <観測した state>
- **改善 / 調査内容**: <何をすべきか、何を調べるか>
- **trigger**: <発見契機 = どの作業中に発見したか>
- **解消 timing**: <P1 = 該当 phase / P2 = post-archive 別 program / P3 = 棚卸>
- **影響**: <推定 scope = 件数 / file 数 / module 数>
```

### 2026-05-06 P2: TS detector を Go から exec する真の TS 並走 shadow mode

- **場所**: `aag-engine/internal/shadow/` (= 現状 fixture parity 主軸、TS 直接実行は scope 外)
- **現状**: shadow mode (= Phase 9 deliverable) は TS captured fixture output (= `expected.json`) を canonical source of truth として Go 出力との parity を集約検証。実 TS detector を Go から exec する mode は **scope 外** として articulate 済 (= DA-α-009 §rationale + §alternatives-b)
- **改善 / 調査内容**: node binary + npm 環境を CI / local 双方で確保し、TS detector を Go から `exec` で起動 → JSON 出力 capture → Go 出力との parity 比較を articulate する program。fixture parity が「TS captured = canonical」 と articulate されているのに対し、実時点 TS execution との parity を articulate することで TS 側 detector logic 改修時の drift 即時検出が可能になる
- **trigger**: Phase 9 (= Shadow Mode landing) で fixture parity 主軸の judgement を articulate した際、(b-alt) として「TS detector を Go から exec」 を不採用と articulate (= DA-α-009 §alternatives-b、scope 過剰 + node 環境依存 + JSON 出力 capture 必要)
- **解消 timing**: post-archive 別 program (= 仮 ID `aag-engine-shadow-mode-runner-impl`) で起票判断、本 MVP archive 後 user 判断
- **影響**: scope 大 (= node + npm + 各種環境依存 + TS 側 detector の独立実行 entry-point articulate + JSON 出力 capture protocol articulate)、本 MVP の不可侵原則 1 (= validator only) と 4 (= rule semantics 複製禁止) との整合確認必須

### 2026-05-06 P2: `aag validate` real-repo dispatch (= Phase 1 skeleton 解消)

- **場所**: `aag-engine/cmd/aag/main.go` の `runValidate()` (= Phase 1 で landing、Phase 12 closure までずっと skeleton 維持)
- **現状**: `aag validate --repo .` は空の DetectorResult[] を返す Phase 1 skeleton のまま (= main.go コメント「Phase 1 skeleton: empty DetectorResult[] を返す」 articulate)。実 repo の 5 detector 走査は **未実装**、shadow mode (= fixture-based) のみが parity 検証経路
- **改善 / 調査内容**: collector layer (= 実 repo の AAG facts collection) を articulate + 5 detector を validate に wire up + DetectorResult[] を出力。これにより `aag validate --repo .` が実 repo の AAG governance 違反を本格的に検出可能になる
- **trigger**: Phase 1 landing 時 skeleton で確定 + Phase 9 main.go usage で「Phase 10/11 で実 repo 走査追加候補」 と明示 articulate (= cmd/aag/main.go §69 `validate subcommand は Phase 1 skeleton のまま`)。Phase 11 / 12 closure で結局 implement されず post-archive 候補として確定
- **解消 timing**: post-archive 別 program (= 仮 ID `aag-engine-real-repo-dispatch-impl` または `aag-engine-hard-gate-promotion` の前提実装)、本 MVP archive 後 user 判断
- **影響**: scope 中 (= collector layer 実装 + 5 detector dispatch + JSON 出力 + edge case test)、shadow mode 経路は維持、validate 単独運用が可能になる institutional value 高い

### 2026-05-06 P2: doc-registry / schema-validation / project-lifecycle の hard gate 昇格判断 (= Phase 12 closure で再評価予定だったが scope shift で別 program 集約)

- **場所**: `decision-audit.md` DA-α-011 §decision-5 (= per-detector judgement table、3 detector を「Phase 12 closure で再評価」 と articulate) vs DA-α-012 §decision-2 (= 後続 program `aag-engine-hard-gate-promotion` に集約 articulate)
- **現状**: DA-α-011 で 3 detector (= doc-registry / schema-validation / project-lifecycle) は「Phase 12 closure で再評価」 と articulate されたが、DA-α-012 では Phase 12 closure 内で per-detector 再評価せず、option A → 後続 program `aag-engine-hard-gate-promotion` に集約 articulate (= scope shift)。本 entry は **transparent articulation 漏れ** (= DA-α-011 → DA-α-012 の scope shift を institutional に articulate していない) を補完する
- **改善 / 調査内容**: 後続 program `aag-engine-hard-gate-promotion` 起票時、per-detector judgement (= 昇格 / 見送り / 永続 advisory) を 3 detector × evidence × scope × 推奨度の table 形式で再 articulate (= DA-α-011 §decision-5 と同 pattern)、本 MVP の operational deferred 観測 (= 5 連続 success + 2〜4 週間 false positive) を入力 evidence として使用
- **trigger**: Phase 12 closure 提案 articulate 時 (= DA-α-012)、Phase 11 で「Phase 12 closure で再評価」 と articulate された 3 detector の判断を、Phase 12 内では実行せず後続 program に escalate した scope shift を発見
- **解消 timing**: post-archive 別 program `aag-engine-hard-gate-promotion` で起票判断、本 MVP archive 後 user 判断
- **影響**: scope 中 (= 既に DA-α-011 で per-detector evidence articulate 済、後続 program では再評価 + operational evidence 統合 articulate のみ)、本 MVP の institutional knowledge transfer 価値高い

### 2026-05-06 P3: doc-registry path normalization 規約検証 (= Phase 7 必要時 articulate と articulate 済だが未実行)

- **場所**: `decision-audit.md` DA-α-005 §rationale §3 (= 「repo-relative POSIX path は fixture 入力時点で valid、4 規約検証は Phase 7 必要時 articulate」)
- **現状**: doc-registry detector (= AR-DOC-REGISTRY-D1) は missing path 判定のみ articulate、TS 側の path-helpers `RepoPath` 4 規約 (= POSIX separator / no leading slash / no trailing slash / no relative `..`) の機械検証は **未実装**。fixture 入力時点で valid とし、規約逸脱は collector 側 boundary で fail-fast する design (= DA-α-005 §rationale)
- **改善 / 調査内容**: doc-registry detector 入力 path に対する 4 規約 unit test 追加、または collector layer (= P2 entry「`aag validate` real-repo dispatch」 の前提) で path normalization step を articulate
- **trigger**: Phase 5 (= Doc Registry Detector) landing 時、TS 側 path-helpers 4 規約を Go 側で再現する scope 判断 (= DA-α-005)。fixture 経路では valid path のみが articulate されるため Phase 5 で不要、Phase 7 (= project-lifecycle) で必要時 articulate と deferred されたが Phase 7 でも不要、Phase 12 closure まで未実行
- **解消 timing**: P3 (= 揮発 / 不要判定可)、post-archive 別 program で `aag validate` real-repo dispatch (= P2) 実装時に併合判断、または不要判定で削除
- **影響**: scope 小 (= 4 規約 unit test 数件)、`aag validate` real-repo dispatch program と統合する場合は前提 articulation として institutional value あり

### 2026-05-06 P3: schemaVersion mismatch 検出 (= 別 rule 後続 articulate 候補)

- **場所**: `decision-audit.md` DA-α-006 §scope (= 「MVP scope は projectization.level 範囲、schemaVersion check は別 rule で後続 articulate 候補」)
- **現状**: schema-validation detector (= AR-SCHEMA-VALIDATION-PZ2) は projectization.json の `level` field の整数 0〜4 範囲のみ judge、`schemaVersion` field (= projectization schema version) の mismatch 検出は **未実装**。AR-SCHEMA-VALIDATION 系 rule の拡張余地として articulate 済
- **改善 / 調査内容**: 新 rule (= 仮 ID `AR-SCHEMA-VALIDATION-PZ-VERSION`) として projectization.json の schemaVersion field を canonical schema (= `docs/contracts/aag/projectization.schema.json` 等) と照合する detector + fixture を articulate
- **trigger**: Phase 6 (= Schema Validation Detector) landing 時、MVP scope を level 範囲のみに limit する scope 判断 (= DA-α-006 §scope-1)。schemaVersion mismatch は別 rule で articulate するほうが SRP 整合 + scope creep 回避と articulate
- **解消 timing**: P3 (= 揮発 / 不要判定可)、post-archive 別 program `aag-engine-domain-coverage-extension` (= DA-α-012 §decision-2 後続候補) で起票判断、または不要判定で削除
- **影響**: scope 小 (= 1 rule 追加 + fixture + detector 実装 + per-rule unit test)、新 governance scope 追加候補

### 2026-05-06 P2: versionImpact declaration mechanism の機械検証 guard 実装 (= 別 program 起票候補、DA-α-014 で proactive 化済)

- **articulation 修正履歴**:
  - 2026-05-06 (旧 articulation、DA-α-013 経由): 「AAG-tagged project の `aag/CHANGELOG.md` 更新を mechanical 強制する guard」 (= reactive、後追い検出)
  - 2026-05-06 (本 articulation、DA-α-014 経由): 「versionImpact declaration mechanism の機械検証 guard」 (= proactive、事前 declare + 整合検証) に articulation 修正 (= user 直接 directive「計画段階で判定すべき + 事前判定で未更新を機械的判定」)
- **場所**: `app/src/test/guards/versionImpactGuard.test.ts` (= 新 guard test 配置候補)
- **現状**: 2026-05-06 DA-α-014 で **declaration mechanism 自体は institute 完了** (= aag/CHANGELOG.md §バージョンアップ判定基準 + config/project.json `versionImpact` field + projects/_template/ 適用 + 本 MVP self-dogfood)。**機械検証 guard は未実装**、archive 移行時の整合検証は別 program で articulate 必要
- **改善 / 調査内容**:
  - guard test 実装: archive 移行 trigger (= active → archived) で `config/project.json` `versionImpact` を read、`expectedTargetVersion = baselineAtCreation + delta` (semver 加算) を算出、CHANGELOG (= app or AAG) に該当 entry 存在 + 当該 entry に project ID reference を機械検証、未満たす項目で hard fail
  - 既存 active project への retroactive declaration: 既存 active project (= aag-engine-go-mvp 以外) に `versionImpact` field 追加 (= app `+0.0.0` / aag `+0.0` を default 適用、必要に応じて bump declare に修正)
  - edge case test: 並列 project (= 同 expected) / sequential (= 異 expected) / 競合 declare (= rationale 衝突) / delta 加算 semver 整合 / out-of-order completion 等
  - integration with archive lifecycle hook: 既存 `projectCompletionConsistencyGuard` との 統合判断 (= 同 hook で実行 vs 独立 hook)
- **trigger**: 2026-05-06 user feedback (= DA-α-013 「プロジェクト単位でそちらの更新も強制すべきです」 + DA-α-014 4 連 directive で proactive declaration mechanism に articulation 修正)
- **解消 timing**: post-archive 別 program (= 仮 ID `aag-version-impact-declaration-guard`) で起票判断、本 MVP archive 後 user 判断
- **影響**: scope 中 (= guard test 実装 + 既存 active project の retroactive declaration + edge case test + integration with archive lifecycle hook + 機械検証 logic の delta 加算 semver 実装)、AAG framework governance evolution の institutional value 極めて高い (= 「気をつけるではなく mechanism として運用」 の完全適用)

### 2026-05-06 P2: AAG 5.x までの inline articulation を `aag/CHANGELOG.md` に retroactive 移植

- **場所**: `CHANGELOG.md` (= repo root) §[v1.9.0] §[v1.10.0] (= AAG 5.1 / AAG 5.2 inline articulation) と `aag/CHANGELOG.md` (= AAG 6.0 以降の canonical) の整合
- **現状**: `aag/CHANGELOG.md` の bridge note で「AAG 5.x までは `CHANGELOG.md` (= app changelog) に inline articulate、AAG 6.0 以降は本 file が canonical」 と articulate 済 (= DA-α-013 §decision-1)。retroactive split は本 MVP scope 外として deferred、bridge note で navigation 代替
- **改善 / 調査内容**:
  - AAG 5.1 (= v1.9.0 の Project Lifecycle Management & Documentation/Task Separation) を `aag/CHANGELOG.md` に retroactive entry articulate (= 既存 inline articulation を copy + AAG version section title を独立 articulate)
  - AAG 5.2 (= v1.10.0 の Collector-Governance Symmetry) を同様に retroactive entry articulate
  - 既存 `CHANGELOG.md` の inline articulation は維持 (= 歴史保存)、または「詳細は `aag/CHANGELOG.md` 参照」 と pointer 化
- **trigger**: 2026-05-06 AAG 6.0 institute 時 (= DA-α-013) に bridge note で「retroactive split は scope 外」 と deferred articulate
- **解消 timing**: post-archive 別 program (= 仮 ID `aag-changelog-historical-split`) で起票判断、本 MVP archive 後 user 判断 (= bridge note で navigation 機能しているため緊急度低)
- **影響**: scope 中 (= 2 entry の retroactive 移植 + 既存 CHANGELOG.md pointer 化判断 + AAG 5.0 / 4.x 等の更に過去 articulation の追跡判断)、institutional 価値は中 (= bridge note で代替可能)

### 2026-05-06 P3: `aag fixtures --compare` flag 拡張 (= actual との parity 比較拡張余地、shadow mode で superseded 候補)

- **場所**: `aag-engine/cmd/aag/main.go` の `runFixtures()` (= Phase 3 で landing、catalog 出力 only)
- **現状**: `aag fixtures --repo .` は fixture catalog (= name + expected count) を出力するのみ。実 detector の actual 出力との parity 比較は **未実装**、Phase 9 で shadow mode が同等機能を集約 layer で articulate (= 後続発見で superseded 候補)
- **改善 / 調査内容**: `aag fixtures --compare` flag を articulate して fixture-by-fixture の parity 比較を per-fixture 単位で出力、shadow runner との分担を articulate (= shadow = 集約 / fixtures --compare = per-fixture detail)、または不要判定で削除
- **trigger**: Phase 3 (= Fixture Runner) landing 時、Phase 9 shadow mode で集約 layer を articulate する場合「`aag fixtures` に `--compare` フラグ等を追加して拡張予定」 と main.go コメント articulate (= cmd/aag/main.go §209)。Phase 9 で shadow mode が集約 layer として articulate された結果、本 flag は **superseded 候補**
- **解消 timing**: P3 (= 後続発見で superseded 可能性高、shadow mode が同等機能を集約 articulate 済)、棚卸 phase で削除判定または scope 不明なら触らない
- **影響**: scope 小 (= CLI flag + comparison logic、shadow mode と機能重複の可能性高、不要判定推奨)

## 別 program candidate (= P2、post-archive)

> 本 project archive 時に user 判断で別 program 起動 candidate として escalate される entry をこの section に集約。
> archive manifest の `relatedPrograms.child` に集約候補。

| 仮 program ID | 起票 trigger | scope | 由来 |
|---|---|---|---|
| `aag-engine-hard-gate-promotion` | DA-α-012 option A 採用時、operational deferred 観測完了後 | 残 4 detector の per-detector 段階昇格 + 3 detector の Phase 11 deferred 判断統合 (= 上記 P2 entry「3 detector hard gate 昇格判断」 と統合) | DA-α-012 §decision-2 + DA-α-011 §decision-5 |
| `aag-engine-domain-coverage-extension` | DA-α-012 option C 採用時、新 governance scope 追加判断時 | 新 detector / rule 追加 (= AR-SCHEMA-VALIDATION-PZ-VERSION 等を含む)、不可侵原則 4 整合確認 | DA-α-012 §decision-2 + 上記 P3 entry「schemaVersion mismatch 検出」 統合候補 |
| `aag-engine-shadow-mode-runner-impl` | TS 側 detector logic 改修時の drift 即時検出 needs articulate 時 | TS detector を Go から exec する真の TS 並走 mode、node 環境依存 articulate | DA-α-009 §rationale + 上記 P2 entry「TS detector を Go から exec する真の TS 並走 shadow mode」 |
| `aag-engine-real-repo-dispatch-impl` | `aag validate --repo .` を skeleton から本格実装する判断時、`aag-engine-hard-gate-promotion` の前提実装 candidate | collector layer + 5 detector dispatch + JSON 出力 + edge case test | 上記 P2 entry「`aag validate` real-repo dispatch」、Phase 1 skeleton 解消 |
| `aag-version-impact-declaration-guard` | 後続 AAG-related project bootstrap 時 / または versionImpact declaration 漏れ検出時 | versionImpactGuard.test.ts 実装 + 既存 active project への retroactive declaration + edge case test + archive lifecycle hook 統合。declaration mechanism 自体は DA-α-014 で institute 完了、本 program は機械検証 layer 実装 | DA-α-014 §decision-6 + 上記 P2 entry「versionImpact declaration mechanism の機械検証 guard 実装」 (= DA-α-013 旧 entry を proactive 化で renaming + scope expansion) |
| `aag-changelog-historical-split` | retroactive split 必要性が user 判断で確定時 (= 緊急度低、bridge note で navigation 代替中) | AAG 5.1 / AAG 5.2 (= v1.9.0 / v1.10.0 inline articulation) を `aag/CHANGELOG.md` に retroactive entry 移植 + 既存 CHANGELOG.md pointer 化判断 | DA-α-013 §decision-6 + 上記 P2 entry「AAG 5.x までの inline articulation を `aag/CHANGELOG.md` に retroactive 移植」 |

## status

- 2026-05-05 (project bootstrap): 本 discovery-log landing
- 2026-05-06 (Phase 12 closure 後): scope 外発見 6 件 (= P2 3 件 + P3 3 件) を集約 articulate、後続 program 4 候補を articulate (= user 「蓄積された課題はありますか」 query 由来、option A 採用)
- 2026-05-06 (AAG 6.0 institute 後): AAG version 分離 mechanism institute (= DA-α-013) 派生で P2 entry 2 件追加 (= 計 P2 5 件 + P3 3 件 = 8 件)、後続 program 候補 6 件に拡張 (= aag-changelog-vertical-obligation-guard + aag-changelog-historical-split 追加)
- 2026-05-06 (versionImpact mechanism institute 後): user 4 連 directive で reactive guard を proactive declaration + 機械検証に articulation 修正 (= DA-α-014)、P2 entry の articulation refinement (= 「aag-changelog-vertical-obligation-guard」 → 「aag-version-impact-declaration-guard」)、P2 件数不変 (5 件)、program 候補不変 (6 件、entry name + scope のみ更新)
