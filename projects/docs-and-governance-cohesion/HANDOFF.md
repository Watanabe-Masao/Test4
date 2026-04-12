# HANDOFF — docs-and-governance-cohesion

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

本 project は 14 phase のうち Phase 1-2 を実行中（2026-04-12）。

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | project / checklist 運用ルールの正本ガイド作成 | 🟡 進行中 |
| 2 | 5 live project スケルトン作成 | 🟡 進行中 |
| 3 | 既存 docs から live task を 5 project に移管 | ⏳ 未着手 |
| 4 | references/ を機能説明だけに縮退 | ⏳ 未着手 |
| 5 | open-issues.md を active project 索引に変更 | ⏳ 未着手 |
| 6 | technical-debt-roadmap.md を rationale 文書に縮退 | ⏳ 未着手 |
| 7 | project checklist collector 追加 | ⏳ 未着手 |
| 8 | checklist format guard 追加 | ⏳ 未着手 |
| 9 | completion consistency guard 追加 | ⏳ 未着手 |
| 10 | generated project-health 追加 | ⏳ 未着手 |
| 11 | architecture-health に project KPI 統合 | ⏳ 未着手 |
| 12 | projects/completed/ 導入 | ⏳ 未着手 |
| 13 | archive 手順固定 | ⏳ 未着手 |

## 2. 次にやること

詳細は `checklist.md` を参照。優先順位は plan §7 で固定。

### 推奨 PR 構成

| PR | 内容 | Phase |
|---|---|---|
| A | governance guide + 5 project スケルトン | 1, 2 |
| B | docs から task 移管 + references/ 縮退 + open-issues/tech-debt 縮退 | 3-6 |
| C | checklist collector + checklist format guard + consistency guard | 7-9 |
| D | generated project-health + architecture-health 統合 | 10-11 |
| E | projects/completed/ 導入 + archive 手順 | 12-13 |

## 3. ハマりポイント

### 3.1. live task 判定の chronic な誤り

「ドキュメントに書かれているから live」という早合点を避ける。コードと
照合すること。例: open-issues.md の active-debt 残 7 件は verification 結果
2026-04-12 時点で実は 1 件しか live でなかった（5 件は features/ への移動で削減済）。

### 3.2. checklist format guard が厳しすぎると開発が止まる

最初は warning レベルから入り、`.fails` ロックで段階的に強制する。
checklist に書かれた item で format 違反があったら CI が即赤になるため、
existing project (`pure-calculation-reorg/checklist.md`) の現状形式と互換に
する。具体的には「やってはいけないこと」セクションは別途格納先を提供してから
guard を有効にする。

### 3.3. CURRENT_PROJECT.md は active が複数になりうる

複数 active project が同時進行する場合でも CURRENT_PROJECT.md は 1 つだけ
active を指す。consistency guard はこれを「主 active」として扱う。
他の active project は `projects/<id>/config/project.json` の status だけで管理する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | 本 project が確立する規約の正本 |
| `references/02-status/open-issues.md` | 縮退後の active project 索引 |
| `references/02-status/technical-debt-roadmap.md` | 縮退後の判断理由文書 |
