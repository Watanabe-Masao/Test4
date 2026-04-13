# plan — test-signal-integrity

> 役割: AAG 側の計画正本。
> 対象は **coverage 数値そのものではなく**、test / coverage / compile / lint の
> 品質シグナルを歪める行為を機械的に検知し、固定フォーマットのレスポンスで
> 止めることにある。
>
> application-side の test 拡充や coverage 70% への引き上げは本 plan の
> Scope 外とし、`projects/presentation-quality-hardening` 側で扱う。

## 不可侵原則 (Signal Integrity)

> **品質シグナルは、改善の結果を表すべきであり、達成のために歪めてはならない。**

1. **test は coverage を水増しするために存在しない** — 存在確認だけで完結する
   assertion を hard gate で止め、advisory で AI に自己点検させる
2. **warning は黙らせるために存在しない** — `@ts-ignore` / `eslint-disable` は
   理由・removalCondition なしで使わせない（既存 G3 ガードを rationale
   enforcement に拡張する）
3. **Green は見かけではなく、意味を伴うべきである** — Detection と Judgment を
   分離し、検知できないものは無理に hard gate 化せず Discovery Review に逃がす

## Protected Harm

| ID | 内容 |
|---|---|
| **H1. False Green** | 本質的な品質改善がないのに、test / coverage / compile / lint が成功しているように見える |
| **H2. Review Misleading** | レビュアーや未来の AI が「品質が確保された」と誤認する |
| **H3. Refactoring Fragility** | 浅い test や suppression により、将来の変更で本質的な問題が見えなくなる |
| **H4. Governance Drift** | 数値目標だけが先行し、AAG が守ろうとしている「意図に沿った品質」から外れていく |

## Detection Boundary

本 project は「品質劣化テスト」を抽象語のまま扱わない。**機械的に検知できるもの**
と **機械的には断定できないが注意喚起すべきもの** を分けて扱う。

### 機械的に検知できるもの (hard gate 候補)

| ruleId | 検知対象 |
|---|---|
| **TSIG-TEST-01** | existence-only assertion （`expect(x).toBeDefined()` / `toBeTruthy()` / `typeof === 'function'` のみで完結） |
| **TSIG-TEST-02** | render-only / import-only superficial test （主要 assertion なし） |
| **TSIG-TEST-03** | snapshot-only superficial coverage （構造差分のみで意味的 assertion なし） |
| **TSIG-COMP-01** | rationale-free `@ts-ignore` / `@ts-expect-error` （理由 / removalCondition なし） |
| **TSIG-COMP-02** | rationale-free `eslint-disable` （file 全体 disable / 理由なし） |
| **TSIG-COMP-03** | unused suppress escape （`_` で逃がすだけで責務整理を避けている） |

### 機械的に検知しにくいもの (review / advisory 対象)

| ruleId | 検知対象 |
|---|---|
| **TSIG-ADV-01** | assertion はあるが本質を検証していない |
| **TSIG-ADV-02** | mock 過剰依存（観測対象が置き換わっている） |
| **TSIG-ADV-03** | brittle test（内部実装詳細に強く依存し、リファクタリング耐性が低い） |
| **TSIG-ADV-04** | 境界条件・異常系欠落 |

**初期方針:** hard gate は検知可能で protected harm が明確なものから始める。
意味論依存のものは advisory / Discovery Review に留める。誤検知で実害が
出たときだけ検出精度を上げる。

## Rule Design Policy

1. **1 rule = 1 protected harm** — test padding と warning silencing は別ルールで扱う
2. **抽象語で禁止しない** — 「意味がない」「無駄」ではなく、検知可能な bad pattern に落とす
3. **hard gate は検知可能なものから始める** — syntax / AST / 構造解析で判定できるものだけを最初の block 対象にする
4. **グレーなものは advisory / review に留める** — 意味論依存のものは即 fail にしない
5. **禁止だけで終わらせない** — 「どこが悪いか」「なぜ禁止か」「どう直すか」を固定フォーマットで返す
6. **例外を先に定義する** — smoke test、migration 中の一時 suppression、公開契約の存在確認など

## New Test Insertion Advisory

新規の test / spec / e2e ファイルが diff に含まれる場合、AAG は hard gate とは
別に test signal integrity advisory を返す。

**Trigger:**

- `*.test.ts` / `*.test.tsx` / `*.spec.ts` / `*.spec.tsx`
- `__tests__/**`
- `app/e2e/**`

**Advisory message content:**

- existence-only assertion だけで終わっていないか
- render / import 成功だけで満足していないか
- snapshot だけで主要挙動を済ませていないか
- 出力・契約・副作用・分岐のいずれかを検証しているか
- suppress (`eslint-disable`, `@ts-ignore`) に依存していないか

**Initial behavior:**

- 新規 test 追加時は warning only
- 明確な bad pattern が検知された場合のみ hard fail
- グレーなものは `fixNow=review` で返す

## Standard Response Format

この project で追加する rule は、AAG の既存レスポンス方針に従い、
`renderAagResponse()` を経由して固定フォーマットで返す。

**Required response fields:** `ruleId` / `summary` / `detected` / `why` /
`protectedHarm` / `evidence` / `steps` / `allowedExceptions` /
`examples.bad` / `examples.good`

**Response contract（最低保証）:**

1. **何が検知されたか** — どのコード片が、どのパターンに該当したか
2. **どこがダメか** — 構造上の問題点（挙動・契約・副作用・責務の観点）
3. **なぜ禁止なのか** — False Green / Review Misleading / Refactoring Fragility 等の保護対象として返す
4. **どう直すか** — 意味のある test に変える方向、または suppress を外して根本修正する方向
5. **例外は何か** — smoke test、migration 中の一時 suppression 等、許容できる条件

### Example: superficial test

```
[AAG][TSIG-TEST-01][fixNow=now][governance-ops]
superficial test pattern detected: existence-only assertion

Detected
  - expect(buildBar).toBeDefined() のみで test が終了している

Why this is blocked
  - 実装の存在確認しかしておらず、挙動・契約・副作用を検証していない
  - coverage を増やしても品質保証に寄与しない

Protected harm
  - False Green
  - Review Misleading

How to fix
  1. 出力契約を検証する assertion を追加する
  2. 主要分岐または異常系を 1 件以上検証する
  3. existence-only assertion しか残らないなら test を削除する
```

### Example: warning silencing

```
[AAG][TSIG-COMP-02][fixNow=now][governance-ops]
signal silencing detected: eslint-disable without rationale

Detected
  - eslint-disable-next-line が理由なしで使われている

Why this is blocked
  - 問題を修正せず、検知シグナルだけを消している
  - 将来の変更で本質的問題が見えなくなる

Protected harm
  - False Green
  - Refactoring Fragility

How to fix
  1. disable を外して根本原因を修正する
  2. 一時 suppression が必要なら理由と removalCondition を明記する
  3. 恒久化が必要なら allowlist / guide に根拠を残す
```

## Allowed Exceptions

初期段階で許容例外候補:

- helper export の存在自体が公開契約であるケース
- framework boundary の smoke test
- migration 中で `removalCondition` が明記された一時 suppression
- 既存 bad pattern の棚卸し中で allowlist 管理されているもの

## 既存 AAG 実装との接続（補足 — 重複回避と拡張ポイント）

> 本 plan は新規ルール群を立てるが、既存 AAG 実装に **隣接コンポーネント** が
> あるため、新規作成と既存拡張を切り分けて重複を避ける。

### 既存実装の現在地（2026-04-13 調査時点）

| 既存実装 | 配置 | 現状 | 関係 |
|---|---|---|---|
| **AR-G3-SUPPRESS** (G3 ガード) | `app/src/test/guards/codePatternGuard.test.ts` L359-405 | `eslint-disable` / `@ts-ignore` / `@ts-expect-error` を **検出** 済み。baseline 0 / allowlist ≤ 2 (EChart.tsx, FileDropZone.tsx) | TSIG-COMP-01/02 はゼロから作らず、**G3 を rationale enforcement に拡張する** |
| **G3 allowlist** | `codePatternGuard.test.ts` 内に inline | inline 2 件、コメント形式の human readable rationale のみ。machine-parseable な構造化はない | `app/src/test/allowlists/signalIntegrity.ts`（新規）に切り出して構造化する |
| **test quality guards** | （存在しない） | TSIG-TEST-01/02/03 は前例なし | **新規作成**。`testQualityGuard.test.ts` を立てる |
| **renderAagResponse** | `tools/architecture-health/src/aag-response.ts` + `app/src/test/architectureRules/helpers.ts` | 既存固定レスポンス基盤。tools / app の 2 ソース同期契約あり | TSIG ルールも同じ infra を経由する。新 helper は作らない |
| **doc-registry.json** | `references/03-guides/doc-registry.json` 等 (94 文書登録済) | 第 9 原則「ドキュメント自体が品質管理対象」。新規 references/ 文書は登録必須 | TSIG ガイド / 原則文書追加時に**同コミット内で登録** |
| **vitest coverage threshold** | `app/vitest.config.ts` | 現在 `lines: 55`。`presentation/` は include 外 | 本 plan は閾値を**変更しない**。前提条件提供のみ |
| **migrationTagRegistry** | `app/src/test/migrationTagRegistry.ts` (AAG v4.5.0) | 段階的 rollout する rule の管理基盤 | Phase 3 hard gate 投入時に TSIG rule に migration tag を付与し、ratchet-down で進行を可視化する |
| **architecture-rule baseRule** | `app-domain/gross-profit/rule-catalog/base-rules.ts` | 案件非依存の rule catalog (143 rules) | TSIG-* rule 群はここに定義 |

### 重複回避ポリシー

1. **TSIG-COMP-01/02 は AR-G3-SUPPRESS の rationale 拡張サブルールとして実装する**
   - 名称案: `AR-G3-SUPPRESS-RATIONALE` （既存 AR-G3-SUPPRESS の subordinate）
   - 既存 baseline 0 を維持しつつ、allowlist エントリに `reason` / `removalCondition` を必須化する
   - これにより G3 と TSIG-COMP の二重カウントを防ぐ
2. **TSIG-COMP-03（unused suppress escape）は新規ルールとして独立**
   - 既存 G3 では検知していない領域
3. **TSIG-TEST-01/02/03 は新規 testQualityGuard.test.ts として独立**
   - 既存 guard と重複しないことを確認済み

## Phase 構造

> Phase 番号は `checklist.md` の required checkbox 構造と一致させる。

### Phase 1: Principle / Guide 定義

- Signal Integrity の思想を `references/01-principles/test-signal-integrity.md` に文書化
- protected harm を定義
- 品質劣化パターンを具体例つきで列挙
- 検知できるもの / できないものの境界を書く
- 許容例外を先に書く
- doc-registry.json に新規文書を登録（同コミット）
- 固定レスポンスの必須項目を定義

### Phase 2: Advisory / Review 入口の整備

- 新規 test 追加時の advisory を実装（`pre-commit` / `pre-push` から呼べる軽量 hook）
- diff 上の bad pattern を `fixNow=review` で返す
- Discovery Review の既存仕組み（AAG v4.3）と統合する
- 誤検知しやすいものと hard gate 化しやすいものを分けて記録する
- advisory → hard gate 昇格条件を定義する
- false positive 発生時の扱い（allowlist / review / rule 精度改善）を定義する

### Phase 3: Hard Gate 1st Batch 実装

- TSIG-TEST-01 (existence-only assertion) の guard 実装
- AR-G3-SUPPRESS-RATIONALE の追加（既存 G3 の拡張で TSIG-COMP-01/02 を実現）
- TSIG-COMP-03 (unused suppress escape) の guard 実装
- 各 guard を `renderAagResponse()` 経由で固定フォーマット返却
- migrationTagRegistry に Phase 3 タグを登録
- 推奨: 事前に「現実把握作業」を実行し ratchet-down baseline を採取（後述「補助作業」参照）

### Phase 4: Docs / Map / Integration 整備

- AAG response 固定フォーマットに統合
- fix hint を整備
- `references/03-guides/test-signal-integrity-guide.md` を追加
- `references/03-guides/guard-test-map.md` を更新
- doc-registry.json への新規文書登録
- examples / exception / migration path を文書化

### Phase 5: 運用着地と application-side への接続

- `presentation-quality-hardening` の coverage 70 引き上げ前に、本 plan の
  hard gate 初期群が有効になっていることを前提条件として cross-link する
- 当該 project の checklist.md に「test-signal-integrity Phase 3 完了」を
  前提行として追記する（依存関係の可視化）
- coverage 数値目標は application-side / signal integrity は AAG-side である
  ことを文書上で分離する

## 推奨される補助作業（Phase 構造外）

> required checkbox には含めないが、Phase 3 着手前に行うと baseline 設定の
> 解像度が上がる作業。

### Discovery / Baseline 採取

「現実を正しく把握する」(C9 原則) を Phase 3 の前に行う:

- TSIG-TEST-01〜03 / TSIG-COMP-01〜03 の **現在の repo 内 violation 数** を採取
- 一時 script で実コードを走査し、件数 + 代表ファイルパスを記録
- 採取結果を不可侵原則と照合し、ratchet-down baseline を決める
- 採取結果は `references/02-status/generated/` 配下に格納候補（将来 collector 化）

これは新規ルール導入時に「いきなり block」を避けるための実装上の知恵であって、
Signal Integrity 思想そのものではないため、checklist 必須項目には入れない。

## Success Criteria

- hard gate 対象の bad pattern が新規 diff で止まる
- advisory は新規 test 追加時に自動で返り、AI が自己点検できる
- hard gate と advisory の境界が文書化されている
- 「検知できないもの」を無理に hard fail しない
- coverage 70 引き上げ前に、test quality degradation の初期防御が入る
- ルールが abstract ではなく、bad/good example と protected harm で説明できる

## Risks

| ID | リスク | Mitigation |
|---|---|---|
| **R1** | 過剰規制 — 正当な smoke test や helper test まで止める | 初期は advisory 先行 / 例外条件を先に書く / 誤検知が見えたものだけ精度を調整 |
| **R2** | 抽象語ルール化 — 「意味がない」「無駄」だけのルール | rule ごとに protected harm と concrete example を必須化 |
| **R3** | coverage goal との混線 — 70 を否定しているように読まれる | coverage goal は application-side / signal integrity は AAG-side と明確に責務分離 |
| **R4** | 検知できないものへの過剰期待 | advisory / review / Discovery Review への逃がし先を維持 |

## やってはいけないこと

- **既存 G3 ガードと並列に同じ検出を作らない** → 二重カウント / drift の原因
- **検知できないものを hard gate 化しない** → 誤検知で実装者の信頼を失い、AAG 全体の権威が落ちる
- **rule 数を増やすことを目的化しない** → 1 rule = 1 protected harm の原則を逸脱する
- **coverage 閾値そのものに触らない** → application-side project の所掌を侵食する
- **advisory を「pass しないと commit できない」運用に拡大解釈しない** → 初期は warning only

## Exit / Handoff Condition

この project 完了後、application-side では `presentation-quality-hardening`
Phase 3（coverage include 拡張、component test 追加、coverage 70 引き上げ）に、
**品質シグナル保全の前提付き** で着手できる状態になる。

## 関連実装

| パス | 役割 |
|---|---|
| `app/src/test/guards/codePatternGuard.test.ts` | 既存 G3 ガード — TSIG-COMP-01/02 拡張先 |
| `app-domain/gross-profit/rule-catalog/base-rules.ts` | rule catalog 物理正本 — TSIG-* rule 追加先 |
| `app/src/test/architectureRules/helpers.ts` | `renderAagResponse()` (app side) |
| `tools/architecture-health/src/aag-response.ts` | `renderAagResponse()` (tools side) |
| `app/src/test/migrationTagRegistry.ts` | 段階的 rollout 管理 |
| `app/src/test/allowlists/` | 新規 `signalIntegrity.ts` 追加先 |
| `app/vitest.config.ts` | coverage 設定（**変更しない** — 参照のみ） |
| `references/03-guides/architecture-rule-system.md` | rule 追加方法の正本 |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 4 層構造の正本 |
| `projects/presentation-quality-hardening/checklist.md` | Phase 5 で前提行を追記する application-side checklist |
