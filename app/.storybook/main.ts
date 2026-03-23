import type { StorybookConfig } from '@storybook/react-vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': resolve(__dirname, '../src'),
    }
    // WASM モジュールは dynamic import で遅延ロード。Storybook ビルドでは外部扱い
    const wasmExternals = [
      'factor-decomposition-wasm',
      'gross-profit-wasm',
      'budget-analysis-wasm',
      'forecast-wasm',
      'time-slot-wasm',
    ]
    config.build = config.build || {}
    config.build.rollupOptions = config.build.rollupOptions || {}
    const existing = config.build.rollupOptions.external
    config.build.rollupOptions.external = [
      ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
      ...wasmExternals,
    ]
    return config
  },
}

export default config
