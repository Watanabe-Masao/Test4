# inventory — Phase 0 棚卸し結果の固定先

> 役割: `checklist.md` Phase 0 の 4 項目に対応する棚卸し結果を固定する。
> ここに書かれた件数とパスが、Phase 1〜4 の作業範囲の input になる。

## 形式

各ファイルは以下の表形式に固定する:

| Path | Lines | 種別 | 剥がす Phase | メモ |
|---|---|---|---|---|
| `app/src/...` | L42-L58 | sameDate 計算 | Phase 2 | ... |

「種別」は項目ごとの分類軸を使う。

## ファイル一覧

| ファイル | 対応 checklist 項目 | 剥がす Phase |
|---|---|---|
| `01-comparison-math-in-presentation.md` | presentation / VM / chart で比較先日付を独自計算している箇所 | Phase 2 |
| `02-non-handler-free-period-access.md` | `readFreePeriodFact()` 以外で自由期間データを取得している経路 | Phase 3 |
| `03-rate-in-sql.md` | 自由期間系 SQL で rate を計算している箇所 | Phase 4 |
| `04-header-filter-state-direct-refs.md` | `HeaderFilterState` を直接参照している hook / component | Phase 1 |
| `05-phase6-widget-consumers.md` | Phase 6 対象 6 widget の ctx 依存と FreePeriodReadModel 載せ替え可否 | Phase 6 (Step A-D) |

## 運用ルール

- **更新タイミング**: Phase 0 で初期生成。Phase 1〜4 で剥がした項目は表から削除（または `Done: <commit>` 列を追加）
- **粒度**: ファイル単位ではなく **箇所単位**（行範囲）で記録する。同一ファイルに複数該当があれば複数行に分ける
- **検証**: Phase 1〜4 完了時、対応する inventory ファイルが空（または全行 Done）になっていることを完了条件にする
