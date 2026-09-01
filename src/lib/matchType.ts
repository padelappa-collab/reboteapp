/**
 * Clasificación del partido según el género de los 4 jugadores.
 *
 * Espejo de la función SQL `infer_match_type()`. La base es la autoridad: aquí
 * se calcula solo para mostrarle al jugador qué ranking va a mover antes de
 * guardar.
 *
 *   4 hombres  -> masculino
 *   4 mujeres  -> femenino
 *   cualquier otra mezcla (1H+3M, 2H+2M, 3H+1M) -> mixto
 *
 * El único motivo de rechazo es que falte el género de alguno, nunca la
 * proporción entre géneros.
 */

import type { Genero, RankingTipo } from '@/types/database'

export function inferirMatchType(generos: Array<Genero | null | undefined>): RankingTipo {
  if (generos.length !== 4) {
    throw new Error(`Un partido necesita 4 jugadores, llegaron ${generos.length}`)
  }
  if (generos.some((g) => g !== 'masculino' && g !== 'femenino')) {
    throw new Error('Falta el género de alguno de los jugadores')
  }

  const hombres = generos.filter((g) => g === 'masculino').length
  if (hombres === 4) return 'masculino'
  if (hombres === 0) return 'femenino'
  return 'mixto'
}

export const ETIQUETA_RANKING: Record<RankingTipo, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  mixto: 'Mixto',
}
