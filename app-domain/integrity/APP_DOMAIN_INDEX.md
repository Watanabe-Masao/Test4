# App Domain — Integrity (整合性ドメイン)

> このアプリ固有の **整合性 (drift detection / registry consistency)** 意味空間。
> 散在する registry+guard ペアの共通 primitive を提供する。
> AAG Core のフレームワーク + App Domain (gross-profit) の隣に並ぶ App Domain pack。

## このディレクトリの役割

`app-domain/integrity/` は、**13 既存 registry+guard ペア**と
**tier1 横展開候補** (hooks bundle / charts builder / wasm bridge / IndexedDB schema)
すべてが利用する **共通 primitive 集合** を提供する。

各 primitive は **pure 関数** (副作用なし)。I/O は guard 側 (caller) に閉じ、
domain 自体は構造化済データを受け取って `DriftReport[]` を返す層に専念する。

## 3 層モデルにおける位置づけ

| 層                     | 役割                                                         | 状態                                 |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------ |
| AAG Core               | 共通原則、schema、共通 guard、共通運用                       | 恒久。アプリに依存しない             |
| **App Domain**（本層） | アプリ固有の意味定義、契約、ルールカタログ、整合性 primitive | 恒久。アプリに依存、案件に依存しない |
| Project Overlay        | 案件ごとの handoff / plan / checklist / health budget        | 一時的。案件ごとに差し替わる         |

`app-domain/integrity/` は `app-domain/gross-profit/` と対称配置。
両者は別ドメインで、相互依存なし。

## 物理 module 構成 (Phase B 完了時の最終形)

```
app-domain/integrity/
├─ APP_DOMAIN_INDEX.md       ← 本 doc
├─ types.ts                  # 抽象型 4 種 (Registry / DriftReport / SyncDirection / EnforcementSeverity)
├─ parsing/                  # 入力形式 → Registry<TEntry> 中間表現
│  ├─ jsonRegistry.ts
│  ├─ tsRegistry.ts
│  ├─ yamlFrontmatter.ts
│  ├─ filesystemRegistry.ts
│  ├─ markdownIdScan.ts
│  ├─ jsdocTag.ts
│  └─ index.ts
├─ detection/                # Registry<TEntry> + 比較対象 → DriftReport[]
│  ├─ existence.ts
│  ├─ pathExistence.ts
│  ├─ shapeSync.ts
│  ├─ ratchet.ts
│  ├─ temporal.ts
│  ├─ setRelation.ts
│  ├─ bidirectionalReference.ts
│  ├─ cardinality.ts
│  └─ index.ts
├─ reporting/                # DriftReport[] → message
│  ├─ formatViolation.ts
│  └─ index.ts
└─ index.ts                  # public API barrel
```

## 現在の実装状態 (B-1 landing 時点)

| Phase B Step | 内容                                                                                    | 状態      |
| ------------ | --------------------------------------------------------------------------------------- | --------- |
| **B-1**      | `types.ts` + `index.ts` + APP_DOMAIN_INDEX.md                                           | ✅ landed |
| **B-2**      | `reporting/formatViolation.ts` + tests (6)                                              | ✅ landed |
| **B-3**      | `parsing/yamlFrontmatter.ts` + `parsing/sourceLineLookup.ts` + tests (7+7)              | ✅ landed |
| **B-4**      | `detection/existence.ts` + `detection/pathExistence.ts` + tests (9)                     | ✅ landed |
| **B-5**      | `detection/ratchet.ts` + `detection/temporal.ts` + tests (4+8)                          | ✅ landed |
| **B-6**      | `contentSpecHelpers.ts` を domain delegation に + 11 contentSpec\*Guard 動作同一性 PASS | ✅ landed |
| **B-7**      | `contentSpecHelpers.ts` `@deprecated` (3 metadata 完備、@expiresAt: 2026-10-31)         | ✅ landed |

**1 PR = 1 step 原則** (撤退規律 5 step 観察期間確保)。

## 不変条件 (domain 純粋性)

`app-domain/integrity/` は次を厳守:

1. **副作用ゼロ** — `fs.readFileSync` 等の I/O は guard 側 (caller) で行い、文字列 / 構造化データを primitive に渡す
2. **依存方向** — 他の app-domain や app/src/ に依存しない (types は自己完結)
3. **テスト純粋性** — domain primitive 自体の test は I/O を持たない (fixture string で完結)
4. **adapter は薄い** — guard test 側の adapter は最大 30 行 (primitive を呼んで violations を expect するだけ)

これらは Phase F (Domain Invariant Test) で機械検証される。

## 利用予定の registry+guard ペア (Phase A inventory §4)

### 既存 13 ペア (Phase B-E migration、priority 順)

1. `references/05-contents/` ↔ `contentSpec*Guard × 12` (priority 1, Phase B reference) — Phase K Option 1 で contentSpecLastSourceCommitGuard 追加
2. `docs/contracts/doc-registry.json` ↔ `docRegistryGuard` (priority 2, Phase C lowest risk)
3. `app/src/test/calculationCanonRegistry.ts` ↔ `calculationCanonGuard` (Phase D-W1)
4. `app/src/application/readModels/<dir>/` ↔ `canonicalizationSystemGuard` (Phase D-W1)
5. `docs/contracts/test-contract.json` ↔ `testContractGuard` (Phase D-W1)
6. `roles/<role>/scope.json` ↔ `scopeJsonGuard` / `scopeBoundaryInvariant` (Phase D-W1)
7. `docs/contracts/principles.json` ↔ `documentConsistency.test.ts` (Phase D-W2)
8. taxonomy v2 R/T registry ↔ `taxonomyInterlockGuard` 等 (Phase D-W2)
9. `architectureRules` base+overlays+defaults ↔ `architectureRule(MergeSmoke)Guard` (Phase D-W2)
10. `app/src/test/allowlists/*.ts` ↔ `allowlistMetadataGuard` (Phase D-W3)
11. `projects/<id>/checklist.md` ↔ `checklistFormat` / `GovernanceSymmetryGuard` (Phase D-W3)
12. `OBLIGATION_MAP` ↔ `obligation-collector` / `architectureRuleGuard` (Phase D-W3)
13. `references/03-guides/invariant-catalog.md` ↔ invariant test 群 (Phase D-W3)

### 横展開候補 tier1 (Phase H、4 件)

- H-α: `app/src/application/hooks/` (`useXxxBundle` / `useXxxPlan`)
- H-β: `app/src/presentation/components/charts/` (input/option builder pair)
- H-γ: `wasm/<module>/` (registry + bridge 対応表)
- H-δ: Storage admin / IndexedDB schema (migration ladder)

## 関連実装

| パス                                                                              | 役割                                                              |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `references/03-guides/integrity-domain-architecture.md`                           | Phase B 設計 doc (本 domain の構造 + 不変条件 + 実装順)           |
| `references/03-guides/integrity-pair-inventory.md`                                | Phase A inventory (13 ペア詳細 + selection rule + primitive 候補) |
| `references/01-principles/canonicalization-principles.md §P8`                     | selection rule 拡張版 (3 ゲート + 3 tie-breaker)                  |
| `projects/canonicalization-domain-consolidation/derived/adoption-candidates.json` | 採用候補リスト machine-readable                                   |
| `app/src/test/guards/contentSpecHelpers.ts`                                       | Phase B reference 実装の供給元 (Phase J 完遂、312 行)             |
| `app-domain/gross-profit/APP_DOMAIN_INDEX.md`                                     | 既存 app-domain pattern (本 domain の対称配置 reference)          |

## 読み順

1. 本ファイル (App Domain entry point)
2. `references/03-guides/integrity-domain-architecture.md` — domain 設計 doc
3. `references/03-guides/integrity-pair-inventory.md` — 13 ペア + horizontal candidates inventory
4. `references/01-principles/canonicalization-principles.md` — P1〜P8 (P8 が selection rule)
5. 必要に応じて `types.ts` + `index.ts`
