import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RankingTipo, UserRow } from '@/types/database'

export type FilaRanking = Pick<
  UserRow,
  'id' | 'nombre' | 'ciudad' | 'genero' | 'partidos_jugados'
> & {
  elo: number
  peakElo: number
}

const COLUMNA_ELO: Record<RankingTipo, string> = {
  masculino: 'elo_masculino',
  femenino: 'elo_femenino',
  mixto: 'elo_mixto',
}

const COLUMNA_PEAK: Record<RankingTipo, string> = {
  masculino: 'peak_elo_masculino',
  femenino: 'peak_elo_femenino',
  mixto: 'peak_elo_mixto',
}

/**
 * Tabla de posiciones de uno de los tres rankings.
 *
 * Quien no tiene ELO en ese ranking (una mujer en el masculino, por ejemplo)
 * simplemente no aparece: su columna es NULL.
 */
export function useRanking(tipo: RankingTipo, ciudad: string | null) {
  const [filas, setFilas] = useState<FilaRanking[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vigente = true
    setCargando(true)

    async function cargar() {
      const columnaElo = COLUMNA_ELO[tipo]
      const columnaPeak = COLUMNA_PEAK[tipo]

      let consulta = supabase
        .from('users')
        .select(
          `id, nombre, ciudad, genero, partidos_jugados, ${columnaElo}, ${columnaPeak}`,
        )
        .not(columnaElo, 'is', null)
        .order(columnaElo, { ascending: false })
        .limit(200)

      if (ciudad) consulta = consulta.eq('ciudad', ciudad)

      const { data, error } = await consulta
      if (!vigente) return

      if (error) {
        console.error('No se pudo cargar el ranking', error)
        setFilas([])
      } else {
        setFilas(
          (data ?? []).map((fila) => {
            const f = fila as unknown as Record<string, unknown>
            return {
              id: f.id as string,
              nombre: f.nombre as string,
              ciudad: f.ciudad as string,
              genero: f.genero as FilaRanking['genero'],
              partidos_jugados: f.partidos_jugados as number,
              elo: f[columnaElo] as number,
              peakElo: f[columnaPeak] as number,
            }
          }),
        )
      }
      setCargando(false)
    }

    cargar()
    return () => {
      vigente = false
    }
  }, [tipo, ciudad])

  return { filas, cargando }
}
