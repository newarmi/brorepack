import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatDeliveryAddress, formatGeoPoint } from './delivery'

describe('delivery format', () => {
  it('does not repeat city already present in full address', () => {
    assert.equal(formatDeliveryAddress({ city: 'Москва', address: '7, Тверская улица, Москва, Россия' }), '7, Тверская улица, Москва, Россия')
  })

  it('prefixes city for old orders and skips empty city of manual address', () => {
    assert.equal(formatDeliveryAddress({ city: 'Москва', address: 'Тверская, 7' }), 'Москва, Тверская, 7')
    assert.equal(formatDeliveryAddress({ city: '', address: 'Казань, Баумана, 1' }), 'Казань, Баумана, 1')
  })

  it('formats coordinates with fixed precision', () => {
    assert.equal(formatGeoPoint({ lat: 55.7609, lon: 37.6087 }), '55.760900, 37.608700')
  })
})
