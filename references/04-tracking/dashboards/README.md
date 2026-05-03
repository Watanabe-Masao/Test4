# dashboards/ — 横断 metrics 集約 layer

> **役割 (= aag-self-hosting-completion R4 で landing)**: per-element status (= `references/04-tracking/elements/<category>/<id>/quality-status.generated.md`) + per-project state (= `projects/<id>/`) を **横断的に集約** する dashboard layer。
>
> **正本性**: 本 directory 配下は全て **機械生成** (= 手編集禁止、`generatedFileEditGuard` で機械検証)。
>
> **layer 階層 (= AAG 5 系統 lens 整合)**:
> - **メトリクス系統 (= 本 directory)**: 横断 dashboard
> - per-element status: `elements/<category>/<id>/quality-status.generated.md`
> - per-project state: `projects/<id>/HANDOFF.md` (= ログ系統) + `projects/<id>/checklist.md` (= チェックリスト系統)

## dashboard 一覧

| dashboard | 役割 | 集約先 |
|---|---|---|
| `quality-dashboard.generated.md` | 全 element の quality 状態 横断ビュー (= test coverage / lint pass / 制約遵守) | per-element `quality-status.generated.md` |
| `migration-progress.generated.md` | 進行中 migration の総合進捗 (= R-phase / per-program migration / breaking change 残数) | active project HANDOFF / projectization metadata |
| `element-coverage.generated.md` | 全 element の per-element directory 適用率 (= flat-file vs per-element directory) | element directory walk |
| `boundary-health.generated.md` | 3 tree boundary 健全性 + AAG self-hosting closure 状態 | aagBoundaryGuard / selfHostingGuard / oldPathReferenceGuard |

## status

- 2026-05-03 (DA-α-005 で landing): 4 dashboard skeleton landed (= collector 実装は post-R4 別 program candidate)
