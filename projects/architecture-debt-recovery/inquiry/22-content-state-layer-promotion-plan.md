# inquiry/22 — Content State Layer Promotion 段階展開計画

> **役割**: `inquiry/01a-widget-specs-bootstrap.md` で立ち上げた Widget Spec System (WSS) を、
> SP-B (widget-registry-simplification) の改修と相乗的に **Content State Layer** へと
> 段階的に昇格させる計画書。Wave 2 spawn の補助 inquiry。
>
> **形式**: SP-B を支援する**計画書 / addendum**として運用する。**独立 sub-project では
> 立てない**（umbrella plan.md §3 不可侵原則 #16「Phase 4/5 計画を経由せずに sub-project
> を立ち上げない」遵守 + 軽量起動の原則）。
>
> **status**: **draft（2026-04-26 起草）**。SP-B spawn / SP-B PR1 前後に absorption 可否を
> 確認し、必要に応じ **`18a-content-state-layer-promotion.md`** を作成して正式 sub-project 化
> する（escalation path）。
>
> **判断主体**: `architecture` ロール（pm-business + 人間承認、Phase 4 計画整合性は
> umbrella plan.md §3 Phase 4 に従う）

## 経緯（現在地）

| 日付 | 事象 | 出典 |
|---|---|---|
| 2026-04-23 | inquiry/01a で WSS bootstrap landed（`05-contents/widgets/` scaffold + 45 件 型番割当） | `inquiry/01a-widget-specs-bootstrap.md` |
| 2026-04-25 | **SP-A widget-context-boundary completed / archived** — ctx 型境界 / WidgetDef 分離 / chokepoint narrowing 確定 | `projects/completed/widget-context-boundary/SUMMARY.md` |
| 2026-04-25 | **SP-C duplicate-orphan-retirement completed / archived** | umbrella `HANDOFF.md` |
| 2026-04-25 | **SP-B widget-registry-simplification 起動条件解除済み** | umbrella `HANDOFF.md` §「Wave 2 spawn 高優先」 |
| 2026-04-26 | 本 inquiry 起草（PR #1148 merged, head bc103ea, CI success 確認後） | 本ファイル |

> **更新ポイント**: 旧版「SP-A archive 後に開始可能」→ 新版「**SP-A は 2026-04-25 に archive 完了済み。SP-B は起動条件解除済み。Content State Layer Promotion は SP-B spawn / SP-B PR1 前後の補助計画として投入可能**」。

## 計画として妥当な 4 理由

1. **SP-A が完了済み** — ctx 型境界 / WidgetDef 分離 / chokepoint narrowing が確定したため、
   SP-B で registry simplification に進める前提が整っている
2. **SP-B が次の主対象** — umbrella `HANDOFF.md` 上で次は Wave 2 spawn (SP-B + SP-D-continued
   D-004)
3. **05-contents/widgets は既に存在する** — WSS 45 widget spec scaffold が landed 済み。
   Content State Layer Promotion は **ゼロからの新設ではなく、既存 WSS の昇格**として扱える
4. **SP-B と相乗効果がある** — SP-B は二重 null check / full ctx passthrough / IIFE /
   registry inline logic を触るため、**WID 単位の状態管理 / source ↔ spec 同期 /
   co-change guard の効果が直接出る**

## Phase 構造（A〜J）

### 設計思想

Phase A の目的は **「対象を網羅すること」ではなく「保証経路を完成させること」**。
次の 4 経路が SP-B Anchor Slice に対して end-to-end で動くことを確認する。

| 経路 | 検証内容 |
|---|---|
| source | `@widget-id WID-NNN` JSDoc が registry 登録 entry に注入されている |
| spec | `references/05-contents/widgets/WID-NNN.md` が振る舞いを記録 |
| guard | 5 件の `AR-CONTENT-SPEC-*` rule が active で source ↔ spec drift を検出 |
| CI | `npm run docs:check` が drift を hard fail させる |

この 4 経路が SP-B 改修の vertical slice で実用可能なら、後続 Phase は
**同じ仕組みの対象拡大**として段階導入できる。

Phase F（UI Components）以降は **「全網羅」ではなく selection rule を満たすもののみ**。
過剰網羅は drift コストを上げ、運用負荷を増やす（CLAUDE.md §C9: 現実把握優先）。

### Phase 一覧

| Phase | 対象 | 完了条件 |
|---|---|---|
| **A: SP-B Anchor Slice** | WID-033 / WID-040 / WID-018 / WID-006 / WID-002 + 関連 RM/PIPE/CALC/PROJ/CHART を最小追加 | 対象 5 slice で `missingSpec / frontmatterDrift / coChangeViolation = 0`、`docs:check` で hard fail |
| **B: SP-B 対象全体** | B-001〜B-004 対象 WID 全体 | SP-B 対象 WID `missingSpec / frontmatterDrift / coChangeViolation = 0`、SP-B 範囲の content graph 生成 |
| **C: ReadModels / Pipelines** | `application/readModels/` / `application/queries/` / queryHandlers / projections（SP-B 依存鎖から拡張） | 主要 RM/PIPE `missingSpec = 0`、QH/PROJ `sourceRef drift = 0`、pipeline lineage 追跡可 |
| **D: Domain Calculations** | `domain/calculations/`（invariant / test を持つ重要計算から） | 対象 CALC `missingSpec = 0`、tests 参照 100%、invariant 付き CALC test 参照 100%、deprecated CALC `sunsetCondition` 100% |
| **E: Charts** | `presentation/components/charts/`（SP-B 対象 widget の child chart から） | 主要 chart `missingSpec = 0`、input builder 参照 100%、visual/e2e evidence required で evidence 設定済み |
| **F: Selected UI Components** | 全 UI ではなく **重い責務 / 複数 consumer / SP-B/C/D 影響対象** のみ（selection rule 適用） | 対象 UIC `missingSpec = 0`、props `sourceRef drift = 0`、story/visual evidence 設定 |
| **G: Storybook / Visual Evidence** | UI/Chart の状態証拠（loading / empty / ready / error） | evidence coverage 基準値以上、empty/error state の story coverage 基準値以上 |
| **H: Architecture Health KPI** | `content-spec-health.json` 新設 + summary 反映 | `contentSpec.{total, byKind, missingSpec, frontmatterDrift, coChangeViolation, stale, missingOwner, lifecycleViolation, evidenceCoverage}` の 9 KPI が出力、threshold/budget 設定 |
| **I: PR Impact Report** | `npm run content-specs:impact -- --base main --head HEAD` CLI から開始、必要に応じ PR bot 化 | CLI 実用可能、CI artifact として保存、必要に応じ bot 昇格 |
| **J: Claim Evidence Enforcement** | `evidenceLevel` 段階導入（J1 任意 → J2 4 分類 → J3 high-risk 制限 → J4 tested 必須 → J5 guarded 必須） | high-risk claim `evidenceLevel=asserted` が 0、tested/guarded claim の参照欠落 0 |

### Phase 依存

```text
A ─→ B ─→ C ─→ D ─→ E ─→ F ─→ G ─→ H ─→ I ─→ J
```

各 Phase は前 Phase 完了後に着手（Wave 構造）。

## SP-B への absorption 戦略

本 inquiry は SP-B を支援する計画書として運用する。具体的には次の 3 段階で absorb される。

### 段階 1: SP-B spawn 時（Wave 2）

SP-B (widget-registry-simplification、`projectId: widget-registry-simplification`) の
bootstrap 時に:

- SP-B project の `plan.md` の Phase 構造に **Phase A / B を取り込む**
- SP-B project の `checklist.md` に Phase A / B の完了条件を追加
- 対応する WID-NNN.md の本文量産 PR を ADR-B-001〜004 と同 sprint で実施

> SP-B project root path は spawn 時に確定する。本 inquiry はパス参照を含めない —
> SP-B spawn 時に absorb 側が plan.md / checklist.md を更新する。

> SP-B 内の Phase 構造例:
>
> | SP-B Phase | 内容 |
> |---|---|
> | Phase 1 | guard 追加 (3 guard baseline) — 既存計画 |
> | Phase 2 | selector / helper 実装 — 既存計画 |
> | **Phase 2.5（新規）** | **Content Spec Phase A: Anchor Slice 5 件の保証経路完成** |
> | Phase 3 | registry 行 path 切替 — 既存計画 |
> | **Phase 3.5（新規）** | **Content Spec Phase B: SP-B 対象 WID 全体の spec 同期** |
> | Phase 4 | guard baseline=0 — 既存計画 |

### 段階 2: SP-B 完了後（Wave 3 以降）

Phase C 以降（ReadModels / Pipelines / Calculations / Charts / UI / Storybook / KPI / Impact / Evidence）は SP-B 完了後の sub-project として spawn 判断。

- **軽量パス**: 各 Phase を umbrella の小規模な作業 PR として実施（sub-project 化しない）
- **重量パス**: `inquiry/18a-content-state-layer-promotion.md` を作成して **正式 sub-project 化**（umbrella plan.md §3 Phase 4 計画再評価 → §3 Phase 6 で sub-project bootstrap）

判断基準: Phase C 着手時点で **影響範囲 × ratchet-down baseline 戦略 × 破壊的変更**を再評価。
重量級が必要なら sub-project 化、軽量で済むなら直接実施。

### 段階 3: 必要に応じた sub-project 化

下記 trigger で `18a-content-state-layer-promotion.md` を作成して umbrella 内で正式 sub-project に escalate する。

- Phase C 以降が単一 PR で済まないと判明
- 新 Architecture Rule の active 化を含む
- 破壊的 type 変更（spec frontmatter schema 拡張等）を含む
- ratchet-down baseline 戦略が必要

## 最終方針（6 つの不可侵）

本計画の運用上、以下を不可侵とする。

1. **対象は SP-B に直結させる** — Phase A の 5 件は SP-B Anchor Slice の改修対象。「網羅」目的で対象を拡大しない
2. **保証は source / spec / guard / CI まで深く入れる** — 表面だけ整えて drift を放置しない
3. **「初回スコープ外」は段階移行計画に載せる** — 「やらないこと」ではなく「順番を後にすること」として明記する（Phase B〜J を放棄しない）
4. **正しさの種類を分ける** — State / Behavior / Decision の 3 層分離（§1）。Content State Layer は State Correctness のみ保証する
5. **証拠を持たせる** — `evidenceLevel`（§2）を段階導入。high-risk claim は `asserted` 禁止
6. **運用に組み込む** — PR Impact Report 必須化（§3）/ SP-B/SP-D checklist 統合（§7）/ Lifecycle State Machine（§4）/ Drift Budget（§6）。「仕組みを作る」で終わらせず、「使われ続ける運用モデル」を設計する

## Operational Control System（運用制御システム化）

Phase A〜J で「実装状態を正確に記録し、drift を防ぐ」状態管理レイヤーを構築するだけ
では不十分。**継続的に正しく使われる運用モデル**まで設計し、Content State Layer を
単なる台帳から **実装状態を取得 → 検証 → 変更レビューに接続 → ライフサイクル管理する
運用制御システム**へ昇華させる。

> **昇華の中心思想**: 「ドキュメントを正しく保つ仕組み」ではなく、
> **「実装状態を取得し、検証し、変更レビューに接続し、ライフサイクル管理する
> 運用制御システム」**として 05-contents を扱う。

### §1. 3 種類の「正しさ」を分離する

運用上の混乱と過剰期待を防ぐため、正しさを 3 層に分ける。
**Content State Layer が直接保証するのは §1 の State Correctness のみ**。

| 正しさの種類 | 保証する仕組み | Content State Layer が触るか |
|---|---|---|
| **State Correctness** — 実装状態と spec が一致 | generator / frontmatter sync / co-change guard | **触る（保証主体）** |
| **Behavior Correctness** — 振る舞いが test / invariant で期待通り動く | unit test / parity test / invariant / E2E / visual | 触らない（evidence link のみ） |
| **Decision Correctness** — 設計・仕様・業務判断が妥当 | architecture review / business review / ADR | 触らない（reviewer 紐付けのみ） |

**運用ルール**: 各 spec の冒頭と `references/05-contents/README.md` 冒頭にこの 3 層分離
を明記する。「spec が正しい = behavior が正しい」と誤解する誘惑を構造的に防ぐ。

### §2. Evidence Level を運用の中心に置く

prose の正しさは完全には機械保証できない。各 behavior 記述に `evidenceLevel` を付与する。

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

**昇華ポイント**: 全 claim を最初から厳格化しない。**high-risk claim だけ
`asserted` 禁止**。

**high-risk claim の判定基準**:

- 計算結果に関わる
- fallback / empty behavior に関わる
- query / pipeline 経路に関わる
- deprecated / retired 判断に関わる
- SP-B / SP-D の完了条件に関わる

Phase J（Claim Evidence Enforcement）で段階的に導入する。

### §3. PR ごとの Impact Report を必須運用にする

状態管理は **PR レビューで使われて初めて意味がある**。SP-B 以降の PR で次を必須化する。

```bash
npm run content-specs:impact -- --base main --head HEAD
```

**出力例**:

```
Changed sources:
  app/src/presentation/pages/Insight/widgets.tsx
Affected specs:
  WID-033
  PIPE-001
  CALC-002
Required actions:
  - WID-033 frontmatter sync required
  - WID-033 behavior review required
  - PIPE-001 co-change required
Risk:
  medium
Reason:
  SP-B B-001 null-check removal target
```

**PR テンプレ追加項目**:

- [ ] `npm run content-specs:impact` を確認した
- [ ] affected specs を更新した
- [ ] high-risk behavior claim に evidence がある

Phase I（PR Impact Report）で実装する。

### §4. Lifecycle State Machine を導入する

`active / deprecated / retired` だけでは粗い。**6 状態の遷移**を明示する。

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

これにより「後で消す」が曖昧に残ることを防ぐ。Phase D（Domain Calculations）以降で
`sunsetCondition 100%` の完了条件と接続する。

### §5. Promotion Gate（成熟度レベル）

カテゴリをいきなり全て fixed mode にしない。**6 レベルの成熟度**を持たせる。

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

- **Phase A（SP-B Anchor Slice）**: L4 到達を初期完了条件
- **Phase B（SP-B 全体）**: L5 到達を目指す
- **Phase H（Architecture Health KPI）**: L6 到達を最終形

各 spec の frontmatter に `promotionLevel: L4` を持たせ、Phase ごとの到達基準を
guard で機械検証する。

### §6. Drift Budget（許容予算）

すべてを常に 0 にできるとは限らない。許容するなら**予算化する**。

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

Phase H（Architecture Health KPI）で `content-spec-health.json` の budget フィールドに
反映する。

### §7. SP-B / SP-D 完了条件への組み込み

Content State Layer を**独立した理想論にしない**ため、SP-B / SP-D の checklist に
直接組み込む。

#### SP-B (widget-registry-simplification) checklist 追加項目

- [ ] 対象 WID の content spec が更新済み
- [ ] 対象 WID の `frontmatterDrift = 0`
- [ ] full ctx passthrough 削除後、`consumedCtxFields` が同期済み
- [ ] null check 削除後、Empty / Error Behavior が更新済み
- [ ] inline logic 抽出先 CALC / PROJ / PIPE spec が作成済み
- [ ] high-risk behavior claim に `tested` / `guarded` evidence がある

#### SP-D (aag-temporal-governance-hardening) checklist 追加項目

- [ ] content spec の `owner` / `reviewCadence` が必須化済み
- [ ] `deprecated` / `retired` lifecycle guard が有効
- [ ] freshness guard の baseline が明示されている
- [ ] allowlist 例外には `expiresAt` / `sunsetCondition` がある

これにより Content State Layer が「別 project」ではなく **SP-B / SP-D の成功条件**
となる。SP-B spawn 時の checklist absorption（§段階 1）で同時に実施。

### §8. Exception Policy（例外運用）

どんな仕組みでも例外は発生する。**例外を許すなら形式を固定する**。

```yaml
exceptions:
  - id: CSE-001
    rule: contentSpecCoChangeGuard
    target: WID-033
    reason: "SP-B PR2 で source 先行、PR3 で spec 同期予定"
    owner: architecture
    expiresAt: 2026-05-15
    sunsetCondition: "WID-033.md frontmatter sync completed"
```

**例外に必須**:

- `reason`（なぜ許容するか）
- `owner`（誰の責任か）
- `expiresAt`（いつまで許容するか）
- `sunsetCondition`（何が起きたら例外を取り下げるか）

例外数も `architecture-health.json` の `contentSpec.exceptions.{total, expired}` に出す。
**期限超過例外は hard fail** とする。

### §9. Human Review の粒度を固定する

人間レビューが必要な箇所を絞る。**全部レビューすると重すぎる**。

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

これで運用負荷を抑える。`reviewPolicy` の owner 設定に反映。

### §10. 4 ループの Operational Model

最終形は次の **4 ループが同時に回る状態**。

| ループ | 構成 | 担う品質 |
|---|---|---|
| **Capture Loop** | source → generator → spec → graph | State Correctness の取得 |
| **Verification Loop** | guard → test → evidence → CI | State / Behavior の検証 |
| **Change Loop** | PR impact → co-change → review → merge | 変更時の整合保証 |
| **Governance Loop** | owner → freshness → lifecycle → health KPI | 長期運用の制御 |

この 4 ループが回ると、Content State Layer は単なる台帳ではなく
**実装状態の運用制御システム**になる。

### §11. Phase との対応マッピング

§1〜§10 と Phase A〜J の対応を明示する。Phase 着手時にどの operational dimension が
活性化されるかを管理する。

| Phase | 主に活性化する dimension |
|---|---|
| **A: Anchor Slice** | §1（3 層分離）/ §5（L4 到達）/ §10 Capture + Verification |
| **B: SP-B 全体** | §5（L5 到達）/ §7 SP-B checklist 統合 / §10 Change Loop |
| **C: ReadModels/Pipelines** | §4 Lifecycle 適用開始 / §10 Capture Loop 拡張 |
| **D: Domain Calculations** | §4 `sunsetCondition` 必須 / §2 Evidence Level 試行 |
| **E: Charts** | §10 Verification Loop（visual evidence 接続） |
| **F: Selected UI** | §9 Human Review 境界の確定 |
| **G: Storybook 連携** | §2 evidence path 接続（visualTests / states） |
| **H: Architecture Health KPI** | §6 Drift Budget / §5 L6 到達 / §8 例外 KPI |
| **I: PR Impact Report** | §3 必須運用化 / §10 Change Loop 完成 |
| **J: Claim Evidence Enforcement** | §2 高リスク厳格化 / §10 Governance Loop 完成 |

## 関連

| 文書 | 役割 |
|---|---|
| `inquiry/01a-widget-specs-bootstrap.md` | WSS bootstrap 決定（D1〜D8） |
| `inquiry/18-sub-project-map.md` | SP-A〜D 依存関係（SP-B が次の主対象） |
| `inquiry/21-spawn-sequence.md` | sub-project 立ち上げ順序 |
| `references/05-contents/README.md` | CSS カテゴリ正本（3 軸 drift 防御 + frontmatter 共通スキーマ） |
| `references/05-contents/widgets/README.md` | WID-001〜045 型番割当 |
| `projects/completed/widget-context-boundary/SUMMARY.md` | SP-A archive 完了（2026-04-25）|
| umbrella `plan.md` §3 不可侵原則 #16 | sub-project spawn は Phase 4/5 計画経由必須 |
| umbrella `HANDOFF.md` §「Wave 2 spawn 高優先」 | SP-B 起動条件解除済み |

## 進捗ノート（addendum 規約）

本 inquiry は **draft → SP-B absorption 確認 → final** の 3 状態を持つ。
状態遷移時は本ファイル冒頭の **status** を更新する（人間承認時刻 + 承認者ロール明記）。

`inquiry/17 §再発防止規約 5` に従い、本 file 自体は**追記のみ可能**。
Phase A〜J の構造変更が必要になった場合は **`22a-*.md` addendum** を作成する。

### 改訂履歴

| 日付 | 変更 |
|---|---|
| 2026-04-26 | 初版起草（Phase A〜J + SP-B absorption 戦略 + 最終方針 5 つ） |
| 2026-04-26 | **Operational Control System §1〜§11 を追加**（State/Behavior/Decision 分離 / Evidence Level / PR Impact Report / Lifecycle State Machine / Promotion Gate / Drift Budget / SP-B/SP-D checklist 統合 / Exception Policy / Human Review Boundary / 4-Loop Operational Model）。最終方針を 5 → **6 つ**に拡張（「運用に組み込む」を追加） |
