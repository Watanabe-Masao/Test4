/**
 * @responsibility R:unclassified
 */

export {
  weatherHourlyHandler,
  weatherHourlyAvgHandler,
  type WeatherHourlyInput,
  type WeatherHourlyOutput,
  type WeatherHourlyAvgInput,
  type WeatherHourlyAvgOutput,
  type HourlyWeatherAvgRow,
} from './WeatherHourlyHandler'

export {
  persistWeatherHourly,
  createWeatherPersister,
  type WeatherPersister,
} from './WeatherPersistenceAdapter'
