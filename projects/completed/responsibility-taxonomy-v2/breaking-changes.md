# breaking-changes — responsibility-taxonomy-v2

> 役割: 本 project が実施する破壊的変更の一覧と運用規約。
>
> **正本**: umbrella `projects/taxonomy-v2/breaking-changes.md` の **BC-TAX-1** が正本。
> 本文書はその local view（責務軸側）。

## 対象破壊的変更

| ID            | 対象                                           | 破壊内容                                                                 | Phase                    |
| ------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | ------------------------ |
| **BC-TAX-1**  | 責務タグ vocabulary (R:\*)                     | v1 vocabulary 全入替 + `R:unclassified` 能動タグ化（タグなし → CI fail） | Phase 1-5                |
| **BC-TAX-1a** | `R:utility` 捨て場化                           | 33 件を個別 R:tag に再分類、`R:utility` 撤退                             | Phase 6-8                |
| **BC-TAX-1b** | 軸混在（1 タグに責務 × 純粋性 × 層を押し込み） | 1 タグ = 1 軸に分解（原則 2）                                            | Phase 1-2（Schema 設計） |
| **BC-TAX-1c** | Origin 不明タグ                                | Why/When/Who/Sunset メタデータ required 化（原則 5）                     | Phase 3-4                |

## 運用規約

- **親の 7 不可侵原則を全て継承**（taxonomy-v2 plan.md §7 不可侵原則）
- **BC-TAX-1 の開始は親 Phase 1（Constitution 確定）後**（interlock 崩壊防止）
- **test-taxonomy-v2 の BC-TAX-2 と同時昇格**（原則 4: tag ↔ test 双方向契約）
- **guard 先行** — Phase 3 で `responsibilityTaxonomyGuard` を baseline=current で追加、
  Phase 5 で interlock guard と連動
- **review window 経由** — 原則 3（語彙生成は高コスト儀式）により、日常作業では
  `R:unclassified` に退避

## 想定影響範囲

- **runtime 動作**: 影響 **なし**（AAG framework のみ）
- **既存 `responsibilityTagGuard`**: v2 対応に書き換え（旧 vocabulary を撤去）
- **全 source file**: タグが付いていないファイル / 軸混在タグを `R:unclassified`
  に一旦退避 → review window で分類を進める
- **CI**: タグなし → fail（baseline 導入後）

## rollback plan

- BC-TAX-1 の各 PR を revert → 該当 R:tag の変更が戻る
- CI fail 化は独立 commit のため別途 revert
- rollback 境界は **Phase 単位**
- Phase 7-8 の `R:utility` 撤退は review window 記録を保持、個別 revert 可

詳細は umbrella `projects/taxonomy-v2/breaking-changes.md` §BC-TAX-1 と本 project の
`plan.md` §Phase 1-8 を参照。
