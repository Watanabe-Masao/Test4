# plan — canonicalization-domain-consolidation

> **canonical 計画 doc**（2026-04-27 起草）。
> 散在する整合性 (registry+guard) ペアを `app-domain/integrity/` の正本ドメインに統合し、
> 共通パターンを抽出、旧経路を撤退、未正本化領域への横展開も含めた段階展開計画。
>
> **status**: **draft**（plan 起草段階、Phase 0 bootstrap のみ完遂）。
>
> **active project との関係**: 本 project は `phased-content-specs-rollout` と
> 並行可能。本 project が landing したら `pure-calculation-reorg` に続いて
> overlay-active に昇格させる候補となる（CURRENT_PROJECT.md 切替判断は別途）。

## 0. 設計目標（North Star）

> **正本化 → 制度の統一性 → 簡素な仕組みで強固な効果**

3 段は順序関係を持つ:

1. **正本化（Canonicalization）** — 各事実の定義元は 1 箇所。複製は derived view としてのみ存在。
2. **制度の統一性（Institutional Unification）** — 散在する registry+guard ペアを 1 つの domain pattern に統合。同じ問題に同じ仕組みで答える。
3. **簡素な仕組みで強固な効果（Simple Mechanism, Strong Effect）** — 軽い primitive の組合せで、drift 検出強度は妥協しない。複雑な rule を増やすのではなく、共通 primitive の再利用で覆う。

### 設計判断の基準

迷ったら次の質問に戻る:

- これは **正本** を増やすか、複製 (drift 源) を増やすか？
- これは **既存 domain primitive で表現可能** か、それとも新概念を追加するか？
- これは **検出強度を保ちつつ簡素化** するか、強度を犠牲にして簡素化するか？

3 つすべてに「正本 / 既存 primitive / 強度維持」と答えられる変更だけを採用する。

## 1. 経緯と現在地

### 1.1. 起点

`phased-content-specs-rollout` Phase A〜D の進行で、
Spec State Layer (整合性ドメイン) という形が暗黙に出現した。
本 project はこれを以下の 3 段階で正式 domain として recognize し横展開する:

1. **Existing**: 散在している既存 registry+guard ペアの統合
2. **Domain**: `app-domain/integrity/` への共通正本抽出
3. **Horizontal**: 未正本化領域への正本化横展開（必要なもののみ、慎重に）

### 1.2. 散在している整合性ペアの inventory（Phase A で正式化）

現時点で識別できる「registry/契約 ↔ guard」ペア:

| # | registry/契約 | guard | 検証する不変条件 |
|---|---|---|---|
| 1 | `app/src/test/calculationCanonRegistry.ts` | `calculationCanonGuard.test.ts` | domain/calculations/ 全 file の分類整合 |
| 2 | `app/src/application/readModels/<dir>/` 構造 | `canonicalizationSystemGuard.test.ts` | readModel ディレクトリ構造 + Types/index/実装 file 揃い |
| 3 | `docs/contracts/doc-registry.json` | `docRegistryGuard.test.ts` | 全 doc の存在 / README 索引整合 |
| 4 | `docs/contracts/test-contract.json` | `testContractGuard.test.ts` | CLAUDE.md 必須 token / generated section / canonical-pair 等 |
| 5 | `roles/<role>/scope.json` | `scopeJsonGuard.test.ts` / `scopeBoundaryInvariant.test.ts` | role 編集境界の整合 |
| 6 | `responsibilityTaxonomyRegistryV2.ts` / `testTaxonomyRegistryV2.ts` | `taxonomyInterlockGuard.test.ts` / `responsibilityTagGuardV2.test.ts` 等 | taxonomy v2 vocabulary + Antibody Pair 対称性 |
| 7 | `docs/contracts/principles.json` | `principleConsistency.test.ts` (相当) | 設計原則 enum と prose 一致 |
| 8 | `app-domain/gross-profit/rule-catalog/base-rules.ts` + overlays + defaults | `architectureRuleGuard.test.ts` / `architectureRulesMergeSmokeGuard.test.ts` | AAG 4 layer rule の merge 整合 |
| 9 | `app/src/test/allowlists/*.ts` | `allowlistMetadataGuard.test.ts` | ratchet-down baseline + temporal metadata |
| 10 | `projects/<id>/checklist.md` | `checklistFormatGuard.test.ts` / `checklistGovernanceSymmetryGuard.test.ts` | format + governance symmetry |
| 11 | `tools/architecture-health/src/collectors/obligation-collector.ts` `OBLIGATION_MAP` | `obligation-collector` runtime + `architectureRuleGuard` | path → doc 更新義務 |
| 12 | `references/05-contents/` (WID/RM/CALC/CHART/UIC) | `contentSpec*Guard.test.ts` × 11 | spec ↔ source 双方向 + lifecycle + Behavior Claims Evidence Level |
| 13 | `references/03-guides/invariant-catalog.md` | invariant test 群（math invariant） | 数学的不変条件 ↔ 実装計算の整合 |

> 全 13 ペアが「**registry / 契約** + **検出 guard** + (option) collector / generator + (option) ratchet-down baseline」
> という共通形を持っている。本 project はこの **共通形を domain として正本化** することが起点。

#### #12 ペアの Phase J 完遂状態（2026-04-28、reference 実装の供給元）

`phased-content-specs-rollout` Phase A〜J が完遂し、本 project の Phase B
domain skeleton に直接移植可能な「**実体ある reference 実装**」が成立した:

| 軸 | 実態 |
|---|---|
| spec 数 | 89 件（widget 45 / read-model 10 / calculation 24 / chart 5 / ui-component 5）|
| guard 数 | **11 active** (`contentSpec*Guard.test.ts`)、834 test PASS、Hard Gate PASS |
| ratchet-down baseline | **全 0** に到達（J6 coverage / canonical-registration-sync 含む）|
| Behavior Claims | **310 claim** 記載済（各 spec 平均 3.5、Evidence Level enforcement 6 種 active）|
| 共通 helper | `app/src/test/guards/contentSpecHelpers.ts`（**Phase B domain primitive の暗黙の skeleton**）|
| generator | `tools/widget-specs/generate.mjs`（kind dispatch 5 種、`--check` mode、`--inject-jsdoc` mode）|
| collector | `tools/architecture-health/src/collectors/content-spec-collector.ts`（5 KPI、driftBudget threshold）|
| Promote Ceremony | candidate slot 二状態モデル institutionalize 済（planning-only / active candidate split）|

→ Phase B 着手時、本 #12 ペアを **「最初の adapter 化対象」かつ「primitive 抽出 reference」** として優先的に扱う。
   `contentSpecHelpers.ts` の関数群（`parseSpecFrontmatter` / `listAllSpecs` / `findIdLine` /
   `readSourceContent` / kind dispatch / ratchet-down enforcement）が既に
   `app-domain/integrity/{parsing,detection,reporting}/` の各 primitive と 1:1 対応している。

### 1.3. 横展開候補（未正本化領域、Phase A inventory で精査）

「正本化されていないが、その有無で drift が起きうる」領域:

| 領域 | 現状 | 正本化候補の意義 |
|---|---|---|
| `app/src/application/hooks/` | 散在、registry なし | `useXxxBundle` / `useXxxPlan` 系の重複検出 + 命名規約強制 |
| `app/src/presentation/components/charts/` | chart spec なし、5W 不明 | input builder / option builder pair の整合 |
| `app/src/application/stores/` | Zustand store の registry なし | store 数 ratchet / 重複 state 検出 |
| `app/src/application/navigation/pageRegistry.ts` | registry はあるが spec なし | page-level integrity (DEFAULT_*_WIDGET_IDS との整合) |
| `app/src/domain/formatting/` | registry なし | format 関数の F2 文字列カタログ整合 |
| `app/src/domain/constants/` | registry なし | 定数の意味分類 + 重複検出 |
| `wasm/<module>/` | package.json と build 順序のみ | wasm module registry + bridge 対応表 |
| `references/04-design-system/` の token | 一部 registry 化済み | design token と theme.ts の双方向 sync |
| Storage admin / IndexedDB schema | migration script のみ | schema 版数 registry + migration ladder |

> **注意**: 「正本化すべき」=「常に new registry を作るべき」ではない。
> Phase A で **selection rule** を確定し、有効な候補のみを Phase D 以降で対象化する。
> 過剰な canonicalization は手続き過多の典型 (anti-pattern)。

## 2. 不可侵原則

1. **drift 検出強度を弱めない** — リファクタは重複削減のみ、検出される drift 数は同等以上
2. **業務 logic を変更しない** — 整合性メタの統合に閉じる、domain calc / readModel の振る舞いは不変
3. **段階的撤退** — 旧 guard を一斉削除しない。新 domain 経由で並行運用 → 動作同一性検証 → 旧経路を 1 本ずつ sunset
4. **新 registry+guard の追加 ≠ 横展開** — Phase A の selection rule を通過したものだけが正本化対象
5. **phased-content-specs-rollout の進行を妨げない** — 並行 active、必要なら本 project の domain 移行が phased 側を待つ
6. **CURRENT_PROJECT 切替判断は別途** — overlay-active 化は domain landing + 観察期間後に人間判断
7. **「気をつける」rule は作らない** — 全部 mechanism で。検出 / hard fail / ratchet-down で構造化

## 3. 設計思想

### 3.1. domain 抽出の基本方針

```
散在状態:
  registry-1.ts ──→ guard-1.test.ts (固有 parser, 固有 drift detection)
  registry-2.ts ──→ guard-2.test.ts (別の固有 parser, 別の固有 drift detection)
  ...

domain 抽出後:
  registry-1.ts ──┐
  registry-2.ts ──┼──→ app-domain/integrity/ (共通 parser, 共通 drift primitives)
  ...             ┘                    ▲
                                       │
  guard-1.test.ts ─→ adapter (薄い) ───┤
  guard-2.test.ts ─→ adapter (薄い) ───┘
```

### 3.2. domain 内部の最小プリミティブ（仮説、Phase B で確定）

```
app-domain/integrity/
├─ types.ts
│   ├─ Registry<TEntry>             # 抽象 registry
│   ├─ DriftReport                  # 共通 drift 表現
│   ├─ SyncDirection                # one-way | two-way
│   └─ EnforcementSeverity          # warn | gate | ratchet-down
├─ parsing/
│   ├─ jsonRegistry.ts              # JSON registry 共通 loader (json-file → Registry)
│   ├─ tsRegistry.ts                # TS const registry 共通 loader
│   └─ yamlFrontmatter.ts           # YAML frontmatter 共通 loader (spec-state 由来)
├─ detection/
│   ├─ existence.ts                 # 双方向存在検証 primitive
│   ├─ shapeSync.ts                 # 構造一致検証 primitive
│   ├─ ratchet.ts                   # ratchet-down primitive
│   └─ temporal.ts                  # 期限 / freshness primitive
├─ reporting/
│   └─ formatViolation.ts           # 共通 violation formatter
└─ index.ts                         # public API
```

#### Phase J 完遂時点での実装と本 primitive の対応 (2026-04-28)

Phase J（`phased-content-specs-rollout`）が landed した時点で、本 §3.2 の
primitive はすでに `contentSpecHelpers.ts` 内に **実体として存在** する:

| §3.2 予定 primitive | Phase J 既実装 (`contentSpecHelpers.ts` etc.) | Phase B での移送方針 |
|---|---|---|
| `parsing/yamlFrontmatter.ts` | `parseSpecFrontmatter` | **直接 extract**（pure 関数、依存なし）|
| `parsing/tsRegistry.ts` | `CALCULATION_CANON_REGISTRY` 読込パターン | adapter 経由で抽象化（generic化）|
| `parsing/jsonRegistry.ts` | `doc-registry.json` 読込 (Phase C 対象) | 新規実装（spec-state には JSON 系なし）|
| `detection/existence.ts` | `existsSync` + `findIdLine` + canonical-registration-sync の physical path 判定 | **直接 extract**（既に「物理 source 存在で active vs planning 振分」の logic を持つ）|
| `detection/shapeSync.ts` | `frontmatterSync` guard / `coChange` guard | 並行運用 → adapter 化 |
| `detection/ratchet.ts` | J6 coverage baseline / canonical-registration baseline | **直接 extract**（const baseline + `toBeLessThanOrEqual` パターン）|
| `detection/temporal.ts` | `freshness` guard (`reviewCadenceDays` + `lastReviewedAt`) / `lifecycle` guard (sunsetting deadline) | **直接 extract**（`Date` 比較 + 日付 parse）|
| `reporting/formatViolation.ts` | 全 11 guard で共通の `expect(violations, violations.join('\n')).toEqual([])` パターン | **直接 extract**（formatter として generic 化）|

→ Phase B は「ゼロから設計」ではなく「**Phase J が暗黙に実装した primitive を crystallize**」する作業。
   設計コストは大幅に圧縮される。Phase B 完了予測を「**Phase J 完遂前の見積もりの ~30%**」と見直し可能。

### 3.3. 旧経路撤退の規律

各 guard の sunset は **3 step**:

1. **新 domain 経由の guard を並行運用**（旧 guard と同じ違反を検出することを観察）
2. **動作同一性確認**: 1 PR の変更が両 guard で同じ違反を出すこと
3. **旧 guard 物理削除**: `legacy-retirement.md` に sunset 記録、`@deprecated` JSDoc → 物理削除

ratchet-down baseline は domain 側で吸収し、移行後に baseline を 0 化（重複 detection の解消）。

### 3.4. Promote Ceremony との整合

`spec-state` が `phased-content-specs-rollout` で institutionalize した
**Promote Ceremony**（current↔candidate 1 PR 5 同期）は、本 domain でも踏襲する:

- registry+guard の旧経路 sunset は **1 PR で 3 同期**（新 domain entry + 旧 guard @deprecated 化 + ADR 記録）
- 各 sub-phase の完了条件に「旧 guard が同等違反を出していないこと」を機械検証で含める

## 4. Phase 構造（A〜I）

### Phase A: Inventory + Selection Rule 確定

**実施:**

- 既存 13 ペア（§1.2）の正式 inventory（公開列挙 + 各々の不変条件記述）
- 横展開候補（§1.3）の selection rule 確定（複数 caller / 業務意味 / 重複検出有効性 等）
- 候補の優先度付け（tier1 / tier2 / 不採用）
- 共通パターンの抽出（domain skeleton の draft）

**完了条件:**

- inventory 表が `references/03-guides/integrity-pair-inventory.md` に landed
- selection rule が `references/01-principles/canonicalization-principles.md` 拡張版に明文化
- 採用候補リストが `projects/canonicalization-domain-consolidation/derived/` に出力

---

### Phase B: Domain Skeleton

**実施:**

- `app-domain/integrity/` 配置 + types / parsing / detection / reporting の基本 module
- pure 関数の 1 セット（jsonRegistry / tsRegistry / yamlFrontmatter / existence / shapeSync）
- domain 自体の invariant test（domain 純粋性 + 完全性）
- 1 つの参照実装（spec-state 系の adapter 化を先行）

**Phase J との相乗効果（2026-04-28 加筆）:**

`phased-content-specs-rollout` Phase J 完遂時点で、§3.2 primitive 群はすでに
`contentSpecHelpers.ts` 内に **実体として実装済み**。Phase B はこの実体を
`app-domain/integrity/` へ extract する作業に再定義される:

1. `contentSpecHelpers.ts` の各 export を JSDoc で「将来 `app-domain/integrity/<sub>/<name>.ts` に extract 予定」と pre-mark（§3.2 対応表参照）
2. 新 domain primitive を pure 関数として extract（既存 helper を re-export → adapter 経由 → 物理移動）
3. 11 guard が adapter 経由で **同一 violation 集合**を返すことを動作同一性 test で確認（§5 step 1〜2）
4. Phase J で確立した J6 coverage ratchet-down baseline を `detection/ratchet.ts` の reference として extract

**完了条件:**

- domain test 全 PASS
- spec-state 系の guard が domain 経由に切替済み（drift 検出は不変）
- `references/03-guides/integrity-domain-architecture.md` に domain 設計 landed
- `contentSpecHelpers.ts` が `@deprecated` (re-export only) 化、§5 step 3 進入

---

### Phase C: First Migration (lowest risk)

**対象**: doc-registry guard（§1.2 #3）

**実施:**

- doc-registry parsing を `app-domain/integrity/parsing/jsonRegistry.ts` 経由に
- existence check を `detection/existence.ts` 経由に
- 動作同一性検証（1 PR で同 drift を旧 / 新 guard 双方が検出）

**完了条件:**

- 旧 guard と新 domain 経由で **同一 violation 集合**を返す
- 旧 guard を `@deprecated` 化、`legacy-retirement.md` に sunsetCondition 記録

---

### Phase D: Bulk Migration (waves)

**対象**: §1.2 残 11 ペア

**実施波 (1 ペア = 1 PR):**

- Wave 1: calc canon registry / canonicalization-system / test-contract / scope.json (低結合系)
- Wave 2: taxonomy v2 / principles / architecture-rules merge (高結合系)
- Wave 3: allowlists / checklist / obligation-collector / invariant-catalog (運用系)

各 PR で:

- domain 経由 guard 追加
- 旧 guard と動作同一性確認
- 旧 guard `@deprecated` 化 + sunsetCondition

**完了条件:**

- 全 13 ペアが domain 経由
- 旧 guard が全て `@deprecated` 状態（物理削除は Phase E）

---

### Phase E: Legacy Retirement

**実施:**

- Phase C/D で `@deprecated` 化された旧 guard / 旧 parser の物理削除
- 重複していた drift detection logic を削除
- ratchet-down baseline を旧経路から domain 側に統合移行
- `legacy-retirement.md` に各 sunset の actual date 記録

**完了条件:**

- 旧経路 caller = 0
- `architectureRuleGuard` が旧 rule を検出しない（registry から消滅）
- diff: `<削除した重複 logic 行数>` がプラス側

---

### Phase F: Domain Invariant Test

**実施:**

- domain 純粋性 test（domain は I/O を持たない、guard 側に閉じる）
- domain 完全性 test（全 registry pattern が domain primitive で表現可能）
- coverage matrix（どの primitive が何 registry に使われているか）

**完了条件:**

- domain 自体に 95%+ coverage
- coverage matrix が generated section として `architecture-health.md` に出力

---

### Phase G: Architecture-Health KPI 統合

**実施:**

- `integrity.violations.total` (全 registry+guard ペアの violation 合計)
- `integrity.driftBudget` (許容 drift 予算)
- `integrity.expiredExceptions` (期限切れ例外)
- `integrity.consolidationProgress` (旧経路 sunset 比率)

**完了条件:**

- 4 KPI が `architecture-health.json` に出力
- Hard Gate に `integrity.violations.total > 0` を追加

---

### Phase H: Horizontal Expansion (新規正本化)

**実施:**

- Phase A で selection rule 通過した tier1 候補のみを段階導入
- 1 候補 = 1 PR (registry + guard adapter + ratchet-down baseline)
- 最初の候補は `app/src/application/hooks/` の bundle 系（重複検出有効性高）

**完了条件:**

- tier1 候補が landed
- 各候補に integrity domain 経由の guard が active
- tier2 候補は本 phase scope 外（後続 project へ）

---

### Phase I: 制度文書化 + Handoff

**実施:**

- `references/01-principles/integrity-domain.md` を新設（不変条件 / 設計思想 / 撤退規律）
- `references/03-guides/canonicalization-checklist.md`（新 registry+guard を作る人向け checklist）
- Promote Ceremony PR template の整合性版（registry+guard の追加 / 撤退儀式）
- 後続 project への引き継ぎ doc

**完了条件:**

- 新 registry+guard 追加が **既存 domain primitive を再利用** することを規約として固定
- `architectureRuleGuard` に「新 guard が domain 非経由」を検出する rule 追加

---

### Phase 依存グラフ

```text
A ─→ B ─→ C ─→ D ─→ E ─→ F ─→ G ─→ H ─→ I
                          ↑              ↓
                          └──────────────┘
                          (G の KPI で H の優先度を再評価)
```

## 5. 旧経路撤退の規律（不可侵原則 3 の具体化）

各 guard の sunset は次の表に従う:

| step | 旧 guard 状態 | 新 domain guard 状態 | 検証 |
|---|---|---|---|
| 1. 並行運用開始 | active | active | 両 guard が同 PR で同 violation 集合を出す |
| 2. 観察期間 (≥ 1 週間 / 5 PR) | active | active | drift 数の dual-emit が継続 |
| 3. @deprecated 化 | `@deprecated` JSDoc + sunsetCondition + expiresAt | active | `deprecatedMetadataGuard` が認識 |
| 4. 物理削除 | 削除 | active (singular) | caller=0、import grep で 0 件 |
| 5. baseline 統合 | (削除済) | ratchet-down baseline を統合 | `architecture-health` に統合後 KPI 反映 |

各 PR で **1 step だけ進める**。一気に 2 step 以上進めない（観察期間を確保するため）。

## 6. 制度（institution）として作るもの

本 project が成立すると次が新たに institutionalize される:

- **新 registry+guard 追加 checklist** — `references/03-guides/canonicalization-checklist.md`
  - selection rule を通過したか
  - domain primitive で表現可能か
  - ratchet-down baseline は妥当か
  - sunsetCondition を持っているか
- **canonicalization PR template** — registry+guard の追加 / 撤退時に使う
- **integrity domain origin journal** — 新 registry+guard 追加判断のログ（taxonomy-v2 origin journal と同パターン）
- **Promote Ceremony 拡張** — calc current↔candidate 昇格に加えて、registry+guard ペアの旧→新移行も同形 PR で

## 7. やってはいけないこと

- **drift 検出強度の弱体化** — 旧 guard が検出していた drift を新 domain で検出できないなら sunset しない
- **「気をつける」rule の追加** — 全部 mechanism で（rule に判断を要求する記述があれば設計を見直す）
- **新規 registry+guard の一斉導入** — 横展開は 1 候補 = 1 PR、selection rule 通過必須
- **active overlay の自動切替** — CURRENT_PROJECT.md 切替は人間判断、本 project の archive 後に検討
- **phased-content-specs-rollout の侵食** — phased 側の Phase D-J 進行を妨げない、必要なら本 project が待つ
- **business logic への影響** — domain calc / readModel の振る舞いは絶対に変えない（meta レベルの統合のみ）
- **single Write で 500 行級の plan / inquiry 作成** — stream idle timeout に抵触する。skeleton → Edit chunked 方式

## 8. 関連実装

| パス | 役割 |
|---|---|
| `app-domain/integrity/`（新設予定） | 整合性ドメインの正本 (Phase B-) |
| `app/src/test/guards/contentSpec*Guard.test.ts` | 移行先 reference 実装（Phase B 先行） |
| `app/src/test/calculationCanonRegistry.ts` | 移行対象 #1 |
| `app/src/test/responsibilityTaxonomyRegistryV2.ts` / `testTaxonomyRegistryV2.ts` | 移行対象 #6 |
| `app/src/test/architectureRules/` | 移行対象 #8 |
| `tools/widget-specs/generate.mjs` | spec-state 系の generator (Phase B で adapter 化) |
| `tools/architecture-health/src/collectors/` | 移行対象 #11 (obligation-collector 等) |
| `docs/contracts/` | 移行対象 #3, #4, #7 (registry JSON 群) |
| `references/01-principles/canonicalization-principles.md` | Phase A で拡張 |
| `references/03-guides/integrity-domain-architecture.md`（新設予定） | Phase B 成果物 |
| `references/03-guides/integrity-pair-inventory.md`（新設予定） | Phase A 成果物 |
| `references/03-guides/canonicalization-checklist.md`（新設予定） | Phase I 成果物 |

## 9. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-27 | 初版起草。phased-content-specs-rollout の Phase D 進行中に「整合性ドメインを別 project として extract + 横展開も含める」という user 指示で立ち上げ。Phase A〜I 構造 + 6 不可侵原則 + 旧経路撤退規律 5 step を確立。status=draft、Phase 0 bootstrap (project skeleton) のみ完遂、Phase A inventory 着手は別 commit |
| 2026-04-28 | **Phase J 完遂を反映した plan 統合**。`phased-content-specs-rollout` Phase A〜J が landed（11 guard / 89 spec / 310 claim / baseline 全 0）。§1.2 #12 のセルを更新し Phase J 完遂状態を「reference 実装の供給元」として記録。§3.2 に「予定 primitive ↔ Phase J 既実装」対応表を追加。§4 Phase B の実施方針を「ゼロから設計 → Phase J 既実装の crystallize」に再定義し、完了条件に `contentSpecHelpers.ts` の `@deprecated` 化を追加。status=draft 維持（Phase A inventory 着手は別 commit）|
