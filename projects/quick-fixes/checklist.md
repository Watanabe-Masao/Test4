# checklist — quick-fixes

> 役割: 単発 fix の集約 checklist。
> 書き方: `* [ ] (優先度) <スコープ>: <一文の説明>`
> 詳細は plan.md を参照。

## 単発 fix

<!-- 新しい fix はこのセクションに `* [ ]` で追加する -->
<!-- 完了したら checked にする（削除しない） -->
<!-- 大きい文脈が必要になったら独立 project に昇格させる -->

* [x] (中) version sync の Core 化: `documentConsistency.test.ts` の hard-code を AAG Layer 2/3 に分離し、`recent-changes.md` の同期ペアを追加。registry 化により新ペア追加が「1 entry」で済む。詳細: governance §12 / `app/src/test/versionSyncRegistry.ts` / `app/src/test/guards/versionSyncGuard.test.ts`
* [x] (中) `tools/git-hooks/pre-push`: `tsc -p tsconfig.app.json --noEmit` を local 必須化する。AAG 5.1 release 直後に CI で TS6133 (project-checklist-collector の未使用宣言) が検出された経緯から、`noUnusedLocals` / `noUnusedParameters` 違反を local で完結させる。vite build 自体は OOM するため省略する — 2026-04-13 完了: `check_tsc()` を追加し `CHECK_REGISTRY` に登録（`check_lint` 直前）
* [x] (低) `app/src/test/audits/queryAccessAudit.test.ts`: `store_day_summary` 依存検出が `content.includes('store_day_summary')` の coarse grep のため、JSDoc コメント内の literal も依存としてカウントしてしまう。検出を SQL 文字列リテラル / `FROM` 節の中だけに絞る (e.g. `/FROM\s+store_day_summary\b/`) ように改善する。AAG 5.1 release 直後に freePeriodFactQueries.ts への JSDoc 追加で false positive となった経緯 — 2026-04-13 完了: `/\bFROM\s+store_day_summary\b/i` に置換、`storeDaySummary` 変種は SQL 依存の実体ではないため削除
* [x] (低) `references/02-status/technical-debt-roadmap.md`: P1〜P9 の改善 project 表の各セクション冒頭に `[履歴]` または `(完了)` バッジを追加する。AAG 5.1 release 後の外部レビューで「冒頭の banner で live task を持たないと宣言したのに本文が live に見える」と指摘された経緯。完全分離 (`technical-debt-history.md` への分割) は破壊的すぎるため軽量な追記で対応する — 2026-04-13 完了: P1-P5 に `[履歴]`、P6-P9 に `[継続観察]` バッジを追加（P6-P9 は完了ではないが live task ではないことを明示）
* [ ] (低) `useDayDetailPlanObservation.ts` の削除: `day-detail-modal-prev-year-investigation` で原因が確定し本番 fix (PR claude/day-detail-modal-store-frame-fix) が反映されたら、観測 hook + localStorage フラグ + `useDayDetailPlan` の呼び出しを削除する。原因確定後に残す runtime log は禁止 (hook 自身の JSDoc でも削除予定と明示)
