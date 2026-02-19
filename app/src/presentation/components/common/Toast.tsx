import styled, { keyframes } from 'styled-components'
import { useState, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import { sc } from '@/presentation/theme/semanticColors'

type ToastLevel = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: number
  message: string
  level: ToastLevel
}

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`

const Container = styled.div`
  position: fixed;
  bottom: ${({ theme }) => theme.spacing[8]};
  right: ${({ theme }) => theme.spacing[8]};
  z-index: 3000;
  display: flex;
  flex-direction: column-reverse;
  gap: ${({ theme }) => theme.spacing[3]};
`

const levelColors: Record<ToastLevel, string> = {
  success: sc.positive,
  error: sc.negative,
  warning: '#f59e0b',
  info: '#0ea5e9',
}

const ToastItem = styled.div<{ $level: ToastLevel }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $level }) => levelColors[$level]};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[6]};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  animation: ${slideIn} 0.3s ease;
  min-width: 250px;
  max-width: 400px;
`

type ShowToast = (message: string, level?: ToastLevel) => void

const ToastContext = createContext<ShowToast>(() => {})

export function useToast(): ShowToast {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const showToast: ShowToast = useCallback((message, level = 'info') => {
    const id = ++idRef.current
    setToasts((prev) => [...prev, { id, message, level }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Container>
        {toasts.map((t) => (
          <ToastItem key={t.id} $level={t.level}>
            {t.message}
          </ToastItem>
        ))}
      </Container>
    </ToastContext.Provider>
  )
}
