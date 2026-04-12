# plan — architecture-decision-backlog

## 不可侵原則

1. **本 project の checklist 完了条件は「決定する」こと** — 実装は別 project
2. **speculative item を入れない** — 「将来こうなりそう」だけでは入れない
3. **各 item には判断主体・期限・関連文書を明記する** — 決定責任を曖昧にしない
4. **決定後は記録を残し、実装 project へ link する** — 判断の追跡可能性を保つ

## 決定 item の format

```markdown
* [ ] <判断対象>
  - 判断主体: <ロール名>
  - 期限: <YYYY-MM-DD or "未定" 禁止>
  - 関連: <文書 / コードへのリンク>
```

## やってはいけないこと

- 期限を「未定」のまま登録する → 永遠に決まらない
- 判断主体を空欄にする → 責任所在不明になる
- 判断に必要な調査を本 project に入れる → 調査は別タスク
- 決定済みの item を archive せずに残す → checklist が腐る
