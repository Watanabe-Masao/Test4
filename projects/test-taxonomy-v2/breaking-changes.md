# breaking-changes — test-taxonomy-v2

> 役割: 本 project が実施する破壊的変更の一覧と運用規約。
>
> **正本**: umbrella `projects/taxonomy-v2/breaking-changes.md` の **BC-TAX-2** が正本。
> 本文書はその local view（テスト軸側）。

## 対象破壊的変更

| ID            | 対象                                      | 破壊内容                                                                | Phase               |
| ------------- | ----------------------------------------- | ----------------------------------------------------------------------- | ------------------- |
| **BC-TAX-2**  | テストタグ vocabulary (T:\*)              | v1 に存在しない → 新規導入 + 必須化（タグなし → CI fail）               | Phase 1-5           |
| **BC-TAX-2a** | global `TSIG-TEST-*` obligation           | 全テスト一律適用から T:kind 別 obligation に分解                        | Phase 4-5           |
| **BC-TAX-2b** | existence-only assertion 等の無品質テスト | T:kind 別の品質基準で enforce、違反テストを修正 / 削除                  | Phase 6-8           |
| **BC-TAX-2c** | R:\* との interlock マトリクス            | 必須 T:kind マッピング（例: `R:calculation` → `T:unit-numerical` 必須） | Phase 5（親と連動） |

## 運用規約

- **親の 7 不可侵原則を全て継承**（taxonomy-v2 plan.md §7 不可侵原則）
- **BC-TAX-2 の開始は親 Phase 1（Constitution 確定）後**（interlock 崩壊防止）
- **responsibility-taxonomy-v2 の BC-TAX-1 と同時昇格**（原則 4: tag ↔ test 双方向契約）
- **guard 先行** — Phase 3 で `testTaxonomyGuard` を baseline=current で追加、
  Phase 5 で interlock guard と連動、既存 TSIG guard は v2 対応に書き換え
- **review window 経由** — 原則 3 により日常作業では `T:unclassified` に退避

## 想定影響範囲

- **runtime 動作**: 影響 **なし**（AAG framework のみ）
- **既存 `testSignalIntegrityGuard` 等 TSIG guard**: v2 対応に書き換え（T:kind 別に分解）
- **全 test file**: T:kind タグが付いていないファイルは `T:unclassified` に退避 →
  review window で分類を進める
- **CI**: タグなし → fail（baseline 導入後）
- **既存 test**: existence-only assertion 等を T:kind 別の基準で再評価、違反は修正 / 削除

## rollback plan

- BC-TAX-2 の各 PR を revert → 該当 T:kind の変更が戻る
- CI fail 化は独立 commit のため別途 revert
- rollback 境界は **Phase 単位**
- Phase 6-8 の test 修正は個別 PR で実施、独立 revert 可

詳細は umbrella `projects/taxonomy-v2/breaking-changes.md` §BC-TAX-2 と本 project の
`plan.md` §Phase 1-8 を参照。
