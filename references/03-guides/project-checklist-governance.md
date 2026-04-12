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

### 書き方の規格

```markdown
## Phase X: <Phase 名>

* [x] <達成条件 1>
* [x] <達成条件 2>
* [ ] <達成条件 3>
```

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
| `app/src/test/guards/checklistFormatGuard.test.ts` | checklist.md の規格適合を検証 |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | derivedStatus と物理配置の整合検証 |
| `references/02-status/generated/project-health.json` | 生成された project KPI 正本 |
| `references/02-status/generated/project-health.md` | 同 view（人間可読） |
| `projects/_template/` | 新規 project 立ち上げのテンプレート（§10 参照） |

## 9. live project と判断

### live (active) project（2026-04-12 時点）

| projectId | scope | 入口 |
|---|---|---|
| `data-load-idempotency-hardening` | idempotent load contract 残存防御 | [`projects/data-load-idempotency-hardening/AI_CONTEXT.md`](../../projects/data-load-idempotency-hardening/AI_CONTEXT.md) |
| `presentation-quality-hardening` | active-debt + 500 行超 + coverage + E2E | [`projects/presentation-quality-hardening/AI_CONTEXT.md`](../../projects/presentation-quality-hardening/AI_CONTEXT.md) |
| `docs-and-governance-cohesion` | live task 集約 + AAG 統合 | [`projects/docs-and-governance-cohesion/AI_CONTEXT.md`](../../projects/docs-and-governance-cohesion/AI_CONTEXT.md) |
| `architecture-decision-backlog` | 未決定の設計判断 | [`projects/architecture-decision-backlog/AI_CONTEXT.md`](../../projects/architecture-decision-backlog/AI_CONTEXT.md) |
| `aag-rule-splitting-execution` | AR-STRUCT-RESP-SEPARATION 7 分割 | [`projects/aag-rule-splitting-execution/AI_CONTEXT.md`](../../projects/aag-rule-splitting-execution/AI_CONTEXT.md) |
| `pure-calculation-reorg` | Pure 計算責務再編（Phase 8〜） | [`projects/pure-calculation-reorg/AI_CONTEXT.md`](../../projects/pure-calculation-reorg/AI_CONTEXT.md) |

実時の値は [`references/02-status/generated/project-health.md`](../02-status/generated/project-health.md) を正本とする。

## 10. 新規 project bootstrap 手順（AI 向け）

> **文脈を持たない AI が新規 project を立ち上げるときは、以下の手順を順番に実行する。**
> ステップごとに「次に何をすればよいか」が決まっており、template と format guard が
> 形式不備を機械的に検出するため、ガイドだけでも完成形に到達できる。

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

`projects/data-load-idempotency-hardening` / `presentation-quality-hardening` /
`docs-and-governance-cohesion` / `architecture-decision-backlog` /
`aag-rule-splitting-execution` の 5 件は本手順に準拠して 2026-04-12 に立ち上げ済み。
それぞれの AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md / config/project.json
が完全形のリファレンスになる。

## 9. このガイド自体の正本

本ガイドが定義する規格を変更する場合は、関連する 4 ガード / collector / generated artifact
すべてを更新する必要がある（co-change）。本ガイドだけを書き換えて済ませない。
