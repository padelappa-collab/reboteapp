import { useCallback, useEffect, useState } from 'react'
import type { MatchRow } from '@/types/database'
import {
  obtenerPartido,
  partidosDe,
  perfilesDe,
  type JugadorResumen,
} from './matches.api'

/** Nombres de los jugadores que aparecen en una lista de partidos. */
function idsDe(partidos: MatchRow[]): string[] {
  return [...new Set(partidos.flatMap((p) => [...p.pareja_a, ...p.pareja_b]))]
}

export function useMisPartidos(userId: string | undefined) {
  const [partidos, setPartidos] = useState<MatchRow[]>([])
  const [nombres, setNombres] = useState<Map<string, string>>(new Map())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const recargar = useCallback(async () => {
    if (!userId) return
    setCargando(true)
    try {
      const lista = await partidosDe(userId)
      const perfiles = await perfilesDe(idsDe(lista))
      setPartidos(lista)
      setNombres(new Map([...perfiles].map(([id, j]) => [id, j.nombre])))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los partidos')
    } finally {
      setCargando(false)
    }
  }, [userId])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { partidos, nombres, cargando, error, recargar }
}

/** El detalle necesita el perfil completo, no solo el nombre: la ficha muestra
 *  categoría y estrellas de cada jugador. */
export function usePartido(id: string | undefined) {
  const [partido, setPartido] = useState<MatchRow | null>(null)
  const [jugadores, setJugadores] = useState<Map<string, JugadorResumen>>(new Map())
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    if (!id) return
    setCargando(true)
    try {
      const encontrado = await obtenerPartido(id)
      setPartido(encontrado)
      if (encontrado) {
        setJugadores(await perfilesDe(idsDe([encontrado])))
      }
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { partido, jugadores, cargando, setPartido, recargar }
}
