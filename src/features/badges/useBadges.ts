import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface Insignia {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  orden: number
  /** Fecha en que la ganó, o null si todavía no la tiene. */
  obtenida: string | null
}

/**
 * Todas las insignias del catálogo, marcando cuáles tiene el jugador.
 *
 * Se muestran también las que no tiene, en gris: saber qué falta por conseguir
 * es la mitad de la gracia.
 */
export function useBadges(userId: string | undefined) {
  const [insignias, setInsignias] = useState<Insignia[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!userId) return
    let vigente = true

    async function cargar() {
      const [catalogo, ganadas] = await Promise.all([
        supabase.from('badges').select('*').order('orden'),
        supabase.from('user_badges').select('badge_id, fecha_obtenido').eq('user_id', userId!),
      ])

      if (!vigente) return

      if (catalogo.error) {
        console.error('No se pudo cargar el catálogo de insignias', catalogo.error)
        setCargando(false)
        return
      }

      const fechas = new Map(
        (ganadas.data ?? []).map((g) => [g.badge_id, g.fecha_obtenido]),
      )

      setInsignias(
        (catalogo.data ?? []).map((b) => ({
          ...b,
          obtenida: fechas.get(b.id) ?? null,
        })),
      )
      setCargando(false)
    }

    cargar()
    return () => {
      vigente = false
    }
  }, [userId])

  return { insignias, cargando }
}
