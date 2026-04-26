# plan — test-taxonomy-v2（子: テスト軸）

> 親 `taxonomy-v2` の 7 不可侵原則 + interlock 仕様を制約とし、
> テスト軸 (T:\*) の Schema / Guard / Operations / Legacy 撤退を 10 Phase で実装する。

## 不可侵原則（親から継承）

親 `projects/taxonomy-v2/plan.md` の 7 原則を全て継承する。特に本 project で
影響が大きいもの:

1. **原則 1: 未分類は分類である** → `T:unclassified` を active tag として導入
2. **原則 2: 1 タグ = 1 軸** → テスト軸は「何を証明するか」のみ。書き方（unit / e2e 等）と混ぜない
3. **原則 3: 語彙生成は高コスト儀式** → Phase 1 Schema 後は review window でのみ追加
4. **原則 4: Tag ↔ Test は双方向契約** → responsibility-taxonomy-v2 と同期 review window
5. **原則 7: Cognitive Load Ceiling** → テスト軸 vocabulary ≤ 15

### 本 project 固有の禁則

- **テスト書式を T:kind に混入させない** → 「vitest で書く」は T:kind ではない。
  「何を証明するか」（invariant / parity / contract 等）のみが T:kind
- **global obligation を T:kind 未経由で増やす禁止** → TSIG-\* の増設は T:kind 経由
- **R:tag を単独参照して T:kind を決定禁止** → interlock は親の正本

---

## Phase 構造（10 Phase）

### Phase 0: Inventory

**目的:** 現行 TSIG global rule + 既存テストの種類分布を棚卸し。

**成果物:**

- `references/02-status/test-taxonomy-inventory.yaml`（親 plan.md §Common Inventory Schema の CanonEntry shape に適合）
- 既存 TSIG-\* rule の全件と適用対象数
- 既存テストの粗分類（unit / contract / invariant / parity / boundary / render-shape 等）
- 未分類テスト件数の baseline
- 親 plan.md §OCS.6 Drift Budget のテスト軸 baseline（`untagged` / `unknownVocabulary` / `missingOrigin`）が CanonEntry 集計から計測されている
- 親 plan.md §OCS.7 Anchor Slice 6 T:kind（`T:unit-numerical` / `T:boundary` / `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`）の現 TSIG 対応関係が `anchorSlice.anchorTag` field に記録されている
- 既存 TSIG-\* rule が §OCS.5 Promotion Gate L2（Origin-linked）に到達するための Origin Journal 転記

**受け入れ条件:** 既存テスト全件の粗分類が記録され、未分類件数 + Anchor Slice 帰属件数 + Drift Budget 値が baseline 化。

### Phase 1: Schema 設計

**目的:** v2 テスト軸の T:kind vocabulary を設計する（≤ 15）。

**成果物:**

- `references/01-principles/test-taxonomy-schema.md`
- `app/src/test/testTaxonomyRegistryV2.ts`（新 registry、TSIG 併存）
- Antibody Pairs（例: `T:parity` ↔ `T:invariant-math`）
- obligation の種類定義（must-have / should-have / may-have）

**受け入れ条件:** 15 以下の T:kind vocabulary + 対応 R:tag が TBD で記録されている。

### Phase 2: Migration Path

**目的:** TSIG-\* → T:kind の対応表 + `T:unclassified` 段階導入。

**成果物:**

- `references/03-guides/test-tsig-to-v2-migration-map.md`
- `T:unclassified` を v2 registry に active tag として追加
- タグなしテスト → `T:unclassified` 明示付与の mechanical 変換方針

**受け入れ条件:** 対応が決まらない TSIG rule は `T:unclassified` に落とす方針が明文化。

### Phase 3: Guard 実装

**目的:** v2 guard を即時導入。TSIG と並行運用。
**Anchor Slice §OCS.7 段階 1 の保証経路完成**（registry → guard → CI → health KPI が end-to-end で動作する）を本 Phase の到達条件に置く。

**成果物:**

- `app/src/test/guards/testTaxonomyGuard.test.ts`
- interlock 検証 guard（T:kind ↔ R:tag の存在検証 — responsibility-taxonomy-v2 Phase 3 と co-change）
- 未分類の ratchet-down baseline
- タグなし ≠ `T:unclassified` を hard fail
- 親 plan.md §AR-TAXONOMY-\* 7 件のうちテスト軸側を active 化（baseline=current 値で ratchet-down のみ許可）
- 親 plan.md §OCS.7 Anchor Slice 6 T:kind（`T:unit-numerical` / `T:boundary` / `T:contract-parity` / `T:zod-contract` / `T:meta-guard` / `T:render-shape`）が §OCS.5 Promotion Gate L4（Guarded）に到達
- 親 plan.md §taxonomy-health.json schema のテスト軸 fields（`taxonomy.test.*`）を出力する collector 実装

**受け入れ条件:** v2 guard が PASS、Anchor Slice 6 T:kind が L4 到達、`npm run taxonomy:check` テスト軸側が PASS。

### Phase 4: Pilot

**目的:** 少数テスト（≤ 30）で T:kind を試験運用。

**成果物:**

- Pilot 対象テストリスト
- T:kind 付与実施 + 問題点記録
- Pilot 経由で Schema 修正が必要なら review window で対応

### Phase 5: Operations

**目的:** テスト軸固有の review window 手続き（軸共通部分は親 Phase 2）。

**成果物:**

- `references/03-guides/test-taxonomy-operations.md`
- 新 T:kind 提案テンプレート + 撤退テンプレート
- responsibility-taxonomy-v2 との同期 review window 連絡手順

### Phase 6: Migration Rollout

**目的:** 全テスト段階移行。Pilot で確定した Schema を全件適用。

**成果物:**

- 全テストに T:kind（`T:unclassified` 含む）付与
- TSIG と v2 registry の整合検証 guard
- health KPI: v2 未分類件数 + TSIG/v2 ギャップ baseline

### Phase 7: TSIG Global Rule Deprecation

**目的:** TSIG global rule の sunset 予告。

**成果物:**

- TSIG-\* rule に `@deprecated since: <date>, remove: <date+90d>` コメント
- 移行期限の設定と deprecation warning
- 各 TSIG rule が v2 の T:kind obligation で置換可能であることの確認表

### Phase 8: TSIG Retirement

**目的:** TSIG global rule 撤去 + T:kind ベース obligation への完全置換。

**成果物:**

- `testSignalIntegrityGuard.test.ts` の削除 or T:kind 認識化
- 旧 TSIG-\* identifier を参照する code の削除
- v2 T:kind ベース obligation が全ての global rule を置換していることの検証

### Phase 9: Legacy Collection

**目的:** 旧コメント / 旧 references 文書 / 旧コード掃除。

**成果物:**

- TSIG-\* 参照の全削除（`grep -rn "TSIG-"` が 0 件）
- テスト品質関連文書の v2 版更新
- CLAUDE.md §G8 参照の v2 統一

---

## Phase 別禁止事項

| Phase | 禁止事項                                                               |
| ----- | ---------------------------------------------------------------------- |
| 0     | 未分類テストを "削減目標" として記録する（baseline 化のみ）            |
| 1     | Cognitive Load 15 を超える vocabulary 設計                             |
| 1     | テスト書式（unit / e2e / integration）を T:kind にする                 |
| 1     | R:tag 参照で T:kind を決める（両軸同期 review window 経由必須）        |
| 2     | TSIG rule → T:kind の強制 1:1 マッピング（曖昧は `T:unclassified` に） |
| 3     | TSIG を停止する                                                        |
| 3     | 未分類を hard fail にする（ratchet-down のみ）                         |
| 4     | Pilot で Schema 変更を review window 外で commit                       |
| 5     | responsibility-taxonomy-v2 を知らずに T:kind 追加                      |
| 6     | T:kind 付けとテスト品質修正を同 PR に混ぜる                            |
| 6     | review window を経由しない新 T:kind の付与                             |
| 7     | deprecation 期限を 90 日未満にする                                     |
| 8     | TSIG retirement を Migration Rollout 未完了で行う                      |
| 9     | TSIG 参照が残る状態で archive                                          |

---

## Phase 進行依存

```
親 Phase 1 (Constitution) ← 本 Phase 0 の前提
親 Phase 2 (Review Window) ← 本 Phase 5 の前提
本 Phase 0 → 1 → 2 → 3 (v2 guard 即時導入)
            ↓
本 Phase 4 (Pilot) → 6 (Rollout) → 7 → 8 → 9
本 Phase 5 (Operations) は Phase 3 と並行可

同期 review window:
responsibility-taxonomy-v2 Phase 1 (R:tag Schema) ↔ 本 Phase 1 (T:kind Schema)
responsibility-taxonomy-v2 Phase 3 (R guard)     ↔ 本 Phase 3 (T guard: interlock)
```

---

## 関連実装

| パス                                                    | Phase    | 役割                         |
| ------------------------------------------------------- | -------- | ---------------------------- |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts`  | 全 Phase | 現行 TSIG（Phase 8 で置換）  |
| `app/src/test/testTaxonomyRegistryV2.ts`                | 1-9      | 新 v2 正本（新規作成）       |
| `app/src/test/guards/testTaxonomyGuard.test.ts`         | 3-9      | 新 v2 guard（新規作成）      |
| `references/01-principles/test-taxonomy-schema.md`      | 1-9      | v2 Schema 正本               |
| `references/02-status/test-taxonomy-inventory.yaml`     | 0-9      | Inventory 正本               |
| `references/03-guides/test-tsig-to-v2-migration-map.md` | 2-8      | 移行対応表                   |
| `references/03-guides/test-taxonomy-operations.md`      | 5-9      | Operations 手順              |
| `CLAUDE.md`                                             | 1, 9     | §G8 テスト品質の v2 参照更新 |
