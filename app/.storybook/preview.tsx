import type { Preview } from '@storybook/react'
import React from 'react'
import { ThemeProvider } from 'styled-components'
import { darkTheme, lightTheme } from '../src/presentation/theme'
import { GlobalStyle } from '../src/presentation/theme/GlobalStyle'

const withTheme = (Story: React.ComponentType, context: { globals: { theme?: string } }) => {
  const theme = context.globals.theme === 'light' ? lightTheme : darkTheme
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <div style={{ padding: '1rem' }}>
        <Story />
      </div>
    </ThemeProvider>
  )
}

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'テーマ切り替え',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'dark', title: 'Dark', icon: 'moon' },
          { value: 'light', title: 'Light', icon: 'sun' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'dark',
  },
  decorators: [withTheme],
  parameters: {
    backgrounds: { disable: true },
    layout: 'fullscreen',
  },
}

export default preview
