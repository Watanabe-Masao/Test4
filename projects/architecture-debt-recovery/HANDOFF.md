# HANDOFF — architecture-debt-recovery

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

**Phase 1-3 成果物作成済み / Phase 2・3 architecture review 未了 / Phase 4 未着手。status: `draft`（manifest）/ `in_progress`（derived health）。**

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

### Phase 4 着手前の残タスク（= 最優先）

1. **Phase 2 architecture review**（inquiry/09 / 10 / 10a / 11）
2. **Phase 3 architecture review**（inquiry/12 / 13 / 14）
3. **本 HANDOFF が checklist と整合していることを都度確認**（本 update で整合済み。以降 Phase 4 作成時に同期）

### 触っていないもの（原則通り保留）

- `CURRENT_PROJECT.md`（依然 `budget-achievement-simulator` を active）
- `projects/budget-achievement-simulator/`（Phase 5 まで touch 禁止）
- コード本体（Phase 1-3 はコード変更禁止、`app/src/` の git diff は 0 行を commit 履歴で確認可能）
- `references/01-principles/`（Phase 3 候補提示 + 人間承認後）
- `docs/contracts/principles.json`（同上）

## 2. 次にやること

詳細は `checklist.md` を参照。Phase 1-3 成果物は landed。次は review → Phase 4 draft。

### 高優先（review）

- **Phase 2 architecture review**: inquiry/09 / 10 / 10a / 11 を review。checkbox 1 件 [x] 化の人間承認
- **Phase 3 architecture review**: inquiry/12 / 13 / 14 を review。checkbox 1 件 [x] 化
- review outcome を checklist.md に反映

### 高優先（Phase 4 draft、review と並行可能）

- `inquiry/15-remediation-plan.md` — 4 レーン（A widget/ctx 型 / B registry inline logic & null check / C duplicate/orphan/migration / D governance rule 強化）で改修 item を Evidence chain 構造で列挙
- `inquiry/16-breaking-changes.md` — 破壊的変更 list + rollback 手順
- `inquiry/17-legacy-retirement.md` — legacy item list + `@sunsetCondition` + `@expiresAt` 必須化規約
- `inquiry/18-sub-project-map.md` — 4 sub-project（Lane A-D）+ 依存グラフ（閉路なし検証）+ 各 sub-project 成功条件

### Phase 4 設計の核（本 project 固有）

- 各改修 item は **Evidence chain 必須**: evidence（inquiry 参照 + WID 参照）→ hypothesis（S*）→ principle（J*）→ invariant（INV-J*）→ target → guard → breaking change → rollback → PR plan → status
- 各 guard は **ratchet-down モード**で導入: baseline 固定 → 増加禁止 → 段階削減。最初から fail hard にしない
- 各 sub-project は必ず `parent: "architecture-debt-recovery"` を入れる（文脈継承の機械的強制）
- 各 sub-project の完了条件に「新実装 → consumer 移行 → 旧実装削除 → guard」の 4 step 完遂を必須化

### 中優先

- Phase 4 完了後、`config/project.json` の `status: "draft" → "active"` 昇格判断（plan.md §8 禁止事項 #13 により Phase 5 人間承認前の切替禁止）

### 低優先

- Phase 5 まで保留のタスク群（`budget-achievement-simulator` の扱い・`CURRENT_PROJECT.md` 切替）
- Phase 6 sub-project 実装（各 sub-project spawn 後）

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

Phase 5 まで `projects/budget-achievement-simulator/` を touch しない。
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
| `projects/budget-achievement-simulator/HANDOFF.md` | informed-by 先の到達点（Phase 5 で整理） |
| `references/03-guides/project-checklist-governance.md` | 本 project の運用規約 |
| `references/03-guides/new-project-bootstrap-guide.md` | sub-project 立ち上げ手順 |
