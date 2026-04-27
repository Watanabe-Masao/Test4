# plan — responsibility-taxonomy-v2（子: 責務軸）

> 親 `taxonomy-v2` の 7 不可侵原則 + interlock 仕様を制約とし、
> 責務軸 (R:\*) の Schema / Guard / Operations / Legacy 撤退を 10 Phase で実装する。

## 不可侵原則（親から継承）

親 `projects/taxonomy-v2/plan.md` の 7 原則を全て継承する。特に本 project で
影響が大きいもの:

1. **原則 1: 未分類は分類である** → `R:unclassified` を active tag として導入
2. **原則 2: 1 タグ = 1 軸** → 責務 × 純粋性 × 層を別 namespace に分離
3. **原則 3: 語彙生成は高コスト儀式** → Phase 1 Schema 後は review window でのみ追加
4. **原則 4: Tag ↔ Test は双方向契約** → test-taxonomy-v2 と同期 review window で確定
5. **原則 7: Cognitive Load Ceiling** → 責務軸 vocabulary ≤ 15

### 本 project 固有の禁則

- **R:utility の再導入禁止** → v1 の捨て場化を繰り返さない
- **軸混在タグの新設禁止** → 責務 × 純粋性 × 層を 1 タグに押し込む v1 パターン禁止
- **test obligation を R:tag 単位で書かない** → interlock は親の正本

---

## Phase 構造（10 Phase）

### Phase 0: Inventory

**目的:** 現行 v1 の 20 タグ + 未分類 400 件 + タグ不一致 48 件を棚卸し。

**成果物:**

- `references/02-status/responsibility-taxonomy-inventory.yaml`（親 plan.md §Common Inventory Schema の CanonEntry shape に適合）
- 各タグの Origin（採択日・採択者が不明なら "legacy, origin unknown" と記録）
- 未分類・タグ不一致の分布（layer 別 / 責務種別 別）
- 親 plan.md §OCS.6 Drift Budget の責務軸 baseline（`untagged` / `unknownVocabulary` / `missingOrigin`）が CanonEntry 集計から計測されている
- 親 plan.md §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`）の現 v1 対応関係が `anchorSlice.anchorTag` field に記録されている
- 既存 v1 の 20 タグが §OCS.5 Promotion Gate L2（Origin-linked）に到達するための Origin Journal 転記（親 Phase 1 残 2 checkbox の解消）

**受け入れ条件:** 35+ ファイル全件の現 v1 タグが記録され、未分類件数 + Anchor Slice 帰属件数 + Drift Budget 値が baseline 化。

### Phase 1: Schema 設計

**目的:** v2 責務軸の vocabulary を設計する（≤ 15）。Antibody Pair + Cognitive Load 配分。

**成果物:**

- `references/01-principles/responsibility-taxonomy-schema.md`
- `app/src/test/responsibilityTaxonomyRegistryV2.ts`（新 registry、v1 併存）
- Antibody Pairs（例: `R:authoritative` ↔ `R:bridge`）
- Cognitive Load 配分表

**受け入れ条件:** 15 以下の R:tag vocabulary + 対応 T:kind が TBD で記録されている。

### Phase 2: Migration Path

**目的:** v1 → v2 の対応表 + `R:unclassified` 段階導入。

**成果物:**

- `references/03-guides/responsibility-v1-to-v2-migration-map.md`
- `R:unclassified` を v2 registry に active tag として追加
- v1 タグなし → v2 `R:unclassified` の mechanical 変換スクリプト

**受け入れ条件:** 対応が決まらない v1 タグは `R:unclassified` に落とす方針が明文化。

### Phase 3: Guard 実装

**目的:** v2 guard を即時導入（親 Phase 1 完了後）。v1 guard と並行運用。
**Anchor Slice §OCS.7 段階 1 の保証経路完成**（registry → guard → CI → health KPI が end-to-end で動作する）を本 Phase の到達条件に置く。

**成果物:**

- `app/src/test/guards/responsibilityTagGuardV2.test.ts`
- interlock 検証 guard（R:tag → 必須 T:kind の存在検証 — test-taxonomy-v2 Phase 3 と co-change）
- 未分類の ratchet-down baseline（減少のみ許可）
- タグなし ≠ `R:unclassified` の区別を hard fail
- 親 plan.md §AR-TAXONOMY-\* 7 件のうち責務軸側を active 化（baseline=current 値で ratchet-down のみ許可）
- 親 plan.md §OCS.7 Anchor Slice 5 R:tag（`R:calculation` / `R:bridge` / `R:read-model` / `R:guard` / `R:presentation`）が §OCS.5 Promotion Gate L4（Guarded）に到達
- 親 plan.md §taxonomy-health.json schema の責務軸 fields（`taxonomy.responsibility.*`）を出力する collector 実装

**受け入れ条件:** v2 guard が PASS、Anchor Slice 5 R:tag が L4 到達、`npm run taxonomy:check` 責務軸側が PASS。

### Phase 4: Pilot

**目的:** 少数ファイル（≤ 20）で v2 タグを試験運用。

**成果物:**

- Pilot 対象ファイルリスト
- v2 タグ付け実施 + 問題点記録
- Pilot 経由で Schema に fix が必要なら review window で修正

### Phase 5: Operations

**目的:** 責務軸固有の review window 手続き（軸共通部分は親 Phase 2）。

**成果物:**

- `references/03-guides/responsibility-taxonomy-operations.md`
- 新 R:tag 提案テンプレート + 撤退テンプレート
- 同期 review window での test-taxonomy-v2 との連絡手順

### Phase 6: Migration Rollout

**目的:** 全ファイル段階移行。Pilot で確定した Schema を全件適用。

**成果物:**

- 全 R:tag 付けの完了（`R:unclassified` 含む）
- v1 registry と v2 registry の整合検証 guard（co-change 検出）
- health KPI: v2 未分類件数 baseline + v1/v2 ギャップ baseline

### Phase 7: v1 Deprecation

**目的:** v1 guard の sunset 予告。消費者に期限を明示。

**成果物:**

- v1 registry / guard に `@deprecated since: <date>, remove: <date+90d>` コメント
- 移行期限の設定と deprecation warning

### Phase 8: v1 Retirement

**目的:** v1 guard 撤去 + old tag 禁止 guard 化。

**成果物:**

- v1 guard / registry の削除
- 旧 R:tag（v1 にあって v2 にないもの）を禁止する新 guard
- v1 関連の allowlist / ratchet baseline の削除

### Phase 9: Legacy Collection

**目的:** 旧コメント / 旧 references 文書 / 旧コード掃除。

**成果物:**

- v1 参照の全削除（`grep -rn "responsibilityTagRegistry[^V]"` が 0 件）
- `responsibility-separation-catalog.md` の v2 版更新
- CLAUDE.md 参照の v2 統一

---

## Phase 別禁止事項

| Phase | 禁止事項                                                    |
| ----- | ----------------------------------------------------------- |
| 0     | 未分類を "削減目標" として記録する（baseline 化のみ）       |
| 1     | Cognitive Load 15 を超える vocabulary 設計                  |
| 1     | R:utility / R:misc 等の「捨て場タグ」導入                   |
| 1     | T:kind を仮置きで決める（TBD 必須）                         |
| 2     | v1 → v2 の強制 1:1 マッピング（曖昧は `R:unclassified` に） |
| 3     | v1 guard を停止する                                         |
| 3     | 未分類を hard fail にする（ratchet-down のみ）              |
| 4     | Pilot で Schema 変更を review window 外で commit            |
| 5     | test-taxonomy-v2 を知らずに R:tag 追加                      |
| 6     | review window を経由しない新 R:tag の付与                   |
| 7     | deprecation 期限を 90 日未満にする                          |
| 8     | v1 retirement を Migration Rollout 未完了で行う             |
| 9     | v1 参照が残る状態で archive                                 |

---

## Phase 進行依存

```
親 Phase 1 (Constitution) ← 本 Phase 0 の前提
親 Phase 2 (Review Window) ← 本 Phase 5 の前提
本 Phase 0 → 1 → 2 → 3 (v2 guard 即時導入)
            ↓
本 Phase 4 (Pilot) → 6 (Rollout) → 7 → 8 → 9
本 Phase 5 (Operations) は Phase 3 と並行可
```

---

## 関連実装

| パス                                                            | Phase    | 役割                             |
| --------------------------------------------------------------- | -------- | -------------------------------- |
| `app/src/test/responsibilityTagRegistry.ts`                     | 全 Phase | 現行 v1 正本（Phase 8 で撤去）   |
| `app/src/test/responsibilityTaxonomyRegistryV2.ts`              | 1-9      | 新 v2 正本（新規作成）           |
| `app/src/test/guards/responsibilityTagGuard.test.ts`            | 全 Phase | 現行 v1 guard（Phase 8 で撤去）  |
| `app/src/test/guards/responsibilityTagGuardV2.test.ts`          | 3-9      | 新 v2 guard（新規作成）          |
| `references/01-principles/responsibility-taxonomy-schema.md`    | 1-9      | v2 Schema 正本                   |
| `references/02-status/responsibility-taxonomy-inventory.yaml`   | 0-9      | Inventory 正本                   |
| `references/03-guides/responsibility-v1-to-v2-migration-map.md` | 2-8      | 移行対応表                       |
| `references/03-guides/responsibility-taxonomy-operations.md`    | 5-9      | Operations 手順                  |
| `references/03-guides/responsibility-separation-catalog.md`     | 9        | v2 版更新                        |
| `CLAUDE.md`                                                     | 1, 9     | §G8 責務分離ガードの v2 参照更新 |
