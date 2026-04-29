# quality-review — 13 dimension AAG framework review (ground truth)

> **本 doc の位置づけ**: 前駆 project `canonicalization-domain-consolidation` の Phase A〜I 完遂後の最終 review session で identified された structural / institutional gap の **machine-readable ground truth**。本 project (`integrity-framework-evolution`) Phase R/H/I の意思決定根拠として機能する。
>
> **更新規律**: review の本体 (problem identification) は immutable archive。Phase R で個別 gap を解消するたびに `resolution[]` に追記する形で運用。
>
> **生成日**: 2026-04-29

## 0. メタ情報

- review session: canonicalization-domain-consolidation Phase A〜I 完遂直後
- review 対象: AAG framework + 整合性 domain + KPI / collector / guard / doc 群
- review dimensions: 13 (Pre-Phase-H pre-merge audit)

## 1. 7 つの構造 pattern

### 傾向 1: 正本性の単方向化

「A は B の正本」と宣言される箇所は多いが、**B が A を逆参照する機械検証は薄い**。

**evidence**:
- `adoption-candidates.json` ↔ `app-domain/integrity/` 実装 — Phase E 振り返り fix #3 で発覚した primitive 名 drift (shapeSync / tokenInclusion / jsdocTag)
- `COVERAGE_MAP` (test) ↔ `integrity-collector.ts` (collector) 間の duplicate logic — Phase G で landing したが drift risk が残る
- `references/README.md` 索引 ↔ 実 file — 毎 phase で発生した obligation 違反
- `doc-registry.json` label ↔ 実 doc 内容 — label が stale 化する反復事例

**root cause**: 正本が「権威」として宣言されるだけで、「双方向に整合する mechanism」になっていない。

**resolution path**: 構造的問題 A → Phase R-① Bidirectional Canonical Contract schema

### 傾向 2: 時間軸の構造的不在

decision の trace (when / who / why / 反転条件) が schema 化されておらず散在。

**evidence**:
- `rejected[]` archive は Phase E 振り返りで schema 化、`accepted` 側は無い (採用判断 trace 喪失)
- Phase 内 judgment は commit log のみ、`legacy-retirement.md §7` / `recent-changes.md` / `taxonomy-origin-journal.md` で domain ごとに散在
- `@deprecated` は時間 marker (since / expiresAt) を持つが、新規採用は時間 marker を持たない (非対称)

**root cause**: AAG は present-state の検証に特化、history が制度化されていない。

**resolution path**: 構造的問題 B → Phase R-② Time-axis Decision Record schema

### 傾向 3: judgement と mechanism の境界が降り切っていない

機械化可能な部分が「気をつける」 prose に留まっている箇所。

**evidence**:
- §P9 step 5 直接到達条件: `caller >= 5 file` は機械判定可能、判断は prose
- selection rule G-1/G-2/G-3: 「subjective 語の混入禁止」は grep で機械可能、人間判断
- helper / adapter 命名規約: 文章記述のみ

**root cause**: mechanism に降りられる箇所まで降りていない。

**resolution path**: 構造的問題 C → Phase R-③ mechanism/judgement/hybrid 3-zone 制

### 傾向 4: marker と state machine の混同

Phase / lifecycle / 採用判断が section header (marker) で表現され、状態遷移 (state machine) になっていない。

**evidence**:
- contentSpec / taxonomy は 6 lifecycle states を持つ、整合性 domain は state 概念なし
- "deferred" が 3 つの異なる意味で使われる (pair migration deferred / candidate handoff / permanently rejected)
- Phase A〜I は marker、entry/exit criteria が state transition として定義されない

**root cause**: 状態を表現する共通 schema が domain ごとにバラバラ。

**resolution path**: Phase R-② の time-axis schema が state field を持つことで構造的解消

### 傾向 5: scope の暗黙化

「何が scope か」は判断時に明示されるが、変化が track されない。

**evidence**:
- Phase H tier1 narrowing (4→2) の trace は checklist 注記のみ
- Refactor PR の touch file allowlist は git diff で見るしかない
- `project.json implementationScope` は静的、Phase ごとの dynamic scope なし

**root cause**: scope creep / scope reduction が機械的に観測できない。

**resolution path**: Phase R-② の archive schema に `scope-changes[]` を追加

### 傾向 6: cross-domain disconnection

複数 domain で同じ pattern を再発明。

**evidence**:
- collector と guard が同 logic を duplicate (integrity)
- Promote Ceremony は spec 専用、taxonomy / integrity は別 ceremony
- Origin Journal は taxonomy のみ、integrity は半分だけ (rejected[] のみ)
- 各 domain の `APP_DOMAIN_INDEX.md` 充実度がバラバラ

**root cause**: domain 間の bridge が制度化されていない。

**resolution path**: 制度的問題 D → Phase R-④ Cross-domain Framework Layer

### 傾向 7: 再帰性 (self-application) の不足

AAG が AAG 自身を守っていない箇所。

**evidence**:
- AAG framework 自身は #14 pair として inventory 化されていない
- `integrityDomainCoverageGuard` 自身が integrity domain primitive を使っていない (dogfooding 未達)
- Phase は `project-checklist-governance` で守られるが、Phase 内の Phase rule (entry/exit) は守られない

**root cause**: 仕組みが自分自身に適用されないと、framework の信頼性が証明されない。

**resolution path**: 制度的問題 F → Phase R-⑥ Dogfooding Mandate

## 2. 構造的問題 (A/B/C)

### 問題 A: 「正本」の概念が片肺

> 現在の AAG: 「A は正本である」と宣言する
> 不足している: 「A と B の整合は双方向に強制される」

これが傾向 1 / 6 の根。**正本は宣言ではなく契約 (bidirectional contract)** であるべき。

### 問題 B: 「時間」が AAG の第 1 級概念ではない

> 現在の AAG: 「現在の状態が正しいか」を検証する
> 不足している: 「いつ / 誰が / なぜ / どう変わるか」を schema として持つ

これが傾向 2 / 4 / 5 の根。**時間は file system / runtime と並ぶ第 1 級観測対象**にすべき。

### 問題 C: 「mechanism と judgement の境界」が決まっていない

> 現在の AAG: 「気をつける」と「機械検証する」が混在し、降りられる範囲が一律でない
> 不足している: 「ここまで mechanism、ここから judgement、その境界で何を要求するか」が制度化されていない

これが傾向 3 / 7 の根。**mechanism / judgement / hybrid の 3 領域を明示し、各領域で要求する artifact を schema 化**すべき。

## 3. 制度的問題 (D/E/F)

### 問題 D: domain ごとの自治が強すぎる

各 domain (taxonomy / contentSpec / integrity) が独自に schema / ceremony / index を持つため、共通 pattern が再発明される。**domain は subject の specialization、framework は cross-domain に共通**であるべき。

### 問題 E: judgement の artifact が標準化されていない

judgement (採用 / 撤退 / refactor / scope 変更) ごとに要求される artifact が domain ごとにバラバラ。「judgement は必ずこの artifact が必要」という standard が無い。

### 問題 F: introspection / dogfooding が義務化されていない

AAG が自分自身を守る義務が無い。**「framework の自己適用」が optional な culture** に留まっている。

## 4. 13 dimension review summary table

| # | dimension | 主要 gap | resolution path |
|---|---|---|---|
| 1 | 整合性品質 | 機械検証は強い (Hard 化済) | Phase R で contract schema 適用、cross-domain 拡大 |
| 2 | 機械的保証品質 | 「気をつける」 prose 依存箇所が 7 件 | Phase R-③ 3-zone 制で構造解消 |
| 3 | 運用品質 | health regen trigger 多重化、Hard Gate fail の対処経路非 KPI specific | 個別 fix (deferred to 第 5 の柱) |
| 4 | フィードバック品質 | assertion message quality バラつき、KPI に diagnostic[] 不在 | 個別 fix (deferred) |
| 5 | コンテキスト動線品質 | 7+ doc 散在、APP_DOMAIN_INDEX.md 未活用 | Phase R-④ で integrity index 整備 |
| 6 | 再発防止品質 | hardcode stale (skeleton fix #1 と同種)、retrospective ad-hoc | Phase R-① contract schema + 第 5 の柱で retrospective 制度化 |
| 7 | プロジェクト管理品質 | project.json status stale、cross-project dependency なし | 第 5 の柱 (project lifecycle governance) に handoff |
| 8 | プロジェクト進行品質 | Phase prerequisite 後付け、scope creep trace 不在 | 第 5 の柱に handoff |
| 9 | 問題検知品質 | silent fail risk (collector regex)、複合違反見落とし | Phase R-① contract pattern + 個別 sanity check |
| 10 | 課題検知品質 | leading indicator 不在、stale risk 検知薄い | 第 5 の柱に handoff |
| 11 | 新規実装品質 | primitive 仕様書なし、KPI 追加 review 経路なし | Phase R-⑤ Decision Artifact Standard |
| 12 | リファクタリング品質 | やりすぎ防止 mechanism なし、refactor scope creep | Phase R-⑤ + 第 5 の柱 |
| 13 | 旧制度撤退品質 | §P9 判定の機械化弱い、撤退判断 trace 薄い、retired[] archive 不在 | Phase R-② time-axis schema + retired[] 追加 |

## 5. 本 project scope と handoff の境界

### 本 project (`integrity-framework-evolution`) で扱う

- 構造的問題 A/B/C → Phase R-①/②/③
- 制度的問題 D/E/F → Phase R-④/⑤/⑥
- horizontal expansion (wasm + charts + hooks) → Phase H
- 整合性 domain への 3-zone 適用 → Phase I

### 第 5 の柱 (Project Lifecycle Governance、未起案) に handoff

- dimension 7 (PM): project lifecycle KPI / dependency graph / archive transition
- dimension 8 (PP): Phase Progression State Machine / scope log / rollback strategy
- dimension 10 (課題検知): leading indicator / warnAt threshold / stale risk
- dimension 12 (リファクタリング): Refactoring Audit Bundle (caller fan-out / behavior snapshot)
- AR rule `mechanicalSignal` field 全件追加
- Mandatory Retrospective trigger
- KPI に `failHint / diagnostic[]` 全件

## 6. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版起草。前駆 project 最終 review session の 13 dimension findings を ground truth として保存。本 project (integrity-framework-evolution) の Phase R/H/I の意思決定根拠 |

## 7. resolution log (Phase R 進行に応じて追記)

(空 — Phase R-① 着手 PR で R-①/問題 A の resolution を追記する)
