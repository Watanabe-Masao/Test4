/**
 * ルーティング定義（metadata-driven）
 *
 * PAGE_REGISTRY から Route を生成する。コンポーネント解決は PAGE_COMPONENT_MAP で行う。
 * ページメタデータの正本は application/navigation/pageRegistry.ts。
 * lazy import と PAGE_COMPONENT_MAP は `pageComponentMap.ts` に分離（HMR 対応）。
 *
 * @responsibility R:unclassified
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { PAGE_REGISTRY, REDIRECT_REGISTRY } from '@/application/navigation/pageRegistry'
import { PAGE_COMPONENT_MAP } from '@/presentation/pageComponentMap'

// ─── ルート定義コンポーネント ────────────────────────────────

export function AppRoutes() {
  return (
    <Routes>
      {/* Standard + dynamic ページ（PAGE_REGISTRY から生成） */}
      {PAGE_REGISTRY.map((page) => {
        const Component = PAGE_COMPONENT_MAP[page.id]
        if (!Component) return null
        return <Route key={page.id} path={page.pathPattern} element={<Component />} />
      })}

      {/* レガシーパスからのリダイレクト（REDIRECT_REGISTRY から生成） */}
      {REDIRECT_REGISTRY.map((redirect) => (
        <Route
          key={redirect.from}
          path={redirect.from}
          element={<Navigate to={redirect.to} replace />}
        />
      ))}

      {/* 未知ルートのフォールバック（明示的 — true unknown → dashboard） */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
