# plan — phased-content-specs-rollout

> **canonical 計画 doc**（2026-04-26 改訂）。
> Content Spec System (CSS / WSS) を **状態管理レイヤー → 運用制御システム** へ昇華
> させる Phase A〜J 段階展開計画。
>
> **形式**: 独立 active project の plan.md（umbrella `architecture-debt-recovery` archive 後）。
>
> **status**: **active（2026-04-26 改訂、SHELL → ACTIVE 昇格）**。

## 1. 経緯と現在地

### 1.1. 全工程の経緯

| 日付 | 事象 | 出典 |
|---|---|---|
| 2026-04-23 | inquiry/01a で WSS bootstrap landed（`05-contents/widgets/` scaffold + 45 件 型番割当） | umbrella `inquiry/01a-widget-specs-bootstrap.md` |
| 2026-04-25 | SP-A widget-context-boundary archived | `projects/completed/widget-context-boundary/SUMMARY.md` |
| 2026-04-25 | SP-C duplicate-orphan-retirement archived | `projects/completed/duplicate-orphan-retirement/SUMMARY.md` |
| 2026-04-26 | SP-B widget-registry-simplification archived（4 ADR + 4 guard fixed mode + LEG-009 sunset） | `projects/completed/widget-registry-simplification/SUMMARY.md` |
| 2026-04-26 | SP-D aag-temporal-governance-hardening archived（5 guard fixed mode + G8-P20 useMemo 抽出 28 件） | `projects/completed/aag-temporal-governance-hardening/SUMMARY.md` |
| 2026-04-26 | umbrella `architecture-debt-recovery` Phase 7 archived | `projects/completed/architecture-debt-recovery/HANDOFF.md` |
| 2026-04-26 | 全 45 WID-NNN.md spec 本文 landed | `references/05-contents/widgets/WID-001〜045.md` |
| 2026-04-26 | 本 plan canonical 化（旧 inquiry/22 を ACTIVE project へ移管） | 本ファイル |

### 1.2. 現在地

**umbrella + 4 sub-project (SP-A/B/C/D) 全 archive 完遂。45 WID spec 本文 landed。
本 project が Content State Layer Promotion の唯一の active 動線**。

旧版（2026-04-26 初版）は umbrella inquiry/22 として起草され、SP-B Anchor Slice を
起点とする計画だった。SP-B archive 後、archived umbrella 配下に新規 inquiry を
追加することは意味的に不正のため、**独立 active project の canonical plan.md** へ
移管した。

### 1.3. 何が landed していて、何がまだか

| 領域 | landed | 残作業（本 plan の対象） |
|---|---|---|
| WID 型番割当（45 件） | ✅ | — |
| WID-NNN.md spec 本文（45 件、Section 1-9 + frontmatter） | ✅ | — |
| `references/05-contents/README.md`（category 正本） | ✅ | — |
| `doc-registry.json` `contents` category 登録 | ✅ | — |
| SP-B 改修（registry 行冗長 pattern 解消） | ✅ | — |
| SP-D AAG governance（reviewPolicy/allowlist metadata/G8 等） | ✅ | — |
| **`@widget-id WID-NNN` JSDoc の source 注入** | ❌ | **Phase A** |
| **frontmatter generator (`tools/widget-specs/generate.mjs`)** | ❌ | **Phase A** |
| **5 件 `AR-CONTENT-SPEC-*` rule active 化** | ❌ | **Phase A** |
| **`obligation-collector.ts` への OBLIGATION_MAP entry**（registry 変更 → spec 更新義務） | ❌ | **Phase A** |
| **co-change guard / freshness guard / owner guard** | ❌ | **Phase A** |
| RM / PIPE / CALC / PROJ / CHART / UIC の spec | ❌ | **Phase C 〜 F** |
| Storybook / visual evidence 連携 | ❌ | **Phase G** |
| `content-spec-health.json` collector + KPI | ❌ | **Phase H** |
| `content-specs:impact` CLI / PR bot | ❌ | **Phase I** |
| `evidenceLevel` 段階導入 + high-risk 厳格化 | ❌ | **Phase J** |
| **Operational Control System §1〜§11**（Lifecycle / Promotion Gate / Drift Budget 等） | ❌ | **§5 横断** |

## 2. 不可侵原則

1. **「やらないこと」ではなく「順番を後にすること」として明記する**。Phase B〜J を放棄しない
2. 各 Phase は **依存 Phase が完了基準を満たしてから着手**する（Wave 構造）
3. Phase A は **Anchor Slice 5 件**（WID-002 / 006 / 018 / 033 / 040）に限定する
4. 各 Phase の完了条件は **機械検証可能** であること（`checklist.md` の checkbox 化）
5. Content State Layer は **State Correctness のみ保証**（Behavior は test、Decision は ADR、§5.1 の 3 層分離）
6. CLAUDE.md AAG Layer 4A System Operations 規律に準拠（`references/03-guides/project-checklist-governance.md`）
7. ratchet-down baseline を増加方向に戻さない
8. 本 plan は archived umbrella `architecture-debt-recovery` の sub-project ではない（umbrella archive 後に立ち上がった独立 active project）。`config/project.json.parent` は設定しない

## 3. 設計思想

### 3.1. 初回 vertical slice の目的

Phase A の目的は **「対象を網羅すること」ではなく「保証経路を完成させること」**。
次の 4 経路が Anchor Slice 5 件に対して end-to-end で動くことを確認する。

| 経路 | 検証内容 |
|---|---|
| source | `@widget-id WID-NNN` JSDoc が registry 登録 entry に注入されている |
| spec | `references/05-contents/widgets/WID-NNN.md` の frontmatter が source と sync |
| guard | 5 件の `AR-CONTENT-SPEC-*` rule が active で source ↔ spec drift を検出 |
| CI | `npm run docs:check` が drift を hard fail させる |

この 4 経路が Anchor Slice で実用可能なら、後続 Phase は **同じ仕組みの対象拡大**
として段階導入できる。

### 3.2. 対象拡大の優先順位

Phase B〜J は次の方針で順序を決定。

1. **複数 widget / page から参照されるもの優先**（変更影響が大きい）
2. **guard 対象優先**（既存 governance との結線が固い）
3. **legacy 撤退に関係するもの優先**（archived sub-project の sunset 条件と連動）
4. **invariant / 数学的不変条件を持つもの優先**（Phase D Domain Calculations）

Phase F（UI Components）以降は **「全網羅」ではなく selection rule を満たすもののみ**。
過剰網羅は drift コストを上げ、運用負荷を増やす（CLAUDE.md §C9: 現実把握優先 /
05-contents/README.md §「振る舞いの記述」）。

### 3.3. Anchor Slice 5 件の選定根拠

旧 inquiry/22 で SP-B Anchor Slice として選定された 5 件をそのまま Phase A 対象とする。
SP-B archive 後も以下の理由で **保証経路の検証対象として最適**:

| WID | 理由 |
|---|---|
| WID-033（insight-budget-simulator） | 計算 + シミュレーション、複数 readModel 依存、high-risk claim 多数 |
| WID-040（costdetail-kpi-summary） | SP-B ADR-B-004 で component 抽出（CostDetailKpiSummaryWidget）— migration 痕跡が新鮮 |
| WID-018（analysis-performance-index） | PI 値・偏差値計算（domain/calculations 依存） |
| WID-006（chart-sales-purchase-comparison） | SP-B ADR-B-002 で `widgetCtx → widgetContext` rename — migration 痕跡が新鮮 |
| WID-002（chart-daily-sales） | 最も基本的な chart、複数 page から参照、archetype として代表性 |

**重要**: WID 本文 spec は landed 済み（45 件 全て）。Phase A の作業は本文量産ではなく
**source ↔ spec の機械接続（JSDoc 注入 + frontmatter sync + guard active 化）**。

## 4. Phase 構造（A〜J）

### Phase A: Anchor Slice — 保証経路完成

**対象** (5 件):

- WID-033 / WID-040 / WID-018 / WID-006 / WID-002（§3.3 選定根拠）
- 関連 RM / PIPE / CALC / PROJ / CHART を最小追加（Anchor Slice の child のみ、網羅しない）

**実施内容:**

1. `tools/widget-specs/generate.mjs` 実装（source AST → frontmatter 上書き生成）
2. Anchor Slice 5 件の source に `@widget-id WID-NNN` JSDoc 注入
3. 5 件の `AR-CONTENT-SPEC-*` rule を `architectureRules.ts` に登録 + active 化:
   - `AR-CONTENT-SPEC-EXISTS`（存在: registry × spec 双方向突合）
   - `AR-CONTENT-SPEC-FRONTMATTER-SYNC`（構造: generator 再実行後 diff = 0）
   - `AR-CONTENT-SPEC-CO-CHANGE`（構造: registry 行変更 → spec 未更新で fail）
   - `AR-CONTENT-SPEC-FRESHNESS`（時間: lastReviewedAt + reviewCadenceDays 超過で fail）
   - `AR-CONTENT-SPEC-OWNER`（時間: owner 欠落で fail）
4. `obligation-collector.ts` の `OBLIGATION_MAP` に entry 追加（registry 変更 → spec 更新義務）
5. behavior section guard（spec が usage ではなく behavior を記述している検証）
6. content graph（spec 間の依存関係）の初版 collector
7. `npm run content-specs:check` script の追加 + CI 接続

**完了条件:**

- 対象 5 slice で `missingSpec / frontmatterDrift / coChangeViolation = 0`
- source 変更時に spec 未更新なら `npm run docs:check` で hard fail
- Promotion Gate L4 到達（§5.5）

**目的:** 仕組みが現状の archive 後コードベースで実用可能であることを確認する

---

### Phase B: WID 全体への拡張

**対象** (45 件 全 WID):

WID-001 〜 WID-045（既に spec 本文 landed 済み、機械接続のみ追加）

**実施内容:**

- 全 45 WID source に `@widget-id` JSDoc 注入
- frontmatter generator を全 45 件に適用（drift = 0 達成）
- co-change guard を 45 件全体で active 化
- Anchor Slice 以外でも freshness / owner guard が動作することを確認

**完了条件:**

- 全 45 WID で `missingSpec / frontmatterDrift / coChangeViolation = 0`
- 全 45 WID の content graph が生成される
- Promotion Gate L4 到達（45 件全体）

**依存:** Phase A 完遂

---

### Phase C: ReadModels / Pipelines の網羅

**対象:**

- `app/src/application/readModels/`
- `app/src/application/queries/` (queryHandlers + pipelines)
- `app/src/application/projections/`

**優先順位:**

1. SP-B ADR-B-003 で抽出された `customerFact/selectors.ts` 等の新設 readModel
2. 複数 widget から参照されるもの
3. fallback / readiness / comparison scope を持つもの
4. 既存の正本化体系（`canonicalizationSystemGuard.test.ts` 監視対象）に登録済みのもの

**実施内容:**

- `RM-NNN` / `PIPE-NNN` / `QH-NNN` / `PROJ-NNN` の ID 体系を確定
- 新サブカテゴリ `references/05-contents/{read-models,pipelines,query-handlers,projections}/` を追加
- spec body authoring + source tag + frontmatter generator 拡張
- content graph に upstream / downstream 依存を追加

**完了条件:**

- 主要 readModel `missingSpec = 0`
- 主要 pipeline `missingSpec = 0`
- queryHandler / projection の `sourceRef drift = 0`
- pipeline lineage が graph で追跡可能
- Promotion Gate L5 到達

**依存:** Phase B 完遂

---

### Phase D: Domain Calculations の網羅

**対象:** `app/src/domain/calculations/`（selection rule 適用、全関数ではない）

**selection rule:**

- public export
- 複数 consumer
- 数学的不変条件あり（`invariant-catalog.md` 登録済み）
- truth-table / parity test あり
- legacy replacement
- KPI / 粗利 / 予算 / 前年比較など業務意味を持つ計算

**実施内容:**

- `CALC-NNN` ID を割当
- source tag 導入
- spec の invariant section 拡張（`invariant-catalog.md` 参照）
- tests / guards との evidence 紐付け
- Lifecycle State Machine（§5.4）の `sunsetCondition` を deprecated calc に必須化

**完了条件:**

- 対象 CALC `missingSpec = 0`
- 対象 CALC tests 参照 = 100%
- invariant 付き CALC の test 参照 = 100%
- deprecated CALC の `sunsetCondition` = 100%

**依存:** Phase C 完遂

---

### Phase E: Charts へ拡張

**対象:** `app/src/presentation/components/charts/` + `app/src/features/*/ui/charts/`

**優先対象:**

- SP-B で touch された chart（`SalesPurchaseComparisonChart` 等の `*.builders.ts` 新設対象）
- Chart Input Builder Pattern 対象（main で導入された `*.builders.ts` の集合）
- visual regression 対象 chart

**実施内容:**

- `CHART-NNN` ID 割当
- input builder / render model / option builder を spec に記録
- visual test / story / fixture と紐付け
- empty / loading / ready / error state を frontmatter に記録

**完了条件:**

- 主要 chart `missingSpec = 0`
- chart input builder 参照 = 100%
- visual / e2e evidence required の chart で evidence 設定済み

**依存:** Phase D 完遂

---

### Phase F: Selected UI Components

**対象:** `app/src/presentation/components/`（selection rule 適用、全網羅しない）

**selection rule:**

- 複数 widget / page から使われる
- props contract が重い
- readModel / pipeline に依存する
- guard 対象（`responsibilitySeparationGuard` 等で hotspot 化）
- 責務分離違反リスクが高い（`responsibility-separation` allowlist 残数）

**実施内容:**

- `UIC-NNN` ID 割当
- props contract / children / hooks / side effects 記録
- Storybook / visual test 連携を段階導入

**完了条件:**

- 対象 UIC `missingSpec = 0`
- props `sourceRef drift = 0`
- story or visual evidence required 対象の設定完了

**依存:** Phase E 完遂

---

### Phase G: Storybook / Visual Evidence 連携

**対象:** Phase E / F で対象化した chart / UIC

**実施内容（spec 拡張）:**

```yaml
stories:
  - path
visualTests:
  - path
states:
  - loading
  - empty
  - ready
  - error
```

**guard:**

- UI spec に story / visual evidence が必要なのに未設定なら warn / fail
- Chart spec に visual evidence が必要なのに未設定なら warn / fail

**完了条件:**

- 対象 UI / Chart の evidence coverage が基準値以上
- empty / error state の story coverage が基準値以上

**依存:** Phase F 完遂

---

### Phase H: Architecture Health 詳細 KPI 連携

**対象:**

- `references/02-status/generated/content-spec-health.json`（新設）
- `references/02-status/generated/architecture-health.json`（summary 反映）

**追加 KPI:**

```json
{
  "contentSpec.total": 0,
  "contentSpec.byKind": {},
  "contentSpec.missingSpec": 0,
  "contentSpec.frontmatterDrift": 0,
  "contentSpec.coChangeViolation": 0,
  "contentSpec.stale": 0,
  "contentSpec.missingOwner": 0,
  "contentSpec.lifecycleViolation": 0,
  "contentSpec.evidenceCoverage": 0,
  "contentSpec.exceptions.total": 0,
  "contentSpec.exceptions.expired": 0,
  "contentSpec.promotionLevel.distribution": {}
}
```

**完了条件:**

- content-spec-health.json が generated として出る
- architecture-health.json summary に Content Spec カテゴリが反映
- Drift Budget（§5.6）の threshold が設定される
- Promotion Gate L6 到達

**依存:** Phase G 完遂

---

### Phase I: PR Impact Report / Bot 連携

最初は CLI のみ。

```bash
npm run content-specs:impact -- --base main --head HEAD
```

**出力内容:**

- Changed sources
- Affected specs
- Required spec updates
- Affected WID / RM / PIPE / CALC
- Risk level（§5.2 Evidence Level + §5.4 Lifecycle に基づく）

**完了条件:**

- CLI impact report が実用可能
- CI artifact として保存
- 必要なら PR comment bot に昇格

**依存:** Phase H 完遂

---

### Phase J: Claim Evidence Enforcement

**対象:**

- `behaviorClaims`（spec 内 prose section）
- `evidenceLevel`（frontmatter field）

**段階:**

- **J1:** `evidenceLevel` を任意項目として導入
- **J2:** `tested / guarded / reviewed / asserted` を分類
- **J3:** high-risk claim は `asserted` 禁止
- **J4:** `tested` claim は test path 必須
- **J5:** `guarded` claim は guard path 必須

**完了条件:**

- high-risk claim の `evidenceLevel = asserted` が 0
- `tested` claim の test 参照欠落 = 0
- `guarded` claim の guard 参照欠落 = 0

**依存:** Phase I 完遂

---

### Phase 依存グラフ

```text
A ─→ B ─→ C ─→ D ─→ E ─→ F ─→ G ─→ H ─→ I ─→ J
```

各 Phase は前 Phase 完了後に着手（Wave 構造）。

## 5. Operational Control System §1〜§11

Phase A〜J で「実装状態を正確に記録し、drift を防ぐ」状態管理レイヤーを構築するだけ
では不十分。**継続的に正しく使われる運用モデル**まで設計し、Content State Layer を
単なる台帳から **実装状態を取得 → 検証 → 変更レビューに接続 → ライフサイクル管理する
運用制御システム**へ昇華させる。

> **昇華の中心思想**: 「ドキュメントを正しく保つ仕組み」ではなく、
> **「実装状態を取得し、検証し、変更レビューに接続し、ライフサイクル管理する
> 運用制御システム」**として 05-contents を扱う。

### §5.1. 3 種類の「正しさ」を分離する

| 正しさの種類 | 保証する仕組み | Content State Layer が触るか |
|---|---|---|
| **State Correctness** — 実装状態と spec が一致 | generator / frontmatter sync / co-change guard | **触る（保証主体）** |
| **Behavior Correctness** — 振る舞いが test / invariant で期待通り動く | unit test / parity test / invariant / E2E / visual | 触らない（evidence link のみ） |
| **Decision Correctness** — 設計・仕様・業務判断が妥当 | architecture review / business review / ADR | 触らない（reviewer 紐付けのみ） |

**運用ルール**: 各 spec の冒頭と `references/05-contents/README.md` 冒頭にこの 3 層分離
を明記する。「spec が正しい = behavior が正しい」と誤解する誘惑を構造的に防ぐ。

### §5.2. Evidence Level を運用の中心に置く

各 behavior 記述に `evidenceLevel` を付与する。

```yaml
behaviorClaims:
  - id: CLM-001
    claim: "selectedStoreIds が空の場合は全店扱い"
    evidenceLevel: tested
    evidence:
      tests:
        - app/src/application/hooks/storeDaily/useStoreDailyBundle.test.ts
```

| Level | 意味 | 運用 |
|---|---|---|
| `generated` | source から機械生成された事実 | **最強**。CI で保証 |
| `tested` | test で確認済み | behavior 保証に近い |
| `guarded` | guard で防御済み | 構造違反を検出 |
| `reviewed` | 人間レビュー済み | 判断の証跡 |
| `asserted` | 人間が書いただけ | 許すが high-risk では禁止 |
| `unknown` | 根拠不明 | 原則禁止 |

**high-risk claim の判定基準**:

- 計算結果に関わる
- fallback / empty behavior に関わる
- query / pipeline 経路に関わる
- deprecated / retired 判断に関わる

Phase J で段階的に導入する。

### §5.3. PR Impact Report 必須運用

```bash
npm run content-specs:impact -- --base main --head HEAD
```

**PR テンプレ追加項目**:

- [ ] `npm run content-specs:impact` を確認した
- [ ] affected specs を更新した
- [ ] high-risk behavior claim に evidence がある

Phase I で実装する。

### §5.4. Lifecycle State Machine

```text
proposed → active → deprecated → sunsetting → retired → archived
```

| 状態 | 意味 |
|---|---|
| `proposed` | spec 先行。source 未作成または計画中 |
| `active` | 正本として使用中 |
| `deprecated` | 新規使用禁止。既存 consumer あり |
| `sunsetting` | consumer 撤退中。期限あり |
| `retired` | source 削除済み。ID は欠番保持 |
| `archived` | 歴史参照のみ |

**guard で守ること**:

- `deprecated` には `replacedBy` 必須
- `sunsetting` には `sunsetCondition` + `deadline` 必須
- `retired` には active consumer 0 必須
- `active` なのに source がない → fail
- source があるのに `archived` → fail

Phase D 以降で deprecated calc に適用、Phase H で Lifecycle KPI を architecture-health
に登録。

### §5.5. Promotion Gate（成熟度レベル）

| Level | 条件 |
|---|---|
| **L0** | Not tracked |
| **L1** | spec がある（Registered） |
| **L2** | source tag / sourceRef がある（Source-linked） |
| **L3** | generated frontmatter sync がある（Generated-sync） |
| **L4** | co-change / lifecycle / owner guard がある（Guarded） |
| **L5** | high-risk claims に evidence がある（Evidence-backed） |
| **L6** | architecture-health KPI に入っている（Health-tracked） |

**Phase 別到達目標**:

- **Phase A（Anchor Slice 5 件）**: L4 到達
- **Phase B（45 WID 全体）**: L4 到達 + 一部 L5
- **Phase C 〜 D（RM/PIPE/CALC）**: L5 到達
- **Phase H（Architecture Health KPI）**: L6 到達（最終形）

各 spec の frontmatter に `promotionLevel: L4` を持たせ、Phase ごとの到達基準を guard
で機械検証する。

### §5.6. Drift Budget（許容予算）

```json
{
  "contentSpec": {
    "frontmatterDrift": { "budget": 0 },
    "missingOwner": { "budget": 0 },
    "stale": { "budget": 3 },
    "assertedHighRiskClaims": { "budget": 0 },
    "deprecatedWithConsumers": { "budget": 5 }
  }
}
```

| 指標 | 推奨 budget | 理由 |
|---|---|---|
| `frontmatterDrift` | 0 | 機械生成可能、drift 即修正 |
| `missingOwner` | 0 | 必須メタデータ、欠落許容しない |
| `source/spec identity mismatch` | 0 | 存在検証は妥協できない |
| `retiredWithSource` | 0 | lifecycle 不整合 |
| `activeWithoutSource` | 0 | lifecycle 不整合 |
| `stale specs` | 一時 budget 可 | 段階移行中の許容 |
| `deprecatedWithConsumers` | 一時 budget 可 | 撤退過渡期の許容 |
| `low-risk asserted claims` | 一時 budget 可 | high-risk のみ厳格化 |

Phase H で `content-spec-health.json` の budget フィールドに反映する。

### §5.7. archived sub-project SUMMARY との連携

旧版（inquiry/22）は SP-B / SP-D の checklist に Phase A/B を absorb する戦略を持っていた。
**両者 archive 後**は absorption 不要。代わりに次の連携を持つ。

- **archived sub-project の SUMMARY 参照**: SP-B / SP-D archived sub-project の
  SUMMARY.md にある「主要設計決定」（例: SP-B §1「const ctx = props pattern」）を
  対応 WID-NNN.md spec の `Pipeline Concerns / Upstream Requests` に**事実として記録**する
- **legacy-retirement.md 参照**: archived umbrella の `inquiry/17-legacy-retirement.md` 
  + 各 sub-project の `legacy-retirement.md` の `sunsetCondition` を Lifecycle State Machine
  の入力として使う

### §5.8. Exception Policy

```yaml
exceptions:
  - id: CSE-001
    rule: contentSpecCoChangeGuard
    target: WID-033
    reason: "PR2 で source 先行、PR3 で spec 同期予定"
    owner: architecture
    expiresAt: 2026-05-15
    sunsetCondition: "WID-033.md frontmatter sync completed"
```

**例外に必須**: `reason` / `owner` / `expiresAt` / `sunsetCondition`。期限超過例外は
hard fail。Phase H で `architecture-health.json` の `contentSpec.exceptions.{total, expired}` に出す。

### §5.9. Human Review の粒度を固定する

#### レビュー必須

- new content category 追加（widgets / charts 以外の新サブカテゴリ）
- new lifecycle status transition の制度設計
- high-risk asserted claim の登録
- `deprecated` / `retired` への transition
- source tag ID 変更（WID-NNN の再割当）
- content graph relation の手動修正
- guard baseline 変更

#### レビュー不要（自動承認）

- generated frontmatter の通常同期
- `lastVerifiedCommit` 更新
- `sourceRef` line number 更新
- low-risk prose の軽微な文言修正

`reviewPolicy` の owner 設定に反映。

### §5.10. 4 ループの Operational Model

| ループ | 構成 | 担う品質 |
|---|---|---|
| **Capture Loop** | source → generator → spec → graph | State Correctness の取得 |
| **Verification Loop** | guard → test → evidence → CI | State / Behavior の検証 |
| **Change Loop** | PR impact → co-change → review → merge | 変更時の整合保証 |
| **Governance Loop** | owner → freshness → lifecycle → health KPI | 長期運用の制御 |

この 4 ループが回ると、Content State Layer は単なる台帳ではなく
**実装状態の運用制御システム**になる。

### §5.11. Phase との対応マッピング

| Phase | 主に活性化する dimension |
|---|---|
| **A: Anchor Slice** | §5.1（3 層分離）/ §5.5（L4 到達）/ §5.10 Capture + Verification |
| **B: 全 WID** | §5.5（L4 到達 / 一部 L5）/ §5.10 Change Loop |
| **C: ReadModels/Pipelines** | §5.4 Lifecycle 適用開始 / §5.10 Capture Loop 拡張 |
| **D: Domain Calculations** | §5.4 `sunsetCondition` 必須 / §5.2 Evidence Level 試行 |
| **E: Charts** | §5.10 Verification Loop（visual evidence 接続） |
| **F: Selected UI** | §5.9 Human Review 境界の確定 |
| **G: Storybook 連携** | §5.2 evidence path 接続（visualTests / states） |
| **H: Architecture Health KPI** | §5.6 Drift Budget / §5.5 L6 到達 / §5.8 例外 KPI |
| **I: PR Impact Report** | §5.3 必須運用化 / §5.10 Change Loop 完成 |
| **J: Claim Evidence Enforcement** | §5.2 高リスク厳格化 / §5.10 Governance Loop 完成 |

## 6. 最終方針（6 つの不可侵）

1. **対象は Anchor Slice に直結させる** — Phase A の 5 件以外を Phase A に含めない
2. **保証は source / spec / guard / CI まで深く入れる** — 表面だけ整えて drift を放置しない
3. **「初回スコープ外」は段階移行計画に載せる** — 「やらないこと」ではなく「順番を後にすること」として明記する（Phase B〜J を放棄しない）
4. **正しさの種類を分ける** — State / Behavior / Decision の 3 層分離（§5.1）。Content State Layer は State Correctness のみ保証する
5. **証拠を持たせる** — `evidenceLevel`（§5.2）を段階導入。high-risk claim は `asserted` 禁止
6. **運用に組み込む** — PR Impact Report 必須化（§5.3）/ Lifecycle State Machine（§5.4）/ Drift Budget（§5.6）。「仕組みを作る」で終わらせず、「使われ続ける運用モデル」を設計する

## 7. やってはいけないこと

- **Phase A の対象拡大** → Anchor Slice 5 件以外を Phase A に含めると保証経路完成前に重量化する
- **「初回スコープ外」表現の復活** → 不可侵原則 1 違反。「順番を後にすること」として明記する
- **Phase F 以降の全網羅** → selection rule を持たないと drift コストで運用が崩壊する（§3.2 / C9 違反）
- **依存 Phase 未完での先行着手** → Wave 構造を壊し、後続の baseline 戦略が立たない
- **archived umbrella や archived sub-project の touch** → archived は immutable。本 plan は独立 active project（不可侵原則 8）
- **WID-NNN 本文の上書き** → spec 本文は landed 済み。Phase A の作業は frontmatter 同期と source 接続のみ
- **State Correctness と Behavior Correctness の混同** → spec が正しい = behavior が正しい、と書かない（§5.1）
- **single Write で 500 行級の plan / inquiry 作成** → stream idle timeout に抵触する（archived umbrella `HANDOFF.md §3.6`）。skeleton → Edit chunked 方式

## 8. 関連実装

| パス | 役割 |
|---|---|
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当表 |
| `references/05-contents/widgets/WID-001〜045.md` | 全 45 widget spec 本文（landed） |
| `projects/completed/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8、archived umbrella 配下） |
| `projects/completed/architecture-debt-recovery/HANDOFF.md` | umbrella archive 完遂サマリ |
| `projects/completed/widget-context-boundary/SUMMARY.md` | SP-A archive サマリ |
| `projects/completed/widget-registry-simplification/SUMMARY.md` | SP-B archive サマリ（4 ADR + 4 guard fixed mode） |
| `projects/completed/duplicate-orphan-retirement/SUMMARY.md` | SP-C archive サマリ |
| `projects/completed/aag-temporal-governance-hardening/SUMMARY.md` | SP-D archive サマリ（5 guard fixed mode） |
| `app/src/test/architectureRules.ts` | Phase A で `AR-CONTENT-SPEC-*` 5 件を active 化 |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | Phase A で `OBLIGATION_MAP` に entry 追加 |
| `app/src/test/guards/` | Phase A で `AR-CONTENT-SPEC-*` guard 実装 |
| `tools/widget-specs/generate.mjs`（新設予定） | Phase A の frontmatter generator |
| `references/02-status/generated/content-spec-health.json`（新設予定） | Phase H の health collector 出力 |

## 9. 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-26 | 初版起草（umbrella inquiry/22 として、SP-B Anchor Slice + SP-B/D absorption 戦略を起点に Phase A〜J 構造） |
| 2026-04-26 | Operational Control System §1〜§11 を追加（State/Behavior/Decision 分離 / Evidence Level / PR Impact Report / Lifecycle State Machine / Promotion Gate / Drift Budget / SP-B/SP-D checklist 統合 / Exception Policy / Human Review Boundary / 4-Loop Operational Model）。最終方針 5 → 6 |
| 2026-04-26 | **post-archive 改訂**: umbrella + 4 sub-project (SP-A/B/C/D) 全 archive と 45 WID spec 本文 landed を反映。inquiry/22 を **独立 active project の plan.md** に移管（archived umbrella は immutable）。Phase A の作業を「spec 量産」から「source ↔ spec 機械接続（JSDoc + frontmatter generator + AR rule active 化）」に修正。SP-B/D absorption 戦略は §5.7「archived sub-project SUMMARY との連携」に置換 |
