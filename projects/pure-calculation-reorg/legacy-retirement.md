# legacy-retirement — pure-calculation-reorg

> 役割: 本 project が撤退する legacy item の一覧と運用規約。
>
> **正本**: 本 project の `plan.md` §Phase 7, §Phase 9 が正本。本文書は
> AAG-COA 入口としての summary。

## 撤退対象

| 対象                                 | 撤退内容                                        | Phase     | sunsetCondition                                    |
| ------------------------------------ | ----------------------------------------------- | --------- | -------------------------------------------------- |
| `domain/calculations/` JS 計算正本群 | WASM authoritative への段階移行 + bridge 経由化 | Phase 3-6 | candidate 側への移管完了 + bridge 契約 parity 保証 |
| JS 計算実体（bridge 非経由分）       | Phase 7 統合整理で段階削除                      | Phase 7   | bridge 未経由 import = 0 達成                      |
| JS 計算正本（全体）                  | WASM 昇格完了後に一括削除                       | Phase 9   | calculationCanonRegistry の JS entry が 0          |
| `authoritative` 単独語の利用         | Phase 0 禁止 guard 導入 + 既存箇所の置換        | Phase 0   | `authoritative` 単独語利用 = 0（guard fixed mode） |

## 呼び出し元

- `domain/calculations/` の全 JS import 経路は Phase 3-6 の bridge 化により限定される
- Phase 7 の統合整理時に `oldPathImportGuard` 相当の guard で bridge 非経由 import を検出
- Phase 9 の最終削除前に registry 上の JS entry を 0 に

## 移行先

| 撤退対象               | 移行先                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| JS 計算正本            | WASM authoritative（bridge 経由）                                                          |
| `authoritative` 単独語 | `business-authoritative` / `analytic-authoritative` / `candidate-authoritative` のいずれか |
| Rust ベース current    | candidate 群で意味再分類後、Promote Ceremony で current 昇格                               |

## 撤退順序

```
Phase 0: authoritative guard 導入（単独語利用を検出）
  ↓
Phase 1-2: 意味分類 + registry 整備
  ↓
Phase 3: 契約固定 + bridge 構造導入（bridge 未経由禁止 guard）
  ↓
Phase 4-6: candidate 群への段階移管
  ↓
Phase 7: 統合整理（bridge 非経由 import = 0 達成）
  ↓
Phase 8: Promote Ceremony（人間承認）
  ↓
Phase 9: JS 正本の最終削除（registry JS entry = 0）
```

## やってはいけないこと

- **JS を一気に削除**（Phase 7 禁止事項）— 段階削除のみ
- **repo 全体一括削除**（Phase 9 禁止事項）— registry 経由で削除対象を導出
- **Promote Ceremony なしの current 編入**（原則 1）
- **current を staging area として使う**（Phase 4 禁止事項）

## rollback plan

- Phase 7 段階削除: 各 PR を revert して該当 JS 実体を復帰
- Phase 9 最終削除: 一括削除のため困難。Phase 8 の十分な観測期間で担保する

詳細は本 project の `plan.md` §Phase 7, §Phase 8, §Phase 9 を参照。
