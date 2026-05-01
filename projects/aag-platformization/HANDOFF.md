# HANDOFF — aag-platformization

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 0 (Bootstrap) のみ landed**。

- `projects/aag-platformization/` を `_template` から bootstrap 済 (本 commit)
- 必須セット 6 ファイル (AI_CONTEXT / HANDOFF / plan / checklist / projectization / config + aag/execution-overlay) を埋めた
- 派生セットは未投入 (Workstream B 中盤で `breaking-changes.md` を、Workstream C で `acceptance-suite.md` を後付け予定)
- `aag/execution-overlay.ts` は空のまま (本 program 自身は本体ガード rule の運用状態を上書きしない方針)
- **CURRENT_PROJECT.md の切替・open-issues.md 更新は未実施** (副作用が大きいため Phase 0 checkbox に明示的に残置。docs:generate は本 commit 時に実行済)

実装作業 (Phase 1 以降) は未着手。本 program は AAG 自体の制度基盤化が目的であり、最初に手を入れる先は「実コード」ではなく「authority 文書 (3 doc)」。

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位を 3 段で要約する。

### 高優先 (Workstream A — Authority Program)

1. **Phase 1: Authority Charter** — Core / App Profile / Derived Artifact / Facade の 4 役割を `aag/core/AAG_AUTHORITY_TABLE.md` (新設) に固定する。これが完了するまで Phase 2 以降は着手しない。
2. **Phase 2: Merge Policy Fix** — bootstrap 破綻 (空 overlay → merged.ts throw) を修復する。`MERGE_POLICY.md` を新設し、reviewPolicy 契約の穴を 3 案 (defaults に reviewPolicy 追加 / merged.ts に stub 補完 / bootstrap で seed 必須化) から **AI が事実根拠で 1 つ選定**、`decision-audit.md` DA-α-002 に判断 + 振り返り観測点を記録する。
3. **Phase 3: Authority Table + Schema Registry** — `AAG_SCHEMA_REGISTRY.md` を新設し、現存 5 schema (RuleSemantics / Governance / OperationalState / DetectionSpec / Binding) を JSON Schema 化する。

### 中優先 (Workstream B — Artifactization / C — Contract)

4. **Phase 4: Merged Artifact Generator** — `docs/generated/aag/merged-architecture-rules.json` を生成し、各 field に `resolvedBy: 'project-overlay' | 'defaults'` を刻む。
5. **Phase 5: AagResponse Contract Separation** — `docs/contracts/aag-response.schema.json` を新設、helpers.ts / aag-response.ts は schema を 1 次正本として振る舞う。
6. **Phase 6: Detector Protocol** — `docs/contracts/detector-result.schema.json` を新設、guard / collector / pre-commit が同 protocol で出力する。
7. **Phase 7: RuleBinding Boundary Guard** — binding に意味系フィールド (what/why/decisionCriteria/etc.) が漏れたら hard fail する guard を新設。

### 低優先 (Workstream B 後段 — D — Operating System)

8. **Phase 8: Overlay Artifactization** — defaults / 各 project の overlay を JSON artifact 化 (TS は thin re-export 化)。
9. **Phase 9: Go Core PoC** — Go で merge / validate / response の最小実装。**PoC 止まり**、本 cutover はしない。
10. **Phase 10: Cutover Charter + Change Policy** — `aag/core/AAG_CORE_CHANGE_POLICY.md` を新設し、schema versioning / golden test / compatibility test / 制度変更ルールを文書化。最終 archive レビューで人間が `decision-audit.md` 全 entry を読んで responsibility を引き受ける (judgement の正しさを担保する承認ではない)。

## 3. ハマりポイント

### 3.1. bootstrap path は実装と doc が乖離している (本 program の出発点)

`new-project-bootstrap-guide.md` Step 4 は「空 `EXECUTION_OVERLAY = {}` で全 rule が defaults から自動解決される」と明示している。が、`merged.ts` 70-109 行は **reviewPolicy を全 rule で project overlay 必須** とし、無ければ throw する。`defaults.ts` は reviewPolicy を含まないため、空 overlay は実装上は必ず破綻する。

これは "comment 揺れ" ではなく authority 契約の物理的な穴。Phase 2 が修復する対象そのもの。**Phase 2 完了前に新規 project を bootstrap しない** こと (本 project 自身も `aag/execution-overlay.ts` は空のままにし、本体 merge には参加させない方針)。

### 3.2. RuleExecutionOverlayEntry が二重定義されている

- `_template/aag/execution-overlay.ts` (52 行) では fixNow / executionPlan が **optional**
- `pure-calculation-reorg/aag/execution-overlay.ts` (45,536 行) では **required**

両者は別ファイルで個別に declare されている (project local type)。共通 authority 型がない。Phase 2 で `aag-core-types.ts` に統合する際、既存 project の型再 import に注意。**型の互換破壊** で `pure-calculation-reorg` のビルドが落ちないよう、新型は両者を strict superset としてから移行する。

### 3.3. base-rules.ts は 10,805 行ある (TS のまま維持)

base-rules.ts を JSON 化する誘惑を持たないこと。projectization §4 で nonGoal として明記済み。理由は authoring の rich 表現 (型補完 / リファクタ安全 / 静的検査) を毀損するため。Phase 8 で JSON 化するのは defaults と各 project overlay の **運用状態** だけ。

### 3.4. AagResponse は既に単一正本になっている

`tools/architecture-health/src/aag-response.ts` (121 行) が canonical で、`helpers.ts` は re-export のみ。Phase 5 では「正本の重複解消」ではなく「正本を schema 駆動に変える」が作業内容。helper を消そうとしないこと (renderer / formatter 関数群に正当な存在理由がある)。

### 3.5. obligation-collector が AAG path をすでに監視している

`tools/architecture-health/src/collectors/obligation-collector.ts` の `PATH_TO_REQUIRED_READS` で `tools/architecture-health/` 配下を触ると AAG 全 8 doc の read 義務が発火する。Phase 5 / 6 で aag-response.ts / detector に手を入れる際、AAG docs (5 層 / 進化 / 運用区分 / 正本 / layer-map) を併せて整合させる必要がある。

### 3.6. 各 Phase 完了後に必ず docs:generate + 切替検証

Phase の境界では以下を実行する:

```bash
cd app
npm run docs:generate    # generated section 更新
npm run docs:check       # stale 検出
npm run test:guards      # 全 guard PASS
npm run lint && npm run build
```

特に Phase 2 / 4 / 7 は generated section に影響する。

### 3.7. Go PoC は PoC 止まり

Phase 9 で Go binary を作るが、本 cutover (CI の主経路化 / TS 側の縮退) は **本 program の scope 外**。後続 project (`aag-go-cutover` 仮称) で実施する。本 program の Phase 10 では「cutover charter + change policy 文書化」までで止める。projectization §5 escalation 条件を発火させないこと。

### 3.8. 人間承認は intentional に最小化されている

本 program の判断モデルは `plan.md` 原則 6。AI が事実根拠で判断 → `decision-audit.md` に articulate → Phase 完了時に振り返り観測点を実測 → 判定 (正しい / 部分的 / 間違い) を記録。**3 AI Checkpoint は人間承認 gate ではない**。最終 archive レビューだけが人間 mandatory で、これは judgement の正しさではなく **責任の引受** に過ぎない。

罠:

- 「人間に承認をもらってから次の Phase に進む」フローを誤って組まないこと。本 program は AI 判断 + 事後振り返りで進む
- `decision-audit.md` の entry 追加を skip しないこと (判断時に観測点を書き残さないと、振り返り時に何も検証できない)
- 振り返りで判定を "概ね正しい" 等のグラデーションで逃がさない (3 値: 正しい / 部分的 / 間違い)
- 判定が "間違い" でも本 program の失敗ではない。**判断の正しさを担保する仕組みが機能した** ことの記録になる

### 3.9. judgementCommit を amend / rebase しない

`decision-audit.md` の各 entry には `judgementCommit` (= 判断を landing した commit sha) と `judgementTag` (annotated tag) を記録する。これらが軌道修正時の rollback target を物理的に指し示す唯一の手がかり。

**禁じる**:

- judgementCommit を `git commit --amend` で書き換える (sha が変わる)
- judgementCommit を含む branch を `git rebase` で書き換える (sha が変わる)
- judgementTag を delete-and-recreate する (履歴が壊れる)
- judgementCommit を含む branch を `git push --force` する (remote 側の sha が消える)

**理由**: sha が変わると振り返り時に commit を引き当てられず、rollback target が機能しなくなる。`plan.md` 原則 6 が立脚する物理結合 (判断 ↔ commit) が崩れる。

**例外**: judgementCommit が landing 直後 (まだ tag を打っていない / push していない) で typo を発見した場合のみ amend 可。一度 tag 化または push したら以降 amend 禁止。

**追加禁則 (DA-α-000 軌道修正で landing)**: rollback tag の動作確認は worktree clean 時に限定する。unstaged work がある状態で `git checkout <rollbackTag> -- .` を実行すると unstaged 変更が revert されてデータロスする。動作確認は (1) commit / stash で worktree を clean にしてから、(2) 別 branch に checkout して、(3) 確認後 main branch に戻る、の手順で行う。

### 3.10. 言語層を跨がないこと

`plan.md` 原則 0 の物理境界:

- AAG Core / Domain で **Zod を使わない** (Zod は本体ドメインの runtime validation 用)
- AAG Core / Domain で **Rust を使わない** (Rust/WASM は本体計算エンジン用)
- AAG 接続部 (TS) で **Go をリンクしない** (接続部は TS のまま)

理由は、責務 / 空間 / 意味 / 言語の混線を物理境界で禁じるため。本体 (粗利) と AAG が同じ道具立てを共有しないことを物理層で保証する。Phase 3 の schema 化で「Zod の方が便利だから」と引き入れない。Phase 9 の Go PoC で「TS から Go bridge を生やせば早い」と接続部に Go を持ち込まない。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | project 文脈の入口 — why / scope / read order |
| `plan.md` | 5 不可侵原則 + 4 Workstream + 3 AI Checkpoint + 10 Phase + Decision Audit Mechanism |
| `decision-audit.md` | 主要判断と事後振り返りの記録 artifact (Phase 1 着手時に新設) |
| `checklist.md` | completion 判定の機械入力 |
| `projectization.md` | AAG-COA 判定 (Level 3) と nonGoals |
| `config/project.json` | manifest |
| `aag/execution-overlay.ts` | 案件 overlay (本 program 自身は空のまま運用) |
| `aag/core/AAG_CORE_INDEX.md` | Core 3 層モデル — 本 program の上位文書 |
| `aag/core/principles/core-boundary-policy.md` | Core 境界 5 原則 |
| `references/01-principles/aag/source-of-truth.md` | 正本 / 派生物 / 運用物 ポリシー — Phase 4 artifact 化の根拠 |
| `app/src/test/architectureRules/merged.ts` | 修復対象 (Phase 2) |
| `app/src/test/architectureRules/defaults.ts` | 修復対象 (Phase 2 / Phase 8 で JSON 化) |
| `tools/architecture-health/src/aag-response.ts` | schema 化対象 (Phase 5) |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | obligation 反映対象 (Phase 5 / 6) |
