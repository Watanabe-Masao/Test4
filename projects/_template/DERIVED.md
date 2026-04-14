# DERIVED — 派生セットの判断基準

> 役割: 新 project が「必須セットだけでは実行可能粒度に届かない」と判定した
> ときに、どの派生ファイルを足すべきかを決める判断基準。
>
> 必須セットは `AI_CONTEXT.md` / `HANDOFF.md` / `plan.md` / `checklist.md` /
> `config/project.json` / `aag/execution-overlay.ts` の 6 つ。
> 派生セットは `derived/` 配下にテンプレートがあり、必要なものだけを
> project root にコピーして使う。

---

## 判断フロー

以下の 5 つの質問に答え、Yes のものだけを派生セットから足す。

### Q1. この project は複数 PR に分かれるか？

**Yes →** `pr-breakdown.md` を足す

典型的な兆候:
- Phase が 3 つ以上あり、各 Phase が独立に PR になる
- 後続 PR が先行 PR のマージ結果に依存する
- レビュー観点が PR ごとに変わる

### Q2. 複数カテゴリにわたるレビュー観点を引き継ぐ必要があるか？

**Yes →** `review-checklist.md` を足す

典型的な兆候:
- 設計原則 / ガードテスト / ドキュメント整合性 など複数観点でレビューする
- レビュー観点が属人化していて、毎回同じ質問が発生する
- 新人 reviewer にも同じ基準で見てもらいたい

### Q3. 受入条件を機械検証したいか？

**Yes →** `acceptance-suite.md` を足す

典型的な兆候:
- 「この機能が通れば完了」という統合的なテストセットを固定したい
- critical path を機械的に守る test を先に列挙したい

### Q4. テスト計画を先に立ててから実装したいか？

**Yes →** `test-plan.md` を足す

典型的な兆候:
- Guard test（G0〜G6）と論理 test（L0〜L4）の計画を先に立てたい
- テスト設計がそのままレビュー観点になる

### Q5. Phase 0 棚卸しの結果が 3 ファイル以上になるか？

**Yes →** `inventory/` を足す

典型的な兆候:
- 調査対象が多岐にわたり、結果を章単位で固定したい
- 後任者が棚卸し結果だけを参照できる状態にしたい
- 棚卸し結果が `HANDOFF.md` に収まらない

---

## 使い方

```bash
# 例: pr-breakdown と test-plan を使う場合
cp derived/pr-breakdown.md pr-breakdown.md
cp derived/test-plan.md test-plan.md

# 使わないファイルは derived/ に残しておく（または削除）
```

---

## 注意

- **全部足す必要はない**。必要なものだけ足す
- **小さな fix（`quick-fixes`）は派生セットを絶対に使わない**
- 迷ったら必須セットだけで試し、実行中に必要性が明確になってから足す
- 派生ファイルを足したら `HANDOFF.md` の「関連文書」表に行を追加する

---

## 関連

- `references/03-guides/new-project-bootstrap-guide.md` — bootstrap 手順全体
- `references/03-guides/project-checklist-governance.md` §10 — 必須セット bootstrap
- `projects/aag-format-redesign/new-format-design.md` — 派生セット設計の根拠
