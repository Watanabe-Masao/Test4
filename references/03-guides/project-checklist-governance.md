# projects/ 運用ルール — checklist 駆動の completion 管理

> **役割:** 残存課題管理と project ライフサイクルの正本ガイド。
> このガイドは「live な作業項目の正本がどこにあるか」「何をもって project が
> 完了したと見なすか」「completed になった project はどう archive するか」を定義する。
> 新しい project を立てる人 / project を完了させる人 / AAG collector を書く人が
> 最初に読む。

## 0. 基本思想

> **ドキュメントはその機能を説明するためにある。そこに課題が紛れるとノイズになる。**

この一文がすべてを決める。本ガイドの規約はこの一文の機械的強制装置であり、
それ以上でもそれ以下でもない。

| 種別 | 居場所 | 何が書かれるか |
|---|---|---|
| **ドキュメント** | `references/` / `CLAUDE.md` / `roles/` / `app-domain/` 等 | 機能・契約・原則・背景・歴史。**live task は一切書かない** |
| **課題** | `projects/<id>/checklist.md` | 未着手 / 着手中の作業項目だけ。**機能説明は一切書かない** |

両者を混ぜると次が起きる:
- ドキュメントを読みに来た人がノイズに目を逸らされる
- 課題が複数箇所に散らばって drift する
- 完了した課題が docs に残り続けて信頼性を毀損する
- 新しい課題をどこに書けばいいかわからなくなる

本ガイドは上記 4 つの問題を構造的に発生させない仕組みを定義する。

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

## 6. archive 手順

> archive は **collector が completed と判定した後** に手動で行う。

1. `architecture-health` の `project-health.json` で `derivedStatus = completed` を確認
2. 対象 project ディレクトリを `projects/<id>/` から `projects/completed/<id>/` に移動
3. `config/project.json` の `status` を `archived` に書き換え
4. `CURRENT_PROJECT.md` の `active` が当該 project を指していないことを確認
5. `references/02-status/open-issues.md` の active project index から外す
6. completed project の HANDOFF.md 末尾に「Archived: YYYY-MM-DD」行を追加
7. commit する

## 7. やってはいけないこと

- checklist に「常時チェック」「やってはいけないこと」項を混ぜる（completion がぶれる）
- references/ に live task table を再導入する（drift の温床）
- `config/project.json` の `status` を `completed` に手動で書き込む（collector 判定に従う）
- collector の derivedStatus を無視して archive する
- archive 済み project を `CURRENT_PROJECT.md` の active に指定したまま放置する

## 8. 関連実装

| ファイル | 役割 |
|---|---|
| `tools/architecture-health/src/collectors/project-checklist-collector.ts` | checklist から derivedStatus を導出 |
| `app/src/test/guards/checklistFormatGuard.test.ts` | checklist.md の規格適合を検証 |
| `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | derivedStatus と物理配置の整合検証 |
| `references/02-status/generated/project-health.json` | 生成された project KPI 正本 |
| `references/02-status/generated/project-health.md` | 同 view（人間可読） |

## 9. このガイド自体の正本

本ガイドが定義する規格を変更する場合は、関連する 4 ガード / collector / generated artifact
すべてを更新する必要がある（co-change）。本ガイドだけを書き換えて済ませない。
