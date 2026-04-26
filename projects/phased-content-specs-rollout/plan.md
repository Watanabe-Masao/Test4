# plan — phased-content-specs-rollout

> Content Spec System (CSS / WSS) の段階展開計画。
> 「初回スコープ外」を「順番を後にすること」として明記する。
>
> 起点: `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` の
> bootstrap 完了（WSS scaffold + 45 件 型番割当 landed、2026-04-23）。

## 不可侵原則

1. **「やらないこと」ではなく「順番を後にすること」として明記する**。Phase B〜J を放棄しない
2. 各 Phase は **依存 Phase が完了基準を満たしてから着手**する（Wave 化）
3. Phase A は **SP-B Anchor Slice** に限定する（拡大すると保証経路完成前に重量化）
4. 各 Phase の完了条件は **機械検証可能** であること（`checklist.md` の checkbox 化）
5. 本 project は **計画の正本**を持つだけで、実装は依存 sub-project の責務
6. CLAUDE.md AAG Layer 4A System Operations 規律に準拠（`references/03-guides/project-checklist-governance.md`）
7. ratchet-down baseline を増加方向に戻さない（既存原則の継承）

## 設計思想

### 初回 vertical slice の目的

Phase A（SP-B Anchor Slice）の目的は **「対象を網羅すること」ではなく
「保証経路を完成させること」**。次の 4 経路が SP-B Anchor Slice に対して
end-to-end で動くことを確認する。

| 経路 | 検証内容 |
|---|---|
| source | `@widget-id WID-NNN` JSDoc が registry 登録 entry に注入されている |
| spec | `references/05-contents/widgets/WID-NNN.md` が振る舞いを記録 |
| guard | 5 件の `AR-CONTENT-SPEC-*` rule が active で source ↔ spec drift を検出 |
| CI | `npm run docs:check` が drift を hard fail させる |

この 4 経路が SP-B 改修の vertical slice で実用可能なら、後続 Phase は
**同じ仕組みの対象拡大**として段階導入できる。

### 対象拡大の優先順位

Phase B〜J は次の方針で順序を決定。

1. **SP-B 改修で触るもの優先**（実装が必要な範囲を先に網羅）
2. **複数 widget / page から参照されるもの優先**（変更影響が大きい）
3. **guard 対象優先**（既存 governance との結線が固い）
4. **legacy 撤退に関係するもの優先**（SP-C / SP-D 完了との連動）

Phase F（UI Components）以降は **「全網羅」ではなく selection rule を満たすもののみ**。
過剰網羅は drift コストを上げ、運用負荷を増やす（C9: 現実把握優先）。

## Phase 構造

### Phase A: SP-B Anchor Slice 完成

**対象** (5 件、SP-B Anchor Slice + 関連 RM/PIPE/CALC/PROJ/CHART):

- WID-033（insight-budget-simulator）
- WID-040（costdetail-kpi-summary）
- WID-018（analysis-performance-index）
- WID-006（chart-sales-purchase-comparison）
- WID-002（chart-daily-sales）

**実施内容:**

- source tag（`@widget-id WID-NNN` JSDoc）注入
- spec 作成（5 件の `WID-NNN.md` 本文量産）
- generated frontmatter（generator 実装後の上書き）
- source ↔ spec 双方向照合
- co-change guard（`AR-CONTENT-SPEC-CO-CHANGE`）
- governance guard（`AR-CONTENT-SPEC-EXISTS` / `AR-CONTENT-SPEC-FRONTMATTER-SYNC` / `AR-CONTENT-SPEC-FRESHNESS` / `AR-CONTENT-SPEC-OWNER`）
- behavior section guard（spec が usage ではなく behavior を記述している検証）
- content graph（spec 間の依存関係）
- `content-specs:check` script
- CI 接続（`docs:check` で hard fail）

**完了条件:**

- 対象 5 slice で drift = 0
- source 変更時に spec 未更新なら CI fail
- frontmatter 差分があれば CI fail

**目的:** 仕組みが実際に SP-B の改修に使えることを確認する

---

### Phase B: SP-B 対象全体へ拡張

**対象** (SP-B で触る全 widget):

- B-001（widget-context-boundary 関連）対象 WID
- B-002（registry-simplification）対象 WID
- B-003（IIFE 抽出）対象 WID
- B-004（registry inline logic 解消）対象 WID

**実施内容:**

- 対象 WID の spec を全件同期
- 必要な RM / PIPE / CALC / PROJ / CHART を追加
- content graph を SP-B 範囲で完成
- co-change guard を SP-B 対象全体に拡張

**完了条件:**

- SP-B 対象 WID の `missingSpec = 0`
- SP-B 対象 WID の `frontmatterDrift = 0`
- SP-B 対象 WID の `coChangeViolation = 0`
- SP-B 対象の依存 graph が生成される

**目的:** SP-B 完了時に、registry simplification の実装状態を正確に固定する

**依存:** Phase A 完了 + SP-B Anchor Slice の保証経路稼働

---

### Phase C: ReadModels / Pipelines の網羅

**対象:**

- `app/src/application/readModels/`
- `app/src/application/queries/` (pipelines)
- `app/src/application/queries/` (queryHandlers)
- `app/src/application/projections/`

**優先順位:**

1. SP-B で参照されたもの
2. 複数 widget から参照されるもの
3. guard 対象のもの
4. fallback / readiness / comparison scope を持つもの
5. legacy 撤退に関係するもの

**実施内容:**

- `RM-NNN` / `PIPE-NNN` / `QH-NNN` / `PROJ-NNN` の ID 体系を確定
- source tag を導入
- spec を拡張
- content graph に upstream / downstream を追加
- lineage relation を生成

**完了条件:**

- 主要 readModel `missingSpec = 0`
- 主要 pipeline `missingSpec = 0`
- queryHandler / projection の `sourceRef drift = 0`
- pipeline lineage が graph で追跡可能

**目的:** データ取得・変換・配布経路の現状を機械的に把握できる状態にする

**依存:** Phase B 完了

---

### Phase D: Domain Calculations の網羅

**対象:** `app/src/domain/calculations/`

ただし、全関数ではなく以下に限定:

- public export
- 複数 consumer
- 数学的不変条件あり
- truth-table / parity test あり
- legacy replacement
- KPI / 粗利 / 予算 / 前年比較など業務意味を持つ計算

**実施内容:**

- `CALC-NNN` ID を割当
- source tag 導入
- invariant section 追加
- tests / guards と紐付け
- `evidenceLevel: tested` を増やす

**完了条件:**

- 対象 CALC `missingSpec = 0`
- 対象 CALC tests 参照 = 100%
- invariant 付き CALC の test 参照 = 100%
- deprecated CALC の `sunsetCondition = 100%`

**目的:** 計算契約の現状を固定し、意味的正しさに近い部分を test で補強する

**依存:** Phase C 完了

---

### Phase E: Charts へ拡張

**対象:** `app/src/presentation/components/charts/`

**優先対象:**

- SP-B 対象 widget の child chart
- Chart Input Builder Pattern 対象
- option builder を持つ chart
- visual regression 対象 chart

**実施内容:**

- `CHART-NNN` ID 割当
- input builder / render model / option builder を記録
- visual test / story / fixture と紐付け
- empty / loading / ready / error state を記録

**完了条件:**

- 主要 chart `missingSpec = 0`
- chart input builder 参照 = 100%
- visual / e2e evidence が必要な chart で evidence 設定済み

**目的:** chart の入力・変換・描画責務を状態管理対象にする

**依存:** Phase D 完了

---

### Phase F: UI Components へ拡張

**対象:** `app/src/presentation/components/`（selection rule 適用）

**対象条件（全網羅しない）:**

- 複数 widget / page から使われる
- props contract が重い
- readModel / pipeline に依存する
- guard 対象
- 責務分離違反リスクが高い
- SP-B / SP-C / SP-D の改修で触る

**実施内容:**

- `UIC-NNN` ID 割当
- props contract 記録
- children / hooks / side effects 記録
- Storybook / visual test 連携を段階導入

**完了条件:**

- 対象 UIC `missingSpec = 0`
- props `sourceRef drift = 0`
- story or visual evidence required 対象の設定完了

**目的:** UI component の状態を過剰網羅せず、変更影響が大きいものだけ管理する

**依存:** Phase E 完了

---

### Phase G: Storybook / Visual Evidence 連携

**対象:**

- `app/src/presentation/components/`
- `app/src/presentation/components/charts/`
- selected widgets（Phase F 対象）

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

**目的:** UI 系の振る舞い説明を実行可能な証拠と接続する

**依存:** Phase F 完了

---

### Phase H: Architecture Health 詳細 KPI 連携

**対象:**

- `references/02-status/generated/architecture-health.json`
- `references/02-status/generated/content-spec-health.json`（新設）

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
  "contentSpec.evidenceCoverage": 0
}
```

**完了条件:**

- content spec health が generated status に出る
- architecture-health summary に反映
- threshold / budget が設定される

**目的:** Content State Layer を architecture health の正式 KPI に昇格する

**依存:** Phase G 完了

---

### Phase I: PR Impact Report / Bot 連携

最初は CLI のみ。

```bash
npm run content-specs:impact -- --base main --head HEAD
```

後で PR comment bot 化。

**出力内容:**

- Changed sources
- Affected specs
- Required spec updates
- Affected WID / RM / PIPE / CALC
- SP-B / SP-C / SP-D relation
- Risk level

**完了条件:**

- CLI impact report が実用可能
- CI artifact として保存
- 必要なら PR comment bot に昇格

**目的:** レビュー時に影響範囲を即座に把握できるようにする

**依存:** Phase H 完了

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

**目的:** 人間 prose の信頼度を段階的に可視化し、重要主張だけ証拠必須にする

**依存:** Phase I 完了

---

## Phase 依存グラフ

```text
A ─→ B ─→ C ─→ D ─→ E ─→ F ─→ G ─→ H ─→ I ─→ J
│                                              
└── 各 Phase は前 Phase 完了後に着手 (Wave 構造)
```

| Phase | 着手前提 |
|---|---|
| A | umbrella inquiry/01a Phase 6 generator + AR rule active |
| B | A 完遂 + SP-B B-001〜004 着手中 |
| C | B 完遂 |
| D | C 完遂 |
| E | D 完遂 |
| F | E 完遂 |
| G | F 完遂 |
| H | G 完遂 |
| I | H 完遂 |
| J | I 完遂 |

## やってはいけないこと

- **Phase A の対象拡大** → SP-B Anchor Slice 5 件以外を Phase A に含めると保証経路完成前に重量化する
- **Phase B 以降を本 project 単独で実装** → 実装は依存 sub-project の責務。本 project は計画の正本
- **「初回スコープ外」表現の復活** → 不可侵原則 1 違反。「順番を後にすること」として明記する
- **Phase F 以降の全網羅** → selection rule を持たないと drift コストで運用が崩壊する（C9 違反）
- **依存 Phase 未完での先行着手** → Wave 構造を壊し、後続の baseline 戦略が立たない

## 関連実装

| パス | 役割 |
|---|---|
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当表 |
| `projects/architecture-debt-recovery/inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `projects/architecture-debt-recovery/inquiry/18-sub-project-map.md` | SP-A〜D 依存関係 |
| `app/src/test/architectureRules.ts` | Phase 6 で `AR-CONTENT-SPEC-*` 5 件を active 化（Phase A 着手前提） |
| `tools/architecture-health/src/collectors/obligation-collector.ts` | OBLIGATION_MAP に source 変更 → spec 更新義務（Phase A） |
| `app/src/test/guards/` | Phase A で `AR-CONTENT-SPEC-*` guard を実装 |
