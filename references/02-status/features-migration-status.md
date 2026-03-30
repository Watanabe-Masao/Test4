# features/ 縦スライス移行 進捗管理表

## ステータス定義

- ✅ 完了
- 🔧 進行中
- ⬜ 未着手
- n/a 対象外（shared-core を使用）

## 進捗表

| Feature | Domain | Application | UI | Page Shell | Barrel | Done |
|---------|--------|-------------|-----|------------|--------|------|
| sales | ✅ | ⬜ | ⬜ | ⬜ | ✅ | ⬜ |
| storage-admin | n/a | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |
| budget | n/a | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| forecast | n/a | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| category | n/a | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |
| purchase | n/a | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| cost-detail | n/a | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |
| reports | n/a | ⬜ | ⬜ | ✅ | ⬜ | ⬜ |

## 備考

- **Domain 列:** `n/a` は `domain/calculations/` を shared authoritative core として使用する feature。feature 固有の導出値がある場合のみ feature 内 domain/ を作成。
- **Page Shell 列:** page が route 接続 + layout shell のみの状態で ✅。
- **Barrel 列:** `features/<name>/index.ts` が公開 API として機能している状態で ✅。

## Phase 実行順

1. Phase 0: features 契約固定（README + guard + migration status）
2. Phase 1: sales を参照実装に昇格
3. Phase 2: storage-admin を feature 化
4. Phase 3: budget / forecast を Insight seam から回収
5. Phase 4: Dashboard widget を owner ごとに回収
6. Phase 5: Category / Purchase / CostDetail / Reports を shell 化
7. Phase 6: import cleanup と status 確定
