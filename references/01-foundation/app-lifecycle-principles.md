# App Lifecycle 原則

## 概要

App Lifecycle は、アプリ全体の起動・準備・稼働状態を application 層で一元管理する仕組みである。
UI は application が供給する状態を描画するだけで、状態の生成・判断を行わない。

## 原則

### L1: 状態は application が供給する

UI は状態を生成しない。起動中・復元中・更新適用中といった全体状態は
application 層の `AppLifecycleStatus` として供給される。
presentation 層はこの status を受け取り、そのまま描画する。

### L2: Global と Widget の責務分離

| 責務レベル | 管理主体 | 例 |
|---|---|---|
| Global（起動・復元・エンジン・更新） | AppLifecycleProvider | booting, restoring, initializing_engine, applying_update |
| Widget（個別クエリ） | 各 widget の hook | DuckDB クエリの loading / empty / error |

Widget が global 状態（boot, restore, engine init）を独自判定してはならない。

### L3: "無表示" は禁止

アプリのどの状態でも、ユーザーには何が起きているかを伝える。
空白画面・無言のローディング・予告なしリロードは禁止。

### L4: Empty の意味を区別する

| バリアント | 意味 | 次のアクション |
|---|---|---|
| `ready_empty_import` | データ未投入 | サイドバーからインポート |
| `ready_empty_result` | 条件に一致する結果なし | フィルタ条件の変更 |

"データがありません" という曖昧なメッセージで両者を混同しない。

### L5: 状態の正本は一箇所

Persistence の復元状態、DuckDB エンジン状態、SW 更新状態は
それぞれの正本が一箇所に存在し、複数の hook が同じ正本を参照する。
状態の二重管理・二重実装は禁止。

### L6: SW 更新は予告する

Service Worker の更新適用時は、リロード前に必ず「更新適用中」の通知を出す。
予告なしの即時リロードは禁止。

## 関連

- 設計原則 A3: Presentation は描画専用
- 設計原則 F2: 文字列はカタログに一元管理
- 設計原則 F5: 横断的関心事は Contract で管理
- 実装ガイド: `references/03-implementation/app-lifecycle-implementation.md`
