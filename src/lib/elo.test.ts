import { describe, expect, it } from 'vitest'
import {
  ELO_MINIMO,
  K_CALIBRACION,
  K_ESTABLE,
  K_INTERMEDIO,
  calcularCambiosElo,
  eloPareja,
  kFactor,
  puntajeEsperado,
  type JugadorEnPartido,
  type Pareja,
} from './elo'

function jugador(
  userId: string,
  elo: number,
  partidosJugados = 20,
): JugadorEnPartido {
  return { userId, elo, partidosJugados }
}

function pareja(a: JugadorEnPartido, b: JugadorEnPartido): Pareja {
  return [a, b] as const
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

describe('calcularCambiosElo — suma y simetría', () => {
  it('con todo igual, el intercambio es de suma cero', () => {
    const cambios = calcularCambiosElo(
      pareja(jugador('a1', 1400), jugador('a2', 1400)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'a',
    )

    const total = cambios.reduce((suma, c) => suma + c.delta, 0)
    expect(total).toBe(0)
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

describe('calcularCambiosElo — la única asimetría entre compañeros', () => {
  it('dos compañeros con el mismo ELO y la misma experiencia cambian igual', () => {
    const [uno, dos] = calcularCambiosElo(
      pareja(jugador('a1', 1400, 25), jugador('a2', 1400, 25)),
      pareja(jugador('b1', 1600), jugador('b2', 1600)),
      'a',
    )
    expect(uno.delta).toBe(dos.delta)
    expect(uno.peso).toBeCloseTo(dos.peso)
  })

  it('con el mismo ELO, la única diferencia entre compañeros es su K', () => {
    const [novato, veterano] = calcularCambiosElo(
      pareja(jugador('novato', 1400, 3), jugador('veterano', 1400, 90)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'a',
    )

    expect(novato.k).toBe(K_CALIBRACION)
    expect(veterano.k).toBe(K_ESTABLE)
    expect(novato.peso).toBeCloseTo(veterano.peso)
    // mismo peso, misma diferencia esperado/real: la razón es exactamente la de los K
    expect(novato.delta / veterano.delta).toBeCloseTo(K_CALIBRACION / K_ESTABLE, 1)
  })

  it('dentro de la pareja, el más fuerte gana menos puntos', () => {
    const [fuerte, debil] = calcularCambiosElo(
      pareja(jugador('fuerte', 1750), jugador('debil', 1050)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'a',
    )

    expect(fuerte.delta).toBeGreaterThan(0)
    expect(debil.delta).toBeGreaterThan(fuerte.delta)
    expect(fuerte.peso).toBeLessThan(1)
    expect(debil.peso).toBeGreaterThan(1)
  })

  it('dentro de la pareja, el más fuerte también pierde menos', () => {
    const [fuerte, debil] = calcularCambiosElo(
      pareja(jugador('fuerte', 1750), jugador('debil', 1050)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'b',
    )

    expect(fuerte.delta).toBeLessThan(0)
    expect(Math.abs(fuerte.delta)).toBeLessThan(Math.abs(debil.delta))
  })

  it('los pesos del reparto siempre suman 2, por dispareja que sea la pareja', () => {
    const casos: Array<[number, number]> = [
      [1400, 1400],
      [1750, 1050],
      [2800, 700],
    ]

    for (const [eloUno, eloDos] of casos) {
      const [uno, dos] = calcularCambiosElo(
        pareja(jugador('a1', eloUno), jugador('a2', eloDos)),
        pareja(jugador('b1', 1400), jugador('b2', 1400)),
        'a',
      )
      expect(uno.peso + dos.peso).toBeCloseTo(2)
    }
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
    const esperado = calcularCambiosElo(
      pareja(jugador('a1', 2100), jugador('a2', 2100)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'a',
    )
    const sorpresa = calcularCambiosElo(
      pareja(jugador('a1', 2100), jugador('a2', 2100)),
      pareja(jugador('b1', 1400), jugador('b2', 1400)),
      'b',
    )

    expect(Math.abs(sorpresa[0].delta)).toBeGreaterThan(Math.abs(esperado[0].delta) * 10)
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
