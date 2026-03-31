# features/ — 縦スライスアーキテクチャ

## 概要

`features/` は業務ドメイン境界による機能別構造（縦スライス）を持つ。
各 feature slice が内部に 4 層（Presentation → Application → Domain ← Infrastructure）を持ち、
独立して開発・テスト可能な単位を形成する。

## ディレクトリ構成

```
features/
├── sales/              # 売上分析
│   ├── application/    # hooks, facade, selector
│   ├── domain/         # pure 計算（共有 core の補完）
│   ├── ui/             # widget, section, component
│   └── index.ts        # 公開 barrel（外部はここだけ import）
├── storage-admin/      # データ管理
├── budget/             # 予算分析
├── forecast/           # 需要予測
├── category/           # カテゴリ分析
├── purchase/           # 仕入分析
├── cost-detail/        # 原価明細
├── reports/            # レポート
└── shared/             # feature 共通基盤
```

## ルール

### 1. barrel 公開 API

外部からは **barrel (`@/features/<name>`) 経由のみ** import する。

```typescript
// ✅ OK
import { computeDailyAchievementRate } from '@/features/sales'

// ❌ NG — deep import 禁止
import { computeDailyAchievementRate } from '@/features/sales/domain/salesMetrics'
```

### 2. cross-slice 依存禁止

feature 間の直接 import は禁止。共通基盤は `features/shared/` 経由。

```typescript
// ❌ NG
import { something } from '@/features/category' // sales 内から

// ✅ OK
import { something } from '@/features/shared'
```

**guard:** `INV-ARCH-12` (`structuralConventionGuard.test.ts`)

### 3. shared authoritative core

`domain/calculations/` は全 feature が共有する authoritative 計算 core。
feature 内の domain/ は共有 core の **補完**（feature 固有の導出値）に限る。

### 4. feature 固有実体の配置

新規の feature 固有 UI / application ロジックは `features/<name>/` に配置する。
root の `presentation/` `application/` には追加しない。

### 5. 移行原則

- 新規は縦スライスで作る
- 既存は改修タイミングで移動
- barrel re-export で後方互換を維持
- 移動 → wrapper 化 → import 切替 → 削除 の順
