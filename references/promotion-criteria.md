# Promotion Criteria — Engine 昇格基準

## 目的

各 engine の昇格を感覚ではなく機械的に判定するための共通基準を定義する。
この文書は `engine-maturity-matrix.md` のステージ定義を昇格判断まで拡張する。

## Maturity 状態遷移と各遷移の必要条件

```
audited → bridge-ready → compare-ready → compare-implemented
    → rust-implemented → wasm-callable → observation-ready
    → promotion-candidate → wasm-only trial → authoritative
```

### 遷移条件一覧

| 遷移元 | 遷移先 | 必要条件 |
|---|---|---|
| audited | bridge-ready | bridge パターン実装済み。全呼び出しが bridge 経由に統一。bridge test 通過 |
| bridge-ready | compare-ready | compare plan 文書完成。tolerance / invariant checker / mismatch 分類が決定 |
| compare-ready | compare-implemented | dual-run compare 実装済み。bridge test 全通過。dualRunObserver に FnName 登録済み |
| compare-implemented | rust-implemented | Rust crate 実装済み。`cargo test` 全通過（invariants / cross_validation / edge_cases） |
| rust-implemented | wasm-callable | `wasm-pack build` 成功。wasmEngine.ts に loader 追加。adapter 接続完了。`npm test` 全通過 |
| wasm-callable | observation-ready | DevTools で `__dualRunStats()` が当該 engine の統計を返す。dual-run-compare モードで動作確認済み |
| observation-ready | promotion-candidate | **下記「promotion-candidate 条件」参照** |
| promotion-candidate | wasm-only trial | **下記「wasm-only 限定試験条件」参照** |
| wasm-only trial | authoritative | **下記「authoritative 昇格条件」参照** |

---

## promotion-candidate 条件

observation-ready から promotion-candidate へ遷移するための条件。

### 必須条件（全て満たすこと）

1. **compare 実装済み** — bridge 経由の dual-run compare が動作している
2. **invariant tests 完備** — `*Invariants.test.ts` が engine の全関数をカバー
3. **cross-validation tests 完備** — Rust `cross_validation.rs` が TS golden fixture と一致
4. **edge cases 完備** — Rust `edge_cases.rs` がゼロ / 負値 / NaN / 大値をカバー
5. **quality gates 全通過** — `cargo test` + `npm run lint` + `npm run build` + `npm test`
6. **観測ログが一定量ある** — `observation-evaluation-guide.md` の最低必要量を満たす
7. **null-mismatch なし** — observer 上で nullMismatches === 0
8. **invariant-violation なし** — observer 上で invariantViolations === 0
9. **numeric-over-tolerance がゼロ、または許容範囲内で説明可能** — 発生した場合は原因と非業務影響を文書化
10. **rollback 手段が明確** — `rollback-policy.md` に基づき ts-only 復帰手順が実証済み

### 望ましい条件（判断材料として考慮）

- maxAbsDiff が安定して小さい（セッション間で増大傾向がない）
- compare 実行パスが主要 runtime path をカバー（UI 操作の主要経路で dual-run が走っている）
- DevTools / observer で追跡可能な状態が維持されている
- 実データ条件が複数パターンある（単一パターンの検証では不十分）

### 判定

上記必須条件を全て満たし、observer の verdict が `clean` または `tolerance-only` であれば
promotion-candidate とみなす。

---

## wasm-only 限定試験条件

promotion-candidate から wasm-only trial へ進めるための条件。

### 開始条件（全て満たすこと）

1. **2 週間以上、重大 mismatch なし** — dual-run-compare モードで invariant-violation / null-mismatch / numeric-over-tolerance が発生していない期間が 2 週間以上
2. **invariant violation なし** — 観測期間中ゼロ
3. **UI 差異報告なし** — 目視確認で差異なし
4. **rollback 実証済み** — wasm-only → ts-only の切り替えが実際に動作することを確認済み
5. **dev / staging で安定動作** — 開発環境で wasm-only モードでの通常利用に問題なし
6. **compare ログの評価が完了** — `observation-evaluation-guide.md` のテンプレートに基づき記録・評価済み

### 停止条件（いずれか1つで即停止）

1. **invariant violation 1 件でも発生** → 即 rollback、原因調査
2. **null mismatch が継続発生** → rollback、adapter の null 処理を再検証
3. **UI 差異あり** → rollback、原因特定
4. **rollback 不全** → 試験中止、rollback 手順の修正
5. **経路カバレッジ不足** → 試験延長、不足経路の追加検証

### 試験手順

1. `setExecutionMode('wasm-only')` で切り替え（localStorage 永続化）
2. 通常の開発利用を行う
3. 定期的に DevTools で `__dualRunStats()` を確認（wasm-only では compare は走らないが、invariant checker は bridge 内で動作する）
4. 問題発覚時は即 `setExecutionMode('ts-only')` で復帰

---

## authoritative 昇格条件

wasm-only trial から authoritative へ進めるための条件。
**この遷移は不可逆に近い**（TS 参照実装の削除を含む）ため、慎重に判定する。

### 必須条件（全て満たすこと）

1. **wasm-only 試験が限定環境で安定** — 試験期間中に停止条件に該当する事象がゼロ
2. **rollback 未使用期間が一定以上** — wasm-only 試験開始から rollback を行わずに 4 週間以上経過
3. **観測ログに新規異常なし** — 試験期間中の新規 mismatch がゼロまたは tolerance-only のみ
4. **TS 参照実装と意味差なし** — wasm-only 結果が TS 実装と同一の業務的意味を持つことが確認済み
5. **invariant 全保持** — `*Invariants.test.ts` が全通過し続けている

### 望ましい条件（判断材料として考慮）

- TS 参照実装の保守コストが上がっている（二重メンテの負担が顕在化）
- compare ログが長期間 clean
- 運用チームが rollback に依存しなくなっている

### 昇格後の作業

1. TS 参照実装をコードベースから削除（bridge は WASM 直接呼び出しに変更）
2. compare 関連コードを削除（dual-run は不要）
3. engine-maturity-matrix.md を `authoritative` に更新
4. observer の当該 FnName を削除（観測不要）

### 判定

必須条件を全て満たし、Authority（人間）が昇格を承認した場合のみ authoritative に遷移する。
**人間の明示的承認なしに authoritative 昇格を行ってはならない。**

---

## 判定の原則

- **感覚で決めない** — 必須条件はチェックリストとして全項目を確認する
- **観測量が不足なら待つ** — 「問題なさそう」は根拠にならない
- **mismatch の原因不明は NG** — 原因が特定できない mismatch がある限り次に進まない
- **rollback は常に可能にしておく** — authoritative 昇格まで TS 参照実装を削除しない
- **人間が最終判断する** — promotion-candidate → wasm-only trial → authoritative の各遷移は人間の承認を得る
