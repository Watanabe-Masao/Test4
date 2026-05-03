# Decision Articulation Patterns

> **位置付け (= aag-self-hosting-completion R2 で update)**: 本 doc は `references/05-aag-interface/drawer/` 配下に配置 (= 主アプリ改修 user / 人間が reach する **AAG public interface**)。AAG framework 内部 (= `aag/_internal/`) を読む必要なく、本 doc 内 articulate のみで pattern を引き出して使える。
>
> **3 tree boundary integration**: `references/` (= 主アプリ改修 user knowledge interface) 配下、`aag/` (= AAG framework 本体、主アプリ改修 user not read) と structural separation。
>
> **役割**: 本アプリ (粗利管理ツール) の改修 / refactoring / 新機能 / architecture 変更 等、
> change-bearing 作業全般で再利用可能な articulation pattern 集。
>
> **primary 適用領域**: 主アプリ改修。各 pattern は **領域 agnostic** に articulate されており、
> 本 doc を引いた AI / 人間は **AAG framework 内部 (= `aag/_internal/` + `aag/core/`) を一切読まずに** 適用できる
> (= AAG が AI に提供する「引き出し」の core instance、本 doc が AAG への primary entry)。
>
> **重要**: 主アプリ改修で AAG framework articulate (= meta.md / strategy.md / architecture.md / etc.) を読みたくなった場合、それは **drawer の articulate 不足**を意味する可能性 (= 該当 Pattern が articulate されていない / 既存 Pattern が application 不足) が高い。drawer 経由で reach 不能な場合のみ AAG sub-tree を consult する (= drawer は `主アプリ AI ↔ AAG framework` の唯一の正規 interface)。
>
> **first instance**: 本 doc の各 pattern の Application instances 欄に
> AAG Pilot (`projects/completed/aag-platformization/`) を **example** として記載。
> 後続で主アプリ改修事例が landing したら append する self-extend 構造。

## 役割切り分け (= 封じ込め境界)

本 drawer は **領域 agnostic な change articulation pattern のみ** を articulate する。
以下は本 drawer の scope **外**:

| 領域 | 配置先 | 性質 |
|---|---|---|
| AAG framework 自身の安全性 / 信頼性 / 境界 / 自己改善性 | `aag/_internal/` | AAG 内部 invariant、本 drawer に持ち込まない |
| 本アプリの business logic / 業務知識 (粗利計算 / シャープリー / DuckDB 等) | `references/01-principles/` 業務系 doc | 業務固有 |
| 個別 program の Phase 構造 | each program の `plan.md` | program 固有 |

**本 drawer 利用時に AAG framework 内部を読む必要はない**。AAG 内部 invariant を本 drawer に持ち込んだ pattern は **抽象化境界違反** (= §抽象化境界 self-test 参照)。

## いつ引く (drawer trigger)

- 本アプリの新規 feature / 既存 feature 改修 / 大規模 refactoring を着手する時
- presentation / application / domain / infrastructure 4 層のいずれかで architecture 変更がある時
- 数学的 invariant (シャープリー恒等式 / 計算正確性 / 不変条件) を伴う変更がある時
- 検証 / 観測 / 振り返りを実施する時
- 判断履歴 (decision audit) を articulate する時
- "気をつける" で済ませそうな箇所を mechanism に置換する時 (= 再発防止)

## 共通する原理

いずれの pattern も **proxy metric** (= 経過時間 / 件数 / "やった感") を **state-based evidence** (= 実測 / 反証可能 result / commit lineage) に置換する mechanism。

---

## Pattern 1: Commit-bound Rollback Institution

### いつ使う (trigger)

- 1 つの判断 (judgement) で複数 commit が landing する change-bearing 作業
- 後で「やっぱり違った」が起きる可能性がある作業 (= reframe が予想される)
- AI が自律的に判断を進める / 人間 review が後追いになる作業

### 何をする

1. judgement を landing する commit (= judgementCommit) の **直前 commit** (= preJudgementCommit) を annotated tag で固定 (= rollback-target)
2. judgement commit にも annotated tag (= judgement) を付ける
3. judgement commit を **amend / rebase / force push 禁止** (sha が rollback target になるため)
4. 後の振り返りで「間違い」/「部分的」判定なら `git checkout <rollback-target tag>` で物理的に判断前に戻れる
5. 振り返りも commit を残す (= retrospectiveCommit)、可能なら同 commit に articulation も統合

### 適用領域

- 新規 project の Phase 進行
- 主アプリ feature 改修の milestone
- Refactoring の各 step
- Migration の各 batch
- Architecture 変更の各段階

### Application instances (= example、複数想定)

- AAG Pilot (first instance、本 doc landing の trigger): `projects/completed/aag-platformization/decision-audit.md` 内 8 entry の Commit Lineage section + 14 annotated tag
- (将来) 主アプリ改修事例 — 各 program landing 時に append

---

## Pattern 2: 事前 articulate される Scope Discipline

### いつ使う (trigger)

- scope creep が予想される作業 (= 重要 / 大きい / multi-stakeholder / reframe 多発予想)
- 「何をやらないか」が「何をやるか」より大事な作業
- AI が user 提案に従い過ぎる傾向 (= please bias) が懸念される作業

### 何をする

1. 作業着手前に **「やらないこと」 list** を articulate (典型: 5-7 件)
2. 各 item に **違反時の動作** を articulate (例: revert / scope 外通知 / 別 program 起動 / 人間 escalation)
3. 後で reframe 提案が来た時に **「list の N 番違反」と機械的に断る経路** を確保
4. list 改訂は **judgement commit** (Pattern 1) で実施 (= articulation 改訂自身も rollback 可能に)

### 適用領域

- 任意の project plan (主アプリ / framework 共通)
- 主アプリ Refactoring の scope articulation
- Architecture 変更の constraint articulation
- Migration の non-goal articulation

### 注意 (抽象化境界)

各 program の **具体 list 内容** はその program の plan.md に articulate する。本 drawer は **「list を持つ」という pattern** を articulate するだけで、具体的 list 内容は持たない。

### Application instances (= example、複数想定)

- AAG Pilot: `projects/completed/aag-platformization/plan.md` §1 (7 件)
- (将来) 主アプリ改修事例 — 各 program plan.md の "やらないこと" section

---

## Pattern 3: 前提 collapse 時の Clean Rewrite

### いつ使う (trigger)

- 累積した patch / partial fix が増えてきた時 (例: doc 行数が 1.5x 以上に膨らんだ)
- 「前提」(= 何を解決しようとしているか) が途中で shift した時
- 「累積を捨てるのもったいない」(= sunk cost fallacy) を感じた時
- partial fix を続けると articulation 構造が破綻すると判定した時

### 何をする

1. 累積 patch 全 revert と forward-fix の **両判断** を articulate (どちらかを選ぶのではなく両方を articulate して判断根拠を残す)
2. 前提が変わったなら **clean rewrite を default** にする
3. clean rewrite 前の commit を annotated tag で固定 (= Pattern 1 の rollback target を兼ねる)
4. 累積 patch の learning は **新 articulation の rationale に統合** (= 失わない)
5. clean rewrite 後の行数 / 文書数 / 構造を articulate (= before/after 観測)

### 適用領域

- 主アプリ doc / plan / checklist の累積 articulation
- 設計 doc の累積 patch
- 主アプリ Refactoring の partial fix 累積
- 仕様書の継ぎ接ぎ articulation

### Application instances (= example、複数想定)

- AAG Pilot: 1,710 行 patch → clean rewrite 813 行 (前提 collapse 後の構造再評価、`projects/completed/aag-platformization/plan.md` 履歴)
- (将来) 主アプリ doc の clean rewrite 事例

---

## Pattern 4: Limitation の Honest Articulation

### いつ使う (trigger)

- verification 完了時 (PASS / partial / FAIL の判定が必要)
- 「全 PASS」で whitewash したくなる時
- coverage / quality が 100% でない結果を articulate する時
- own-side bias で「成功」と書きたくなる時

### 何をする

1. verdict は **3 値** (= 正しい / 部分的 / 間違い、graduation 禁止)
2. partial / 間違いの場合、**limitation を hide せず articulate**
3. limitation を **post-program improvement candidate** に articulate (= 負債として明文化)
4. **改善 trigger** を articulate (= いつ improvement program が起動するか)
5. limitation は数値で articulate (= "ほぼ良い" 禁止、"30.2% partial" 等の quantitative)

### 適用領域

- 任意の verification (主アプリ / framework / 共通)
- 主アプリ test coverage 報告
- 主アプリ feature 改修後の振り返り
- review 後の振り返り
- migration の partial completion 報告

### Application instances (= example、複数想定)

- AAG Pilot: F1 mapped 率 30.2% を hide せず "PASS partial coverage" と verdict + post-program improvement candidate に articulate
- (将来) 主アプリ verification の partial coverage 事例

---

## Pattern 5: 意図的 Skip の Rationale 付き Articulation

### いつ使う (trigger)

- checklist の item に対して「実装した / 実装してない / 意図的に skip した」の **3 状態** が必要な時
- "やり残し" と "意図的判断" を後続が区別したい時
- skip した item が後で誤解されない articulation が欲しい時

### 何をする

1. checkbox の **3 状態目** を articulate: `[x]` (実装済) / `[ ]` (未) / `[x] + rationale` (意図的 skip)
2. 意図的 skip の rationale には以下 3 件を articulate:
   - (a) **何故 skip したか** (= 判断根拠)
   - (b) **何が skip の代替を満たすか** (= 別経路で同じ目的が達成されている articulation)
   - (c) **いつ trigger 発生で起こすか** (= 永久 skip ではなく未来 trigger 待ち)

### 適用領域

- 任意の checklist (主アプリ / framework / 共通)
- 主アプリ feature 改修の task tracking
- review 結果の articulation
- migration の段階別 skip articulation

### Application instances (= example、複数想定)

- AAG Pilot: `projects/completed/aag-platformization/checklist.md` Phase 0 の `CURRENT_PROJECT.md` 切替保留 + Phase 1 A1 の DA-α-001 別 entry skip + Phase 1 A5 の drawer rule-detail per-file 化 skip (= 3 件、各々 (a) (b) (c) articulated)
- (将来) 主アプリ checklist の意図的 skip 事例

---

## Pattern 6: State-based Verification Harness

### いつ使う (trigger)

- 「2 週間運用観測」で済ませたくなる時 (= calendar-based observation の anti-pattern、proxy metric)
- 機能 (functioning) を verify したいが proxy metric (= 経過時間 / レビュー件数 / "やった感") では不足な時
- AI 自身が verify する責任を持っている時 (= 人間 review が後追い、即時 verify 必要)
- 検証 scenario が articulate 可能な時 (= 抽象 trigger ではなく concrete trigger)

### 何をする

1. **CT (Concrete Test)** として scenario を articulate (典型: 5 件、過剰禁止)
2. 各 CT に **quantitative observation** を要求 (例: read 数 / step 数 / count / 率 / test 数)
3. 各 CT に **反証可能 result** を 1 件以上 articulate (= negative test / limitation articulate)
4. verdict は **3 値** (= Pattern 4 と同 lens)
5. **calendar 観測なし** (= state-based、実装が landed した時点で trigger、期間 buffer 不要)
6. 結果は judgement commit に landing (= Pattern 1 と統合)

### 適用領域

- 主アプリ新規 feature の Phase 完了 verify
- 主アプリ refactoring 完了時の non-regression verify
- Architecture 変更 (層境界 / 契約 / 正本化) 後の effect 観測
- 主アプリ migration の完了 verify
- Cross-subsystem 整合 verify

### Application instances (= example、複数想定)

- AAG Pilot: CT1 (drawer 1 read で reach) / CT2 (irrelevant path で 0 件) / CT3 (2 read で reach) / CT4 (4 sync guard 29 test PASS) / CT5 (6 entry + 12 tag landed) — 各 CT が quantitative observation + 反証可能 result を持つ
- (将来) 主アプリ feature 完了 verify 事例

---

## 抽象化境界 self-test (= 後続 AI が verify 可能)

各 pattern が以下 4 件を満たしていることを後続 AI / reviewer が verify 可能:

1. **pattern 本文 (= "何をする" / "適用領域") に AAG-specific term が含まれない**
   - check: 本 doc 内の `## Pattern N` から `### Application instances` 直前まで grep で AAG-specific term (例: `AAG-REQ`, `5 軸`, `8 軸`, `DA-α-`, `不可侵原則 [0-9]`) が 0 件であること
2. **pattern 本文 purpose に AAG self-safety を articulate していない**
   - check: pattern body が「AAG framework を守る」を purpose として articulate していないこと (= primary purpose は **領域 agnostic な change articulation**)
3. **AAG-specific item は Application instances section のみ**
   - check: AAG-specific term は各 pattern の `### Application instances` 内に閉じる
4. **本アプリ改修例を併記**
   - check: 各 pattern の "適用領域" に主アプリ改修関連の項目が含まれる + Application instances に「(将来) 主アプリ改修事例」が articulate されている

self-test 違反が検出された場合は **抽象化境界違反**、当該 pattern を本 drawer から削除 or AAG 内に return する。

## 引き出し方

- AI session 開始時に `.claude/manifest.json` の `discovery` 経由で reach 可能 (= byTopic / byExpertise)
- 各 pattern の "Application instances" は **複数想定**: 後続で主アプリ改修事例 / framework 改修事例が landing したら append (= drawer の self-extend、各事例 owner が責任 articulate)
- 本 drawer 利用時に **AAG framework 内部 (= `aag/_internal/`) を読む必要はない**

## 関連 doc (任意参照)

- AAG framework 自身の articulation: `aag/_internal/README.md` (本 drawer は AAG が提供する「引き出し」の 1 instance、AAG 内部の articulation は本 drawer 利用 AI が読む必要なし)
- 設計原則 (A-I+Q): `references/01-principles/design-principles.md`
- リファクタリング判断: `references/01-principles/canonicalization-principles.md`
- AAG-COA (project 立ち上げ前判定): `references/05-aag-interface/operations/projectization-policy.md`
- deferred decision pattern (sibling): `references/05-aag-interface/operations/deferred-decision-pattern.md`
