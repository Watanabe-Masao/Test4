# 新規ページ追加チェックリスト

> **2026-04-27 acknowledgement**: taxonomy-v2 子 Phase 6a-2 Migration Rollout で
> `app/src/application/navigation/pageRegistry.ts` に `@responsibility R:unclassified`
> を能動退避（原則 1「未分類は能動タグ」）。本チェックリストの手順 / 構造は不変。

## 手順

### 1. ViewType に追加（必須）

**ファイル:** `domain/models/PageMeta.ts`

```typescript
export type ViewType =
  | 'dashboard'
  | ...
  | 'your-page'  // ← 追加
  | 'admin'
```

**ガード:** `pageMetaGuard.test.ts` が ViewType と PAGE_REGISTRY の一致を検証。

### 2. PAGE_REGISTRY に追加（必須）

**ファイル:** `application/navigation/pageRegistry.ts`

```typescript
{
  id: 'your-page',
  pathPattern: '/your-page',
  kind: 'standard',
  category: 'analysis',  // hub | analysis | operations | output | admin | extension
  label: 'ページ名',
  icon: '🔧',
  navVisible: true,        // デスクトップ NavBar に表示
  mobileNavVisible: false,  // モバイル BottomNav に表示
  shortcutIndex: undefined, // キーボードショートカット（1-9）
  navOrder: 7,              // 表示順
},
```

**注意:** `navOrder` は既存ページと重複しないこと。

### 3. routes.tsx にコンポーネント追加（必須）

**ファイル:** `presentation/routes.tsx`

```typescript
// 遅延ロード追加
const YourPage = lazyWithRetry(() =>
  import('@/presentation/pages/YourPage/YourPage').then((m) => ({
    default: m.YourPage,
  })),
)

// PAGE_COMPONENT_MAP に追加
export const PAGE_COMPONENT_MAP: Record<PageId, ComponentType> = {
  ...
  'your-page': YourPage,
  ...
}
```

### 4. ページコンポーネント作成

**ディレクトリ:** `presentation/pages/YourPage/`

**構成パターン:**
```
YourPage/
├── YourPage.tsx          # メインコンポーネント（≤600行）
├── YourPage.styles.ts    # styled-components（行数制限対応）
└── (補助ファイル).tsx     # 分離が必要な場合
```

### 5. 制約の確認

| 制約 | ガード | 内容 |
|---|---|---|
| 行数上限 | `sizeGuard` | 1ファイル ≤600行、useState ≤8個 |
| 層境界 | `layerBoundaryGuard` | Presentation は Application/Domain のみ import |
| デザイン | `designSystemGuard` | `rgba()` 直書き禁止、theme token 使用 |
| ページ登録 | `pageMetaGuard` | ViewType と PAGE_REGISTRY の整合性 |

### 6. 売上データ非依存ページの場合

売上データなしで動くページは、`WidgetContext` に依存せず、
独自に必要なデータを hook 経由で取得する。

```typescript
// NG: WidgetContext 依存（売上データ必須）
const ctx = useUnifiedWidgetContext(...)

// OK: 独立した hook で取得
const { daily } = useWeatherData(year, month, storeId)
const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
```
