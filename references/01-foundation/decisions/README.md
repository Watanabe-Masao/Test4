# references/01-foundation/decisions/ — user 判断置き場

> **役割**: user 判断 (= human decision) の lineage articulation 置き場 (= aag-self-hosting-completion R3d で landing)。
> recent-changes.generated.md (= 機械観測 timeline) と分離して、**人間が articulate した judgment** を独立 directory で蓄積。
>
> **配置 articulation (= AAG 4 系統 lens 整合)**:
> - **ログ系統**: `references/04-tracking/recent-changes.generated.md` (= 機械観測 timeline) + 本 `decisions/` (= user 判断 lineage)
> - **メトリクス系統**: `references/04-tracking/generated/*.generated.md`
> - **手順書系統**: `references/05-aag-interface/protocols/*.md` + `references/03-implementation/*.md`
> - **チェックリスト系統**: 各 active project `checklist.md` (= 2 段 gate)
> - **発見蓄積系統** (= DA-β-003): 各 active project `discovery-log.md`
>
> **per-project DA との分離**: 各 project の `decision-audit.md` は **本 project 範囲内** の判断 lineage。本 directory は **横断的 / 業務 domain / framework 横断** の user 判断を articulate (= 単一 project に閉じない判断)。
>
> 機械検証: なし (= human articulation の置き場、構造的 enforcement なし、reach は references/README.md index 経由)。

## 配置原則

| 何を置く | 何を置かない |
|---|---|
| 業務 domain 全体 / 主アプリ全体 / framework 全体 に影響する user 判断 | 単一 project 内に閉じる判断 (= per-project `decision-audit.md`) |
| 不可逆判断 (= rollback 不可) の articulate | 可逆判断 / 仮判断 (= per-project artifact で十分) |
| 横断的 stance / policy 制定 (= 「全 project でこうする」「今後この方針」) | 機械検証 logic / guard 設計 (= `app/src/test/architectureRules.ts` + 各 guard test) |
| user articulation の lineage (= 本 turn の user 発言を保存して後続 AI session が reach 可能にする) | AI judgement (= per-project `decision-audit.md` α stream / β stream) |

## 命名規約

- file 名: `<YYYY-MM-DD>-<short-articulate-id>.md`
- 例: `2026-05-03-pre-push-hook-scope-articulation.md` (= 仮想例、本 turn の DA-β-001 user articulation を articulate する場合)
- 1 file = 1 user 判断
- archive しない (= 履歴保持、recent-changes.generated との分離理由)

## 索引

(現在: bootstrap 直後、未蓄積)

> 本 directory に file が landed されたら、本 README.md の索引 section に entry を追記する (= `references/README.md` から reach 可能にする)。

## status

- 2026-05-03 (DA-α-004d で landing): 本 directory 新設 + README.md schema 制定
- 後続: user articulation を file 単位で蓄積 (= 必要に応じて、強制ではない)
