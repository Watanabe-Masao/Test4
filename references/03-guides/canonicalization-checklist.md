# canonicalization checklist — 新 registry+guard ペア追加 / 撤退の標準手順

> **canonicalization-domain-consolidation Phase I 成果物** (2026-04-29 起草)。
> 整合性 (registry+guard) ペアを新規追加 / 撤退する人 (AI / 人間) のための標準手順。
> Phase A〜H で institutionalize された rule を**実行可能 checklist に圧縮**したもの。
>
> **冗長性の方針**: 本 doc は judgment / steps の集約点。判断基準の本文は
> `canonicalization-principles.md §P8 / §P9` と `integrity-domain-architecture.md` を
> 参照する (本 doc に重複させない、参照のみ)。

## 目的

新たな整合性ペア (registry / 契約 + 検出 guard) を導入 / 撤退する判断と実装の流れを
一本化し、過去の判例 / 不採用 archive / domain primitive 設計を踏まえた選択を強制する。

## 1. 新 registry+guard ペアを追加する場合

### 1.1 採用判断 (Selection Rule)

> 正本: `references/01-principles/canonicalization-principles.md §P8`

以下の **3 ゲートを全て通過**しなければ採用しない:

- [ ] **G-1 業務意味**: drift が起きると業務 KPI / UX / 計算正本性に観測可能な影響が出るか?
- [ ] **G-2 検出可能性**: 既存 7 検出パターン (双方向存在 / 構造一致 / ratchet-down /
      期限 / 集合関係 / 双方向対称 / cardinality) で機械検出可能か? rule 説明に
      「気をつける」「適切」「妥当」等の subjective 語が含まれないか?
- [ ] **G-3 cardinality**: registry 対象が 3 件以上 + 複数 caller / 複数 module から
      参照されるか?

### 1.2 不採用 archive 確認

- [ ] 採用したい primitive 名が `projects/canonicalization-domain-consolidation/derived/adoption-candidates.json`
      の `rejected[].originalSlot` に含まれていないこと

含まれている場合: その判断を反転させる必要がある (review window 経由)。
`AR-INTEGRITY-NO-RESURRECT` が機械検出する。

### 1.3 primitive 選定

> 正本: `references/03-guides/integrity-domain-architecture.md §3` (各 primitive 責務契約)

- [ ] 既存 14 primitive (parsing 6 / detection 7 / reporting 1) で表現可能か確認
- [ ] 表現可能 → primitive 流用、新 primitive を作らない (P8 tie-breaker C-1)
- [ ] 表現不可能 → 新 primitive 設計、ただし **slot 名の命名規約遵守必須**:
  - `parsing/` は名詞 (data を返す)
  - `detection/` は `check*` プレフィックス動詞 (assertion を返す)
  - `reporting/` は `format*` プレフィックス動詞 (formatter)
  - 違反は `integrityDomainSkeletonGuard` が機械検出

### 1.4 実装

- [ ] guard file 内で `from '@app-domain/integrity'` を import (直接) または
      `contentSpecHelpers` 経由 (contentSpec*Guard 系のみ)
- [ ] caller (guard) 側に I/O を集約、domain primitive は pure 関数として呼ぶ
- [ ] 動作同一性 test を同 PR で landing (旧 inline logic ↔ 新 primitive 経由が
      同 violation 集合を返すこと)

### 1.5 COVERAGE_MAP 更新

- [ ] `app/src/test/guards/integrityDomainCoverageGuard.test.ts` の `COVERAGE_MAP`
      に新 entry を追加 (pairId / displayName / guardFiles / maxLines / status)
- [ ] ratchet-down baseline (maxLines) は実測値を設定
- [ ] `tools/architecture-health/src/collectors/integrity-collector.ts` は
      regex で COVERAGE_MAP を読むため、構造維持に注意 (status: 'migrated' / 'deferred' literal)

### 1.6 撤退規律の選択

> 正本: `references/01-principles/canonicalization-principles.md §P9`

- [ ] **default**: step 5 直接到達 (in-place migration、同一 file 内で inline → primitive 経由に同 PR で同時切替)
- [ ] 5 step フルコース必要なのは以下の場合のみ:
  - (a) 公開 API (npm package / cross-repo から import される)
  - (b) 別 file への論理移動 (新 file を立てて旧 file を sunset)
  - (c) 多数 caller (≥ 5 file)

### 1.7 doc 更新義務

- [ ] `legacy-retirement.md §7` に actual sunset 日付を記録 (step 5 直接到達でも記録)
- [ ] `references/03-guides/guard-test-map.md` に新 guard file を登録
- [ ] (新 doc 追加時) `docs/contracts/doc-registry.json` に登録

## 2. 既存 registry+guard ペアを撤退する場合

### 2.1 撤退判断

- [ ] G-1/G-2/G-3 を再判定 — 業務意味が消えた / 検出パターンが他で代替可能 /
      cardinality が 3 件未満になった、のいずれかが成立すること

### 2.2 撤退手順

> 正本: `references/01-principles/canonicalization-principles.md §P9` 5 step

(c) 多数 caller の場合のみ 5 step フルコース。それ以外は step 5 直接到達。

- [ ] 旧 guard file 削除 + COVERAGE_MAP entry 削除
- [ ] `legacy-retirement.md §7` に actual sunset 日付 + 撤退理由を記録
- [ ] `guard-test-map.md` から削除
- [ ] `architecture-health.json` の `integrity.consolidationProgress` が更新されることを確認

## 3. primitive を永久不採用にする場合

### 3.1 不採用 archive 登録

- [ ] `adoption-candidates.json` の `rejected[]` に entry 追加:
  - `originalSlot`: 提案された slot 名
  - `replacedBy`: 「実装名 (path)」or 「実装せず (理由)」
  - `reason`: なぜ不採用としたか
  - `decidedAt`: YYYY-MM-DD

### 3.2 機械保証

- `AR-INTEGRITY-NO-RESURRECT` (`integrityNoResurrectGuard.test.ts`) が、`rejected[].originalSlot`
  名と `app-domain/integrity/{parsing,detection,reporting}/` 配下 file 名の衝突を hard fail。
  AI / 人間が `rejected` を確認せずに同名 primitive を再提案するリスクを構造的に防ぐ。

## 4. 機械検証経路一覧

| 検証対象 | guard / KPI | 効果 |
|---|---|---|
| pair → guard が domain 経由か | `integrityDomainCoverageGuard.test.ts` (F-2) | 12 migrated pair の domain 経由 import を hard fail で強制 |
| caller (guard) が太っていないか | 同 guard (F-3) | line ratchet-down baseline、太ったら primitive 再評価 trigger |
| 命名規約 | `integrityDomainSkeletonGuard.test.ts` | parsing 名詞 / detection check\* / reporting format\* を hard fail |
| domain 純粋性 | 同 guard | I/O / cross-layer import 禁止を hard fail |
| rejected slot resurrection | `integrityNoResurrectGuard.test.ts` (AR-INTEGRITY-NO-RESURRECT) | 永久不採用 slot 名の primitive 復活を hard fail |
| consolidation progress | `architecture-health.json integrity.consolidationProgress` | gte 90% (Phase H で更新) |
| violations.total | 同 `integrity.violations.total` | Hard Gate eq 0 |
| expiredExceptions | 同 `integrity.expiredExceptions` | Hard Gate eq 0 (`@expiresAt` 過去日 markers 0) |

## 5. 関連 doc

- selection rule: `references/01-principles/canonicalization-principles.md §P8`
- 撤退規律: 同 §P9
- domain 設計: `references/03-guides/integrity-domain-architecture.md`
- inventory: `references/03-guides/integrity-pair-inventory.md`
- adoption candidates: `projects/canonicalization-domain-consolidation/derived/adoption-candidates.json`
