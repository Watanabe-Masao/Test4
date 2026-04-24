# breaking-changes — pure-calculation-reorg

> 役割: 本 project が実施する破壊的変更の一覧と運用規約。
>
> **正本**: 本 project の `plan.md` §Phase 別禁止事項テーブル + Phase 7/8/9 の
> 詳細。本文書はその AAG-COA 入口としての summary。

## 対象破壊的変更

| ID            | 対象                             | 破壊内容                                                                                              | Phase     |
| ------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| **BC-CALC-1** | `domain/calculations/` JS 正本群 | bridge 経由に切替（Phase 3-6 で candidate 側に移管、current 側は bridge 参照のみ）                    | Phase 3-6 |
| **BC-CALC-2** | JS 計算実体の段階削除            | Phase 7 統合整理で bridge 非経由 import を禁止 → 段階削除                                             | Phase 7   |
| **BC-CALC-3** | JS 正本の最終削除                | Phase 9 で calculationCanonRegistry に基づき JS 実体を repo から削除（WASM authoritative に完全移行） | Phase 9   |

## 運用規約

- **1 PR = 1 破壊的変更**（禁止事項テーブル Phase 7 #「JS を一気に削除する」）
- **guard 先行** — Phase 0 で `authoritative` 単独使用禁止 guard、Phase 3 で bridge
  未経由禁止 guard、Phase 7 の段階削除前に統合 guard を有効化
- **Promote Ceremony 経由**（plan.md §原則 1）— `promotion-ready` → `current` 昇格は
  Phase 8 の正式手順のみ。実装 AI は提案のみ、承認主体は人間
- **current ↔ candidate 分離**（plan.md §原則 4）— 同じ registry view に載せない、
  同じ KPI で評価しない、同じ review 導線を使わない

## 想定影響範囲

- **runtime 動作**: **不変**（bridge 経由で同一計算結果を保証。WASM 化後も同じ）
- **domain/calculations/ 利用側**: bridge 経由 import への切替が段階的に必要
- **Authoritative 表示**: bridge maturity に応じて JS / WASM が切り替わる（UI には透過）

## rollback plan

- Phase 7 段階削除: 削除 PR を revert すれば JS 正本が復帰
- Phase 9 最終削除: 一括削除のため rollback 難度が高い → Phase 8 Promote Ceremony で
  十分な観測期間を経てから実施（原則 1: 承認主体は人間）
- rollback 境界は **Phase 単位**

詳細は本 project の `plan.md` §Phase 7, §Phase 8, §Phase 9 を参照。
