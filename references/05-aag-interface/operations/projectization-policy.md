# AAG-COA — Projectization Policy

> **位置付け (= aag-self-hosting-completion R2 で update)**: 本 doc は `references/05-aag-interface/operations/` 配下 (= 主アプリ改修 userが reach する AAG public interface)。AAG framework 内部 (= `aag/_internal/`) を読まずに本 doc で AAG-COA 判定可能。
>
> **役割:** 変更内容に応じて project 化の重さを決める AAG Layer 4A System Operations。
> 目的は project 化を増やすことではなく、**必要な governance と不要な governance を分離する**こと。
>
> **AAG レイヤー: Layer 4A System Operations（AAG Core）**
>
> 本ガイドは特定の app domain や個別 project に依存しない、
> **全 project に共通する入口判定ルール** である。プロジェクトが変わっても残る
> 共通手順として AAG Core 側に置かれ、`project-checklist-governance.md` /
> `promote-ceremony-template.md` / `allowlist-management.md` 等と同じ層に属する。
>
> 関連する AAG 実装:
>
> | コンポーネント | 配置 | レイヤー |
> |---|---|---|
> | 規約（本書） | `references/05-aag-interface/operations/projectization-policy.md` | 4A System Operations |
> | metadata schema | `projects/<id>/config/project.json` の `projectization` フィールド | 2 Schema |
> | 判定記録 | `projects/<id>/projectization.md` | 4B Project Operations |
> | guard | `app/src/test/guards/projectizationPolicyGuard.test.ts` | 3 Execution |
> | template | `projects/_template/projectization.md` + `_template/config/project.json` | 4A System Operations |

## 0. 基本思想

> **作業文脈に合っただけの governance をかけ、それ以上の project 化を禁止する。**

本書は以下の 1 対の問題を同時に解く。

| 問題 | 発生するコスト |
|---|---|
| 小さな修正まで full project 化される | ceremony が重く、本質作業に到達できない |
| 新規実装と大型 architecture refactor が同じ重さで扱われる | governance の解像度が下がる |
| inquiry / breaking-changes / legacy-retirement / sub-project-map が過剰に作られる | drift の温床、レビューノイズ |
| governance がアプリ本体の変更容易性を下げる | repo 全体の機動性劣化 |
| 「必要な手続き」ではなく「全部盛りテンプレート」が標準になる | 手続きの意味が失われる |

AAG-COA は「何を作るか」だけでなく **「何を作らないか」** を同じ強度で定義する。
これが入ることで、初めて `projects/` 運用は **持続可能な解像度**を持つ。

### project-checklist-governance との責務分離

| 概念 | 担当 | 対象タイミング |
|---|---|---|
| **AAG-COA（本書）** | 入口判定 — どの重さの project にすべきか | project 立ち上げ**前** |
| **project-checklist-governance** | completion 管理 — どうやって project を完了・archive するか | project 立ち上げ**後** |

両者は排他的ではなく、順序関係にある。AAG-COA が **level を決めた後** に
project-checklist-governance が **その level に応じた重さの checklist** を運用する。

## 1. AAG-COA の入力

作業要求を受けたら、次の 7 項目を評価する。

| 入力 | 評価内容 | 出力値 |
|---|---|---|
| `changeType` | 変更の性質 | bug-fix / new-feature / refactor / architecture-refactor / legacy-retirement / governance-hardening / docs-only |
| `implementationScope` | 触る層 | `["domain"]` / `["application", "presentation"]` / 等 |
| `breakingChange` | 公開契約・型・API を破壊するか | true / false |
| `requiresLegacyRetirement` | 既存コードの撤退を伴うか | true / false |
| `requiresGuard` | 再発防止 guard の新設が必要か | true / false |
| `requiresHumanApproval` | 設計判断でuser 承認が必要か | true / false |
| `nonGoals` | この作業ではやらないこと | string[] |

これらは `projects/<id>/config/project.json` の `projectization` フィールドに
構造化データとして保存する（§10）。

## 2. Change Type

| type | 定義 | 代表例 |
|---|---|---|
| `bug-fix` | 既存仕様の実装バグ修正 | typo、null 参照、誤った条件式 |
| `new-feature` | 新規機能の追加（既存契約を壊さない） | 新 chart / 新 page / 新 read model |
| `refactor` | 振る舞い不変の構造改善 | ファイル分割、重複排除、命名統一 |
| `architecture-refactor` | 層境界・型境界・registry / context を変える | context 分離、契約の破壊的変更 |
| `legacy-retirement` | 既存 API / module の物理削除 | 旧 hook 撤退、旧 query 廃止 |
| `governance-hardening` | ルール / guard / allowlist の強化 | 新 guard 追加、baseline 縮退 |
| `docs-only` | references/ / CLAUDE.md / roles/ のみ | 誤記修正、説明追加 |

複数該当する場合は **最も重い type を採用**する（例: 新 feature で既存契約を壊すなら
`architecture-refactor`）。

## 3. Projectization Level

5 段階で定義する。**Level 0 と Level 4 は例外**であり、通常運用は Level 1〜3。

### Level 0: Task

**条件（すべて満たすこと）**

- 1ファイル〜少数ファイルの小修正
- 既存パターンの踏襲のみ
- 破壊的変更なし
- legacy 撤退なし
- guard 新設なし
- 設計判断でuser 承認が不要

**必要なもの**

- PR description
- lint / build / test PASS
- 必要なら CHANGELOG

**禁止するもの（過剰 project 化の検出対象）**

- `projects/<id>/` ディレクトリ作成
- AI_CONTEXT.md / HANDOFF.md / plan.md / checklist.md 作成
- `inquiry/` ディレクトリ作成
- Phase 制の導入

> 小さな fix は `projects/quick-fixes/checklist.md` に 1 行追加するだけ
> （`project-checklist-governance.md` §11.2）。

### Level 1: Lightweight Project

**条件**

- 複数ファイル変更
- 影響範囲は同一 feature / 同一 layer 内
- 設計判断は小さい
- 破壊的変更なし
- legacy 撤退なし、または極小（数ファイル）

**必要なもの**

- `config/project.json`（`projectization.level = 1`）
- 軽量 `checklist.md`（Phase 構造なしでもよい）
- `plan.md`（不可侵原則 + 関連実装のみ）
- `AI_CONTEXT.md`（Purpose / Scope のみ）
- `HANDOFF.md`（現在地 / 次にやること）
- `projectization.md`（判定結果）

**禁止するもの**

- Phase 0〜7 の full template（過剰）
- `inquiry/01〜` の事実棚卸し
- `breaking-changes.md`
- `legacy-retirement.md`
- `sub-project-map.md`
- 新規原則の制定

### Level 2: Standard Project

**条件**

- 新規 feature / 新規画面 / 新規 read model
- domain / application / presentation のうち複数層にまたがる
- 既存構造を大きく壊さない
- 破壊的変更なし、または限定的（1〜2 ファイル）

**必要なもの**

- `config/project.json`（`projectization.level = 2`）
- `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` / `checklist.md`
- `projectization.md`（判定結果 + nonGoals 明記）
- test plan（guard 新設時は guard 設計を plan に含める）

**任意**

- `inquiry/` は必要時のみ（事実確認が作業入口になる場合）
- guard は「再発可能性が高く、機械検出できる」場合のみ新設

**禁止するもの**

- umbrella 化（sub-project spawn）
- `sub-project-map.md`
- 新規原則の制定
- 全方位の真因分析

### Level 3: Architecture Project

**条件（いずれかを満たす）**

- 層境界を変える
- 型境界 / registry / context / data pipeline を変える
- 破壊的変更あり
- legacy 撤退あり
- guard / invariant 新設あり
- 複数 feature に影響する

**必要なもの**

- `config/project.json`（`projectization.level = 3`）
- `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` / `checklist.md`
- `projectization.md`
- `inquiry/`（事実棚卸し → 影響範囲特定）
- `plan.md` 内に remediation-plan / guard design を含める
- `breakingChange=true` なら `breaking-changes.md`
- `requiresLegacyRetirement=true` なら `legacy-retirement.md`
- rollback plan（`plan.md` セクション）
- checklist の最終レビュー section に **user 承認 checkbox** 必須

**禁止するもの**

- `sub-project-map.md`（umbrella でない限り）
- 無関係スコープの混入（§0: 1 project = 1 一貫した task scope）

### Level 4: Umbrella Project

**条件（すべて満たすこと）**

- 複数 sub-project を spawn する
- 複数 architecture lane がある
- 破壊的変更が複数ある
- legacy retirement が広範囲
- 原則 / invariant / guard / generated health にまたがる

**必要なもの**

- Level 3 の全項目
- Phase 1〜7 構造（事実棚卸し → 真因分析 → 原則候補 → 改修計画 → project 整理 → sub-project 実装 → archive / summary）
- `sub-project-map.md`（sub-project の一覧 + 依存関係）
- `spawn-sequence.md`（sub-project の実行順序）
- `breaking-changes.md`
- `legacy-retirement.md`
- generated health への統合

**注意**

Level 4 は **例外運用**。通常の新機能や中規模 refactor に使ってはいけない。
Level 4 判定は、事前に Level 3 として立ち上げ、escalation を経て昇格するのが
望ましい（§8）。

## 4. Level 別 required / forbidden artifacts（早見表）

| artifact | L0 | L1 | L2 | L3 | L4 |
|---|---|---|---|---|---|
| `projects/<id>/` directory | ❌ | ✅ | ✅ | ✅ | ✅ |
| `config/project.json` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `projectization.md` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `AI_CONTEXT.md` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `HANDOFF.md` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `plan.md` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `checklist.md` | ❌ | ✅ | ✅ | ✅ | ✅ |
| 最終レビュー (user 承認) checkbox | — | 任意 | 任意 | ✅ | ✅ |
| `inquiry/` | ❌ | ❌ | 任意 | ✅ | ✅ |
| `breaking-changes.md` | ❌ | ❌ | ❌ | 条件付 | ✅ |
| `legacy-retirement.md` | ❌ | ❌ | ❌ | 条件付 | ✅ |
| guard 設計 | ❌ | ❌ | 条件付 | 条件付 | ✅ |
| `sub-project-map.md` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `spawn-sequence.md` | ❌ | ❌ | ❌ | ❌ | ✅ |
| Phase 1〜7 構造 | ❌ | ❌ | ❌ | ❌ | ✅ |
| nonGoals 明記 | — | 推奨 | ✅ | ✅ | ✅ |

**凡例:**
- ✅ = 必須（無ければ guard fail）
- ❌ = 禁止（あれば guard fail — 過剰 project 化）
- 条件付 = `projectization` metadata の対応フラグ（breakingChange / requiresLegacyRetirement / requiresGuard）が true の場合必須
- 任意 = 作っても作らなくてもよい
- — = 該当しない

## 5. Breaking Change 判定

**`breakingChange = true` の条件（いずれか）:**

- public API / export の signature 変更
- readModel / calculationResult の型破壊的変更
- context 型の field 削除 / 型変更
- store action の削除 / signature 変更
- guard baseline の **緩和**（ratchet-up）
- invariant の意味変更
- architectureRules の意味変更

**`breakingChange = false` に該当するもの:**

- public API への **新規 field 追加**（optional）
- ratchet-down（baseline の縮退）
- 内部実装の置換（公開契約不変）
- docs のみの変更

判定に迷ったら `breakingChange = true` 側に倒す。false に倒して後で気付くコストより
true で過剰に備えるコストの方が低い。

## 6. Legacy Retirement 判定

**`requiresLegacyRetirement = true` の条件（いずれか）:**

- 既存 file / module の物理削除
- 既存 export / API / hook の撤退
- 旧 query / 旧 handler の廃止
- 移行期間を伴う並行運用の終了

true の場合、`projects/<id>/legacy-retirement.md` を必須にする。
そこに以下を記載:

1. 撤退対象の完全リスト（パス + 理由）
2. 呼び出し元の完全リスト（grep 結果）
3. 移行先（新 API / 新 pattern）
4. 撤退順序（先に呼び出し元を移行 → 最後に実体削除）
5. rollback plan

## 7. Guard / Invariant 判定

**`requiresGuard = true` の条件（すべて満たすこと）:**

- 再発可能性がある（同じ種類のバグが繰り返し発生しうる）
- 機械的に検出できる（AST / regex / count / co-change で表現可能）
- 「気をつける」運用に戻したくない

**`requiresGuard = false` に該当するもの:**

- 一回性の fix（再発しない）
- 検出が ambiguous で false positive が多い
- 既存 guard で既にカバーされている

`requiresGuard = true` の場合、`plan.md` に guard 設計セクションを持ち、
以下を記載:

1. guard の名前（`<domain>Guard.test.ts`）
2. 検出対象（import / regex / count / must-include / must-only / co-change / must-not-coexist / custom）
3. baseline 戦略（初期値 / ratchet-down 方針）
4. allowlist 管理（必要なら）
5. fix hints（error message に載せる修正誘導）

詳細: `references/03-implementation/architecture-rule-system.md`

## 8. Human Approval 判定

**`requiresHumanApproval = true` の条件（いずれか）:**

- 不可逆な変更（DB schema / storage format / URL path の変更）
- 設計判断（architecture 選択 / 契約設計）
- breaking change を含む
- legacy retirement を含む
- 原則 / invariant / guard の新設
- 複数 project に影響する

true の場合、`checklist.md` は **2 段 gate 構造** を持つ (= DA-β-002 で institute):

1. **AI 自己レビュー section** (= 1 段目 gate、user 承認の手前 mandatory checkpoint)
2. **最終レビュー (user 承認) section** (= 2 段目 gate)

```markdown
## AI 自己レビュー (= user 承認の手前)

> 本 section は **必ず最終レビュー (user 承認) の直前** に置く。実装 AI が project 完了前に
> 自分自身で品質 review を実施し、user 承認の入力を整える mechanism (= DA-β-002 で institute)。

- [ ] **総チェック**: 全 Phase 成果物 (commit / PR / 関連正本 / generated artifact) を AI が再 review し、scope 内 / 内容妥当 / 不可侵原則違反 0 を確認
- [ ] **歪み検出**: 実装中に scope 外 commit / 設計負債 / drawer Pattern 違反 / 隠れた前提変更 が無いことを確認
- [ ] **潜在バグ確認**: edge case / null 取扱 / 型 assertion / race condition / fail-safe paths を改めて点検
- [ ] **ドキュメント抜け漏れ確認**: 実装変更に対する README / CLAUDE.md / references/ / 関連 plan / decision-audit の更新が漏れなく完了
- [ ] **CHANGELOG.md 更新 + バージョン管理**: 該当 release entry 追記 + semver 適切 + project-metadata.json appVersion 整合

## 最終レビュー (user 承認)

> このセクションは **必ず最後** に置き、user レビュー前は [ ] のままにする。

- [ ] 全 Phase の成果物 (commit / PR / 関連正本 / generated artifact) を
      user がレビューし、archive プロセスへの移行を承認する
```

機械検証: PZ-10 (= 最終レビュー section 必須) + **PZ-13** (= AI 自己レビュー section 必須 + ordering = user 承認 section の前)。

詳細: `references/05-aag-interface/operations/project-checklist-governance.md` §3.1 + §3.2

## 9. Escalation / De-escalation

Projectization Level は **作業中に変わってよい**。ただし変更は明示的に行う。

### Escalation（重い方向）

トリガー:

- 着手後に想定より広い範囲のファイルを触ることが分かった
- 既存の不変条件 / 契約 / guard との整合性を取り直す必要が出てきた
- 破壊的変更が発覚した
- 複数 project に分解する必要が出た
- 当初 nonGoals に含めた作業が必要になった

手順:

1. `projectization.md` の §5 escalation 条件に該当行を追記
2. `config/project.json` の `projectization.level` を更新
3. 新 Level で required になった artifacts を追加
4. `checklist.md` を必要に応じて拡張（Phase 追加など）
5. commit message に `escalate: L<old> → L<new>` を明記

### De-escalation（軽い方向）

トリガー:

- 調査の結果、想定より影響範囲が小さかった
- 一部のスコープを別 project に分離した
- breaking change が avoidable と判明した

手順:

1. `projectization.md` に de-escalation 理由を記録
2. `config/project.json` の `projectization.level` を更新
3. 不要になった artifacts は **削除せず** `plan.md` の Notes に「不要と判定」と記録
   （削除すると履歴が失われる。次回の判断材料として残す）
4. commit message に `de-escalate: L<old> → L<new>` を明記

### 判定の不可逆性は存在しない

AAG-COA の判定は **何度でも更新してよい**。
「最初に決めた Level を守らなければならない」という制約は存在しない。
判定の正確さより、**判定が現状を反映していること**が重要。

## 10. project.json metadata

`projects/<id>/config/project.json` の `projectization` フィールドに構造化して持たせる。

```json
{
  "projectId": "<id>",
  "title": "<user-readableタイトル>",
  "status": "active",
  "projectRoot": "projects/<id>",
  "projectization": {
    "level": 3,
    "changeType": "architecture-refactor",
    "implementationScope": ["presentation", "application"],
    "breakingChange": true,
    "requiresLegacyRetirement": true,
    "requiresGuard": true,
    "requiresHumanApproval": true,
    "nonGoals": [
      "UI redesign",
      "new feature behavior"
    ]
  },
  "entrypoints": {
    "aiContext": "projects/<id>/AI_CONTEXT.md",
    "handoff": "projects/<id>/HANDOFF.md",
    "plan": "projects/<id>/plan.md",
    "checklist": "projects/<id>/checklist.md",
    "projectization": "projects/<id>/projectization.md"
  }
}
```

### フィールド定義

| field | type | 必須 | 意味 |
|---|---|---|---|
| `level` | 0 \| 1 \| 2 \| 3 \| 4 | ✅ | §3 の Projectization Level |
| `changeType` | string | ✅ | §2 の Change Type |
| `implementationScope` | string[] | ✅ | 触る層（`domain` / `application` / `presentation` / `infrastructure` / `features/<name>` 等） |
| `breakingChange` | boolean | ✅ | §5 |
| `requiresLegacyRetirement` | boolean | ✅ | §6 |
| `requiresGuard` | boolean | ✅ | §7 |
| `requiresHumanApproval` | boolean | ✅ | §8 |
| `nonGoals` | string[] | Level 2+ で必須 | やらないことの明示 |

### kind との関係

`config/project.json` には既に `kind: "collection"` フィールドが存在する
（`projects/quick-fixes/` 用）。`projectization` フィールドとの関係は:

- `kind: "collection"` の project は `projectization` を持たなくてよい
- `kind` が未指定 or `kind: "project"` の場合は `projectization` が必須

## 11. projectization.md

`projects/<id>/projectization.md` に COA 判定結果を記録する。
template は `projects/_template/projectization.md`。

役割:

- `config/project.json` の `projectization` フィールドの **user-readable view**
- 判定理由・不要判断の根拠・escalation 履歴を残す
- レビュー時に「なぜこの重さなのか」が 1 ファイルで分かる

## 12. guard: projectizationPolicyGuard

`app/src/test/guards/projectizationPolicyGuard.test.ts` が以下を機械検証する。

### 検出コード

`status` 列は guard の実装状況。**全 12 コード実装済み**（2026-04-25 時点）。

| code | 検出対象 | status |
|---|---|---|
| PZ-1 | `config/project.json` に `projectization` metadata がない（kind=collection を除く） | implemented (strict, baseline=0) |
| PZ-2 | `projectization.level` が 0〜4 以外 | implemented (hard fail) |
| PZ-3 | `projectization.level=0` が宣言されているのに `projects/<id>/` ディレクトリが存在する（過剰 project 化） | implemented (hard fail) |
| PZ-4 | Level 1 なのに Phase 0〜7 full structure を使っている | implemented (hard fail) |
| PZ-5 | Level 1 なのに `inquiry/` が存在する | implemented (hard fail) |
| PZ-6 | Level 2 なのに `sub-project-map.md` が存在する | implemented (hard fail) |
| PZ-7 | `breakingChange=true` なのに `breaking-changes.md` がない（Level 3+） | implemented (hard fail) |
| PZ-8 | `requiresLegacyRetirement=true` なのに `legacy-retirement.md` がない（Level 3+） | implemented (hard fail) |
| PZ-9 | `requiresGuard=true` なのに plan / checklist / projectization / inquiry に guard 設計の言及がない | implemented (regex match: `\bguard\b` / ガード / `baseline=` / `ratchet` / `*Guard.test.ts`) |
| PZ-10 | `requiresHumanApproval=true` なのに checklist に最終レビュー (user 承認) checkbox が無い | implemented (hard fail) |
| PZ-11 | Level 4 なのに `sub-project-map.md` が無い | implemented (hard fail) |
| PZ-12 | Level 2+ なのに `nonGoals` が未定義または空 | implemented (hard fail) |
| PZ-13 | `requiresHumanApproval=true` なのに checklist に AI 自己レビュー section が無い、または最終レビュー section の後にある (= ordering 違反) | implemented (hard fail、DA-β-002 で institute) |

### 対象

- `projects/*/config/project.json`
- `projects/*/projectization.md`
- `projects/*/checklist.md`

### 除外

- `projects/completed/**`（archive 済み project は retroactive 適用しない）
- `projects/_template/**`（template 自体の schema 検証は別 test）
- `kind: "collection"` の project（例: `projects/quick-fixes/`）

### baseline / ratchet

初期導入時は既存 active project に metadata が無いため、
**段階的な ratchet-down baseline** で運用する:

- 導入直後: 各検出コードの違反数を baseline として固定
- 以降: baseline 以下を維持（増やせない）
- metadata が付与されるたびに baseline を縮退

## 13. 運用例

### 例 1: typo 修正 → Level 0

```
判定:
  changeType = bug-fix
  implementationScope = ["presentation/components/Foo.tsx"]
  breakingChange = false
  requiresLegacyRetirement = false
  requiresGuard = false
  requiresHumanApproval = false
  → Level 0

対応:
  projects/<id>/ を作らない
  PR 1 本で完結
  必要なら quick-fixes/checklist.md に 1 行追加
```

### 例 2: 新 chart 追加 → Level 2

```
判定:
  changeType = new-feature
  implementationScope = ["features/sales/presentation", "features/sales/application"]
  breakingChange = false
  requiresLegacyRetirement = false
  requiresGuard = false
  requiresHumanApproval = false
  → Level 2

対応:
  projects/<id>/ 作成（4 doc + config + projectization.md）
  nonGoals 明記（UI redesign はしない、等）
  inquiry/ は不要
  breaking-changes.md / legacy-retirement.md は不要
```

### 例 3: context 分離 → Level 3

```
判定:
  changeType = architecture-refactor
  implementationScope = ["application/context", "presentation/widgets"]
  breakingChange = true
  requiresLegacyRetirement = true（旧 context 撤退）
  requiresGuard = true（再発防止）
  requiresHumanApproval = true
  → Level 3

対応:
  Level 2 の全項目
  inquiry/ で呼び出し元の棚卸し
  breaking-changes.md
  legacy-retirement.md
  plan.md に guard 設計
  checklist に最終レビュー checkbox
```

### 例 4: architecture-debt-recovery → Level 4

```
判定:
  changeType = architecture-refactor
  implementationScope = ["features/*", "application/*", "presentation/*"]
  breakingChange = true
  requiresLegacyRetirement = true
  requiresGuard = true
  requiresHumanApproval = true
  sub-project が spawn されている（ADR-A-001 / ADR-C-003 / ADR-D-006 等）
  → Level 4

対応:
  Level 3 の全項目
  sub-project-map.md で sub-project 一覧
  spawn-sequence.md で実行順序
  Phase 1〜7 構造
  generated health への統合
```

## 14. やってはいけないこと

- **Level 0 を `projects/<id>/` で扱う** — 過剰 project 化。quick-fixes に追加せよ
- **Level 1 で Phase 0〜7 template を使う** — template は Level 4 前提。Level 1 は軽量に保つ
- **Level 2 で新規原則を制定する** — 原則制定は Level 3+ の architecture-refactor が扱う
- **Level 3 未満で `sub-project-map.md` を作る** — umbrella 化は Level 4 のみ
- **既存原則で説明できるのに新規原則を追加する** — AAG の「疑い、捨て、置き換える」に反する
- **guard を「気をつける」の代替として乱発する** — 再発可能性 + 機械検出可能性の両方が必要（§7）
- **判定を固定化する** — AAG-COA は可逆。現状に合わせて escalate / de-escalate してよい
- **`nonGoals` を空のまま進める（Level 2+）** — スコープ逸脱の温床
- **`completed/` 配下の project に retroactive に metadata を付ける** — 歴史を汚さない

## 15. 関連実装

| ファイル | 役割 |
|---|---|
| `projects/_template/projectization.md` | 判定結果 template |
| `projects/_template/config/project.json` | metadata schema template |
| `app/src/test/guards/projectizationPolicyGuard.test.ts` | 機械検証 |
| `references/05-aag-interface/operations/project-checklist-governance.md` | 立ち上げ後の completion 管理 |
| `references/05-aag-interface/operations/new-project-bootstrap-guide.md` | bootstrap 手順（AAG-COA 判定が入口） |
| `aag/_internal/layer-map.md` | Layer 4A 登録 (Project A Phase 1 で `aag-5-layer-map.md` から Rewrite + Relocate + Rename) |
