# HANDOFF — architecture-debt-recovery

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 1-5 完了 / Wave 0 切替 landed / Wave 1 3 sub-project spawn 済み（2026-04-23）。status: `active`。`CURRENT_PROJECT.md` = `architecture-debt-recovery`（sub-project 作業開始時に個別切替）。**

### Wave 1 spawn 済み sub-project（本 commit）

| id | lane | status | ADR / 推定 PR |
|---|---|---|---|
| `widget-context-boundary` | A | active | A-001〜A-004 / 16 PR |
| `duplicate-orphan-retirement` | C | active | C-001〜C-004 / 14 PR |
| `aag-temporal-governance-hardening` | D | active | D-001/002/005/006 先行 12 PR、D-003/004 Wave 2-3 |

SP-B（widget-registry-simplification）は SP-A completed 後に Wave 2 で spawn。

本 project は `budget-achievement-simulator` の reboot で表面化した widget 複雑化問題を起点に、
**widget / pure 関数 / 型 / コンポーネント / データパイプライン / レガシー撤退** を
一体として扱う大型改修 umbrella project。

**解決方針の核**: 「人が気をつける」ではなく、**「CI・型・台帳・Phase gate で止める」** 仕組み化。
発見した負債は必ず以下のいずれかに変換する — 型 / guard / checklist gate / generated health / legacy retirement list / sub-project 4 step 完了条件。

### 2026-04-23 時点の landed

#### Phase 0 scaffold（完了）
- `projects/architecture-debt-recovery/` を `_template` からコピー
- `config/project.json`（`status: "draft"`）/ `AI_CONTEXT.md` / `plan.md`（不可侵 16 + Phase 1-7 + 禁止 20）
- `checklist.md`（Phase 0-7 + 最終レビュー。Phase 0 全 [x]、Phase 1 全 [x]、Phase 2 review 以外 [x]、Phase 3 review 以外 [x]）
- `aag/execution-overlay.ts` draft 初期
- 派生セット（`derived/pr-breakdown.md` / `review-checklist.md` / `test-plan.md` / `inventory/`）

#### Phase 1 inquiry（作成済み、review は完了）
- `inquiry/01-widget-registries.md`（10 独立 registry + 2 合成 + 3 複製、45 widget 網羅台帳）
- `inquiry/01a-widget-specs-bootstrap.md`（WSS bootstrap 決定 D1-D8）
- `inquiry/02-widget-ctx-dependency.md`（ctx field 使用 map + 逆引き + 統計）
- `inquiry/03-ui-component-orphans.md`（Tier D orphan 3 件確定）
- `inquiry/04-type-asymmetry.md`（WidgetDef 2 型 + page-coupled ctx 非対称）
- `inquiry/05-pure-fn-candidates.md`（pure 計算候補 95 件、7 パターン）
- `inquiry/06-data-pipeline-map.md`（page-local / readModel / handler 非統一）
- `inquiry/07-complexity-hotspots.md`（hotspot top 10 + 関連 KPI）
- `inquiry/08-ui-responsibility-audit.md`（C8 適用 + P2-P18 baseline）

#### Phase 2 真因分析（作成済み、architecture review 未了）
- `inquiry/09-symptom-to-hypothesis.md`（6 症状群 × 20 仮説、単一原因帰着拒否）
- `inquiry/10-hypothesis-interaction.md`（相互作用 + 4 共通構造源 D-1〜D-4）
- `inquiry/10a-wss-concern-link.md`（**addendum**: WSS 45 widget concern と J/INV/R の連結 map、12 category 主マッピング + evidence strength + 未カバー 6 件）
- `inquiry/11-recurrence-pattern.md`（既存対策 7 機構 + 8 抜け目）

#### Phase 3 原則候補（作成済み、architecture review 未了）
- `inquiry/12-principle-candidates.md`（J1-J8 原則候補 8 件、各 migrationRecipe + sunsetCondition 付記）
- `inquiry/13-invariant-candidates.md`（INV-J1-A〜INV-J8-A 12 不変条件 + guard 粗設計 + baseline）
- `inquiry/14-rule-retirement-candidates.md`（R-1〜R-7、廃止 0 / Reformulate 4 / Keep-extend 3）

#### WSS（Widget Spec System）Step 0 + 45 widget spec
- `references/05-contents/README.md`（category 正本：現状把握台帳、3 軸 drift 防御、振る舞い記述）
- `references/05-contents/widgets/README.md`（45 件型番割当表 + format + freshness policy）
- `references/05-contents/widgets/WID-001〜WID-045.md`（全 45 widget spec、各 Section 1-9 + YAML frontmatter）
- `docs/contracts/doc-registry.json` に `contents` category 追加（README + 45 spec 登録）
- `references/README.md` 構造表 + 45 件索引

### Phase 5 完了時の landed（Wave 0 切替 PR）

1. **Phase 2 / Phase 3 / Phase 4 人間承認完了**（checklist 全 Phase の review / 合意 / 承認 box [x]）
2. **Phase 5 inquiry/19-21 作成済み**（予定 → 本 commit で landed）
3. **Wave 0 切替 PR 実施済み**（本 commit）:
   - `projects/completed/budget-achievement-simulator/SUMMARY.md` 作成
   - `budget-achievement-simulator.status: active → completed`
   - `projects/completed/budget-achievement-simulator/` → `projects/completed/budget-achievement-simulator/` に物理移動
   - `architecture-debt-recovery.status: draft → active`
   - `CURRENT_PROJECT.md` を `architecture-debt-recovery` に切替
   - `open-issues.md` の active 欄に本 project、archived 欄に budget-achievement-simulator を追加
   - 本 HANDOFF §1 を同期（本 edit）

### 触っていないもの（原則通り保留）

- コード本体（`app/src/`）は Wave 1 sub-project spawn 開始まで未 touch（Phase 6 実装で sub-project が順次改修）
- `references/01-principles/`（Phase 3 原則候補は人間承認済み、ただし正本登録は Phase 6 の各 sub-project で実施）
- `docs/contracts/principles.json`（同上）

## 2. 次にやること

詳細は `checklist.md` を参照。Phase 5 完了。次は **Wave 1 spawn**（SP-A / SP-C / SP-D-partial の並行 spawn）。

### 高優先（Wave 1 spawn、並行着手可能、inquiry/21 参照）

Wave 0 完了後、以下 3 sub-project を並行 spawn 可能:

- **SP-A widget-context-boundary** — 4 ADR（A-001〜A-004）+ 8 legacy（LEG-001〜008）+ 4 guard。16 PR 想定
- **SP-C duplicate-orphan-retirement** — 4 ADR（C-001〜C-004）+ 6 legacy（LEG-010〜015）+ BC-5。14 PR 想定
- **SP-D-partial aag-temporal-governance-hardening**（4 ADR 先行）:
  - ADR-D-001 reviewPolicy required + 92 件 bulk
  - ADR-D-002 allowlist metadata required
  - ADR-D-005 generated remediation.{md,json}
  - ADR-D-006 projectDocConsistencyGuard

### 中優先

- 各 sub-project の spawn PR は `inquiry/21 §spawn PR テンプレート` の 8 step に従う
- sub-project spawn 時に `CURRENT_PROJECT.md` を対応 sub-project に切替（`inquiry/20 §sub-project spawn テンプレート`）
- 並行着手時の作業規律は `inquiry/21 §並行着手時の作業規律` 5 項に従う

### Wave 2（SP-A completed 後）

- SP-B widget-registry-simplification
- SP-D-continued の ADR-D-004（SP-C completed 後 follow-through）

### Wave 3（SP-B completed 後）

- SP-D-final の ADR-D-003（G8 P20/P21 baseline 削減）

## 3. ハマりポイント

### 3.1. Phase 境界を破る誘惑

Phase 1-3 はコード変更禁止。inquiry 中に「ついでに直したい」衝動が発生しやすいが、
これを許すと Phase 2 の分析で「何が事実で何が改修済みか」が混ざる。
**発見した課題はその場で修正せず、inquiry ファイルに記録するだけに留める。**

### 3.2. 単一原因への帰着

widget 複雑化を「全部 `InsightData` のせい」「2 つの `WidgetDef` 型のせい」と
単一原因に帰着させたくなる。これは禁止（不可侵原則 #11）。
**各症状に 2 つ以上の仮説を立てる**のが Phase 2 の規律。

### 3.3. 出口まで詰めない誘惑

Phase 6 で「新実装を追加して consumer を移行した」段階で完了扱いにしたくなる。
これが**最も多い失敗**。4 ステップ pattern の Step 3（旧実装削除）と Step 4（再発防止 guard）まで
完遂して初めて改修完了。`@deprecated` コメントでの温存は Step 3 の代替にならない。

### 3.4. レガシー shim の温存

「後で消す」「念のため残す」は禁止。`sunsetCondition` 付きの期限付き shim はレアケース。
`temporal governance` の形式で設定する（`references/03-guides/architecture-rule-system.md`）。

### 3.5. sub-project の parent 設定忘れ

Phase 6 で sub-project を spawn する際、`config/project.json` の
`parent: "architecture-debt-recovery"` を忘れると文脈継承が機械的に強制されない。
sub-project 立ち上げ時の checklist に必須項目として載せる。

### 3.6. stream idle timeout

大きな単一 Write（500 行級）は Claude Code の API ストリーミング idle timeout に
抵触する。**plan.md / 大きな inquiry ファイルは skeleton → Edit の chunked 方式**で埋める。
1 chunk あたり 100-150 行が目安。

### 3.7. `budget-achievement-simulator` への誤 touch

Phase 5 まで `projects/completed/budget-achievement-simulator/` を touch しない。
これは独立 project の在職状態保護。同 project の cleanup 7 項目は
Phase 4 の remediation-plan で sub-project に吸収する設計。

### 3.8. UI 層は既存で十分にテコ入れされていない前提

`presentation/` と `features/*/ui/` は、過去の機能追加・改修・改廃の積み重ねで
**責務分離が乱雑な箇所が多い**前提で Phase 1 の棚卸しに入る。特に:

- 1 component が「データ取得 + 状態管理 + 描画」複数責務を抱える
- 責務タグ (`@responsibility R:*`) と実態の乖離
- responsibility-separation guard P2-P18 の各指標の分布に偏り
- C8「1 文説明テスト」で「〜と〜を担う」の AND が入るケース

Phase 1 `inquiry/08-ui-responsibility-audit.md` でこれを重点的に棚卸しする。
**事実列挙のみ。改修案・recommendations は Phase 2 以降**（原則 #12）。

### 3.9. ブランチ名の不整合

現 branch `claude/budget-simulator-review-dJr9C` は本 project 以前の scope を含む命名。
Phase 5 で本 project を active 昇格するタイミングで新 branch に切り替えることを検討。
無理に branch 名を揃える必要はないが、PR 時に混乱しないよう scope を commit message で
明示する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `AI_CONTEXT.md` | why / scope / lineage / read order |
| `plan.md` | 不可侵原則 16 / Phase 1-7 / 4 ステップ pattern / 禁止事項 20 |
| `checklist.md` | Phase 0-7 + 最終レビュー checkbox |
| `config/project.json` | project manifest（`status: "draft"` 初期） |
| `aag/execution-overlay.ts` | rule overlay（draft 初期: 空 overlay。Phase 5 active 昇格時に customize） |
| `DERIVED.md` | 派生セット判定ガイド |
| `derived/` | 派生セット source（`pr-breakdown.md` / `test-plan.md` / `inventory/` 等） |
| `inquiry/` | Phase 1-5 の成果物置き場。現在 01-08 + 01a + 09-14 + 10a = **12 ファイル landed**。Phase 4 で 15-18 を追加予定 |
| `references/05-contents/widgets/` | WSS 45 widget spec（WID-001〜WID-045）の物理配置先。Phase 4 改修の target が参照する現状把握台帳 |
| `projects/completed/budget-achievement-simulator/HANDOFF.md` | informed-by 先の到達点（Phase 5 で整理） |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用規約 |
| `references/03-guides/new-project-bootstrap-guide.md` | sub-project 立ち上げ手順 |
