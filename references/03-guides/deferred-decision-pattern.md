# Deferred Decision Pattern (途中判断 制度化)

> **役割**: 計画段階で判断が難しい decision を、実装着手時 / 進行中の **AI 自主判断** として
> deferred する制度。AAG 全 project で再利用可能な lifecycle 補助規約。
>
> **規約**: AAG Layer 4A System Operations。`project-checklist-governance.md` (project lifecycle
> 規約) と並ぶ運用 reference。
>
> **位置付け**: 計画品質を高めるためにあらゆる decision を計画段階で確定するのは現実的でない
> (= 着手後に articulate される情報がある)。代わりに **「判断する材料 + 判断基準 + 判断方法」を
> 計画段階で articulate** し、実際の判断は AI session が自主的に実行する制度。

## 1. 背景: なぜ deferred decision が必要か

### 1.1. 計画段階で判断できない decision の典型例

| 例 | 計画段階で判断できない理由 |
|---|---|
| 新 doc の content 量 / section 数 | 着手して書いてみないと volume が不明 |
| sub-component (例: sub-audit) の追加候補 collapse 可否 | audit findings を踏まえないと判定不能 |
| project 分割 vs 単一継続 | scope の実態が audit で確定するまで判定不能 |
| protocol (例: AI 補助 draft 生成) の品質基準 | 5-10 instance で試行しないと protocol が confirm できない |

これらを計画段階で **無理に確定すると**:
- 計画 doc が **performative** (実態と乖離した articulation)
- 実装時の context で誤った decision を踏襲する risk
- 計画 update / revisit のコスト増

### 1.2. anti-pattern: 計画段階での過度な確定

- 「実装してみないと分からないが、planning では A と articulate しておく」 → 実装で B が正しいと判明、計画を update する手間 + 履歴混乱
- 「複数選択肢を articulate するが、判断基準が embed されていない」 → 後任 AI / 後任人間が判断軸を見失う
- 「人間判断とラベル付けて先送りする」 → 判断材料の収集が後任に委ねられ、orientation コスト増

### 1.3. 解決策: deferred decision pattern

- 計画段階で **「判断する材料 + 判断基準 + 判断方法」を articulate**
- 実際の judgement は **着手時の AI session が自主実行**
- 結果は **decision log に記録** (commit SHA + rationale + selected option)
- 後任 AI / 人間が **trace + revisit 可能**

## 2. 構造原則: deferred decision の必須 4 要素

各 deferred decision は以下 4 要素を doc に articulate する:

### 2.1. Phase trigger (いつ判断するか)

具体的 Phase / 進行段階を指定:
- `Phase X 着手前判断` (= prerequisite)
- `Phase X 進行中判断` (= 各 instance ごとの判断)
- `Phase X 完了時判断` (= hard gate decision)

### 2.2. 選択肢 (A/B/C など、enumeration)

判断対象を **明示的な選択肢** として列挙:
```
A: <選択肢 A の articulation>
B: <選択肢 B の articulation>
C: <選択肢 C の articulation> (必要なら)
```

選択肢は orthogonal (重複なし) + complete (網羅) を目指す。

### 2.3. 判断基準 (criteria、どう判断するか)

各選択肢の **推奨条件**を articulate:
```
A 推奨: <条件 X が成立する場合>
B 推奨 (default 指定可): <条件 Y が成立する場合>
C 推奨: <条件 Z が成立する場合>
```

default 推奨を articulate すると AI session が判断に迷ったときの fallback として機能する。

### 2.4. 判断材料の収集元 (collection sources、どこから collect するか)

AI session が判断 material を **自主収集する source** を articulate:
```
- <doc path / grep query / KPI / health metrics>
- <related Phase の deliverable>
- <既存実装の survey 経路>
```

source は AI が **機械的に access 可能** であること (path / query / file).

## 3. AI 自主判断 vs 人間判断の分離

deferred decision は基本 AI 自主判断だが、以下 2 種類は **人間判断のまま残す**:

### 3.1. AI 自主判断 (default)

- Criteria + collection sources が articulate 可能
- 機械検証可能な judgement (例: doc volume、commit 数、grep 結果、KPI)
- AI が trace 可能な rationale を記録できる
- 例: 「sub-audit list を Phase 3 audit findings に基づき確定」「Phase 4 sub-phase 化必要性判断」

### 3.2. 人間判断 (例外、安全装置として残す)

- **構造的安全装置** (= AI 誤判断のコストが高い、安全網が必要)
- **規約による必須化** (= project lifecycle 規約等で人間 approval が義務)
- 例: 物理削除 trigger (anti-ritual と orthogonal な人間 deletion approval)、最終レビュー (archive obligation 発火 gate)

人間判断項目は doc に **「人間判断必須、AI 判断しない」** と明示 articulate。

## 4. 記録方法 (decision log)

各 [x] flip 時に decision log に追記:

| 判断 trigger | 判断項目 | 判断者 | 選択 | rationale (collection sources + criteria 適用) | commit SHA |
|---|---|---|---|---|---|
| Phase X 着手前 | <項目> | AI session ID / 人間 | A/B/C | <criteria に対して collected material をどう適用したか> | <SHA> |

decision log は **後任 AI / 人間が trace + revisit 可能** な形で project 内 (例: checklist.md 末尾) に保持。

## 5. 適用 template

各 project の `checklist.md` 末尾に以下構造で articulate:

```markdown
## 途中判断 checklist (decision gates、AI 自主判断 + judgement criteria 集約)

> 各 Phase 着手前 / 進行中に AI session が自主的に判断する項目。
> 判断基準 + 判断材料の収集元 を doc に embed し、AI が material を収集 → criteria を適用 →
> decision を log + commit message に記録する。
>
> **設計意図**: AI が判断するための criteria と collection sources を doc に articulate
> しておくことで、後任 AI session でも一貫した judgement が可能。
>
> **人間判断のまま残す例外** (安全装置 / 規約):
> - <例外項目を articulate>
>
> **運用原則**: 各 Phase の checkbox を flip する前に、本 section の対応 decision gate が [x]
> になっていることを確認する (= decision gates が pre-check として機能)。

### Phase X 着手前判断 (AI 自主判断、N 件)

- [ ] **<判断項目>** (A: <選択肢 A> / B: <選択肢 B> / ...)
  - **判断基準**:
    - **A 推奨**: <条件 X>
    - **B 推奨 (default)**: <条件 Y>
  - **判断材料の収集元**: <source 1> / <source 2>
  - **AI action**: criteria 適用 → decision 確定 → commit message + decision log に記録

### 判断履歴 (decision log)

| 判断 trigger | 判断項目 | 判断者 | 選択 | rationale | commit SHA |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD |
```

## 6. 適用 instance (実 project)

| project | checklist.md decision gates section | 適用 entry 数 |
|---|---|---|
| `aag-bidirectional-integrity` | `projects/completed/aag-bidirectional-integrity/checklist.md` 末尾 | Phase 1 / 3 / 4 / 5 / 6 / 8 着手前 + 進行中判断、計 16 件 (本 doc の最初の application instance) |
| (将来 project) | (適用予定) | TBD |

新規 project spawn 時、本 doc を参照して checklist.md に decision gates section を articulate する。

## 7. project-checklist-governance.md との関係

- `project-checklist-governance.md`: project lifecycle 規約 (active / in_progress / archived 状態遷移、checklist format guard、最終レビュー gate)
- 本 doc (`deferred-decision-pattern.md`): project 内部の **deferred decision 制度** (計画段階で判断できない decision の articulate / judgement / record)

両者は orthogonal (lifecycle 規約 vs decision pattern)、相互補完。各 project の checklist.md は両 doc に従う。

## 8. 関連実装 (AAG governance hardening 連動)

| パス | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | project lifecycle 規約 (本 doc と並列) |
| `projects/<id>/checklist.md` 末尾 | 各 project の decision gates section (本 doc の application instance) |
| `aag-bidirectional-integrity` の `checklist.md` | 本 doc の最初の application instance (Phase 1 / 3 / 4 / 5 / 6 / 8 で 16 entry) |
| `references/03-guides/projectization-policy.md` | AAG-COA 判定 (本 doc は projectization Level 3+ で推奨適用) |

## 9. 不可侵原則

1. **判断 criteria を embed せずに decision gate を立ち上げない** (= AI が判断できない gate は performative)
2. **判断材料の収集元を articulate せずに criteria を立ち上げない** (= material 不在の judgement は不可能)
3. **AI 自主判断と人間判断を曖昧にしない** (= 各項目に「AI 判断 / 人間判断」を明示 articulate)
4. **decision log を空にしない** (= [x] flip 時に必ず追記、後任が trace 可能)
5. **default 推奨を articulate する** (= AI が迷ったときの fallback、`B 推奨 (default)` の形式)

## 10. 履歴

| 日付 | 変更 | 理由 |
|---|---|---|
| 2026-04-30 | 初版 landing | `aag-bidirectional-integrity` project の PR review (10 commits、特に最終 review で「途中判断ポイントを doc 化」指示) で identified された制度的必要性。本 project 固有でなく AAG 全 project で再利用可能な制度として独立 doc 化。本 project の checklist.md decision gates section を最初の application instance として articulate。 |
