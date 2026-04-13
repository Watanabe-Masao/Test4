# checklist — architecture-decision-backlog

> 役割: completion 判定の入力。各 item は「決定する」ことが完了条件。
> 判断主体・期限・関連文書を明記する。

## R: ロール / セッション運用

* [x] R-9: ロールシステム軽量化の方針を決定する
  - 判断主体: documentation-steward + AI セッション運用者
  - 決定日: 2026-04-13
  - 決定: **(c) 現状維持** — staff 3 + line 7 の計 10 ロール構造を維持する
  - 根拠: AAG コア信頼性回復 (v5.2 / P0-1, P0-2) が完了し health 39/39 PASS
    の状態で、ロール定義自体が摩擦源になっている具体的な観測事実はない。
    「動いているものを壊す」リスクが軽量化の期待便益を上回る。再検討は具体的な
    摩擦 (例: 同じロールで複数の責務混在、エージェント間の handoff で情報欠落)
    が観測されたときに行う
  - 関連: `roles/`, `CLAUDE.md` のロール定義セクション, `references/02-status/open-issues.md` R-9
