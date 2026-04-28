# integrity-domain-architecture — `app-domain/integrity/` Domain Skeleton 設計

> **canonicalization-domain-consolidation Phase B 設計 doc** (2026-04-28 起草)。
> Phase A inventory (`integrity-pair-inventory.md` §3) で抽出した primitive 集合を
> `app-domain/integrity/` の物理 module 構成として確定する。
>
> **status: design-locked, implementation-pending** — 本 doc は Phase B 着手前の
> 設計固定。実コード（`.ts`）は別 PR で landing する（documentation-first 原則）。

## 0. 設計目標 (Phase A North Star の継承)

> **正本化 → 制度の統一性 → 簡素な仕組みで強固な効果**

Phase B の domain skeleton は「制度の統一性」段階の物理表現:

- 13 ペア + tier1 横展開 4 候補すべてが **同じ primitive 集合**から構築できる
- 各 primitive は **pure 関数**（I/O は guard 側に閉じる）
- 既存 `contentSpecHelpers.ts`（Phase J 完遂、reference 実装）からの **直接 extract** を最大限活用

## 1. 物理 module 構成

```
app-domain/
└─ integrity/
   ├─ APP_DOMAIN_INDEX.md       # 本 doc への entry（既存 gross-profit と対称）
   ├─ types.ts                  # 抽象型 4 種
   ├─ parsing/                  # 入力形式 → Registry<Entry> 中間表現
   │  ├─ jsonRegistry.ts
   │  ├─ tsRegistry.ts
   │  ├─ yamlFrontmatter.ts
   │  ├─ filesystemRegistry.ts
   │  ├─ markdownIdScan.ts
   │  ├─ jsdocTag.ts
   │  └─ index.ts
   ├─ detection/                # Registry<Entry> + 比較対象 → Violation[]
   │  ├─ existence.ts
   │  ├─ pathExistence.ts
   │  ├─ shapeSync.ts
   │  ├─ ratchet.ts
   │  ├─ temporal.ts
   │  ├─ setRelation.ts
   │  ├─ bidirectionalReference.ts
   │  ├─ cardinality.ts
   │  └─ index.ts
   ├─ reporting/                # violation[] → message
   │  ├─ formatViolation.ts
   │  └─ index.ts
   └─ index.ts                  # public API barrel
```

総 ファイル数: **20 件**（types 1 + parsing 7 + detection 9 + reporting 2 + barrel 1）。

## 2. 既存 `app-domain/` との関係

`app-domain/gross-profit/` (現状唯一の app domain) と対称に並べる:

|          | `app-domain/gross-profit/`                         | `app-domain/integrity/` (Phase B 新設)      |
| -------- | -------------------------------------------------- | ------------------------------------------- |
| 性質     | 業務ドメイン (粗利・売上・要因分解)                | 整合性ドメイン (drift 検出 / registry 整合) |
| 構成     | `principles/` + `rule-catalog/`                    | `parsing/` + `detection/` + `reporting/`    |
| 利用者   | `app/src/test/architectureRules.ts` 経由で全 guard | 13 ペアの adapter + tier1 横展開 guard      |
| 不変条件 | 計算正本性 (D1〜D3)                                | drift 検出強度（不可侵原則 1）              |

両者は **AAG Core / App Domain / Project Overlay** 3 層モデルの App Domain 層に並列して位置する。

## 3. 各 primitive の責務契約

### 3.1 `types.ts` — 抽象型

```typescript
// pseudo-code (実装は別 PR)
export interface Registry<TEntry> {
  readonly source: string; // file path or virtual id
  readonly entries: ReadonlyMap<string, TEntry>;
}

export interface DriftReport {
  readonly ruleId: string; // architectureRules.ts の rule id
  readonly severity: "warn" | "gate" | "ratchet-down";
  readonly location: string; // file:line or registry key
  readonly expected: string;
  readonly actual: string;
  readonly fixHint?: string; // aag-response 用 (optional)
}

export type SyncDirection = "one-way" | "two-way";
export type EnforcementSeverity = DriftReport["severity"];
```

### 3.2 `parsing/` — 6 primitive

すべて `(filePath: string) => Registry<TEntry>` 形 (TEntry は registry 固有)。

| primitive            | 入力                      | 戻り値の TEntry 例                                                                             | 利用ペア        |
| -------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- | --------------- |
| `jsonRegistry`       | JSON file                 | `{path, label}` (#3) / `{contracts: Contract[]}` (#4) / `{role, owns, out_of_scope_warn}` (#5) | #3 #4 #5 #7     |
| `tsRegistry`         | TS named const            | `Record<id, RegistryEntry>`                                                                    | #1 #6 #8 #9 #11 |
| `yamlFrontmatter`    | Markdown with frontmatter | spec frontmatter object                                                                        | #12             |
| `filesystemRegistry` | dir 構造                  | `{name, files[]}`                                                                              | #2 #10          |
| `markdownIdScan`     | Markdown heading + body   | `{id, line, body}`                                                                             | #12 #13         |
| `jsdocTag`           | TS source の JSDoc        | `Map<tagName, value[]>`                                                                        | #6 #12          |

### 3.3 `detection/` — 8 primitive

すべて `(registry: Registry<TEntry>, target: ...) => DriftReport[]` 形。

| primitive                | 用途 (i-vii 検出パターン)  | 利用ペア             |
| ------------------------ | -------------------------- | -------------------- |
| `existence`              | (i) 双方向存在             | #1 #2 #3 #11 #12 #13 |
| `pathExistence`          | (i) path 文字列実在        | #3 #5 #11 #12 / J7   |
| `shapeSync`              | (ii) 構造一致              | #2 #5 #12            |
| `ratchet`                | (iii) ratchet-down 集計    | #1 #3 #6 #9 #10 #12  |
| `temporal`               | (iv) 期限 / freshness      | #6 #9 #10 #12        |
| `setRelation`            | (v) 集合一致 / 包含 / 排他 | #4 #5 #7 #8          |
| `bidirectionalReference` | (vi) 双方向対称参照        | #6 #12 #13           |
| `cardinality`            | (vii) cardinality cap      | #6 #8                |

### 3.4 `reporting/formatViolation.ts`

`(rule: ArchitectureRule, violations: DriftReport[]) => string` 形。
全 13 ペア共通の `expect(violations, formatted).toEqual([])` パターンを generic 化。
既存 `formatViolationMessage` (architectureRules) と互換性を保つ。

## 4. domain 純粋性の不変条件

`app-domain/integrity/` は次を厳守:

1. **副作用ゼロ** — `fs.readFileSync` 等の I/O は guard 側 (caller) で行い、文字列 / 構造化データを primitive に渡す
2. **依存方向** — `app-domain/integrity/` は他の app-domain や app/src/ に依存しない（types は自己完結）
3. **テスト純粋性** — domain primitive 自体の test は I/O を持たない（fixture string で完結）
4. **adapter は薄い** — guard test 側の adapter は最大 30 行（primitive を呼んで violations を expect するだけ）

これらは Phase F (Domain Invariant Test) で機械検証される。

## 5. adapter パターン (guard test 側の使い方)

### 5.1 既存 guard の典型

```typescript
// (現状) doc-registry-guard
const registry: DocRegistry = JSON.parse(fs.readFileSync(...))
const allRegisteredPaths = new Set(...)
for (const docPath of allRegisteredPaths) {
  if (!fs.existsSync(path.join(PROJECT_ROOT, docPath))) {
    missing.push(docPath)
  }
}
expect(missing, formatViolationMessage(rule, missing)).toEqual([])
```

### 5.2 Phase C 後の adapter

```typescript
// (Phase C) doc-registry-guard via integrity domain
import { jsonRegistry } from "app-domain/integrity/parsing";
import { pathExistence } from "app-domain/integrity/detection";
import { formatViolation } from "app-domain/integrity/reporting";

const registry = jsonRegistry<DocEntry>(
  fs.readFileSync(DOC_REGISTRY_PATH, "utf-8"),
  "docs/contracts/doc-registry.json",
);
const violations = pathExistence(registry, PROJECT_ROOT);
expect(violations, formatViolation(rule, violations)).toEqual([]);
```

I/O (`fs.readFileSync`) は guard 側に残り、parser / detection / reporter のみが domain 経由。

## 6. Phase B 実装順 (リスク低 → 高)

inventory §3.5 と整合:

| step    | landing 内容                                                 | 依存     | リスク                                              |
| ------- | ------------------------------------------------------------ | -------- | --------------------------------------------------- |
| **B-1** | `types.ts` + `index.ts` (空 barrel) + APP_DOMAIN_INDEX.md    | なし     | **最低** (型定義のみ)                               |
| **B-2** | `reporting/formatViolation.ts`                               | types.ts | 低                                                  |
| **B-3** | `parsing/yamlFrontmatter.ts`                                 | types.ts | 低 (Phase J で完成形あり)                           |
| **B-4** | `detection/existence.ts` + `detection/pathExistence.ts`      | types.ts | 低                                                  |
| **B-5** | `detection/ratchet.ts` + `detection/temporal.ts`             | types.ts | 低                                                  |
| **B-6** | spec-state 系 11 contentSpec\*Guard を adapter 経由に切替    | B-1〜B-5 | **中** (動作同一性検証必要、撤退規律 5 step を遵守) |
| **B-7** | `contentSpecHelpers.ts` を `@deprecated (re-export only)` 化 | B-6      | 中                                                  |

各 step は **1 PR = 1 step** を原則とする (撤退規律 § 5 step 1〜2 の観察期間を確保)。

## 7. Phase C 以降との接続

| Phase | 着手対象                                                           | 必要 primitive                                               |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| C     | #3 doc-registry guard adapter                                      | jsonRegistry / pathExistence / existence / ratchet           |
| D-W1  | #1 #2 #4 #5 (calc canon / readModels / test-contract / scope.json) | tsRegistry / filesystemRegistry / shapeSync / setRelation    |
| D-W2  | #6 #7 #8 (taxonomy / principles / architecture-rules)              | tsRegistry / jsdocTag / bidirectionalReference / cardinality |
| D-W3  | #9 #10 #11 #13 (allowlists / checklist / obligation / invariant)   | tsRegistry / temporal / markdownIdScan                       |

## 8. 関連実装

| パス                                                                              | 役割                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `references/03-guides/integrity-pair-inventory.md` (本 doc の正本入力)            | Phase A inventory + selection rule + primitive 候補   |
| `references/01-principles/canonicalization-principles.md §P8`                     | selection rule 拡張版 (Phase I で checklist 化)       |
| `projects/canonicalization-domain-consolidation/derived/adoption-candidates.json` | Phase A §4 採用候補 machine-readable                  |
| `app/src/test/guards/contentSpecHelpers.ts`                                       | Phase B reference 実装の供給元 (Phase J 完遂、312 行) |
| `app-domain/gross-profit/APP_DOMAIN_INDEX.md`                                     | 既存 app-domain pattern (本 doc の対称配置 reference) |

## 9. 改訂履歴

| 日付       | 変更                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-28 | 初版起草。Phase A inventory §3 を物理 module 構成として確定。types 1 + parsing 6 + detection 8 + reporting 1 + barrel 4 = 計 20 ファイル。Phase B 実装順 B-1〜B-7 + adapter パターン + domain 純粋性 4 不変条件 + 既存 `app-domain/gross-profit/` との対称配置を明記。status: design-locked, implementation-pending |
