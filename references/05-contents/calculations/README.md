# calculations — Domain Calculation 仕様書カタログ

> 役割: `app/src/domain/calculations/` 配下の **業務計算正本** + **WASM 移行候補（candidate）** の現状把握台帳。
> 改修前の前提資料として、各 calc の入出力契約 / 不変条件 / lifecycle 状態 / current ↔ candidate 双方向リンクを 1 ファイルにまとめる。
>
> **本カテゴリの位置付けは親 README（`../README.md`）参照**。
> ユーザー向け機能説明ではない。学習用解説ではない。改修者のための事実台帳。

## 型番体系

- 形式: `CALC-NNN`（3 桁ゼロ埋め）
- **一度割り当てたら再利用しない**。廃止時は欠番のまま保持
- source 側は `@calc-id CALC-NNN` JSDoc で宣言（generator が機械検証）
- spec doc ファイル名 = 型番 `.md`（例: `CALC-001.md`）

## Lifecycle State Machine（Phase D で institutionalize）

`calculationCanonRegistry.ts` の `runtimeStatus` (`current` / `candidate` / `non-target`) +
spec frontmatter の `lifecycleStatus` (`proposed` / `active` / `deprecated` / `sunsetting` / `retired` / `archived`)
の **両軸** で計算の状態を管理する。

```
proposed ──→ active ──→ deprecated ──→ sunsetting ──→ retired ──→ archived
              ↑              │
              │ Promote      │ replacedBy → 後継 calc
              │ Ceremony     │
              │              ▼
        candidate-authoritative（registry）
```

### 必須 field 表

| `lifecycleStatus` | 必須 frontmatter field |
|---|---|
| `proposed` | （source 不在許容） |
| `active` | exportName / sourceRef / sourceLine |
| `deprecated` | + `replacedBy: CALC-NNN`（後継 spec ID）|
| `sunsetting` | + `replacedBy` + `sunsetCondition` + `deadline` |
| `retired` | + `replacedBy` + active consumer = 0 |
| `archived` | （source 削除済、ID は欠番保持）|

### Promote Ceremony（candidate → current 昇格）

`candidate-authoritative` の calc を `business-authoritative` に昇格させる際、**1 PR で次がすべて揃う**ことを guard が要求する:

1. `calculationCanonRegistry.ts` の `runtimeStatus: candidate → current`
2. 旧 current spec の `lifecycleStatus: active → deprecated`、`replacedBy: <new>` 追記
3. 新 current spec の `lifecycleStatus: proposed/active`、`supersedes: <old>` 追記
4. 旧 current の `sunsetCondition` + `deadline` を記載
5. ADR 記録（`projects/<active>/adr/` または同等）

詳細: `references/03-guides/promote-ceremony-pr-template.md`

## 初期割当表（Phase D 着手段階で 1 件、漸次拡大）

`calculationCanonRegistry.ts` の `business-authoritative + current + maintenance` を起点に、
WASM migration 候補を持つ計算を優先 spec 化する。

| ID | export | 配置 | semanticClass / authorityKind | runtimeStatus | 候補 (replacedBy 候補) |
|---|---|---|---|---|---|
| CALC-001 | `calculateCustomerGap` | `app/src/domain/calculations/customerGap.ts` | business / business-authoritative | current | wasm/customer-gap/（registry: `candidate/customerGap.ts`、未物理化）|

> Phase D 後続 batch で CALC-002 〜（piValue / inventoryCalc / pinIntervals / observationPeriod / remainingBudgetRate / dowGapAnalysis）を追加予定。
> WASM candidate 物理化後に spec-pair 化（current ↔ candidate の双方向リンク完成）。

## spec doc フォーマット

各 `CALC-NNN.md` は以下の構造を持つ。frontmatter が機械検証対象、prose は「**source から読み取れない設計意図と契約**」のみ。

### YAML frontmatter（generator が上書き管理 + lifecycle 手書き）

```yaml
---
id: CALC-001
kind: calculation
exportName: calculateCustomerGap
sourceRef: app/src/domain/calculations/customerGap.ts
sourceLine: 77

# 業務意味の正本リンク
definitionDoc: references/01-principles/customer-gap-definition.md

# calculationCanonRegistry との同期軸（手書き、sync guard で双方向検証）
contractId: BIZ-013
semanticClass: business
authorityKind: business-authoritative
methodFamily: behavioral
canonicalRegistration: current        # registry.runtimeStatus と一致

# Lifecycle State Machine（手書き、guard で必須 field を強制）
lifecycleStatus: active                # proposed | active | deprecated | sunsetting | retired | archived
replacedBy: null                       # deprecated/sunsetting で後継 CALC-NNN を必須
supersedes: null                       # candidate→current 昇格時に旧 CALC-NNN を記録
sunsetCondition: null                  # sunsetting で必須
deadline: null                         # sunsetting で必須 (YYYY-MM-DD)

# 構造 drift 防御
lastVerifiedCommit: <sha>

# 時間 drift 防御
owner: architecture
reviewCadenceDays: 90
lastReviewedAt: 2026-04-27

# spec schema
specVersion: 1
---
```

### prose セクション（手書き、短く）

| セクション | 書く内容 |
|---|---|
| 1. 概要（1 文） | 振る舞いを構造的に 1 文（C8） |
| 2. Input Contract | 引数 / Zod schema / 前提 invariant |
| 3. Output Contract | 戻り値 / 結果 schema / 不変条件 |
| 4. Invariants | 数学的・業務的不変条件（`invariant-catalog.md` リンク）|
| 5. Migration Plan | candidate（WASM 等）の有無、`replacedBy` 計画、Promote Ceremony 着手条件 |
| 6. Consumers | 主要 consumer（widget / chart / readModel）|
| 7. Co-Change Impact | 型 / schema / 不変条件のどれが変わると壊れるか |
| 8. Guard / Rule References | 関連する既存 guard / AR rule の ID |

## 3 軸 drift 防御

### 存在軸: `AR-CONTENT-SPEC-EXISTS`（calculation 版）

- `calculationCanonRegistry` の `current` / `candidate` 全 entry に対応する `CALC-NNN.md` が存在
- source 側 `@calc-id CALC-NNN` JSDoc が export 行直前に付与されていること

### 構造軸: `AR-CONTENT-SPEC-FRONTMATTER-SYNC`

- generator が source AST から `sourceLine` / `exportName` を再生成
- `canonicalRegistration` ↔ `calculationCanonRegistry.runtimeStatus` の双方向 sync（後続 commit で sync guard 追加）

### 時間軸: `AR-CONTENT-SPEC-FRESHNESS` + `AR-CONTENT-SPEC-LIFECYCLE-DEADLINE`

- `lastReviewedAt` cadence 超過で fail
- `sunsetting` の `deadline` 超過で hard fail（temporal governance）

### Lifecycle 軸: `AR-CONTENT-SPEC-LIFECYCLE-FIELDS`

- `lifecycleStatus` の値ごとに必須 field を強制（上記「必須 field 表」）
- `replacedBy` / `supersedes` の双方向対称性（後続 commit で対称性 guard 追加）
