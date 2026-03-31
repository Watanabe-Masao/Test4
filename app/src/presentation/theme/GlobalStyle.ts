import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
    font-size: ${({ theme }) => theme.typography.fontSize.body};
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.bg};
    line-height: 1.5;
    transition: background ${({ theme }) => theme.transitions.normal},
                color ${({ theme }) => theme.transitions.normal};
  }

  /* Monospace for numeric values */
  input[type="number"],
  .mono {
    font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  }

  /* Scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.text4};
    border-radius: ${({ theme }) => theme.radii.pill};
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${({ theme }) => theme.colors.text3};
  }

  /* Selection */
  ::selection {
    background: ${({ theme }) => theme.colors.palette.primary}40;
    color: ${({ theme }) => theme.colors.text};
  }

  /* Disable default focus outline, add custom one */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }

  /* Drill-through highlight animation */
  @keyframes drill-pulse {
    0% { box-shadow: 0 0 0 0 ${({ theme }) => theme.colors.palette.primary}60; }
    50% { box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.palette.primary}30; }
    100% { box-shadow: 0 0 0 0 ${({ theme }) => theme.colors.palette.primary}00; }
  }

  .drill-highlight > * {
    animation: drill-pulse 0.75s ease-in-out 2;
  }

  /* Print */
  @media print {
    body {
      background: white;
      color: black;
    }
  }
`
