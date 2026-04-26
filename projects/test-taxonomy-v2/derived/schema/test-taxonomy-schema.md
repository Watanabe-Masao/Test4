---
schemaVersion: "1.0"
schemaSource: "projects/test-taxonomy-v2/plan.md Phase 1"
canonicalSource: "app/src/test/testTaxonomyRegistryV2.ts"
status: draft
landingPhase: "test-taxonomy-v2 Phase 1 (Schema 設計)"
constitutionGate: "親 Phase 1 完遂 + Phase 0 Inventory 完遂 (728 entry baseline)"
---

# Test Taxonomy Schema (v2)

> **役割**: テスト軸 (T:\*) の v2 vocabulary 仕様正本（≤ 15）。
>
> **位置付け**: `taxonomy-constitution.md` 7 不可侵原則 + `taxonomy-interlock.md` R⇔T マトリクスの実装根拠。本文書は **schema 文書** であり、**registry 実装** (`testTaxonomyRegistryV2.ts`) の双方向 canonical source。
>
> **Cognitive Load Ceiling 適用**: v2 = 15（cap）/ 余裕 0。primary 11 + optional 4 で tier 分離し、運用上の認知負荷は primary 11 に集中させる。
>
> **Origin**: 各 T:kind の Why / When / Who / Sunset は `taxonomy-origin-journal.md` §4「v2 T:kind Origin」に記録（Phase 1 統合 branch で landing 予定）。

## 1. v2 T:kind vocabulary（15 件 — primary 11 + optional 4）

設計方針:

- **Anchor Slice 6 T:kind を含む**（親 plan §OCS.7 Anchor Slice 確定済）
- **Interlock マトリクスが要求する T:kind を全件含む**（matrix §2 が implied vocabulary）
- **Cognitive Load Ceiling 15（cap）**: primary tier (11) で日常運用、optional tier (4) は既存 R:tag の追加検証用
- **TSIG global rule からの移行**: 全 728 test に対する global obligation を tag-based obligation に置換（子 Phase 8 で TSIG retirement）

### 1.1. Primary tier（必須 T:kind 10 + sentinel 1 = 11）

interlock マトリクス §2.1 で **必須 (required)** と指定された T:kind + sentinel。

|   # | T:kind               | Anchor | 検証対象 R:tag | 検証内容                                        |
| --: | -------------------- | :----: | -------------- | ----------------------------------------------- |
|   1 | `T:unit-numerical`   |   ✅   | R:calculation  | 数値契約（入力 → 出力の正しさ）                 |
|   2 | `T:boundary`         |   ✅   | R:calculation  | 境界値（empty / null / overflow / 0 / 負数 等） |
|   3 | `T:contract-parity`  |   ✅   | R:bridge       | current ⇔ candidate の同一性                    |
|   4 | `T:zod-contract`     |   ✅   | R:read-model   | Zod schema による parse fail fast               |
|   5 | `T:null-path`        |   —    | R:read-model   | 欠損正常系（null / undefined の許容範囲）       |
|   6 | `T:meta-guard`       |   ✅   | R:guard        | guard 自身の契約（test for tests）              |
|   7 | `T:render-shape`     |   ✅   | R:presentation | 描画 DOM 形状の検証                             |
|   8 | `T:state-transition` |   —    | R:store        | state 遷移の網羅性                              |
|   9 | `T:dependency-list`  |   —    | R:hook         | useEffect 等の deps 完全性                      |
|  10 | `T:unmount-path`     |   —    | R:hook         | unmount 時の cleanup 完全性                     |
|  11 | `T:unclassified`     |   —    | R:unclassified | 保留状態の sentinel（原則 1: 未分類は能動タグ） |

### 1.2. Optional tier（追加検証 4）

interlock マトリクス §2.1 で **任意 (optional)** と指定された T:kind。日常運用では primary を使い、補助的に追加検証として用いる。

|   # | T:kind                  | 検証対象 R:tag | 補助検証内容                                                 |
| --: | ----------------------- | -------------- | ------------------------------------------------------------ |
|  12 | `T:invariant-math`      | R:calculation  | 数学的不変条件（合計値 = 構成要素和、シャープリー恒等式 等） |
|  13 | `T:fallback-path`       | R:bridge       | fallback 分岐の到達性                                        |
|  14 | `T:allowlist-integrity` | R:guard        | allowlist 構造の整合性                                       |
|  15 | `T:side-effect-none`    | R:presentation | 副作用がないことの検証                                       |

**合計 15 件 = Cognitive Load Ceiling 15 cap**。**新規 T:kind 追加は review window 経由のみ（既存 T:kind retirement と同 window 必須）。**

## 2. Antibody Pairs（原則 6: 対概念タグの相互制約）

各 T:kind は対概念タグと **意味的に補完** な関係を持つ。1 test が両方を「同時主張」する場合は scope を分離（Antibody Pair の片方を選ぶ）。null = 対概念タグなし（sentinel または lifecycle bookend）。

| Pair                                       | 関係                                                  |
| ------------------------------------------ | ----------------------------------------------------- |
| `T:unit-numerical` ↔ `T:invariant-math`    | 局所点検 vs 大域不変条件                              |
| `T:boundary` ↔ `T:null-path`               | 境界値 (overflow / edge) vs 欠損値 (null / undefined) |
| `T:contract-parity` ↔ `T:fallback-path`    | 同一経路の検証 vs 分岐経路の検証                      |
| `T:meta-guard` ↔ `T:allowlist-integrity`   | guard 自身 (self) vs guard データ (structure)         |
| `T:render-shape` ↔ `T:side-effect-none`    | 出力形状 vs 純粋性                                    |
| `T:state-transition` ↔ `T:dependency-list` | state 変化 vs effect 変化（store / hook 軸分離）      |
| `T:zod-contract` ↔ null                    | parse boundary、対概念なし                            |
| `T:unmount-path` ↔ null                    | lifecycle bookend、対概念なし                         |
| `T:unclassified` ↔ null                    | sentinel、対概念なし                                  |

> **原則**: Pair の片方を新規追加するときは、もう片方の境界が崩れないかを review window で同時審議する（Constitution 原則 6）。

## 3. Obligation の種類（must-have / should-have / may-have）

各 R:tag → T:kind の対応に **obligation 強度** を 3 段階で持たせる。これにより interlock guard の強制力を制御する。

| Obligation    | 意味                                              | guard 動作                                        |
| ------------- | ------------------------------------------------- | ------------------------------------------------- |
| `must-have`   | required: 1 件以上の test が必須                  | 違反は hard fail（baseline=0 強制）               |
| `should-have` | 推奨: 1 件以上が望ましい（baseline ratchet-down） | 違反は WARN、件数を baseline で固定 + 段階的 0 化 |
| `may-have`    | optional: 任意                                    | 検出のみ、guard は静観                            |

interlock マトリクス §2.1 の対応:

| 対応列      | obligation tier | 例                                                    |
| ----------- | --------------- | ----------------------------------------------------- |
| 必須 T:kind | `must-have`     | R:calculation → T:unit-numerical (must)               |
| 任意 T:kind | `should-have`   | R:calculation → T:invariant-math (should)             |
| 関係なし    | （適用なし）    | R:calculation → T:render-shape は obligation 関係なし |

子 Phase 3（Guard 実装）で `AR-TAXONOMY-INTERLOCK` がこの 3 段階 obligation を実装する。

## 4. v1 TSIG → v2 T:kind migration map（参考、Phase 2 で正式 landing）

v1 の **global rule（TSIG-\*）** は全 728 test に適用されていたが、v2 では **R:tag → T:kind interlock** で **per-test obligation** に置換する。

| v1 TSIG rule (適用件数)                             | v2 移行先                                                                   | 移行根拠                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| TSIG-TEST-01 (728: existence-only assertion 禁止)   | 全 T:kind に "Substantive Assertion 必須" 原則を継承（global → per-T:kind） | T:kind ごとに「実証的 assertion とは何か」を定義し、guard が tag-aware に検証 |
| TSIG-TEST-04 (728: existence-only suppression 禁止) | 全 T:kind の test 品質契約に統合                                            | 同上                                                                          |
| TSIG-COMP-03 (103: comparison test 関連)            | T:contract-parity に統合（R:bridge の必須 obligation）                      | comparison は bridge の archetype                                             |
| AR-G3-SUPPRESS-RATIONALE (103)                      | T:kind 軸とは独立（ts-suppress comment 検証は別 layer 維持）                | T:kind は "何を保証するか"、suppression は "コメント形式" — 軸が異なる        |

**集約結果**: v1 4 global rules → v2 11 primary T:kind (per-tag obligation) + 4 optional T:kind。

## 5. Frontmatter 必須項目（OCS.2 / OCS.5 / OCS.4 統合）

各 T:kind entry は registry V2 で次の frontmatter を持つ:

```typescript
{
  kind: 'T:unit-numerical',
  tier: 'primary',                   // primary | optional | sentinel
  evidenceLevel: 'guarded',          // §OCS.2: generated | tested | guarded | reviewed | asserted | unknown
  promotionLevel: 'L1',              // §OCS.5: L0 | L1 | ... | L6
  lifecycle: 'active',               // §OCS.4: proposed | active | deprecated | sunsetting | retired | archived
  origin: {                          // §OCS.5 L2 Origin-linked の入力
    why: '<なぜ採択したか>',
    when: '<採択日>',
    who: '<採択者>',
    sunsetCondition: '<撤退条件>'
  },
  interlock: {                       // taxonomy-interlock.md §2.2 の引用
    verifies: ['R:calculation'],     // 検証対象 R:tag
    obligation: 'must-have'          // must-have | should-have | may-have
  },
  antibodyPair: 'T:invariant-math',  // 原則 6: 対概念タグ
  description: '<1 行説明>'
}
```

**初期 promotionLevel**:

- 全 v2 T:kind: **L1 (Registered)** — registry に entry 追加完了
- L2 (Origin-linked) 到達は Phase 1 完遂 + Origin Journal §4 transcription 完了 = **本 Phase 1 統合 branch 完遂 = L2**
- L3 (Interlock-bound) 到達は子 Phase 3 で `AR-TAXONOMY-INTERLOCK` active 化時
- L4 (Guarded) 到達は同上 + matrix violations baseline=current 値で凍結時

**初期 lifecycle**: 全 v2 T:kind は **`active`**（Constitution Phase 1 で承認済 vocabulary として）。

## 6. Cognitive Load Ceiling cap （15）の運用

v2 = 15 / Ceiling = 15 → **余裕 0**（cap 到達）。

> **原則**: 新 T:kind 追加は **review window で必ず "既存 T:kind の retirement とセット"** で裁定する（差し引き 0 を維持）。
>
> **段階移行の余地**: optional tier 4 件のいずれかを retirement 候補にすれば primary 拡張が可能。ただし retirement は子 Phase 7-8 のみで実施可（並行運用期間を必ず取る）。

## 7. 改訂手続き

新 T:kind 追加 / 既存 T:kind retirement / Antibody Pair 組み換え は **review window 経由のみ**:

- 提案: `references/02-status/taxonomy-review-journal.md` に entry 追加
- 裁定: 四半期 review window で人間判断
- 連動: 対応 R:tag が必要なら responsibility-taxonomy-v2 と同期 review window で同時裁定（原則 4）
- **新 T:kind は最低 1 件の R:tag に対する検証契約を持つ必要がある**（孤立 T:kind 禁止、interlock §5.2）

詳細は `references/03-guides/taxonomy-review-window.md` を参照。

## 8. 関連文書

| 文書                                                    | 役割                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `references/01-principles/taxonomy-constitution.md`     | 7 不可侵原則（本 schema は原則 1, 2, 4, 6, 7 の実装）               |
| `references/01-principles/taxonomy-interlock.md`        | R⇔T 完全マトリクス（本 schema § Interlock 検証対象 R:tag 列の正本） |
| `references/01-principles/taxonomy-origin-journal.md`   | 各 T:kind の Origin (Why/When/Who/Sunset)（§4 で landing）          |
| `app/src/test/testTaxonomyRegistryV2.ts`                | 本 schema の TypeScript 実装（registry 正本）                       |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts`  | 現行 TSIG global rule（子 Phase 8 で T:kind ベースに置換）          |
| `references/02-status/test-taxonomy-inventory.yaml`     | Phase 0 baseline（CanonEntry 728 entry / Anchor 206）               |
| `references/03-guides/test-tsig-to-v2-migration-map.md` | TSIG→v2 移行詳細（子 Phase 2 で landing）                           |
| `projects/taxonomy-v2/plan.md` §AR-TAXONOMY-\*          | rule 仕様正本（子 Phase 3 で active 化）                            |
