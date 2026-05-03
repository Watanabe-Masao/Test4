# aag-change-impact-template — AAG 変更 PR の Impact Section 記入要領

> **目的**: AAG framework を変更する PR が **何を変えていて、どのリスクを伴うか** を出す前に明文化させる。review 質を上げ、後から壊れるまで気づけない事態を予防する。
> **位置づけ**: Phase Q.M-1 deliverable（PR template 拡張の記入ガイド）。
> **template 本体**: `.github/PULL_REQUEST_TEMPLATE.md §AAG Change Impact`。

## 1. いつ記入するか

PR が以下のいずれかに **touch** する場合は section 必須:

- `app-domain/gross-profit/rule-catalog/base-rules.ts`（rule 定義）
- `app/src/test/architectureRules/`（rule schema / facade）
- `app/src/test/guards/`（guard test）
- `app/src/test/allowlists/`（allowlist）
- `tools/architecture-health/`（KPI collector / renderer / fix-hints）
- `app-domain/integrity/`（整合性 domain primitives）
- `references/AAG_*.md`（入口 doc）
- `references/01-foundation/aag-*.md`（AAG 正本系）
- `references/01-foundation/canonicalization-principles.md` / `taxonomy-constitution.md`
- `docs/contracts/*.json`（doc-registry / principles / project-metadata / test-contract）
- `tools/git-hooks/`（pre-commit / pre-push）
- `.github/PULL_REQUEST_TEMPLATE.md`（自己改訂）

該当しない場合は「該当なし（AAG 変更ではない）」とだけ記載。

## 2. 各 field の意味

### Affected layer

AAG の 4 layer model（`AAG_OVERVIEW.md` 参照）のどこに入るか。

| layer | 例 |
|---|---|
| **Constitution** | 設計原則の追加 / 変更、不変条件の追加、taxonomy constitution 改訂 |
| **Schema** | `BaseRule` 型の field 追加、KPI schema 拡張、health JSON schema 変更、project.json schema |
| **Execution** | guard test 追加、health collector 改修、pre-commit hook 修正 |
| **Operations** | allowlist 編集、generated doc 更新、obligation map 拡張、PR template 改訂 |

複数 layer に跨ることはあり得る（例: 新 KPI 追加は Schema + Execution + Operations）。

### Affected artifacts

具体的な変更ファイル群。template の chip list から該当を選ぶ。**全部チェックする必要はない**、touch していないものは外す。

### Risk

**追加 / 変更が他の PR / 開発者に与える影響**。

- **new Hard Gate**: CI を即 fail にする gate を増やすこと。**migration path 必須**（既存 codebase が PASS できる baseline + ratchet 計画）
- **new human approval 経路**: review window や promote ceremony を新規追加すること。1 人 dev project では原則避ける（過剰 ceremony リスク）
- **new generated artifact**: docs:generate 等で派生物を増やすこと。drift 検証 guard も同 PR で必須
- **new source of truth**: 既存正本と並ぶ別 source を導入すること。**bidirectional integrity** が成立するか検証必須（canonicalization-principles §P9 参照）
- **breaking change**: 既存 schema / rule の意味を変えること。移行 PR + 旧 schema sunset 計画が必要
- **Tier 0 rule の追加 / 変更**: `AAG_CRITICAL_RULES.md` を併せて更新（drift すると Tier 0 の意味が揺らぐ）
- **なし**: additive（既存に field 追加 / doc 追加等）、後方互換

### Anti-bloat self-test（4 質問）

> AAG 第 7 / 第 8 原則の self-application（rule に求める品質を rule 改修にも求める）。

各質問に **PR description で答えられる** 状態にする:

1. **何の事故を防ぐのか**: 「これがないと X が起きる」を 1 文で書ける？（書けないなら不要かもしれない）
2. **既存で防げないか**: 既存 guard / rule / doc で代替できないか？（できるなら新規追加せず既存改修）
3. **false positive リスク**: 誤検知が出る場面を想定したか？（rule の不確実性を理解した上で導入）
4. **sunset 経路**: いつ不要になるか説明できる？（永続化を前提にしない、`sunsetCondition` を書ける）

「答えられない」項目があるなら **PR を出す前に立ち止まって考える**。これは review reviewer の負担軽減 + 不要 rule の予防。

## 3. 記入例

### 例 1: 新 Tier 0 rule 追加

```markdown
## AAG Change Impact

**Affected layer**:
- [x] Constitution（不変条件 INV-XXX を新規導入）
- [x] Schema（base-rules.ts に新 rule entry + tier: 0）
- [x] Execution（新 guard test）
- [x] Operations（AAG_CRITICAL_RULES.md 更新）

**Affected artifacts**:
- [x] `app-domain/gross-profit/rule-catalog/base-rules.ts`
- [x] `app/src/test/guards/`
- [x] `references/01-foundation/aag-*` / `AAG_*.md`

**Risk**:
- [x] new Hard Gate を追加する（baseline = 0 で開始、migration path: 既存違反 0 件を確認済）
- [x] Tier 0 rule の追加（AAG_CRITICAL_RULES.md 更新）

**Anti-bloat self-test**:
- [x] 何の事故を防ぐ: 「<具体>」が起きると <業務的害>
- [x] 既存で防げない: <理由>
- [x] false positive: regex は厳格、誤検知 0 件確認済
- [x] sunset: <反証可能性>
```

### 例 2: ドキュメント追加のみ（AAG 変更ではない）

```markdown
## AAG Change Impact

該当なし（AAG 変更ではない）。
```

### 例 3: AAG 入口 doc 拡張（軽微）

```markdown
## AAG Change Impact

**Affected layer**:
- [x] Operations（入口 doc の追記）

**Affected artifacts**:
- [x] `references/AAG_*.md`

**Risk**:
- [x] なし（additive、後方互換）

**Anti-bloat self-test**:
- [x] 何の事故を防ぐ: onboarding cognitive load 軽減
- [x] 既存で防げない: AAG_OVERVIEW のみで cover できない X 系の動線
- [x] false positive: なし（doc）
- [x] sunset: AAG_OVERVIEW に統合できれば削除可能
```

## 4. 機械検証は当面なし

本 template は **soft enforcement**（PR description checklist）として運用する。**guard で機械検証はしない**。理由:

- AI / 人間が PR を出す前の self-reflection を促すのが本質的価値
- guard で強制すると形式記入になり質が下がるリスク
- 1 人 dev project で過剰 ceremony を避ける（Phase Q scope reduction の方針）

drift 事例（template が無視されて重要 AAG 改修が review 不足のまま landing 等）が発生した場合は、guard 化を検討する。

## 5. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版（Phase Q.M-1 deliverable）。PR template の AAG Change Impact section と本記入要領 doc を pair で landing。guard 化は drift 事例待ち（YAGNI）|
