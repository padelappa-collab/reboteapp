/**
 * ELO por parejas.
 *
 * Qué mide el sistema y qué NO mide
 * ---------------------------------
 * Lo único que se registra de un partido es el marcador. No hay estadísticas
 * individuales, así que el sistema no sabe —ni puede saber— quién aportó más
 * dentro de una pareja. Por eso NO existe ningún reparto por nivel relativo
 * entre compañeros: intentar aproximarlo con una fórmula siempre produce algún
 * caso que se siente injusto en una dirección o en la otra.
 *
 * El cálculo es:
 *
 *   1. Un solo resultado esperado, a nivel de pareja, con el promedio de ELO de
 *      cada lado.
 *   2. Los dos compañeros comparten exactamente el mismo (real − esperado). Lo
 *      único que puede hacer que sus deltas difieran es su propio K, es decir,
 *      su etapa de calibración.
 *
 * Dos jugadores de la misma pareja con 40+ partidos cada uno reciben siempre el
 * mismo delta, tengan el nivel que tengan.
 */

/** K por etapa de calibración, según el total de partidos del jugador. */
export const K_CALIBRACION = 45
export const K_INTERMEDIO = 30
export const K_ESTABLE = 20

export const PARTIDOS_CALIBRACION = 10
export const PARTIDOS_INTERMEDIO = 40

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
 * Calcula el cambio de ELO de los 4 jugadores de un partido confirmado.
 * Devuelve una entrada por jugador, en orden: pareja A y luego pareja B.
 */
export function calcularCambiosElo(
  parejaA: Pareja,
  parejaB: Pareja,
  ganador: Lado,
): CambioElo[] {
  const esperadoA = puntajeEsperado(eloPareja(parejaA), eloPareja(parejaB))
  const esperadoB = 1 - esperadoA

  const realA = ganador === 'a' ? 1 : 0
  const realB = 1 - realA

  return [
    ...cambiosDePareja(parejaA, realA - esperadoA),
    ...cambiosDePareja(parejaB, realB - esperadoB),
  ]
}

/**
 * Cambio de ELO de un jugador suelto, a partir de los promedios de las dos
 * parejas. Es el equivalente exacto de la función SQL `delta_elo`, y el test de
 * paridad compara las dos sobre la misma tabla de casos.
 */
export function deltaJugador(
  eloParejaPropia: number,
  eloParejaRival: number,
  gano: boolean,
  partidosJugados: number,
): number {
  const esperado = puntajeEsperado(eloParejaPropia, eloParejaRival)
  // `|| 0` normaliza el -0 que devuelve Math.round con negativos muy pequeños
  return Math.round(kFactor(partidosJugados) * ((gano ? 1 : 0) - esperado)) || 0
}

/** `diferencia` es (real − esperado) de la pareja: idéntica para sus dos jugadores. */
function cambiosDePareja(pareja: Pareja, diferencia: number): CambioElo[] {
  return pareja.map((jugador) => {
    const k = kFactor(jugador.partidosJugados)
    const delta = Math.round(k * diferencia) || 0
    const eloDespues = Math.max(ELO_MINIMO, jugador.elo + delta)

    return {
      userId: jugador.userId,
      eloAntes: jugador.elo,
      // el suelo puede recortar la caída, así que el delta real se recalcula
      delta: eloDespues - jugador.elo,
      eloDespues,
      k,
    }
  })
}
