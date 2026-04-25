/**
 * widgetContextNarrow — UnifiedWidgetContext の slice 型を render-time 型に narrow する chokepoint helper
 *
 * ADR-A-004 PR3: `result: StoreResultSlice` / `prevYear: PrevYearDataSlice` を
 * dispatch site で 1 回だけ narrow し、`RenderUnifiedWidgetContext` を widget
 * 本体に渡す。widget 本体は narrowing 文を持たず、`ctx.result.X` /
 * `ctx.prevYear.X` を直接参照する（chokepoint パターン）。
 *
 * @responsibility R:utility
 */
import type { RenderUnifiedWidgetContext, UnifiedWidgetContext } from './types'

/**
 * UnifiedWidgetContext の slice を ready 状態に narrow する。
 *
 * - 両 slice が ready のときのみ `RenderUnifiedWidgetContext` を返す
 * - いずれかが empty のときは null を返し、dispatch site は描画を skip する
 *
 * 通常 runtime では populator (`useUnifiedWidgetContext`) が両 slice を必ず
 * ready で wrap するため null は返らないが、型レベルで「未取得」を区別できる
 * よう defensive に null 経路を保持する。
 */
export function narrowRenderCtx(ctx: UnifiedWidgetContext): RenderUnifiedWidgetContext | null {
  if (ctx.result.status !== 'ready' || ctx.prevYear.status !== 'ready') {
    return null
  }
  return { ...ctx, result: ctx.result.data, prevYear: ctx.prevYear.data }
}
