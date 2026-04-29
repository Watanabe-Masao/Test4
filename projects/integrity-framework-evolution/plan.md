# plan — integrity-framework-evolution

> **canonical 計画 doc** (2026-04-29 起草)。
> 前駆 project `canonicalization-domain-consolidation` の Phase A〜I 完遂で確立された
> 整合性 domain (14 primitive + 13 ペア + Hard Gate KPI) を基盤に、
> framework の構造的問題を解消する Phase R + horizontal expansion を行う Phase H +
> 制度化を仕上げる Phase I の 3 phase 構成。
>
> **status**: draft (Phase 0 bootstrap のみ完遂、Phase R 着手前)

## 0. 設計目標 (North Star)

> **「整えてから進める」 — 構造を建てる前に図面を引く**

前駆 project は **進めながら整える** approach で 13 dimension の structural / institutional
gap を発見した。本 project は **整えてから進める** approach に転換し、framework reset
を先行させた上で horizontal expansion を行う。

### 設計判断の基準

迷ったら次の質問に戻る:

- これは **構造的問題 A/B/C** (双方向契約 / 時間軸 / mechanism-judgement 境界) のどれを解消するか?
- これは **制度的問題 D/E/F** (cross-domain disconnection / decision artifact / dogfooding) のどれを解消するか?
- これは **「進めながら整える」** に逆戻りしていないか? (= 暗黙的に構造を後回しにしていないか?)

3 つすべてに「解消対象を明示できる / institutional answer になっている / 整えてから進めている」と答えられる変更だけを採用する。

## 1. 前駆 project からの継承

### 1.1 完成済 framework

`canonicalization-domain-consolidation` Phase A〜I で確立:

| 成果物 | 状態 |
|---|---|
| §P8 selection rule (G-1/G-2/G-3) | active |
| §P9 step 5 直接到達 default | active |
| 14 primitive (parsing 6 / detection 7 / reporting 1) | active |
| 13 pair COVERAGE_MAP | active (12 migrated + 1 deferred) |
| 4 KPI (violations / driftBudget / expiredExceptions / consolidationProgress) | active (Hard Gate 2 件) |
| AR-INTEGRITY-NO-RESURRECT | active |
| canonicalization-checklist.md | active |
| rejected[] archive | active (3 件: shapeSync / tokenInclusion / jsdocTag) |

### 1.2 13 dimension review で発見された gap

詳細は `derived/quality-review.md` (本 project Phase 0 bootstrap で landing) 参照。

**7 つの構造 pattern**:

1. 正本性の単方向化
2. 時間軸の構造的不在
3. judgement と mechanism の境界が降り切っていない
4. marker と state machine の混同
5. scope の暗黙化
6. cross-domain disconnection
7. 再帰性 (self-application) の不足

**3 つの構造的問題 (A/B/C)**:

A. 「正本」の概念が片肺 (宣言ではなく契約に格上げ要)
B. 「時間」が AAG の第 1 級概念ではない (history 制度化要)
C. 「mechanism と judgement の境界」が決まっていない (3-zone 制要)

**3 つの制度的問題 (D/E/F)**:

D. domain ごとの自治が強すぎる (cross-domain framework 共通化要)
E. judgement の artifact が標準化されていない (decision artifact standard 要)
F. introspection / dogfooding が義務化されていない (self-application mandate 要)

## 2. 不可侵原則

1. **前駆 project の §P8/§P9 を変更しない** (拡張は可、変更不可)
2. **drift 検出強度を弱めない** (Phase R で schema 変更は existing guard を保つ前提)
3. **13 pair の現 framework での運用を継続** (Phase R 中も Hard Gate PASS を維持)
4. **business logic を変更しない** (Phase H の registry+guard 整備のみ、業務 logic 不変)
5. **active overlay の自動切替なし** (人間判断、Phase R 完了後に検討)
6. **「気をつける」 rule は作らない** (Phase R は mechanism / judgement / hybrid 3-zone で明示分類)
7. **第 5 の柱 (Project Lifecycle Governance) に踏み込まない** (本 project scope 外、後続 project)

## 3. Phase 構造

### Phase 0: 計画 doc landing (本 commit)

- bootstrap (plan / checklist / projectization / AI_CONTEXT / HANDOFF / config)
- `derived/quality-review.md` に 13 dimension review の ground truth を保存
- doc-registry.json に project doc 群を登録

### Phase R: Framework Reset

> **structural answer to A/B/C, institutional answer to D/E/F**

#### R-① Bidirectional Canonical Contract schema

正本を「宣言」ではなく「双方向契約」に格上げ:

```
canonical contract = {
  authority:    A
  derivation:   B is derived from A
  bidirection:  A→B 整合 + B→A 整合 が両方機械検証
  drift detector: 不整合検出経路
}
```

- `app-domain/integrity/types.ts` (or 新 `lifecycle.ts`) に schema 定義
- 13 pair を contract schema で再分類
- COVERAGE_MAP と integrity-collector の duplicate logic を **同 contract の 2 endpoints** として認識
- 解消する gap: 傾向 1 (単方向化) / 6 (cross-domain) / 7 (再帰性)

#### R-② Time-axis Decision Record schema

decision に共通 schema を適用:

```
decision record = {
  when, who, why, evidence, reversal, state
}
```

- 全 archive (accepted[] / rejected[] / deferred[] / retired[] / scope-changes[]) で同 schema 共有
- taxonomy origin journal も同 schema で reframe (cross-domain 適用)
- 解消する gap: 傾向 2 (時間軸) / 4 (state machine) / 5 (scope)

#### R-③ mechanism / judgement / hybrid 3-zone 制

各 invariant に zone tag を必須化:

| zone | 要求 artifact |
|---|---|
| mechanism | guard test / Hard Gate / ratchet-down |
| judgement | rationale prose (decision record schema、最小文字数) |
| hybrid | 機械部分 + 判断部分を artifact で繋ぐ |

- §P8/§P9 / selection rule / 撤退規律を 3-zone 分類で書き直し
- 解消する gap: 傾向 3 (judgement) / 7 (再帰性)

#### R-④ Cross-domain Framework Layer

各 domain (taxonomy / contentSpec / integrity) が共通 schema (R-① / R-② / R-③) **を実装する義務**を持つ:

- `APP_DOMAIN_INDEX.md` を統一 template 化
- domain ごとの subject specialization を明記
- cross-domain bridge 明示
- 解消する gap: 制度的問題 D

#### R-⑤ Decision Artifact Standard

採用 / 撤退 / refactor / scope 変更の **artifact template 共通化**:

- PR description template の必須 section (decision record schema 適用)
- post-PR の archive 義務 (accepted[] / deferred[] / rejected[] / retired[] / scope-changes[])
- guard で artifact 整合性検証
- 解消する gap: 制度的問題 E

#### R-⑥ Dogfooding Mandate

各 domain の coverage guard が **自分の domain primitive で書かれているか** を機械検証:

- AAG framework 自身を #14 pair として inventory 化
- integrity domain の coverage guard が integrity primitive で書き直される
- 解消する gap: 制度的問題 F、傾向 7

### Phase H: Horizontal Expansion

> **Phase R で整えた framework の最初の正規利用**

#### H-α: hooks (H-1) re-evaluation

- selection rule 3-zone (R-③) で再判定
- accepted[] entry に判断 trace
- 採否決定: `accepted` / `out-of-scope` / `pending`

#### H-β: charts (H-2) 採用

- registry: chart input/option builder pair 対応表
- guard: `chartPairCanonicalGuard.test.ts` 新設 or `chartInputBuilderGuard` 拡張
- COVERAGE_MAP に entry 追加
- decision artifact (R-⑤) を archive に
- 既存 14 primitive で表現可能か検証 (R-① contract 適用)

#### H-γ: wasm (H-7) 採用

- registry: wasm module + bridge 対応表
- 新 primitive 必要性検証 (例: `wasmModuleGraph`)、必要なら primitive 単独追加 PR を先行
- guard: `wasmRegistryGuard.test.ts` 新設
- COVERAGE_MAP に entry 追加
- decision artifact (R-⑤) を archive に

#### H-δ: COVERAGE_MAP 拡張 + Phase F audit 昇格

- 13 → 15〜16 pair に拡張
- adapter shape baseline を新 guard で設定
- KPI 自動追従確認

### Phase I: Institutionalization (拡張)

- 前駆 project の Phase I で institutionalize 済の §P8/§P9 / canonicalization-checklist.md を **R-① / R-② / R-③ schema** で再構造化
- archive transition (前駆 project と本 project の status 同期更新)
- 後続 project (第 5 の柱: Project Lifecycle Governance) に handoff

## 4. やってはいけないこと

- 前駆 project の Phase A〜I 成果を破壊する変更
- Phase R の 6 reform を「進めながら」分散させる (一度に整える)
- Phase H で Phase R framework を bypass した shortcut migration
- §P8/§P9 を Phase R で「修正」する (拡張は可、変更不可)
- 13 dimension review の deferred 項目を本 project scope に持ち込む (第 5 の柱に handoff)

## 5. 関連実装

| パス | 役割 |
|---|---|
| `app-domain/integrity/` | 前駆 project から継承、Phase R で types schema 拡張 |
| `app/src/test/guards/integrityDomain*Guard.test.ts` | 既存 3 guard、Phase R で dogfooding refactor |
| `tools/architecture-health/src/collectors/integrity-collector.ts` | 既存 collector、Phase R で contract pattern 適用 |
| `references/01-principles/canonicalization-principles.md §P8/§P9` | 不変 (前駆 project 確定)、本 project は 3-zone tag を追加 |
| `references/03-guides/canonicalization-checklist.md` | 本 project Phase R で 3-zone 化 |
| `derived/quality-review.md` | 13 dimension review ground truth |

## 6. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-29 | 初版起草。前駆 project canonicalization-domain-consolidation の Phase A〜I 完遂 + 13 dimension review を input として、Phase R (Framework Reset) + Phase H (Horizontal Expansion) + Phase I (Institutionalization) の 3 phase 構成で立ち上げ。status=draft、Phase 0 bootstrap のみ完遂 |
