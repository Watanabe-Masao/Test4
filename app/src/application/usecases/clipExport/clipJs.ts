/**
 * クリップ HTML 用 JavaScript テンプレート
 *
 * renderClipHtml から分離。自己完結型 HTML レポートのインタラクティブ描画ロジック。
 * vanilla JS テンプレートリテラルとして埋め込まれる。
 *
 * セクション分割:
 *   clipJsCore.ts      — ユーティリティ、Map構築、state、render()
 *   clipJsKpi.ts       — KPI サマリーグリッド
 *   clipJsCalendar.ts  — 月間カレンダービュー
 *   clipJsWaterfall.ts — 要因分解ウォーターフォール + SVG
 *   clipJsHourly.ts    — 時間帯別売上分析
 *   clipJsDrill.ts     — カテゴリドリルダウン
 *   clipJsDetail.ts    — 日別詳細オーバーレイ
 */

import { CLIP_JS_CORE } from './clipJsCore'
import { CLIP_JS_KPI } from './clipJsKpi'
import { CLIP_JS_CALENDAR } from './clipJsCalendar'
import { CLIP_JS_WATERFALL } from './clipJsWaterfall'
import { CLIP_JS_HOURLY } from './clipJsHourly'
import { CLIP_JS_DRILL } from './clipJsDrill'
import { CLIP_JS_DETAIL } from './clipJsDetail'

export const JS_CONTENT = `
'use strict';
(function(){
${CLIP_JS_CORE}
${CLIP_JS_KPI}
${CLIP_JS_CALENDAR}
${CLIP_JS_WATERFALL}
${CLIP_JS_HOURLY}
${CLIP_JS_DRILL}
${CLIP_JS_DETAIL}
  // Initial render
  render();
})();
`
