# projects/ 運用ルール — checklist 駆動の completion 管理

> **位置付け (= aag-self-hosting-completion R2 で update)**: 本 doc は `references/05-aag-interface/operations/` 配下 (= 主アプリ改修 userが reach する AAG public interface)。AAG framework 内部 (= `aag/_internal/`) を読まずに本 doc で reach 可能。

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
> 詳細: `references/99-archive/aag-5-constitution.md` §Layer 4A。
>
> 関連する AAG 実装:
>
> | コンポーネント | 配置 | レイヤー |
> |---|---|---|
> | 規約（本書） | `references/05-aag-interface/operations/project-checklist-governance.md` | 4A System Operations |
> | 入口判定（AAG-COA） | `references/05-aag-interface/operations/projectization-policy.md` | 4A System Operations |
> | collector | `tools/architecture-health/src/collectors/project-checklist-collector.ts` | 3 Execution |
> | format guard | `app/src/test/guards/checklistFormatGuard.test.ts` | 3 Execution |
> | consistency guard | `app/src/test/guards/projectCompletionConsistencyGuard.test.ts` | 3 Execution |
> | generated KPI | `references/04-tracking/generated/project-health.json` / `.md` | 3 Execution（派生物） |
> | live project | `projects/active/<id>/` | 4B Project Operations |

## 0. 基本思想

> **ドキュメントはその機能を説明するためにある。そこに課題が紛れるとノイズになる。**

この一文がすべてを決める。本ガイドの規約はこの一文の機械的強制装置であり、
それ以上でもそれ以下でもない。

| 種別 | 居場所 | 何が書かれるか |
|---|---|---|
| **ドキュメント** | `references/` / `CLAUDE.md` / `roles/` / `app-domain/` 等 | 機能・契約・原則・背景・歴史。**live task は一切書かない** |
| **課題** | `projects/active/<id>/checklist.md` | 未着手 / 着手中の作業項目だけ。**機能説明は一切書かない** |

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

### 入口判定との関係（AAG-COA）

本ガイドは project が**立ち上がった後**の completion 管理を扱う。
project を**立ち上げる前**の「そもそもこの作業は project 化すべきか、どの重さで
立ち上げるか」は姉妹ガイド `references/05-aag-interface/operations/projectization-policy.md`
（AAG-COA — Change Operation Assessment）が扱う。

| 概念 | 担当 | 対象タイミング |
|---|---|---|
| **AAG-COA**（入口判定） | どの重さの project にすべきか | 立ち上げ**前** |
| **本書**（completion 管理） | project をどう完了・archive するか | 立ち上げ**後** |

AAG-COA が決めた `projectizationLevel` に応じて、本書が定める checklist の
重さ（Phase 構造の有無、最終レビュー checkbox の必須化、等）が変わる。
詳細は `projectization-policy.md` §4 の早見表を参照。

### この分離が支える運用シナリオ

複数の課題を異なる文脈で **並行進行** したり、途中で切り上げて **他の課題に
切り替え** たりする際に、適切な文脈を切り分けて保持することで「いま何を
やっているのか」が常に明確になる。各 project は:

- **独立した AI_CONTEXT.md** で文脈の入口を持つ
- **独立した checklist.md** で進行状態を持つ
- **独立した HANDOFF.md** で再開時の続きが分かる
- **collector が動的に completion 判定** するため、user が「終わったか？」を毎回手で
  判定しなくて済む

これにより、AI セッションが project A → project B → project A と切り替わっても、
文脈が混線しない。これが本仕組みの中心目的であり、ドキュメントと課題の分離は
そのための必要条件である。

## 1. 目的

repo の残存課題を以下の体制に統一する。

| 対象 | 何が書かれるか | 更新主体 |
|---|---|---|
| `projects/active/<id>/checklist.md` | live な残存課題（completion 判定の唯一の入力） | 作業者 |
| `projects/active/<id>/plan.md` | 構造・原則・Phase 定義 | 計画変更時のみ |
| `projects/active/<id>/HANDOFF.md` | 後任者の入口（完了済みの全景 + 次にやること） | コード truth 変更後 |
| `projects/active/<id>/AI_CONTEXT.md` | AI が最初に読む文脈（project の意味 + read order） | プロジェクト立ち上げ時 |
| `references/04-tracking/open-issues.md` | active project の **索引** のみ | live task 表は持たない |
| `references/04-tracking/technical-debt-roadmap.md` | 判断理由・優先順位・歴史 | live task 表は持たない |
| `references/03-implementation/*.md` | 背景・契約・監査結果・原則 | live task 表は持たない |

**鉄則:** live な作業項目（やることリスト）の正本は **`projects/active/<id>/checklist.md` のみ**。
references/ に live task table を書かない。重複は drift を生む。

## 2. completed / archived の定義

### completed

> project の `checklist.md` に書かれた **required checkbox がすべて `[x]`** になった状態。

判定は AAG / `architecture-health` の collector が動的に導出する。
user や AI が手動で `status: completed` を書き込むことはしない。collector が
checklist を読んで導出する。

### archived

> completed になり、進行管理対象から外れて `projects/completed/<id>/` に
> 物理的に移動した状態。

archive 手順は §6 を参照。

### in_progress

> project が `projects/active/<id>/` 配下に存在し、かつ `checklist.md` に open
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
| 恒久的な運用ルール | 該当する `references/03-implementation/*.md` |
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

### 3.1. 必須構造: AI 自己レビュー + 最終レビュー (user 承認) の 2 段 gate

> **全 checklist は、最後の 2 section として `## AI 自己レビュー (= user 承認の手前)` →
> `## 最終レビュー (user 承認)` の順で持つこと。**

役割 (= 2 段 gate):

- 機能的な Phase がすべて `[x]` になっても、AI 自己レビュー section に `[ ]` が残れば user 承認に進めない (= 1 段目 gate)
- AI 自己レビューが `[x]` になっても 最終レビュー section が `[ ]` なら project は `in_progress` を維持 (= 2 段目 gate)
- これにより `derivedStatus = completed` への遷移を **AI 自己 review → user レビュー** の 2 段で構造的に articulate
- archive obligation (`completedNotArchivedCount > 0`) の暴発を防ぐ
- 機能完了 (= 作業 AI 進行中) / 自己 review (= AI 完了前 self-check) / 承認 (= user 判断) を checkbox レベルで articulate

```markdown
## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。
> 機械検証: projectizationPolicyGuard PZ-13 (= section 存在 + ordering 検証、checkbox 内容は AI session 責任)。

* [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
* [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
* [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
* [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
* [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。

* [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を
      user がレビューし、archive プロセスへの移行を承認する
```

承認の意味:

- 全 Phase の成果物 (commit history / PR / 関連正本 / generated artifact) を
  user が読み、品質基準を満たしていることを確認した
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
user: PR をレビュー、必要なら observation period
   ↓
user: 最終レビュー checkbox を [x] にする (= archive 承認)
   ↓
project は completed → §6.2 archive プロセス実行
```

template (`projects/_template/checklist.md`) は本構造を持つ。新規 project は
template から複製して開始するため、自動的に最終レビュー section を持つ。
既存 project は次の archive 機会で本構造に揃える。

- checkbox の先頭は `- [x]` または `- [ ]`（半角スペース）。Prettier 標準形式に従う
- bullet style (`*` / `-`) は **Prettier に委譲**（責務分離 — guard は構造、Prettier は表面）
  - guard は `[*-]` 両方を accept（`checklistFormatGuard` F2 / `projectizationPolicyGuard` PZ-10 / PZ-13）
  - Prettier は `-` に正規化（ecosystem 標準）
  - 既存 `* [x]` は merge 時 / Prettier 実行時に自動的に `- [x]` に変換される
- ネスト不可（フラットなフラグメントで機械検出を単純に保つ）
- 各 checkbox は 1 文 1 達成条件
- Phase 跨ぎでも全 checkbox は完了対象に算入される

### 3.2. AI 自己レビュー section の意味と運用 (= DA-β-002 で institute)

**目的**: AI が user 承認の入力を整える self-review checkpoint。機能的 Phase 完了 → user 承認の間に **AI による品質再点検** を mechanism として institute する。

**5 軸 articulate (= user articulation 反映)**:

| 軸 | 検証内容 | 観測点 |
|---|---|---|
| **総チェック** | 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review | scope 内 / 内容妥当 / 不可侵原則違反 0 |
| **歪み検出** | 実装中に発生した scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 の不在確認 | 不可侵原則 1-8 整合 |
| **潜在バグ確認** | edge case / null 取扱 / 型 assertion / race condition / fail-safe paths の点検 | 既存 test PASS + 想定可能な失敗 path articulate |
| **ドキュメント抜け漏れ確認** | 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新確認 | obligation map の全 path 達成 |
| **CHANGELOG.md 更新 + バージョン管理** | 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合 | versionSyncRegistry 検証 PASS |

**機械検証 boundary (= 責務分離)**:

- **PZ-13 が検証**: AI 自己レビュー section の **存在** + 最終レビュー section の **前にある** こと (= structural)
- **PZ-13 が検証しない**: 各 checkbox の内容が妥当か / 実際に AI が確認したか (= AI session 責任、機械検証 scope 外)
- 理由: AAG philosophy「製本されないものを guard 化しない」と整合。内容検証は機械では不可能、AI session の self-discipline + decision-audit articulation で担保。

**運用 flow**:

```
機能的 Phase 全 [x]
  ↓
AI 自己レビュー section に着手 (= AI が自分で 5 checkbox を再点検)
  ↓ (5 checkbox 全 [x] = 1 段目 gate 通過)
user に最終レビュー依頼 (= ここで初めて user に「承認」依頼)
  ↓ (最終レビュー [x] = 2 段目 gate 通過)
archive プロセス起動 (= §6.2)
```

**例外**: `requiresHumanApproval=false` project は本 section 不要 (= PZ-13 trigger 対象外)。

### 3.3. discovery-log.md (= scope 外発見の蓄積 mechanism、DA-β-003 で institute)

**目的**: implementation 中に発見した **scope 外** / **改善必要** / **詳細調査要** 事項を per-project で蓄積する artifact。AAG 4 系統 lens (= ログ / メトリクス / 手順書 / チェックリスト) に直交する **5 系統目: 発見蓄積**。

**役割分担 (= articulation 混同禁止)**:

| doc | 性質 | scope |
|---|---|---|
| `decision-audit.md` | 判断履歴 (= ログ系統) | scope 内で行った意思決定の lineage |
| **`discovery-log.md`** | 発見蓄積 (= 5 系統目) | scope 外で発見した未処理事項の inventory |
| `checklist.md` | 完了条件 (= チェックリスト系統) | 本 project plan 内の達成条件 |
| `plan.md` | 計画 (= 手順書系統) | 本 project の目的 / scope / phase / 不可侵原則 |

**schema (= PZ-14 機械検証 boundary)**:

```markdown
# discovery-log — <PROJECT-ID>

## priority

| priority | 性質 | 解消 timing |
|---|---|---|
| P1 (high) | 本 program 内吸収可能 | 該当 phase で batch 解消 |
| P2 (med) | post-archive 別 program candidate | archive 後、user 判断 |
| P3 (low) | 揮発 / 不要判定可 | 棚卸 phase で削除判定 |

## 発見済 entry

### <YYYY-MM-DD> <P1|P2|P3>: <短い articulate>

- **場所**: <file path / scope>
- **現状**: <観測した state>
- **改善 / 調査内容**: <何をすべきか、何を調べるか>
- **trigger**: <発見契機>
- **解消 timing**: <P1 = 該当 phase / P2 = post-archive / P3 = 棚卸>
- **影響**: <推定 scope>
```

**機械検証 boundary (= 責務分離)**:

- ✅ **PZ-14 が検証**: file 存在 + `## priority` section + `## 発見済 entry` section (= structural)
- ❌ **PZ-14 が検証しない**: entry 内容妥当性 / entry 数 / 各 entry の articulate 品質 (= AI session 責任、self-discipline + decision-audit articulation で担保)

**trigger 対象**: Level 2+ active project (= scope 中規模以上、発見蓄積 value 高い)。Level 1 (Lightweight Project) は scope 限定 + 短期完了想定で discovery 蓄積 mechanism 不要。

**運用 flow**:

```
implementation 中に scope 外発見
  ↓
priority 判定 (P1 / P2 / P3) + entry articulate
  ↓
discovery-log.md に追記 (= 蓄積)
  ↓
各 phase 末 / archive 直前で priority に応じて処理:
  - P1 → 該当 phase で batch 解消
  - P2 → archive 後、別 program candidate (= user 判断)
  - P3 → 棚卸 phase で削除判定
```

**例外**: Level 0 (Task) / Level 1 (Lightweight Project) / `kind: collection` は本 doc 不要 (= PZ-14 trigger 対象外)。

## 4. project ディレクトリ構造

```
projects/active/<id>/
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
  "title": "<user-readableタイトル>",
  "status": "active",
  "projectRoot": "projects/active/<id>",
  "entrypoints": {
    "aiContext": "projects/active/<id>/AI_CONTEXT.md",
    "handoff": "projects/active/<id>/HANDOFF.md",
    "plan": "projects/active/<id>/plan.md",
    "checklist": "projects/active/<id>/checklist.md"
  }
}
```

`status` はuser が宣言する値（`active` / `paused` / `archived`）であり、
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
| **plan.md** | 原則と構造の正本 | 計画変更時のみ | 設計判断時の AI / user | 不可侵原則, Phase 定義, やってはいけないこと, 関連実装 | 現在値, 達成条件（checkbox） |
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

entry: `projects/active/<id>/AI_CONTEXT.md`
```

完了 consistency guard が以下を機械検証する:

- `CURRENT_PROJECT.md` の `active` が実在する `projects/active/<id>` を指している
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
| `completed` | 全 required checkbox が `[x]`、まだ projects/active/<id>/ にある | **archive プロセスへ進む（§6.2）** |
| `archived` | projects/completed/<id>/ 配下に物理配置済み | 終了。履歴として残置 |

### 6.2. archive プロセス（completed → archived）

> archive は **collector が completed と判定した後** に手動で行う。
> consistency guard が completed のまま active 配置されている project を機械検出し、
> archive プロセスへ進むよう error message で促す。
>
> **前提**: §3.1 の「最終レビュー (user 承認)」 checkbox が `[x]` であること。
> user がこの checkbox を tick することが archive プロセスの開始条件である。

#### 必須ステップ

1. `references/04-tracking/generated/project-health.generated.md` で
   `derivedStatus = completed` を確認
2. 対象 project ディレクトリを `projects/active/<id>/` から `projects/completed/<id>/` に移動
3. `projects/completed/<id>/config/project.json` の `status` を `archived` に書き換え
4. `CURRENT_PROJECT.md` の `active` が当該 project を指していないことを確認
   （指していたら別 project に切替）
5. `references/04-tracking/open-issues.md` の active project index から外し、
   「解決済みの課題」テーブルに 1 行追加する
6. completed project の HANDOFF.md 末尾に `Archived: YYYY-MM-DD` 行を追加
7. `cd app && npm run docs:generate` を実行（project-health に反映）
8. commit する

#### 関連正本の更新（archive と同じ commit で実施）

archive される project が依存していた references/ 文書は、project が終了したことに
伴って状態が変わる。以下を確認して更新する:

| project の種類 | 更新が必要な正本 |
|---|---|
| 計画系 plan を持つ project | 関連 `references/03-implementation/<plan-name>.md` を「歴史的計画書」マークに更新（既に live task が剥がされていれば追加変更不要） |
| 設計判断を確定した project | 関連 `references/01-foundation/<principle>.md` に決定内容を追記 |
| 新機能を追加した project | `references/01-foundation/` の機能定義書を最新状態に同期 |
| 共通インフラを変更した project | `CLAUDE.md` の関連セクションを更新 |
| バージョン bump を含む project | `app/package.json` / `docs/contracts/project-metadata.json` / `CHANGELOG.md` |

> **正本更新の漏れは Phase 9 consistency guard では検出されない**（範囲外）。
> 代わりに、archive commit のレビュー時に必ず「関連正本を更新したか」を確認する。
> 漏れた場合は別 commit で fix する。

### 6.3. 立ち上げからクローズまでの一例

| ステップ | 行為者 | 検証 |
|---|---|---|
| 1. 新課題発生 | user / AI | scope が既存 project に該当しないことを §0 に照らして判断 |
| 2. project 立ち上げ | AI | §10 の bootstrap 手順に従って `projects/active/<id>/` を作成 |
| 3. checklist 充填 | AI / user | verified LIVE な未着手項目だけを `* [ ]` で書く |
| 4. AAG 反映 | docs:generate | collector が project を `in_progress` として認識 |
| 5. 作業進行 | AI | checklist を `[x]` に更新しながら作業 |
| 6. 完了判定 | collector | 全 checkbox が `[x]` になると `derivedStatus = completed` |
| 7. 警告発火 | consistency guard | 「completed なのに active 配置」を error として検出 |
| 8. archive 実行 | user | §6.2 の必須ステップを 1 commit で実施 |
| 9. 正本更新 | user | §6.2 の関連正本更新を同 commit で実施 |
| 10. 最終確認 | docs:generate | project が `archived` として project-health に表示される |

### 6.4. Archive v2 — 圧縮形式（optional、completed → archived 後に適用）

> **位置付け**: §6.2 の archive プロセス完了後の **追加 step (= optional)**。compressed 形式で保存することで repo 体積と doc 探索コストを下げる。
>
> **landing**: 2026-05-04 (= Archive v2 PR 2)。schema 正本 = `docs/contracts/project-archive.schema.json`。
>
> **scope**: completed → archived 移行 **後** にのみ適用。active project には適用しない。
>
> **v1 / v2 並存**: 既存 archived project (= ディレクトリ全体維持形式) は **v1 として許容**。本 schema 検証は `archive.manifest.json` の `archiveVersion: 2` を持つ project に **限定** (= migration ではなく additive)。

#### v2 圧縮形式

```
projects/completed/<id>/
├── ARCHIVE.md                # human-readable summary
└── archive.manifest.json     # machine-checkable recovery metadata
```

**削除対象**:
- AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md / decision-audit.md / discovery-log.md / projectization.md / DERIVED.md / breaking-changes.md / legacy-retirement.md / aag/ / derived/
- これらは **git history に残る**ため、commit history 経由で参照可能。`archive.manifest.json` の `restoreAllCommand` で 1 行 checkout 可能

**削除対象外 (= 例外的に残置)**:
- `config/project.json` — AAG project-checklist-collector + projectCompletionConsistencyGuard が project identification key として参照するため、v2 圧縮対象から例外的に残置。削除すると project が AAG framework に invisible になる

#### archive.manifest.json の必須 field

詳細は `docs/contracts/project-archive.schema.json` §manifestSchema を参照。要約:

| field | 役割 |
|---|---|
| `archiveVersion: 2` | v1 と区別する識別子 |
| `projectId` / `title` / `archivedAt` | identification |
| `preCompressionCommit` | 圧縮直前 SHA (= restore 起点) |
| `preCompressionTag` / `compressionTag` | annotated tag (= 任意、不可環境では null) |
| `compressionCommit` | 圧縮 commit SHA |
| `deletedPaths` | 削除した relative path list |
| `compressedFiles` | path + lineCount + 1 文 summary |
| `restoreAllCommand` | git checkout 1 行 (= AI が読んで実行可能) |
| `decisionEntries` | 圧縮前 decision-audit.md の id + title + commitSha |
| `commitLineage` | phase + commitSha + subject (= R-phase / Phase 別 commit lineage) |
| `relatedPrograms` | parent / child / successor / sibling cross-link |
| `compressionRationale` | 1-3 文 articulate (= AAG-REQ-NON-PERFORMATIVE 整合) |

#### v2 適用手順

§6.2 archive プロセス完了 (= step 1-8 完了 + commit / push 済) 後:

1. 圧縮直前の commit SHA を `preCompressionCommit` として記録
2. 圧縮対象 file (= AI_CONTEXT.md / HANDOFF.md / plan.md / 等) を git rm
3. `ARCHIVE.md` を新規作成 (= summary 集約、minimum sections は schema §structure 参照)
4. `archive.manifest.json` を新規作成 (= field は schema §manifestSchema 準拠)
5. atomic commit (= 圧縮 commit、commit SHA を `compressionCommit` field に追記する case は post-commit edit)
6. (任意) annotated tag を作成し `compressionTag` field を更新
7. push

#### restore 手順

archived project の **active 期 file が必要になった**場合:

```bash
# manifest 内 restoreAllCommand を実行
$(jq -r '.restoreAllCommand' projects/completed/<id>/archive.manifest.json)
```

= preCompressionCommit 時点の全 file が working tree に復活。検査 / 参照後、必要に応じて再 archive (= git restore で working tree を archived 状態に戻す)。

#### 不可侵原則

1. v2 圧縮は **user 承認後にのみ実施** (= AAG-REQ-NON-PERFORMATIVE、自動圧縮禁止)
2. v1 archived project への migration は **強制しない** (= 必要に応じて opt-in、案件単位で判断)
3. 圧縮 commit には **必ず restoreAllCommand を含む** (= drawer Pattern 4 honest articulation、復元経路確保)
4. 圧縮 rationale を `compressionRationale` field に **1-3 文 articulate** (= 機械的圧縮の対偶判断)

#### 検証 guard (= 後続 PR で landing 予定)

- `archiveVersion: 2` の project に対して以下を機械検証:
  - 必須 field 全揃い
  - `preCompressionCommit` が valid 40-char SHA
  - `restoreAllCommand` が `git checkout <preCompressionCommit> --` で始まる
  - `decisionEntries` の `commitSha` が SHA format

v1 archived project は本 guard scope 外。


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
| `references/04-tracking/generated/project-health.json` | 生成された project KPI 正本 |
| `references/04-tracking/generated/project-health.generated.md` | 同 view（user-readable） |
| `projects/_template/` | 新規 project 立ち上げのテンプレート（§10 参照） |

## 9. live project と判断

### live (active) project（2026-04-12 時点）

| projectId | scope | 入口 |
|---|---|---|
| `presentation-quality-hardening` | active-debt + 500 行超 + coverage + E2E | [`projects/active/presentation-quality-hardening/AI_CONTEXT.md`](../../projects/active/presentation-quality-hardening/AI_CONTEXT.md) |
| `pure-calculation-reorg` | Pure 計算責務再編（Phase 8〜） | [`projects/active/pure-calculation-reorg/AI_CONTEXT.md`](../../projects/active/pure-calculation-reorg/AI_CONTEXT.md) |
| `quick-fixes` | 単発 fix collection (continuous) | [`projects/active/quick-fixes/AI_CONTEXT.md`](../../projects/active/quick-fixes/AI_CONTEXT.md) |
| `data-load-idempotency-hardening` (archived) | idempotent load contract 残存防御 (2026-04-12 archive, Phase F Option A 確定) | [`projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md`](../../projects/completed/data-load-idempotency-hardening/AI_CONTEXT.md) |
| `docs-and-governance-cohesion` (archived) | live task 集約 + AAG 統合 (2026-04-12 archive) | [`projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md`](../../projects/completed/docs-and-governance-cohesion/AI_CONTEXT.md) |
| `aag-collector-purification` (archived) | collector heading 抑制削除 + 規約/実装の対称性回復 (2026-04-13 archive) | [`projects/completed/aag-collector-purification/AI_CONTEXT.md`](../../projects/completed/aag-collector-purification/AI_CONTEXT.md) |
| `aag-rule-splitting-execution` (archived) | AR-STRUCT-RESP-SEPARATION を 7 AR-RESP-* ルールに分割 (2026-04-13 archive) | [`projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md`](../../projects/completed/aag-rule-splitting-execution/AI_CONTEXT.md) |
| `architecture-decision-backlog` (archived) | R-9 (c) 現状維持を決定 (2026-04-13 archive) | [`projects/completed/architecture-decision-backlog/AI_CONTEXT.md`](../../projects/completed/architecture-decision-backlog/AI_CONTEXT.md) |

実時の値は [`references/04-tracking/generated/project-health.generated.md`](../02-status/generated/project-health.md) を正本とする。

## 10. 新規 project bootstrap 手順（AI 向け）

> **小さな fix の場合（数時間以内）:**
> bootstrap は不要。`projects/active/quick-fixes/checklist.md` に
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

`references/04-tracking/generated/project-health.generated.md` に新 project が
`derivedStatus = in_progress` で現れることを確認する。

### Step 8: 関連文書を README / doc-registry に登録する（必要時）

新 project の AI_CONTEXT.md は references/ ではなく projects/ 配下なので、
doc-registry.json への登録は不要。ただし AI_CONTEXT 内で参照する新規
references/ ドキュメントを作った場合は doc-registry.json と README.md にも
追加する（既存の obligation rule で機械検出される）。

### Step 9: open-issues.md の active project 索引に追加する

`references/04-tracking/open-issues.md` の `## active projects` テーブルに
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

### 11.2. 小さな fix の置き場 (`projects/active/quick-fixes/`)

repo には常に 1 つの `quick-fixes` collection project が存在する。
全ての小さな fix はその checklist に追記する。

```markdown
## 単発 fix

* [ ] (高) app/src/utils/foo.ts: 未使用 export `bar` を削除
* [ ] (中) references/04-tracking/recent-changes.generated.md: 2026-04 セクションに最新コミットを追記
* [x] (高) app/src/components/X.tsx: typo "calcuate" を "calculate" に修正
```

format: `* [ ] (優先度) <スコープ>: <一文の説明>`

### 11.3. collection の特徴

`projects/active/quick-fixes/config/project.json` には `kind: "collection"` が設定されている。
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
`appVersion` / `CHANGELOG.md` の最新 `[v...]` / `references/04-tracking/recent-changes.generated.md` の
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

これは AAG の 4 層モデル（`references/99-archive/aag-5-constitution.md`）に
完全に準拠した設計であり、本仕組み自体が AAG の管理下にある。

### 12.3. 新しい同期ペアの追加（運用手順）

1. `app/src/test/versionSyncRegistry.ts` の `VERSION_SYNC_REGISTRY` に 1 entry 追加する
   - `id`: user-readableな識別子
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

## 13. Phase 進行中 articulation patterns (= operational learning)

> **landed**: 2026-05-04 (= operational-protocol-system program retrospective からの transfer、aag-self-hosting-completion / aag-platformization / operational-protocol-system の 3 program で複数 instance 観測されたものを後続 program に伝承)。
>
> **scope**: project の Phase 進行中に AI session が **必ず適用すべき commit pattern**。reader navigation 補助として全 active project AI session が事前 read 推奨。
>
> **位置付け**: §6 ライフサイクル + §10 bootstrap 手順 を補完、Phase 進行中の commit construction pattern を articulate。

### 13.1. Phase landing + wrap-up 二段 commit pattern

**観測**: operational-protocol-system M1-M5 で 5 instance、aag-self-hosting-completion / aag-platformization でも同 pattern 観測。drawer Pattern 1 (Commit-bound Rollback) の application sub-pattern。

**pattern**: 各 Phase を **2 commit** で landing する:

```
1. **landing commit** (= deliverable + DA articulate + checklist + HANDOFF):
   - 新 doc 新設 / 既存 doc refine
   - DA-α-N entry を decision-audit.md に landing (= 5 軸 + 観測点 + Lineage 仮 sha)
   - checklist の該当 Phase checkbox を実装に応じて [x] flip
   - HANDOFF.md 現在地 + 次の作業 update
   - (該当時) doc-registry / README index update を **同 atomic commit** に統合

2. **wrap-up commit** (= 振り返り判定 + Lineage 実 sha + final flip):
   - DA-α-N の Lineage 実 sha を update (= judgementCommit = landing commit SHA)
   - DA-α-N の振り返り articulate (= 観測点全達成確認 + 判定 "正しい/部分的/間違い" + 学習)
   - checklist の振り返り判定 checkbox を [x] flip
   - HANDOFF.md 完遂状態 articulate
```

**rationale**:
- **drawer Pattern 1 整合**: landing commit = judgement commit、wrap-up commit = retrospective commit。各 commit が独立 rollback unit
- **学習の articulate location**: 振り返り articulate が Phase 完遂時点で確実に landing される (= 後続 Phase で前 Phase の学習を継承可能)
- **Lineage 実 sha**: judgement commit が landing 完了で SHA 確定後に wrap-up commit が SHA を articulate。同 commit 内で SHA を pre-articulate するのは無理 (= chicken-and-egg 回避)

**antipattern** (= 失敗 pattern):
- 1 commit に landing + wrap-up を統合 (= judgement / retrospective の articulation が混在、rollback 不可) → drawer Pattern 1 違反
- wrap-up commit を skip (= 振り返り不在、後続 session で Phase 完遂判断が trace 不能) → drawer Pattern 4 違反
- Lineage 実 sha を amend で landing commit に書き戻す (= rollback unit 破壊) → AAG-REQ-NO-AMEND 違反

**適用対象**: 全 Level 2+ project の Phase 進行 (= L1 軽修正は Phase 構造を持たないため適用外)。

### 13.2. Atomic dependent update commit pattern

**観測**: operational-protocol-system M1 で push fail × 2 発生 (= 2026-05-04)、M4 で学習適用、M5 でも同 pattern 適用、再発 0 件。

**pattern**: `references/` 配下に新 .md doc を追加する PR では、以下を **同 atomic commit に統合**:

```
1. 新 doc 本体 (= references/<path>/<new-doc>.md)
2. docs/contracts/doc-registry.json に entry 追加 (= 適切な category 選択)
3. references/README.md 索引 section に entry 追加 (= docRegistryGuard 整合)
4. (該当時) CLAUDE.md から該当 doc への link 追加
5. (該当時) 関連 inbound reference update (= 既存 doc から新 doc への参照追加)
6. (該当時) DA / checklist / HANDOFF update
7. (該当時) docs:generate 反映 (= 別 commit 推奨、§13.3 参照)
```

**rationale**:
- **push fail 事前回避**: pre-push hook が doc-registry / README index 漏れを hard fail で検出。同 commit 統合で fail 0 件
- **drawer Pattern 2 (Scope Discipline) 整合**: 新 doc 関連 update を 1 commit に limit、scope 拡大なし
- **reader navigation 整合**: 新 doc が landing した瞬間に doc-registry / README から reach 可能、incomplete state 回避

**pre-flight check list** (= 新 doc 追加時に AI session が事前 verify):

- [ ] doc-registry.json 該当 category に entry 追加 articulate (= path + label)
- [ ] references/README.md 索引 section に entry 追加 articulate
- [ ] (該当時) CLAUDE.md link 追加判断
- [ ] (該当時) 既存 doc から新 doc への inbound 追加判断
- [ ] すべて **本 commit に統合** (= 別 commit 化禁止、push fail で follow-up が必要になる)

**antipattern**:
- 新 doc landing → push fail → doc-registry 追加で follow-up commit (= ad-hoc fix、本 pattern 不在) → drawer Pattern 4 違反
- doc-registry.json に entry 追加し忘れ (= docRegistryGuard hard fail)
- README index update skip (= 構造的に reach 不能、reader navigation 破綻)

**適用対象**: 全 references/ 配下 .md 新 doc 追加 PR (= L1-L3 不問)。

### 13.3. Post-flip regen pattern (= KPI drift after [x] flip)

**観測**: operational-protocol-system M1-M5 で 4 instance、aag-self-hosting-completion で複数 instance。

**pattern**: checkbox `[x]` flip を含む commit の後、**docs:generate regen を別 commit で landing**:

```
1. **flip commit** (= checkbox flip 含む landing or wrap-up commit):
   - checkbox `[x]` flip
   - 関連 articulate (= DA / HANDOFF / 等) update
   - commit + push

2. **regen commit** (= docs:generate 反映):
   - cd app && npm run docs:generate
   - generated section + KPI 更新 (= committed health.json と live recalc 同期)
   - commit + push
```

**rationale**:
- **drawer Pattern 1 整合**: flip commit と regen commit が独立 rollback unit、KPI drift を機械的に同期
- **AAG-REQ-NO-AMEND 整合**: flip commit を amend で regen 統合は rollback unit 破壊、不採用
- **事前回避不可**: flip 前の docs:generate は flip 前提で計算不能 (= chicken-and-egg)、post-flip regen が唯一の合理的経路

**不採用 pattern**:
- **Pattern A (= 採用)**: `commit (= flip 含む) → docs:generate → 別 regen commit → push` ✅
- **Pattern B (= 不採用)**: `flip 前に docs:generate → flip + 同 commit → push` (= 計算順序不能)
- **Pattern C (= 不採用)**: `flip + commit + amend で regen 統合 → push` (= drawer Pattern 1 違反、AAG-REQ-NO-AMEND 違反)

**push fail 検出 hint** (= pre-push hook で発生):
```
[docs:check] FAIL — 1 error(s):
  ✗ KPI drift: project.checklist.checkedCheckboxes — committed: <N>, live: <N+M>
```

→ `cd app && npm run docs:generate && git add -A && git commit -m "chore(docs): docs:generate 反映 (= [x] flip 後 KPI sync)"` で解消。

**適用対象**: checkbox flip を含む全 commit (= Phase wrap-up commit / 振り返り commit / 等)。事前回避不能なため、push fail 後の follow-up commit pattern として institutionalize。

### 13.4. 関連

- drawer Pattern 1-6: `references/05-aag-interface/drawer/decision-articulation-patterns.md` (= 領域 agnostic、本 §13 は project lifecycle 専門の sub-pattern)
- AAG-REQ articulate: `aag/_internal/meta.md` §2 (= 不可侵原則 + Tier 0 不変条件)
- session-protocol: `references/05-aag-interface/protocols/session-protocol.md` §3 (= L 別実行中 routing) + §4 (= 終了 + 引き継ぎ)
- 学習 transfer source: `projects/completed/operational-protocol-system/archive.manifest.json` (= retrospective 集約)、`projects/completed/aag-self-hosting-completion/archive.manifest.json` (= 同 pattern 観測 instance)

## 9. このガイド自体の正本

本ガイドが定義する規格を変更する場合は、関連する 4 ガード / collector / generated artifact
すべてを更新する必要がある（co-change）。本ガイドだけを書き換えて済ませない。
