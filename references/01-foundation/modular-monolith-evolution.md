# モジュラーモノリス進化計画: 4層 × 縦スライス

> **方針:** 4層アーキテクチャを捨てずに、上位概念として縦スライスを載せる。
> 「layer-first から feature-first へ全振り」ではなく、layer discipline を保った modular monolith 化。

## 現在の土台

この repo はすでに縦スライス進化の前提条件を備えている:

| 土台 | 内容 |
|------|------|
| 層境界 | `invariant-catalog.md` で 4 層の不変条件を明示 |
| Engine 境界 | `engine-boundary-policy.md` で Authoritative / Application / Exploration の 3 Engine を定義 |
| Query 入口 | `duckdb-architecture.md` で `useQueryWithHandler` と `WidgetContext` に収束済み |
| スライス間禁止 | `structuralConventionGuard.test.ts` で features/ 間直接 import 禁止 + 外部からの deep import 禁止 |
| 既存スライス | `features/` に 9 スライス（sales, category, budget, forecast, purchase, cost-detail, reports, storage-admin, shared） |

## 目指すアーキテクチャ像

### 1. 全体は 4 層を維持する

domain → application → presentation / infrastructure の依存規律は維持。
feature の中でも同じ依存方向を守る。

### 2. 機能単位に「小さな 4 層」を持つ

```
features/
├── comparison/           # 比較意味論（新設・最重要）
│   ├── domain/
│   ├── application/
│   ├── presentation/
│   └── index.ts          # 唯一の公開面
├── time-slot/            # 時間帯分析（新設）
├── weather/              # 天気データ（新設）
├── clip-export/          # クリップエクスポート（新設）
├── dashboard-composition/ # ダッシュボード構成（新設）
├── import/               # データ取込（新設）
├── sales/                # 売上（既存）
├── category/             # カテゴリ（既存）
├── budget/               # 予算（既存）
├── forecast/             # 予測（既存）
├── purchase/             # 仕入（既存）
├── cost-detail/          # 原価詳細（既存）
├── reports/              # レポート（既存）
├── storage-admin/        # ストレージ管理（既存）
└── shared/               # 機能横断共通（既存）
```

### 3. 共通物は 3 種類に分ける

`shared` を 1 つにしない。以下に分離する:

| 種別 | 内容 | 例 |
|------|------|-----|
| **core shared** | 汎用型、不変条件、CalendarDate、安全ユーティリティ | `features/shared/core/` |
| **platform/runtime** | DuckDB engine、OPFS、recovery、worker bridge、i18n bootstrap | `platform/` |
| **ui shared** | ChartCard、共通 formatter、theme、display helper | `features/shared/ui/` |

---

## 進化後の依存ルール（二軸）

### Layer Rule（既存を維持）

同一 slice 内では 4 層依存を守る:

```
Presentation → Application → Domain ← Infrastructure
```

### Slice Rule（新設）

- 他 slice へは **barrel 経由のみ**
- deep import 禁止（`structuralConventionGuard` で既に強制済み）
- features/ 間直接依存禁止（`shared/` 経由）

### Platform Rule（新設）

- feature から platform へは **Port 経由のみ**
- platform は feature を知らない

```
┌─────────────────────────────────────────┐
│  features/comparison  features/sales    │
│  features/time-slot   features/weather  │
│         ↓ barrel only ↓                 │
│  features/shared                        │
│         ↓ port only ↓                   │
│  platform/  (duckdb, storage, runtime)  │
└─────────────────────────────────────────┘
```

---

## Feature Ownership Manifest

各 feature に manifest を持たせる:

```typescript
// features/comparison/manifest.ts
export const comparisonManifest = {
  owner: 'comparison',
  publicAPI: [
    'useComparisonWindow',
    'ComparisonProvenance',
    'AlignedComparisonWindow',
    'WoWWindow',
    'YoYWindow',
  ],
  authoritativeValueProducer: false,
  fallbackPolicy: 'provenance-tracked',
  runtimeDependency: ['platform/duckdb'],
  invariants: [
    'alignmentMap preserves sourceDate',
    'fallback is never silent',
    'comparison output always carries provenance',
  ],
} as const
```

`structuralConventionGuard.test.ts` の widget ownership registry を feature 全体に広げる。

---

## Feature 単位の Safety Contract

`invariant-catalog.md` は全体の不変条件カタログ。今後は feature 単位の invariant も持つ:

| Feature | 不変条件例 |
|---------|-----------|
| comparison | alignmentMap invariants, sourceDate preservation, fallback provenance |
| time-slot | hourly aggregation consistency, weather fallback transparency |
| weather | cache invalidation, fallback notification |
| gross-profit | WASM parity, dual-run exit criteria |

---

## 具体的な進化ステップ

### A. features/ を「公開契約付きモジュール」にする

外部は barrel 経由のみ:

```typescript
// OK
import { useTimeSlotScreenModel } from '@/features/time-slot'

// NG — deep import
import { useTimeSlotPlan } from '@/features/time-slot/application/hooks/useTimeSlotPlan'
```

**期待効果:**
- deep import がなくなる
- feature 単位で内部構造を自由に変えられる

### B. useUnifiedWidgetContext を feature composition root に置き換える

各 feature が slice を提供し、ページは feature を束ねるだけにする:

| Feature | 提供する slice |
|---------|---------------|
| `features/comparison` | comparison slice（期間・モード・provenance） |
| `features/time-slot` | time-slot screen model |
| `features/weather` | weather slice |
| `features/dashboard-composition` | widget 配置と compose |

**期待効果:**
- `ctxHook` の構造例外削減
- widget が「巨大 ctx の一部」ではなく「feature 契約」に依存

### C. comparison を独立 feature に格上げ

最も意味論が濃い領域。`isPrevYearHandlers` と `pairExceptionDesign` が残っているのは、
この領域が単なる utility ではなく独自の意味論を持つサブシステムであることを示している。

**移動対象:**

| 現在の場所 | 移動先 |
|-----------|--------|
| `application/comparison/` | `features/comparison/application/` |
| `useComparisonModule.ts` | `features/comparison/application/hooks/` |
| comparison 関連の型定義 | `features/comparison/domain/` |
| comparison window 型 | `features/comparison/domain/` |

**公開 API:**
- `useComparisonWindow` — 比較ウィンドウの取得
- `ComparisonProvenance` — 比較結果の由来情報
- Window 型（Current / Aligned / WoW / YoY / FallbackAware）

### D. time-slot / weather / clip-export を feature service 化

hook ではなく feature application service として扱う:

| 現在 | 移動先 |
|------|--------|
| `useTimeSlotPlan.ts` | `features/time-slot/application/plan/` |
| `useDayDetailData.ts` | `features/time-slot/application/queries/` |
| weather 取得・fallback | `features/weather/application/` |
| `useClipExport.ts` | `features/clip-export/application/` |

### E. runtime を platform に寄せる

feature ではなく platform に置くべきもの:

| 現在 | 移動先 |
|------|--------|
| `useDuckDB.ts` | `platform/duckdb/` |
| DuckDB recovery | `platform/duckdb/recovery/` |
| OPFS 関連 | `platform/storage/` |
| worker bridge | `platform/runtime/workers/` |
| i18n bootstrap | `platform/i18n/` |

---

## 移行順序

段階的に進める。新規は features/ で作り、既存は改修タイミングで移動。

| 順序 | Feature | 理由 |
|------|---------|------|
| **1** | `features/comparison` | 最も意味論が濃い。allowlist 改善効果も最大 |
| **2** | `features/time-slot` | 典型的な feature service 候補。縦スライス化の効果が出やすい |
| **3** | `features/weather` | 取得・fallback・persist・cache の責務が明確で切り出しやすい |
| **4** | `features/clip-export` | 閉じたユースケース。実験しやすい |
| **5** | `features/import` | 境界は広いが将来的な value は大きい |
| **6** | `platform/*` | runtime 責務の集約。`applicationToInfrastructure` 例外削減 |

---

## Safety-First Architecture Plan との関係

本計画は `safety-first-architecture-plan.md` の各 Phase と以下のように対応する:

| Safety Phase | 本計画での対応 |
|-------------|---------------|
| Phase 1: Runtime 境界切り出し | → `platform/*` への移動 |
| Phase 2: Unified Context slice 化 | → feature composition root への置き換え |
| Phase 3: Comparison semantics 再定義 | → `features/comparison` の独立 |
| Phase 4: アルゴリズム安全強化 | → feature 単位の safety contract |
| Phase 5: UI persistence 解消 | → `features/dashboard-composition` + `platform/storage` |

---

## 進化後の設計原則

### 依存チェック（二軸 + platform）

```
1. Layer: 同一 slice 内で 4 層依存を守る
2. Slice: 他 slice へは barrel 経由のみ
3. Platform: feature → platform は Port 経由のみ
```

### Feature 単位の ownership

`structuralConventionGuard.test.ts` の widget ownership registry を feature 全体に広げる:

- owner
- public API
- authoritative value producer
- fallback policy
- runtime dependency

### Feature 単位の invariant

`invariant-catalog.md` の全体不変条件に加え、feature 契約として不変条件を持つ。

---

## メリット

| 観点 | 効果 |
|------|------|
| **設計** | 4 層の強さを失わない。ownership が明確になる。巨大な横断 hook / context が減る |
| **安全** | comparison や fallback の意味論を feature に閉じ込められる。runtime 詳細が feature に漏れにくい |
| **運用** | PR の単位を feature で切りやすい。hotspot 改善が feature 単位で進む。新規機能を features/ に載せやすい |
| **allowlist** | 構造改善で自然に減る。件数削減だけでなく分類の改善まで可能 |

---

## 注意事項

- 一気に全移行は不要。改修タイミングで段階的に移動
- バレル re-export で後方互換を保つ
- 全部を feature に入れるべきではない（runtime は platform へ）
- `shared` に何でも入れない（core / platform / ui に分離）
