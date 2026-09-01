import { describe, expect, it } from 'vitest'
import { inferirMatchType } from './matchType'

const H = 'masculino' as const
const M = 'femenino' as const

describe('inferirMatchType', () => {
  it('4 hombres es masculino', () => {
    expect(inferirMatchType([H, H, H, H])).toBe('masculino')
  })

  it('4 mujeres es femenino', () => {
    expect(inferirMatchType([M, M, M, M])).toBe('femenino')
  })

  it('cualquier mezcla es mixto, sin importar la proporción', () => {
    expect(inferirMatchType([H, H, M, M])).toBe('mixto')
    expect(inferirMatchType([H, M, M, M])).toBe('mixto')
    expect(inferirMatchType([H, H, H, M])).toBe('mixto')
  })

  it('no depende del orden de los jugadores', () => {
    expect(inferirMatchType([M, H, H, H])).toBe('mixto')
    expect(inferirMatchType([H, H, H, M])).toBe('mixto')
  })

  it('rechaza si falta el género de alguno', () => {
    expect(() => inferirMatchType([H, H, H, null])).toThrow(/género/i)
    expect(() => inferirMatchType([H, H, H, undefined])).toThrow(/género/i)
  })

  it('rechaza si no son exactamente 4 jugadores', () => {
    expect(() => inferirMatchType([H, H, H])).toThrow(/4 jugadores/)
    expect(() => inferirMatchType([H, H, H, H, H])).toThrow(/4 jugadores/)
  })
})
