/**
 * ELO por parejas.
 *
 * Qué mide el sistema y qué NO mide
 * ---------------------------------
 * Lo único que se registra de un partido es el marcador. No hay estadísticas
 * individuales, así que el sistema no sabe —ni puede saber— quién jugó mejor
 * dentro de una pareja. Por eso existen exactamente dos fuentes de asimetría
 * entre compañeros, y ninguna más:
 *
 *  1. Reparto inverso dentro de la pareja. Si tu compañero tiene más ELO que
 *     tú, se asume que cargó más el partido: gana menos puntos si ganan y
 *     pierde menos si pierden. Es una suposición sobre el nivel previo, no una
 *     medición de ese partido.
 *
 *  2. K individual por experiencia. Cuánto pesa el resultado según la etapa de
 *     calibración de cada jugador (45 / 30 / 20). Es una capa ortogonal a la
 *     anterior: ajusta la confianza en el ELO de esa persona, no su desempeño.
 *
 * Dos compañeros con el mismo ELO y la misma experiencia reciben exactamente el
 * mismo cambio. Siempre.
 */

import { SALTO_CATEGORIA } from './categories'

/** K por etapa de calibración, según el total de partidos del jugador. */
export const K_CALIBRACION = 45
export const K_INTERMEDIO = 30
export const K_ESTABLE = 20

export const PARTIDOS_CALIBRACION = 10
export const PARTIDOS_INTERMEDIO = 40

/**
 * Referencia del reparto dentro de la pareja: una categoría completa.
 * Con 350 puntos de diferencia entre compañeros (una categoría), el más fuerte
 * se lleva la mitad del cambio y el más débil una vez y media.
 */
export const REFERENCIA_REPARTO = SALTO_CATEGORIA
export const PESO_MIN = 0.25
export const PESO_MAX = 1.75

/** Suelo del ELO: por debajo de esto el número deja de significar algo. */
export const ELO_MINIMO = 100

export type Lado = 'a' | 'b'

export interface JugadorEnPartido {
  userId: string
  /** ELO en el ranking que corresponde al tipo de partido. */
  elo: number
  /** Total de partidos jugados, sumando los tres rankings. */
  partidosJugados: number
}

export interface CambioElo {
  userId: string
  eloAntes: number
  eloDespues: number
  delta: number
  k: number
  /** Peso del reparto dentro de la pareja. 1 = ambos compañeros al mismo nivel. */
  peso: number
}

export type Pareja = readonly [JugadorEnPartido, JugadorEnPartido]

/** El peso del partido según la etapa de calibración del jugador. */
export function kFactor(partidosJugados: number): number {
  if (partidosJugados < PARTIDOS_CALIBRACION) return K_CALIBRACION
  if (partidosJugados < PARTIDOS_INTERMEDIO) return K_INTERMEDIO
  return K_ESTABLE
}

/** ELO de la pareja: el promedio de sus dos jugadores. */
export function eloPareja(pareja: Pareja): number {
  return (pareja[0].elo + pareja[1].elo) / 2
}

/** Probabilidad esperada de que gane la pareja con `eloPropio`. Fórmula ELO estándar. */
export function puntajeEsperado(eloPropio: number, eloRival: number): number {
  return 1 / (1 + 10 ** ((eloRival - eloPropio) / 400))
}

/**
 * Reparto dentro de la pareja: pesos que suman 2 (uno por jugador), donde el
 * más fuerte queda por debajo de 1 y el más débil por encima.
 */
function pesosDeReparto(pareja: Pareja): [number, number] {
  const media = eloPareja(pareja)
  const crudos = pareja.map((j) =>
    Math.min(PESO_MAX, Math.max(PESO_MIN, 1 - (j.elo - media) / REFERENCIA_REPARTO)),
  ) as [number, number]

  // Sin recortes la suma ya es 2; con recortes hay que renormalizar para que el
  // cambio total de la pareja no dependa de cuán dispareja sea.
  const suma = crudos[0] + crudos[1]
  return [(crudos[0] * 2) / suma, (crudos[1] * 2) / suma]
}

/**
 * Calcula el cambio de ELO de los 4 jugadores de un partido confirmado.
 * Devuelve una entrada por jugador, en orden: pareja A y luego pareja B.
 */
export function calcularCambiosElo(
  parejaA: Pareja,
  parejaB: Pareja,
  ganador: Lado,
): CambioElo[] {
  const eloA = eloPareja(parejaA)
  const eloB = eloPareja(parejaB)

  const esperadoA = puntajeEsperado(eloA, eloB)
  const esperadoB = 1 - esperadoA

  const realA = ganador === 'a' ? 1 : 0
  const realB = 1 - realA

  return [
    ...cambiosDePareja(parejaA, realA - esperadoA),
    ...cambiosDePareja(parejaB, realB - esperadoB),
  ]
}

function cambiosDePareja(pareja: Pareja, diferencia: number): CambioElo[] {
  const pesos = pesosDeReparto(pareja)

  return pareja.map((jugador, i) => {
    const k = kFactor(jugador.partidosJugados)
    const delta = Math.round(pesos[i] * k * diferencia)
    const eloDespues = Math.max(ELO_MINIMO, jugador.elo + delta)

    return {
      userId: jugador.userId,
      eloAntes: jugador.elo,
      // el suelo puede recortar la caída, así que el delta real se recalcula
      delta: eloDespues - jugador.elo,
      eloDespues,
      k,
      peso: pesos[i],
    }
  })
}
