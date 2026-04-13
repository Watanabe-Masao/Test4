# projects/ 運用ルール — checklist 駆動の completion 管理

> **役割:** 残存課題管理と project ライフサイクルの正本ガイド。
> このガイドは「live な作業項目の正本がどこにあるか」「何をもって project が
> 完了したと見なすか」「completed になった project はどう archive するか」を定義する。
> 新しい project を立てる人 / project を完了させる人 / AAG collector を書く人が
> 最初に読む。
>
> **AAG レイヤー: Layer 4A System Operations（AAG Core）**
>
> 本ガイドは特定の app domain（gross-profit）や個別 project に依存しない、
> **全 project に共通する運用骨格** である。プロジェクトが変わっても残る
> 共通手順として AAG Core 側に置かれ、`promote-ceremony-template.md` /
> `architecture-rule-system.md` / `allowlist-management.md` 等と同じ層に属する。
> 詳細: `references/01-principles/aag-5-constitution.md` §Layer 4A。
>
> 関連する AAG 実装:
>
> | コンポーネント | 配置 | レイヤー |
> |---|---|---|
> | 規約（本書） | `references/03-guides/project-checklist-governance.md` | 4A System Operations |
> | collector | `tools/architecture-health/src/collectors/project-checklist-collector.ts` | 3 Execution |
> | format guard | `app/src/test/guards/checklistFormatGuard.test.ts` | 3 Execution |
> | consistency guard | `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | 3 Execution |
> | generated KPI | `references/02-status/generated/project-health.json` / `.md` | 3 Execution（派生物） |
> | live project | `projects/<id>/` | 4B Project Operations |

## 0. 基本思想

> **ドキュメントはその機能を説明するためにある。そこに課題が紛れるとノイズになる。**

この一文がすべてを決める。本ガイドの規約はこの一文の機械的強制装置であり、
それ以上でもそれ以下でもない。

| 種別 | 居場所 | 何が書かれるか |
|---|---|---|
| **ドキュメント** | `references/` / `CLAUDE.md` / `roles/` / `app-domain/` 等 | 機能・契約・原則・背景・歴史。**live task は一切書かない** |
| **課題** | `projects/<id>/checklist.md` | 未着手 / 着手中の作業項目だけ。**機能説明は一切書かない** |

> **1 project = 1 一貫した task scope。**
> 異質の動線・コンテキストを持った課題（例: pure 計算責務再編と データロード冪等化）を
> 同じ checklist に混ぜると、後から読む人が「何の話なのか」を理解するために
> コスト過大に支払う。スコープが分岐したら必ず project を分ける。

両者を混ぜると次が起きる:
- ドキュメントを読みに来た人がノイズに目を逸らされる
- 課題が複数箇所に散らばって drift する
- 完了した課題が docs に残り続けて信頼性を毀損する
- 新しい課題をどこに書けばいいかわからなくなる

本ガイドは上記 4 つの問題を構造的に発生させない仕組みを定義する。

### この分離が支える運用シナリオ

複数の課題を異なる文脈で **並行進行** したり、途中で切り上げて **他の課題に
切り替え** たりする際に、適切な文脈を切り分けて保持することで「いま何を
やっているのか」が常に明確になる。各 project は:

- **独立した AI_CONTEXT.md** で文脈の入口を持つ
- **独立した checklist.md** で進行状態を持つ
- **独立した HANDOFF.md** で再開時の続きが分かる
- **collector が動的に completion 判定** するため、人間が「終わったか？」を毎回手で
  判定しなくて済む

これにより、AI セッションが project A → project B → project A と切り替わっても、
文脈が混線しない。これが本仕組みの中心目的であり、ドキュメントと課題の分離は
そのための必要条件である。

## 1. 目的

repo の残存課題を以下の体制に統一する。

| 対象 | 何が書かれるか | 更新主体 |
|---|---|---|
| `projects/<id>/checklist.md` | live な残存課題（completion 判定の唯一の入力） | 作業者 |
| `projects/<id>/plan.md` | 構造・原則・Phase 定義 | 計画変更時のみ |
| `projects/<id>/HANDOFF.md` | 後任者の入口（完了済みの全景 + 次にやること） | コード truth 変更後 |
| `projects/<id>/AI_CONTEXT.md` | AI が最初に読む文脈（project の意味 + read order） | プロジェクト立ち上げ時 |
| `references/02-status/open-issues.md` | active project の **索引** のみ | live task 表は持たない |
| `references/02-status/technical-debt-roadmap.md` | 判断理由・優先順位・歴史 | live task 表は持たない |
| `references/03-guides/*.md` | 背景・契約・監査結果・原則 | live task 表は持たない |

**鉄則:** live な作業項目（やることリスト）の正本は **`projects/<id>/checklist.md` のみ**。
references/ に live task table を書かない。重複は drift を生む。

## 2. completed / archived の定義

### completed

> project の `checklist.md` に書かれた **required checkbox がすべて `[x]`** になった状態。

判定は AAG / `architecture-health` の collector が動的に導出する。
人間や AI が手動で `status: completed` を書き込むことはしない。collector が
checklist を読んで導出する。

### archived

> completed になり、進行管理対象から外れて `projects/completed/<id>/` に
> 物理的に移動した状態。

archive 手順は §6 を参照。

### in_progress

> project が `projects/<id>/` 配下に存在し、かつ `checklist.md` に open
> required checkbox が 1 つ以上ある状態。

## 3. checklist.md に書いてよいもの・書いてはいけないもの

### 書いてよい (= completion の入力になる)

- **required checkbox**: project が completed になるための達成条件
- 各 checkbox は単一の機械的に検証可能な達成条件を表す
- Phase / セクションで階層化してよい

### 書いてはいけない (= 別の場所に置く)

| 書きたいもの | どこに書くか |
|---|---|
| やってはいけないこと | `plan.md` の「不可侵原則」セクション |
| 常時チェック (lint / build / format) | `plan.md` または CONTRIBUTING.md |
| 恒久的な運用ルール | 該当する `references/03-guides/*.md` |
| AAG が継続監視する invariants | guard test として実装（`plan.md` から参照） |
| 将来 Phase の未着手構想 | `plan.md` の Phase 定義 |
| optional な「やったほうがよい」項目 | `plan.md` の Notes |

これらを checklist に混ぜると completion 判定がぶれるため、一切持ち込まない。

**機械検証**: 本規約は 2 つのガードで機械的に強制される:

1. `checklistFormatGuard` (F3/F4/F5) — 禁止見出し配下に checkbox が存在する行レベル違反を検出。全 project で strict (EXEMPT なし)。
2. `checklistGovernanceSymmetryGuard` (S1/S2/S3) — 禁止見出しそのものが存在すること自体を検出。規約と collector の対称性を保つ最終防波堤。

collector (`project-checklist-collector.ts::countCheckboxes`) は heading 抑制ロジックを持たない。「format guard が通る範囲 = collector が集計する範囲」という対称性が保証されている (2026-04-13, project: aag-collector-purification)。

### 書き方の規格

```markdown
## Phase X: <Phase 名>

* [x] <達成条件 1>
* [x] <達成条件 2>
* [ ] <達成条件 3>
```

### 3.1. 必須構造: 最終レビュー (人間承認) section

> **全 checklist は、最後の section として「最終レビュー (人間承認)」を持つこと。**

役割:

- 機能的な Phase がすべて `[x]` になっても、最終レビュー section の checkbox が
  `[ ]` のままなら project は `in_progress` 状態を維持する
- これにより `derivedStatus = completed` への遷移を **構造的に人間レビュー
  ゲートに通せる**
- archive obligation (`completedNotArchivedCount > 0`) の暴発を防ぐ
- 機能完了 (= 作業 AI / pre-push の成果) と archive 承認 (= 人間判断) を
  checkbox レベルで分離する

```markdown
## 最終レビュー (人間承認)

> このセクションは **必ず最後** に置き、人間レビュー前は [ ] のままにする。

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を
      人間がレビューし、archive プロセスへの移行を承認する
```

承認の意味:

- 全 Phase の成果物 (commit history / PR / 関連正本 / generated artifact) を
  人間が読み、品質基準を満たしていることを確認した
- 必要なら observation period (実運用観測期間) を経た上での承認
- 承認後は §6.2 の archive プロセスを実行する

判定の流れ:

```
作業 AI: 全機能 Phase を [x] にする
   ↓
作業 AI: 最終レビュー section だけ [ ] のままで一旦終了
   ↓
project は in_progress (33/34 等) で留まる
   ↓
人間: PR をレビュー、必要なら observation period
   ↓
人間: 最終レビュー checkbox を [x] にする (= archive 承認)
   ↓
project は completed → §6.2 archive プロセス実行
```

template (`projects/_template/checklist.md`) は本構造を持つ。新規 project は
template から複製して開始するため、自動的に最終レビュー section を持つ。
既存 project は次の archive 機会で本構造に揃える。

- checkbox の先頭は `* [x]` または `* [ ]`（半角スペース）
- ネスト不可（フラットなフラグメントで機械検出を単純に保つ）
- 各 checkbox は 1 文 1 達成条件
- Phase 跨ぎでも全 checkbox は完了対象に算入される

## 4. project ディレクトリ構造

```
projects/<id>/
├── AI_CONTEXT.md       # AI の入口（project の意味 / read order）
├── HANDOFF.md          # 起点文書（完了済み + 次にやること）
├── plan.md             # 計画の正本（原則 + Phase 定義）
├── checklist.md        # completion 判定の入力（唯一の live task 正本）
├── config/
│   └── project.json    # AAG collector 用の構造化メタ
└── aag/                # （任意）project 固有の execution overlay
    └── execution-overlay.ts
```

`config/project.json` のスキーマ:

```json
{
  "projectId": "<id>",
  "title": "<人間可読タイトル>",
  "status": "active",
  "projectRoot": "projects/<id>",
  "entrypoints": {
    "aiContext": "projects/<id>/AI_CONTEXT.md",
    "handoff": "projects/<id>/HANDOFF.md",
    "plan": "projects/<id>/plan.md",
    "checklist": "projects/<id>/checklist.md"
  }
}
```

`status` は人間が宣言する値（`active` / `paused` / `archived`）であり、
**completion の判定には使わない**。実 status は collector が checklist から導出する。

## 4.1. 4 doc の役割分離 — なぜ分けるか、何を書くか

4 文書（AI_CONTEXT / HANDOFF / plan / checklist）は **変更頻度** と
**読み手** で責務を分ける。各文書は**自分の責務範囲の content のみ**を持ち、
他文書の責務範囲を侵さない。これにより drift（同じ content が複数文書に
存在し片方だけ更新される現象）を構造的に防ぐ。

### 役割マトリクス

| 文書 | 責務 | 変更頻度 | 主な読み手 | 書いてよい | 書いてはいけない |
|---|---|---|---|---|---|
| **AI_CONTEXT.md** | project **意味空間の入口**。「この project は何のためにあるか」 | 数週間〜数ヶ月に 1 回（scope / purpose / 制約の変更時のみ） | 初見の AI（1 回だけ読む） | Purpose, Scope, Read Order, Required References, Project-Specific Constraints | **volatile content**（Current Status / Next Actions / Completed / Phase 進捗 / ハマりポイント） |
| **HANDOFF.md** | **現在状態の snapshot**。「今どこにいるか / 次に何をするか / どうハマらないか」 | 作業セッションごと（checkbox 進行ごと） | 再開する作業 AI（毎回読む） | 現在地, 完了 Phase, 次にやること, ハマりポイント, 読書順 | 原則の再定義（plan.md 責務）/ live task（checklist.md 責務） |
| **plan.md** | 原則と構造の正本 | 計画変更時のみ | 設計判断時の AI / 人間 | 不可侵原則, Phase 定義, やってはいけないこと, 関連実装 | 現在値, 達成条件（checkbox） |
| **checklist.md** | **completion の唯一の入力** | 作業完了ごと | 作業進行中 AI | required checkbox（達成条件） | 原則, 常時チェック, 最重要項目（§3 参照） |

### 役割 banner の必須化

AI_CONTEXT.md と HANDOFF.md の先頭には **役割 banner** を置く:

```markdown
# <文書 title>

> 役割: <この文書が何のためにあるか 1 文>
```

banner は読み手が「この文書を開けばよいか」を即判断するためのラベル。
`projectDocStructureGuard.test.ts` の **D2 / D3** が機械検証する。

### AI_CONTEXT.md に volatile content を書けない

AI_CONTEXT.md の responsibility は「project の **意味**」であり、変更頻度は
scope 変更時に限られる。もし「Current Status」「Next Actions」のような
session ごとに変わる content を書くと:

- HANDOFF.md と重複する → 片方だけ更新されて drift する
- git blame が「意味の変更」と「状態の変更」で混ざる → 何を変えたかが読めない
- 初見 AI が「この project の意味」を知りたいだけなのに、volatile content の
  ノイズを読まされる
- AI_CONTEXT.md が肥大化し、役割が曖昧になる

そのため `projectDocStructureGuard.test.ts` の **D4** が以下を禁止する:

```
AI_CONTEXT.md に以下の見出しがあれば FAIL:
  ## Current Status / ## 現在地 / ## 現在状況
  ## Immediate Next Actions / ## Next Actions / ## 次にやること
  ## Phase 進捗
  ## 完了済み / ## Completed
  ## ハマりポイント / ## Hamari points
```

これらは **HANDOFF.md に書く**。AI_CONTEXT.md からは削除し、HANDOFF.md に
統合する（情報が重複しているなら削除、HANDOFF.md に無い情報なら移動）。

### 機械検証の入口

| 検証 | guard | 違反 code |
|---|---|---|
| 4 doc + config が揃っている | `projectDocStructureGuard.test.ts` | D1 |
| AI_CONTEXT.md / HANDOFF.md に役割 banner がある | 同上 | D2 / D3 |
| AI_CONTEXT.md に volatile content がない | 同上 | D4 |
| checklist.md の format（§3 書き方の規格） | `checklistFormatGuard.test.ts` | F1-F5 |
| completion / archive / cross-reference 整合 | `projectCompletionConsistencyGuard.test.ts` | C1-C4 / L1-L3 |

## 5. CURRENT_PROJECT.md と active project

repo ルートの `CURRENT_PROJECT.md` は AI のセッション開始時に「いま主戦場の
project はどれか」を伝える 1 行ファイル。複数 active project がある場合でも
ここに書かれた 1 つを「主」とする。

```
active: <id>

entry: `projects/<id>/AI_CONTEXT.md`
```

完了 consistency guard が以下を機械検証する:

- `CURRENT_PROJECT.md` の `active` が実在する `projects/<id>` を指している
- 指された project の `config/project.json` が存在し読める
- `active` 指定の project が `projects/completed/` 配下にない

## 6. project ライフサイクル — 立ち上げからクローズまで

```
                    ┌─────────────────────────────────────────────┐
                    │                                             │
  bootstrap         │                                             │
  (§10 / template)  │  in_progress  ← collector が動的に判定     │
        │           │                                             │
        ▼           │                                             │
  empty (placeholder) ──────► in_progress ──────► completed ─────┼──► 要 archive
                    │                                             │     │
                    │                                             │     ▼
                    │                                             │   archived
                    └─────────────────────────────────────────────┘   (projects/completed/)
                                                                        + 正本更新
```

### 6.1. derivedStatus 遷移

| derivedStatus | 条件 | 次のアクション |
|---|---|---|
| `empty` | checkbox が 1 つもない | placeholder 状態。立ち上げ直後 / 一時保留 |
| `in_progress` | open required checkbox が 1 つ以上 | checklist を進める |
| `completed` | 全 required checkbox が `[x]`、まだ projects/<id>/ にある | **archive プロセスへ進む（§6.2）** |
| `archived` | projects/completed/<id>/ 配下に物理配置済み | 終了。履歴として残置 |

### 6.2. archive プロセス（completed → archived）

> archive は **collector が completed と判定した後** に手動で行う。
> consistency guard が completed のまま active 配置されている project を機械検出し、
> archive プロセスへ進むよう error message で促す。
>
> **前提**: §3.1 の「最終レビュー (人間承認)」 checkbox が `[x]` であること。
> 人間がこの checkbox を tick することが archive プロセスの開始条件である。

#### 必須ステップ

1. `references/02-status/generated/project-health.md` で
   `derivedStatus = completed` を確認
2. 対象 project ディレクトリを `projects/<id>/` から `projects/completed/<id>/` に移動
3. `projects/completed/<id>/config/project.json` の `status` を `archived` に書き換え
4. `CURRENT_PROJECT.md` の `active` が当該 project を指していないことを確認
   （指していたら別 project に切替）
5. `references/02-status/open-issues.md` の active project index から外し、
   「解決済みの課題」テーブルに 1 行追加する
6. completed project の HANDOFF.md 末尾に `Archived: YYYY-MM-DD` 行を追加
7. `cd app && npm run docs:generate` を実行（project-health に反映）
8. commit する

#### 関連正本の更新（archive と同じ commit で実施）

archive される project が依存していた references/ 文書は、project が終了したことに
伴って状態が変わる。以下を確認して更新する:

| project の種類 | 更新が必要な正本 |
|---|---|
| 計画系 plan を持つ project | 関連 `references/03-guides/<plan-name>.md` を「歴史的計画書」マークに更新（既に live task が剥がされていれば追加変更不要） |
| 設計判断を確定した project | 関連 `references/01-principles/<principle>.md` に決定内容を追記 |
| 新機能を追加した project | `references/01-principles/` の機能定義書を最新状態に同期 |
| 共通インフラを変更した project | `CLAUDE.md` の関連セクションを更新 |
| バージョン bump を含む project | `app/package.json` / `docs/contracts/project-metadata.json` / `CHANGELOG.md` |

> **正本更新の漏れは Phase 9 consistency guard では検出されない**（範囲外）。
> 代わりに、archive commit のレビュー時に必ず「関連正本を更新したか」を確認する。
> 漏れた場合は別 commit で fix する。

### 6.3. 立ち上げからクローズまでの一例

| ステップ | 行為者 | 検証 |
|---|---|---|
| 1. 新課題発生 | 人間 / AI | scope が既存 project に該当しないことを §0 に照らして判断 |
| 2. project 立ち上げ | AI | §10 の bootstrap 手順に従って `projects/<id>/` を作成 |
| 3. checklist 充填 | AI / 人間 | verified LIVE な未着手項目だけを `* [ ]` で書く |
| 4. AAG 反映 | docs:generate | collector が project を `in_progress` として認識 |
| 5. 作業進行 | AI | checklist を `[x]` に更新しながら作業 |
| 6. 完了判定 | collector | 全 checkbox が `[x]` になると `derivedStatus = completed` |
| 7. 警告発火 | consistency guard | 「completed なのに active 配置」を error として検出 |
| 8. archive 実行 | 人間 | §6.2 の必須ステップを 1 commit で実施 |
| 9. 正本更新 | 人間 | §6.2 の関連正本更新を同 commit で実施 |
| 10. 最終確認 | docs:generate | project が `archived` として project-health に表示される |

## 7. やってはいけないこと

- checklist に「常時チェック」「やってはいけないこと」項を混ぜる（completion がぶれる）
- references/ に live task table を再導入する（drift の温床）
- `config/project.json` の `status` を `completed` に手動で書き込む（collector 判定に従う）
- collector の derivedStatus を無視して archive する
- archive 済み project を `CURRENT_PROJECT.md` の active に指定したまま放置する
- **異質の動線・コンテキストを持った課題を 1 project に混ぜる**（例: pure 計算
  責務再編と データロード冪等化を同じ checklist に書く）。1 project = 1 一貫した
  task scope。スコープが分岐したら project を分ける

## 8. 関連実装

| ファイル | 役割 |
|---|---|
| `tools/architecture-health/src/collectors/project-checklist-collector.ts` | checklist から derivedStatus を導出 |
| `tools/architecture-health/src/renderers/project-health-renderer.ts` | project KPI を JSON / MD に展開 |
| `app/src/test/guards/checklistFormatGuard.test.ts` | checklist.md の規格適合を検証 (F1-F5) |
| `app/src/test/guards/checklistGovernanceSymmetryGuard.test.ts` | 規約と collector 実装の対称性を検証 (S1/S2/S3)。2026-04-13 追加 |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | derivedStatus と物理配置の整合検証 |
| `references/02-status/generated/project-health.json` | 生成された project KPI 正本 |
| `references/02-status/generated/project-health.md` | 同 view（人間可読） |
| `projects/_template/` | 新規 project 立ち上げのテンプレート（§10 参照） |

## 9. live project と判断

### live (active) project（2026-04-12 時点）

| projectId | scope | 入口 |
|---|---|---|
| `presentation-quality-hardening` | active-debt + 500 行超 + coverage + E2E | [`projects/presentation-quality-hardening/AI_CONTEXT.md`](../../projects/presentation-quality-hardening/AI_CONTEXT.md) |
| `pure-calculation-reorg` | Pure 計算責務再編（Phase 8〜） | [`projects/pure-calculation-reorg/AI_CONTEXT.md`](../../projects/pure-calculation-reorg/AI_CONTEXT.md) |
| `quick-fixes` | 単発 fix collection (continuous) | [`projects/quick-fixes/AI_CONTEXT.md`](../../projects/quick-fixes/AI_CONTEXT.md) |
| `data-load-idempotency-hardening` (archived) | idempotent load contract 残存防御 (2026-04-12 archive, Phase F Option A 確定) | [`projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md`](../../projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md) |
| `docs-and-governance-cohesion` (archived) | live task 集約 + AAG 統合 (2026-04-12 archive) | [`projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md`](../../projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md) |
| `aag-collector-purification` (archived) | collector heading 抑制削除 + 規約/実装の対称性回復 (2026-04-13 archive) | [`projects/completed/aag-collector-purification/AI_CONTEXT.md`](../../projects/completed/aag-collector-purification/AI_CONTEXT.md) |
| `aag-rule-splitting-execution` (archived) | AR-STRUCT-RESP-SEPARATION を 7 AR-RESP-* ルールに分割 (2026-04-13 archive) | [`projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md`](../../projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md) |
| `architecture-decision-backlog` (archived) | R-9 (c) 現状維持を決定 (2026-04-13 archive) | [`projects/completed/architecture-decision-backlog/AI_CONTEXT.md`](../../projects/completed/architecture-decision-backlog/AI_CONTEXT.md) |

実時の値は [`references/02-status/generated/project-health.md`](../02-status/generated/project-health.md) を正本とする。

## 10. 新規 project bootstrap 手順（AI 向け）

> **小さな fix の場合（数時間以内）:**
> bootstrap は不要。`projects/quick-fixes/checklist.md` に
> `* [ ] (優先度) <スコープ>: <一文の説明>` を 1 行追加するだけ。
> 詳細は §11.2 を参照。
>
> **大きな project の場合（複数 phase / 文脈の引き継ぎが必要）:**
> 以下の手順を順番に実行する。ステップごとに「次に何をすればよいか」が決まっており、
> template と format guard が形式不備を機械的に検出するため、ガイドだけでも
> 完成形に到達できる。

### Step 1: scope を決める

新しい課題が、既存 6 project のどれにも該当しないことを確認する。
判断に迷ったら本ガイド §0 の基本思想（1 project = 1 一貫した task scope、
異質の動線・コンテキストを混ぜない）に立ち戻る。

### Step 2: project ID を決める

`<domain>-<action>` 形式で、kebab-case で 3〜5 語以内。
既存 project と被らないこと。例: `purchase-cost-canonicalization`。

### Step 3: テンプレートをコピーする

```bash
cp -r projects/_template projects/<新 project id>
```

### Step 4: プレースホルダを置換する

`<PROJECT-ID>` / `<TITLE>` / `<...>` を実値で置換する。
具体的には:

| ファイル | 置換対象 |
|---|---|
| `config/project.json` | `<PROJECT-ID>` / `<TITLE>` |
| `AI_CONTEXT.md` | `<PROJECT-ID>` / `<TITLE>` / `<Purpose>` / `<Scope>` |
| `HANDOFF.md` | `<PROJECT-ID>` / `<現在地>` / `<次にやること>` / `<ハマりポイント>` |
| `plan.md` | `<PROJECT-ID>` / `<不可侵原則>` / `<Phase 構造>` |
| `checklist.md` | `<PROJECT-ID>` / `<Phase>` / `<達成条件>` |

### Step 5: テンプレート使用説明コメントを削除する

各ファイルの冒頭にある `> **テンプレートの使い方:**` ブロックを削除する。

### Step 6: checklist に最初の達成条件を入れる

verified LIVE な未着手項目だけを `* [ ]` で書く。
**DONE / STALE / 想像上の項目は入れない**（§3 参照）。

### Step 7: docs:generate で project-health に登録する

```bash
cd app && npm run docs:generate
```

`references/02-status/generated/project-health.md` に新 project が
`derivedStatus = in_progress` で現れることを確認する。

### Step 8: 関連文書を README / doc-registry に登録する（必要時）

新 project の AI_CONTEXT.md は references/ ではなく projects/ 配下なので、
doc-registry.json への登録は不要。ただし AI_CONTEXT 内で参照する新規
references/ ドキュメントを作った場合は doc-registry.json と README.md にも
追加する（既存の obligation rule で機械検出される）。

### Step 9: open-issues.md の active project 索引に追加する

`references/02-status/open-issues.md` の `## active projects` テーブルに
新 project の行を追加する。

### Step 10: format guard / consistency guard が PASS することを確認する

```bash
cd app && npm run test:guards
```

`checklistFormatGuard` と `projectCompletionConsistencyGuard` が
新 project に対して PASS することを確認する。エラーが出たら誘導される修正手順に
従って対応する。

### 参考: 既存 6 project はこの手順で立ち上げられた

`projects/completed/data-load-idempotency-hardening` / `presentation-quality-hardening` /
`projects/completed/docs-and-governance-cohesion` / `architecture-decision-backlog` /
`aag-rule-splitting-execution` の 5 件は本手順に準拠して 2026-04-12 に立ち上げ済み。
それぞれの AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md / config/project.json
が完全形のリファレンスになる。

## 11. 大きな project と小さな fix の使い分け

> **大きな project と小さな fix を 1 つの仕組みに混ぜると、両方が機能不全になる。**
> 大きな project は重い ceremony を要求し、小さな fix は軽さを要求する。
> 本仕組みは「kind」フィールドで両方を分けて扱う。

### 11.1. 判断基準

| 軸 | 大きな project (`kind: project`) | 小さな fix (`kind: collection`) |
|---|---|---|
| 文脈の必要性 | 複数 phase / 不可侵原則 / ハマりポイントを引き継ぐ必要がある | 単発で完結し、後任者に context を引き継ぐ必要がない |
| 作業期間 | 数日〜数週間 | 数分〜数時間 |
| 完了概念 | ある（全 checkbox が完了したら archive） | ない（continuous collection、archive しない） |
| ファイル | AI_CONTEXT.md + HANDOFF.md + plan.md + checklist.md + config/project.json | 同上だが checklist.md だけが運用上重要 |
| 例 | データロード冪等化、Pure 計算責務再編、AAG ルール分割実装 | typo 修正、未使用 export 削除、ファイル分割、依存パッケージ bump |

判断に迷ったら次の質問に答える:

1. これは複数 phase に分かれるか？ → Yes なら大きな project
2. 関連 checkbox が 5 個以上あるか？ → Yes なら大きな project
3. ハマりポイントを HANDOFF に書く必要があるか？ → Yes なら大きな project
4. 不可侵原則を独自に持つか？ → Yes なら大きな project
5. 数時間以内に終わるか？ → Yes なら小さな fix

### 11.2. 小さな fix の置き場 (`projects/quick-fixes/`)

repo には常に 1 つの `quick-fixes` collection project が存在する。
全ての小さな fix はその checklist に追記する。

```markdown
## 単発 fix

* [ ] (高) app/src/utils/foo.ts: 未使用 export `bar` を削除
* [ ] (中) references/02-status/recent-changes.md: 2026-04 セクションに最新コミットを追記
* [x] (高) app/src/components/X.tsx: typo "calcuate" を "calculate" に修正
```

format: `* [ ] (優先度) <スコープ>: <一文の説明>`

### 11.3. collection の特徴

`projects/quick-fixes/config/project.json` には `kind: "collection"` が設定されている。
これにより:

- collector の `derivedStatus` は `collection` 固定（completed にならない）
- consistency guard の C1 (archive 未実施警告) が発火しない
- 全 checkbox が checked になっても archive プロセスは走らない
- 「終わらない project」として扱われる（continuous）

### 11.4. quick-fixes から大きな project への昇格

> **「fix のつもりだったが、依存関係が複雑で大掛かりになる」と判断した時点で、
> その checkbox は project に昇格させる。**
> 中途半端に quick-fixes に残し続けると quick-fixes 全体が肥大化し、
> 「単発 fix の受け皿」という本来の役割を失う。

#### 昇格シグナル

以下のいずれかを満たしたら昇格を検討する:

- 着手したら **想定より広い範囲のファイルを触る** ことが分かった
- **既存の不変条件 / 契約 / guard との整合性** を取り直す必要が出てきた
- **依存関係が複数モジュールに波及** し、1 commit に収まらない
- 着手中に「ハマりポイントを後任者に伝えたい」と感じた
- 関連する細かい checkbox が複数生まれてきた（5 個以上）

#### 昇格手順

1. §10 の bootstrap 手順で新 project を作る
2. 関連する quick-fixes checkbox を新 project の checklist.md に移管
3. quick-fixes 側の checkbox は削除（重複させない）
4. open-issues.md の active 索引に新 project を追加
5. commit message に「promoted from quick-fixes」と記載

#### 降格手順（逆方向）

独立 project の中で「実は単発 fix だった」と判断したものは quick-fixes に
降格させてもよい:

1. quick-fixes の checklist に移管
2. 元の project の checklist から削除
3. 元の project が空になったら archive を検討（§6.2）

判断は §11.1 に立ち戻る。**昇格・降格の判断は何度繰り返してもよい** —
仕組みは可逆的に作られている。

## 12. AAG 管理下の同期ペア（version triplet 等）

> **AAG Core の役割は機能を定義し、契約を行い、より使いやすい骨格を提供することにある。**
> 同期ペア管理はその一例である。

### 12.1. なぜ Core 化するか

リポジトリには「同じ値が複数の文書に重複して存在する」箇所がある。
代表例: app version triplet（`app/package.json` の `version` / `docs/contracts/project-metadata.json` の
`appVersion` / `CHANGELOG.md` の最新 `[v...]` / `references/02-status/recent-changes.md` の
最新 `## v...` 見出し）。

これらは drift しやすく、過去にも 1.7.0 と 1.8.0 が混在する状態が指摘されている。
個別 test に hard-code すると、新しい同期ペアを追加するたびに test ファイルを
触る必要があり、機構が分散する。

そこで AAG Core では **「宣言的な同期ペア registry + generic な検査 guard」**
という骨格を提供する。新しいペアを追加するときは registry に 1 entry 足すだけで、
guard は触らずに自動検査される。

### 12.2. レイヤー対応

| AAG レイヤー | 配置 | 役割 |
|---|---|---|
| Layer 2 Schema | `app/src/test/versionSyncRegistry.ts` | 同期ペアの **宣言**（`VersionSyncPair` 型 + `VERSION_SYNC_REGISTRY`） |
| Layer 3 Execution | `app/src/test/guards/versionSyncGuard.test.ts` | registry を loop して **検査**（V1: ファイル存在 / V2: 値抽出 / V3: 値一致） |
| Layer 4A System Operations | 本セクション §12 | **運用ルール**（追加方法 / 命名規則） |

これは AAG の 4 層モデル（`references/01-principles/aag-5-constitution.md`）に
完全に準拠した設計であり、本仕組み自体が AAG の管理下にある。

### 12.3. 新しい同期ペアの追加（運用手順）

1. `app/src/test/versionSyncRegistry.ts` の `VERSION_SYNC_REGISTRY` に 1 entry 追加する
   - `id`: 人間可読な識別子
   - `description`: 何の値を同期しているか
   - `source`: `{ file, extract, label }` — 比較元
   - `target`: `{ file, extract, label }` — 比較先（通常は `PROJECT_METADATA_TARGET` を使う）
2. guard ファイル（`versionSyncGuard.test.ts`）は **触らない**
3. `cd app && npm run test:guards` で V1-V3 の 3 検査が新ペアに対して自動実行される
4. drift があれば V3 が fail し、error message に source / target の値と修正方針が表示される

### 12.4. やってはいけないこと

- registry を経由せずに `documentConsistency.test.ts` 等に hard-code する → 機構が分散する
- 新しい version 重複を repo に持ち込むときに registry 登録を後回しにする → drift の温床
- registry の `extract` 関数で副作用（fs アクセス等）を行う → pure function 原則
- 「気をつける」運用ルールに依存する → AAG 管理下に置く意味がなくなる

## 9. このガイド自体の正本

本ガイドが定義する規格を変更する場合は、関連する 4 ガード / collector / generated artifact
すべてを更新する必要がある（co-change）。本ガイドだけを書き換えて済ませない。
