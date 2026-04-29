# legacy-retirement — aag-bidirectional-integrity

> 役割: Phase 4 (legacy 撤退) の sunset / consolidation / 補完計画を記録。
> Phase 3 (網羅的 doc audit) の findings を input に、各 doc の判定理由 + migrationRecipe +
> 履歴を残す。
>
> 規約: `references/03-guides/projectization-policy.md` の Level 3 / requiresLegacyRetirement=true 対応。

## 1. 撤退対象の判定基準

Phase 3 audit findings を以下の 4 分類で判定する:

| 分類 | 定義 | 対応 |
|---|---|---|
| **L1. 即時 sunset** | 内容が完全に古い / superseded / 参照されていない | `99-archive/` 移管 + `archived: true` 注記 + 新 doc への redirect |
| **L2. 漸次 sunset** | 部分的に古いが直近の参照が残る / 移行期 | cooling period 設定（例: 30 日） + 段階的 deprecation marker |
| **L3. consolidation** | 同一概念を複数 doc が説明、conflict あり | 1 つを正本化、他は back link 化 + content の正本側への移管 |
| **L4. 補完** | 既存 doc が gap を持つ（rule の半分しか述べていない 等） | 同 doc 内に追記 or 新 doc 補完（Phase 8 とは異なり、前提整理に必要なもののみ） |

## 2. 段階削除原則

- **遡及的物理削除を行わない**。`99-archive/` 移管 → cooling period → 物理削除 の 3 段階で進める
- 各段階に独立した commit を打つ（後任が git log で経緯を追えるよう）
- migrationRecipe を本 doc に記録（消去 doc が指していた概念を、新どこに辿り着くべきかの指針）
- phased-content-specs-rollout の Phase K Option 1 物理削除パターン（`.skip` 化 → registry 削除 → 物理削除を別 commit）を踏襲

## 3. 撤退対象 list (Phase 3 audit 完了後に埋める)

> Phase 4 着手時に Phase 3 の `references/02-status/doc-audit-report.md` を input として
> 本セクションを埋める。spawn 時点では skeleton。

### L1: 即時 sunset 候補

| doc path | 撤退理由 | 移管先 | redirect 先 |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

### L2: 漸次 sunset 候補

| doc path | 撤退理由 | cooling period 終了予定 | deprecation marker |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

### L3: consolidation 候補

| 重複対象 (複数 doc) | 正本確定 doc | 移管 content | back link 形式 |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

### L4: 補完候補

| 既存 doc | gap 内容 | 補完方法（追記 / 新 doc） | Phase 8 との区別根拠 |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

## 4. migrationRecipe

各撤退対象の「消去された doc が指していた概念を、新たにどこから辿るべきか」を記録。

> Phase 4 実行時に、各 sunset commit と同期して本セクションを埋める。

| 旧 path | 旧概念 | 新 path | 新概念 (もし変化していれば) | 移行 commit |
|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD |

## 5. 履歴

| 日付 | 操作 | 対象 | commit |
|---|---|---|---|
| 2026-04-29 | spawn skeleton | (本 doc) | TBD |

## 6. 関連文書

| 文書 | 役割 |
|---|---|
| `plan.md` | Phase 4 の deliverable / 完了条件 |
| `HANDOFF.md` §3.8 | 段階削除原則の経緯 |
| `references/02-status/doc-audit-report.md` | Phase 3 audit の input source |
| `references/99-archive/` | sunset 移管先 |
| `references/03-guides/projectization-policy.md` | requiresLegacyRetirement=true 対応 |
| `projects/phased-content-specs-rollout/` Phase K Option 1 | 段階削除 pattern 参考 |
