/**
 * カスタムページ
 *
 * ユーザーが作成したページ。全ウィジェットから自由に構成可能。
 */
import { useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MainContent } from '@/presentation/components/Layout'
import { MetricBreakdownPanel, PageSkeleton } from '@/presentation/components/common'
import { PageWidgetContainer, UNIFIED_WIDGET_REGISTRY } from '@/presentation/components/widgets'
import type { PageWidgetConfig } from '@/presentation/components/widgets'
import { usePageStore } from '@/application/stores/pageStore'
import { useUnifiedWidgetContext } from '@/presentation/hooks/useUnifiedWidgetContext'
import { useDataStore } from '@/application/stores/dataStore'
import { EmptyState } from './CustomPage.styles'

export function CustomPage() {
  const { pageId } = useParams<{ pageId: string }>()
  const nav = useNavigate()
  const pages = usePageStore((s) => s.pages)
  const page = pages.find((p) => p.id === pageId)
  const dataStores = useDataStore((s) => s.data.stores)

  const { ctx, isComputing, storeName, explainMetric, setExplainMetric } = useUnifiedWidgetContext()

  const config: PageWidgetConfig = useMemo(
    () => ({
      pageKey: `custom_${pageId ?? 'unknown'}`,
      registry: UNIFIED_WIDGET_REGISTRY,
      defaultWidgetIds: page?.defaultWidgetIds ?? [],
      settingsTitle: `${page?.label ?? 'カスタムページ'}のカスタマイズ`,
    }),
    [pageId, page],
  )

  const handleExplainClose = useCallback(() => setExplainMetric(null), [setExplainMetric])

  if (!page) {
    return (
      <MainContent title="ページが見つかりません">
        <EmptyState>
          <p>このページは削除されたか、存在しません。</p>
          <button onClick={() => nav('/dashboard')}>ダッシュボードへ戻る</button>
        </EmptyState>
      </MainContent>
    )
  }

  if (isComputing && !ctx) {
    return (
      <MainContent title={page.label} storeName={storeName}>
        <PageSkeleton />
      </MainContent>
    )
  }

  if (!ctx) {
    return (
      <MainContent title={page.label} storeName={storeName}>
        <EmptyState>計算を実行してください</EmptyState>
      </MainContent>
    )
  }

  return (
    <MainContent title={page.label} storeName={storeName}>
      <PageWidgetContainer config={config} context={ctx} />

      {explainMetric && ctx.explanations.has(explainMetric) && (
        <MetricBreakdownPanel
          explanation={ctx.explanations.get(explainMetric)!}
          allExplanations={ctx.explanations}
          stores={dataStores}
          onClose={handleExplainClose}
        />
      )}
    </MainContent>
  )
}
