import '@testing-library/jest-dom/vitest'
import { createElement } from 'react'
import { vi } from 'vitest'

// ResponsiveContainer は jsdom で親要素のサイズを取得できず width/height が -1 になる。
// テスト用に固定サイズの div でラップして stderr 警告を解消する。
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal<typeof import('recharts')>()
  return {
    ...original,
    ResponsiveContainer: (props: { children: React.ReactNode }) =>
      createElement('div', { style: { width: 800, height: 600 } }, props.children),
  }
})
