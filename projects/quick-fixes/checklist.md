# checklist — quick-fixes

> 役割: 単発 fix の集約 checklist。
> 書き方: `* [ ] (優先度) <スコープ>: <一文の説明>`
> 詳細は plan.md を参照。

## 単発 fix

<!-- 新しい fix はこのセクションに `* [ ]` で追加する -->
<!-- 完了したら checked にする（削除しない） -->
<!-- 大きい文脈が必要になったら独立 project に昇格させる -->

* [x] (中) version sync の Core 化: `documentConsistency.test.ts` の hard-code を AAG Layer 2/3 に分離し、`recent-changes.md` の同期ペアを追加。registry 化により新ペア追加が「1 entry」で済む。詳細: governance §12 / `app/src/test/versionSyncRegistry.ts` / `app/src/test/guards/versionSyncGuard.test.ts`
* [ ] (中) `tools/git-hooks/pre-push`: `tsc -p tsconfig.app.json --noEmit` を local 必須化する。AAG 5.1 release 直後に CI で TS6133 (project-checklist-collector の未使用宣言) が検出された経緯から、`noUnusedLocals` / `noUnusedParameters` 違反を local で完結させる。vite build 自体は OOM するため省略する
* [ ] (低) `app/src/test/audits/queryAccessAudit.test.ts`: `store_day_summary` 依存検出が `content.includes('store_day_summary')` の coarse grep のため、JSDoc コメント内の literal も依存としてカウントしてしまう。検出を SQL 文字列リテラル / `FROM` 節の中だけに絞る (e.g. `/FROM\s+store_day_summary\b/`) ように改善する。AAG 5.1 release 直後に freePeriodFactQueries.ts への JSDoc 追加で false positive となった経緯
