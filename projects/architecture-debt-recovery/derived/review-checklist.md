# review-checklist — <PROJECT-ID>

> 役割: カテゴリ別のレビュー観点を固定化し、レビューの脱属人化を図る。
>
> いつ使うか: 設計原則 / ガード / ドキュメントなど複数観点を引き継ぐ必要があるとき。
> 判断基準: `DERIVED.md` §Q2。

---

## A. 設計原則

* [ ] 4 層依存ルール（Presentation → Application → Domain ← Infrastructure）を守っているか
* [ ] domain/ は pure であるか（副作用がないか）
* [ ] presentation/ は描画のみか

## B. ガードテスト

* [ ] 新規の構造制約は guard test で守られているか
* [ ] allowlist を追加していないか（追加した場合は ratchet-down か）
* [ ] allowlist を追加した場合、`ruleId` / `createdAt` / `reviewPolicy` が埋まっているか
* [ ] 既存 guard を破壊していないか

## C. ドキュメント

* [ ] CLAUDE.md / references/ の関連記述と整合しているか
* [ ] generated section を prose で上書きしていないか
* [ ] `docs:check` が PASS するか

## D. テスト

* [ ] 単体テストがあるか
* [ ] 1 文説明テスト（C8）が書けるか
* [ ] 不変条件の追加が必要ならガードテストに書いたか

## E. 命名・構造

* [ ] ファイル名・配置が規約通りか
* [ ] import path alias が正しいか
* [ ] 新規 / 変更 TS ファイルに primary 責務タグ（`@responsibility R:*`）がちょうど 1 つあるか（例: `R:calculation` / `R:hook` / `R:component`）

## F. セキュリティ

* [ ] 境界での検証（Zod parse 等）があるか
* [ ] 外部入力を信頼していないか

## G. パフォーマンス

* [ ] useMemo / useCallback の個数が規約内か
* [ ] 不要な re-render を招いていないか

## H. 互換性

* [ ] 既存 project / feature に破壊的変更を与えていないか
* [ ] バレルの後方互換を維持しているか

## I. 観測性

* [ ] エラー伝播が silent catch になっていないか
* [ ] 観測ログが適切に残っているか

## J. プロジェクト固有

* [ ] <本 project 固有のレビュー観点>
