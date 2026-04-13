# HANDOFF — architecture-decision-backlog

> 役割: 起点文書。後任者が最初に読む。

## 1. 現在地

新規立ち上げ。verification (2026-04-12) で LIVE が確認できた decision item は
**R-9 (ロールシステム軽量化) のみ**。

他に open-issues.md / technical-debt-roadmap.md にあった speculative 項目
（dataVersion 粒度見直し / store_day_summary 列設計再検討 / feature ownership
expansion 等）は、現コードや現 docs に具体的な未着手項目として裏付けられない
ため、本 project の checklist に入れない。

新しい決定対象が発生したら、本 project の checklist に追加する形で扱う
（speculative の温床を防ぐため、「判断主体 + 期限 + 関連文書」を必ず明記する）。

## 2. 次にやること

### 高優先

- **R-9 ロールシステム軽量化の判断**:
  - 16 ファイルの読み込みコストをどう下げるか
  - 軽量モードを作るのか / 統合するのか / そのままで良しとするのか
  - 判断主体: documentation-steward + AI セッション運用者
  - 関連: `roles/`, `CLAUDE.md` のロール定義セクション

## 3. ハマりポイント

### 3.1. speculative item を入れない

「将来こういう問題が起きそう」というレベルの item を本 project に入れると
checklist が肥大化する。**現に困っている / 期限がある** ものだけを入れる。

### 3.2. 決定後は別 project に移す

R-9 の判断結果が「軽量モードを作る」だったら、その実装は本 project ではなく
新しい implementation project (例: `roles-lightweight-mode`) として切り出す。
本 project の checklist は judgement 作業だけで完結する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/02-status/open-issues.md` | R-9 の元出典 + 解決記録 |
| `roles/` | R-9 の対象 |
| `CLAUDE.md` | ロール定義の上位文書 |

---

Archived: 2026-04-13

R-9 を **(c) 現状維持** で決定。staff 3 + line 7 の計 10 ロール構造を維持する。
AAG コア信頼性回復 (v5.2 / P0-1, P0-2) 完了時点でロール定義が摩擦源になっている
具体的な観測事実がないため「動いているものを壊す」リスクが軽量化の期待便益を
上回ると判断。再検討は具体的な摩擦 (同じロールで複数責務混在 / handoff での
情報欠落 等) が観測されたときに行う。

新たな architecture decision が必要になった場合は、本 project を復活させるか、
fresh な decision-backlog project を立ち上げる。
