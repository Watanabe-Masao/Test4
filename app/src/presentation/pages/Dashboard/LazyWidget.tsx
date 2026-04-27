/**
 * LazyWidget — チャートウィジェットをビューポートに入るまでプレースホルダーで表示する。
 * IntersectionObserver で一度表示されたらフリーズし、再マウントを防ぐ。
 *
 * @responsibility R:unclassified
 */
import { memo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useIntersectionObserver } from '@/presentation/hooks/useIntersectionObserver'

export const LazyWidget = memo(function LazyWidget({ children }: { children: ReactNode }) {
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin: '200px',
    freezeOnceVisible: true,
  })

  return (
    <div ref={ref}>
      {hasBeenVisible ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      ) : (
        <div style={{ minHeight: 300 }} />
      )}
    </div>
  )
})
