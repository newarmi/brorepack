import type { DeliveryAddress, GeoPoint } from './types'

/** Адрес одной строкой: полный адрес из геокодера уже содержит город, старые заказы — нет */
export function formatDeliveryAddress({ city, address }: Pick<DeliveryAddress, 'city' | 'address'>): string {
  if (!city || address.includes(city)) return address
  return `${city}, ${address}`
}

/** «55.760900, 37.608700» — так координаты вставляются в поиск любых карт */
export function formatGeoPoint({ lat, lon }: GeoPoint): string {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`
}
