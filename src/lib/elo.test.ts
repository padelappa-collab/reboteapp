import { describe, expect, it } from 'vitest'
import { CASOS_ELO } from './__fixtures__/elo.cases'
import {
  ELO_MINIMO,
  K_CALIBRACION,
  K_ESTABLE,
  K_INTERMEDIO,
  calcularCambiosElo,
  deltaJugador,
  eloPareja,
  kFactor,
  puntajeEsperado,
  type JugadorEnPartido,
  type Pareja,
} from './elo'

describe('tabla de casos compartida con el test de paridad SQL', () => {
  it.each(CASOS_ELO)(
    '$descripcion (pareja $eloPareja vs $eloRival, $partidos partidos)',
    ({ eloPareja: propio, eloRival, gano, partidos, delta }) => {
      expect(deltaJugador(propio, eloRival, gano, partidos)).toBe(delta)
    },
  )
})

function jugador(userId: string, elo: number, partidosJugados = 20): JugadorEnPartido {
  return { userId, elo, partidosJugados }
}

function pareja(a: JugadorEnPartido, b: JugadorEnPartido): Pareja {
  return [a, b] as const
}

/** Un jugador ya establecido: 40+ partidos, K estable. */
function establecido(userId: string, elo: number): JugadorEnPartido {
  return jugador(userId, elo, 80)
}

describe('kFactor', () => {
  it('usa K alto durante la calibración', () => {
    expect(kFactor(0)).toBe(K_CALIBRACION)
    expect(kFactor(9)).toBe(K_CALIBRACION)
  })

  it('baja a K intermedio del partido 11 al 40', () => {
    expect(kFactor(10)).toBe(K_INTERMEDIO)
    expect(kFactor(39)).toBe(K_INTERMEDIO)
  })

  it('se estabiliza a partir del partido 41', () => {
    expect(kFactor(40)).toBe(K_ESTABLE)
    expect(kFactor(250)).toBe(K_ESTABLE)
  })
})

describe('puntajeEsperado', () => {
  it('da 0.5 entre parejas iguales', () => {
    expect(puntajeEsperado(1400, 1400)).toBeCloseTo(0.5)
  })

  it('crece con la ventaja y es simétrico', () => {
    const favorito = puntajeEsperado(1800, 1400)
    expect(favorito).toBeGreaterThan(0.9)
    expect(favorito + puntajeEsperado(1400, 1800)).toBeCloseTo(1)
  })
})

describe('eloPareja', () => {
  it('es el promedio de los dos jugadores', () => {
    expect(eloPareja(pareja(jugador('a', 1400), jugador('b', 1750)))).toBe(1575)
  })
})

describe('calcularCambiosElo — el nivel dentro de la pareja no reparte nada', () => {
  it('mismo ELO y mismo K: delta idéntico', () => {
    const [uno, dos] = calcularCambiosElo(
      pareja(establecido('a1', 1400), establecido('a2', 1400)),
      pareja(establecido('b1', 1600), establecido('b2', 1600)),
      'a',
    )
    expect(uno.delta).toBe(dos.delta)
  })

  it('ELO muy distinto pero mismo K: delta idéntico igual', () => {
    const [fuerte, debil] = calcularCambiosElo(
      pareja(establecido('fuerte', 2100), establecido('debil', 700)),
      pareja(establecido('b1', 1400), establecido('b2', 1400)),
      'a',
    )
    expect(fuerte.delta).toBe(debil.delta)
    expect(fuerte.k).toBe(debil.k)
  })

  it('lo mismo al perder: la derrota tampoco se reparte por nivel', () => {
    const [fuerte, debil] = calcularCambiosElo(
      pareja(establecido('fuerte', 2100), establecido('debil', 700)),
      pareja(establecido('b1', 1400), establecido('b2', 1400)),
      'b',
    )
    expect(fuerte.delta).toBe(debil.delta)
    expect(fuerte.delta).toBeLessThan(0)
  })

  it('la diferencia entre compañeros se explica solo por el K', () => {
    const [novato, veterano] = calcularCambiosElo(
      pareja(jugador('novato', 700, 2), establecido('veterano', 2100)),
      pareja(establecido('b1', 1400), establecido('b2', 1400)),
      'a',
    )

    expect(novato.k).toBe(K_CALIBRACION)
    expect(veterano.k).toBe(K_ESTABLE)
    // idéntico (real − esperado): la razón de los deltas es la razón de los K
    expect(novato.delta / veterano.delta).toBeCloseTo(K_CALIBRACION / K_ESTABLE, 1)
  })

  it('intercambiar los ELO dentro de la pareja no cambia nada', () => {
    const rival = pareja(establecido('b1', 1400), establecido('b2', 1400))
    const [x, y] = calcularCambiosElo(
      pareja(establecido('a1', 2100), establecido('a2', 700)),
      rival,
      'a',
    )
    const [z, w] = calcularCambiosElo(
      pareja(establecido('a1', 700), establecido('a2', 2100)),
      rival,
      'a',
    )
    expect([x.delta, y.delta]).toEqual([z.delta, w.delta])
  })
})

describe('calcularCambiosElo — suma y simetría', () => {
  it('con todo igual, el intercambio es de suma cero', () => {
    const cambios = calcularCambiosElo(
      pareja(jugador('a1', 1400), jugador('a2', 1400)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'a',
    )

    expect(cambios.reduce((suma, c) => suma + c.delta, 0)).toBe(0)
    expect(cambios.map((c) => c.delta)).toEqual([15, 15, -15, -15])
  })

  it('devuelve los 4 jugadores en orden: pareja A y luego pareja B', () => {
    const cambios = calcularCambiosElo(
      pareja(jugador('a1', 1400), jugador('a2', 1400)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'a',
    )
    expect(cambios.map((c) => c.userId)).toEqual(['a1', 'a2', 'b1', 'b2'])
  })

  it('el ganador sube y el perdedor baja, gane quien gane', () => {
    const ganaB = calcularCambiosElo(
      pareja(jugador('a1', 1400), jugador('a2', 1400)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'b',
    )
    expect(ganaB.map((c) => c.delta)).toEqual([-15, -15, 15, 15])
  })
})

describe('calcularCambiosElo — expectativa', () => {
  it('al favorito claro ganar le deja casi nada', () => {
    const cambios = calcularCambiosElo(
      pareja(jugador('a1', 2100), jugador('a2', 2100)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'a',
    )
    expect(cambios[0].delta).toBeGreaterThan(0)
    expect(cambios[0].delta).toBeLessThan(3)
  })

  it('la sorpresa mueve mucho más que el resultado esperado', () => {
    const rival = pareja(jugador('b1', 1400), jugador('b2', 1400))
    const local = pareja(jugador('a1', 2100), jugador('a2', 2100))

    const esperado = calcularCambiosElo(local, rival, 'a')
    const sorpresa = calcularCambiosElo(local, rival, 'b')

    expect(Math.abs(sorpresa[0].delta)).toBeGreaterThan(Math.abs(esperado[0].delta) * 10)
  })

  it('el esperado sale del promedio de la pareja, no de cada jugador', () => {
    const rival = pareja(establecido('b1', 1400), establecido('b2', 1400))
    // 2100+700 y 1400+1400 promedian igual: el partido es parejo en ambos casos
    const dispareja = calcularCambiosElo(
      pareja(establecido('a1', 2100), establecido('a2', 700)),
      rival,
      'a',
    )
    const pareja1400 = calcularCambiosElo(
      pareja(establecido('a1', 1400), establecido('a2', 1400)),
      rival,
      'a',
    )
    expect(dispareja[0].delta).toBe(pareja1400[0].delta)
  })
})

describe('calcularCambiosElo — coherencia de la salida', () => {
  it('eloDespues siempre es eloAntes más delta', () => {
    const cambios = calcularCambiosElo(
      pareja(jugador('a1', 1750, 2), jugador('a2', 1050, 60)),
      pareja(jugador('b1', 1400, 15), jugador('b2', 1600, 41)),
      'a',
    )

    for (const c of cambios) {
      expect(c.eloDespues).toBe(c.eloAntes + c.delta)
      expect(Number.isInteger(c.delta)).toBe(true)
    }
  })

  it('el ELO no cae por debajo del suelo', () => {
    const cambios = calcularCambiosElo(
      pareja(jugador('a1', ELO_MINIMO, 0), jugador('a2', ELO_MINIMO, 0)),
      pareja(jugador('b1', 2800), jugador('b2', 2800)),
      'b',
    )

    expect(cambios[0].eloDespues).toBe(ELO_MINIMO)
    expect(cambios[0].delta).toBe(0)
  })
})
