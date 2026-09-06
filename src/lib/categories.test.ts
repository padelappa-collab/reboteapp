import { describe, expect, it } from 'vitest'
import { CASOS_CATEGORIA } from './__fixtures__/categorias.cases'
import {
  categoriaDesdeElo,
  eloInicial,
  nivelEstrella,
  resumenCategoria,
  umbralCategoria,
} from './categories'

describe('tabla de casos compartida con el test de paridad SQL', () => {
  it.each(CASOS_CATEGORIA)(
    '$descripcion (elo $elo, $ranking, pico $peak)',
    ({ elo, ranking, peak, categoria, estrellas }) => {
      expect(categoriaDesdeElo(elo, ranking, peak)).toBe(categoria)
      expect(nivelEstrella(elo, ranking, peak)).toBe(estrellas)
    },
  )
})

describe('eloInicial', () => {
  it('mapea la escala masculina completa', () => {
    expect(eloInicial('7ma', 'masculino')).toBe(700)
    expect(eloInicial('6ta', 'masculino')).toBe(1050)
    expect(eloInicial('5ta', 'masculino')).toBe(1400)
    expect(eloInicial('4ta', 'masculino')).toBe(1750)
    expect(eloInicial('3ra', 'masculino')).toBe(2100)
    expect(eloInicial('2da', 'masculino')).toBe(2450)
    expect(eloInicial('1ra', 'masculino')).toBe(2800)
  })

  it('mapea la escala femenina completa', () => {
    expect(eloInicial('D', 'femenino')).toBe(700)
    expect(eloInicial('C', 'femenino')).toBe(1050)
    expect(eloInicial('B', 'femenino')).toBe(1400)
    expect(eloInicial('A', 'femenino')).toBe(1750)
  })

  it('rechaza una categoría que no pertenece a la escala del género', () => {
    expect(() => eloInicial('B', 'masculino')).toThrow()
    expect(() => eloInicial('4ta', 'femenino')).toThrow()
  })
})

describe('categoriaDesdeElo — subida', () => {
  it('sube en cuanto cruza el umbral, sin colchón', () => {
    expect(categoriaDesdeElo(2100, 'masculino', 2100)).toBe('3ra')
  })

  it('un punto por debajo del umbral todavía no sube', () => {
    expect(categoriaDesdeElo(2099, 'masculino', 2099)).toBe('4ta')
  })

  it('no acredita una categoría que nunca pisó, aunque esté dentro del colchón', () => {
    // 2030 está a 70 puntos de 2100, pero su pico nunca llegó a 3ra
    expect(categoriaDesdeElo(2030, 'masculino', 2030)).toBe('4ta')
  })
})

describe('categoriaDesdeElo — histéresis al bajar', () => {
  const PICO_3RA = 2100

  it('conserva la categoría con una caída de 74 puntos', () => {
    expect(categoriaDesdeElo(2026, 'masculino', PICO_3RA)).toBe('3ra')
  })

  it('conserva la categoría justo en el límite de 75 puntos', () => {
    expect(categoriaDesdeElo(2025, 'masculino', PICO_3RA)).toBe('3ra')
  })

  it('baja con una caída de 76 puntos', () => {
    expect(categoriaDesdeElo(2024, 'masculino', PICO_3RA)).toBe('4ta')
  })

  it('sube dos categorías y baja una sola', () => {
    const pico2da = 2450
    expect(categoriaDesdeElo(2380, 'masculino', pico2da)).toBe('2da')
    expect(categoriaDesdeElo(2370, 'masculino', pico2da)).toBe('3ra')
    // sigue sin caer a 4ta aunque venga de mucho más arriba
    expect(categoriaDesdeElo(2030, 'masculino', pico2da)).toBe('3ra')
  })
})

describe('categoriaDesdeElo — bordes de la escala', () => {
  it('no baja de la categoría más baja', () => {
    expect(categoriaDesdeElo(400, 'masculino', 700)).toBe('7ma')
    expect(categoriaDesdeElo(100, 'femenino', 700)).toBe('D')
  })

  it('no sube más allá de la categoría más alta', () => {
    expect(categoriaDesdeElo(3500, 'masculino', 3500)).toBe('1ra')
    expect(categoriaDesdeElo(3000, 'femenino', 3000)).toBe('A')
  })
})

describe('categoriaDesdeElo — el mixto usa los cortes masculinos', () => {
  it('una jugadora categoría B arranca el mixto en 1400 y se le muestra 5ta', () => {
    const eloBase = eloInicial('B', 'femenino')
    expect(eloBase).toBe(1400)
    expect(categoriaDesdeElo(eloBase, 'femenino', eloBase)).toBe('B')
    expect(categoriaDesdeElo(eloBase, 'mixto', eloBase)).toBe('5ta')
  })

  it('el mixto llega hasta 1ra, no se corta en el tope femenino', () => {
    expect(categoriaDesdeElo(2800, 'mixto', 2800)).toBe('1ra')
  })
})

describe('nivelEstrella', () => {
  it('reparte la categoría en tres tercios', () => {
    expect(nivelEstrella(700, 'masculino', 700)).toBe(1)
    expect(nivelEstrella(816, 'masculino', 816)).toBe(1)
    expect(nivelEstrella(817, 'masculino', 817)).toBe(2)
    expect(nivelEstrella(933, 'masculino', 933)).toBe(2)
    expect(nivelEstrella(934, 'masculino', 934)).toBe(3)
    expect(nivelEstrella(1049, 'masculino', 1049)).toBe(3)
  })

  it('devuelve 1 cuando la histéresis deja el ELO por debajo del umbral', () => {
    expect(categoriaDesdeElo(2030, 'masculino', 2100)).toBe('3ra')
    expect(nivelEstrella(2030, 'masculino', 2100)).toBe(1)
  })

  it('no pasa de 3 estrellas en la categoría más alta', () => {
    expect(nivelEstrella(4000, 'masculino', 4000)).toBe(3)
  })
})

describe('resumenCategoria', () => {
  it('describe el avance dentro de la categoría', () => {
    const r = resumenCategoria(1925, 'masculino', 1925)
    expect(r.categoria).toBe('4ta')
    expect(r.estrellas).toBe(2)
    expect(r.elo).toBe(1925)
    // el avance va del suelo de la categoría (1750 - 75) al umbral siguiente
    expect(r.progreso).toBeCloseTo((1925 - 1675) / (2100 - 1675))
    expect(r.faltaParaSubir).toBe(175)
  })

  it('avanza aunque la histéresis te tenga por debajo del umbral', () => {
    // 698 en 7ma: bajó de los 700 de entrada pero sigue en su categoría. Antes
    // daba cero y la barra se veía rota.
    const r = resumenCategoria(698, 'masculino', 723)
    expect(r.categoria).toBe('7ma')
    expect(r.progreso).toBeGreaterThan(0)
    expect(r.progreso).toBeLessThan(0.3)
  })

  it('no ofrece siguiente categoría en la cima de la escala', () => {
    expect(resumenCategoria(2900, 'masculino', 2900).faltaParaSubir).toBeNull()
    expect(resumenCategoria(1800, 'femenino', 1800).faltaParaSubir).toBeNull()
  })
})

describe('umbralCategoria', () => {
  it('mantiene el salto fijo de 350', () => {
    expect(umbralCategoria(1)).toBe(700)
    expect(umbralCategoria(2) - umbralCategoria(1)).toBe(350)
    expect(umbralCategoria(7)).toBe(2800)
  })
})
