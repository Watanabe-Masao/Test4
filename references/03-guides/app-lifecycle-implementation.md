# App Lifecycle 実装ガイド

## アーキテクチャ概要

```
main.tsx
  └── registerServiceWorker({ onUpdateApplying: notifySwUpdate })

AppProviders.tsx
  └── AppLifecycleProvider
        ├── usePersistenceState()     → 復元状態（正本はモジュールスコープ）
        └── useAppLifecycle()
              ├── useDuckDBEngineState() → DuckDB シングルトン購読
              ├── useSwUpdateApplying()  → swUpdateSignal 購読
              └── derivePhase()          → AppLifecyclePhase を導出

App.tsx
  └── AppContent
        ├── GlobalStatusOverlay       → blocking 時にオーバーレイ表示
        └── (既存の AppShell + Routes)
```

## ファイル構成

### application/lifecycle/

| ファイル | 責務 |
|---|---|
| `appLifecycleContract.ts` | 型定義（AppLifecyclePhase, AppLifecycleStatus, AppReadiness） |
| `useAppLifecycle.ts` | 全状態ソースを統合して status を導出 |
| `swUpdateSignal.ts` | React 外 → React 内の SW 更新シグナル |
| `appLifecycleContextDef.ts` | Context + hook 定義 |
| `AppLifecycleProvider.tsx` | Provider コンポーネント |
| `index.ts` | バレル |

### 変更された既存ファイル

| ファイル | 変更内容 |
|---|---|
| `usePersistence.ts` | state/command 分離（正本のモジュールスコープ化） |
| `registerSW.ts` | コールバック引数追加（onUpdateApplying） |
| `messages.ts` | lifecycle メッセージセクション追加 |
| `main.tsx` | SW コールバック接続 |
| `AppProviders.tsx` | AppLifecycleProvider 追加 |
| `App.tsx` | GlobalStatusOverlay 追加 |

## 状態遷移

```
起動 → booting → restoring → initializing_engine → ready
                                                      │
                              SW 更新検出 → applying_update → reload
                                                      │
                              エラー発生 → error
```

### フェーズ導出の優先順位（上が高い）

1. `error` — 復元エラー or エンジンエラー
2. `applying_update` — SW 更新中（リロード確定）
3. `restoring` — IndexedDB からデータ復元中
4. `initializing_engine` — DuckDB WASM 初期化中
5. `booting` — 復元もエンジン初期化もまだ完了していない初期状態
6. `ready` — 稼働可能

### blocking 判定

`error` 以外の非 `ready` フェーズは全て `blocking: true`。
`error` は `blocking: false`（エラー表示は overlay で行うが、操作ブロックはしない）。

## usePersistence の state/command 分離

### 正本構造

```
モジュールスコープ（restoreState）
  ├── isRestoring: boolean
  ├── autoRestored: boolean
  └── restoreError: string | null

usePersistenceState()  → readonly 参照（AppLifecycleProvider 用）
usePersistence()       → readonly 参照 + command（AppContent 用、既存互換 façade）
```

### 重要な不変条件

- `usePersistenceState()` と `usePersistence()` は**同じ正本**を参照する
- 復元処理は正本の `restoreExecuted` フラグで**1回だけ**実行される
- `usePersistenceState()` が先に呼ばれても `usePersistence()` が先に呼ばれても
  復元処理は同一の正本を更新し、両方の hook が同じ状態を観測する

## SW 更新フロー

```
registerSW.ts (controllerchange)
  → callbacks.onUpdateApplying()
    → notifySwUpdate()           ← swUpdateSignal.ts のモジュールスコープ
      → useSyncExternalStore で React に伝播
        → useAppLifecycle が 'applying_update' を導出
          → GlobalStatusOverlay が「最新版を適用しています」を表示
  → setTimeout(reload, 1200ms)
```

## 新しいフェーズの追加方法

1. `appLifecycleContract.ts` の `AppLifecyclePhase` union に追加
2. `isBlockingPhase` の BLOCKING_PHASES に追加（blocking なら）
3. `useAppLifecycle.ts` の `derivePhase()` に導出ロジックを追加
4. `messages.ts` の `lifecycle` セクションにメッセージを追加
5. `GlobalStatusOverlay.tsx` の `PHASE_MESSAGE_KEY` マッピングに追加

## テスト

- `__tests__/useAppLifecycle.test.ts` — 状態遷移・優先順位テスト
- `__tests__/swUpdateSignal.test.ts` — シグナル購読テスト
- 既存 `usePersistence.test.ts` — 正本リセット付きで互換性維持
