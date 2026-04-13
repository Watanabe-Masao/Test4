# HANDOFF — aag-collector-purification

> 役割: 起点文書。後任者が最初に読む。
> 完了済みの全景 + 次にやること + ハマりポイントを 1 画面で把握できる。

## 1. 現在地

新規立ち上げ（2026-04-12）。AAG 5.1 release 直後の外部レビューで指摘された
論点 3（collector の heading 依存）に対応する。実装はまだ何もしていない。

現状の `tools/architecture-health/src/collectors/project-checklist-collector.ts`
の `countCheckboxes` 関数:

```ts
if (
  /やってはいけないこと/.test(line) ||
  /常時チェック/.test(line) ||
  /最重要項目/.test(line)
) {
  suppress = true
}
```

これにより、「やってはいけないこと」見出し配下の checkbox は集計から
除外されている。`pure-calculation-reorg/checklist.md` がこの形式で書かれて
いるため、互換のために必要な実装。

しかし governance §3 では「これらの項目は checklist に書かない（plan.md に
書く）」と明記しているため、**規約と実装が逆向き** になっている。

## 2. 次にやること

詳細は `checklist.md`。3 Phase 構成:

### Phase 1: pure-calculation-reorg/checklist.md の純化

- 「やってはいけないこと」セクションの全 checkbox を `plan.md` の不可侵原則 / 禁止事項に移動
- 「最重要項目」セクションの 4 checkbox を `plan.md` の Phase 11 完了後の確認項目に移動
- 「常時チェック」セクションの 6 checkbox を CONTRIBUTING.md またはルートの開発フロー文書に移動
- checklist.md には Phase 0-11 の達成条件 checkbox **だけ** を残す
- collector が現状 (`pure-calculation-reorg` を `FORMAT_EXEMPT_PROJECT_IDS` で除外) のままでも、純化後の checklist は同じ集計結果になることを確認する（safety check）

### Phase 2: format guard を strict 化

- `FORMAT_EXEMPT_PROJECT_IDS` から `pure-calculation-reorg` を外す
- `checklistFormatGuard.test.ts` の F3-F5 を全 project に適用
- `npm run test:guards` が PASS することを確認
- もし `pure-calculation-reorg` で違反が出たら Phase 1 が不完全 → Phase 1 に戻る

### Phase 3: collector の heading 抑制ロジック削除

- `project-checklist-collector.ts::countCheckboxes` から heading 抑制 if 文を削除
- format guard が strict 化されているので、collector が抑制しなくても正しい集計が出る
- regression として `quick-fixes` の collection 動作に影響がないことを確認
- governance §3 と collector 実装の対称性を test で固定（new test: 「規約に書かれた除外項目が checklist 内に存在しないこと」を guard する）

## 3. ハマりポイント

### 3.1. Phase の順序を逆転させてはいけない

**Phase 1 → 2 → 3 の順序は厳守する。**

逆順 (Phase 3 を先) にやると、`pure-calculation-reorg/checklist.md` の
「やってはいけないこと」が一気に required checkbox としてカウントされ、
進捗が `88/132 → 88/170+` のように **数字が動く** ばかりか、未 check の
項目が大量にカウントされて project-health が破壊される。

正しい順序: 純化 (Phase 1) → strict 化 (Phase 2) → 抑制削除 (Phase 3)。
各 Phase ごとに `npm run docs:generate` で project-health の数字を確認すること。

### 3.2. pure-calculation-reorg の Phase 8-11 進行を止めない

本 project と pure-calculation-reorg は **並行進行する別 project**。
本 project が触るのは pure-calculation-reorg の checklist フォーマットだけで、
Phase 0-11 の達成条件自体は変えない。

具体的には:

- Phase 0-7 の `[x]` は維持
- Phase 8-11 の `[ ]` も維持
- 「やってはいけないこと」「最重要項目」「常時チェック」セクションを別文書に移すだけ

これらの作業中に pure-calculation-reorg の進行が止まってしまうと、
別の作業者がストレスを抱える。時間帯を分けるか、1 commit で終わらせる。

### 3.3. collector の heading 抑制を削除する前に必ず regression を確認

`quick-fixes` collection は `kind: collection` を使っているので heading 抑制
の有無に関わらず動くはずだが、regression test を追加して念押しする。

具体的には:

- collection の checklist は continuous で全 checkbox がカウントされる
- 削除対象の heading 抑制ロジックは collection には影響しない
- ただし、`createDuplicateInjectingMockConn` 等の helper が間接的に影響しないか
  整合性チェックが必要

### 3.4. governance §3 と実装の整合性を test 化する

heading 抑制を削除するだけでは「次に同じ問題が起きない」保証にはならない。
**規約と実装の対称性を機械検証する test を追加** する:

```ts
// e.g. checklistGovernanceSymmetryGuard.test.ts
it('governance §3 が禁止する項目が全 live project の checklist に存在しない', () => {
  // 全 checklist.md を読み、「やってはいけないこと」「常時チェック」「最重要項目」
  // という見出しが存在しないことを検証する
})
```

これがあると、将来「便利だから」と heading を復活させる誘惑が出ても CI で
即発火する。

## 4. 関連文書

| ファイル | 役割 |
|---|---|
| `references/03-guides/project-checklist-governance.md` | §3 / §11 が規約の正本 |
| `tools/architecture-health/src/collectors/project-checklist-collector.ts` | 純化対象 |
| `app/src/test/guards/checklistFormatGuard.test.ts` | 純化対象 (strict 化) |
| `app/src/test/guards/checklistGovernanceSymmetryGuard.test.ts` | 新規追加 (再発防止) |
| `projects/pure-calculation-reorg/checklist.md` | 移行対象 |
| `projects/pure-calculation-reorg/plan.md` | 移行先 |

---

Archived: 2026-04-13
