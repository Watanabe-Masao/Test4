/**
 * WeatherPort を AdapterContext から取得する hook
 *
 * @responsibility R:unclassified
 */
import { useContext } from 'react'
import type { WeatherPort } from '@/domain/ports/WeatherPort'
import { AdapterContext } from './adapterContextDef'

export function useWeatherAdapter(): WeatherPort {
  const adapters = useContext(AdapterContext)
  if (!adapters) {
    throw new Error('useWeatherAdapter must be used within an AdapterProvider')
  }
  return adapters.weather
}
