# projects/completed/

> **役割: archive 済み project の置き場**

このディレクトリには `derivedStatus = completed` になり、archive プロセスを
完了した project が物理移動して保存される。

## 物理レイアウト

```
projects/completed/
├── README.md        # 本ファイル
├── .gitkeep
└── <archived-project-id>/   # 移動後の完成形
    ├── AI_CONTEXT.md
    ├── HANDOFF.md           # 末尾に "Archived: YYYY-MM-DD" 行
    ├── plan.md
    ├── checklist.md         # 全 checkbox が [x]
    └── config/
        └── project.json     # status: "archived" に書き換え済み
```

## archive 手順

詳細は [`references/03-guides/project-checklist-governance.md`](../../references/03-guides/project-checklist-governance.md) §6.2 を参照。

要約:

1. `references/02-status/generated/project-health.md` で `derivedStatus = completed` を確認
2. `mv projects/<id> projects/completed/<id>`
3. `projects/completed/<id>/config/project.json` の `status` を `archived` に
4. `CURRENT_PROJECT.md` の active が当該 project でないことを確認
5. `references/02-status/open-issues.md` の active 索引から外し、解決済みテーブルに 1 行追加
6. `projects/completed/<id>/HANDOFF.md` 末尾に `Archived: YYYY-MM-DD` を追加
7. 関連正本（references/03-guides/* 等）の状態更新を同 commit で実施
8. `cd app && npm run docs:generate`
9. commit

## 機械的な保証

以下の AAG 要素が archive 状態を保証する:

| 機構 | 検出する状態 |
|---|---|
| `project-checklist-collector` | `derivedStatus = archived` を出力 |
| `architecture-health.json` | `project.checklist.archivedCount` を KPI 化 |
| `projectCompletionConsistencyGuard` | C1: completed なのに active 配置 → fail |
| `health-rules.ts` | `project.checklist.completedNotArchivedCount = 0` を hard gate |

## やってはいけないこと

- `projects/completed/<id>/checklist.md` を編集する → archive 済みの履歴を改変しない
- archive 済み project を `projects/<id>/` 配下に戻す → 「再 active 化」がしたいなら新規 project を作る
- archive を自動化する → 不可逆操作はレビューを通す（仕様上、人間の手動操作）
