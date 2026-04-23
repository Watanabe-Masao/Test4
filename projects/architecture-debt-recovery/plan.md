# plan — architecture-debt-recovery

> 役割: 本 project の不可侵原則・Phase 構造・禁止事項・破壊的変更の運用規約。
> 現在地・次の作業は `HANDOFF.md`、completion 判定は `checklist.md` を参照。
>
> 本 project は **widget を入口とする大型改修**であり、
> pure 関数抽出 / 型再編 / コンポーネント分割 / データパイプライン再設計 /
> レガシー撤退を一体として扱う。inquiry → 分析 → 原則 → 計画 → 実装 の
> 7 Phase で、**破壊的変更を含めて出口まで詰める**。

## 目次

1. 位置付け
2. 不可侵原則
3. Phase 構造（Phase 1–7）
4. 破壊的変更の運用（4 ステップ pattern）
5. レガシー撤退の運用
6. 真因分析のガイドライン
7. sub-project と文脈保持の運用
8. 禁止事項
9. 関連実装・参照
10. AAG 統合とテスト戦略

## 1. 位置付け

### 本 project は何か

- **widget を入口とするが、widget に閉じない大型改修** — 型 / 純粋関数 / データパイプライン / コンポーネント分割戦略を一体で見直す
- **過去の負債を回収する project** — 機能追加・改修・改廃の積み重ねで発生した複雑化を、**症状ではなく真因** に対して対処する
- **破壊的変更を含む** — 不要コードの撤退・レガシー shim の削除・旧 API の廃止を**出口まで詰める**
- **umbrella project** — Phase 4 で identify される具体改修は **sub-project として spawn** する。本 project 自体は原則と計画を保持する

### 本 project は何ではないか

- 個別 widget の cleanup project ではない（Budget Simulator 7 項目は真因の 1 入力に過ぎない）
- 新機能追加 project ではない（負債回収のみ）
- documentation-only project ではない（Phase 6 で実装まで行う）
- パフォーマンス最適化 project ではない（別 project）
- UI デザイン刷新 project ではない（視覚的変更は最小限）

### 既存との関係

- `projects/budget-achievement-simulator/` — **informed-by**（findings 提供元）。本 project の `parent` ではなく、独立 project として Phase 5 まで尊重する
- `references/01-principles/design-principles.md` — 既存 9 カテゴリ原則。Phase 3 で差分を候補提示する（既存原則の破棄・上書きは人間承認後）
- `references/01-principles/adaptive-architecture-governance.md` — AAG 3 層サイクル。本 project の枠組みそのもの
- Phase 6 で spawn する sub-project — 本 project を `parent` とする

## 2. 不可侵原則

本 project が **絶対に破ってはいけない** ルール。逸脱が必要な場合は、
原則を修正してから逸脱する（原則を黙って破らない）。

### A. 現実保護

1. **現在の実装を壊さない** — runtime 動作（ユーザー可視の機能）を破壊してはならない。破壊的変更は型 / API / import path / internal structure に限定する。runtime 回帰は rollback 対象
2. **数学的不変条件を破らない** — シャープリー恒等式・合計値恒等式・pure 関数の冪等性等、`domain/calculations/` の invariant を保護する。破壊前に該当 guard を追加する
3. **budget-achievement-simulator を Phase 5 まで触らない** — 独立 project の在職状態を保護する

### B. Phase 境界

4. **Phase 1-3 はコード変更禁止** — 事実 / 分析 / 原則が混ざると判断が歪む。inquiry 中の「ついでの修正」を禁止する
5. **破壊的変更は Phase 4 計画承認後のみ** — 突発的な rm / rename / 型破壊を禁止する。Phase 4 の破壊的変更 list に載らないものは Phase 6 で実施しない
6. **Phase 3 原則は候補提示のみ** — `references/01-principles/` への正本昇格、`docs/contracts/principles.json` への登録は**人間承認後**

### C. 破壊的変更の規律

7. **破壊的変更は guard test 先行** — 変更前に、移行すべき invariant を守る guard を追加する。guard が無い状態で壊さない
8. **1 変更 1 PR** — 複数の破壊的変更を同一 PR に混ぜない。rollback 境界を明確にする
9. **出口まで詰める** — 各改修は「新実装 → 全 consumer 移行 → 旧実装削除 → 再発防止 guard」の **4 ステップを完了して初めて「完了」と呼ぶ**。中間状態で Phase を閉じない
10. **レガシーを残さない** — backward compat shim / 「将来削除予定」コメント / 旧 API の温存を禁止する。期限付き shim はレアケースとして、`temporal governance` の `sunsetCondition` と reviewPolicy を必須にする

### D. 分析の規律

11. **単一原因に帰着させない** — 真因分析では複数仮説を併記する（AAG の「ルールは仮説」思想）。「一因で全てを説明する」解釈を明示的に拒否する
12. **inquiry 成果物に recommendations を書かない** — 意見と事実の分離（Phase 2 以降で recommendations を扱う）。Phase 1 台帳は事実のみ
13. **「気をつける」対策を禁止** — 再発防止策は**構造的防御**（テスト・型・guard・allowlist）に変換する

### E. 文脈保持

14. **後続 sub-project は本 project を `parent` に設定** — `config/project.json` の `parent: "architecture-debt-recovery"` を必須とする
15. **sub-project の `AI_CONTEXT.md` の Read Order に本 project を含める** — 文脈継承を機械的に強制する
16. **Phase 4/5 計画を経由せずに sub-project を立ち上げない** — ad-hoc の改修 project を spawn しない

## 3. Phase 構造

### Phase 1: Inquiry（棚卸し）

> **目的**: 事実の網羅的な収集。症状・真因・改修案を**書かない**。Phase 1 は台帳。

#### 入力

- 現 codebase（`app/src/` 全域）
- `projects/budget-achievement-simulator/` の HANDOFF / plan（findings 提供）
- `references/02-status/generated/architecture-health.json`（現 KPI）
- 既存 guard / allowlist（ratchet 状態の確認）

#### 成果物（`inquiry/` 配下に配置）

| ファイル | 内容 | 事実源 |
|---|---|---|
| `01-widget-registries.md` | 9 registry × 全 widget ID / label / group / size / isVisible 条件 / render ctx touched fields | registry .tsx |
| `02-widget-ctx-dependency.md` | 各 widget が `UnifiedWidgetContext` / `WidgetContext` のどのフィールドを触るか | grep + manual trace |
| `03-ui-component-orphans.md` | `features/*/ui/` と `pages/*/widgets/` の UI component inventory + registry 登録有無 | ファイルツリー + registry 突合 |
| `04-type-asymmetry.md` | `WidgetDef` 2 型 (`presentation/components/widgets` vs `pages/Dashboard/widgets`) の差分 + `UnifiedWidgetContext` の page-local フィールド棚卸し | types.ts 読解 |
| `05-pure-fn-candidates.md` | hook / component 内に埋没している pure 計算候補（`useMemo` 内の計算・inline reducer・等） | AST 走査 |
| `06-data-pipeline-map.md` | `InsightData` / `costDetailData` / `selectedResults` / 各 readModel / queryHandler 等の data flow マップ | 手動トレース |
| `07-complexity-hotspots.md` | 行数 / useMemo 数 / ctx touched 数 / 責務タグ / Budget Simulator 7 項目の合流 | 既存 guard の健康診断結果 |
| `08-ui-responsibility-audit.md` | **UI 層の責務分離監査**。`presentation/` + `features/*/ui/` のファイル単位で C8「1 文説明テスト」を適用し、責務が複合化している箇所 / 責務タグと実態の乖離 / responsibility-separation guard P2-P18 の各指標分布を列挙。**UI 層は既存で十分にテコ入れされておらず、乱雑な箇所が多い前提**で重点監査する | AST + responsibilityTagRegistry |

#### 完了条件

- `inquiry/` 配下に 8 ファイル揃う（01-08）
- 各ファイルは**事実のみ**（意見・recommendations・改修案を含まない）
- 各事実に出典（ファイルパス・行番号・commit hash）が付記される
- review-gate の self-check PASS（台帳としての網羅性・出典の明示性）

#### 破壊的変更の許可範囲

**禁止**。コード変更・file 削除・rename を一切行わない。

#### 次 Phase への渡し方

- Phase 2 は `inquiry/01-08` を入力として読む
- 台帳は immutable — Phase 2 以降で追加情報が判明しても、台帳を書き換えず新ファイル（例: `inquiry/01a-addendum.md`）で addend する
- 台帳の不備（事実の欠落）が判明した場合は Phase 1 に戻る（Phase 2 で「棚卸しが不十分」と判定されたら差し戻し）

### Phase 2: 真因分析

> **目的**: 症状 → 真因候補（仮説）の分類。**複数仮説を併記**し、単一原因に帰着させない。

#### 入力

- Phase 1 の inventory 8 ファイル
- 既存原則（`references/01-principles/design-principles.md` 9 カテゴリ + AAG）
- 過去の AAG feedback loop 履歴（同じ症状が再発している箇所）

#### 成果物

| ファイル | 内容 |
|---|---|
| `inquiry/09-symptom-to-hypothesis.md` | 各症状に対して **2 つ以上** の真因候補。各候補に Phase 1 の事実を根拠として紐付ける |
| `inquiry/10-hypothesis-interaction.md` | 仮説間の相互作用（A が真なら B が真となりやすい / 独立した複数原因の並列等）を図示 |
| `inquiry/11-recurrence-pattern.md` | 既存対策（guard / allowlist / 原則）が回避された経緯がある箇所。**AAG の「ルールは仮説」思想**に基づく |

#### 完了条件

- 主要症状（Phase 1 の complexity hotspot）に対し、**各症状 2 つ以上の真因候補** が提示される
- 単一原因に帰着する解釈を明示的に拒否する（「一因で全てを説明する」解釈を排除）
- architecture ロールと相談完了（ROLE.md の判断基準に照らす）
- 各仮説に **検証可能な形** が付与される（例: 「X を変えると Y が起きるはず」の形で確認可能に）

#### 破壊的変更の許可範囲

**禁止**。分析のみ。

#### 次 Phase への渡し方

- Phase 3 は仮説を入力として、**原則** と **不変条件** の候補を構築する
- 仮説の真偽は Phase 6 の実装で検証される（仮説のまま実装しない）

### Phase 3: 原則制定

> **目的**: Phase 2 の真因に対応する**設計原則 v2** と **不変条件** の候補を提示。
> 既存原則との差分を明記し、**正本昇格は人間承認後**。

#### 入力

- Phase 2 の真因仮説
- 既存原則（`references/01-principles/design-principles.md` 9 カテゴリ）
- 既存 AAG rules（`app/src/test/architectureRules/`）
- 既存 invariant カタログ（`references/03-guides/invariant-catalog.md`）

#### 成果物

| ファイル | 内容 |
|---|---|
| `inquiry/12-principle-candidates.md` | 設計原則 v2 の候補。既存 9 カテゴリとの差分（追加・上書き・削除）を明記 |
| `inquiry/13-invariant-candidates.md` | 新規不変条件の候補。各不変条件に guard test の **設計前書き**（まだ実装はしない） |
| `inquiry/14-rule-retirement-candidates.md` | 既存原則・rules・guard のうち、**廃止・統合を検討するもの**。廃止理由は Phase 2 の真因に紐付ける |

#### 完了条件

- 原則候補に対する architecture ロール review 完了
- 各原則候補に:
  - 対応する真因仮説（Phase 2 から）
  - 対応する既存原則との関係（追加 / 上書き / 削除）
  - 機械検出方法の粗設計
  - sunsetCondition（この原則が無用になる条件）
  が記載される
- 正本昇格は明示的に**保留** — 人間承認前に `references/01-principles/` / `docs/contracts/principles.json` を触らない

#### 破壊的変更の許可範囲

**禁止**。既存原則の削除・上書きは Phase 6 で実施する（Phase 3 では候補提示のみ）。

#### 次 Phase への渡し方

- Phase 4 の改修計画は、Phase 3 原則候補を **実装目標** として扱う
- 原則候補のうち「今回の project で達成するもの」と「後続 project に委ねるもの」を Phase 4 で区別する

### Phase 4: 改修計画

> **目的**: Phase 3 原則を具体的な改修ステップに落とす。
> **破壊的変更の list**・**依存順**・**不可逆の境界**・**rollback 手順** を明示する。

#### 入力

- Phase 3 原則候補 / 不変条件候補 / 廃止候補
- Phase 1 inventory（影響範囲の算定に使う）

#### 成果物

| ファイル | 内容 |
|---|---|
| `inquiry/15-remediation-plan.md` | 改修単位・依存順・影響範囲。各改修に 4 ステップ pattern（新実装 / 移行 / 削除 / guard）を記載 |
| `inquiry/16-breaking-changes.md` | 破壊的変更の完全 list。各変更に:<br>- 新実装先 / 旧実装削除先<br>- 依存する先行変更<br>- rollback 手順<br>- guard test の設計<br>- 想定 PR 数 |
| `inquiry/17-legacy-retirement.md` | 不要コード / 旧 API / shim / 「将来削除予定」コメントの撤退 list。各項目に**撤退期限**（Phase 6 の何番目の PR で削除するか） |
| `inquiry/18-sub-project-map.md` | spawn する sub-project の設計:<br>- 各 sub-project の scope / 成功条件 / 入出力契約<br>- sub-project 間の依存順<br>- 各 sub-project の想定サイズ（Small / Medium / Large） |

#### 完了条件

- 各改修が「destructive かどうか」「依存する先行変更」「rollback 手順」「guard test 設計」を持つ
- sub-project のセットが identify され、依存グラフが閉路を含まない
- **レガシー撤退が全ての改修に紐付く** — 「新実装のみ追加して旧実装を残す」改修を許可しない
- pm-business と architecture ロールの合意
- 人間承認: 破壊的変更 list と sub-project 立ち上げ順序

#### 破壊的変更の許可範囲

**禁止**。計画のみ。

#### 次 Phase への渡し方

- Phase 5 で既存 project 整理と CURRENT_PROJECT 切替計画を確定
- Phase 6 で実際に sub-project を spawn し、計画に従って execute

### Phase 5: 既存 project 整理

> **目的**: `budget-achievement-simulator` の扱い確定 + `CURRENT_PROJECT.md` 切替計画。
> 本 project を `draft` → `active` に昇格する準備。

#### 入力

- Phase 4 の改修計画 / sub-project map
- `projects/budget-achievement-simulator/` の現状（HANDOFF / checklist）
- `references/02-status/open-issues.md` の active projects 表

#### 成果物

| ファイル | 内容 |
|---|---|
| `inquiry/19-predecessor-project-transition.md` | `budget-achievement-simulator` の扱い:<br>- 吸収（sub-project として取り込む） vs 別扱い（archive）<br>- cleanup 7 項目の引き継ぎ先 sub-project<br>- HANDOFF / checklist の最終更新方針 |
| `inquiry/20-current-project-switch-plan.md` | `CURRENT_PROJECT.md` 切替のタイミングと手順:<br>- 本 project を `active` 昇格する timing<br>- sub-project を active にするタイミング（umbrella と sub の切替規約） |
| `inquiry/21-spawn-sequence.md` | sub-project の立ち上げ順序。Phase 4 の依存グラフに基づく具体的スケジュール |

#### 完了条件

- `budget-achievement-simulator` の扱い **確定**（人間承認）
- 本 project の `config/project.json` が `status: "active"` に更新できる状態
- `open-issues.md` の active projects 表の更新方針が決まる
- sub-project 立ち上げ順序が確定

#### 破壊的変更の許可範囲

**限定的**:

- `projects/budget-achievement-simulator/` の **project ファイル**（HANDOFF / checklist / config）のみ
- ここでも **コード本体は触らない**（Phase 6 でのみ）
- 破壊的変更は:
  - `budget-achievement-simulator` の archive 移動（`projects/completed/` へ）
  - 本 project の `status: "draft"` → `"active"`
  - `CURRENT_PROJECT.md` の切替

これらは**人間承認後**のみ実行可能。

#### 次 Phase への渡し方

- Phase 6 で sub-project を Phase 5 の順序で立ち上げ、実装を進める
- 本 project 自体は sub-project の状態を track する立場に移る

### Phase 6: 実装 + レガシー撤退

> **目的**: Phase 4 計画に従って改修を **sub-project で execute**。
> 各 sub-project が 4 ステップ pattern（新実装 / 移行 / 削除 / guard）を完遂する。
> 本 project は umbrella として sub-project の状態を track する。

#### 入力

- Phase 4 の `15-remediation-plan.md` / `16-breaking-changes.md` / `17-legacy-retirement.md` / `18-sub-project-map.md`
- Phase 5 の `21-spawn-sequence.md`
- Phase 3 の原則候補 / 不変条件候補（Phase 6 で正本昇格する）

#### 成果物

| 成果物 | 説明 |
|---|---|
| sub-project 群の完遂 | Phase 4 で identify された sub-project が **全て completed** になる |
| 新 invariant の正本昇格 | Phase 3 不変条件候補が `references/03-guides/invariant-catalog.md` に登録され、guard test が実装される |
| 新原則の正本昇格 | Phase 3 原則候補が `references/01-principles/` に配置され、`docs/contracts/principles.json` に登録される |
| レガシー撤退完了 | Phase 4 の `17-legacy-retirement.md` 全項目が **削除済み** |
| health KPI 更新 | `references/02-status/generated/architecture-health.json` が Phase 3 前後で比較可能な状態 |

#### 各 sub-project の必須要件（Phase 4 の計画に上乗せ）

1. **sub-project の `config/project.json` に `parent: "architecture-debt-recovery"`** — 文脈継承の機械的強制
2. **sub-project の `AI_CONTEXT.md` の Read Order に本 project の `AI_CONTEXT.md` を含める**
3. **4 ステップ pattern の完遂を checklist.md で機械検証** — 「新実装追加」「consumer 移行」「旧実装削除」「guard 追加」の 4 checkbox 必須
4. **1 破壊的変更 1 PR** — rollback 境界を明確にする
5. **CI 全通過を必須** — `test:guards` / `build` / `lint` / `test:visual` / health / docs:check 全て PASS
6. **runtime 回帰テスト** — ユーザー可視機能に影響する変更は E2E または visual で検証する

#### 完了条件

- Phase 4 の改修 list が全て消化される
- sub-project が全て completed に昇格する
- 新 invariant / 新原則が正本昇格する
- **レガシー残存 0** — `17-legacy-retirement.md` の全項目が削除済み
- architecture-health.json の regression-free（KPI が改善または不変）

#### 破壊的変更の許可範囲

**Phase 4 計画に載っているもののみ**。計画外の「ついでの削除」「ついでの rename」を禁止する。

#### Phase 6 中の運用規律

- **sub-project ごとに review-gate を通過する** — review-gate PASS 無しで次 sub-project に進まない
- **依存する先行 sub-project の完了を待つ** — Phase 4 の依存グラフを守る
- **仮説の棄却を許可する** — Phase 2 の仮説が Phase 6 の実装で否定された場合、仮説と原則を修正する（実装を歪めない）

#### 次 Phase への渡し方

- Phase 7 で仕上げ / handoff

### Phase 7: 完了 + handoff

> **目的**: 本 project の仕上げ・archive・後続 project への handoff 文書整備。

#### 入力

- Phase 6 の sub-project 完遂結果
- 昇格した新原則 / 新 invariant
- health KPI の前後比較

#### 成果物

| 成果物 | 説明 |
|---|---|
| 本 project の completed 化 | `projects/architecture-debt-recovery/` → `projects/completed/architecture-debt-recovery/` に移動 |
| `completed/architecture-debt-recovery/SUMMARY.md` | 本 project の全景サマリ。後続 project が参照する起点 |
| `open-issues.md` 更新 | active projects 表から本 project を除外、completed projects 表に追加 |
| `CLAUDE.md` generated section 更新 | health KPI / architecture rules 総数 / principle coverage 等 |
| 後続の未完タスク | Phase 6 で解決しなかった課題があれば別 project として identify（scope 外に持ち越さない） |

#### 完了条件

- 本 project の archive 完了
- 後続 project への handoff 文書が書かれる（次に着手する人が迷わない）
- 人間レビュー完了
- `npm run test:guards` / `docs:check` / `build` / `lint` 全て PASS
- checklist.md の最終レビュー checkbox が `[x]` になる

#### 破壊的変更の許可範囲

- `projects/architecture-debt-recovery/` の移動（archive 操作）
- `CURRENT_PROJECT.md` の切替（次 project がある場合）

#### 次 Phase

無し。本 project は completed 昇格で閉じる。

## 4. 破壊的変更の運用（4 ステップ pattern）

> **原則**: 破壊的変更は **「出口まで詰める」 4 ステップ** を完了して初めて改修完了と呼ぶ。
> 中間状態で Phase / sub-project を閉じない。

### 4 ステップ

```
Step 1: 新実装を追加（既存と併存）
   ├─ 新 API / 新型 / 新 module を追加
   ├─ 既存は touch しない（併存期間）
   └─ 新実装の unit test と guard を先行実装

Step 2: consumer を新実装に移行
   ├─ 移行対象を Phase 4 で確定した list に従って 1 つずつ移行
   ├─ 移行ごとに PR を分ける（1 consumer 1 PR が基本）
   └─ 移行の過程で生じた不具合は新実装側で解決する（旧実装に戻さない）

Step 3: 旧実装を削除
   ├─ 全 consumer が移行したことを grep / type / guard で確認
   ├─ 旧実装ファイル / 旧 API / 旧型 / 旧 import path を削除
   ├─ deprecated comment 等の「温存」を絶対にしない
   └─ 削除 PR は 1 変更 1 PR

Step 4: 再発防止 guard を追加
   ├─ 旧実装の復活を機械的に阻止する guard を追加
   ├─ 既存 guard が同等機能を持つ場合は拡張で対応
   └─ guard の reviewPolicy（owner / sunset 条件）を設定
```

### 各 step の承認要件

| Step | 承認要件 | rollback |
|---|---|---|
| Step 1 | review-gate PASS / 新実装に単体テスト有 / 併存による conflict が無い | 新実装削除（consumer への影響なし） |
| Step 2 | 移行した consumer が runtime 動作を保つ（visual / E2E / test:guards PASS） | 該当 consumer のみ旧実装に戻す |
| Step 3 | 全 consumer 移行完了の grep/type/guard 証跡 / 削除 PR の CI 全通過 | 旧実装を git revert（短期対応） |
| Step 4 | guard が新実装の外での復活を検出する / reviewPolicy 記載 | guard 無効化せず、原則を修正 |

### 4 ステップ pattern を破るケースの扱い

**禁止パターン**（発見次第、該当 sub-project を差し戻し）:

- Step 3 を skip（旧実装を残したまま新実装を追加する＝ **最も多い失敗**）
- Step 4 を skip（guard 無しで削除＝再発する）
- Step 2 の途中で Phase / sub-project を closed とする
- 旧実装を `@deprecated` コメントで温存する（Step 3 の代替にしない）

### 破壊的変更のサイズ判定

Phase 4 で各改修を以下に分類し、それに応じて sub-project の規模と PR 数を決める。

| 分類 | 判定基準 | 扱い |
|---|---|---|
| **Trivial** | 1 型 / 1 API の rename、consumer ≤ 5 | 単一 PR で 4 ステップ全体を完遂 |
| **Small** | consumer ≤ 20、単一 feature 内 | 2-3 PR（Step 1, Step 2, Step 3+4） |
| **Medium** | consumer 20-50、複数 feature | sub-project 化必須、5-10 PR |
| **Large** | consumer 50+、層跨ぎ、API 再設計 | sub-project 化必須、PR 数は個別計画 |

## 5. レガシー撤退の運用

> **原則**: レガシーを残さない。`deprecated` コメントで温存しない。
> 期限付き shim はレアケースとし、**sunsetCondition を機械的に強制**する。

### レガシー定義

以下はすべて **撤退対象**:

1. **dead code** — import されていない / export されていても consumer が無い
2. **旧 API** — 新 API に移行済みで consumer が 0 になったもの
3. **compat shim** — 旧 path / 旧名称 への re-export
4. **「将来削除予定」コメント** — 削除予定の宣言だけ残して実削除されていないもの
5. **`@deprecated` JSDoc** — 削除予定の宣言だけのもの（実際は使われている場合は撤退計画が必要）
6. **fallback コード** — 新実装に完全移行後も残存する旧 path への fallback
7. **feature flag** — 機能の完全 on/off 切替が完了後に残存する flag
8. **migration scaffolding** — 過去の移行のための一時コード

### 撤退の 3 ステップ

```
Step L1: 現状の把握
   ├─ consumer の grep（import / 呼び出し）
   ├─ type で参照箇所の列挙
   └─ dead code は即削除候補、consumer 有は撤退計画必要

Step L2: 撤退計画の策定
   ├─ Phase 4 の 17-legacy-retirement.md に記載
   ├─ consumer がある場合: 移行先 API を明記
   └─ 撤退期限（Phase 6 の何番目の PR で削除するか）を確定

Step L3: 実削除
   ├─ consumer 移行完了を確認
   ├─ 削除 PR に guard 追加（復活を機械的に阻止）
   └─ 削除 PR の commit message に撤退理由を記載
```

### 期限付き shim（レアケース）

どうしても temporary な shim が必要な場合は:

1. `temporal governance` の形式で設定（`references/03-guides/architecture-rule-system.md` 参照）
2. `reviewPolicy` を必須: `owner` / `lastReviewedAt` / `sunsetCondition`
3. `sunsetCondition` は具体的な日付 or 条件（「X が完了したら削除」等）
4. guard で sunset 期限を監視（期限超過で CI fail）

**例外を許す基準**:

- 外部依存（API / DB schema）の移行期間中のみ
- runtime 切替が必要な feature flag で、業務判断で期間を設けている場合

**例外を許さない基準**:

- 「念のため残す」「後で消す予定」
- 特定の consumer が移行困難で諦めた

### `@deprecated` の扱い

- **新規追加を禁止**（Phase 6 以降）
- 既存の `@deprecated` は Phase 4 の `17-legacy-retirement.md` に全て列挙する
- 撤退計画に載らない `@deprecated` は即撤退対象

## 6. 真因分析のガイドライン

> **原則**: 単一原因に帰着させない。**ルールは仮説** — 回避が生まれたらルールを疑う。

### 分析の姿勢

1. **症状ごとに 2 つ以上の仮説**
   - 1 つの症状に対して「これが唯一の真因」と即断しない
   - 複数仮説を列挙し、それらの**相互作用**も考慮する
2. **仮説には検証可能性を付与**
   - 「X を変えると Y が起きるはず」の形で、Phase 6 の実装で検証できるように
   - 検証不能な仮説（例: 「過去の意思決定が悪かった」）は仮説として採用しない
3. **ルールは仮説として扱う**（AAG 原則）
   - 既存原則・guard・allowlist は**過去時点の仮説**
   - 回避が頻発する原則は、原則側を疑う（運用を疑う前に）
4. **「気をつける」対策は禁止**
   - 再発防止策は必ず**構造的防御**（テスト・型・guard・allowlist）に変換する
   - 教育・レビューのみに依存する対策は不採用

### 典型的な NG パターン

| NG パターン | なぜ NG か | 正しい姿勢 |
|---|---|---|
| 「widget が複雑化しているのは全部 InsightData のせい」 | 単一原因に帰着。他仮説を検証せず結論 | 複数仮説を併記し、実装で検証 |
| 「設計原則が守られていなかっただけ」 | 運用を疑って構造を疑わない | 守られない原則は構造欠陥の可能性 |
| 「今後は気をつけます」 | 機械的防御が無い | guard / test / type で強制化 |
| 「この箇所だけ例外にする」 | 例外の蓄積が複雑化の原因 | 例外を許す条件を明示 or 構造を変える |

### 「真因」を絞り込む手法

- **Phase 1 事実との突合** — 各仮説が Phase 1 inventory の事実で支持されるか
- **counter-example 探索** — 仮説が真ならこうなるはずの事実を探す
- **仮説間の包含関係** — 仮説 A が仮説 B を包含する場合、A を採用して B は破棄
- **独立原因の並列** — 仮説 A と B が独立して真である場合もある（複数仮説の併記）

## 7. sub-project と文脈保持の運用

> **原則**: 本 project は umbrella として複数 sub-project を spawn する。
> **文脈保持**は `parent` 設定と Read Order 継承で機械的に強制する。

### sub-project の立ち上げ規約

Phase 4/5 で identify されていない改修 project を本 project が spawn することは禁止する。
承認された sub-project は以下の手順で立ち上げる:

```bash
# Step 1: _template からコピー
cp -r projects/_template projects/<sub-project-id>

# Step 2: 必須セットをカスタム
# - config/project.json の parent: "architecture-debt-recovery" を設定
# - AI_CONTEXT.md の Read Order に umbrella を含める（下記 §7.2）

# Step 3: 派生セットを決める（DERIVED.md の Q1-Q5 に従う）
cd projects/<sub-project-id>
cp derived/pr-breakdown.md pr-breakdown.md  # 3 PR 以上ならコピー
# etc.

# Step 4: CURRENT_PROJECT.md 切替（必要なタイミングで）
# umbrella との切替規約は §7.3 参照

# Step 5: verify:project / test:guards / docs:generate / lint / build 全通過
```

### sub-project `AI_CONTEXT.md` の Read Order 規約

sub-project の `AI_CONTEXT.md` の Read Order には **必ず以下を含める**:

```markdown
## Read Order

1. 本ファイル
2. `../architecture-debt-recovery/AI_CONTEXT.md`（umbrella の文脈）
3. `../architecture-debt-recovery/plan.md`（umbrella の不可侵原則）
4. `../architecture-debt-recovery/inquiry/15-remediation-plan.md`（umbrella の改修計画）
5. `HANDOFF.md`
6. `plan.md`
7. `checklist.md`
```

これにより、**sub-project に着手する AI / 人間は必ず umbrella の文脈を読む**。

### umbrella / sub-project 間の active 切替規約

- umbrella と sub-project は **両方同時に active にしない**
- sub-project を立ち上げるとき: umbrella を `active` → **umbrella は active のまま**（sub が立ち上がっても umbrella が track する）
- sub-project を CURRENT に切り替える: sub-project の作業中は CURRENT を sub に移す（作業集中のため）
- sub-project 完了時: CURRENT を umbrella に戻す

sub-project の `config/project.json`:

```jsonc
{
  "projectId": "<sub-project-id>",
  "parent": "architecture-debt-recovery",
  "projectRoot": "projects/<sub-project-id>",
  "status": "active",  // umbrella は "active" のまま共存
  ...
}
```

### sub-project 間の依存管理

- Phase 4 の依存グラフに従い、**先行 sub-project が完了するまで後続 sub-project は着手しない**
- 依存関係は sub-project の `AI_CONTEXT.md` に明記（「この sub は X sub の完了を前提とする」）
- 閉路は禁止（Phase 4 で依存グラフの非循環性を検証）

### umbrella 側の責務

本 project の active 期間中、umbrella は以下を track する:

| 項目 | 追跡先 |
|---|---|
| 各 sub-project の状態 | `inquiry/21-spawn-sequence.md` を更新 |
| sub-project の実装が原則候補に与える feedback | `inquiry/12-principle-candidates.md` を必要に応じて改訂 |
| レガシー撤退の進捗 | `inquiry/17-legacy-retirement.md` の checkbox 状態 |
| architecture-health KPI の推移 | `references/02-status/generated/architecture-health.json` の snapshot を `inquiry/` に保存 |

## 8. 禁止事項

> **原則**: 「やってはいけないこと」を具体的に列挙する。
> 禁止事項は不可侵原則の**機械的派生**であり、逸脱例外は個別判断せず原則を改訂してから行う。

| # | 禁止事項 | なぜ禁止か |
|---|---|---|
| 1 | Phase 1-3 でコード変更 | 事実 / 分析 / 原則が混ざり判断が歪む。inquiry 中の「ついでの修正」が Phase 2 以降のノイズになる |
| 2 | Phase 4 計画に載らない破壊的変更を Phase 6 で実施 | rollback 境界が曖昧になり、トラブル時に影響範囲を特定できない |
| 3 | 1 PR に複数の破壊的変更を混ぜる | rollback 単位が複合化し、部分 revert が不可能になる |
| 4 | 旧 API / 旧実装を `@deprecated` コメントで温存 | 4 ステップ pattern の Step 3 を skip する典型的失敗 |
| 5 | 「将来削除予定」コメントで legacy を温存 | 削除の決意が無い宣言は撤退しない |
| 6 | backward compat shim を期限なしで残す | レガシーの温床。sunsetCondition 必須 |
| 7 | 新実装のみ追加して旧実装を残した状態で sub-project を closed 扱い | 4 ステップ pattern 未完遂。複雑化の温床 |
| 8 | Phase 3 原則候補を人間承認前に `references/01-principles/` に置く | 正本汚染。承認フローを迂回する |
| 9 | Phase 3 原則候補を `docs/contracts/principles.json` に登録する | 同上。principles.json は正本 |
| 10 | Phase 1 inventory に recommendations / 意見を書く | 事実と意見の分離を破る。Phase 2 以降で混乱が発生 |
| 11 | 単一原因に帰着する真因分析 | 複数仮説併記原則を破る。真因を見誤る |
| 12 | 「気をつける」「今後は注意する」を対策として採用 | 機械的防御が無い。再発する |
| 13 | `CURRENT_PROJECT.md` を Phase 5 人間承認前に切り替える | project governance を迂回する |
| 14 | `budget-achievement-simulator` を Phase 5 前に touch | 独立 project の在職状態を侵害 |
| 15 | sub-project の `config/project.json` で `parent` を省略 | 文脈継承の機械的強制を破る |
| 16 | sub-project の `AI_CONTEXT.md` の Read Order に umbrella を含めない | 同上 |
| 17 | Phase 4 計画を経由せず sub-project を spawn | ad-hoc な改修 project の発生 |
| 18 | 数学的不変条件を破る変更を guard test 先行無しで実施 | invariant 違反の発生 |
| 19 | Phase 6 で CI 全通過無しの破壊的変更 PR を merge | 回帰の温床 |
| 20 | visual / E2E での runtime 回帰確認を skip | ユーザー可視機能の回帰を見逃す |

## 9. 関連実装・参照

### 本 project 自身の成果物

| パス | 役割 |
|---|---|
| `projects/architecture-debt-recovery/AI_CONTEXT.md` | why / scope / lineage / read order |
| `projects/architecture-debt-recovery/HANDOFF.md` | 現在地 / 次にやること / ハマりポイント |
| `projects/architecture-debt-recovery/plan.md` | 本ファイル（不可侵原則 / Phase 1-7 / 禁止事項） |
| `projects/architecture-debt-recovery/checklist.md` | Phase 別 completion checkbox |
| `projects/architecture-debt-recovery/config/project.json` | manifest（`status: "draft"` 初期） |
| `projects/architecture-debt-recovery/aag/execution-overlay.ts` | rule overlay |
| `projects/architecture-debt-recovery/inquiry/*.md` | Phase 1-5 の成果物（20 ファイル想定） |

### 関連 project

| パス | 関係 |
|---|---|
| `projects/budget-achievement-simulator/` | informed-by（findings 提供元）。Phase 5 まで touch 禁止 |
| `projects/<sub-project-id>/` | Phase 6 で spawn される sub-project 群 |
| `projects/completed/` | Phase 7 で本 project がここに移動 |

### 参照する governance 文書

| パス | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | project 運用の正本（AAG Layer 4A） |
| `references/03-guides/new-project-bootstrap-guide.md` | sub-project 立ち上げ手順 |
| `references/01-principles/design-principles.md` | 既存 9 カテゴリ原則（Phase 3 で差分提示） |
| `references/01-principles/adaptive-architecture-governance.md` | AAG 3 層サイクル（本 project の枠組み） |
| `references/01-principles/adaptive-governance-evolution.md` | AAG 進化方針 |
| `references/03-guides/architecture-rule-system.md` | Architecture Rule 運用（破壊的変更の guard 実装） |
| `references/03-guides/invariant-catalog.md` | 数学的不変条件カタログ（Phase 6 で拡張） |
| `references/03-guides/allowlist-management.md` | allowlist 運用（Phase 6 で調整） |
| `references/03-guides/responsibility-separation-catalog.md` | 責務分離 24 パターン（Phase 2 真因分析の参照） |

### 参照する既存ガード / 実装

| パス | 役割 |
|---|---|
| `app/src/test/architectureRules/` | Architecture Rule 正本 |
| `app/src/test/guards/` | 全 guard test（Phase 6 で拡張） |
| `app/src/test/allowlists/` | 全 allowlist（Phase 6 で調整） |
| `app/src/domain/calculations/` | pure 計算正本（Phase 6 で新規 pure 関数を昇格） |
| `app/src/presentation/components/widgets/types.ts` | universal `WidgetDef` / `UnifiedWidgetContext`（Phase 6 改修対象） |
| `app/src/presentation/pages/Dashboard/widgets/types.ts` | Dashboard `WidgetDef` / `WidgetContext`（Phase 6 改修対象） |
| `tools/architecture-health/` | health collector / generator（Phase 6 で新 KPI 追加の可能性） |

## 10. AAG 統合とテスト戦略

> **原則**: 本 project の発見・原則・改修は、**一過性の成果ではなく AAG の永続的な仕組み** として残す。
> 「気をつける」対策は禁止（#12）。全ての insight は **guard test / Architecture Rule / invariant カタログ** のいずれかに機械化される。

### 10.1 AAG 3 層との対応

本 project は AAG 3 層サイクル「発見 → 蓄積 → 評価」と整合する。

| AAG 層 | 本 project の対応 |
|---|---|
| **発見** | Phase 1 Inquiry / Phase 2 真因分析 |
| **蓄積** | Phase 3 原則候補 / Phase 4 計画 / Phase 6 Architecture Rule 実装 |
| **評価** | Phase 7 health KPI 前後比較 / 原則の sunsetCondition 検証 |

### 10.2 各 Phase での AAG 統合

| Phase | AAG integration 内容 |
|---|---|
| Phase 1 | inventory に **既存 guard / rule / allowlist の現状棚卸し** を含める。特に「回避が頻発している guard」「effective でない rule」を識別する |
| Phase 2 | 真因分析時に既存原則・rule の **回避経緯**（`recurrence-pattern.md`）を評価。AAG の「ルールは仮説」思想で既存 rule を疑う |
| Phase 3 | 各原則候補に **対応する Architecture Rule の設計前書き** を付ける（detection type / binding / decisionCriteria / migrationRecipe） |
| Phase 4 | 改修計画の各変更に **先行追加すべき guard test の list** と **除却すべき既存 rule の list** を含める |
| Phase 6 | 4 ステップ pattern の Step 4 (guard) で、**Architecture Rule を正本登録 + guard test 実装**。allowlist / invariant catalog の更新を含める |
| Phase 7 | health KPI の前後比較で「Architecture Rule 総数」「guard test 総数」「allowlist 削減数」「reviewPolicy 設定済み rule 数」を記録 |

### 10.3 テスト戦略 — 7 層

本 project の改修は以下の 7 層で保護する。sub-project の checklist は各層の実装有無を**必須項目として含める**。

| 層 | 種別 | 役割 | 既存インフラ例 |
|---|---|---|---|
| 1 | 型検証（tsc） | 型レベル不変条件 | `strict mode` / `noUnusedLocals` / `noUnusedParameters` |
| 2 | lint | コードパターン検出 | `no-any` / responsibilityTag 記法 |
| 3 | guard test | 構造制約の機械検証 | `app/src/test/guards/*.test.ts`（39 件） |
| 4 | invariant test | 数学的不変条件 | `budgetAnalysisInvariants.test.ts` / `observation/` |
| 5 | unit test | pure 関数の振る舞い | `domain/calculations/*.test.ts` |
| 6 | integration / visual | 描画と UX の振る舞い | Storybook / `test:visual` |
| 7 | E2E | ユーザーフロー | Playwright `test:e2e` |

**改修の種別ごとの最低テスト要件**:

| 改修種別 | 必須層 |
|---|---|
| pure 関数抽出 | 1, 2, 3, 4, 5 |
| 型再編成（WidgetDef 統合 等） | 1, 2, 3 |
| component 分割 | 1, 2, 3, 5, 6 |
| data pipeline 再設計 | 1, 2, 3, 5, 6, 7 |
| レガシー削除 | 1, 2, 3（+ 削除対象が runtime に影響するなら 6, 7） |

### 10.4 Architecture Rule 化の必須要件

Phase 3 原則候補 → Phase 6 Architecture Rule 昇格時、各 rule に以下を**必ず**定義する。これは `references/03-guides/architecture-rule-system.md` に準拠する。

**構造フィールド（App Domain 側・不変）**:

- `id` — `AR-*` 形式の安定 ID
- `what` / `why` / `doc` — 学習コスト削減（doc は `references/` へのリンク）
- `correctPattern` / `example` — 自己修復（どう書けば正しいか）
- `outdatedPattern` / `codeSignals` — 検出
- `detection.type` — `import` / `regex` / `count` / `must-include` / `must-only` / `co-change` / `must-not-coexist` / `custom` の 8 種
- `migrationRecipe` — 違反時の修正手順
- `decisionCriteria` — 判断の脱属人化
- `relationships` — 他 rule との因果関係
- `thresholds` / `baseline` — ratchet-down 運用の数値

**運用フィールド（Project Overlay 側・変動）**:

- `fixNow` — `now` / `debt` / `review` の分類
- `executionPlan` — effort / priority
- `reviewPolicy` — owner / lastReviewedAt / reviewCadenceDays
- `ruleClass` — `invariant` / `default` / `heuristic`
- `confidence` — 仮説の確信度
- `sunsetCondition` — この rule が無用になる条件
- `lifecyclePolicy` — `experimental` / `stable` / `deprecated`

Phase 3 `inquiry/12-principle-candidates.md` はこれら全フィールドの**候補**を埋めた状態で提示する。人間承認後に Phase 6 で正本登録する。

### 10.5 guard test 先行の運用

破壊的変更の 4 ステップ pattern の Step 1（新実装追加）**の前**に、以下を行う:

1. **invariant 追加** — 破壊される可能性のある invariant に guard test を先に書く（RED → GREEN）
2. **新実装の unit test 先行** — 新実装の振る舞い契約をテストで固定
3. **integration / visual baseline 固定** — 変更前の runtime 挙動を fixture として保存
4. **Architecture Rule stub 追加** — 新 rule の outline を追加（`lifecyclePolicy: 'experimental'` でスタート、Phase 終了時に `'stable'` へ）

これにより:

- Step 1 の新実装が invariant / 新 rule を満たすことが機械検証される
- Step 2 の consumer 移行中に回帰が即検出される
- Step 3 の旧削除で「削除すべきでなかった」箇所が guard で守られる
- Step 4 の再発防止が構造的に完成する

### 10.6 allowlist / baseline の運用規律

本 project で扱う allowlist / baseline の原則:

- **新規 allowlist 追加を最小化** — Phase 6 の破壊的変更は allowlist を増やさず、既存 allowlist を**削減する方向**に動く
- **既存 allowlist の由来を Phase 1 で棚卸し** — `inquiry/07-complexity-hotspots.md` に allowlist 一覧と「追加された理由」を記載
- **ratchet-down を徹底** — baseline 値は**減少方向のみ許可**。増加方向の baseline 変更は Phase 4 計画に明示が必要
- **期限付き allowlist（createdAt / expiresAt）** — Phase 6 で追加する allowlist entry は必ず expiresAt を持つ

### 10.7 Test Plan Derived（採用）

DERIVED.md の Q4「テスト計画を先に立ててから実装したいか？」に **Yes**。
Phase 4 時点で `test-plan.md` を root にコピーし、7 層テストの計画を記述する。

```bash
cd projects/architecture-debt-recovery
cp derived/test-plan.md test-plan.md
```

`test-plan.md` の扱い:

- Phase 4 で各 sub-project が実装すべきテストの全体像を確定
- Phase 6 で各 sub-project は自分の `test-plan.md`（自 project 内）を持つ
- Phase 7 で本 project の `test-plan.md` を「実施済み」として review

### 10.8 health KPI 追跡

Phase 6 期間中、以下の health KPI を scratch ノートとして `inquiry/` に保存し、Phase 7 で前後比較する:

| KPI | 追跡目的 |
|---|---|
| Architecture Rule 総数 | 仕組み化の量的効果 |
| guard test 総数 | 機械的防御の量的効果 |
| allowlist 総 entry 数 | 負債総量の減少 |
| allowlist 期限切れ entry 数 | temporal governance の健全性 |
| reviewPolicy 設定済み rule 比率 | lifecycle governance の健全性 |
| responsibilityTag 未分類ファイル数 | C9「現実把握優先」の進捗 |
| responsibility-separation baseline | 機械検出 P2-P18 の傾向 |
| complexity hotspot 候補ファイル数 | 複雑度削減の量的効果 |
| 複雑性圧（health.json） | PASS 継続性 |

