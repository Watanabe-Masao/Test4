# sub-project-map — taxonomy-v2 (umbrella)

> 役割: umbrella から spawn した sub-project の一覧と依存関係。
>
> **正本**: `projects/active/taxonomy-v2/plan.md` §Interlock 仕様。本文書は
> AAG-COA 入口としての summary。

## sub-project 一覧

| 軸                  | projectId                    | status | changeType            | scope                                                                   |
| ------------------- | ---------------------------- | ------ | --------------------- | ----------------------------------------------------------------------- |
| **責務軸 (R:\*)**   | `responsibility-taxonomy-v2` | active | architecture-refactor | R:\* vocabulary / Schema / Guard / Operations / Legacy 撤退（10 Phase） |
| **テスト軸 (T:\*)** | `test-taxonomy-v2`           | active | architecture-refactor | T:\* vocabulary / Schema / Guard / Operations / Legacy 撤退（10 Phase） |

## 依存関係

```
taxonomy-v2 (親, Level 4 Umbrella)
│
├── responsibility-taxonomy-v2 (子 A)  ←┐
│                                       │── interlock 契約で相互依存
└── test-taxonomy-v2 (子 B)             ←┘
```

### interlock 仕様（親 plan.md §Interlock）

責務タグは **test obligation** を発行する。テストタグは **tag contract** を検証する。

| R:tag            | 必須 T:kind                           | 任意 T:kind             |
| ---------------- | ------------------------------------- | ----------------------- |
| `R:calculation`  | `T:unit-numerical`, `T:boundary`      | `T:invariant-math`      |
| `R:bridge`       | `T:contract-parity`                   | `T:fallback-path`       |
| `R:read-model`   | `T:zod-contract`, `T:null-path`       | —                       |
| `R:guard`        | `T:meta-guard`                        | `T:allowlist-integrity` |
| `R:presentation` | `T:render-shape`                      | `T:side-effect-none`    |
| `R:store`        | `T:state-transition`                  | —                       |
| `R:hook`         | `T:dependency-list`, `T:unmount-path` | —                       |
| `R:unclassified` | なし（`T:unclassified` が対応）       | —                       |

- マトリクス未登録の組み合わせは guard で block
- **R:tag 追加は T:kind 追加と同じ review window で裁定**（原則 interlock）
- **片軸だけの追加は禁止**（interlock 崩壊防止）

## 実施順序

| Phase | 親の所掌                                                | 子の所掌                                  |
| ----- | ------------------------------------------------------- | ----------------------------------------- |
| 1     | 7 不可侵原則 + interlock マトリクス **確定**            | —                                         |
| 2     | —                                                       | Phase 0: Inventory                        |
| 3     | interlock マトリクス **固定**                           | Phase 1: Schema 設計                      |
| 4     | review window 運用開始                                  | Phase 2-5: Migration / Guard / Operations |
| 5     | Cognitive Load Ceiling 監視                             | Phase 6-9: Legacy 撤退                    |
| 最終  | interlock 成立確認 + 2 子 completed を待って親 complete | 各子 completed → archive                  |

## 文脈継承の機械的強制

各 sub-project は親 plan.md の interlock 仕様により:

1. `config/project.json` に `parent: "taxonomy-v2"` が必須
2. `AI_CONTEXT.md` の Read Order に親の `plan.md` を含める
3. 片軸だけの変更は禁止（review window で親が裁定）

これを `subprojectParentGuard.test.ts` が機械検証する。

## 参照

- 親の `plan.md` §7 不可侵原則 / §Interlock 仕様 / §8 昇華メカニズム
- 各子の `AI_CONTEXT.md` / `plan.md`
- `references/01-foundation/taxonomy-origin-journal.md`（計画）
- `references/04-tracking/taxonomy-review-journal.md`（計画）
