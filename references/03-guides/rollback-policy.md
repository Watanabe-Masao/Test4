# Rollback Policy — WASM 昇格の安全な戻し方

## 目的

wasm-only 限定試験や compare フェーズで問題が発生したとき、
安全に TS 実装へ戻す手順と判断基準を固定する。

---

## 1. 実行モードの切り替え方法

### ts-only への復帰

```javascript
// DevTools コンソールで実行
// 方法 1: wasmEngine の API 経由
import { setExecutionMode } from './application/services/wasmEngine'
setExecutionMode('ts-only')

// 方法 2: localStorage 直接変更（DevTools で可能）
localStorage.setItem('factorDecomposition.executionMode', 'ts-only')
// ページリロード
```

### dual-run-compare への復帰

```javascript
setExecutionMode('dual-run-compare')
// または
localStorage.setItem('factorDecomposition.executionMode', 'dual-run-compare')
```

### 確認方法

```javascript
// DevTools で現在のモードを確認
import { getExecutionMode } from './application/services/wasmEngine'
getExecutionMode() // → 'ts-only' | 'wasm-only' | 'dual-run-compare'
```

---

## 2. 段階別 Rollback 手順

### Phase A: dual-run-compare 中の問題

**状況:** dual-run-compare モードで mismatch が検出された。

**手順:**
1. `__dualRunStats('log')` で mismatch 詳細を記録
2. 問題の severity を判定（下記「即 rollback 条件」参照）
3. severity が高い場合: `setExecutionMode('ts-only')` で一時退避
4. 原因を調査・修正
5. 修正後に `setExecutionMode('dual-run-compare')` で再開
6. `__dualRunStats('reset')` で統計をリセットし、観測をやり直す

**注:** dual-run-compare 中は authoritative return が常に TS なので、
mismatch が検出されても UI への影響はない。緊急性は低い。

### Phase B: wasm-only 限定試験中の問題

**状況:** wasm-only モードで問題が発生した。

**手順:**
1. 即座に `setExecutionMode('dual-run-compare')` に戻す（TS が authoritative に）
2. 問題の再現を dual-run-compare モードで確認
3. `__dualRunStats()` で mismatch の詳細を確認
4. 原因が特定できない場合は `setExecutionMode('ts-only')` まで戻す
5. 原因を修正
6. cargo test + npm test で修正を検証
7. dual-run-compare で十分な観測を行った後、wasm-only 試験を再開

### Phase C: authoritative 昇格後の問題

**状況:** WASM が authoritative になった後に問題が発覚した。

**注意:** authoritative 昇格は TS 参照実装の削除を含むため、
単純な `setExecutionMode('ts-only')` では戻せない。

**手順:**
1. git history から TS 参照実装を復元
2. bridge に TS パスを復活させる
3. `setExecutionMode('ts-only')` で TS に戻す
4. 原因を調査

**このため、authoritative 昇格は十分な観測と人間の承認を必須とする。**

---

## 3. 即 Rollback 条件

以下のいずれかに該当したら、即座に安全なモードへ戻す。

| 条件 | severity | 対応 |
|---|---|---|
| **invariant violation** | Critical | 即 rollback。数学的不変条件の破壊は最重大 |
| **null mismatch 連発** | High | rollback。adapter の null sentinel 処理を再検証 |
| **UI 差異** | High | rollback。ユーザーが見る結果に影響がある |
| **継続的 numeric-over-tolerance** | Medium | 原因調査。解決できなければ rollback |
| **WASM 初期化失敗の頻発** | Medium | rollback。WASM バイナリまたはローダーの問題 |

### severity 別の対応

| severity | 対応 |
|---|---|
| Critical | 即 rollback + 試験停止 + 原因調査完了まで再開しない |
| High | 即 rollback + 原因調査 + 修正後に観測再開 |
| Medium | 原因調査を先行。解決見込みがなければ rollback |

---

## 4. Rollback 後の確認事項

rollback を行った後、以下を確認する:

1. **invariant tests 全通過** — `npm test` で `*Invariants.test.ts` が通ること
2. **bridge tests 全通過** — `*Bridge.test.ts` が通ること
3. **UI 動作確認** — rollback 後のモードで主要画面が正常に表示されること
4. **observer リセット** — `__dualRunStats('reset')` で統計をクリア
5. **観測ログに記録** — rollback の理由・日時・復帰手順を記録

---

## 5. 鉄則

- **compare 実装は残す** — rollback しても compare 関連コード（bridge, adapter, observer）は削除しない。再開時に必要
- **観測ログは消さない** — mismatch ログは原因調査と再発防止の資産
- **rollback は恥ではない** — 問題を早期発見して戻すのは正しい動作。無理に続行しない
- **復帰後に再観測** — rollback + 修正後は観測をリセットしてやり直す。過去の clean ログは修正前のもの
- **authoritative 昇格前は常に戻せる** — TS 参照実装を削除するのは authoritative 昇格時のみ
