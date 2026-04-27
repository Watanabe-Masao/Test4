---
schemaVersion: "1.0"
canonicalSource: "app/src/test/testTaxonomyRegistryV2.ts (v2 vocabulary) + app/src/test/guards/testSignalIntegrityGuard.test.ts (v1 TSIG global rules)"
inventorySource: "references/02-status/test-taxonomy-inventory.yaml (Phase 0 baseline 728 entry)"
status: draft
landingPhase: "test-taxonomy-v2 Phase 2 (Migration Path)"
constitutionGate: "親 Phase 1 + 子 Phase 0 + 子 Phase 1 完遂 / 親 §OCS.4 Lifecycle State Machine 適用"
---

# Test Taxonomy TSIG → v2 Migration Map

> **役割**: テスト軸 v1 TSIG global rule (4 件) → v2 T:kind (15 件 = primary 11 + optional 4) の **per-rule 移行表 + 退避方針 + Lifecycle 対応**。
>
> **位置付け**: 子 Phase 2 (Migration Path) の正本。Phase 0 inventory (728 entry baseline) と Phase 1 schema (v2 15 T:kind vocabulary) の橋渡し。
>
> **設計上の最重要事項**: v1 TSIG は **global rule**（全 728 test に一律適用）、v2 は **per-tag obligation**（R:tag → 必須 T:kind interlock）。**移行 paradigm が根本的に異なる**。
>
> **設計原則**:
>
> - 原則 1（未分類は分類である）: タグなし test / 1:1 マッピング不能な TSIG rule は **T:unclassified に明示退避**（Phase 6 Migration Rollout で能動付与）
> - 原則 4（Tag ↔ Test は双方向契約）: v2 では tag が test obligation を発行し、test が tag contract を検証する
> - 原則 3（語彙生成は儀式）: v2 vocabulary は Phase 1 review window 通過済 — 本 map は再裁定しない
> - **Phase 1 禁止事項**: TSIG → T:kind の **強制 1:1 マッピング禁止**（曖昧は `T:unclassified` に）

## 1. v1 TSIG global rule → v2 T:kind mapping table

Phase 0 inventory 集計（test-taxonomy-inventory.yaml header）から TSIG rule 適用件数を引用。

|   # | v1 TSIG rule                                                             |      適用件数 | v2 移行先                                                                          | 移行種別               | 移行根拠                                                                                                                                                                                                                    |
| --: | ------------------------------------------------------------------------ | ------------: | ---------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | `TSIG-TEST-01`（existence-only assertion 禁止）                          | 728（global） | **全 v2 T:kind に "Substantive Assertion 必須" 原則を継承**（global → per-T:kind） | **N:M paradigm shift** | 全 T:kind が「実証的 assertion とは何か」を独自定義する。例: T:unit-numerical は具体数値検証、T:render-shape は DOM 形状 assertion、T:meta-guard は guard 自身の実証検証。global rule は廃止し per-T:kind obligation に分散 |
|   2 | `TSIG-TEST-04`（tautology assertion 禁止: `expect(true).toBe(true)` 等） | 728（global） | **全 v2 T:kind の test 品質契約に統合**                                            | **N:M paradigm shift** | TSIG-TEST-01 と相補（前者は existence-only、後者は tautology）。同様に T:kind 個別の "実証的 assertion" 定義に統合される                                                                                                    |
|   3 | `TSIG-COMP-03`（multi-underscore unused suppress 検出）                  |           103 | `T:contract-parity`（R:bridge の必須 obligation）                                  | **1:1 統合**           | comparison test 系は bridge の archetype（current ⇔ candidate 同一性）。TSIG-COMP-03 が検出する pattern は T:contract-parity の subset                                                                                      |
|   4 | `AR-G3-SUPPRESS-RATIONALE`（ts-suppress comment 検証）                   |           103 | **T:kind 軸とは独立**（別 layer 維持）                                             | **scope 分離**         | T:kind は "何を保証するか"、suppression は "コメント形式" — 軸が異なる。本 rule は T:kind 軸の v2 移行 scope 外、別 layer で恒久維持                                                                                        |

### 集約: TSIG → v2 paradigm shift

| 軸                     | v1 TSIG                | v2 T:kind                                                                                              |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| 適用粒度               | global（全 test 一律） | per-test（R:tag → 必須 T:kind interlock 経由）                                                         |
| Vocabulary 数          | 4 global rules         | 11 primary + 4 optional = 15（Cognitive Load Ceiling cap）                                             |
| Anchor Slice カバー    | 0                      | 6 (T:unit-numerical / T:boundary / T:contract-parity / T:zod-contract / T:meta-guard / T:render-shape) |
| Obligation 強度        | 1 段階（hard fail）    | 3 段階（must-have / should-have / may-have）                                                           |
| Test obligation 発行元 | TSIG file 自身         | Interlock matrix（R:tag が発行）                                                                       |

## 2. T:unclassified 退避方針（Phase 1 禁止事項適用）

### 2.1. 退避対象（mechanical 退避）

Phase 6 Migration Rollout で **無条件に T:unclassified に変換** する test 群。

| 退避対象                                                               |              件数 | 退避理由                                                                                                                                                                    |
| ---------------------------------------------------------------------- | ----------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **タグなし test**（inventory `untagged: 728`）                         |               728 | 全 test（v2 T:kind 自体が v2-only 概念、v1 では全件 untagged）→ Phase 6 Migration Rollout 開始時の起点                                                                      |
| `TSIG-COMP-03` 適用済 test の中で `T:contract-parity` が確定しないもの | ≤ 103 中の subset | TSIG-COMP-03 は 103 test に適用されるが、必ずしも全件が R:bridge 検証ではない（false positive 含む可能性）→ per-test review 経由で T:unclassified or T:contract-parity 分岐 |

**退避時点での合計**: **728 entry が T:unclassified**（baseline 値、初期は全件）。

### 2.2. 退避後の段階的能動付与（Phase 6 Migration Rollout）

T:unclassified からの脱出は **R:tag → 必須 T:kind interlock を経由する review window**:

1. 各 test の検証対象 (R:tag) を確定
2. interlock matrix から required T:kind list を引く
3. test の実 assertion 内容と T:kind 候補を照合
4. review-journal.md に提案 entry 追加
5. 四半期 review window で承認
6. PR あたり最大 50 test ずつ T:unclassified → 具体 T:kind に変換
7. 各変換 PR で `testTaxonomyGuardV2` の `unclassifiedBaseline` を ratchet-down

> **原則**: **T:unclassified を "0 にする" ことが目的ではない**（原則 1）。判断保留が必要な test は恒久的に T:unclassified に留まる。Phase 6 完了基準は「全 test が能動的に分類されている」であり、T:unclassified が 0 ではない。

### 2.3. 1:1 マッピング不能なケース（context-judged）

`TSIG-TEST-01` (728) と `TSIG-TEST-04` (728) は **per-test context judgment** が必要:

| Test の検証対象                | 対応 v2 T:kind                 | 例                                                      |
| ------------------------------ | ------------------------------ | ------------------------------------------------------- |
| 計算結果の数値正しさ           | `T:unit-numerical`             | `expect(calculateGrossProfit(input)).toEqual(expected)` |
| 境界値・edge case              | `T:boundary`                   | `expect(safeDivide(0, 0)).toBe(0)`                      |
| 数学的不変条件（合計値整合等） | `T:invariant-math`（optional） | シャープリー恒等式 test                                 |
| current ⇔ candidate 同一性     | `T:contract-parity`            | bridge file の parity test                              |
| Zod parse 検証                 | `T:zod-contract`               | `expect(() => Schema.parse(invalid)).toThrow()`         |
| 欠損正常系                     | `T:null-path`                  | null / undefined 入力での noop 確認                     |
| guard 自身の検証               | `T:meta-guard`                 | guard test for guards                                   |
| 描画 DOM 形状                  | `T:render-shape`               | `expect(rendered).toMatchSnapshot()`                    |
| state 遷移                     | `T:state-transition`           | reducer test                                            |
| useEffect deps 完全性          | `T:dependency-list`            | hook deps coverage test                                 |
| unmount cleanup                | `T:unmount-path`               | hook cleanup test                                       |

**Phase 6 で per-test review window** で確定する。本 Phase 2 では **判定 deferral リスト** として 728 件全件を退避対象に含める（Phase 6 で段階的に解消）。

## 3. §OCS.4 Lifecycle State Machine の Migration 各段階への対応

親 plan §OCS.4 は vocabulary の生命状態を 6 段階で管理する。Migration Path の各段階に対応付ける:

```text
proposed → active → deprecated → sunsetting → retired → archived
```

### 3.1. v1 TSIG global rule の lifecycle 遷移

| Migration Phase                            | v1 TSIG の lifecycle 状態                                                                                         | 移行内容                                                      | 撤退条件                                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Phase 1 (Schema 設計)**                  | `active`（v1 / v2 並行運用前提）                                                                                  | v2 vocabulary 確定、v1 は変更なし                             | —                                                                                             |
| **Phase 2 (Migration Path)**               | `active`（変更なし）                                                                                              | 本 map で TSIG → v2 mapping を文書化                          | —                                                                                             |
| **Phase 3 (Guard 実装)**                   | `active`（並行運用継続）                                                                                          | v2 guard 即時導入、TSIG global rule と並行                    | —                                                                                             |
| **Phase 4 (Pilot)**                        | `active`                                                                                                          | Pilot test ≤ 30 で v2 T:kind 試験運用、TSIG は無変更          | —                                                                                             |
| **Phase 5 (Operations)**                   | `active`                                                                                                          | review window 開始                                            | —                                                                                             |
| **Phase 6 (Migration Rollout)**            | `active` → segments 単位で T:kind 移行進行（TSIG は active 維持）                                                 | 全 test に v2 T:kind 付与（T:unclassified 含む）              | v2 T:kind 付与完遂時                                                                          |
| **Phase 7 (TSIG Global Rule Deprecation)** | `active` → `deprecated`（新規 test での global 期待禁止、`@deprecated` JSDoc 追加）→ `sunsetting`（撤退期限明示） | sunset 期限 + warning 発行                                    | 90 日以上の撤退期限 + 各 TSIG rule の v2 置換可能性確認表                                     |
| **Phase 8 (TSIG Retirement)**              | `sunsetting` → `retired`（`testSignalIntegrityGuard.test.ts` 削除 or T:kind 認識化）                              | TSIG global rule 撤去 + T:kind ベース obligation への完全置換 | sunset 期限到達 + 全 consumer 0 件 + v2 T:kind が全 global rule を置換していることの検証 PASS |
| **Phase 9 (Legacy Collection)**            | `retired` → `archived`（歴史参照のみ）                                                                            | 旧コメント / 旧 doc / 旧 reference 全削除                     | 全 TSIG-\* grep が 0 件                                                                       |

### 3.2. v2 vocabulary の lifecycle 状態

Phase 1 で **全 v2 T:kind が `active` で landing 済**（registry V2 frontmatter 参照）。Phase 1 完遂時点で `proposed` の vocabulary はない。

> **新規 v2 T:kind 追加** が必要になった場合は **review window 経由のみ**（原則 3）+ **既存 T:kind の retirement とセット**（Cognitive Load Ceiling 15 cap、差し引き 0 維持）。

### 3.3. T:unclassified の lifecycle

T:unclassified は **恒久 sentinel** として `active`。撤退条件なし（原則 1: 未分類は分類である）。

### 3.4. AR-G3-SUPPRESS-RATIONALE の lifecycle（scope 分離）

AR-G3-SUPPRESS-RATIONALE は T:kind 軸とは別 layer（suppression comment 検証 layer）として恒久維持。本 Phase 2 / Phase 7 の TSIG retirement scope **外**。

### 3.5. Phase 7→8 TSIG Retirement 完遂記録（2026-04-27）

| 項目                | 値                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `@deprecated since` | 2026-04-27                                                                                    |
| 物理削除日          | **2026-04-27 retired**（review-journal §3.1 ad-hoc human approval により 90 日 cooling 撤廃）|
| 撤退対象            | `app/src/test/guards/testSignalIntegrityGuard.test.ts`（物理削除済）                          |
| 撤退方法            | 物理削除（v2 T:kind が testTaxonomyRegistryV2.ts に完備、V2-T-1 baseline=0 + V2-T-3 hard rule で per-test 検証完備）|
| 残存 scope          | AR-G3-SUPPRESS-RATIONALE は §3.4 により恒久維持（撤退対象外）                                 |
| 達成条件 (満たした) | 全 test に v2 T:kind 付与済（Phase 6a-2 で達成済 V2-T-1 baseline=0）+ ad-hoc review 承認      |
| 観察期間            | なし（cooling 撤廃: review-journal §3.1 で internal-only codebase での儀式的 cooling 不要と判定） |

> **撤退状況は CLAUDE.md §taxonomy-binding §「v1 / TSIG 撤去状況」表で canonical 参照可能**。

> v2 への置換マップは §1（4 rule × 移行先 T:kind）を canonical source とする。Phase 7→8 完遂時点で TSIG vocabulary は guard layer から完全消滅（rule 定義のみ base-rules.ts に履歴保持）。

## 4. Migration の per-Phase 実装計画（参考）

### Phase 3: Guard 実装

- `testTaxonomyGuard.test.ts` 新設（v2 T:kind vocabulary 対象）
- TSIG global rule と並行運用（baseline ratchet-down 開始）
- `interlock guard`（T:kind ↔ R:tag 整合検証）を test 軸側 active 化（responsibility-taxonomy-v2 Phase 3 と co-change）

### Phase 4: Pilot

- Pilot 対象 test ≤ 30（Anchor Slice 6 T:kind を最低 1 件ずつ含む）
- 例: `app/src/domain/calculations/__tests__/grossProfit.test.ts` (T:unit-numerical / T:boundary) /
  `app/src/application/readModels/salesFact/__tests__/readSalesFact.test.ts` (T:zod-contract / T:null-path) /
  `app/src/test/guards/responsibilityTagGuard.test.ts` (T:meta-guard) /
  bridge parity test 1 件（T:contract-parity）/ snapshot test 1 件（T:render-shape）

### Phase 6: Migration Rollout

- 段階移行（PR あたり最大 50 test）:
  1. **タグなし test 全 728 件 → T:unclassified 一括変換**（最大件数、mechanical conversion）
  2. **TSIG-COMP-03 適用 103 test の review** → R:bridge と判定された subset を T:contract-parity に変換、それ以外は T:unclassified
  3. **Anchor Slice 6 T:kind の per-test review**:
     - T:unit-numerical / T:boundary（domain/calculations 系）
     - T:zod-contract / T:null-path（application/readModels 系）
     - T:meta-guard（test/guards/ 系 102 件）
     - T:render-shape（presentation 系）
  4. **non-Anchor primary T:kind**:
     - T:state-transition（store 系）
     - T:dependency-list / T:unmount-path（hook 系）
  5. **optional T:kind**（追加検証として後続付与）:
     - T:invariant-math（既存シャープリー恒等式 test 等）
     - T:fallback-path / T:allowlist-integrity / T:side-effect-none

### Phase 7: TSIG Global Rule Deprecation

- `testSignalIntegrityGuard.test.ts` の各 TSIG-\* rule 関数に `@deprecated since: <date>, remove: <date+90d>` JSDoc 追加
- 移行期限を CLAUDE.md / references/02-status/ で参照可能化
- 各 TSIG rule が v2 の T:kind obligation で置換可能であることの確認表を作成

### Phase 8: TSIG Retirement

- `testSignalIntegrityGuard.test.ts` 削除 or T:kind 認識化（v2 T:kind ベース obligation で完全置換）
- 旧 TSIG-\* identifier を参照する code 削除
- v2 T:kind ベース obligation が全 global rule を置換していることの検証テスト PASS 確認

### Phase 9: Legacy Collection

- `grep -rn "TSIG-"` が 0 件
- テスト品質関連 references 文書を v2 版に更新
- `CLAUDE.md` §G8 のテスト品質参照を v2 統一
- TSIG 時代の古いコメント / TODO 掃除

## 5. 関連文書

| 文書                                                   | 役割                                           |
| ------------------------------------------------------ | ---------------------------------------------- |
| `references/01-principles/test-taxonomy-schema.md`     | v2 vocabulary 仕様正本 (Phase 1 deliverable)   |
| `references/01-principles/taxonomy-constitution.md`    | 7 不可侵原則（原則 1 / 3 / 4 が本 map の根拠） |
| `references/01-principles/taxonomy-interlock.md`       | R⇔T マトリクス（v2 T:kind ← 検証対象 R:tag）   |
| `references/01-principles/test-signal-integrity.md`    | 現行 TSIG global rule の定義                   |
| `references/02-status/test-taxonomy-inventory.yaml`    | Phase 0 baseline (728 entry / Anchor 206)      |
| `app/src/test/testTaxonomyRegistryV2.ts`               | v2 registry 実装 (Phase 1 deliverable)         |
| `app/src/test/guards/testSignalIntegrityGuard.test.ts` | v1 TSIG global rule（Phase 8 で retirement）   |
| `projects/taxonomy-v2/plan.md` §OCS.4                  | Lifecycle State Machine 仕様正本               |
| `projects/completed/test-taxonomy-v2/checklist.md`               | 子 Phase 2-9 完了条件                          |
